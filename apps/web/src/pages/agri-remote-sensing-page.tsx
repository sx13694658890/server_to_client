import { InfoCircleOutlined, GlobalOutlined } from '@ant-design/icons';
import { Alert, Card, List, Space, Switch, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FeatureCollection } from 'geojson';
import agriDemo from '@repo/data-mock/agri-demo.json';
import shenyangBoundary from '@repo/data-mock/shenyang.json';
import { useDocumentTitle } from 'usehooks-ts';
import { useCallback, useMemo, useState } from 'react';
import { AgriMapView, AgriTimeseriesChart } from '../features/agri-rs';
import type { AgriDemoData, NdviPoint } from '../features/agri-rs';

const demo = agriDemo as AgriDemoData;
const boundary = shenyangBoundary as FeatureCollection;

type ParcelRow = {
  id: string;
  name: string;
  crop: string;
  area_ha: number;
  ndvi_latest: number;
};

export function AgriRemoteSensingPage() {
  useDocumentTitle('农业遥感 · client-react-sp');

  const parcelRows: ParcelRow[] = useMemo(
    () =>
      demo.parcels.features.map((f) => {
        const p = f.properties as Record<string, unknown>;
        return {
          id: String(p.id),
          name: String(p.name),
          crop: String(p.crop),
          area_ha: Number(p.area_ha),
          ndvi_latest: Number(p.ndvi_latest),
        };
      }),
    []
  );

  const [selectedId, setSelectedId] = useState<string | null>(parcelRows[0]?.id ?? null);

  const selectedParcel = parcelRows.find((r) => r.id === selectedId);
  const series: NdviPoint[] = selectedId ? (demo.timeseries[selectedId] ?? []) : [];

  const onSelectParcel = useCallback((id: string) => setSelectedId(id), []);

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
      render: (v: number) => <Tag color={v >= 0.65 ? 'green' : v >= 0.45 ? 'gold' : 'red'}>{v.toFixed(2)}</Tag>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography.Title level={4} className="!mb-1 flex items-center gap-2">
            <GlobalOutlined className="text-emerald-600" />
            农业遥感监测（演示）
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm">
            {demo.meta.regionName} · 指数 {demo.meta.indexLabel}
          </Typography.Text>
        </div>
        <Space align="center" className="text-sm text-neutral-600">
          <span className="hidden sm:inline">栅格 NDVI 图层</span>
          <Switch disabled checked={false} aria-label="栅格图层占位，待后端瓦片" />
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message={demo.meta.dataDisclaimer}
        className="text-sm"
      />

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

        <Card size="small" title="地图" className="shadow-sm">
          <AgriMapView
            boundary={boundary}
            parcels={demo.parcels}
            selectedParcelId={selectedId}
            onSelectParcel={onSelectParcel}
          />
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <Typography.Text type="secondary" className="mb-2 block text-xs">
              NDVI 填色（地块均值 · 演示）
            </Typography.Text>
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
              <LegendStop color="#d73027" label="&lt;0.35" />
              <LegendStop color="#fee08b" label="0.35–0.55" />
              <LegendStop color="#91cf60" label="0.55–0.70" />
              <LegendStop color="#1a9850" label="&gt;0.70" />
            </div>
            <Typography.Paragraph type="secondary" className="!mb-0 !mt-2 text-xs">
              灰色底图来自 MapLibre 演示样式；行政区界数据为{' '}
              <code className="rounded bg-neutral-100 px-1">packages/data_mock/shenyang.json</code>。
            </Typography.Paragraph>
          </div>
        </Card>
      </div>

      <Card size="small" title="时序曲线" className="shadow-sm">
        {selectedParcel && series.length > 0 ? (
          <AgriTimeseriesChart
            series={series}
            parcelName={selectedParcel.name}
            indexLabel={demo.meta.indexLabel}
          />
        ) : (
          <Typography.Text type="secondary">请选择地块查看 NDVI 时序</Typography.Text>
        )}
      </Card>

      <List
        size="small"
        header={<span className="text-sm font-medium text-neutral-700">演示数据文件</span>}
        bordered
        dataSource={[
          { k: '行政区界', v: 'packages/data_mock/shenyang.json' },
          { k: '地块与时序', v: 'packages/data_mock/agri-demo.json' },
        ]}
        renderItem={(item) => (
          <List.Item className="!py-2">
            <Typography.Text className="text-sm">{item.k}</Typography.Text>
            <Typography.Text code className="text-xs">
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
