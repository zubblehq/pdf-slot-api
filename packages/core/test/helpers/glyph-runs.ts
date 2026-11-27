import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber } from '@cantoo/pdf-lib'
import { requireContentStreamText } from './content-stream.js'

/** One drawn line, read back out of the PDF: where each glyph really starts and where its ink ends. */
export type DrawnRun = {
  x: number
  y: number
  /** The `Tc` in force for this line; 0 when the block sets none. */
  tc: number
  /** The x every glyph is drawn at, in order. */
  glyphX: number[]
  /** The right edge of the last glyph's advance (not counting the `Tc` after it). */
  inkEnd: number
}

/**
 * Reads every line page 0's slot text draws, glyph by glyph, from the PDF
 * alone: the text matrix, the `Tc` and the font size in each `BT ... ET`
 * block, and each glyph's advance from the `/W` array of the font that
 * block selects. Nothing here comes from the layout engine, so comparing
 * it with `layoutText` is a real readback.
 *
 * Positions follow ISO 32000-1 §9.4.4: after each glyph the text origin
 * moves by `w0 * size / 1000 + Tc` (no `Tw`: these fonts use two-byte
 * codes, which `Tw` never applies to; no `Tz`: pdf-lib never sets it).
 * Test-only, and only for what pdf-lib's drawText writes.
 */
export async function drawnGlyphRuns(pdfBytes: Uint8Array): Promise<DrawnRun[]> {
  const pdf = await PDFDocument.load(pdfBytes)
  const fonts = pdf.getPages()[0]!.node.Resources()!.lookup(PDFName.of('Font'), PDFDict)
  const widths = new Map<string, Map<number, number>>()
  for (const [name, ref] of fonts.entries()) {
    const type0 = pdf.context.lookup(ref, PDFDict)
    const cid = pdf.context.lookup(type0.lookup(PDFName.of('DescendantFonts'), PDFArray).get(0), PDFDict)
    widths.set(name.asString(), readW(cid.lookup(PDFName.of('W'), PDFArray)))
  }

  const runs: DrawnRun[] = []
  for (const block of requireContentStreamText(pdfBytes).matchAll(/BT\n([\s\S]*?)\nET/g)) {
    const body = block[1]!
    const tf = /(\/\S+) ([\d.]+) Tf/.exec(body)
    const tm = /1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/.exec(body)
    const tj = /<([0-9A-F]*)> Tj/.exec(body)
    if (!tf || !tm || !tj) throw new Error(`Unexpected text block: ${body}`)
    const w = widths.get(tf[1]!)
    if (!w) throw new Error(`No widths for ${tf[1]}`)
    const size = Number(tf[2])
    const tc = Number(/([\d.-]+) Tc/.exec(body)?.[1] ?? 0)
    const x = Number(tm[1])
    const codes = tj[1]!.match(/.{4}/g)?.map((h) => parseInt(h, 16)) ?? []
    const glyphX: number[] = []
    let pen = x
    let inkEnd = x
    for (const code of codes) {
      const advance = ((w.get(code) ?? 1000) * size) / 1000
      glyphX.push(pen)
      inkEnd = pen + advance
      pen = inkEnd + tc
    }
    runs.push({ x, y: Number(tm[2]), tc, glyphX, inkEnd })
  }
  return runs
}

/** A CIDFont's `/W`: `c [w1 w2 ...]` and `cFirst cLast w` entries. */
function readW(w: PDFArray): Map<number, number> {
  const out = new Map<number, number>()
  const n = (i: number) => w.lookup(i, PDFNumber).asNumber()
  for (let i = 0; i < w.size(); ) {
    const first = n(i)
    const next = w.get(i + 1)
    if (next instanceof PDFArray) {
      for (let j = 0; j < next.size(); j++) out.set(first + j, next.lookup(j, PDFNumber).asNumber())
      i += 2
    } else {
      const last = n(i + 1)
      for (let c = first; c <= last; c++) out.set(c, n(i + 2))
      i += 3
    }
  }
  return out
}
