import type { AgriDemoBundleOut } from '@repo/api';
import type { FeatureCollection } from 'geojson';
import type { AgriDemoData } from './agri-types';

/** 接口未返回行政区界时，地图仅渲染地块；行政区图层为空集 */
export const EMPTY_AGRI_BOUNDARY: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export function mapAgriDemoBundleResponse(raw: AgriDemoBundleOut): AgriDemoData {
  return {
    meta: {
      regionName: raw.meta.region_name,
      indexLabel: raw.meta.index_label,
      indexKey: raw.meta.index_key,
      demo: raw.meta.demo,
      updatedAt: raw.meta.updated_at,
    },
    parcels: raw.parcels as FeatureCollection,
    timeseries: Object.fromEntries(
      Object.entries(raw.timeseries).map(([k, pts]) => [
        k,
        pts.map((p) => ({ date: p.date, ndvi: p.ndvi, quality: p.quality })),
      ])
    ),
  };
}
