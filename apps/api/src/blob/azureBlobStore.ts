import { ContainerClient, RestError } from '@azure/storage-blob'
import { readAll, type BlobStore } from './blobStore.js'

/**
 * Azure Blob Storage.
 *
 * Reached through a container SAS URL, which carries the account, the
 * container, what the credential may do and until when, all in one
 * string -- so nothing else has to be configured and no account key is
 * held anywhere. The SAS has to allow create, write, read and delete; a
 * read-only one (`sp=r`) answers every upload with 403
 * AuthorizationPermissionMismatch, and listing needs `l` on top of `r`.
 */
export function createAzureBlobStore(container: ContainerClient): BlobStore {
  return {
    async put(path, body, contentType) {
      // Overwriting is the BlobStore contract rather than an Azure
      // detail: PUT /files/:id is idempotent, and a retried generation
      // step may write a blob it has already written. Azure overwrites by
      // default, which is what the disk and memory stores do and what
      // their tests pin.
      const bytes = body instanceof Uint8Array ? body : await readAll(body)
      await container.getBlockBlobClient(path).uploadData(bytes, {
        blobHTTPHeaders: { blobContentType: contentType },
      })
    },

    async get(path) {
      let result
      try {
        result = await container.getBlobClient(path).download()
      } catch (err) {
        // A path that was never written is not an error here, the same as
        // every other store: the caller decides what a miss means. A 403
        // is NOT a miss -- it means the credential cannot do this, and
        // swallowing it would turn a misconfigured SAS into "the file
        // isn't there", which is the hardest kind of thing to diagnose.
        if (err instanceof RestError && err.statusCode === 404) return null
        throw err
      }
      const body = result.readableStreamBody
      if (!body) throw new Error(`Azure returned no body for ${path}`)
      return {
        stream: nodeToWeb(body),
        contentType: result.contentType ?? 'application/octet-stream',
      }
    },

    async delete(paths) {
      // deleteIfExists, so removing a file whose blobs were already
      // cleaned up is not an error -- the disk store ignores misses too.
      await Promise.all(paths.map((path) => container.getBlobClient(path).deleteIfExists()))
    },
  }
}

/**
 * The Node stream Azure hands back, as the web stream BlobStore is
 * declared to return. Node's own `toWeb` would do, but it is on
 * `stream/web` for Readable specifically and Azure types this loosely.
 */
function nodeToWeb(node: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      node.on('data', (chunk: Buffer | string) => {
        controller.enqueue(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk))
      })
      node.on('end', () => controller.close())
      node.on('error', (err) => controller.error(err))
    },
  })
}
