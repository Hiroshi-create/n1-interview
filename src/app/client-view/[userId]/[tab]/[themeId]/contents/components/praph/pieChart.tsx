import React, { useRef } from 'react';
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

const CustomLegend: React.FC<{ data: Array<DataItem> }> = ({ data }) => {
  const chunks = [];
  for (let i = 0; i < data.length; i += 3) {
    chunks.push(data.slice(i, i + 3));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
      {chunks.map((chunk, index) => (
        <div key={index} style={{ display: 'flex', justifyContent: 'center' }}>
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
};

const PieChart: React.FC<ChartProps> = ({ data, windowSize }) => {
    const containerRef = useRef<HTMLDivElement>(null);
  
    return (
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <ResponsivePie
          data={data}
          margin={{ top: 40, right: 80, bottom: 100, left: 80 }} // 下部のマージンを増やす
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          activeOuterRadiusOffset={8}
          borderWidth={1}
          borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
          arcLinkLabelsSkipAngle={10}
          arcLinkLabelsTextColor="#333333"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: "color" }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
          colors={{ datum: 'data.color' }}
          animate={true}
          motionConfig="wobbly"
          legends={[]}
        />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <CustomLegend data={data} />
        </div>
      </div>
    );
};

export default PieChart;