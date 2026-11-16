// Loader for the county registration dataset that used to live on the
// registrations site. Fetched at runtime from the published registrations
// data so this app does not have to bundle ~2 MB of weekly history.
//
// The payload is delta-encoded: each series is an array where the first value
// is absolute and later values are week-over-week differences (null = no
// snapshot that week, held forward). See registrations/tools/export-data.mjs.

const REG_BASE = 'https://johnlockefoundation.github.io/registrations/data';

const FIELDS = ['dem', 'rep', 'unaff', 'other', 'white', 'black', 'otherRace', 'total'];

let cache = null;
let cachePromise = null;

function decode(arr) {
  const out = new Int32Array(arr.length);
  let prev = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (v === null) { out[i] = prev; continue; }
    out[i] = i === 0 ? v : prev + v;
    prev = out[i];
  }
  return out;
}

function normName(s) {
  return String(s).toLowerCase().replace(/[^a-z]/g, '');
}

export function weekOnOrBefore(weeks, iso) {
  if (iso === 'latest') return weeks.length - 1;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i] <= iso) return i;
  }
  return 0;
}

export function loadCountyData() {
  if (cache) return Promise.resolve(cache);
  if (cachePromise) return cachePromise;
  cachePromise = (async () => {
  const [payload, geo] = await Promise.all([
    fetch(`${REG_BASE}/registrations.json`).then((r) => {
      if (!r.ok) throw new Error(`registrations.json ${r.status}`);
      return r.json();
    }),
    fetch(`${REG_BASE}/counties.geojson`).then((r) => {
      if (!r.ok) throw new Error(`counties.geojson ${r.status}`);
      return r.json();
    }),
  ]);

  const counties = payload.counties.map((c) => {
    const series = {};
    FIELDS.forEach((f) => { series[f] = decode(c.series[f]); });
    return { id: c.id, name: c.name, series };
  });
  const byId = {};
  const byName = {};
  counties.forEach((c) => { byId[c.id] = c; byName[normName(c.name)] = c; });

  const weeks = payload.weeks;
  const latest = weeks.length - 1;
  // "Last election" = the 2024 general election snapshot.
  const electionIdx = weekOnOrBefore(weeks, '2024-11-05');

  cache = { payload, geo, counties, byId, byName, weeks, latest, electionIdx };
  return cache;
  })();
  return cachePromise;
}

export function val(county, field, idx) {
  return county.series[field][idx];
}

export function margin(county, idx) {
  const total = val(county, 'total', idx);
  if (!total) return 0;
  return (val(county, 'dem', idx) - val(county, 'rep', idx)) / total * 100;
}

export { normName, FIELDS };
