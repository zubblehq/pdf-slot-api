# pdf-slot

Place named text boxes and tables anywhere on a PDF or a scan, fill them in,
and download the result — then feed a `.csv` or `.json` and get one PDF per
row.

**What this repository holds:** the generation service and the shared layout
library. The editor the user actually clicks is a module in
[`elli-ui`](https://github.com/zubblehq/elli-ui) at `/app/pdf`; `apps/web`
here is its development harness and is not deployed (see *Repository layout*).

## The one thing to understand first

The browser and this service run **the same library** — `@pdf-slot/core` — to
work out where every character goes on the page. The browser runs it to draw
the preview; the service runs it to write the PDF. Same code, called twice,
and that is the only reason the preview matches the download.

If the two ever run different versions of it, the preview and the download
disagree *silently* — no error, just text slightly out of place, found by a
customer. So both sides pin it to **a commit**, and the service refuses a job
whose client reports a different one.

[`HANDOVER.md`](HANDOVER.md) is the long version, and the page to read before
changing any of the geometry.

## Running it locally

One command brings up Postgres, applies migrations, and starts both halves:

```bash
scripts/dev-stack.sh          # editor on :5173, API on :3000
scripts/dev-stack.sh stop
```

Or by hand, from `apps/api`:

```bash
cp .env.example .env     # set DATABASE_URL; BLOB_DIR=.blobs for local files
npm run db:migrate
npm run dev              # bun --watch, listens on :3000
```

There is **no build step** for the service: `@pdf-slot/core` ships TypeScript
on purpose and Bun runs it directly. `npm run typecheck` is the check the
build used to be.

## Checks

```bash
npm run verify     # lint, typecheck, every test, and the web build
npm test           # the suites alone
```

`verify` is the one that matters before shipping — it runs all four packages.
Two suites skip themselves when the service they need is absent: the Azure
store's (needs Azurite) and the queue's (needs a real Postgres). Everything
else runs anywhere.

## Repository layout

| Path | What |
| --- | --- |
| `packages/core` | the geometry and the renderer, plus the wire format at `@pdf-slot/core/contracts`. Published to [`zubblehq/pdf-core`](https://github.com/zubblehq/pdf-core) — see its README |
| `apps/api` | the service: Hono on Bun, pg-boss for bulk jobs, Azure Blob for bytes |
| `apps/web` | a Vite harness around the editor. **Not deployed.** It exists because core is developed here and a geometry change wants somewhere to be seen at once; the shipping copy is the `elli-ui` module |
| `docs/` | the design records written while this was built |
| `scripts/` | `dev-stack.sh`, and the Azure emulator helper under `apps/api/scripts` |

`apps/web` and the `elli-ui` module are the same code with different
packaging, and they will drift. `elli-ui` is the one that ships.

## Deploying

The service runs as its own container in a docker compose beside Elli's, with
no public address — the browser talks to Elli's API, which calls in over the
internal network.

```bash
docker build -f apps/api/Dockerfile -t pdf-slot-api .      # from this directory
docker compose -f apps/api/docker-compose.yml up -d --build
```

[`FOR-DEPLOY.md`](FOR-DEPLOY.md) has the environment variables, the migration
step, and what the deploying team needs from whoever hands this over.

## Known gaps

- **The service is single-tenant.** Every caller sees every file. That was
  correct for one workspace and is not correct inside a multi-tenant app —
  [issue #1](https://github.com/zubblehq/pdf-slot-api/issues/1). Nothing
  should proxy to this service until it is fixed.
- **Bulk generation is unreachable from the editor** until elli-core has
  routes that proxy here. The editor works meanwhile on browser storage
  alone, which is a supported mode rather than a stub.
- **Only job creation is authenticated**, with one shared key. Survivable
  while the service is reachable only from inside the network; anything that
  gives it a public address needs per-user auth on every route first.
- **The Azure SAS expires** and nothing renews it. When it lapses every upload
  answers `403`, with an error that says nothing about a date.
