'use strict'
/**
 * A small, correct CSV parser.
 *
 * Small on purpose — a dependency for this would be a dependency to keep — but
 * correct about the parts people actually hit when they export from Excel or
 * Google Sheets: quoted fields, commas inside quotes, doubled quotes ("" -> "),
 * CRLF line endings, and a UTF-8 BOM at the start of the file.
 */

/** @returns {string[][]} rows of raw cells (no header handling) */
function parseCsv(text) {
  const input = String(text || '').replace(/^﻿/, '')   // Excel writes a BOM
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { field += '"'; i += 1 }   // escaped quote
        else quoted = false
      } else field += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ',') { row.push(field); field = ''; continue }
    if (ch === '\r') continue                                 // CRLF -> LF
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    field += ch
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(c => String(c).trim() !== ''))   // drop blank lines
}

/**
 * Parse with a header row into objects, with headers normalised so
 * "Cashback Rate", "cashback_rate" and "cashbackrate" all mean the same column.
 * @returns {{ headers: string[], rows: Array<Record<string,string>> }}
 */
function parseCsvObjects(text) {
  const raw = parseCsv(text)
  if (!raw.length) return { headers: [], rows: [] }
  const headers = raw[0].map(h => String(h).trim().toLowerCase().replace(/[\s_-]+/g, ''))
  const rows = raw.slice(1).map(cells => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = String(cells[i] ?? '').trim() })
    return obj
  })
  return { headers, rows }
}

module.exports = { parseCsv, parseCsvObjects }
