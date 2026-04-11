import type { Feature, Polygon, Position } from 'geojson';

/** 后端可能使用的地名相关字段（按常见优先级） */
const PLACE_NAME_KEYS = [
  'place_name',
  'placeName',
  'locality',
  'district',
  'district_name',
  'town',
  'town_name',
  'county',
  'village',
  'village_name',
  'address',
  'location',
  'location_name',
] as const;

export function placeNameFromParcelProperties(p: Record<string, unknown>): string {
  for (const k of PLACE_NAME_KEYS) {
    const v = p[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '—';
}

function ringWithoutClosingDuplicate(ring: Position[]): [number, number][] {
  const out: [number, number][] = [];
  for (const pos of ring) {
    const lng = Number(pos[0]);
    const lat = Number(pos[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) out.push([lng, lat]);
  }
  if (out.length > 1) {
    const a = out[0]!;
    const b = out[out.length - 1]!;
    if (a[0] === b[0] && a[1] === b[1]) out.pop();
  }
  return out;
}

/**
 * 在地块中心附近切平面上做鞋带公式求面积（m²→公顷），适用于单块农田尺度；
 * 若后端已给 `area_ha` 可不再调用。
 */
export function polygonAreaHectaresFromRing(ring: [number, number][]): number {
  if (ring.length < 3) return 0;
  let cx = 0;
  let cy = 0;
  for (const [lng, lat] of ring) {
    cx += lng;
    cy += lat;
  }
  cx /= ring.length;
  cy /= ring.length;
  const R = 6378137;
  const rad = Math.PI / 180;
  const cosLat = Math.cos(cy * rad);
  const pts = ring.map(([lng, lat]) => {
    const x = (lng - cx) * rad * R * cosLat;
    const y = (lat - cy) * rad * R;
    return [x, y] as [number, number];
  });
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]!;
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2) / 10_000;
}

export function polygonAreaHectaresFromPolygon(geometry: Polygon): number {
  const ring = geometry.coordinates[0];
  if (!ring?.length) return 0;
  return polygonAreaHectaresFromRing(ringWithoutClosingDuplicate(ring));
}

export function polygonAreaHectaresFromFeature(feature: Feature<Polygon>): number {
  if (feature.geometry?.type !== 'Polygon') return 0;
  return polygonAreaHectaresFromPolygon(feature.geometry);
}
