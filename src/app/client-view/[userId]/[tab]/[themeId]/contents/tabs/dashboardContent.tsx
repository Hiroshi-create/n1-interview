"use client";

import { useEffect, useState, useRef } from "react";
import type { Theme } from "@/stores/Theme"
import LineChart from '../components/praph/lineChart';
import BarChart from '../components/praph/barChart';
import NetworkGraph from '../components/praph/networkGraph';
import PieChart from '../components/praph/pieChart';
import ScatterPlot from '../components/praph/scatterPlot';
import ResizeObserver from 'resize-observer-polyfill';
import SunburstChart from "../components/praph/sunburstChart";
import random from 'random';

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
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border p-4 mb-4 flex flex-col" style={{ width: '100%', height: '500px' }}>
    <h2 className="text-lg font-semibold mb-2">{title}</h2>
    <div className="flex-grow overflow-hidden">
      {children}
    </div>
  </div>
);


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

  const barData = {
    mainSeries: [
      { name: 'オーシャンビュー', y: 180, drilldown: 'ocean' },
      { name: 'プライベートプール', y: 201, drilldown: 'pool' },
      { name: '高級スパ', y: 126, drilldown: 'spa' },
      { name: 'プライベートビーチ', y: 110, drilldown: 'beach' }
    ],
    drilldownSeries: [
      {
        id: 'ocean',
        data: [
          ['パノラマビュー', 45],
          ['サンセットビュー', 40],
          ['部分的な海の眺め', 35],
          ['高層階からの眺め', 30],
          ['プライベートテラス付き', 30]
        ]
      },
      {
        id: 'pool',
        data: [
          ['インフィニティプール', 50],
          ['温水プール', 45],
          ['ジャグジー付き', 40],
          ['プールサイドバー', 35],
          ['子供用プール', 31]
        ]
      },
      {
        id: 'spa',
        data: [
          ['マッサージサービス', 35],
          ['サウナ', 30],
          ['ヨガクラス', 25],
          ['美容トリートメント', 20],
          ['フィットネスジム', 16]
        ]
      },
      {
        id: 'beach',
        data: [
          ['専用ビーチエリア', 30],
          ['ビーチサービス', 25],
          ['ウォータースポーツ', 22],
          ['ビーチバー', 18],
          ['サンセットディナー', 15]
        ]
      }
    ]
  };

  // 意見
  const opinionData = [
    { id: "非常に良い", label: "非常に良い", value: 40, color: "#66c2a5" },
    { id: "良い", label: "良い", value: 35, color: "#fc8d62" },
    { id: "普通", label: "普通", value: 15, color: "#8da0cb" },
    { id: "悪い", label: "悪い", value: 7, color: "#e78ac3" },
    { id: "非常に悪い", label: "非常に悪い", value: 3, color: "#a6d854" },
  ];

  // 年齢比較
  const ageData = [
    { id: "20-29", label: "20-29歳", value: 10, color: "#66c2a5" },
    { id: "30-39", label: "30-39歳", value: 25, color: "#fc8d62" },
    { id: "40-49", label: "40-49歳", value: 35, color: "#8da0cb" },
    { id: "50-59", label: "50-59歳", value: 20, color: "#e78ac3" },
    { id: "60-69", label: "60-69歳", value: 8, color: "#a6d854" },
    { id: "70+", label: "70歳以上", value: 2, color: "#ffd92f" }
  ];

  // 男女比率
  const genderData = [
    { id: "男性", label: "男性", value: 55, color: "#66c2a5" },
    { id: "女性", label: "女性", value: 45, color: "#fc8d62" },
  ];

  // 競合
  const scatterData = [
    {
        id: "ヴィラA",
        data: [
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "伝統的な建築" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "プライベートプール" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "開放的" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "庭付き" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "高級感" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "静かな環境" }
        ]
    },
    {
        id: "ヴィラB",
        data: [
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "眺望が良い" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "自然豊か" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "広いリビング" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "モダンなデザイン" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "バーベキュー設備" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "ペット同伴可" }
        ]
    },
    {
        id: "ヴィラC",
        data: [
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "宿泊施設" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label: "オーシャンビュー" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label:"露天風呂" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label:"スパ施設" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label:"ルームサービス" },
            { x: random.uniform(-1, 3)(), y: random.uniform(-1, 3)(), label:"プライベートビーチ" }
        ]
    }
  ];

  const familyBarData = {
    mainSeries: [
        { name: '単身', y: 15, drilldown: 'single' },
        { name: '夫婦のみ', y: 25, drilldown: 'couple' },
        { name: '子供あり(1人)', y: 30, drilldown: 'oneChild' },
        { name: '子供あり(2人以上)', y: 20, drilldown: 'multipleChildren' },
        { name: 'その他', y: 10, drilldown: 'other' }
    ],
    drilldownSeries: [
        {
            id: 'single',
            data: [
                ['20代', 5],
                ['30代', 4],
                ['40代', 3],
                ['50代', 2],
                ['60代以上', 1]
            ]
        },
        {
            id: 'couple',
            data: [
                ['新婚', 8],
                ['子育て終了', 10],
                ['退職後', 7]
            ]
        },
        {
            id: 'oneChild',
            data: [
                ['乳児', 10],
                ['幼児', 8],
                ['小学生', 7],
                ['中高生', 5]
            ]
        },
        {
            id: 'multipleChildren',
            data: [
                ['2人', 12],
                ['3人', 6],
                ['4人以上', 2]
            ]
        },
        {
            id: 'other',
            data: [
                ['三世代', 5],
                ['ルームシェア', 3],
                ['その他', 2]
            ]
        }
    ]
  };





  return (
    <div ref={containerRef} className="p-6 min-h-screen">
      <h2 className="text-2xl font-bold mb-6">分析ダッシュボード</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartContainer title="ニーズの割合" containerSize={containerSize}>
          <SunburstChart windowSize={containerSize} />
        </ChartContainer>
        <ChartContainer title="カテゴリ別分布" containerSize={containerSize}>
          <BarChart data={barData} windowSize={containerSize} />
        </ChartContainer>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2">
          <ChartContainer title="競合ヴィラの特徴" containerSize={containerSize}>
            <ScatterPlot data={scatterData} windowSize={{...containerSize, width: containerSize.width * 2 / 3}} />
          </ChartContainer>
        </div>
        <div className="col-span-1">
          <ChartContainer title="家族構成" containerSize={containerSize}>
            <BarChart data={familyBarData} windowSize={containerSize} />
          </ChartContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ChartContainer title="高級ヴィラに対する意見" containerSize={containerSize}>
          <PieChart data={opinionData} windowSize={containerSize} />
        </ChartContainer>
        <ChartContainer title="年齢比率" containerSize={containerSize}>
          <PieChart data={ageData} windowSize={containerSize} />
        </ChartContainer>
        <ChartContainer title="男女比率" containerSize={containerSize}>
          <PieChart data={genderData} windowSize={containerSize} />
        </ChartContainer>
      </div>
    </div>
  )
}

export default DashboardContent
