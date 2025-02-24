"use client";

import React, { useRef, useMemo } from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';

interface ChartProps {
    data: Array<{
        id: string;
        data: Array<{
            x: number;
            y: number;
            label: string;
        }>
    }>;
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
};

const ScatterPlot = ({ data, windowSize }: ChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const { processedData, uniqueLabels } = useMemo(() => {
        const villaIds = data.map(villa => villa.id);
        const allLabels = data.flatMap(villa => villa.data.map(item => item.label));
        const uniqueLabels = Array.from(new Set(allLabels));

        const processedData = data.map(villa => ({
            id: villa.id,
            data: villa.data.map(item => ({
                x: villaIds.indexOf(villa.id),
                y: uniqueLabels.indexOf(item.label),
                label: item.label
            }))
        }));

        return { processedData, uniqueLabels };
    }, [data]);

    return (
        <div ref={containerRef} style={{ 
            width: '100%',
            height: '100%',
            minHeight: '400px'
        }}>
            <ResponsiveScatterPlot
                data={processedData}
                margin={{ top: 40, right: 40, bottom: 100, left: 120 }} 
                colors={{ scheme: 'category10' }}
                theme={commonTheme}
                nodeSize={12}
                xScale={{ type: 'point' }}
                yScale={{ type: 'point' }}
                axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: '',
                    legendPosition: 'middle',
                    legendOffset: 46,
                    format: (index) => processedData[index]?.id || ''
                }}
                axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: '',
                    legendPosition: 'middle',
                    legendOffset: -90,
                    format: (index) => uniqueLabels[index] || ''
                }}
                legends={[
                    {
                        anchor: 'bottom',
                        direction: 'row',
                        justify: false,
                        translateX: 0,
                        translateY: 100,
                        itemsSpacing: 20,
                        itemWidth: 80,
                        itemHeight: 12,
                        itemTextColor: '#999',
                        symbolSize: 12,
                        symbolShape: 'circle'
                    }
                ]}
                tooltip={({ node }) => (
                    <div>
                        <strong>{node.data.label}</strong>
                        <br />
                        ヴィラ: {processedData[node.x]?.id}
                    </div>
                )}
                useMesh={true}
            />
        </div>
    );
};

export default ScatterPlot;
