/**
 * Which organisation a request belongs to.
 *
 * **Recorded, not enforced.** Every row this service writes from now on
 * carries the organisation that wrote it, and no query filters on it yet — so
 * today every caller still sees every file, exactly as before.
 *
 * That sounds like a half-measure, and it is a deliberate one. The reason is
 * what the alternative costs: without this, the day we do enforce, the tables
 * are full of rows with no owner and no way to work out who uploaded what. The
 * only options then are to wipe everyone's saved templates or to invent an
 * answer. Writing the column now means that day is `where organisation_id = ?`
 * on each query, against data that is already correct.
 *
 * Turning it on is tracked in
 * https://github.com/zubblehq/pdf-slot-api/issues/1 -- and until it is, this
 * service must stay unreachable from anywhere but Elli's API.
 *
 * The value is trusted because of where it comes from: this service has no
 * public address, the only caller is elli-core, and elli-core reads the
 * organisation from the user's own session. A browser cannot set this header
 * because a browser cannot reach this service at all. If that ever stops being
 * true, this stops being safe -- which is the same sentence as the issue above.
 */

/** The header elli-core's proxy sends. */
export const ORGANISATION_HEADER = 'x-organisation-id'

/**
 * The organisation on a request, or `null`.
 *
 * `null` is normal, not an error: the development stack, the tests, and the
 * rows written before this existed all have no organisation. A missing one
 * must never fail a request while this is only being recorded -- failing would
 * make an unenforced column a hard dependency, which is precisely the coupling
 * this staged approach is avoiding.
 */
export function organisationFrom(headers: Headers): string | null {
  const value = headers.get(ORGANISATION_HEADER)?.trim()
  return value ? value : null
}
