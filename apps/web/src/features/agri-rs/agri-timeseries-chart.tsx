import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import type { NdviPoint } from './agri-types';

type Props = {
  series: NdviPoint[];
  parcelName: string;
  indexLabel: string;
};

export function AgriTimeseriesChart({ series, parcelName, indexLabel }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

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

    chart.setOption({
      title: {
        text: `${parcelName} · ${indexLabel} 时序`,
        left: 0,
        textStyle: { fontSize: 14, fontWeight: 600, color: '#171717' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (items: unknown) => {
          const arr = items as { axisValue: string; data: number; marker: string }[];
          const row = arr[0];
          if (!row) return '';
          const pt = series.find((p) => p.date === row.axisValue);
          const q = pt?.quality ? `质量：${pt.quality}` : '';
          return `${row.marker} ${row.axisValue}<br/>NDVI：${row.data.toFixed(3)}${q ? `<br/>${q}` : ''}`;
        },
      },
      grid: { left: 48, right: 24, top: 48, bottom: 32 },
      xAxis: {
        type: 'category',
        data: series.map((p) => p.date),
        axisLabel: { color: '#525252', rotate: 30 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        splitNumber: 5,
        axisLabel: { color: '#525252', formatter: (v: number) => v.toFixed(2) },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: { width: 2, color: '#059669' },
          itemStyle: { color: '#059669' },
          areaStyle: { color: 'rgba(5, 150, 105, 0.12)' },
          data: series.map((p) => p.ndvi),
        },
      ],
    });
  }, [series, parcelName, indexLabel]);

  return <div ref={hostRef} className="h-72 w-full min-h-[280px]" />;
}
