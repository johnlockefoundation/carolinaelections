import { useEffect, useState } from 'react';
import { loadCountyData, val, margin } from '../lib/countyData.js';

const PARTY_ROWS = [
  { key: 'dem', label: 'Democratic', color: '#2563eb' },
  { key: 'rep', label: 'Republican', color: '#dc2626' },
  { key: 'unaff', label: 'Unaffiliated', color: '#6b7280' },
  { key: 'other', label: 'Other parties', color: '#9ca3af' },
];
const RACE_ROWS = [
  { key: 'white', label: 'White' },
  { key: 'black', label: 'Black' },
  { key: 'otherRace', label: 'Other' },
];

function PieChart({ values, colors, size = 88 }) {
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const r = size / 2;
  const cx = r, cy = r;
  let angle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const frac = v / total;
    const a = angle;
    angle += frac * Math.PI * 2;
    const x1 = cx + r * Math.cos(a);
    const y1 = cy + r * Math.sin(a);
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = frac > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return <path key={i} d={d} fill={colors[i]} stroke="#0f172a" strokeWidth="1" />;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {slices}
    </svg>
  );
}

function fmt(n) { return Number(n ?? 0).toLocaleString('en-US'); }
function fmtSigned(n) { const v = Number(n ?? 0); return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v)); }

const thStyle = { textAlign: 'left', padding: '4px 0', color: 'var(--muted)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700 };
const numTh = { ...thStyle, textAlign: 'right' };
const tdStyle = { padding: '4px 0', fontSize: 13 };
const numTd = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

export default function CountyPanel({ selectedId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    loadCountyData().then((d) => { if (alive) setData(d); }).catch((e) => { if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, []);

  if (error) return <aside className="panel"><div className="dim">Could not load county data: {error}</div></aside>;
  if (!data) return <aside className="panel"><div className="panel-loading">Loading county data…</div></aside>;

  const county = selectedId ? data.byId[selectedId] : null;
  if (!county) return <aside className="panel"><div className="dim">Select a county on the map.</div></aside>;

  const from = data.electionIdx;
  const to = data.latest;
  const totalFrom = val(county, 'total', from);
  const totalTo = val(county, 'total', to);
  const marginFrom = margin(county, from);
  const marginTo = margin(county, to);
  const dMargin = marginTo - marginFrom;

  return (
    <>
      <section className="panel">
        <h2 className="panel-title" style={{ fontSize: 18 }}>{county.name} County</h2>
        <div className="dim" style={{ fontSize: 11, marginBottom: 4 }}>
          Registered voters: {fmt(totalFrom)} → {fmt(totalTo)} ({fmtSigned(totalTo - totalFrom)})
        </div>
        <div className="dim" style={{ fontSize: 11 }}>
          Change since last election ({data.weeks[from]} → {data.weeks[to]})
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Registration by partisanship</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Party</th>
              <th style={numTh}>From</th>
              <th style={numTh}>To</th>
              <th style={numTh}>Change</th>
            </tr>
          </thead>
          <tbody>
            {PARTY_ROWS.map((r) => {
              const a = val(county, r.key, from);
              const b = val(county, r.key, to);
              const delta = b - a;
              return (
                <tr key={r.key} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ ...tdStyle, color: r.color, fontWeight: 600 }}>{r.label}</td>
                  <td style={numTd}>{fmt(a)}</td>
                  <td style={numTd}>{fmt(b)}</td>
                  <td style={{ ...numTd, color: delta >= 0 ? 'var(--d)' : 'var(--r)', fontWeight: 700 }}>
                    {fmtSigned(delta)}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '1px solid var(--line)', fontWeight: 700 }}>
              <td style={tdStyle}>Total</td>
              <td style={numTd}>{fmt(totalFrom)}</td>
              <td style={numTd}>{fmt(totalTo)}</td>
              <td style={numTd}>{fmtSigned(totalTo - totalFrom)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ marginTop: 10, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>Partisan lean:</span>
          <strong>{Math.abs(marginFrom).toFixed(2)} pp more {marginFrom >= 0 ? 'D' : 'R'}</strong>
          <span className="dim">→</span>
          <strong>{Math.abs(marginTo).toFixed(2)} pp more {marginTo >= 0 ? 'D' : 'R'}</strong>
          <span className={dMargin >= 0 ? '' : ''} style={{ color: dMargin >= 0 ? 'var(--d)' : 'var(--r)', fontWeight: 700 }}>
            ({dMargin >= 0 ? '+' : '−'}{Math.abs(dMargin).toFixed(2)} pp)
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="dim" style={{ fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>2024</div>
            <PieChart values={[val(county,'dem',from), val(county,'rep',from), val(county,'unaff',from), val(county,'other',from)]} colors={['#2563eb','#dc2626','#6b7280','#9ca3af']} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="dim" style={{ fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>2026</div>
            <PieChart values={[val(county,'dem',to), val(county,'rep',to), val(county,'unaff',to), val(county,'other',to)]} colors={['#2563eb','#dc2626','#6b7280','#9ca3af']} />
          </div>
        </div>
      </section>

      <section className="panel">
        <h3 className="panel-title">Demographics</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Racial group</th>
              <th style={numTh}>From</th>
              <th style={numTh}>To</th>
              <th style={numTh}>Change</th>
            </tr>
          </thead>
          <tbody>
            {RACE_ROWS.map((r) => {
              const a = val(county, r.key, from);
              const b = val(county, r.key, to);
              const delta = b - a;
              return (
                <tr key={r.key} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.label}</td>
                  <td style={numTd}>{fmt(a)}</td>
                  <td style={numTd}>{fmt(b)}</td>
                  <td style={{ ...numTd, color: delta >= 0 ? 'var(--d)' : 'var(--r)', fontWeight: 700 }}>
                    {fmtSigned(delta)}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '1px solid var(--line)', fontWeight: 700 }}>
              <td style={tdStyle}>Total</td>
              <td style={numTd}>{fmt(totalFrom)}</td>
              <td style={numTd}>{fmt(totalTo)}</td>
              <td style={numTd}>{fmtSigned(totalTo - totalFrom)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="dim" style={{ fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>2024</div>
            <PieChart values={[val(county,'white',from), val(county,'black',from), val(county,'otherRace',from)]} colors={['#cbd5e1','#1f2937','#94a3b8']} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="dim" style={{ fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>2026</div>
            <PieChart values={[val(county,'white',to), val(county,'black',to), val(county,'otherRace',to)]} colors={['#cbd5e1','#1f2937','#94a3b8']} />
          </div>
        </div>
      </section>
    </>
  );
}
