import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { AgriMapRasterConfig } from './agri-map-config';
import { resolveStandaloneTitilerTileJsonUrl, type TitilerTileJson } from './titiler';

type LngLatBounds = { minLng: number; minLat: number; maxLng: number; maxLat: number };

function extendLngLatBounds(lng: number, lat: number, b: LngLatBounds | null): LngLatBounds | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return b;
  if (!b) return { minLng: lng, maxLng: lng, minLat: lat, maxLat: lat };
  return {
    minLng: Math.min(b.minLng, lng),
    maxLng: Math.max(b.maxLng, lng),
    minLat: Math.min(b.minLat, lat),
    maxLat: Math.max(b.maxLat, lat),
  };
}

/** 遍历 GeoJSON 坐标嵌套数组，收集二维点 */
function walkGeoJsonCoords(node: unknown, b: LngLatBounds | null): LngLatBounds | null {
  if (!Array.isArray(node)) return b;
  const arr = node as unknown[];
  if (
    arr.length >= 2 &&
    typeof arr[0] === 'number' &&
    typeof arr[1] === 'number' &&
    !Array.isArray(arr[0])
  ) {
    return extendLngLatBounds(arr[0], arr[1], b);
  }
  let out = b;
  for (const c of arr) {
    out = walkGeoJsonCoords(c, out);
  }
  return out;
}

function boundsFromFeatureCollection(fc: FeatureCollection): LngLatBounds | null {
  let b: LngLatBounds | null = null;
  for (const f of fc.features) {
    const coords = f.geometry && 'coordinates' in f.geometry ? f.geometry.coordinates : null;
    if (coords != null) b = walkGeoJsonCoords(coords, b);
  }
  return b;
}

function fitMapToParcels(map: maplibregl.Map, parcelsFc: FeatureCollection, durationMs = 0) {
  const parcelExtent = boundsFromFeatureCollection(parcelsFc);
  if (!parcelExtent) return;
  const { minLng, minLat, maxLng, maxLat } = parcelExtent;
  const w = maxLng - minLng;
  const h = maxLat - minLat;
  const padLng = w < 1e-6 ? 0.02 : w * 0.06;
  const padLat = h < 1e-6 ? 0.02 : h * 0.06;
  try {
    map.fitBounds(
      [
        [minLng - padLng, minLat - padLat],
        [maxLng + padLng, maxLat + padLat],
      ],
      { padding: 32, duration: durationMs, maxZoom: 12 }
    );
  } catch {
    /* ignore */
  }
}

function polygonRingCentroid(ring: number[][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  let n = 0;
  const len = ring.length;
  const end =
    len > 1 && ring[0]![0] === ring[len - 1]![0] && ring[0]![1] === ring[len - 1]![1] ? len - 1 : len;
  for (let i = 0; i < end; i++) {
    const p = ring[i]!;
    sumLng += p[0]!;
    sumLat += p[1]!;
    n++;
  }
  return n > 0 ? [sumLng / n, sumLat / n] : [ring[0]![0], ring[0]![1]];
}

function geometryLabelPoint(geometry: Geometry): [number, number] | null {
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0];
    return ring?.length ? polygonRingCentroid(ring) : null;
  }
  if (geometry.type === 'MultiPolygon') {
    const ring = geometry.coordinates[0]?.[0];
    return ring?.length ? polygonRingCentroid(ring) : null;
  }
  return null;
}

/** 区县中心（properties.center）+ 地块多边形质心，供 symbol 图层显示地名 */
function buildPlaceLabelFeatures(
  boundaryFc: FeatureCollection,
  parcelsFc: FeatureCollection
): FeatureCollection {
  const features: Feature[] = [];

  for (const f of boundaryFc.features) {
    const p = f.properties as Record<string, unknown> | null;
    const name = p && typeof p.name === 'string' ? p.name : null;
    const center = (p?.center ?? p?.centroid) as unknown;
    if (
      name &&
      Array.isArray(center) &&
      center.length >= 2 &&
      typeof center[0] === 'number' &&
      typeof center[1] === 'number'
    ) {
      features.push({
        type: 'Feature',
        properties: { name, kind: 'district' },
        geometry: { type: 'Point', coordinates: [center[0], center[1]] },
      });
    }
  }

  for (const f of parcelsFc.features) {
    const p = f.properties as Record<string, unknown> | null;
    const name = p && typeof p.name === 'string' ? p.name : null;
    if (name && f.geometry) {
      const pt = geometryLabelPoint(f.geometry);
      if (pt) {
        features.push({
          type: 'Feature',
          properties: { name, kind: 'parcel' },
          geometry: { type: 'Point', coordinates: pt },
        });
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

export type AgriMapViewHandle = {
  /** 将当前折线闭合为 Polygon（至少 3 个顶点），成功则触发 onDrawPolygon 并清空草稿 */
  completeDraw: () => boolean;
  /** 清空当前圈地草稿 */
  cancelDraw: () => void;
  /** 按当前 parcels（含合并后的圈地）范围重新 fit */
  fitToDataExtent: () => void;
};

type Props = {
  boundary: FeatureCollection;
  parcels: FeatureCollection;
  /** 地块填色用的 `properties` 字段，如 `ndvi_latest` / `evi_latest` / `ndwi_latest` */
  parcelIndexLatestField?: string;
  selectedParcelId: string | null;
  onSelectParcel: (id: string) => void;
  /** 高程/影像 XYZ；未配置时仅保留演示矢量底图 + 地块 */
  rasterConfig?: AgriMapRasterConfig | null;
  /** TiTiler TileJSON / 瓦片加载失败时回调（不经业务后端） */
  onTitilerError?: (message: string) => void;
  /** 为 true 时：地图点击追加顶点、显示预览，不触发地块选中 */
  drawMode?: boolean;
  /** 完成圈地（至少 3 点）时回调 */
  onDrawPolygon?: (feature: Feature<Polygon>) => void;
  /** 按 Esc 或外部取消时可选通知父组件同步状态 */
  onDrawCancel?: () => void;
};

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

/** 自定义栅格底图（高德/XYZ）时不用演示矢量底图，避免两套底图叠在一起 */
const MINIMAL_STYLE: StyleSpecification = {
  version: 8,
  name: 'agri-minimal',
  glyphs: 'https://demotiles.maplibre.org/fonts/{fontstack}/{range}.pbf',
  sources: {},
  layers: [
    {
      id: 'agri-background',
      type: 'background',
      paint: { 'background-color': '#94a3b8' },
    },
  ],
};

export const AgriMapView = forwardRef<AgriMapViewHandle, Props>(function AgriMapView(
  {
    boundary,
    parcels,
    parcelIndexLatestField = 'ndvi_latest',
    selectedParcelId,
    onSelectParcel,
    rasterConfig = null,
    onTitilerError,
    drawMode = false,
    onDrawPolygon,
    onDrawCancel,
  },
  forwardedRef
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const parcelsFitRef = useRef(parcels);
  parcelsFitRef.current = parcels;
  const onSelectRef = useRef(onSelectParcel);
  const selectedRef = useRef(selectedParcelId);
  const drawModeRef = useRef(drawMode);
  const onDrawPolygonRef = useRef(onDrawPolygon);
  const draftVerticesRef = useRef<[number, number][]>([]);
  const previewLngLatRef = useRef<[number, number] | null>(null);
  const syncDrawDraftRef = useRef<(() => void) | null>(null);
  const drawControlRef = useRef<{ complete: () => boolean; cancel: () => void } | null>(null);

  onSelectRef.current = onSelectParcel;
  selectedRef.current = selectedParcelId;
  drawModeRef.current = drawMode;
  onDrawPolygonRef.current = onDrawPolygon;

  useImperativeHandle(forwardedRef, () => ({
    completeDraw: () => drawControlRef.current?.complete() ?? false,
    cancelDraw: () => drawControlRef.current?.cancel(),
    fitToDataExtent: () => {
      const map = mapRef.current;
      if (!map?.isStyleLoaded()) return;
      fitMapToParcels(map, parcelsFitRef.current, 420);
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const urls = rasterConfig?.basemapRasterTileUrls;
    const single = rasterConfig?.basemapRasterTiles;
    const basemapTiles =
      urls && urls.length > 0 ? urls : single ? [single] : [];
    const useMinimalStyle = basemapTiles.length > 0;

    const titilerCfg = rasterConfig?.titiler;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: useMinimalStyle ? MINIMAL_STYLE : MAP_STYLE,
      center: [123.4, 41.85],
      zoom: 8.2,
      localIdeographFontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif",
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    let cancelled = false;
    let onDrawClickHandler: ((e: maplibregl.MapMouseEvent) => void) | undefined;
    let onDrawMoveHandler: ((e: maplibregl.MapMouseEvent) => void) | undefined;

    const onResize = () => map.resize();
    window.addEventListener('resize', onResize);

    const applySelection = (id: string | null) => {
      if (!map.getLayer('parcels-selected')) return;
      map.setFilter('parcels-selected', ['==', ['get', 'id'], id ?? '__none__']);
    };

    const demTemplate = rasterConfig?.demTilesTemplate;
    const demEncoding = rasterConfig?.demEncoding ?? 'terrarium';
    const terrainExaggeration = rasterConfig?.terrainExaggeration;

    map.on('load', () => {
      const root = map.getStyle().layers ?? [];
      const bottomAnchor = root[0]?.id;

      if (basemapTiles.length > 0) {
        const gaode = basemapTiles.some((u) => u.includes('is.autonavi.com'));
        map.addSource('agri-basemap-raster', {
          type: 'raster',
          tiles: basemapTiles,
          tileSize: 256,
          ...(gaode ? { attribution: '© 高德地图' } : {}),
        });
        map.addLayer(
          {
            id: 'agri-basemap-raster',
            type: 'raster',
            source: 'agri-basemap-raster',
            paint: { 'raster-opacity': 1 },
          },
          bottomAnchor
        );
      }

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

      if (demTemplate) {
        map.addSource('agri-dem', {
          type: 'raster-dem',
          tiles: [demTemplate],
          tileSize: 256,
          encoding: demEncoding,
          maxzoom: 14,
        });
        map.addLayer(
          {
            id: 'agri-hillshade',
            type: 'hillshade',
            source: 'agri-dem',
            paint: {
              'hillshade-exaggeration': 0.4,
              'hillshade-highlight-color': '#ffffff',
              'hillshade-shadow-color': '#2d3748',
              'hillshade-accent-color': '#4a5568',
            },
          },
          'admin-boundary-fill'
        );

        if (terrainExaggeration != null && terrainExaggeration > 0) {
          map.setTerrain({ source: 'agri-dem', exaggeration: terrainExaggeration });
        }
      }

      map.addSource('parcels', { type: 'geojson', data: parcels });
      map.addLayer({
        id: 'parcels-fill',
        type: 'fill',
        source: 'parcels',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['to-number', ['get', parcelIndexLatestField]], 0.45],
            0.25,
            '#d73027',
            0.45,
            '#fee08b',
            0.65,
            '#91cf60',
            0.85,
            '#1a9850',
          ],
          'fill-opacity': [
            'case',
            ['==', ['get', 'source'], 'drawn'],
            0.38,
            0.55,
          ],
        },
      });
      map.addLayer({
        id: 'parcels-line',
        type: 'line',
        source: 'parcels',
        paint: { 'line-color': '#1f2937', 'line-width': 1 },
      });
      map.addLayer({
        id: 'parcels-line-drawn',
        type: 'line',
        source: 'parcels',
        filter: ['==', ['get', 'source'], 'drawn'],
        paint: {
          'line-color': '#4338ca',
          'line-width': 2,
          'line-dasharray': [2, 1.5],
        },
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

      const labelFc = buildPlaceLabelFeatures(boundary, parcels);
      map.addSource('place-labels', { type: 'geojson', data: labelFc });
      map.addLayer({
        id: 'district-name-labels',
        type: 'symbol',
        source: 'place-labels',
        filter: ['==', ['get', 'kind'], 'district'],
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 13,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
        },
        paint: {
          'text-color': '#0f172a',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.8,
          'text-halo-blur': 0.4,
        },
      });
      map.addLayer({
        id: 'parcel-name-labels',
        type: 'symbol',
        source: 'place-labels',
        filter: ['==', ['get', 'kind'], 'parcel'],
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 12,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-anchor': 'center',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#14532d',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-halo-blur': 0.3,
        },
      });

      map.addSource('draw-draft', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'draw-draft-fill',
        type: 'fill',
        source: 'draw-draft',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#d97706', 'fill-opacity': 0.22 },
      });
      map.addLayer({
        id: 'draw-draft-line',
        type: 'line',
        source: 'draw-draft',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': '#b45309',
          'line-width': 2,
          'line-dasharray': [2, 2],
        },
      });
      map.addLayer({
        id: 'draw-draft-verts',
        type: 'circle',
        source: 'draw-draft',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 6,
          'circle-color': '#ea580c',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
        },
      });

      const syncDrawDraft = () => {
        if (cancelled || !map.getSource('draw-draft')) return;
        const verts = draftVerticesRef.current;
        const pv = previewLngLatRef.current;
        const features: Feature[] = [];
        if (verts.length >= 1) {
          const lineCoords: [number, number][] = [...verts];
          if (pv) lineCoords.push(pv);
          features.push({
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lineCoords },
          });
        }
        if (verts.length >= 2 && pv) {
          const ring: [number, number][] = [...verts, pv, verts[0]!];
          features.push({
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: [ring] },
          });
        }
        for (let i = 0; i < verts.length; i++) {
          features.push({
            type: 'Feature',
            properties: { v: i },
            geometry: { type: 'Point', coordinates: verts[i]! },
          });
        }
        (map.getSource('draw-draft') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features,
        });
      };
      syncDrawDraftRef.current = syncDrawDraft;

      drawControlRef.current = {
        complete: () => {
          const v = draftVerticesRef.current;
          if (v.length < 3) return false;
          const ring: [number, number][] = [...v, v[0]!];
          const feature: Feature<Polygon> = {
            type: 'Feature',
            properties: { source: 'agri-draw' },
            geometry: { type: 'Polygon', coordinates: [ring] },
          };
          onDrawPolygonRef.current?.(feature);
          draftVerticesRef.current = [];
          previewLngLatRef.current = null;
          syncDrawDraft();
          return true;
        },
        cancel: () => {
          draftVerticesRef.current = [];
          previewLngLatRef.current = null;
          syncDrawDraft();
        },
      };

      onDrawClickHandler = (e: maplibregl.MapMouseEvent) => {
        if (!drawModeRef.current || cancelled) return;
        draftVerticesRef.current = [...draftVerticesRef.current, [e.lngLat.lng, e.lngLat.lat]];
        previewLngLatRef.current = null;
        syncDrawDraft();
      };
      onDrawMoveHandler = (e: maplibregl.MapMouseEvent) => {
        if (!drawModeRef.current || cancelled || draftVerticesRef.current.length === 0) {
          if (previewLngLatRef.current) {
            previewLngLatRef.current = null;
            syncDrawDraft();
          }
          return;
        }
        previewLngLatRef.current = [e.lngLat.lng, e.lngLat.lat];
        syncDrawDraft();
      };
      map.on('click', onDrawClickHandler);
      map.on('mousemove', onDrawMoveHandler);

      map.on('click', 'parcels-fill', (e) => {
        if (drawModeRef.current) return;
        const f = e.features?.[0];
        const id = f?.properties?.id;
        if (typeof id === 'string') onSelectRef.current(id);
      });
      map.on('mouseenter', 'parcels-fill', () => {
        if (drawModeRef.current) {
          map.getCanvas().style.cursor = 'crosshair';
          return;
        }
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'parcels-fill', () => {
        if (drawModeRef.current) {
          map.getCanvas().style.cursor = 'crosshair';
          return;
        }
        map.getCanvas().style.cursor = '';
      });

      applySelection(selectedRef.current);

      fitMapToParcels(map, parcels, 0);

      if (titilerCfg) {
        const tileJsonUrl = resolveStandaloneTitilerTileJsonUrl({
          standaloneBaseUrl: titilerCfg.standaloneBaseUrl,
          tileJsonPath: titilerCfg.tileJsonPath,
          cogUrl: titilerCfg.cogUrl,
          rescale: titilerCfg.rescale,
          colormapName: titilerCfg.colormapName,
          tilesize: titilerCfg.tilesize,
        });

        const applyTileJsonResponse = async (res: Response) => {
          if (cancelled || !mapRef.current) return;

          if (res.status === 404) {
            onTitilerError?.(
              'TiTiler 返回 404：确认进程已启动，且 TileJSON 为 {BASE}/WebMercatorQuad/tilejson.json（无 /cog 前缀），url= 对服务端可读。详见 docs/agri-remote-sensing/前端对接指南.md。'
            );
            return;
          }

          const text = await res.text();
          if (cancelled || !mapRef.current) return;

          if (!res.ok) {
            let detail = res.statusText;
            try {
              const j = JSON.parse(text) as { detail?: unknown };
              if (j.detail != null) detail = String(j.detail);
            } catch {
              if (text) detail = text.slice(0, 200);
            }
            onTitilerError?.(`TiTiler TileJSON 失败 (${res.status}): ${detail}`);
            return;
          }

          const tj = JSON.parse(text) as TitilerTileJson;
          if (!tj.tiles?.length) {
            onTitilerError?.('TileJSON 响应缺少 tiles 数组');
            return;
          }

          if (!mapRef.current || map.getSource('titiler-cog')) return;

          map.addSource('titiler-cog', {
            type: 'raster',
            tiles: tj.tiles,
            tileSize: tj.tileSize ?? 256,
            ...(tj.bounds ? { bounds: tj.bounds } : {}),
            ...(tj.minzoom != null ? { minzoom: tj.minzoom } : {}),
            ...(tj.maxzoom != null ? { maxzoom: tj.maxzoom } : {}),
          });
          map.addLayer(
            {
              id: 'titiler-cog',
              type: 'raster',
              source: 'titiler-cog',
              paint: { 'raster-opacity': titilerCfg.rasterOpacity ?? 0.85 },
            },
            'parcels-fill'
          );

          if (map.getLayer('district-name-labels')) map.moveLayer('district-name-labels');
          if (map.getLayer('parcel-name-labels')) map.moveLayer('parcel-name-labels');
          for (const lid of ['parcels-line-drawn', 'draw-draft-fill', 'draw-draft-line', 'draw-draft-verts'] as const) {
            if (map.getLayer(lid)) map.moveLayer(lid);
          }
          if (map.getLayer('parcels-selected')) map.moveLayer('parcels-selected');
        };

        if (tileJsonUrl) {
          void (async () => {
            try {
              const res = await fetch(tileJsonUrl, { mode: 'cors', credentials: 'omit' });
              await applyTileJsonResponse(res);
            } catch (e) {
              if (!cancelled) {
                const hint =
                  e instanceof TypeError
                    ? '（常见原因：TiTiler 未放行浏览器源，需在服务端 CORS 允许前端 dev origin）'
                    : '';
                onTitilerError?.(
                  `${e instanceof Error ? e.message : 'TiTiler TileJSON 请求异常'}${hint}`
                );
              }
            }
          })();
        } else {
          onTitilerError?.(
            '无法解析 TileJSON 地址：请设置 VITE_TITILER_BASE_URL，或将 VITE_AGRI_TITILER_TILEJSON_PATH 设为完整 https URL。'
          );
        }
      }
    });

    return () => {
      cancelled = true;
      if (onDrawClickHandler) map.off('click', onDrawClickHandler);
      if (onDrawMoveHandler) map.off('mousemove', onDrawMoveHandler);
      drawControlRef.current = null;
      syncDrawDraftRef.current = null;
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [boundary, parcels, parcelIndexLatestField, rasterConfig, onTitilerError]);

  useEffect(() => {
    if (!drawMode) {
      draftVerticesRef.current = [];
      previewLngLatRef.current = null;
      syncDrawDraftRef.current?.();
    }
    const m = mapRef.current;
    if (m?.getCanvas()) {
      m.getCanvas().style.cursor = drawMode ? 'crosshair' : '';
    }
  }, [drawMode]);

  useEffect(() => {
    if (!drawMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      drawControlRef.current?.cancel();
      onDrawCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawMode, onDrawCancel]);

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
      className="agri-map-view-host h-[min(520px,55vh)] w-full min-h-[360px] overflow-hidden rounded-lg border border-neutral-200 shadow-sm"
      role="application"
      aria-label="农业遥感地图"
    />
  );
});
