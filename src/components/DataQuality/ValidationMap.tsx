import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Loader2, Layers } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface MapPoint {
  lat: number;
  lon: number;
  hhId: string;
  stackpointIssue: boolean;
  proximityIssue: boolean;
  stackpointMsg: string;
  proximityMsg: string;
  village: string;
}

interface Props {
  points: MapPoint[];
}

const NGA_STATES_URL =
  'https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1.geojson';
const NGA_LGAS_URL =
  'https://raw.githubusercontent.com/wmgeolab/geoBoundaries/main/releaseData/gbOpen/NGA/ADM2/geoBoundaries-NGA-ADM2.geojson';

export default function ValidationMap({ points }: Props) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInstanceRef   = useRef<L.Map | null>(null);
  const stateLayerRef    = useRef<L.GeoJSON | null>(null);
  const lgaLayerRef      = useRef<L.GeoJSON | null>(null);
  const layerControlRef  = useRef<L.Control.Layers | null>(null);

  const { selectedState } = useAppStore();

  const [mapReady, setMapReady]             = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stateBoundaries, setStateBoundaries] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [lgaBoundaries, setLgaBoundaries]     = useState<any>(null);
  const [statesLoading, setStatesLoading]   = useState(false);
  const [lgasLoading, setLgasLoading]       = useState(false);

  const stackpointCount = useMemo(() => points.filter(p => p.stackpointIssue).length, [points]);
  const proximityCount  = useMemo(() => points.filter(p => p.proximityIssue).length, [points]);
  const uniqueStackpointLocations = useMemo(() => {
    const s = new Set(points.filter(p => p.stackpointIssue).map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`));
    return s.size;
  }, [points]);

  // Fetch Nigeria state boundaries once on mount
  useEffect(() => {
    setStatesLoading(true);
    fetch(NGA_STATES_URL)
      .then(r => r.json())
      .then(data => setStateBoundaries(data))
      .catch(() => {})
      .finally(() => setStatesLoading(false));
  }, []);

  // Fetch LGA boundaries on demand (large file — user-triggered)
  const loadLgas = useCallback(() => {
    if (lgaBoundaries || lgasLoading) return;
    setLgasLoading(true);
    fetch(NGA_LGAS_URL)
      .then(r => r.json())
      .then(data => setLgaBoundaries(data))
      .catch(() => {})
      .finally(() => setLgasLoading(false));
  }, [lgaBoundaries, lgasLoading]);

  // ── Effect 1: initialise map + markers (re-runs only when points change) ──
  useEffect(() => {
    if (!mapRef.current) return;

    // Destroy any previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current   = null;
      layerControlRef.current  = null;
      stateLayerRef.current    = null;
      lgaLayerRef.current      = null;
      setMapReady(false);
    }
    if (!points.length) return;

    const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const centerLon = points.reduce((s, p) => s + p.lon, 0) / points.length;

    const map = L.map(mapRef.current, { center: [centerLat, centerLon], zoom: 9 });
    mapInstanceRef.current = map;

    // Base tile layers
    const hybridTile = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      attribution: '© Google Hybrid', maxZoom: 20,
    });
    const satelliteTile = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: '© Google Satellite', maxZoom: 20,
    });
    const osmTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors', maxZoom: 19,
    });
    hybridTile.addTo(map);

    // Marker groups
    const stackGroup = L.featureGroup();
    const proxGroup  = L.featureGroup();

    points.forEach(p => {
      const isStack   = p.stackpointIssue;
      const fill      = isStack ? '#dc2626' : '#f97316';
      const border    = isStack ? '#991b1b' : '#c2410c';
      const popupHtml = `
        <div style="min-width:220px;font-family:Inter,sans-serif;font-size:12px;line-height:1.5;">
          <b style="color:${fill};display:block;margin-bottom:6px;font-size:13px;">
            ${isStack ? '🔴 STACKPOINT ISSUE' : '🟠 PROXIMITY ISSUE'}
          </b>
          <div><b>HH ID:</b> ${p.hhId}</div>
          <div><b>Village:</b> ${p.village}</div>
          <div style="font-family:monospace;background:#f8fafc;padding:4px 6px;border-radius:6px;margin:4px 0;">
            ${p.lat.toFixed(7)}, ${p.lon.toFixed(7)}
          </div>
          <div style="color:${fill};margin-bottom:6px;">${isStack ? p.stackpointMsg : p.proximityMsg}</div>
          <a href="https://www.google.com/maps?q=${p.lat},${p.lon}" target="_blank"
             style="color:#0090fc;text-decoration:none;font-weight:600;">📍 Open in Google Maps ↗</a>
        </div>`;

      const marker = L.circleMarker([p.lat, p.lon], {
        radius: isStack ? 12 : 9,
        color: border, fillColor: fill, fillOpacity: 0.85, weight: 2.5,
      }).bindPopup(popupHtml, { maxWidth: 280 });

      if (isStack) {
        marker.addTo(stackGroup);
        L.circle([p.lat, p.lon], {
          radius: 50, color: '#dc2626', fill: false, weight: 1.5, opacity: 0.5, dashArray: '6 4',
        }).addTo(stackGroup);
      } else {
        marker.addTo(proxGroup);
      }
    });

    stackGroup.addTo(map);
    proxGroup.addTo(map);

    const allBounds = L.featureGroup([stackGroup, proxGroup]);
    if (allBounds.getLayers().length > 0) map.fitBounds(allBounds.getBounds().pad(0.15));

    const lc = L.control.layers(
      { 'Google Hybrid': hybridTile, 'Google Satellite': satelliteTile, 'OpenStreetMap': osmTile },
      { 'Stackpoint Issues': stackGroup, 'Proximity Issues': proxGroup },
      { position: 'topright', collapsed: true }
    );
    lc.addTo(map);
    layerControlRef.current = lc;

    // Legend
    const legend = new L.Control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.innerHTML = `
        <div style="background:white;padding:10px 12px;border-radius:10px;
                    box-shadow:0 4px 14px rgba(0,0,0,0.18);font-family:Inter,sans-serif;
                    font-size:11px;min-width:140px;border:1px solid #e2e8f0;">
          <b style="display:block;margin-bottom:6px;color:#0f172a;font-size:12px;">Validation Issues</b>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="width:12px;height:12px;border-radius:50%;background:#dc2626;display:inline-block;
                         border:2px solid #991b1b;flex-shrink:0;"></span>
            <span>Stackpoint — ${stackpointCount}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:9px;height:9px;border-radius:50%;background:#f97316;display:inline-block;
                         border:2px solid #c2410c;flex-shrink:0;"></span>
            <span>Proximity — ${proximityCount}</span>
          </div>
          <div style="margin-top:6px;padding-top:6px;border-top:1px solid #f1f5f9;color:#64748b;font-size:10px;">
            Total: ${points.length} records
          </div>
        </div>`;
      return div;
    };
    legend.addTo(map);

    setMapReady(true);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current  = null;
        layerControlRef.current = null;
        stateLayerRef.current   = null;
        lgaLayerRef.current     = null;
      }
      setMapReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  // ── Effect 2: add / refresh state boundary layer ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lc  = layerControlRef.current;
    if (!mapReady || !map || !stateBoundaries) return;

    if (stateLayerRef.current) {
      try { lc?.removeLayer(stateLayerRef.current); } catch { /* noop */ }
      map.removeLayer(stateLayerRef.current);
      stateLayerRef.current = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = L.geoJSON(stateBoundaries as any, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      style: (feature: any) => {
        const isSelected = feature?.properties?.shapeName === selectedState;
        return {
          color:       isSelected ? '#33A6FD' : '#475569',
          weight:      isSelected ? 3          : 1,
          fillColor:   '#33A6FD',
          fillOpacity: isSelected ? 0.07       : 0,
          opacity:     isSelected ? 1          : 0.45,
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onEachFeature: (feature: any, lyr) => {
        const name = feature?.properties?.shapeName ?? '';
        if (name) lyr.bindTooltip(name, { sticky: true, opacity: 0.9 });
      },
    });

    stateLayerRef.current = layer;
    layer.addTo(map);
    lc?.addOverlay(layer, '🗺️ State Boundaries');
  }, [mapReady, stateBoundaries, selectedState]);

  // ── Effect 3: add LGA boundary layer when data is fetched ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lc  = layerControlRef.current;
    if (!mapReady || !map || !lgaBoundaries) return;

    if (lgaLayerRef.current) {
      try { lc?.removeLayer(lgaLayerRef.current); } catch { /* noop */ }
      map.removeLayer(lgaLayerRef.current);
      lgaLayerRef.current = null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layer = L.geoJSON(lgaBoundaries as any, {
      style: { color: '#94a3b8', weight: 0.8, fillOpacity: 0, opacity: 0.6 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onEachFeature: (feature: any, lyr) => {
        const name = feature?.properties?.shapeName ?? '';
        if (name) lyr.bindTooltip(name, { sticky: true, opacity: 0.85 });
      },
    });

    lgaLayerRef.current = layer;
    layer.addTo(map);
    lc?.addOverlay(layer, '📍 LGA Boundaries');
  }, [mapReady, lgaBoundaries]);

  if (!points.length) {
    return (
      <div className="card">
        <div className="card-header flex items-center gap-2">
          <Map className="w-5 h-5 text-white" />
          <span className="card-title">GPS Validation Map</span>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-emerald-600">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
            <Map className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="font-semibold">No GPS issues detected</p>
          <p className="text-sm text-slate-400 mt-1">No stackpoint or proximity errors in this dataset</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center gap-2">
        <Map className="w-5 h-5 text-white" />
        <span className="card-title">GPS Validation Issues Map</span>
        <span className="ml-auto text-white/80 text-sm">{points.length} affected records</span>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="p-3 text-center">
          <p className="text-xl font-bold text-red-600">{stackpointCount}</p>
          <p className="text-xs text-slate-500 font-medium">Stackpoint HHs</p>
          <p className="text-[10px] text-slate-400">{uniqueStackpointLocations} locations</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xl font-bold text-orange-500">{proximityCount}</p>
          <p className="text-xs text-slate-500 font-medium">Proximity HHs</p>
          <p className="text-[10px] text-slate-400">~30m radius</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-xl font-bold text-slate-700">{points.length}</p>
          <p className="text-xs text-slate-500 font-medium">Total Affected</p>
          <p className="text-[10px] text-slate-400">Field check needed</p>
        </div>
      </div>

      {/* Boundary controls bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50 flex-wrap text-xs">
        <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="text-slate-500 font-medium">Boundaries:</span>
        <span className="flex items-center gap-1 text-slate-600">
          {statesLoading
            ? <><Loader2 className="w-3 h-3 animate-spin text-slate-400" /> Loading states...</>
            : stateBoundaries
              ? <span className="text-emerald-600 font-medium">
                  ✓ States loaded · <span className="font-bold text-[#33A6FD]">{selectedState}</span> highlighted
                </span>
              : <span className="text-amber-600">States unavailable (offline?)</span>
          }
        </span>
        <span className="text-slate-300 hidden sm:inline">|</span>
        <button
          onClick={loadLgas}
          disabled={lgasLoading || !!lgaBoundaries}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200
                     hover:border-[#33A6FD] hover:bg-blue-50 transition-all
                     disabled:opacity-60 disabled:cursor-default"
        >
          {lgasLoading
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading LGAs...</>
            : lgaBoundaries
              ? '✓ LGA Boundaries Loaded'
              : '+ Load LGA Boundaries'
          }
        </button>
      </div>

      {/* Map — responsive height: capped at 520px, min 55% viewport height */}
      <div ref={mapRef} style={{ width: '100%', height: 'min(520px, 58vh)' }} />
    </div>
  );
}
