// A container SAS for the local emulator, with the permissions the app
// needs. The point is to exercise the same shape production uses -- a
// SAS URL and nothing else -- rather than a connection string that only
// the emulator would accept.
import {
  ContainerClient,
  StorageSharedKeyCredential,
  ContainerSASPermissions,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob'

const ACCOUNT = 'devstoreaccount1'
// Azurite's published development key. Not a secret: it is in Microsoft's
// own documentation and only ever reaches the emulator on this machine.
const KEY = 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw=='
const CONTAINER = process.argv[2] ?? 'pdfslot'
const ENDPOINT = `http://127.0.0.1:10000/${ACCOUNT}`

const credential = new StorageSharedKeyCredential(ACCOUNT, KEY)
const container = new ContainerClient(`${ENDPOINT}/${CONTAINER}`, credential)
await container.createIfNotExists()

const sas = generateBlobSASQueryParameters({
  containerName: CONTAINER,
  // Read, add, create, write, delete, list -- what the app actually does.
  permissions: ContainerSASPermissions.parse('racwdl'),
  startsOn: new Date(Date.now() - 60_000),
  expiresOn: new Date(Date.now() + 6 * 60 * 60 * 1000),
}, credential).toString()

console.log(`${ENDPOINT}/${CONTAINER}?${sas}`)
