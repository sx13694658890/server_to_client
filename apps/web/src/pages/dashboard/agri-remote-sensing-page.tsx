import { GlobalOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  App,
  Alert,
  Button,
  Card,
  DatePicker,
  List,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { getApiErrorMessage, type AgriDrawnParcelOut, type AgriRegionSummaryOut } from '@repo/api';
import type { Feature, Polygon } from 'geojson';
import { useDocumentTitle } from 'usehooks-ts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AGRI_CHART_INDEX_KEYS,
  AgriMapView,
  type AgriMapViewHandle,
  AgriTimeseriesChart,
  EMPTY_AGRI_BOUNDARY,
  getAgriMapRasterConfig,
  hasAgriRasterLayers,
  mapAgriDemoBundleResponse,
  parcelLatestPropertyKey,
  placeNameFromParcelProperties,
  polygonAreaHectaresFromPolygon,
  readParcelIndexLatest,
  readTimeseriesPointValue,
} from '../../features/agri-rs';
import type { AgriDemoData, AgriIndicesSeriesMap } from '../../features/agri-rs';
import { useWebApi } from '../../hooks/use-web-api';

const INDEX_LABEL_FALLBACK: Record<string, string> = {
  ndvi: 'NDVI',
  evi: 'EVI',
  ndwi: 'NDWI',
};

type ParcelRow = {
  id: string;
  name: string;
  /** 村/乡镇等，来自 properties 多字段解析 */
  placeName: string;
  crop: string;
  area_ha: number;
  /** 未返回 `properties.area_ha` 时由前端按多边形估算 */
  areaIsEstimate?: boolean;
  ndvi_latest: number;
  /** `seed` 预置演示；`drawn` 用户圈地（与 FRONTEND_API_AGRI.md parcels 合并约定一致） */
  source: string;
};

function firstParcelId(parcels: AgriDemoData['parcels']): string | null {
  const f = parcels.features[0];
  const p = f?.properties as Record<string, unknown> | null | undefined;
  const id = p?.id;
  return id != null ? String(id) : null;
}

function parcelsToRows(
  parcels: AgriDemoData['parcels'],
  regionName: string | undefined,
  indexKey: string
): ParcelRow[] {
  const region = regionName?.trim() ?? '';
  return parcels.features.map((f) => {
    const p = f.properties as Record<string, unknown>;
    let area = Number(p.area_ha);
    let areaIsEstimate = false;
    if (!Number.isFinite(area) || area <= 0) {
      if (f.geometry?.type === 'Polygon') {
        area = polygonAreaHectaresFromPolygon(f.geometry);
        areaIsEstimate = true;
      }
    }
    const idx = readParcelIndexLatest(p, indexKey);
    const src = p.source != null ? String(p.source) : 'seed';
    const place = placeNameFromParcelProperties(p);
    return {
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      placeName: place !== '—' ? place : region || '—',
      crop: String(p.crop ?? '—'),
      area_ha: Number.isFinite(area) && area > 0 ? area : 0,
      ...(areaIsEstimate ? { areaIsEstimate: true } : {}),
      ndvi_latest: idx,
      source: src,
    };
  });
}

function countDrawnParcels(parcels: AgriDemoData['parcels']): number {
  return parcels.features.filter((f) => {
    const p = f.properties as Record<string, unknown> | null;
    return p?.source === 'drawn';
  }).length;
}

function isPolygonFeature(v: unknown): v is Feature<Polygon> {
  if (!v || typeof v !== 'object') return false;
  const o = v as { type?: string; geometry?: { type?: string } };
  return o.type === 'Feature' && o.geometry?.type === 'Polygon';
}

/**
 * 按 FRONTEND_API_AGRI.md §2.5：将 POST 返回的 `parcel_feature` 并入 parcels，并设 `timeseries[timeseries_key] = []`。
 * 返回 `null` 表示响应不含可用 `parcel_feature`，应回退为全量 GET demo-bundle。
 */
function mergeDrawnCreateIntoAgriData(prev: AgriDemoData, created: AgriDrawnParcelOut): AgriDemoData | null {
  const raw = created.parcel_feature;
  if (!raw || !isPolygonFeature(raw)) return null;
  const baseProps = (raw.properties ?? {}) as Record<string, unknown>;
  const geomArea = polygonAreaHectaresFromPolygon(raw.geometry);
  const areaFromFeature = Number(baseProps.area_ha);
  const areaFromRoot = Number(created.area_ha);
  const resolvedArea =
    Number.isFinite(areaFromFeature) && areaFromFeature > 0
      ? areaFromFeature
      : Number.isFinite(areaFromRoot) && areaFromRoot > 0
        ? areaFromRoot
        : Number(geomArea.toFixed(4));
  const props: Record<string, unknown> = {
    ...baseProps,
    area_ha: resolvedArea,
  };
  const key =
    (typeof created.timeseries_key === 'string' && created.timeseries_key.trim()) ||
    (props.id != null ? String(props.id) : '') ||
    created.id;
  const feature: Feature<Polygon> = {
    type: 'Feature',
    properties: props,
    geometry: raw.geometry,
  };
  return {
    ...prev,
    parcels: {
      type: 'FeatureCollection',
      features: [...prev.parcels.features, feature],
    },
    timeseries: {
      ...prev.timeseries,
      [key]: [],
    },
  };
}

function selectIdFromDrawCreateResponse(created: AgriDrawnParcelOut): string {
  const tk = created.timeseries_key?.trim();
  if (tk) return tk;
  const pr = created.parcel_feature?.properties as Record<string, unknown> | undefined;
  if (pr?.id != null) return String(pr.id);
  return created.id;
}

export function AgriRemoteSensingPage() {
  useDocumentTitle('农业遥感 · client-react-sp');
  const { message } = App.useApp();
  const api = useWebApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AgriDemoData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [lastDrawn, setLastDrawn] = useState<Feature<Polygon> | null>(null);
  const [savingDraw, setSavingDraw] = useState(false);
  const [regions, setRegions] = useState<AgriRegionSummaryOut[]>([]);
  /** 与 `GET /agri/*` 的 `region_id` 一致；未选时由接口默认首个演示区 */
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  /** 请求 `demo-bundle` / 时序的 `index_key`（ndvi、evi、ndwi 等） */
  const [selectedIndexKey, setSelectedIndexKey] = useState('ndvi');
  const [tsRange, setTsRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [tsLoading, setTsLoading] = useState(false);
  const [tsPullNonce, setTsPullNonce] = useState(0);
  /** 图表：并行拉取 NDVI/EVI/NDWI 三条时序 */
  const [indicesSeries, setIndicesSeries] = useState<AgriIndicesSeriesMap>({});
  const mapHandleRef = useRef<AgriMapViewHandle>(null);
  const multiTsFetchedKeyRef = useRef<string>('');

  const regionQuery = useMemo(() => {
    const envId = import.meta.env.VITE_AGRI_REGION_ID?.trim();
    const rid = selectedRegionId ?? (envId || undefined);
    return rid ? { region_id: rid } : undefined;
  }, [selectedRegionId]);

  const fetchDemoBundleMapped = useCallback(async () => {
    const params: { region_id?: string; index_key: string } = {
      index_key: selectedIndexKey.trim().toLowerCase() || 'ndvi',
    };
    if (regionQuery?.region_id) params.region_id = regionQuery.region_id;
    const { data: raw } = await api.agri.getDemoBundle(params);
    return mapAgriDemoBundleResponse(raw);
  }, [api.agri, regionQuery, selectedIndexKey]);

  const scheduleFitMapToExtent = useCallback(() => {
    window.setTimeout(() => {
      mapHandleRef.current?.fitToDataExtent();
    }, 0);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchDemoBundleMapped();
      multiTsFetchedKeyRef.current = '';
      setData(next);
      setSelectedId(firstParcelId(next.parcels));
    } catch (e) {
      const msg = getApiErrorMessage(e);
      setError(msg);
      setData(null);
      setSelectedId(null);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchDemoBundleMapped, message]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 拉取可选区域，并设置默认 `region_id`（与 FRONTEND_API_AGRI.md §2.1 一致） */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.agri.getRegions();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setRegions(list);
        setSelectedRegionId((prev) => {
          if (prev != null) return prev;
          const env = import.meta.env.VITE_AGRI_REGION_ID?.trim();
          if (env && list.some((r) => r.id === env)) return env;
          const demo = list.find((r) => r.demo);
          return demo?.id ?? list[0]?.id ?? null;
        });
      } catch {
        if (!cancelled) setRegions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api.agri]);

  /** 并行拉取 NDVI / EVI / NDWI 单块时序（§2.4），统一日期轴在图表中叠加展示 */
  useEffect(() => {
    if (!data || !selectedId) {
      setIndicesSeries({});
      return;
    }
    const fromStr = tsRange?.[0]?.format('YYYY-MM-DD');
    const toStr = tsRange?.[1]?.format('YYYY-MM-DD');
    const fetchKey = `multi|${selectedId}|${regionQuery?.region_id ?? ''}|${fromStr ?? ''}|${toStr ?? ''}|${tsPullNonce}`;
    if (fetchKey === multiTsFetchedKeyRef.current) return;

    setIndicesSeries({});
    let cancelled = false;
    setTsLoading(true);
    void (async () => {
      try {
        const base = {
          ...regionQuery,
          ...(fromStr ? { from: fromStr } : {}),
          ...(toStr ? { to: toStr } : {}),
        };
        const results = await Promise.all(
          AGRI_CHART_INDEX_KEYS.map((k) => api.agri.getParcelTimeseries(selectedId, { ...base, index_key: k }))
        );
        if (cancelled) return;
        const next: AgriIndicesSeriesMap = {};
        AGRI_CHART_INDEX_KEYS.forEach((k, i) => {
          const pts = results[i]?.data?.points ?? [];
          next[k] = pts.map((p) => {
            const row = p as Record<string, unknown>;
            const { value, quality } = readTimeseriesPointValue(row, k);
            return { date: String(row.date ?? (p as { date?: string }).date), ndvi: value, quality };
          });
        });
        setIndicesSeries(next);
        multiTsFetchedKeyRef.current = fetchKey;
      } catch (e) {
        if (!cancelled) message.warning(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setTsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api.agri, data, message, regionQuery, selectedId, tsPullNonce, tsRange]);

  useEffect(() => {
    multiTsFetchedKeyRef.current = '';
  }, [selectedId, selectedRegionId]);

  /** 与 Segmented 一致：用于读 `properties.*_latest`，避免新 bundle 未返回时仍用旧 `meta.indexKey` */
  const indexKeyLive = selectedIndexKey.trim().toLowerCase() || 'ndvi';

  const parcelRows = useMemo(
    () => (data ? parcelsToRows(data.parcels, data.meta.regionName, indexKeyLive) : []),
    [data, indexKeyLive]
  );
  const drawnParcelCount = useMemo(() => (data ? countDrawnParcels(data.parcels) : 0), [data]);

  const selectedParcel = parcelRows.find((r) => r.id === selectedId);
  const hasMultiChartData = AGRI_CHART_INDEX_KEYS.some((k) => (indicesSeries[k]?.length ?? 0) > 0);

  const onSelectParcel = useCallback((id: string) => setSelectedId(id), []);

  const rasterConfig = useMemo(() => getAgriMapRasterConfig(), []);
  const rasterActive = hasAgriRasterLayers(rasterConfig);

  const onTitilerError = useCallback(
    (msg: string) => {
      message.warning(msg);
    },
    [message]
  );

  const onDrawPolygon = useCallback(
    async (feature: Feature<Polygon>) => {
      setDrawMode(false);
      setLastDrawn(feature);
      setSavingDraw(true);
      try {
        const { data: created } = await api.agri.createDrawnParcel({
          geometry: feature.geometry,
          ...(regionQuery?.region_id ? { region_id: regionQuery.region_id } : {}),
          name: `圈地 ${new Date().toLocaleString('zh-CN', { hour12: false })}`,
        });

        let merged = false;
        setData((prev) => {
          if (!prev) return prev;
          const next = mergeDrawnCreateIntoAgriData(prev, created);
          if (next) {
            merged = true;
            return next;
          }
          return prev;
        });

        if (!merged) {
          const next = await fetchDemoBundleMapped();
          setData(next);
        }

        setSelectedId(selectIdFromDrawCreateResponse(created));
        scheduleFitMapToExtent();
        message.success(
          merged ? '圈地已保存，监测地块与地图已更新（parcel_feature）' : '圈地已保存，已重新拉取 demo-bundle'
        );
      } catch (e) {
        message.error(getApiErrorMessage(e));
      } finally {
        setSavingDraw(false);
      }
    },
    [api.agri, fetchDemoBundleMapped, message, regionQuery, scheduleFitMapToExtent]
  );

  const onDrawCancel = useCallback(() => {
    setDrawMode(false);
  }, []);

  const startDraw = useCallback(() => {
    setDrawMode(true);
    message.info('在地图上依次点击添加顶点，点「完成圈地」闭合；Esc 取消。');
  }, [message]);

  const completeDraw = useCallback(() => {
    const ok = mapHandleRef.current?.completeDraw() ?? false;
    if (!ok) message.warning('至少需要 3 个顶点才能完成圈地。');
  }, [message]);

  const cancelDraw = useCallback(() => {
    mapHandleRef.current?.cancelDraw();
    setDrawMode(false);
  }, []);

  const indexLabelForTable =
    data?.meta.indexKey === indexKeyLive
      ? (data.meta.indexLabel ?? INDEX_LABEL_FALLBACK[indexKeyLive] ?? '指数')
      : (INDEX_LABEL_FALLBACK[indexKeyLive] ?? data?.meta.indexLabel ?? '指数');

  const columns: ColumnsType<ParcelRow> = useMemo(
    () => [
      { title: '地块', dataIndex: 'name', key: 'name', ellipsis: true, width: 120 },
      {
        title: '地名',
        dataIndex: 'placeName',
        key: 'placeName',
        width: 100,
        ellipsis: true,
        render: (v: string) => (v === '—' ? <Typography.Text type="secondary">—</Typography.Text> : v),
      },
      {
        title: '类型',
        dataIndex: 'source',
        key: 'source',
        width: 72,
        render: (src: string) =>
          src === 'drawn' ? <Tag color="geekblue">圈地</Tag> : <Tag color="default">演示</Tag>,
      },
      { title: '作物', dataIndex: 'crop', key: 'crop', width: 72 },
      {
        title: '面积(ha)',
        dataIndex: 'area_ha',
        key: 'area_ha',
        width: 88,
        render: (v: number, record: ParcelRow) => {
          if (!Number.isFinite(v) || v <= 0) return '—';
          const decimals = record.source === 'drawn' ? 2 : 1;
          const text = v.toFixed(decimals);
          return record.areaIsEstimate ? (
            <span title="未返回 area_ha，由多边形坐标估算">{text}</span>
          ) : (
            text
          );
        },
      },
      {
        title: indexLabelForTable,
        dataIndex: 'ndvi_latest',
        key: 'index_latest',
        width: 88,
        render: (v: number, record: ParcelRow) =>
          record.source === 'drawn' && !Number.isFinite(v) ? (
            <Tag>—</Tag>
          ) : (
            <Tag color={v >= 0.65 ? 'green' : v >= 0.45 ? 'gold' : 'red'}>
              {Number.isFinite(v) ? v.toFixed(2) : '—'}
            </Tag>
          ),
      },
    ],
    [indexLabelForTable]
  );

  const titleSuffix = data?.meta.demo === false ? '' : '（演示）';
  const updatedLabel = data?.meta.updatedAt
    ? (() => {
        try {
          return new Date(data.meta.updatedAt).toLocaleString();
        } catch {
          return data.meta.updatedAt;
        }
      })()
    : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography.Title level={4} className="!mb-1 flex items-center gap-2">
            <GlobalOutlined className="text-emerald-600" />
            农业遥感监测{titleSuffix}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm">
            {data
              ? `${data.meta.regionName} · 指数 ${data.meta.indexLabel}`
              : loading
                ? '正在加载…'
                : '—'}
          </Typography.Text>
        </div>
        <Space align="center" wrap className="text-sm text-neutral-600">
          <span className="text-neutral-500">区域</span>
          <Select
            allowClear
            placeholder="服务端默认区"
            className="min-w-[200px]"
            value={selectedRegionId ?? undefined}
            options={regions.map((r) => ({
              label: `${r.region_name}${r.demo ? '（演示）' : ''}`,
              value: r.id,
            }))}
            onChange={(v) => {
              setSelectedRegionId(v ?? null);
              const r = regions.find((x) => x.id === v);
              if (r?.index_key) setSelectedIndexKey(String(r.index_key).trim().toLowerCase());
            }}
          />
          <span className="text-neutral-500">指数</span>
          <Segmented
            size="small"
            options={[
              { label: 'NDVI', value: 'ndvi' },
              { label: 'EVI', value: 'evi' },
              { label: 'NDWI', value: 'ndwi' },
            ]}
            value={selectedIndexKey}
            onChange={(v) => setSelectedIndexKey(String(v))}
          />
          <span className="hidden sm:inline">高程/底图 XYZ</span>
          <Switch
            disabled
            checked={rasterActive}
            aria-label={rasterActive ? '已通过环境变量配置 XYZ' : '未配置，见 .env.development 说明'}
          />
        </Space>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          className="text-sm"
          message="农业遥感数据加载失败"
          description={error}
          action={
            <Button size="small" onClick={() => void load()}>
              重试
            </Button>
          }
        />
      ) : null}

      {import.meta.env.DEV && !rasterConfig.titiler ? (
        <Alert
          type="info"
          showIcon
          className="text-sm"
          message="可选：未配置 TiTiler 指数栅格"
          description={
            <>
              矢量地块与时序来自 <code className="rounded bg-neutral-100 px-1">GET /api/v1/agri/demo-bundle</code>
              ；未设置 COG / TileJSON 时不会请求 TiTiler。配置说明见{' '}
              <Typography.Text code className="text-xs">
                docs/agri-remote-sensing/前端对接指南.md
              </Typography.Text>
              、
              <Typography.Text code className="text-xs">
                TITILER_FRONTEND.md
              </Typography.Text>
              。
            </>
          }
        />
      ) : null}

      <Spin spinning={loading && !data} tip="加载农业遥感数据…">
        {data ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(300px,400px)_1fr]">
            <Card
              size="small"
              title="监测地块"
              className="shadow-sm"
              extra={
                drawnParcelCount > 0 ? (
                  <Typography.Text type="secondary" className="text-xs">
                    含圈地 {drawnParcelCount} 块
                  </Typography.Text>
                ) : null
              }
            >
              <Table<ParcelRow>
                size="small"
                rowKey="id"
                pagination={false}
                scroll={{ x: 640 }}
                columns={columns}
                dataSource={parcelRows}
                rowClassName={(r) => (r.id === selectedId ? 'bg-emerald-50' : '')}
                onRow={(record) => ({
                  onClick: () => setSelectedId(record.id),
                  style: { cursor: 'pointer' },
                })}
              />
            </Card>

            <Card
              size="small"
              title="地图"
              className="shadow-sm"
              extra={
                <Space size="small" wrap>
                  {!drawMode ? (
                    <Button size="small" type="default" onClick={startDraw} disabled={savingDraw}>
                      圈地
                    </Button>
                  ) : (
                    <>
                      <Button size="small" type="primary" onClick={completeDraw} disabled={savingDraw}>
                        完成圈地
                      </Button>
                      <Button size="small" onClick={cancelDraw} disabled={savingDraw}>
                        取消
                      </Button>
                    </>
                  )}
                </Space>
              }
            >
              <AgriMapView
                ref={mapHandleRef}
                boundary={EMPTY_AGRI_BOUNDARY}
                parcels={data.parcels}
                parcelIndexLatestField={parcelLatestPropertyKey(indexKeyLive)}
                selectedParcelId={selectedId}
                onSelectParcel={onSelectParcel}
                rasterConfig={rasterConfig}
                onTitilerError={rasterConfig.titiler ? onTitilerError : undefined}
                drawMode={drawMode}
                onDrawPolygon={onDrawPolygon}
                onDrawCancel={onDrawCancel}
              />
              <Typography.Paragraph type="secondary" className="mb-0 mt-2 text-xs">
                地块矢量来自 <code className="rounded bg-neutral-100 px-1">demo-bundle.parcels</code>
                （演示 + 已保存圈地合并）；圈地边界为紫色虚线。
                {savingDraw ? ' 正在写入服务器…' : ''}
              </Typography.Paragraph>
              {lastDrawn ? (
                <Typography.Paragraph type="secondary" className="mb-0 mt-1 text-xs">
                  最近一次提交：Polygon 外环 {lastDrawn.geometry.coordinates[0]?.length ?? 0} 个坐标（含闭合点）。
                </Typography.Paragraph>
              ) : null}
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <Typography.Text type="secondary" className="mb-2 block text-xs">
                  {INDEX_LABEL_FALLBACK[indexKeyLive] ?? data.meta.indexLabel} 填色（地块 properties.
                  {parcelLatestPropertyKey(indexKeyLive)}）
                </Typography.Text>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                  <LegendStop color="#d73027" label="&lt;0.35" />
                  <LegendStop color="#fee08b" label="0.35–0.55" />
                  <LegendStop color="#91cf60" label="0.55–0.70" />
                  <LegendStop color="#1a9850" label="&gt;0.70" />
                </div>
              </div>
            </Card>
          </div>
        ) : loading ? (
          <div className="min-h-[200px]" aria-hidden />
        ) : null}
      </Spin>

      {data ? (
        <Card
          size="small"
          title="时序曲线"
          className="shadow-sm"
          extra={
            <Space size="small" wrap align="center">
              <DatePicker.RangePicker
                value={tsRange}
                onChange={(v) => setTsRange(v)}
                allowEmpty={[true, true]}
              />
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={tsLoading}
                onClick={() => setTsPullNonce((n) => n + 1)}
              >
                刷新曲线
              </Button>
            </Space>
          }
        >
          {selectedParcel && hasMultiChartData ? (
            <AgriTimeseriesChart parcelName={selectedParcel.name} seriesByIndex={indicesSeries} />
          ) : selectedParcel && !tsLoading ? (
            <Typography.Text type="secondary">
              该地块暂无 NDVI/EVI/NDWI 时序数据
              {selectedParcel.source === 'drawn' ? '（圈地地块可能尚无观测序列，可稍后由服务端接入）' : ''}
            </Typography.Text>
          ) : selectedParcel && tsLoading ? (
            <Typography.Text type="secondary">正在加载 NDVI/EVI/NDWI 时序…</Typography.Text>
          ) : (
            <Typography.Text type="secondary">请选择地块查看多指数时序</Typography.Text>
          )}
        </Card>
      ) : null}

      <List
        size="small"
        header={<span className="text-sm font-medium text-neutral-700">数据来源</span>}
        bordered
        dataSource={[
          {
            k: '聚合接口',
            v: 'GET /api/v1/agri/demo-bundle（parcels 含演示 + 圈地；需登录）',
          },
          {
            k: '圈地入库',
            v: 'POST /api/v1/agri/drawn-parcels；响应含 parcel_feature / timeseries_key 时可本地合并；否则全量 GET demo-bundle（勿缓存）',
          },
          {
            k: '说明',
            v: 'docs/agri-remote-sensing/FRONTEND_API_AGRI.md',
          },
          ...(updatedLabel ? [{ k: '数据更新时间（服务端）', v: updatedLabel }] : []),
        ]}
        renderItem={(item) => (
          <List.Item className="!py-2">
            <Typography.Text className="text-sm">{item.k}</Typography.Text>
            <Typography.Text code className="max-w-[min(100%,520px)] whitespace-normal break-all text-xs">
              {item.v}
            </Typography.Text>
          </List.Item>
        )}
      />
    </div>
  );
}

function LegendStop({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-3 w-6 rounded-sm border border-neutral-200" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
