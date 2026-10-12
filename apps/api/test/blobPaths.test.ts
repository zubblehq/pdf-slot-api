import { describe, expect, it } from 'vitest'
import * as paths from '../src/blob/paths.js'
import { assertOwnedPath, BLOB_PREFIX, itemFileName, itemPath, sourcePath, zipPath } from '../src/blob/paths.js'

/**
 * Every path this service writes sits under one folder, because the Azure
 * container is shared with Elli's own files.
 *
 * The case worth protecting against is not a bad path written today -- it is
 * the fourth path helper, added next year by someone who has not read any of
 * this, writing `jobs/<id>/manifest.json` because that is what the three
 * above it looked like when they were first written. So the test below walks
 * the module's exports rather than naming the helpers it knows about: a new
 * one is included the moment it exists, and fails until it carries the
 * prefix.
 */
describe('blob paths', () => {
  it('puts every path under the folder this service owns', () => {
    expect(sourcePath('a'.repeat(64))).toBe(`${BLOB_PREFIX}/files/${'a'.repeat(64)}.pdf`)
    expect(itemPath('job-1', 0)).toBe(`${BLOB_PREFIX}/jobs/job-1/record-0001.pdf`)
    expect(zipPath('job-1')).toBe(`${BLOB_PREFIX}/jobs/job-1/all.zip`)
  })

  it('leaves no path builder in this module outside the folder', () => {
    // Everything exported that takes arguments and returns a path. `itemFileName`
    // is a name inside the zip the user downloads, not a blob path, so it is
    // the one exclusion -- and it is excluded by name, so a new export cannot
    // join it by accident.
    const notAPath = new Set(['itemFileName', 'BLOB_PREFIX', 'assertOwnedPath'])
    const builders = Object.entries(paths).filter(
      ([name, value]) => typeof value === 'function' && !notAPath.has(name),
    )

    // If this is 0, the walk has stopped seeing the module and the test below
    // it is passing vacuously.
    expect(builders.length).toBeGreaterThanOrEqual(3)

    for (const [name, build] of builders) {
      // Arity tells us what to pass: a file id, or a job id and an index.
      const built = (build as (...args: unknown[]) => string)(
        ...(build.length === 1 ? ['id-1'] : ['id-1', 0]),
      )
      expect(typeof built, `${name} should build a string`).toBe('string')
      expect(() => assertOwnedPath(built), `${name} builds a path outside ${BLOB_PREFIX}/`).not.toThrow()
    }
  })

  it('names a record the same inside the zip whatever its blob path is', () => {
    // The zip entry is what the user sees; the blob path is not. They share
    // the name on purpose, and that must not drift.
    expect(itemFileName(0)).toBe('record-0001.pdf')
    expect(itemPath('j', 0).endsWith(itemFileName(0))).toBe(true)
  })
})

describe('assertOwnedPath', () => {
  it('accepts what the helpers build', () => {
    expect(() => assertOwnedPath(sourcePath('f'))).not.toThrow()
    expect(() => assertOwnedPath(zipPath('j'))).not.toThrow()
  })

  it('refuses a path with no prefix, and one with somebody else\'s', () => {
    expect(() => assertOwnedPath('files/f.pdf')).toThrow(/outside pdf\//)
    expect(() => assertOwnedPath('elli/invoices/f.pdf')).toThrow(/outside pdf\//)
    // Not a prefix match on the string: a sibling folder that merely starts
    // with the same letters is not ours.
    expect(() => assertOwnedPath('pdfs/f.pdf')).toThrow(/outside pdf\//)
  })

  it('refuses a climb out of the folder, which looks like a path inside it', () => {
    // `pdf/../elli/x` passes startsWith and resolves somewhere else, which is
    // why the segment check exists separately.
    expect(() => assertOwnedPath('pdf/../elli/x.pdf')).toThrow(/escapes pdf\//)
    expect(() => assertOwnedPath('pdf/jobs/../../elli/x.pdf')).toThrow(/escapes pdf\//)
    // A name that merely contains dots is fine -- only a whole `..` segment
    // climbs.
    expect(() => assertOwnedPath('pdf/files/..hidden.pdf')).not.toThrow()
  })
})
