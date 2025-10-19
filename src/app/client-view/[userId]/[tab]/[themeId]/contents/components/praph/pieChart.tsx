import React, { useRef, useMemo } from 'react';
import { ResponsivePie } from "@nivo/pie";

interface ChartProps {
  data: Array<{
    id: string;
    label: string;
    value: number;
    color: string;
  }>;
  windowSize: {
    width: number;
    height: number;
  };
}

interface DataItem {
  id: string;
  label: string;
  value: number;
  color: string;
}

const CustomLegend: React.FC<{ data: Array<DataItem> }> = React.memo(({ data }) => {
  const chunks = useMemo(() => {
    const result = [];
    for (let i = 0; i < data.length; i += 3) {
      result.push(data.slice(i, i + 3));
    }
    return result;
  }, [data]);

  const containerStyle = useMemo(() => ({ 
    display: 'flex', 
    flexDirection: 'column' as const, 
    alignItems: 'center' as const, 
    marginTop: '20px' 
  }), []);

  const rowStyle = useMemo(() => ({ 
    display: 'flex', 
    justifyContent: 'center' as const 
  }), []);

  return (
    <div style={containerStyle}>
      {chunks.map((chunk, index) => (
        <div key={index} style={rowStyle}>
          {chunk.map((item: DataItem) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', margin: '0 10px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: item.color, marginRight: '5px' }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
});

CustomLegend.displayName = 'CustomLegend';

const PieChart: React.FC<ChartProps> = React.memo(({ data, windowSize }) => {
    const containerRef = useRef<HTMLDivElement>(null);
  
    const pieConfig = useMemo(() => ({
      margin: { top: 40, right: 80, bottom: 100, left: 80 },
      innerRadius: 0.5,
      padAngle: 0.7,
      cornerRadius: 3,
      activeOuterRadiusOffset: 8,
      borderWidth: 1,
      borderColor: { from: "color", modifiers: [["darker", 0.2] as const] },
      arcLinkLabelsSkipAngle: 10,
      arcLinkLabelsTextColor: "#333333",
      arcLinkLabelsThickness: 2,
      arcLinkLabelsColor: { from: "color" },
      arcLabelsSkipAngle: 10,
      arcLabelsTextColor: { from: "color", modifiers: [["darker", 2] as const] },
      colors: { datum: 'data.color' },
      animate: true,
      motionConfig: "wobbly",
      legends: []
    }), []);

    const containerStyle = useMemo(() => ({ 
      width: '100%', 
      height: '100%', 
      position: 'relative' as const 
    }), []);

    const legendStyle = useMemo(() => ({ 
      position: 'absolute' as const, 
      bottom: 0, 
      left: 0, 
      right: 0 
    }), []);

    return (
      <div ref={containerRef} style={containerStyle}>
        <ResponsivePie
          data={data}
          {...pieConfig}
        />
        <div style={legendStyle}>
          <CustomLegend data={data} />
        </div>
      </div>
    );
});

PieChart.displayName = 'PieChart';

export default PieChart;