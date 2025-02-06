"use client";

import React, { useRef } from 'react';
import { ResponsiveScatterPlot, ScatterPlotSvgProps } from '@nivo/scatterplot';

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

const ScatterPlot = ({ data, windowSize }: ChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const validatedData = React.useMemo(() => {
        return data.map((series: any) => ({
            ...series,
            data: series.data.map((point: any) => ({
                x: Number(point.x) || 0,
                y: Number(point.y) || 0
            }))
        }));
    }, [data]);

    return (
        <div ref={containerRef} style={{ 
            width: '100%',
            height: '100%',
            minHeight: '400px'
        }}>
            <ResponsiveScatterPlot
                data={validatedData}
                margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
                colors={['#3B82F6']}
                theme={commonTheme}
                nodeSize={10}
                useMesh={true}
                xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'X Axis',
                    legendPosition: 'middle',
                    legendOffset: 40
                }}
                axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Y Axis',
                    legendPosition: 'middle',
                    legendOffset: -50
                }}
            />
        </div>
    );
};

export default ScatterPlot;
