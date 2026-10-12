// The mapping itself lives in core, shared with the editor's preview of a
// record: the two must agree to the letter, or what is previewed is not
// what is generated.
export { recordToValues } from '@pdf-slot/core'

// The paths these used to build live in blob/paths.ts, with the folder every
// one of them has to sit under and the check that they do.
export { itemFileName, itemPath, zipPath } from '../blob/paths.js'
