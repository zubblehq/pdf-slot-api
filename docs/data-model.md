# The data model

Five tables and a blob store. What follows is why each one exists and what
breaks when it is misunderstood — the column list is in
`apps/api/src/db/schema.ts` and does not need repeating here.

## The shape

```
files ──1:1── layouts        where the boxes are
  │   ──1:1── values         what was typed into them
  │
  └──1:n── jobs ──1:n── job_items
```

Everything cascades from `files`. Deleting a file removes its layout, its
values, its jobs and their items in one statement — the blobs are removed
separately, by the route, because the database does not know about them.

## `files` — an uploaded PDF, by its content

`fileId` is **a SHA-256 of the bytes**, not a random id. That is the one
decision in this schema worth understanding, because several behaviours fall
out of it:

- **Re-uploading the same PDF reopens the same template.** A user who drags in
  last month's invoice form gets the boxes they placed on it, because the id is
  the file.
- **A filled copy is recognised as its original.** The editor stamps exported
  PDFs, so re-uploading a filled one opens the original template rather than
  treating it as a new document and drawing the text twice.
- **Two uploads of identical bytes are one row.** Today that is the feature.
  Inside a multi-tenant app it is a data leak — two organisations uploading the
  same blank form would share one layout. See issue #1; the fix is to make the
  key `(organisation, fileId)` rather than to abandon the hash.

`blobPath` is stored rather than recomputed. That is what makes the `pdf/`
prefix change safe for files already saved: old bytes stay reachable at the
path they were written to, and only new writes move.

## `layouts` — where the boxes are

One row per file. `slots` and `tables` are JSON because they are read and
written whole, never queried into: the editor sends the entire layout on every
save, and the renderer wants all of it at once. There is nothing to index.

`updatedAt` is supplied by the client, not defaulted by the database. The
editor uses it to tell its own writes apart from another tab's.

## `values` — what was typed in

Separate from `layouts` on purpose. The layout is the template — reusable,
shared, the thing worth keeping. The values are one filling-in of it. Bulk
generation replaces the values per record and leaves the layout alone, which is
only expressible because they are not the same row.

## `jobs` and `job_items` — one bulk run

A job is a row plus one `job_items` row per record, all written up front, in
one transaction, before anything is queued. The queue only ever carries a job
id.

**That is what makes a retry cheap.** `renderBatch` skips items that are
already `done`, so a retried job resumes rather than re-rendering everything.
It is also what lets `GET /jobs/:id` answer honestly while work is in flight:
the counts are rows, not a guess.

`job_items.pdfPath` and `jobs.zipPath` are written when the blob is, for the
same reason as `files.blobPath` — the path that gets read back later is the
path that was written, never one recomputed from today's rules.

`fillFromTemplate` records a question the user was asked once: whether boxes
filled in the editor, that the data file says nothing about, should print on
every PDF. It belongs on the job because the answer applies to that run.

## The blob store

Four implementations behind one interface (`src/blob/blobStore.ts`): Azure,
local disk, Vercel, and in-memory for tests. Nothing above the interface knows
which one it has.

Three kinds of object, and **every path is built by `src/blob/paths.ts`**:

| | |
| --- | --- |
| `pdf/files/<fileId>.pdf` | the uploaded source |
| `pdf/jobs/<jobId>/record-0001.pdf` | one rendered record |
| `pdf/jobs/<jobId>/all.zip` | a finished job's download |

The `pdf/` prefix is not decoration. The Azure container holds Elli's own files
too, and a container SAS can write and delete anywhere in it — so the Azure
store refuses any path outside the folder, and a batch delete checks every path
before it sends one. The test in `apps/api/test/blobPaths.test.ts` walks the
module's exports rather than naming the three helpers, so a fourth one cannot
be added without the prefix.

## The queue

pg-boss, in its own `pdf_jobs` schema in the same database. Its own schema so
that `\dt` still shows five readable tables rather than pg-boss's dozen, and so
its migrations can never collide with drizzle's. It owns that schema entirely
and migrates it itself; our migrations never touch it.

Same database as the job rows on purpose: a queue somewhere else can hold a job
for a row that no longer exists, and the two can disagree about what is
happening.
