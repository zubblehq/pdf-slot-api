import { describe, expect, it, jest } from 'bun:test'
import { selectStores } from '@/modules/pdf-editor/api/persistence/index'
import type { SessionStore, TemplateStore } from '@/modules/pdf-editor/api/persistence/template-store'

function fakeIdb(): TemplateStore & SessionStore {
  return {
    getFile: jest.fn(async () => null), putFile: jest.fn(async () => {}), getLayout: jest.fn(async () => null), putLayout: jest.fn(async () => {}),
    getValues: jest.fn(async () => null), putValues: jest.fn(async () => {}), listFiles: jest.fn(async () => []), deleteFile: jest.fn(async () => {}),
    get: jest.fn(async () => null), put: jest.fn(async () => {}), clear: jest.fn(async () => {}),
  }
}

describe('selectStores', () => {
  it('no API URL: IndexedDB for everything (today\'s behaviour)', () => {
    const idb = fakeIdb()
    const http = jest.fn()
    expect(selectStores({}, idb, http)).toBe(idb)
    expect(http).not.toHaveBeenCalled()
  })
  it('API URL set: HTTP for templates, IndexedDB for the session; deleting the open file clears the session', async () => {
    const idb = fakeIdb()
    const httpStore = { ...fakeIdb(), deleteFile: jest.fn(async () => {}) }
    const selected = selectStores({ apiUrl: 'http://api.test/' }, idb, () => httpStore)
    await selected.putLayout({ fileId: 'a', updatedAt: 't', slots: [] })
    expect(httpStore.putLayout).toHaveBeenCalled()
    await selected.put({ fileId: 'a' })
    expect(idb.put).toHaveBeenCalled()
    ;(idb.get as ReturnType<typeof jest.fn>).mockResolvedValueOnce({ fileId: 'a' })
    await selected.deleteFile('a')
    expect(httpStore.deleteFile).toHaveBeenCalledWith('a')
    expect(idb.clear).toHaveBeenCalled()
  })
})
