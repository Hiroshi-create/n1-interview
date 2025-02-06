import React, { useRef } from 'react';
import { ResponsivePie } from "@nivo/pie";

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

const PieChart = ({ data, windowSize }: ChartProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <ResponsivePie
                data={data}
                margin={{ top: 20, right: 80, bottom: 80, left: 80 }}
                innerRadius={0.5}
                padAngle={0.7}
                cornerRadius={3}
                colors={{ scheme: 'pastel1' }}
                theme={commonTheme}
                animate={true}
            />
        </div>
    );
}

export default PieChart;
