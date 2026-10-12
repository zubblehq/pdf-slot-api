import { noColumnsMatchMessage, type FillTargets } from './check-columns'
import type { Summary } from './generate.constants'

/** The live read-out under the box: what the data holds, or the one reason it cannot be used. */
export function DataSummary({ summary, targets }: { summary: Summary; targets: FillTargets }) {
  if (summary.kind === 'error') {
    return <p className="text-xs text-destructive" data-testid="generate-summary">{summary.message}</p>
  }
  const { rows, columns, unknown, missing, suggestions, nothingMatches, tables, wrongKind } = summary
  const thing = targets.tables.length === 0 ? 'slot' : 'slot or table'
  return (
    <div className="grid gap-0.5 text-xs" data-testid="generate-summary">
      <p className="text-muted-foreground">{`${rows} ${rows === 1 ? 'row' : 'rows'} · columns: ${columns.join(', ')}`}</p>
      {nothingMatches ? (
        <p className="text-destructive">{noColumnsMatchMessage(targets)}</p>
      ) : (
        <>
          {unknown.map((column) => (
            <p key={column} className="text-muted-foreground">
              {`Ignored: "${column}" matches no ${thing}.${suggestions[column] ? ` Did you mean "${suggestions[column]}"?` : ''}`}
            </p>
          ))}
          {missing.map((name) => (
            <p key={name} className="text-muted-foreground">{`Left blank: "${name}" has no column.`}</p>
          ))}
          {/* A name that matched but was given the wrong sort of value:
              worth its own line, because "Ignored: matches no slot" would
              be a lie and would send the user hunting for a typo. */}
          {wrongKind.map((note) => (
            <p key={note} className="text-destructive">{note}</p>
          ))}
          {tables.map((table) => (
            <div key={table.name} className="grid gap-0.5">
              {table.unknown.map((column) => (
                <p key={column} className="text-muted-foreground">
                  {`Ignored: "${column}" matches no column of "${table.name}".${table.suggestions[column] ? ` Did you mean "${table.suggestions[column]}"?` : ''}`}
                </p>
              ))}
              {table.missing.map((column) => (
                <p key={column} className="text-muted-foreground">{`Left blank: "${table.name}" column "${column}" has no data.`}</p>
              ))}
              {table.extraRows > 0 && (
                <p className="text-destructive" data-testid={`generate-extra-rows-${table.name}`}>
                  {`"${table.name}" has ${table.extraRows} more ${table.extraRows === 1 ? 'row' : 'rows'} of data than it has rows on the page; ${table.extraRows === 1 ? 'it' : 'they'} will not print. Add rows to the table, or shorten the data.`}
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

/**
 * The shape to write, spelled out with this file's own names -- a shorter
 * road to a working file than any wording of the rule.
 */
export function tableExample(targets: FillTargets): string {
  const slot = targets.slotNames[0]
  const table = targets.tables[0]
  const row = (table?.columns ?? []).slice(0, 2)
  const cells = row.length > 0 ? row.map((c, i) => `"${c}": "${i + 1}"`).join(', ') : '"Column 1": "1"'
  const lines = [
    '[',
    '  {',
    ...(slot ? [`    "${slot}": "…",`] : []),
    `    "${table?.name ?? 'Table 1'}": [`,
    `      { ${cells} }`,
    '    ]',
    '  }',
    ']',
  ]
  return lines.join('\n')
}
