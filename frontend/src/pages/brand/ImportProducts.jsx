import { useState } from 'react'
import { Link } from 'react-router-dom'
import { importProducts } from '../../services/products'
import { API_URL } from '../../config'

/**
 * Bulk product import.
 *
 * A D2C brand with forty SKUs will not fill in forty forms — they already have
 * the spreadsheet. Drop the file, see exactly what WOULD be created (and which
 * lines are broken, by line number) before anything is written, then import.
 */
const ImportProducts = () => {
  const [csv, setCsv]         = useState('')
  const [fileName, setFile]   = useState('')
  const [result, setResult]   = useState(null)   // dry-run or import result
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const [dragging, setDrag]   = useState(false)

  const readFile = (file) => {
    if (!file) return
    setFile(file.name)
    setResult(null)
    setError('')
    const reader = new FileReader()
    reader.onload = () => setCsv(String(reader.result || ''))
    reader.onerror = () => setError('Could not read that file.')
    reader.readAsText(file)
  }

  const run = async (dryRun) => {
    if (!csv.trim()) { setError('Add a CSV first.'); return }
    setBusy(true); setError('')
    try {
      const d = await importProducts(csv, dryRun)
      setResult(d)
      if (!dryRun) setCsv('')
    } catch (err) {
      setError(err.response?.data?.message || 'That import did not go through.')
    } finally {
      setBusy(false)
    }
  }

  const rowCount = csv.trim() ? Math.max(0, csv.trim().split('\n').length - 1) : 0

  return (
    <div className="page-root">
      <div className="page-header">
        <div className="page-label"><span>Bulk Tools</span></div>
        <h1 className="page-title">Import Products</h1>
        <p className="page-subtitle">
          Bring your whole catalogue in one spreadsheet. Everything imported still goes through FlexTag approval.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr' }} className="lg:grid-cols-3">
        <div style={{ gridColumn: 'span 2' }} className="lg:col-span-2">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); readFile(e.dataTransfer.files?.[0]) }}
            style={{
              padding: 34, borderRadius: 20, textAlign: 'center', marginBottom: 18,
              background: dragging ? 'rgba(124,58,237,0.1)' : 'rgba(var(--ink-rgb),0.03)',
              border: `2px dashed ${dragging ? 'rgba(124,58,237,0.6)' : 'rgba(var(--ink-rgb),0.12)'}`,
              transition: 'all 0.2s',
            }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>📄</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
              {fileName || 'Drop your CSV here'}
            </p>
            <p style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.4)', margin: '0 0 16px' }}>
              {rowCount ? `${rowCount} row${rowCount === 1 ? '' : 's'} loaded` : 'or choose a file — exported straight from Excel or Sheets is fine'}
            </p>
            <label className="btn-ghost" style={{ cursor: 'pointer', padding: '9px 18px', fontSize: 13 }}>
              Choose file
              <input type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => readFile(e.target.files?.[0])} />
            </label>
          </div>

          <label className="field-label">Or paste the rows</label>
          <textarea value={csv} onChange={e => { setCsv(e.target.value); setResult(null) }}
            rows={8} className="field-input" spellCheck={false}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
            placeholder={'name,price,cashbackRate,category,stock\nGlow Serum 50ml,2200,55,Skincare,40'} />

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 12, marginTop: 14, fontSize: 13, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={() => run(true)} disabled={busy || !csv.trim()} className="btn-ghost" style={{ padding: '11px 22px', fontSize: 13 }}>
              {busy ? 'Checking…' : 'Check the file'}
            </button>
            <button onClick={() => run(false)} disabled={busy || !csv.trim()} className="btn-primary" style={{ padding: '11px 22px', fontSize: 13 }}>
              {busy ? 'Importing…' : 'Import products'}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div style={{ marginTop: 20, padding: 20, borderRadius: 18, background: 'rgba(var(--ink-rgb),0.03)', border: '1px solid rgba(var(--ink-rgb),0.07)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: result.errors?.length ? '#fbbf24' : '#4ade80', margin: '0 0 10px' }}>
                {result.message}
              </p>

              {result.preview?.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(var(--ink-rgb),0.5)', margin: '0 0 8px' }}>First few rows</p>
                  {result.preview.map((p, i) => (
                    <p key={i} style={{ fontSize: 13, color: 'rgba(var(--ink-rgb),0.6)', margin: '0 0 4px' }}>
                      {p.name} — ৳{Number(p.price).toLocaleString()} · {p.cashbackRate}% back · {p.category}
                    </p>
                  ))}
                </div>
              )}

              {result.errors?.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#f87171', margin: '0 0 8px' }}>
                    {result.errors.length} row{result.errors.length === 1 ? '' : 's'} need fixing
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                    {result.errors.map(e => (
                      <p key={e.line} style={{ fontSize: 12, color: 'rgba(var(--ink-rgb),0.55)', margin: 0 }}>
                        <strong style={{ color: 'var(--text)' }}>Line {e.line}</strong> ({e.name}): {e.problems.join('; ')}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {result.imported > 0 && (
                <Link to="/brand/my-products" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 14, padding: '9px 18px', fontSize: 13 }}>
                  See my products →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Format help */}
        <div style={{ background: 'rgba(var(--ink-rgb),0.04)', border: '1px solid rgba(var(--ink-rgb),0.08)', borderRadius: 20, padding: 24, height: 'fit-content' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>The columns</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            {[
              ['name', 'required'],
              ['price', 'required · ৳'],
              ['cashbackRate', 'required · 0–100'],
              ['category', 'required'],
              ['stock', 'optional'],
              ['description', 'optional'],
              ['instantSplitPct', 'optional · % off at checkout'],
              ['minFollowers', 'optional · default 1,000'],
              ['hashtags / tagHandles', 'optional · space separated'],
              ['campaignBudget', 'optional · ৳ cap'],
            ].map(([col, note]) => (
              <div key={col} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <code style={{ fontSize: 12, color: '#a78bfa' }}>{col}</code>
                <span style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', textAlign: 'right' }}>{note}</span>
              </div>
            ))}
          </div>
          <a href={`${API_URL}/api/products/import/template.csv`} className="btn-ghost"
            style={{ display: 'inline-block', textDecoration: 'none', padding: '9px 18px', fontSize: 13 }}>
            Download template
          </a>
          <p style={{ fontSize: 11, color: 'rgba(var(--ink-rgb),0.35)', marginTop: 14, lineHeight: 1.6 }}>
            Up to 500 rows at a time. Everything lands as <strong>pending approval</strong>, exactly like a product added by hand.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ImportProducts
