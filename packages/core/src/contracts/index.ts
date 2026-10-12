import { z } from 'zod'
import { defaultTableName, uniqueTableName } from '../index.js'
import type { FileId, PageSize, StoredFile, StoredTable, TableStyle, TemplateLayout, TemplateSlot, TemplateValues } from '../index.js'

/**
 * Request/response shapes shared by the API and the web client -- one source
 * of truth, validated on both sides.
 *
 * In this package rather than beside it, reached as
 * `@pdf-slot/core/contracts`, because it describes core's own types and
 * carries the header that says which core a caller is running. As a package of
 * its own it would need a dependency on core, and that dependency would be **a
 * second pin**: two specs that both have to name the same commit, and a bundle
 * holding two copies of the geometry on the day they do not. One package
 * cannot disagree with itself.
 *
 * It is a subpath, not part of the main entry, so code that only needs the
 * maths does not pull zod in with it.
 */

export const MAX_JOB_RECORDS = 5000
export const JOB_BATCH_SIZE = 25

/** 64-hex SHA-256 (content hash) or 32-hex random id (see apps/web fileHash.ts). */
export const fileIdSchema = z.string().regex(/^(?:[0-9a-f]{64}|[0-9a-f]{32})$/)

export const fontIdSchema = z.enum(['sans', 'sans-bold', 'serif', 'serif-bold', 'mono'])
export const pageSizeSchema = z.object({ width: z.number().positive(), height: z.number().positive() })

export const templateSlotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().min(0),
  page: z.number().int().min(0),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().min(0).optional(),
  fontId: fontIdSchema,
  size: z.number().positive(),
  color: z.object({ r: z.number().min(0).max(1), g: z.number().min(0).max(1), b: z.number().min(0).max(1) }),
  align: z.enum(['left', 'center', 'right']),
  lineHeight: z.number().positive(),
  paddingLeft: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  /** Both at once; still read so files saved before the two existed still open. */
  padding: z.number().min(0).optional(),
}) satisfies z.ZodType<TemplateSlot>

/** The typography every cell of a table shares. */
export const tableStyleSchema = z.object({
  fontId: fontIdSchema,
  size: z.number().positive(),
  color: z.object({ r: z.number().min(0).max(1), g: z.number().min(0).max(1), b: z.number().min(0).max(1) }),
  align: z.enum(['left', 'center', 'right']),
  lineHeight: z.number().positive(),
  paddingLeft: z.number().min(0).optional(),
  paddingTop: z.number().min(0).optional(),
  /** Both at once; still read so files saved before the two existed still open. */
  padding: z.number().min(0).optional(),
}) satisfies z.ZodType<TableStyle>

/**
 * A table row slot: one printed row described once and multiplied down
 * the page. Its cells are not stored -- they are worked out from the
 * columns and the row heights -- so this is the whole of it.
 */
export const templateTableSchema = z.object({
  id: z.string().min(1),
  /**
   * What a data file calls this table; a record's rows are addressed by it.
   *
   * Optional on the way in because every table saved before tables had
   * names has none, and a layout that will not parse is a file that will
   * not open. `templateLayoutSchema` names those, so everything past
   * validation has one.
   */
  name: z.string().min(1).optional(),
  page: z.number().int().min(0),
  x: z.number(),
  y: z.number(),
  columns: z.array(z.object({
    key: z.string().min(1),
    name: z.string(),
    width: z.number().positive(),
  })).min(1),
  rowHeights: z.array(z.number().positive()).min(1),
  style: tableStyleSchema,
  // StoredTable, not TemplateTable: this is the shape on the wire, which
  // may predate names. templateLayoutSchema is where one is put on.
}) satisfies z.ZodType<StoredTable>

export const templateLayoutSchema = z.object({
  fileId: fileIdSchema,
  slots: z.array(templateSlotSchema),
  // Named here rather than anywhere further in: a table with no name
  // cannot be addressed by a data file at all, and a name shared with
  // another table could not be addressed unambiguously. Doing it at the
  // boundary means nothing downstream -- editor, renderer or job -- has
  // to carry the possibility of a table without a name.
  tables: z.array(templateTableSchema)
    .transform((tables) => {
      const taken: string[] = []
      return tables.map((table, index) => {
        const name = uniqueTableName(table.name ?? defaultTableName(index), taken)
        taken.push(name)
        return { ...table, name }
      })
    })
    .optional(),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<TemplateLayout>

export const templateValuesSchema = z.object({
  fileId: fileIdSchema,
  values: z.record(z.string(), z.string()),
  updatedAt: z.iso.datetime(),
}) satisfies z.ZodType<TemplateValues>

/** `StoredFile` without its bytes: what `GET /files/:id` returns; the bytes come from `/source`. */
export const fileMetaSchema = z.object({
  fileId: fileIdSchema,
  name: z.string().min(1),
  pages: z.array(pageSizeSchema).min(1),
  createdAt: z.iso.datetime(),
})
export type FileMeta = z.infer<typeof fileMetaSchema>
// Compile-time check that the wire shape is still core's `StoredFile` minus its bytes: if either side
// drifts, this assignment stops type-checking. A bare type alias would not -- an unused conditional
// type is never evaluated, so the mismatch would go unnoticed.
const _fileMetaMatchesCore: FileMeta extends Omit<StoredFile, 'source'> ? true : never = true
void _fileMetaMatchesCore

/** The multipart `meta` part of `PUT /files/:id` (the id is in the path). */
export const putFileMetaSchema = fileMetaSchema.omit({ fileId: true })

export const storedFileSummarySchema = z.object({
  fileId: fileIdSchema,
  name: z.string(),
  pageCount: z.number().int().min(0),
  slotCount: z.number().int().min(0),
  updatedAt: z.string(),
})
export type StoredFileSummary = z.infer<typeof storedFileSummarySchema>

/** One record per PDF: slot name -> text. Unknown keys are ignored, missing slots are left blank. */
/**
 * One record: one PDF.
 *
 * A key holding text names a slot. A key holding a list of rows names a
 * *table*, and the rows go down it -- which is why a record cannot be a
 * flat grid, and why a table can only be filled from JSON. A record may
 * carry either kind or both, and whatever matches the file is printed.
 */
export const jobTableRowsSchema = z.array(z.record(z.string(), z.string()))
export const jobRecordSchema = z.record(z.string(), z.union([z.string(), jobTableRowsSchema]))
export type JobTableRows = z.infer<typeof jobTableRowsSchema>
export type JobRecord = z.infer<typeof jobRecordSchema>

export const createJobRequestSchema = z.object({
  records: z.array(jobRecordSchema).min(1).max(MAX_JOB_RECORDS),
  /**
   * What happens to a slot the record does not mention: print what was
   * typed into it in the editor, or print blank. Blank unless asked, so
   * a caller that says nothing gets one PDF per record and nothing else.
   */
  fillFromTemplate: z.boolean().optional(),
})
export type CreateJobRequest = z.infer<typeof createJobRequestSchema>

export const jobItemStatusSchema = z.enum(['pending', 'done', 'failed'])
export const jobStatusValueSchema = z.enum(['queued', 'running', 'done', 'failed'])

export const jobItemSchema = z.object({
  index: z.number().int().min(0),
  status: jobItemStatusSchema,
  error: z.string().nullable(),
})
export const jobStatusSchema = z.object({
  id: z.string(),
  fileId: fileIdSchema,
  status: jobStatusValueSchema,
  total: z.number().int().min(0),
  done: z.number().int().min(0),
  failed: z.number().int().min(0),
  error: z.string().nullable(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
  items: z.array(jobItemSchema),
})
export type JobStatus = z.infer<typeof jobStatusSchema>
export type JobItem = z.infer<typeof jobItemSchema>

export const apiErrorSchema = z.object({ error: z.object({ code: z.string(), message: z.string() }) })
export type ApiError = z.infer<typeof apiErrorSchema>

export type { FileId }

/**
 * The header a client sends to say which `@pdf-slot/core` it is running.
 *
 * The browser draws the preview with core's layout maths and the server
 * renders the PDF with the same code. They are deployed separately -- the
 * browser when the UI ships, the service when its image is rebuilt -- so
 * there is a window in which one has a newer core than the other. Inside it
 * the preview and the download disagree, and nothing says so: no error, just
 * text slightly out of place.
 *
 * So the client states its version and the server refuses a job when they
 * differ. That turns a batch of subtly wrong PDFs into a message asking for a
 * reload.
 *
 * Empty or absent on either side means "not configured", and the check is
 * skipped: in a single checkout there is one copy of core and nothing to
 * compare.
 */
export const CORE_VERSION_HEADER = 'x-core-version'

/** The error code returned when the two sides are not running the same core. */
export const CORE_VERSION_MISMATCH = 'core_version_mismatch'

/**
 * Whether a job may proceed, given what each side reports.
 *
 * Pure and exported so both sides agree on the rule, and so it can be tested
 * without a server.
 */
export function coreVersionsAgree(client: string | undefined, server: string | undefined): boolean {
  if (!client || !server) return true
  return client === server
}
