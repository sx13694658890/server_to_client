import type { FeatureCollection } from 'geojson';
import maplibregl, { type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import type { AgriMapRasterConfig } from './agri-map-config';
import { resolveStandaloneTitilerTileJsonUrl, type TitilerTileJson } from './titiler';

type Props = {
  boundary: FeatureCollection;
  parcels: FeatureCollection;
  selectedParcelId: string | null;
  onSelectParcel: (id: string) => void;
  /** 高程/影像 XYZ；未配置时仅保留演示矢量底图 + 地块 */
  rasterConfig?: AgriMapRasterConfig | null;
  /** TiTiler TileJSON / 瓦片加载失败时回调（不经业务后端） */
  onTitilerError?: (message: string) => void;
};

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

/** 自定义栅格底图（高德/XYZ）时不用演示矢量底图，避免两套底图叠在一起 */
const MINIMAL_STYLE: StyleSpecification = {
  version: 8,
  name: 'agri-minimal',
  sources: {},
  layers: [
    {
      id: 'agri-background',
      type: 'background',
      paint: { 'background-color': '#94a3b8' },
    },
  ],
};

export function AgriMapView({
  boundary,
  parcels,
  selectedParcelId,
  onSelectParcel,
  rasterConfig = null,
  onTitilerError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelectParcel);
  const selectedRef = useRef(selectedParcelId);
  onSelectRef.current = onSelectParcel;
  selectedRef.current = selectedParcelId;

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
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    let cancelled = false;

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

          // 默认视口在演示地块（沈阳）；COG 若在其它地区（如默认 OSGeo 芝加哥样例），不缩放到数据范围则视口内无瓦片，且 minzoom 常 > 初始 zoom。
          if (tj.bounds != null && tj.bounds.length === 4) {
            const [west, south, east, north] = tj.bounds;
            try {
              map.fitBounds(
                [
                  [west, south],
                  [east, north],
                ],
                {
                  padding: 40,
                  maxZoom: tj.maxzoom != null ? Math.min(tj.maxzoom, 18) : 18,
                  minZoom: tj.minzoom ?? undefined,
                  duration: 600,
                }
              );
            } catch {
              /* 无效 bounds 时忽略 */
            }
          }
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
      window.removeEventListener('resize', onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [boundary, parcels, rasterConfig, onTitilerError]);

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
}
