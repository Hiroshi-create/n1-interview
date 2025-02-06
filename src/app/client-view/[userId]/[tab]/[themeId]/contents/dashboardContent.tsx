"use client";

import { useEffect, useState, useRef } from "react";
import type { Theme } from "@/stores/Theme"
import LineChart from './components/lineChart';
import BarChart from './components/barChart';
import NetworkGraph from './components/networkGraph';
import PieChart from './components/pieChart';
import ScatterPlot from './components/scatterPlot';
import SunburstChart from "./components/sunburstChart";
import ResizeObserver from 'resize-observer-polyfill';

interface ComponentProps {
  theme: Theme;
  isReportListOpen: boolean;
}

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  containerSize: { width: number; height: number };
}

const ChartContainer = ({ title, children, containerSize }: ChartContainerProps) => (
  <div className="bg-white p-4 rounded-lg shadow h-full flex flex-col w-full">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="flex-1 min-h-0 w-full" style={{ height: `${containerSize.height * 0.4}px` }}>
      {children}
    </div>
  </div>
)

const DashboardContent = ({ theme, isReportListOpen }: ComponentProps): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    updateSize();
    window.addEventListener('resize', updateSize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [isReportListOpen]);

  const networkData = {
    nodes: [
      { id: 'Node 1', size: 20, color: '#e41a1c' },
      { id: 'Node 2', size: 15, color: '#377eb8' },
      { id: 'Node 3', size: 25, color: '#4daf4a' },
      { id: 'Node 4', size: 20, color: '#984ea3' },
      { id: 'Node 5', size: 15, color: '#ff7f00' },
      { id: 'Node 6', size: 30, color: '#ffff33' },
      { id: 'Node 7', size: 25, color: '#a65628' },
      { id: 'Node 8', size: 15, color: '#f781bf' },
      { id: 'Node 9', size: 20, color: '#999999' },
      { id: 'Node 10', size: 30, color: '#66c2a5' },
      { id: 'Node 11', size: 20, color: '#fc8d62' },
      { id: 'Node 12', size: 15, color: '#8da0cb' },
      { id: 'Node 13', size: 25, color: '#e78ac3' },
      { id: 'Node 14', size: 20, color: '#a6d854' },
      { id: 'Node 15', size: 15, color: '#ffd92f' },
    ],
    links: [
      { source: 'Node 1', target: 'Node 2', distance: 50 },
      { source: 'Node 1', target: 'Node 3', distance: 50 },
      { source: 'Node 1', target: 'Node 4', distance: 50 },
      { source: 'Node 2', target: 'Node 5', distance: 50 },
      { source: 'Node 2', target: 'Node 6', distance: 50 },
      { source: 'Node 3', target: 'Node 7', distance: 50 },
      { source: 'Node 3', target: 'Node 8', distance: 50 },
      { source: 'Node 4', target: 'Node 9', distance: 50 },
      { source: 'Node 4', target: 'Node 10', distance: 50 },
      { source: 'Node 5', target: 'Node 11', distance: 50 },
      { source: 'Node 6', target: 'Node 12', distance: 50 },
      { source: 'Node 7', target: 'Node 13', distance: 50 },
      { source: 'Node 8', target: 'Node 14', distance: 50 },
      { source: 'Node 9', target: 'Node 15', distance: 50 },
      { source: 'Node 10', target: 'Node 1', distance: 50 },
      { source: 'Node 11', target: 'Node 3', distance: 50 },
      { source: 'Node 12', target: 'Node 5', distance: 50 },
      { source: 'Node 13', target: 'Node 7', distance: 50 },
      { source: 'Node 14', target: 'Node 9', distance: 50 },
      { source: 'Node 15', target: 'Node 2', distance: 50 },
    ]
  }

  const barData = [
    { category: 'A', value: 10 },
    { category: 'B', value: 20 },
    { category: 'C', value: 15 },
  ]

  const lineData = [
    {
      id: 'series1',
      data: [
        { x: '2024-01', y: 12 },
        { x: '2024-02', y: 18 },
        { x: '2024-03', y: 15 },
      ]
    }
  ]

  const pieData = [
    { id: 'A', value: 35 },
    { id: 'B', value: 45 },
    { id: 'C', value: 20 },
  ]

  const scatterData = [
    {
      id: 'group1',
      data: [
        { x: 12, y: 32 },
        { x: 18, y: 45 },
        { x: 25, y: 28 },
      ]
    }
  ]

  return (
    <div ref={containerRef} className="p-6 bg-gray-100 min-h-screen">
      <h2 className="text-2xl font-bold mb-6">分析ダッシュボード</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartContainer title="サンバースト" containerSize={containerSize}>
          <SunburstChart windowSize={containerSize} />
        </ChartContainer>
        <ChartContainer title="カテゴリ別分布" containerSize={containerSize}>
          <BarChart windowSize={containerSize} />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* <ChartContainer title="ネットワーク図" containerSize={containerSize}>
          <NetworkGraph data={networkData} windowSize={containerSize} />
        </ChartContainer> */}
        <ChartContainer title="構成比率" containerSize={containerSize}>
          <PieChart data={pieData} windowSize={containerSize} />
        </ChartContainer>
        <ChartContainer title="時系列推移" containerSize={containerSize}>
          <LineChart data={lineData} windowSize={containerSize} />
        </ChartContainer>
        <ChartContainer title="相関分析" containerSize={containerSize}>
          <ScatterPlot data={scatterData} windowSize={containerSize} />
        </ChartContainer>
      </div>
    </div>
  )
}

export default DashboardContent
