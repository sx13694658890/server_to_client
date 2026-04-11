/** 地块 GeoJSON `properties` 中「当前指数最新值」字段名（与常见后端约定一致） */
export function parcelLatestPropertyKey(indexKey: string): string {
  const k = indexKey.trim().toLowerCase();
  return k ? `${k}_latest` : 'ndvi_latest';
}

/** 从 `properties` 读取当前指数最新值；缺省时回退 `ndvi_latest` */
export function readParcelIndexLatest(properties: Record<string, unknown>, indexKey: string): number {
  const pk = parcelLatestPropertyKey(indexKey);
  const raw = properties[pk] ?? properties.ndvi_latest;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/** 时序点 JSON 可能用与 `index_key` 同名的字段存值，也可能统一用 `ndvi` */
export function readTimeseriesPointValue(
  point: Record<string, unknown>,
  indexKey: string
): { value: number; quality: string } {
  const k = indexKey.trim().toLowerCase() || 'ndvi';
  const raw = point[k] ?? point.ndvi ?? point.value;
  const n = Number(raw);
  return {
    value: Number.isFinite(n) ? n : NaN,
    quality: typeof point.quality === 'string' ? point.quality : String(point.quality ?? ''),
  };
}
