import React, { useRef } from 'react';
import { ResponsiveLine } from "@nivo/line";

interface ChartProps {
  data: any;
  windowSize: {
    width: number;
    height: number;
  };
}

const commonTheme = {
  textColor: '#333',
  tooltip: {
    container: {
      background: '#fff',
      color: '#333',
    }
  }
}

const LineChart = ({ data, windowSize }: ChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ResponsiveLine
        data={data}
        margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
        colors={'#3B82F6'}
        theme={commonTheme}
        enableSlices="x"
        useMesh={true}
      />
    </div>
  );
}

export default LineChart;
