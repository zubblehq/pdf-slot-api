import { describe, expect, it } from 'vitest'
import { readConfig } from '../src/config.js'

const full = { DATABASE_URL: 'postgres://x', BLOB_READ_WRITE_TOKEN: 't', API_KEY: 'k', WEB_ORIGIN: 'http://localhost:3005' }

describe('readConfig', () => {
  it('reads the four variables', () => {
    expect(readConfig(full)).toEqual({ databaseUrl: 'postgres://x', blobToken: 't', apiKey: 'k', webOrigin: 'http://localhost:3005' })
  })
  it('names every missing variable in one error', () => {
    expect(() => readConfig({ DATABASE_URL: 'postgres://x' })).toThrow(/BLOB_READ_WRITE_TOKEN, API_KEY, WEB_ORIGIN/)
  })
  it('strips a trailing slash from WEB_ORIGIN so it matches the browser Origin header', () => {
    // A browser sends `Origin: https://app.example.com` (no path, no slash); the CORS check is an exact
    // string compare, so a copy-pasted URL with a trailing slash would silently block every request.
    expect(readConfig({ ...full, WEB_ORIGIN: 'https://app.example.com/' }).webOrigin).toBe('https://app.example.com')
    expect(readConfig({ ...full, WEB_ORIGIN: 'https://app.example.com' }).webOrigin).toBe('https://app.example.com')
  })
  it('allows BLOB_DIR in place of BLOB_READ_WRITE_TOKEN for local development', () => {
    expect(readConfig({ DATABASE_URL: 'postgres://x', API_KEY: 'k', WEB_ORIGIN: 'o', BLOB_DIR: '/tmp/blobs' })).toEqual({
      databaseUrl: 'postgres://x',
      blobToken: '',
      apiKey: 'k',
      webOrigin: 'o',
      blobDir: '/tmp/blobs',
    })
  })

  it('allows AZURE_BLOB_SAS_URL in place of BLOB_READ_WRITE_TOKEN', () => {
    // Storing the bytes on Azure means there is no Vercel Blob token to
    // give, and startup must not demand one.
    const sas = 'https://acct.blob.core.windows.net/pdfs?sp=racwl&sig=x'
    expect(readConfig({ DATABASE_URL: 'postgres://x', API_KEY: 'k', WEB_ORIGIN: 'o', AZURE_BLOB_SAS_URL: sas })).toEqual({
      databaseUrl: 'postgres://x',
      blobToken: '',
      apiKey: 'k',
      webOrigin: 'o',
      azureBlobSasUrl: sas,
    })
  })

  it('still demands a blob token when neither alternative is given', () => {
    expect(() => readConfig({ DATABASE_URL: 'postgres://x', API_KEY: 'k', WEB_ORIGIN: 'o' }))
      .toThrow(/BLOB_READ_WRITE_TOKEN/)
  })
})

describe('the layout engine version', () => {
  const base = {
    DATABASE_URL: 'postgres://x',
    API_KEY: 'k',
    WEB_ORIGIN: 'http://web.test',
    BLOB_DIR: '.blobs',
  }

  /**
   * This exists because the field was declared on Config and never read out
   * of the environment. Every route test passed -- they set `coreVersion`
   * directly -- so the guard was dead only on the path that matters, and that
   * showed up against a running server rather than in the suite.
   */
  it('is read from the environment', () => {
    expect(readConfig({ ...base, CORE_VERSION: 'abc1234' }).coreVersion).toBe('abc1234')
  })

  it('is absent when unset, which turns the check off', () => {
    expect(readConfig(base).coreVersion).toBeUndefined()
    expect(readConfig({ ...base, CORE_VERSION: '' }).coreVersion).toBeUndefined()
  })
})

describe('two blob stores at once', () => {
  it('refuses to start rather than guessing which one was meant', () => {
    // runtime.ts picks the first of the two, so this would have been a
    // production deployment writing to a container's local disk because a
    // BLOB_DIR was left in its environment -- read back fine, and gone with
    // the container.
    expect(() =>
      readConfig({
        DATABASE_URL: 'postgres://x',
        API_KEY: 'k',
        WEB_ORIGIN: 'https://app.example.com',
        BLOB_DIR: '.blobs',
        AZURE_BLOB_SAS_URL: 'https://acct.blob.core.windows.net/c?sv=x',
      }),
    ).toThrow(/not both/)
  })
})
