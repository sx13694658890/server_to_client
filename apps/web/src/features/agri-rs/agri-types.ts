import type { FeatureCollection } from 'geojson';

export type NdviPoint = {
  date: string;
  ndvi: number;
  quality: string;
};

export type AgriDemoMeta = {
  regionName: string;
  indexLabel: string;
  dataDisclaimer: string;
};

export type AgriDemoData = {
  meta: AgriDemoMeta;
  parcels: FeatureCollection;
  timeseries: Record<string, NdviPoint[]>;
};
