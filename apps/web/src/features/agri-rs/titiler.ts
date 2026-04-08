/**
 * TiTiler COG · 与 docs/agri-remote-sensing/前端对接指南.md 路径一致（根路径 TilerFactory，无 `/cog` 前缀）
 */

export type TitilerTileJson = {
  tiles: string[];
  tileSize?: number;
  bounds?: [number, number, number, number];
  minzoom?: number;
  maxzoom?: number;
};

/**
 * TileJSON 相对服务基址的路径前缀，如 `WebMercatorQuad/tilejson.json?...`
 * @see docs/agri-remote-sensing/前端对接指南.md §3.2
 */
export const TITILER_TILEJSON_PATH_PREFIX = 'WebMercatorQuad/tilejson.json';

export type BuildTitilerTileJsonQueryOptions = {
  rescale?: string;
  colormapName?: string;
  bidx?: string;
  /** 与 MapLibre `tileSize` 一致，默认 256 */
  tilesize?: string;
};

/**
 * 拼 tilejson 查询串（`url` 为数据源地址，勿二次 encode）。
 * @see https://developmentseed.org/titiler/user_guide/rendering/#rescaling
 */
export function buildTitilerTileJsonQuery(
  dataUrl: string,
  options?: BuildTitilerTileJsonQueryOptions
): string {
  const p = new URLSearchParams();
  p.set('url', dataUrl);
  p.set('tilesize', options?.tilesize?.trim() || '256');
  p.set('rescale', options?.rescale ?? '-0.2,0.8');
  p.set('colormap_name', options?.colormapName ?? 'rdylgn');
  if (options?.bidx) p.set('bidx', options.bidx);
  return p.toString();
}

export function titilerTileJsonPathFromCog(
  cogHttpsUrl: string,
  options?: BuildTitilerTileJsonQueryOptions
): string {
  return `${TITILER_TILEJSON_PATH_PREFIX}?${buildTitilerTileJsonQuery(cogHttpsUrl, options)}`;
}

/** 解析 TileJSON 请求地址（直连 TiTiler 服务基址或完整 TileJSON URL） */
export type TitilerStandaloneInput = {
  /** 服务基址 `{BASE}`，无尾斜杠；与相对 `tileJsonPath` / `cogUrl` 拼路径时必填 */
  standaloneBaseUrl?: string;
  tileJsonPath?: string;
  cogUrl?: string;
  rescale?: string;
  colormapName?: string;
  tilesize?: string;
};

/**
 * TileJSON 绝对请求 URL。
 * - `tileJsonPath` 已是 `http(s)://...` 时原样返回（可不配 `standaloneBaseUrl`）。
 * - 否则须有 `standaloneBaseUrl`；仅有 `cogUrl` 时：`{base}/WebMercatorQuad/tilejson.json?...`
 */
export function resolveStandaloneTitilerTileJsonUrl(
  cfg: TitilerStandaloneInput
): string | null {
  const tjp = cfg.tileJsonPath?.trim();
  if (tjp && /^https?:\/\//i.test(tjp)) return tjp;

  const base = (cfg.standaloneBaseUrl ?? '').trim().replace(/\/$/, '');
  if (!base) return null;

  if (tjp) {
    return `${base}/${tjp.replace(/^\//, '')}`;
  }
  const cog = cfg.cogUrl?.trim();
  if (cog) {
    const qs = buildTitilerTileJsonQuery(cog, {
      rescale: cfg.rescale,
      colormapName: cfg.colormapName,
      tilesize: cfg.tilesize,
    });
    return `${base}/WebMercatorQuad/tilejson.json?${qs}`;
  }
  return null;
}
