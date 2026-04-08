import type { FeatureCollection } from 'geojson';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';

type Props = {
  boundary: FeatureCollection;
  parcels: FeatureCollection;
  selectedParcelId: string | null;
  onSelectParcel: (id: string) => void;
};

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

export function AgriMapView({ boundary, parcels, selectedParcelId, onSelectParcel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelectParcel);
  const selectedRef = useRef(selectedParcelId);
  onSelectRef.current = onSelectParcel;
  selectedRef.current = selectedParcelId;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [123.4, 41.85],
      zoom: 8.2,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);

    const applySelection = (id: string | null) => {
      if (!map.getLayer('parcels-selected')) return;
      map.setFilter('parcels-selected', ['==', ['get', 'id'], id ?? '__none__']);
    };

    map.on('load', () => {
      map.addSource('admin-boundary', { type: 'geojson', data: boundary });
      map.addLayer({
        id: 'admin-boundary-fill',
        type: 'fill',
        source: 'admin-boundary',
        paint: { 'fill-color': '#059669', 'fill-opacity': 0.06 },
      });
      map.addLayer({
        id: 'admin-boundary-line',
        type: 'line',
        source: 'admin-boundary',
        paint: { 'line-color': '#047857', 'line-width': 1.2, 'line-opacity': 0.85 },
      });

      map.addSource('parcels', { type: 'geojson', data: parcels });
      map.addLayer({
        id: 'parcels-fill',
        type: 'fill',
        source: 'parcels',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'ndvi_latest'],
            0.25,
            '#d73027',
            0.45,
            '#fee08b',
            0.65,
            '#91cf60',
            0.85,
            '#1a9850',
          ],
          'fill-opacity': 0.55,
        },
      });
      map.addLayer({
        id: 'parcels-line',
        type: 'line',
        source: 'parcels',
        paint: { 'line-color': '#1f2937', 'line-width': 1 },
      });
      map.addLayer({
        id: 'parcels-selected',
        type: 'line',
        source: 'parcels',
        paint: {
          'line-color': '#047857',
          'line-width': 3,
          'line-opacity': 1,
        },
        filter: ['==', ['get', 'id'], '__none__'],
      });

      map.on('click', 'parcels-fill', (e) => {
        const f = e.features?.[0];
        const id = f?.properties?.id;
        if (typeof id === 'string') onSelectRef.current(id);
      });
      map.on('mouseenter', 'parcels-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'parcels-fill', () => {
        map.getCanvas().style.cursor = '';
      });

      applySelection(selectedRef.current);
    });

    return () => {
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [boundary, parcels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const run = () => {
      if (!map.getLayer('parcels-selected')) return;
      map.setFilter('parcels-selected', ['==', ['get', 'id'], selectedParcelId ?? '__none__']);
    };
    if (map.isStyleLoaded()) run();
    else map.once('load', run);
  }, [selectedParcelId]);

  return (
    <div
      ref={containerRef}
      className="h-[min(520px,55vh)] w-full min-h-[360px] overflow-hidden rounded-lg border border-neutral-200 shadow-sm"
      role="application"
      aria-label="农业遥感地图"
    />
  );
}
