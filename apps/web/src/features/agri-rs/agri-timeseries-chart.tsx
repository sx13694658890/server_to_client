import * as echarts from 'echarts';
import { useEffect, useMemo, useRef } from 'react';
import type { NdviPoint } from './agri-types';

/** 图表中同时展示的指数键（与接口 `index_key` 一致） */
export const AGRI_CHART_INDEX_KEYS = ['ndvi', 'evi', 'ndwi'] as const;
export type AgriChartIndexKey = (typeof AGRI_CHART_INDEX_KEYS)[number];

const SERIES_STYLE: Record<AgriChartIndexKey, { label: string; color: string }> = {
  ndvi: { label: 'NDVI', color: '#059669' },
  evi: { label: 'EVI', color: '#2563eb' },
  ndwi: { label: 'NDWI', color: '#0891b2' },
};

function mergeSortedDates(seriesByIndex: Partial<Record<AgriChartIndexKey, NdviPoint[]>>): string[] {
  const set = new Set<string>();
  for (const key of AGRI_CHART_INDEX_KEYS) {
    const pts = seriesByIndex[key];
    if (!pts) continue;
    for (const p of pts) {
      if (p.date) set.add(p.date);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function valuesForDates(dates: string[], points: NdviPoint[] | undefined): (number | null)[] {
  if (!points?.length) return dates.map(() => null);
  const map = new Map(points.map((p) => [p.date, p.ndvi]));
  return dates.map((d) => {
    const v = map.get(d);
    return v != null && Number.isFinite(v) ? v : null;
  });
}

export type AgriIndicesSeriesMap = Partial<Record<AgriChartIndexKey, NdviPoint[]>>;

type Props = {
  parcelName: string;
  /** 各 `index_key` 对应的时序点（`NdviPoint.ndvi` 存该指数数值） */
  seriesByIndex: AgriIndicesSeriesMap;
};

export function AgriTimeseriesChart({ parcelName, seriesByIndex }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const dates = useMemo(() => mergeSortedDates(seriesByIndex), [seriesByIndex]);

  const yBounds = useMemo(() => {
    const vals: number[] = [];
    for (const key of AGRI_CHART_INDEX_KEYS) {
      for (const p of seriesByIndex[key] ?? []) {
        if (Number.isFinite(p.ndvi)) vals.push(p.ndvi);
      }
    }
    if (!vals.length) return { min: -0.05, max: 1.05 };
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    minV = Math.min(minV, -0.05);
    maxV = Math.max(maxV, 1);
    const span = Math.max(maxV - minV, 0.05);
    const pad = span * 0.1;
    return { min: minV - pad, max: maxV + pad };
  }, [seriesByIndex]);

  useEffect(() => {
    if (!hostRef.current) return;
    const chart = echarts.init(hostRef.current, undefined, { renderer: 'canvas' });
    chartRef.current = chart;

    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const legendData: string[] = [];
    const series: echarts.SeriesOption[] = [];

    for (const key of AGRI_CHART_INDEX_KEYS) {
      const pts = seriesByIndex[key];
      if (!pts?.length) continue;
      const { label, color } = SERIES_STYLE[key];
      legendData.push(label);
      series.push({
        name: label,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        connectNulls: true,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        data: valuesForDates(dates, pts),
      });
    }

    chart.setOption({
      title: {
        text: `${parcelName} · NDVI / EVI / NDWI 时序`,
        left: 0,
        textStyle: { fontSize: 14, fontWeight: 600, color: '#171717' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (items: unknown) => {
          const arr = items as { axisValue: string; seriesName: string; data: number | null; marker: string }[];
          const row0 = arr[0];
          if (!row0) return '';
          const lines = arr
            .filter((r) => r.data != null && Number.isFinite(r.data))
            .map((r) => `${r.marker} ${r.seriesName}：${Number(r.data).toFixed(3)}`);
          if (!lines.length) return `${row0.axisValue}<br/>（无有效值）`;
          return `${row0.axisValue}<br/>${lines.join('<br/>')}`;
        },
      },
      legend: {
        data: legendData,
        bottom: 0,
        textStyle: { color: '#404040', fontSize: 12 },
      },
      grid: { left: 52, right: 20, top: 52, bottom: 52 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#525252', rotate: 28 },
      },
      yAxis: {
        type: 'value',
        min: yBounds.min,
        max: yBounds.max,
        splitNumber: 5,
        axisLabel: { color: '#525252', formatter: (v: number) => v.toFixed(2) },
      },
      series,
    });
  }, [dates, parcelName, seriesByIndex, yBounds]);

  return <div ref={hostRef} className="h-80 w-full min-h-[320px]" />;
}
