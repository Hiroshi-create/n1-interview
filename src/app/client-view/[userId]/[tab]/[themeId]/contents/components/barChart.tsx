'use client'

import React, { useEffect, useState, useRef } from 'react'
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

interface SeriesData extends Highcharts.SeriesColumnOptions {
    id: string;
    data: [string, number][];
}

interface WindowSize {
    width: number;
    height: number;
}

interface BarChartProps {
    windowSize: WindowSize;
}

const BarChart: React.FC<BarChartProps> = ({ windowSize }) => {
    const [isClient, setIsClient] = useState(false)
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setIsClient(true)
        if (typeof window !== 'undefined') {
            import('highcharts/modules/drilldown').then(module => {
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
            type: 'column',
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
        xAxis: {
            type: 'category'
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
            data: [{
                name: 'Seinfeld',
                y: 180,
                drilldown: 'seinfeld'
            }, {
                name: 'The Office',
                y: 201,
                drilldown: 'office'
            }, {
                name: 'Parks & Recreation',
                y: 126,
                drilldown: 'parks'
            }, {
                name: 'Community',
                y: 110,
                drilldown: 'community'
            }] as DrilldownData[]
        }],
        drilldown: {
            series: [{
                type: 'column',
                id: 'seinfeld',
                data: [
                    ['Season 1', 5],
                    ['Season 2', 12],
                    ['Season 3', 23],
                    ['Season 4', 24],
                    ['Season 5', 22],
                    ['Season 6', 24],
                    ['Season 7', 24],
                    ['Season 8', 22],
                    ['Season 9', 24]
                ]
            }, {
                type: 'column',
                id: 'office',
                data: [
                    ['Season 1', 6],
                    ['Season 2', 22],
                    ['Season 3', 25],
                    ['Season 4', 19],
                    ['Season 5', 28],
                    ['Season 6', 26],
                    ['Season 7', 26],
                    ['Season 8', 24],
                    ['Season 9', 25]
                ]
            }, {
                type: 'column',
                id: 'parks',
                data: [
                    ['Season 1', 6],
                    ['Season 2', 24],
                    ['Season 3', 16],
                    ['Season 4', 22],
                    ['Season 5', 22],
                    ['Season 6', 22],
                    ['Season 7', 13]
                ]
            }, {
                type: 'column',
                id: 'community',
                data: [
                    ['Season 1', 25],
                    ['Season 2', 24],
                    ['Season 3', 22],
                    ['Season 4', 13],
                    ['Season 5', 13],
                    ['Season 6', 13]
                ]
            }] as SeriesData[]
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

export default BarChart
