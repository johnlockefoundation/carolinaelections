import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { loadCountyData, val, margin, normName } from '../lib/countyData.js';
import { BASEMAP_URL, BASEMAP_ATTR, MAP_MIN_ZOOM, MAP_MAX_ZOOM, MAP_BOUNDS, MAP_VIEW } from '../lib/map.js';

const COUNTY_BORDER = '#f8fafc';
const COUNTY_FOCUS = '#fbbf24';

function colorFor(v, domain) {
  const t = Math.max(-1, Math.min(1, v / (domain || 1)));
  const m = Math.abs(t);
  const dark = t >= 0 ? '#2563eb' : '#dc2626';
  const light = t >= 0 ? '#93c5fd' : '#fca5a5';
  const neutral = '#eef2f7';
  function hexToRgb(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
  function lerp(a,b,t){const ca=hexToRgb(a),cb=hexToRgb(b);return 'rgb('+ca.map((v,i)=>Math.round(v+(cb[i]-v)*t)).join(',')+')';}
  return m <= 0.5 ? lerp(neutral, light, m*2) : lerp(light, dark, (m-0.5)*2);
}

export default function CountyMap({ selectedId, onSelect, zipFocus }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const layersById = useRef(new Map());
  const featuresById = useRef(new Map());
  const selectedRef = useRef(null);
  const [data, setData] = useState(null);
  const [domain, setDomain] = useState(1);

  useEffect(() => {
    let alive = true;
    loadCountyData().then((d) => {
      if (!alive) return;
      // domain from 95th percentile of |change|
      const changes = d.counties
        .filter((c) => c.id !== 1)
        .map((c) => Math.abs(margin(c, d.latest) - margin(c, d.electionIdx)))
        .sort((a,b) => a-b);
      const p95 = changes[Math.floor(changes.length * 0.95)] || 0.2;
      setDomain(Math.max(0.2, Math.ceil(p95 * 10) / 10));
      setData(d);
    });
    return () => { alive = false; };
  }, []);

  // init map once
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(containerRef.current, {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      scrollWheelZoom: false,
      maxBounds: MAP_BOUNDS,
      maxBoundsViscosity: 1,
      zoomControl: true,
      attributionControl: true,
    });
    map.setView(MAP_VIEW.center, MAP_VIEW.zoom);
    L.tileLayer(BASEMAP_URL, { attribution: BASEMAP_ATTR, maxZoom: MAP_MAX_ZOOM }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // rebuild when data/domain changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) return;
    layerRef.current.clearLayers();
    layersById.current = new Map();
    featuresById.current = new Map();
    selectedRef.current = null;

    const changeFor = (county) => margin(county, data.latest) - margin(county, data.electionIdx);

    for (const f of data.geo.features) {
      const county = data.byName[normName(f.properties.name)];
      if (!county) continue;
      featuresById.current.set(county.id, f);
      const change = changeFor(county);
      const fill = colorFor(change, domain);
      const layer = L.geoJSON(f, {
        style: { color: COUNTY_BORDER, weight: 1.2, opacity: 0.9, fillColor: fill, fillOpacity: 0.85 },
        interactive: true,
        onEachFeature: (_, l) => {
          l.on('click', () => onSelect(county.id));
          l.bindTooltip(`${county.name}: ${change >= 0 ? '+' : ''}${change.toFixed(2)} pp`, { sticky: true });
        },
      });
      layerRef.current.addLayer(layer);
      layersById.current.set(county.id, layer);
    }

    // fit bounds
    const b = L.geoJSON(data.geo).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [12, 12] });
  }, [data, domain, onSelect]);

  // highlight selected
  useEffect(() => {
    if (!data) return;
    // reset all
    for (const [id, layer] of layersById.current) {
      const county = data.byId[id];
      const change = margin(county, data.latest) - margin(county, data.electionIdx);
      layer.setStyle({ color: COUNTY_BORDER, weight: 1.2, fillColor: colorFor(change, domain), fillOpacity: 0.85 });
    }
    if (selectedId && layersById.current.has(selectedId)) {
      layersById.current.get(selectedId).setStyle({ color: COUNTY_FOCUS, weight: 2.6, fillOpacity: 0.95 });
    }
  }, [selectedId, data, domain]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zipFocus) return;
    map.setView([zipFocus.lat, zipFocus.lng], 9, { animate: true });
  }, [zipFocus]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-container" aria-label="County registration map" />
      <button className="map-reset" onClick={() => {
        if (mapRef.current && data) {
          const b = L.geoJSON(data.geo).getBounds();
          if (b.isValid()) mapRef.current.fitBounds(b, { padding: [12, 12] });
        }
      }} title="Zoom to view">⤢</button>
    </div>
  );
}
