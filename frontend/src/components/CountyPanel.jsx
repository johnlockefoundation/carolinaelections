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

function fmt(n) { return Number(n ?? 0).toLocaleString('en-US'); }
function fmtSigned(n) { const v = Number(n ?? 0); return (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v)); }


function PieChart({ values, colors, size = 96 }) {
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

export default function CountyPanel({ selectedId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    loadCountyData().then((d) => { if (alive) setData(d); }).catch((e) => { if (alive) setError(String(e)); });
    return () => { alive = false; };
  }, []);

  if (error) return <div className="panel"><div className="dim">Could not load county data: {error}</div></div>;
  if (!data) return <div className="panel-loading">Loading county data…</div>;

  const county = selectedId ? data.byId[selectedId] : null;
  if (!county) return <div className="panel"><div className="dim">Select a county on the map.</div></div>;

  const from = data.electionIdx;
  const to = data.latest;
  const totalFrom = val(county, 'total', from);
  const totalTo = val(county, 'total', to);
  const marginFrom = margin(county, from);
  const marginTo = margin(county, to);
  const dMargin = marginTo - marginFrom;

  return (
    <div className="panel-column" style={{ gap: 12 }}>
      <div className="panel">
        <div className="panel-title">{county.name} County</div>
        <div className="dim" style={{ fontSize: 11, marginBottom: 8 }}>
          Registered voters: {fmt(totalFrom)} → {fmt(totalTo)} ({fmtSigned(totalTo - totalFrom)})
        </div>
        <div className="dim" style={{ fontSize: 11, marginBottom: 8 }}>
          Change since last election ({data.weeks[from]} → {data.weeks[to]})
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Registration by partisanship change</div>
        <table className="stat-rows" style={{ width: '100%' }}>
          <thead>
            <tr><th>Party</th><th>From</th><th>To</th><th>Change</th></tr>
          </thead>
          <tbody>
            {PARTY_ROWS.map((r) => {
              const a = val(county, r.key, from);
              const b = val(county, r.key, to);
              return (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{fmt(a)}</td>
                  <td>{fmt(b)}</td>
                  <td className={b - a >= 0 ? 'pos' : 'neg'}>{fmtSigned(b - a)}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td>Total</td>
              <td>{fmt(totalFrom)}</td>
              <td>{fmt(totalTo)}</td>
              <td>{fmtSigned(totalTo - totalFrom)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="dim" style={{ fontSize: 10, marginBottom: 4 }}>2024</div>
            <PieChart
              values={[val(county,'dem',from), val(county,'rep',from), val(county,'unaff',from), val(county,'other',from)]}
              colors={['#2563eb','#dc2626','#6b7280','#9ca3af']}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="dim" style={{ fontSize: 10, marginBottom: 4 }}>2026</div>
            <PieChart
              values={[val(county,'dem',to), val(county,'rep',to), val(county,'unaff',to), val(county,'other',to)]}
              colors={['#2563eb','#dc2626','#6b7280','#9ca3af']}
            />
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Partisan lean: <strong>{Math.abs(marginFrom).toFixed(2)} pp more {marginFrom >= 0 ? 'Democratic' : 'Republican'}</strong>
          {' → '}
          <strong>{Math.abs(marginTo).toFixed(2)} pp more {marginTo >= 0 ? 'Democratic' : 'Republican'}</strong>
          {' '}(<span className={dMargin >= 0 ? 'pos' : 'neg'}>{dMargin >= 0 ? '+' : '−'}{Math.abs(dMargin).toFixed(2)} pp</span>)
        </div>
      </div>

      <div className="panel">
        <div className="panel-title">Demographic change</div>
        <table className="stat-rows" style={{ width: '100%' }}>
          <thead>
            <tr><th>Racial group</th><th>From</th><th>To</th><th>Change</th></tr>
          </thead>
          <tbody>
            {RACE_ROWS.map((r) => {
              const a = val(county, r.key, from);
              const b = val(county, r.key, to);
              return (
                <tr key={r.key}>
                  <td>{r.label}</td>
                  <td>{fmt(a)}</td>
                  <td>{fmt(b)}</td>
                  <td className={b - a >= 0 ? 'pos' : 'neg'}>{fmtSigned(b - a)}</td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td>Total</td>
              <td>{fmt(totalFrom)}</td>
              <td>{fmt(totalTo)}</td>
              <td>{fmtSigned(totalTo - totalFrom)}</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="dim" style={{ fontSize: 10, marginBottom: 4 }}>2024</div>
            <PieChart
              values={[val(county,'white',from), val(county,'black',from), val(county,'otherRace',from)]}
              colors={['#cbd5e1','#1f2937','#94a3b8']}
            />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="dim" style={{ fontSize: 10, marginBottom: 4 }}>2026</div>
            <PieChart
              values={[val(county,'white',to), val(county,'black',to), val(county,'otherRace',to)]}
              colors={['#cbd5e1','#1f2937','#94a3b8']}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
