import { ContainerClient } from '@azure/storage-blob'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createAzureBlobStore } from '../src/blob/azureBlobStore.js'
import { readAll } from '../src/blob/blobStore.js'

/**
 * The Azure store against Azurite, Microsoft's own emulator -- the real
 * SDK, the real wire protocol, a real container, on this machine.
 *
 * Held to exactly the contract the disk and memory stores are held to
 * (see diskBlobStore.test.ts), because the rest of the app is written
 * against the interface and must not care which one is behind it.
 *
 * Skipped when Azurite is not running, so the suite still passes on a
 * machine without it:
 *   docker run --rm -d --name pdfslot-azurite -p 10000:10000 \
 *     mcr.microsoft.com/azure-storage/azurite azurite-blob --blobHost 0.0.0.0
 */

// Azurite's well-known development account. Not a secret: it is published
// in Microsoft's documentation and only ever reaches a local emulator.
const EMULATOR =
  'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;' +
  'AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;' +
  'BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;'

const running = await fetch('http://127.0.0.1:10000/devstoreaccount1?comp=list')
  .then(() => true)
  .catch(() => false)

describe.skipIf(!running)('azure blob store (against Azurite)', () => {
  const name = `test-${Date.now()}`
  const container = new ContainerClient(EMULATOR, name)
  const blobs = createAzureBlobStore(container)

  beforeAll(async () => { await container.createIfNotExists() })
  afterAll(async () => { await container.deleteIfExists() })

  it('stores bytes and streams, reads them back with the content type, deletes', async () => {
    await blobs.put('a.pdf', new Uint8Array([1, 2, 3]), 'application/pdf')
    await blobs.put('b.zip', new ReadableStream({ start(c) { c.enqueue(new Uint8Array([9])); c.close() } }), 'application/zip')

    const a = await blobs.get('a.pdf')
    expect(a?.contentType).toBe('application/pdf')
    expect(Array.from(await readAll(a!.stream))).toEqual([1, 2, 3])

    const b = await blobs.get('b.zip')
    expect(b?.contentType).toBe('application/zip')
    expect(Array.from(await readAll(b!.stream))).toEqual([9])

    await blobs.delete(['a.pdf', 'missing'])
    expect(await blobs.get('a.pdf')).toBeNull()
  })

  it('a second put to the same path replaces the bytes and content type', async () => {
    await blobs.put('replace.pdf', new Uint8Array([1, 2, 3]), 'application/pdf')
    await blobs.put('replace.pdf', new Uint8Array([7]), 'application/octet-stream')

    const after = await blobs.get('replace.pdf')
    expect(after?.contentType).toBe('application/octet-stream')
    expect(Array.from(await readAll(after!.stream))).toEqual([7])
  })

  it('returns null for a path that never existed', async () => {
    expect(await blobs.get('never-existed')).toBeNull()
  })

  it('keeps the nested paths the app actually uses', async () => {
    // Every real path has slashes in it -- files/<id>.pdf, jobs/<id>/all.zip.
    // Azure has no directories, so these are just names; this pins that
    // they round-trip rather than being rewritten or rejected.
    const path = 'jobs/abc-123/record-0001.pdf'
    await blobs.put(path, new Uint8Array([4, 2]), 'application/pdf')
    expect(Array.from(await readAll((await blobs.get(path))!.stream))).toEqual([4, 2])
    await blobs.delete([path])
  })

  it('a big blob survives the round trip whole', async () => {
    // A zip of several hundred PDFs is the real case, and the one where a
    // chunked upload or a truncated read would show up.
    const big = new Uint8Array(5 * 1024 * 1024)
    for (let i = 0; i < big.length; i++) big[i] = i % 251
    await blobs.put('big.zip', big, 'application/zip')

    const back = await readAll((await blobs.get('big.zip'))!.stream)
    expect(back.length).toBe(big.length)
    expect(back[0]).toBe(big[0])
    expect(back[big.length - 1]).toBe(big[big.length - 1])
    await blobs.delete(['big.zip'])
  })
})
