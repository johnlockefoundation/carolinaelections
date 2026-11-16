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
      </div>
    </div>
  );
}
