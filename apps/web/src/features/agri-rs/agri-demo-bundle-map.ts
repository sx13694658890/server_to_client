import type { AgriDemoBundleOut } from '@repo/api';
import type { FeatureCollection } from 'geojson';
import { readTimeseriesPointValue } from './agri-index-keys';
import type { AgriDemoData } from './agri-types';

/** 接口未返回行政区界时，地图仅渲染地块；行政区图层为空集 */
export const EMPTY_AGRI_BOUNDARY: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export function mapAgriDemoBundleResponse(raw: AgriDemoBundleOut): AgriDemoData {
  const indexKey = (raw.meta.index_key || 'ndvi').trim().toLowerCase() || 'ndvi';
  return {
    meta: {
      regionName: raw.meta.region_name,
      indexLabel: raw.meta.index_label,
      indexKey,
      demo: raw.meta.demo,
      updatedAt: raw.meta.updated_at,
    },
    parcels: raw.parcels as FeatureCollection,
    timeseries: Object.fromEntries(
      Object.entries(raw.timeseries ?? {}).map(([k, pts]) => {
        const arr = Array.isArray(pts) ? pts : [];
        return [
          k,
          arr.map((p) => {
            const row = p as Record<string, unknown>;
            const { value, quality } = readTimeseriesPointValue(row, indexKey);
            return { date: String(row.date ?? ''), ndvi: value, quality };
          }),
        ];
      })
    ),
  };
}
