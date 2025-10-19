"use client";

import React from 'react'
import { ResponsiveNetwork } from '@nivo/network'
import { useCallback, useEffect, useRef, useState } from 'react'
import interact from 'interactjs';

interface NetworkNode {
  id: string;
  size: number;
  color: string;
  x?: number;
  y?: number;
}

interface NetworkLink {
  source: string;
  target: string;
  distance: number;
}

interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

interface WindowSize {
  width: number;
  height: number;
}

const NetworkGraph = React.memo(({ data, windowSize }: { data: NetworkData; windowSize: WindowSize }) => {
  const [nodes, setNodes] = useState<NetworkNode[]>(data.nodes)
  const containerRef = useRef<HTMLDivElement>(null)
  const interactRef = useRef<any>(null);

  const initDrag = useCallback(() => {
    if (!containerRef.current) return

    // インタラクションの初期化
    interactRef.current = interact('.node', {
      context: containerRef.current
    }).draggable({
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: false
        })
      ],
      listeners: {
        start: (event) => {
          event.target.style.cursor = 'grabbing'
        },
        move: (event) => {
          setNodes(prevNodes => prevNodes.map(node => {
            if (node.id === event.target.id) {
              return {
                ...node,
                x: (node.x || 0) + event.dx,
                y: (node.y || 0) + event.dy
              }
            }
            return node
          }))
        },
        end: (event) => {
          event.target.style.cursor = 'grab'
        }
      }
    })
  }, [])

  useEffect(() => {
    initDrag()
    return () => {
      interactRef.current?.unset()
    }
  }, [initDrag])

  return (
    <div ref={containerRef} style={{ 
      height: '100%',
      width: '100%',
      touchAction: 'none',
      position: 'relative' 
    }}>
      <ResponsiveNetwork
        data={{ nodes, links: data.links }}
        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        linkDistance={150}
        centeringStrength={0.1}
        repulsivity={50}
        nodeSize={node => node.size}
        activeNodeSize={node => 1.2 * node.size}
        inactiveNodeSize={node => 0.8 * node.size}
        nodeColor={node => node.color}
        nodeBorderWidth={1}
        nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
        nodeComponent={({ node }) => (
          <g
            id={node.id}
            className="node"
            transform={`translate(${node.x},${node.y})`}
            style={{ 
              cursor: 'grab',
              touchAction: 'none',
              userSelect: 'none'
            }}
          >
            <circle
              r={node.size / 2}
              fill={node.color}
              strokeWidth={1}
              stroke="#333"
            />
          </g>
        )}
        linkThickness={2}
        linkColor={{ from: 'source.color', modifiers: [['opacity', 0.5]] }}
      />
    </div>
  )
})

NetworkGraph.displayName = 'NetworkGraph';
export default NetworkGraph
