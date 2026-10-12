export type Config = {
  databaseUrl: string
  blobToken: string
  apiKey: string
  webOrigin: string
  blobDir?: string
  /** A container SAS URL; set, it is Azure Blob rather than Vercel Blob that stores the bytes. */
  azureBlobSasUrl?: string
  /**
   * Which `@pdf-slot/core` this service is running -- the commit its
   * package.json is pinned to, injected at image build time.
   *
   * Optional, and absent means the check is off. In a single checkout there is
   * one copy of core and nothing to compare; it earns its keep only once the
   * browser and this service are deployed separately. See CORE_VERSION_HEADER
   * in @pdf-slot/core/contracts.
   */
  coreVersion?: string
}

const VARS = { databaseUrl: 'DATABASE_URL', blobToken: 'BLOB_READ_WRITE_TOKEN', apiKey: 'API_KEY', webOrigin: 'WEB_ORIGIN' } as const

/** Reads the environment once at startup; a missing variable is a startup error, not a runtime surprise. */
export function readConfig(env: Record<string, string | undefined>): Config {
  // Either of these opts out of Vercel Blob, and then BLOB_READ_WRITE_TOKEN
  // is not needed: BLOB_DIR for local file-backed storage, AZURE_BLOB_SAS_URL
  // for a container on Azure.
  const blobDir = env.BLOB_DIR
  const azureBlobSasUrl = env.AZURE_BLOB_SAS_URL
  // Both set is a mistake worth refusing to start over. `runtime.ts` picks
  // the first of the two, so a BLOB_DIR left behind in a deployment's
  // environment would quietly send production's bytes to a container's local
  // disk -- where they are read back happily, and are gone the next time the
  // container is replaced. There is no reading of "both" that is useful
  // enough to guess at.
  if (blobDir && azureBlobSasUrl) {
    throw new Error('Set BLOB_DIR or AZURE_BLOB_SAS_URL, not both: they are two different places to put the same bytes')
  }
  const missing = Object.values(VARS).filter((name) => {
    if (name === VARS.blobToken && (blobDir || azureBlobSasUrl)) return false
    return !env[name]
  })
  if (missing.length > 0) throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  return {
    databaseUrl: env.DATABASE_URL!,
    blobToken: env.BLOB_READ_WRITE_TOKEN ?? '',
    apiKey: env.API_KEY!,
    // The CORS check compares against the browser's `Origin` header, which never carries a trailing
    // slash; a copy-pasted `https://app.example.com/` would otherwise block every request.
    webOrigin: env.WEB_ORIGIN!.replace(/\/+$/, ''),
    ...(blobDir ? { blobDir } : {}),
    ...(azureBlobSasUrl ? { azureBlobSasUrl } : {}),
    ...(env.CORE_VERSION ? { coreVersion: env.CORE_VERSION } : {}),
  }
}
