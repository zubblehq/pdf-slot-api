import { createApp } from './app.js'
import { productionDeps, productionJobContext, startWorker } from './runtime.js'
import { setJobContext } from './jobs/context.js'

/**
 * The service: an HTTP API and a queue worker, in one process.
 *
 * One process because that is one container, which is what the deployment
 * wants -- this runs in a docker compose beside Elli's own services. They do
 * not have to stay together: `ROLE=worker` runs the same image with no HTTP
 * listener and `ROLE=api` the reverse, so rendering can be moved to its own
 * container, or several, without a second image or a code change. The default
 * runs both, which is right until generation load makes it wrong.
 *
 * Exported as `{ fetch }` rather than served explicitly: Bun serves a default
 * export shaped like this, and Bun is the runtime because `@pdf-slot/core`
 * ships TypeScript. Node would need it compiled first -- a bundler step whose
 * only purpose would be to undo a decision core made deliberately (see its
 * README) -- and Bun reads it directly. It is also what elli-core runs, so
 * the team has one runtime to know.
 */

const role = process.env.ROLE ?? 'both'
if (role !== 'api' && role !== 'worker' && role !== 'both') {
  throw new Error(`ROLE must be api, worker or both; got ${role}`)
}

const port = Number(process.env.PORT ?? 3000)

setJobContext(await productionJobContext())

if (role !== 'api') {
  const queue = await startWorker()
  // A container being replaced gets a SIGTERM and then, after a grace period,
  // a SIGKILL. Finishing the PDF in flight inside that window is the
  // difference between a job that completes and a job retried from its last
  // done record.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      void queue.stop().then(() => process.exit(0))
    })
  }
}

export default {
  port,
  fetch:
    role === 'worker'
      ? // Nothing to serve, but the process must stay up: the worker is
        // polling. A health check still gets an answer, and it is honest
        // about what this process is.
        () => new Response('This process is a worker', { status: 503 })
      : createApp(await productionDeps()).fetch,
}
