import type { FeatureCollection } from 'geojson';

export type NdviPoint = {
  date: string;
  ndvi: number;
  quality: string;
};

export type AgriDemoMeta = {
  regionName: string;
  indexLabel: string;
  indexKey?: string;
  demo?: boolean;
  /** ISO 8601，来自服务端 `updated_at` */
  updatedAt?: string;
};

export type AgriDemoData = {
  meta: AgriDemoMeta;
  parcels: FeatureCollection;
  timeseries: Record<string, NdviPoint[]>;
};
