import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface GraphProps {
  data: any;
}

interface NodeData {
  id: string;
  group: 'category' | 'node';
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface CustomNodeDatum extends d3.SimulationNodeDatum {
  id: string;
  group: string;
  nodes?: string[];
}

const Graph: React.FC<GraphProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [groupDistance, setGroupDistance] = useState<number>(250);
  const [simulation, setSimulation] = useState<d3.Simulation<any, undefined> | null>(null);
  const [currentTransform, setCurrentTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const { width, height } = dimensions;

    const svg = d3.select(svgRef.current)
      .style('user-select', 'none')
      .style('-webkit-user-select', 'none')
      .style('-moz-user-select', 'none')
      .style('-ms-user-select', 'none');
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', currentTransform.toString());

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setCurrentTransform(event.transform);
      });

    svg.call(zoom as any)
      .call(zoom.transform as any, currentTransform);

    const tooltip = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('position', 'absolute')
      .style('background', 'rgba(255, 255, 255, 0.9)')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('padding', '10px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('transition', 'opacity 0.3s');

    // データの前処理: カテゴリごとにノードをまとめる
    const processedData = data.results.reduce((acc: any, item: any) => {
      if (!acc[item.category]) {
        acc[item.category] = new Set();
      }
      item.nodes.split(' ').forEach((node: string) => acc[item.category].add(node.trim()));
      return acc;
    }, {});

    const nodes: CustomNodeDatum[] = Object.entries(processedData).map(([category, nodesSet]: [string, unknown]) => ({
      id: category,
      group: 'category',
      nodes: Array.from(nodesSet as Set<string>),
    }));
    
    const links = nodes.flatMap((categoryNode: any) =>
      categoryNode.nodes.map((nodeId: string) => ({
        source: categoryNode.id,
        target: nodeId,
      }))
    );

    // ノードの配列に個別のノードを追加
    nodes.push(...nodes.flatMap((categoryNode: CustomNodeDatum) =>
      (categoryNode.nodes || []).map((nodeId: string) => ({
        id: nodeId,
        group: 'node',
      } as CustomNodeDatum))
    ));

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const sim = d3.forceSimulation<CustomNodeDatum>(nodes)
      .force('link', d3.forceLink<CustomNodeDatum, d3.SimulationLinkDatum<CustomNodeDatum>>(links).id((d: CustomNodeDatum) => d.id).distance(groupDistance))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(70));

    setSimulation(sim);

    const link = g.append('g')
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('fill', 'none');

    const node = g.append('g')
      .selectAll('circle')
      .data(nodes as NodeData[])
      .enter()
      .append('circle')
      .attr('r', (d: any) => d.group === 'category' ? 50 : 30)
      .attr('fill', (d: any) => colorScale(d.group))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(d3.drag<SVGCircleElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )
      .on('mouseover', (event: MouseEvent, d: NodeData) => {
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(d.id)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', () => {
        tooltip.transition().duration(500).style('opacity', 0);
      })
      .on('click', (event: MouseEvent, d: NodeData) => {
        event.stopPropagation();
        highlightConnectedNodes(d);
        centerAndZoomNode(d);
      });

    const labels = g.append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d: any) => d.id)
      .attr('font-size', (d: any) => d.group === 'category' ? 24 : 18)
      .attr('font-weight', (d: any) => d.group === 'category' ? 'bold' : 'normal')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#333');

    sim.on('tick', () => {
      link.attr('d', (d: any) => {
        const dx = d.target.x - d.source.x,
              dy = d.target.y - d.source.y,
              dr = Math.sqrt(dx * dx + dy * dy);
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      labels.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    const centerAndZoomNode = (d: NodeData) => {
      const connectedNodes = new Set<string>([d.id]);
      links.forEach((link: any) => {
        if (link.source.id === d.id || link.target.id === d.id) {
          connectedNodes.add(link.source.id);
          connectedNodes.add(link.target.id);
        }
      });
    
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach((node: any) => {
        if (connectedNodes.has(node.id)) {
          minX = Math.min(minX, node.x);
          minY = Math.min(minY, node.y);
          maxX = Math.max(maxX, node.x);
          maxY = Math.max(maxY, node.y);
        }
      });
    
      const dx = maxX - minX,
            dy = maxY - minY,
            x = (minX + maxX) / 2,
            y = (minY + maxY) / 2;
    
      const scale = Math.min(0.8 * Math.min(width / dx, height / dy), 2);
    
      const newTransform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-x, -y);
    
      svg.transition()
        .duration(750)
        .call(zoom.transform as any, newTransform);
    };
    
    function highlightConnectedNodes(d: NodeData) {
      const connectedNodes = new Set<string>([d.id]);
      const connectedLinks = new Set<string>();

      links.forEach((link: any) => {
        if (link.source.id === d.id || link.target.id === d.id) {
          connectedNodes.add(link.source.id);
          connectedNodes.add(link.target.id);
          connectedLinks.add(`${link.source.id}-${link.target.id}`);
        }
      });

      setHighlightedNodes(connectedNodes);
      setHighlightedLinks(connectedLinks);

      node.attr('opacity', (n: any) => connectedNodes.has(n.id) ? 1 : 0.1);
      link.attr('opacity', (l: any) => connectedLinks.has(`${l.source.id}-${l.target.id}`) ? 1 : 0.1);
      labels.attr('opacity', (n: any) => connectedNodes.has(n.id) ? 1 : 0.1);
    }

    function clearHighlight() {
      setHighlightedNodes(new Set());
      setHighlightedLinks(new Set());

      node.attr('opacity', 1);
      link.attr('opacity', 1);
      labels.attr('opacity', 1);

      // 全体が見渡せる位置に縮小
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const dx = bounds.width,
              dy = bounds.height,
              x = bounds.x + dx / 2,
              y = bounds.y + dy / 2;
      
        const scale = 0.9 / Math.max(dx / width, dy / height);
        const translate = [width / 2 - scale * x, height / 2 - scale * y];
      
        svg.transition()
          .duration(750)
          .call(zoom.transform as any, d3.zoomIdentity
            .translate(translate[0], translate[1])
            .scale(scale));
      }
    }

    svg.on('click', () => {
      clearHighlight();
    });

  }, [data, dimensions, groupDistance]);

  const handleDistanceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDistance = parseInt(event.target.value, 10);
    setGroupDistance(newDistance);
    if (simulation) {
      simulation.force('link', d3.forceLink().id((d: any) => d.id).distance(newDistance));
      simulation.alpha(1).restart();
      
      d3.select(svgRef.current)
        .transition()
        .duration(1000)
        .call(zoom =>
          simulation.alpha(1).restart()
        );
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '700px' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        <svg ref={svgRef} width="100%" height="100%" />
      </div>
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        padding: '10px',
        background: 'rgba(255, 255, 255, 0.7)',
        borderRadius: '5px',
      }}>
        <label htmlFor="distance-slider" style={{ marginRight: '10px' }}>
          グループ間の距離: {groupDistance}
        </label>
        <input
          id="distance-slider"
          type="range"
          min="50"
          max="500"
          value={groupDistance}
          onChange={handleDistanceChange}
          style={{ width: '200px' }}
        />
      </div>
    </div>
  );
};

export default Graph;
