'use client'

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import Highcharts from 'highcharts'
import dynamic from 'next/dynamic'

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

interface DrilldownData {
  name: string;
  y: number;
  drilldown?: string;
}

interface WindowSize {
    width: number;
    height: number;
}

interface BarChartProps {
    data: {
        mainSeries: DrilldownData[];
        drilldownSeries: {
            id: string;
            data: (string | number)[][];
            type?: string;
        }[];
    };
    windowSize: WindowSize;
}


const BarChart: React.FC<BarChartProps> = React.memo(({ data, windowSize }) => {
    const [isClient, setIsClient] = useState(false)
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    const updateSize = useCallback(() => {
        if (containerRef.current) {
            const { offsetWidth, offsetHeight } = containerRef.current
            setChartSize({ 
                width: Math.min(offsetWidth, windowSize.width),
                height: Math.min(offsetHeight, windowSize.height * 0.8)
            })
        }
    }, [windowSize])

    useEffect(() => {
        setIsClient(true)
        if (typeof window !== 'undefined') {
            import('highcharts/modules/drilldown').then(module => {
                module.default(Highcharts)
            }).catch(error => console.error('Error loading Highcharts module:', error))
        }

        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [updateSize])

    const options: Highcharts.Options = useMemo(() => ({
        chart: {
            type: 'column',
            backgroundColor: 'transparent',
            animation: {
                duration: 600,
                easing: 'easeOutBounce'
            },
            width: chartSize.width,
            height: chartSize.height,
            margin: [0, 0, 120, 0]
        },
        title: {
            text: ''
        },
        xAxis: {
            type: 'category',
            labels: {
                rotation: -45,
                style: {
                    fontSize: '12px',
                    fontFamily: 'Verdana, sans-serif'
                }
            }
        },
        yAxis: {
            title: {text: 'Episodes'}
        },
        legend: {
            enabled: false
        },
        plotOptions: {
            series: {
                borderWidth: 0,
                dataLabels: {
                    enabled: true
                }
            }
        },
        series: [{
            type: 'column',
            name: 'Sitcoms',
            colorByPoint: true,
            data: data.mainSeries
        }],
        drilldown: {
            series: data.drilldownSeries as Highcharts.SeriesOptionsType[]
        },
        credits: {
            enabled: false
        },
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500,
                    maxHeight: 800,
                },
                chartOptions: {
                    plotOptions: {
                        column: {
                            dataLabels: {
                                enabled: false
                            }
                        }
                    }
                }
            }]
        }
    }), [data, chartSize]);

    if (!isClient) return null

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <HighchartsReact
                highcharts={Highcharts}
                options={options}
            />
        </div>
    )
})

BarChart.displayName = 'BarChart';

export default BarChart
