'use client'

import React, { useEffect, useState, useRef } from 'react'
import Highcharts from 'highcharts'
import dynamic from 'next/dynamic'
import { sunburstData } from '../data/sunburstData'

declare module 'highcharts' {
    interface PlotSunburstLevelsOptions {
        levelIsConstant?: boolean;
    }
    interface SeriesSunburstOptions {
        allowTraversingTree?: boolean;
    }
}

const HighchartsReact = dynamic(
    () => import('highcharts-react-official'),
    { ssr: false }
)

interface SunburstDataPoint {
    id: string;
    parent: string;
    name: string;
    value?: number;
}

interface SunburstChartProps {
    windowSize: { width: number; height: number };
}

const SunburstChart: React.FC<SunburstChartProps> = ({ windowSize }) => {
    const [isClient, setIsClient] = useState(false)
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setIsClient(true)
        if (typeof window !== 'undefined') {
            import('highcharts/modules/sunburst').then(module => {
                module.default(Highcharts)
            }).catch(error => console.error('Error loading Highcharts module:', error))
        }

        const updateSize = () => {
            if (containerRef.current) {
                const { offsetWidth, offsetHeight } = containerRef.current
                setChartSize({ 
                    width: Math.min(offsetWidth, windowSize.width),
                    height: Math.min(offsetHeight, windowSize.height * 0.8)
                })
            }
        }

        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [windowSize])

    const options: Highcharts.Options = {
        chart: {
            type: "sunburst",
            backgroundColor: 'transparent',
            animation: {
                duration: 600,
                easing: 'easeOutBounce'
            },
            width: chartSize.width,
            height: chartSize.height,
            margin: [0, 0, 0, 0]
        },
        title: {
          text: ''
        },
        series: [{
          type: 'sunburst',
          name: '',
          data: sunburstData as SunburstDataPoint[],
          allowTraversingTree: true,
          borderRadius: 3,
          cursor: 'pointer',
          dataLabels: {
            format: '{point.name}',
            filter: {
              property: 'innerArcLength',
              operator: '>',
              value: 16
            },
            style: {
              fontSize: '12px'
            }
          },
          levels: [
            {
              level: 1,
              levelIsConstant: false,
              dataLabels: {
                filter: {
                  property: 'outerArcLength',
                  operator: '>',
                  value: 40
                }
              }
            },
            {
              level: 2,
              colorByPoint: true
            },
            {
              level: 3,
              colorVariation: {
                key: 'brightness',
                to: -0.5
              }
            },
            {
              level: 4,
              colorVariation: {
                key: 'brightness',
                to: 0.5
              }
            }
          ]
        }],
        tooltip: {
          headerFormat: '',
          pointFormat: 'The population of <b>{point.name}</b> is <b>{point.value}</b>'
        },
        credits: {
            enabled: false
        },
        plotOptions: {
          sunburst: {
            size: '100%',
            levels: [{
              level: 1,
              levelIsConstant: false,
              levelSize: {
                unit: 'percentage',
                value: 35
              },
              dataLabels: {
                style: {
                  fontSize: '12px'
                },
                filter: {
                  property: 'outerArcLength',
                  operator: '>',
                  value: 40
                }
              }
            },
            {
              level: 2,
              levelSize: {
                unit: 'percentage',
                value: 65
              },
              colorByPoint: true
            }]
          }
        },
        responsive: {
          rules: [{
            condition: {
              maxWidth: 500,
              maxHeight: 800,
            },
            chartOptions: {
              plotOptions: {
                sunburst: {
                  size: '100%'
                }
              }
            }
          }]
        }
    };

    if (!isClient) return null

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <HighchartsReact
                highcharts={Highcharts}
                options={options}
            />
        </div>
    )
}

export default SunburstChart