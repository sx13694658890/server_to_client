import { GlobalOutlined } from '@ant-design/icons';
import { App, Alert, Button, Card, List, Space, Spin, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Feature, Polygon } from 'geojson';
import { getApiErrorMessage } from '@repo/api';
import { useDocumentTitle } from 'usehooks-ts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AgriMapView,
  type AgriMapViewHandle,
  AgriTimeseriesChart,
  EMPTY_AGRI_BOUNDARY,
  getAgriMapRasterConfig,
  hasAgriRasterLayers,
  mapAgriDemoBundleResponse,
} from '../../features/agri-rs';
import type { AgriDemoData, NdviPoint } from '../../features/agri-rs';
import { useWebApi } from '../../hooks/use-web-api';

type ParcelRow = {
  id: string;
  name: string;
  crop: string;
  area_ha: number;
  ndvi_latest: number;
};

function firstParcelId(parcels: AgriDemoData['parcels']): string | null {
  const f = parcels.features[0];
  const p = f?.properties as Record<string, unknown> | null | undefined;
  const id = p?.id;
  return id != null ? String(id) : null;
}

function parcelsToRows(parcels: AgriDemoData['parcels']): ParcelRow[] {
  return parcels.features.map((f) => {
    const p = f.properties as Record<string, unknown>;
    const area = Number(p.area_ha);
    const ndvi = Number(p.ndvi_latest);
    return {
      id: String(p.id ?? ''),
      name: String(p.name ?? ''),
      crop: String(p.crop ?? '—'),
      area_ha: Number.isFinite(area) ? area : 0,
      ndvi_latest: Number.isFinite(ndvi) ? ndvi : 0,
    };
  });
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
  const mapHandleRef = useRef<AgriMapViewHandle>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const regionId = import.meta.env.VITE_AGRI_REGION_ID?.trim();
      const { data: raw } = await api.agri.getDemoBundle(
        regionId ? { region_id: regionId } : undefined
      );
      const next = mapAgriDemoBundleResponse(raw);
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
  }, [api.agri, message]);

  useEffect(() => {
    void load();
  }, [load]);

  const parcelRows = useMemo(() => (data ? parcelsToRows(data.parcels) : []), [data]);

  const selectedParcel = parcelRows.find((r) => r.id === selectedId);
  const series: NdviPoint[] = selectedId && data ? (data.timeseries[selectedId] ?? []) : [];

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
    (feature: Feature<Polygon>) => {
      setDrawMode(false);
      setLastDrawn(feature);
      const ring = feature.geometry.coordinates[0] ?? [];
      const n =
        ring.length > 1 &&
        ring[0]![0] === ring[ring.length - 1]![0] &&
        ring[0]![1] === ring[ring.length - 1]![1]
          ? ring.length - 1
          : ring.length;
      message.success(`已圈定区域（${n} 个顶点），可在控制台或后续接口中使用 GeoJSON。`);
      if (import.meta.env.DEV) console.info('[agri-draw] polygon', feature);
    },
    [message]
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

  const columns: ColumnsType<ParcelRow> = [
    { title: '地块', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '作物', dataIndex: 'crop', key: 'crop', width: 88 },
    {
      title: '面积(ha)',
      dataIndex: 'area_ha',
      key: 'area_ha',
      width: 96,
      render: (v: number) => v.toFixed(1),
    },
    {
      title: 'NDVI',
      dataIndex: 'ndvi_latest',
      key: 'ndvi_latest',
      width: 88,
      render: (v: number) => (
        <Tag color={v >= 0.65 ? 'green' : v >= 0.45 ? 'gold' : 'red'}>{v.toFixed(2)}</Tag>
      ),
    },
  ];

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
        <Space align="center" className="text-sm text-neutral-600">
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
          <div className="grid gap-4 xl:grid-cols-[minmax(260px,320px)_1fr]">
            <Card size="small" title="监测地块" className="shadow-sm">
              <Table<ParcelRow>
                size="small"
                rowKey="id"
                pagination={false}
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
                    <Button size="small" type="default" onClick={startDraw}>
                      圈地
                    </Button>
                  ) : (
                    <>
                      <Button size="small" type="primary" onClick={completeDraw}>
                        完成圈地
                      </Button>
                      <Button size="small" onClick={cancelDraw}>
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
                selectedParcelId={selectedId}
                onSelectParcel={onSelectParcel}
                rasterConfig={rasterConfig}
                onTitilerError={rasterConfig.titiler ? onTitilerError : undefined}
                drawMode={drawMode}
                onDrawPolygon={onDrawPolygon}
                onDrawCancel={onDrawCancel}
              />
              {lastDrawn ? (
                <Typography.Paragraph type="secondary" className="mb-0 mt-2 text-xs">
                  最近一次圈地：已保存为 GeoJSON Polygon（{lastDrawn.geometry.coordinates[0]?.length ?? 0}{' '}
                  个坐标点，含闭合重复点）。
                </Typography.Paragraph>
              ) : null}
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <Typography.Text type="secondary" className="mb-2 block text-xs">
                  NDVI 填色（地块均值）
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
        <Card size="small" title="时序曲线" className="shadow-sm">
          {selectedParcel && series.length > 0 ? (
            <AgriTimeseriesChart
              series={series}
              parcelName={selectedParcel.name}
              indexLabel={data.meta.indexLabel}
            />
          ) : (
            <Typography.Text type="secondary">请选择地块查看 NDVI 时序</Typography.Text>
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
            v: 'GET /api/v1/agri/demo-bundle（需登录，Bearer Token）',
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
