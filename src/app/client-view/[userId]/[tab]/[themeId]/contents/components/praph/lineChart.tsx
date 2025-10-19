import React, { useMemo } from 'react';
import { ResponsiveLine } from "@nivo/line";

interface ChartProps {
  data: any;
}

const LineChart = React.memo(({ data }: ChartProps) => {
  const chartConfig = useMemo(() => ({
    margin: { top: 50, right: 110, bottom: 50, left: 60 },
    xScale: { type: 'point' as const },
    yScale: {
        type: 'linear' as const,
        min: 'auto' as const,
        max: 'auto' as const,
        stacked: true,
        reverse: false
    },
    yFormat: " >-.2f",
    axisTop: null,
    axisRight: null,
    axisBottom: {
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: '',
        legendOffset: 36,
        legendPosition: 'middle',
        truncateTickAt: 0
    },
    axisLeft: {
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: '',
        legendOffset: -40,
        legendPosition: 'middle',
        truncateTickAt: 0
    },
    pointSize: 10,
    pointColor: { theme: 'background' },
    pointBorderWidth: 2,
    pointBorderColor: { from: 'serieColor' },
    pointLabel: "data.yFormatted",
    pointLabelYOffset: -12,
    enableTouchCrosshair: true,
    useMesh: true,
    legends: [
        {
            anchor: 'bottom-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
                {
                    on: 'hover',
                    style: {
                        itemBackground: 'rgba(0, 0, 0, .03)',
                        itemOpacity: 1
                    }
                }
            ]
        }
    ]
  }), []);

  const containerStyle = useMemo(() => ({ height: '400px', width: '100%' }), []);

  return (
    <div style={containerStyle}>
      <ResponsiveLine
        data={data}
        {...chartConfig}
    />
    </div>
  );
})

LineChart.displayName = 'LineChart';

export default LineChart;
