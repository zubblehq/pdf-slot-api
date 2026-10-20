import { describe, expect, it } from 'vitest'
import { createApp, type Deps } from '../src/app.js'
import { createMemoryBlobStore } from '../src/blob/memoryBlobStore.js'
import { createTestDb } from './helpers/db.js'
import { FILE_ID, putTestFile } from './helpers/fixtures.js'
import { listFiles } from '../src/db/files.js'
import { files } from '../src/db/schema.js'
import { ORGANISATION_HEADER, organisationFrom } from '../src/tenancy.js'

/**
 * The organisation is **recorded and not enforced**, which is an odd thing to
 * assert and exactly why it is asserted.
 *
 * Both halves matter. If the recording silently stopped, nobody would notice
 * until the day we tried to switch filtering on and found a table of rows with
 * no owner. And if filtering quietly started, this service would begin hiding
 * files from callers that can currently see them -- a behaviour change nobody
 * asked for, in a service whose whole current contract is that everything is
 * shared.
 *
 * So this pins the state we chose on purpose. When issue #1 is done, the
 * second half of this file is what has to change, deliberately.
 */

const ORG_A = 'org-aaaa'
const ORG_B = 'org-bbbb'
const FILE_B = 'b'.repeat(64)

async function boot(): Promise<Deps & { blobs: ReturnType<typeof createMemoryBlobStore> }> {
  const db = await createTestDb()
  const blobs = createMemoryBlobStore()
  return {
    db,
    blobs,
    config: { apiKey: 'k', webOrigin: 'http://web.test' },
    startJob: async () => {},
  }
}

describe('reading the organisation off a request', () => {
  it('takes the header when it is there', () => {
    expect(organisationFrom(new Headers({ [ORGANISATION_HEADER]: ORG_A }))).toBe(ORG_A)
  })

  it('is null when absent, blank or whitespace', () => {
    // Null is the normal case in development and in tests -- there is no Elli
    // session to take an organisation from. It must never be an error while
    // this is only being recorded.
    expect(organisationFrom(new Headers())).toBeNull()
    expect(organisationFrom(new Headers({ [ORGANISATION_HEADER]: '' }))).toBeNull()
    expect(organisationFrom(new Headers({ [ORGANISATION_HEADER]: '   ' }))).toBeNull()
  })
})

describe('what gets written', () => {
  it('records the organisation that uploaded a file', async () => {
    const deps = await boot()
    const app = createApp(deps)

    const form = new FormData()
    form.set('meta', JSON.stringify({ name: 'a.pdf', pages: [{ width: 1, height: 1 }], createdAt: '2026-01-01T00:00:00.000Z' }))
    form.set('source', new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' }), 'a.pdf')
    const res = await app.request(`/files/${FILE_ID}`, {
      method: 'PUT',
      headers: { [ORGANISATION_HEADER]: ORG_A },
      body: form,
    })
    expect(res.status).toBe(204)

    const [row] = await deps.db.select().from(files)
    expect(row?.organisationId).toBe(ORG_A)
  })

  it('leaves it null when no organisation was sent', async () => {
    // The development stack and these tests. A null must be allowed through
    // rather than rejected, or an unenforced column becomes a hard dependency.
    const deps = await boot()
    const app = createApp(deps)
    expect((await putTestFile(app)).status).toBe(204)

    const [row] = await deps.db.select().from(files)
    expect(row?.organisationId).toBeNull()
  })

  it('does not move a file to whoever uploads it second', async () => {
    // File ids are a content hash, so two organisations uploading the same PDF
    // land on one row. Until that is fixed, the row must at least not change
    // hands silently on every re-upload.
    const deps = await boot()
    const app = createApp(deps)
    const upload = async (org: string) => {
      const form = new FormData()
      form.set('meta', JSON.stringify({ name: 'shared.pdf', pages: [{ width: 1, height: 1 }], createdAt: '2026-01-01T00:00:00.000Z' }))
      form.set('source', new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' }), 'shared.pdf')
      return app.request(`/files/${FILE_ID}`, { method: 'PUT', headers: { [ORGANISATION_HEADER]: org }, body: form })
    }

    expect((await upload(ORG_A)).status).toBe(204)
    expect((await upload(ORG_B)).status).toBe(204)

    const [row] = await deps.db.select().from(files)
    expect(row?.organisationId).toBe(ORG_A)
  })
})

describe('what is deliberately NOT enforced yet', () => {
  it('still shows every organisation every file', async () => {
    // This is the known gap, kept visible on purpose:
    // https://github.com/zubblehq/pdf-slot-api/issues/1
    //
    // When that is closed this assertion flips, and it should be changed by
    // somebody who means to change it -- not discovered by somebody wondering
    // why a customer can see another customer's templates.
    const deps = await boot()
    const app = createApp(deps)

    const upload = async (org: string, fileId: string) => {
      const form = new FormData()
      form.set('meta', JSON.stringify({ name: `${org}.pdf`, pages: [{ width: 1, height: 1 }], createdAt: '2026-01-01T00:00:00.000Z' }))
      form.set('source', new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' }), `${org}.pdf`)
      return app.request(`/files/${fileId}`, { method: 'PUT', headers: { [ORGANISATION_HEADER]: org }, body: form })
    }
    await upload(ORG_A, FILE_ID)
    await upload(ORG_B, FILE_B)

    // B asks for its files and is handed A's as well.
    const res = await app.request('/files', { headers: { [ORGANISATION_HEADER]: ORG_B } })
    const listed = (await res.json()) as { fileId: string }[]
    expect(listed).toHaveLength(2)

    // And the same through the repository, so this is the service's behaviour
    // rather than one route's.
    expect(await listFiles(deps.db)).toHaveLength(2)
  })
})
