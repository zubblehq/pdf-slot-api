# PDF slot service — for deployment

Everything you asked for in your answers. Repo, Dockerfile, compose file, and
the short list of what it needs from your side.

## What it is

One service: an HTTP API and a queue worker in the same container. It renders
PDFs from a template and a data file — one PDF per row, zipped.

No public address, as you specified. Elli's API calls it internally, the way it
calls `z-pdf`.

## Deploying it

Built from the **repository root**, not from `apps/api`:

```bash
docker build -f apps/api/Dockerfile -t pdf-slot-api .
```

The Dockerfile is at `apps/api/Dockerfile`. There is a compose file beside it
(`apps/api/docker-compose.yml`) that joins `elli_network` and publishes
nothing — use it as-is or fold the service into yours, whichever suits the
deploy script.

### Environment

| Variable | What |
| --- | --- |
| `PDF_DATABASE_URL` | the VM's Postgres — the `z-db` container. Our tables go in `public`; the queue gets its own `pdf_jobs` schema so your table list stays readable |
| `PDF_AZURE_BLOB_SAS_URL` | the container SAS. Everything is written under `pdf/` and the service refuses any path outside it |
| `PDF_API_KEY` | the bearer token Elli's API will send. Service-to-service only now |
| `PDF_CORE_VERSION` | the commit of `@pdf-slot/core` this image is built from (see below) |

### Migrations

Separate step, before the deploy that needs it — deliberately not run at
startup, so the container never needs DDL rights on a database it shares with
your tables, and several containers can't race each other:

```bash
DATABASE_URL=<the VM's Postgres> npm run db:migrate
```

### Pointing Elli's API at it

`PDF_ENGINE_URL=http://pdf-slot-api:3000` — the variable your compose file
already carries and documents for exactly this.

### Scaling, if it ever needs it

One container does both jobs by default. If rendering ever slows the API down,
run the same image twice with `ROLE=api` and `ROLE=worker`. No second image, no
code change. Tested across two containers.

## What I need from you

1. **A read-only deploy key for `zubblehq/pdf-core`** on whatever builds this
   and `elli-ui`. It's a private repo and `bun install` sends no token for a
   private git dependency, so SSH is the only way in. I've already added one
   read-only key to that repo — happy for you to delete it and issue your own.
   **Or make `pdf-core` public and the whole requirement disappears.** Your
   call; it's layout maths, no secrets, but it's your code.

2. **Routes in elli-core that proxy to this service.** Until they exist the
   browser can't reach it, so bulk generation is unreachable from the editor.
   The editor ships working on browser storage alone in the meantime — that's
   a real mode, not a stub.

3. **Someone to own the Azure SAS expiry.** Nothing renews it. The day it
   lapses every upload answers `403` and the error says nothing about a date.

## Questions

- **Is `elli-ui` deployed on Vercel or as the nginx container?** The repo has
  both a `vercel.json` and a `Dockerfile` and I can't tell which is live. It
  decides where the editor ends up, since it ships inside `elli-ui`.
- **How many VMs, and is there a staging one?** And roughly what spec — PDF
  rendering is CPU-heavy and holds memory while it works, and I'd rather size
  the worker than find out in production.
- **What does `z-pdf` actually do?** You used it as the shape to copy, which
  was the useful part, but I don't know whether its job overlaps with this one.

## Two things I should flag

**I created `zubblehq/pdf-core`.** Private, in your org, with the library's own
history. That's the geometry both halves share — the browser runs it to draw
the preview, this service runs it to write the PDF, and they must be the same
code or the preview stops matching the download. Both sides are pinned to one
commit of it and the service refuses a job when they disagree. If you'd rather
it lived elsewhere, say so and I'll move it.

**The editor's tests use `@testing-library/react`, which your frontend rules
say not to.** The reasoning is in the other note I sent; short version is that
the maths is already extracted and tested separately, and what's left to test
is whether the component still *applies* it — which no test of a function can
see. If a reviewer disagrees I'll move those tests out of your repo; they run
unchanged in this one.
