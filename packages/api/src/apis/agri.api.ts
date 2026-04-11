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

/** `GET /agri/regions` 单项，见 FRONTEND_API_AGRI.md §2.1 */
export type AgriRegionSummaryOut = {
  id: string;
  region_name: string;
  index_label: string;
  index_key: string;
  demo: boolean;
};

/** `GET /agri/parcels/{parcel_code}/timeseries` 响应，见 FRONTEND_API_AGRI.md §2.4 */
export type AgriParcelTimeseriesOut = {
  parcel_id: string;
  index_key: string;
  points: AgriTimeseriesPointOut[];
};

/** `POST /agri/drawn-parcels` 请求体，见 FRONTEND_API_AGRI.md §2.5 */
export type AgriDrawnParcelCreateBody = {
  geometry: { type: 'Polygon'; coordinates: number[][][] };
  region_id?: string;
  name?: string;
  extra?: Record<string, unknown>;
};

/** GeoJSON Feature（圈地项），与 demo-bundle `parcels.features[]` 单项结构一致；见 FRONTEND_API_AGRI.md §2.5 */
export type AgriParcelFeatureOut = {
  type: 'Feature';
  properties?: Record<string, unknown>;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
};

/** `POST /agri/drawn-parcels` 201 响应（含 `parcel_feature` / `timeseries_key` 时可本地合并，无需立即二次 GET） */
export type AgriDrawnParcelOut = {
  id: string;
  user_id: string;
  region_id: string | null;
  name: string | null;
  /** 面积（公顷），与 `parcel_feature.properties.area_ha` 一致，由服务端根据 geometry 计算 */
  area_ha?: number;
  geometry: { type: 'Polygon'; coordinates: number[][][] };
  extra: unknown;
  created_at: string;
  /** 与 `GET /agri/demo-bundle` 中圈地要素结构相同（含 `properties.source === "drawn"`） */
  parcel_feature?: AgriParcelFeatureOut;
  /** 等于 `parcel_feature.properties.id`，用于 `timeseries[timeseries_key]` */
  timeseries_key?: string;
};

export function createAgriApi(client: AxiosInstance) {
  return {
    /** 可选区域列表（用于 `region_id`），见 FRONTEND_API_AGRI.md §2.1 */
    getRegions() {
      return client.get<AgriRegionSummaryOut[]>('/agri/regions', {
        params: { _: Date.now() },
      });
    },
    /** 首屏聚合：meta + 地块 GeoJSON（已含圈地）+ 全量时序；`_` 避免缓存导致保存后列表不更新 */
    /** `index_key`：如 `ndvi` / `evi` / `ndwi`，与单块时序接口一致 */
    getDemoBundle(params?: { region_id?: string; index_key?: string }) {
      return client.get<AgriDemoBundleOut>('/agri/demo-bundle', {
        params: { ...(params ?? {}), _: Date.now() },
      });
    },
    /** 当前用户已保存圈地 GeoJSON FeatureCollection（带 `_` 时间戳避免 GET 缓存导致保存后不更新） */
    getDrawnParcels(params?: { region_id?: string }) {
      return client.get<AgriParcelsGeoJson>('/agri/drawn-parcels', {
        params: { ...(params ?? {}), _: Date.now() },
      });
    },
    /** 圈地入库（成功 201，见 `AgriDrawnParcelOut.parcel_feature`） */
    createDrawnParcel(body: AgriDrawnParcelCreateBody) {
      return client.post<AgriDrawnParcelOut>('/agri/drawn-parcels', body);
    },
    /** 单地块时序（`parcel_code` 为 p1… 或圈地 UUID）；见 FRONTEND_API_AGRI.md §2.4 */
    /** 单地块时序（按需/带日期范围），见 FRONTEND_API_AGRI.md §2.4 */
    getParcelTimeseries(
      parcelCode: string,
      params?: { region_id?: string; index_key?: string; from?: string; to?: string }
    ) {
      return client.get<AgriParcelTimeseriesOut>(`/agri/parcels/${encodeURIComponent(parcelCode)}/timeseries`, {
        params: { ...(params ?? {}), _: Date.now() },
      });
    },
  };
}
