# docs

## Start here

| | |
| --- | --- |
| [`../README.md`](../README.md) | what this is, how to run it, what is missing |
| [`../CLAUDE.md`](../CLAUDE.md) | the agent entry point: rules, structure, commands |
| [`../HANDOVER.md`](../HANDOVER.md) | **why** the design is this shape, and the short list of what must not change quietly |

## Current

| | |
| --- | --- |
| [`data-model.md`](data-model.md) | the five tables and the blob store — why each exists and what breaks when it is misread |
| [`../apps/api/README.md`](../apps/api/README.md) | the service: environment, limits, bulk generation, deploying |
| [`../packages/core/README.md`](../packages/core/README.md) | the shared library, why it is pinned to a commit, and how it is published |
| [`../apps/web/README.md`](../apps/web/README.md) | the development harness, and why it is not what ships |
| [`../FOR-DEPLOY.md`](../FOR-DEPLOY.md) | what the deploying team needs |

## Design records

`superpowers/specs/` and `superpowers/plans/` are **point-in-time records**,
kept because they explain decisions the code no longer announces. They are not
current documentation and some of them describe a stack this project has since
left — the first assumes Next.js, the third assumes Vercel Workflow.

Read them to find out *why* something is the way it is. Do not read them to
find out how anything works today.

In order, each building on the one before:

| Date | What it decided |
| --- | --- |
| `2026-09-03-pdf-slot-editor-design.md` | the first editor: slots, the canvas, preview-equals-download |
| `2026-09-13-two-step-template-editing-design.md` | splitting placing a box from filling it in; `TemplateStore` / `SessionStore` |
| `2026-09-19-backend-and-bulk-generation-design.md` | the API, the database, one PDF per row |
| `2026-10-07-nextjs-to-react-port-design.md` | leaving Next.js for Vite, ahead of the move into `elli-ui` |

The `plans/` beside them are the step-by-step build notes for the same work.
They are kept for the record and have the shortest shelf life of anything here.

## What has changed since those were written

So nobody reads a spec and believes it:

- The editor is a module in `elli-ui` at `/app/pdf`. `apps/web` is a harness.
- The service runs in a container on a VM, not on Vercel. Vercel Workflow is
  gone; bulk jobs run on pg-boss in Postgres.
- `@pdf-slot/contracts` is now `@pdf-slot/core/contracts` — one package, so
  there is one version to pin rather than two that can disagree.
- Blob paths live under `pdf/`, in a container shared with Elli's own files.
