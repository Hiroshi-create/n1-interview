"use client"

import type React from "react"
import { ResponsivePie } from "@nivo/pie"

interface ChartProps {
  data: {
    current: number
    limit: number
  }
  windowSize: {
    width: number
    height: number
  }
}

const CostPieChart: React.FC<ChartProps> = ({ data, windowSize }) => {
  // Calculate percentage
  const percentage = (data.current / data.limit) * 100

  // Prepare data for the pie chart
  const chartData = [
    {
      id: "used",
      label: "Used",
      value: percentage,
      color: "hsl(143, 71%, 45%)",
    },
    {
      id: "remaining",
      label: "Remaining",
      value: 100 - percentage,
      color: "hsl(220, 9.70%, 57.50%)",
    },
  ]

  return (
    <div style={{ width: '160px', height: '160px', position: 'relative' }}>
      <ResponsivePie
        data={chartData}
        margin={{ top: 10, right: 0, bottom: 10, left: 0 }}
        innerRadius={0.8}
        padAngle={0}
        cornerRadius={0}
        activeOuterRadiusOffset={0}
        borderWidth={0}
        // enableArc={true}
        arcLinkLabelsSkipAngle={10}
        enableArcLabels={false}
        enableArcLinkLabels={false}
        colors={{ datum: "data.color" }}
        animate={false}
        theme={{
          background: "transparent",
          // textColor: "white",
        }}
        isInteractive={false}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {percentage.toFixed(0)}%
      </div>
    </div>
  )
}

export default CostPieChart

