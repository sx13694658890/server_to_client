/**
 * 农业遥感地图：高程 XYZ（Terrain-RGB / Terrarium）与可选影像底图。
 * 在 `.env` 中配置，见 `getAgriMapRasterConfig`。
 *
 * 高德 web 瓦片为 Web 墨卡托 XYZ，可与 MapLibre `raster` 对接；底图为 GCJ-02，
 * 与 WGS84 矢量叠加时国内可能有数百米偏差，正式环境需统一坐标系或纠偏。
 * 使用高德数据须遵守其服务协议与授权要求。
 */
/** TiTiler 指数栅格（TileJSON 入口），见 docs/agri-remote-sensing/前端对接指南.md */
export type AgriTitilerConfig = {
  /**
   * 相对服务基址的路径（含 query），如 `WebMercatorQuad/tilejson.json?url=...`；
   * 或完整 `https://.../tilejson.json?...`（此时可不设 base）。与 `cogUrl` 二选一，优先本字段。
   */
  tileJsonPath?: string;
  /**
   * COG 的 HTTPS 地址（勿 encode）；与 `tileJsonPath` 二一时由前端拼 tilejson 请求。
   * 生产环境推荐由后端返回 `tileJsonPath` 或短期签名 URL，避免把任意 COG 暴露给前端拼接。
   */
  cogUrl?: string;
  rescale?: string;
  colormapName?: string;
  /** NDVI 等栅格透明度 */
  rasterOpacity?: number;
  /**
   * TiTiler 服务基址 `{BASE}`（`VITE_TITILER_BASE_URL`），如 `http://127.0.0.1:8008`。
   * 与相对 `tileJsonPath` 或 `cogUrl` 拼接时使用；完整 https TileJSON 时可省略。
   */
  standaloneBaseUrl?: string;
  /** 瓦片边长，与 MapLibre `tileSize` 一致，默认 256 */
  tilesize?: string;
};

export type AgriMapRasterConfig = {
  /**
   * 高程瓦片 URL 模板，须含 `{z}` `{x}` `{y}`（Web 墨卡托金字塔）。
   * 像素编码须与 `demEncoding` 一致（TiTiler `rio tiler` 的 terrainrgb / terrarium 等）。
   */
  demTilesTemplate?: string;
  /** 默认 `terrarium`；Mapbox / MapLibre 常用 `mapbox` Terrain-RGB */
  demEncoding: 'mapbox' | 'terrarium';
  /** >0 时 `map.setTerrain`，三维起伏（更吃 GPU） */
  terrainExaggeration?: number;
  /** 单模板 XYZ（png/jpg）；与 `basemapRasterTileUrls` 二选一 */
  basemapRasterTiles?: string;
  /**
   * 多子域轮询（如高德 webst01–04），每项须含 `{z}` `{x}` `{y}`。
   * 优先于 `basemapRasterTiles`。
   */
  basemapRasterTileUrls?: string[];
  titiler?: AgriTitilerConfig;
};

function buildGaodeBasemapUrls(): string[] | undefined {
  const on = import.meta.env.VITE_AGRI_GAODE_BASEMAP?.trim();
  if (on !== '1' && on?.toLowerCase() !== 'true') return undefined;
  const style = import.meta.env.VITE_AGRI_GAODE_STYLE?.trim() || '7';
  const proto =
    import.meta.env.VITE_AGRI_GAODE_HTTPS === '0' ||
    import.meta.env.VITE_AGRI_GAODE_HTTPS?.toLowerCase() === 'false'
      ? 'http'
      : 'https';
  return [1, 2, 3, 4].map(
    (n) =>
      `${proto}://webst0${n}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=${encodeURIComponent(style)}&x={x}&y={y}&z={z}`
  );
}

export function getAgriMapRasterConfig(): AgriMapRasterConfig {
  const dem = import.meta.env.VITE_AGRI_DEM_TILES?.trim();
  const basemap = import.meta.env.VITE_AGRI_BASEMAP_TILES?.trim();
  const gaodeUrls = buildGaodeBasemapUrls();
  const encRaw = import.meta.env.VITE_AGRI_DEM_ENCODING?.trim().toLowerCase();
  const encoding: 'mapbox' | 'terrarium' = encRaw === 'mapbox' ? 'mapbox' : 'terrarium';
  const ex = Number.parseFloat(import.meta.env.VITE_AGRI_TERRAIN_EXAGGERATION ?? '');
  const titilerPath = import.meta.env.VITE_AGRI_TITILER_TILEJSON_PATH?.trim();
  const titilerCog = import.meta.env.VITE_AGRI_TITILER_COG_URL?.trim();
  const titilerRescale = import.meta.env.VITE_AGRI_TITILER_RESCALE?.trim();
  const titilerCmap = import.meta.env.VITE_AGRI_TITILER_COLORMAP_NAME?.trim();
  const titilerOp = Number.parseFloat(import.meta.env.VITE_AGRI_TITILER_OPACITY ?? '0.85');
  const titilerTilesize = import.meta.env.VITE_AGRI_TITILER_TILESIZE?.trim() || '256';
  const titilerStandaloneBase =
    import.meta.env.VITE_TITILER_BASE_URL?.trim().replace(/\/$/, '') || undefined;
  const titiler: AgriTitilerConfig | undefined =
    titilerPath || titilerCog
      ? {
          standaloneBaseUrl: titilerStandaloneBase,
          tileJsonPath: titilerPath || undefined,
          cogUrl: titilerCog || undefined,
          rescale: titilerRescale || '-0.2,0.8',
          colormapName: titilerCmap || 'rdylgn',
          rasterOpacity: Number.isFinite(titilerOp) ? titilerOp : 0.85,
          tilesize: titilerTilesize,
        }
      : undefined;

  return {
    demTilesTemplate: dem || undefined,
    basemapRasterTileUrls: gaodeUrls,
    basemapRasterTiles: gaodeUrls ? undefined : basemap || undefined,
    demEncoding: encoding,
    terrainExaggeration: Number.isFinite(ex) && ex > 0 ? ex : undefined,
    titiler,
  };
}

export function hasAgriRasterLayers(c: AgriMapRasterConfig): boolean {
  return Boolean(
    c.demTilesTemplate ||
      c.basemapRasterTiles ||
      (c.basemapRasterTileUrls && c.basemapRasterTileUrls.length > 0) ||
      c.titiler
  );
}
