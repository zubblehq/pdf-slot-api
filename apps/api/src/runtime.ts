import { start } from 'workflow/api'
import type { Deps } from './app.js'
import { readConfig } from './config.js'
import { createDb } from './db/client.js'
import { ContainerClient } from '@azure/storage-blob'
import { createVercelBlobStore } from './blob/vercelBlobStore.js'
import { createDiskBlobStore } from './blob/diskBlobStore.js'
import { createAzureBlobStore } from './blob/azureBlobStore.js'
import type { BlobStore } from './blob/blobStore.js'
import { embeddedFontProvider } from './jobs/fonts.js'
import type { JobContext } from './jobs/context.js'
import { generateJob } from './jobs/generateJob.js'

const config = readConfig(process.env)
const db = createDb(config.databaseUrl)
// Where the bytes live (see config.ts). BLOB_DIR is local files, for
// development; AZURE_BLOB_SAS_URL is a container on Azure; neither set,
// it is Vercel Blob. Chosen once at startup, and nothing downstream of
// `BlobStore` knows which of the three it got.
const blobs: BlobStore = config.blobDir
  ? createDiskBlobStore(config.blobDir)
  : config.azureBlobSasUrl
    ? createAzureBlobStore(new ContainerClient(config.azureBlobSasUrl))
    : createVercelBlobStore(config.blobToken)
// Fonts are data compiled into this bundle (see jobs/fonts.ts): the same in every environment,
// and one instance per process.
const fonts = embeddedFontProvider()

export async function productionDeps(): Promise<Deps> {
  return { db, blobs, config, startJob: async (jobId) => { await start(generateJob, [jobId]) } }
}

export async function productionJobContext(): Promise<JobContext> {
  return { db, blobs, fonts }
}
