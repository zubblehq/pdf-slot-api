import { PDFDocument } from '@cantoo/pdf-lib'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { openFile } from '@/modules/pdf-editor/lib/open-file'
import { stubGlobal, unstubAllGlobals } from './bun/stub-globals'

/**
 * openFile against the real IndexedDB store (fake-indexeddb): the file's
 * bytes must actually land in the `files` store on first open, and show
 * up in the saved-files list.
 */
describe('openFile + IndexedDbTemplateStore', () => {
  beforeEach(() => {
    stubGlobal('indexedDB', new IDBFactory())
    stubGlobal('IDBKeyRange', IDBKeyRange)
  })
  afterEach(() => unstubAllGlobals())

  it('stores the uploaded file and lists it', async () => {
    const { IndexedDbTemplateStore } = await import('@/modules/pdf-editor/api/persistence/indexed-db-template-store')
    const store = new IndexedDbTemplateStore()
    const d = await PDFDocument.create()
    d.addPage([612, 792])
    const bytes = await d.save()

    const opened = await openFile(bytes, 'form.pdf', store)
    const stored = await store.getFile(opened.fileId)
    expect(stored?.name).toBe('form.pdf')
    expect(stored?.source.byteLength).toBe(bytes.byteLength)
    expect((await store.listFiles()).map((f) => f.name)).toEqual(['form.pdf'])
  })
})
