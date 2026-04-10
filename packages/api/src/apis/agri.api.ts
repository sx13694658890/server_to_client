import type { AxiosInstance } from 'axios';

/** GeoJSON FeatureCollection（与后端 parcels 字段一致，避免 api 包依赖 @types/geojson） */
export type AgriParcelsGeoJson = {
  type: 'FeatureCollection';
  features: unknown[];
};

/** 与 OpenAPI `AgriDemoBundleOut` / FRONTEND_API_AGRI.md §2.2 对齐 */
export type AgriBundleMetaOut = {
  region_name: string;
  index_label: string;
  index_key: string;
  demo: boolean;
  updated_at?: string;
  map_options?: unknown | null;
};

export type AgriTimeseriesPointOut = {
  date: string;
  ndvi: number;
  quality: string;
};

export type AgriDemoBundleOut = {
  meta: AgriBundleMetaOut;
  parcels: AgriParcelsGeoJson;
  timeseries: Record<string, AgriTimeseriesPointOut[]>;
};

export function createAgriApi(client: AxiosInstance) {
  return {
    /** 首屏聚合：meta + 地块 GeoJSON + 全量时序 */
    getDemoBundle(params?: { region_id?: string }) {
      return client.get<AgriDemoBundleOut>('/agri/demo-bundle', { params });
    },
  };
}
