import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map } from 'lucide-react';

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

export default function ValidationMap({ points }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const stackpointCount = useMemo(() => points.filter((p) => p.stackpointIssue).length, [points]);
  const proximityCount = useMemo(() => points.filter((p) => p.proximityIssue).length, [points]);
  const uniqueStackpointLocations = useMemo(() => {
    const s = new Set(points.filter((p) => p.stackpointIssue).map((p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`));
    return s.size;
  }, [points]);

  useEffect(() => {
    if (!mapRef.current || !points.length) return;

    // Remove previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const centerLon = points.reduce((s, p) => s + p.lon, 0) / points.length;

    // Create map WITHOUT default controls so we control tile layers precisely
    const map = L.map(mapRef.current, {
      center: [centerLat, centerLon],
      zoom: 9,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    // ── Base tile layers (only one added to map initially) ──
    const hybridTile = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      attribution: '© Google Hybrid',
      maxZoom: 20,
    });
    const satelliteTile = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      attribution: '© Google Satellite',
      maxZoom: 20,
    });
    const osmTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });

    // Add default base layer
    hybridTile.addTo(map);

    // ── Overlay feature groups ──
    const stackGroup = L.featureGroup();
    const proxGroup = L.featureGroup();

    points.forEach((p) => {
      const isStack = p.stackpointIssue;
      const fillColor = isStack ? '#dc2626' : '#f97316';
      const borderColor = isStack ? '#991b1b' : '#c2410c';

      const popupHtml = `
        <div style="min-width:230px;font-family:Inter,sans-serif;font-size:12px;line-height:1.5;">
          <b style="color:${fillColor};display:block;margin-bottom:6px;font-size:13px;">
            ${isStack ? '🔴 STACKPOINT ISSUE' : '🟠 PROXIMITY ISSUE'}
          </b>
          <div><b>HH ID:</b> ${p.hhId}</div>
          <div><b>Village:</b> ${p.village}</div>
          <div style="font-family:monospace;background:#f8fafc;padding:4px 6px;border-radius:6px;margin:4px 0;">
            ${p.lat.toFixed(7)}, ${p.lon.toFixed(7)}
          </div>
          <div style="color:${fillColor};margin-bottom:6px;">${isStack ? p.stackpointMsg : p.proximityMsg}</div>
          <a href="https://www.google.com/maps?q=${p.lat},${p.lon}" target="_blank"
             style="color:#0090fc;text-decoration:none;font-weight:600;">
            📍 Open in Google Maps ↗
          </a>
        </div>
      `;

      const marker = L.circleMarker([p.lat, p.lon], {
        radius: isStack ? 12 : 9,
        color: borderColor,
        fillColor,
        fillOpacity: 0.85,
        weight: 2.5,
      }).bindPopup(popupHtml, { maxWidth: 300, closeButton: true });

      if (isStack) {
        marker.addTo(stackGroup);
        // Draw 50m ring around each stackpoint cluster
        L.circle([p.lat, p.lon], {
          radius: 50,
          color: '#dc2626',
          fill: false,
          weight: 1.5,
          opacity: 0.5,
          dashArray: '6 4',
        }).addTo(stackGroup);
      } else {
        marker.addTo(proxGroup);
      }
    });

    // Add both overlay groups to map by default
    stackGroup.addTo(map);
    proxGroup.addTo(map);

    // Fit map to all markers
    const allBounds = L.featureGroup([stackGroup, proxGroup]);
    if (allBounds.getLayers().length > 0) {
      map.fitBounds(allBounds.getBounds().pad(0.15));
    }

    // ── Layer control: base layers + overlays ──
    L.control.layers(
      {
        'Google Hybrid': hybridTile,
        'Google Satellite': satelliteTile,
        'OpenStreetMap': osmTile,
      },
      {
        'Stackpoint Issues': stackGroup,
        'Proximity Issues': proxGroup,
      },
      { position: 'topright', collapsed: false }
    ).addTo(map);

    // ── Legend ──
    const legend = new L.Control({ position: 'bottomright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', '');
      div.innerHTML = `
        <div style="background:white;padding:12px 14px;border-radius:12px;
                    box-shadow:0 4px 14px rgba(0,0,0,0.18);font-family:Inter,sans-serif;
                    font-size:12px;min-width:170px;border:1px solid #e2e8f0;">
          <b style="display:block;margin-bottom:8px;color:#0f172a;font-size:13px;">Validation Issues</b>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
            <span style="width:14px;height:14px;border-radius:50%;background:#dc2626;
                         display:inline-block;border:2px solid #991b1b;flex-shrink:0;"></span>
            <span>Stackpoint — ${stackpointCount} HHs</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#f97316;
                         display:inline-block;border:2px solid #c2410c;flex-shrink:0;"></span>
            <span>Proximity — ${proximityCount} HHs</span>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9;
                      color:#64748b;font-size:11px;">
            Total: ${points.length} affected records
          </div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

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

      {/* Summary bar */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stackpointCount}</p>
          <p className="text-xs text-slate-500 font-medium">Stackpoint HHs</p>
          <p className="text-xs text-slate-400">{uniqueStackpointLocations} unique locations</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{proximityCount}</p>
          <p className="text-xs text-slate-500 font-medium">Proximity HHs</p>
          <p className="text-xs text-slate-400">Within ~30m radius</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">{points.length}</p>
          <p className="text-xs text-slate-500 font-medium">Total Affected</p>
          <p className="text-xs text-slate-400">Require field check</p>
        </div>
      </div>

      {/* Map container — must have explicit pixel height for Leaflet */}
      <div ref={mapRef} style={{ width: '100%', height: '540px' }} />
    </div>
  );
}
