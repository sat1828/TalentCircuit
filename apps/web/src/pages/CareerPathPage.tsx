import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useCareerPath } from '../hooks/useCareerPath';
import { useAuthStore } from '../store/authStore';
import type { CareerPathData, CareerPathNode } from '@talentcircuit/shared-types';

const ORBIT_CONFIG = [
  { radius: 120, label: '1 Year', color: '#22c55e', dataKey: 'oneYear' as const },
  { radius: 220, label: '2 Years', color: '#3b82f6', dataKey: 'twoYear' as const },
  { radius: 340, label: '3+ Years', color: '#8b5cf6', dataKey: 'threeYear' as const },
];

const NODE_RADIUS = 32;
const WIDTH = 800;
const HEIGHT = 700;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;

function positionNodes(data: CareerPathData) {
  const all: (CareerPathNode & { orbitRadius: number; orbitColor: string })[] = [];
  for (const orbit of ORBIT_CONFIG) {
    for (const node of data[orbit.dataKey]) {
      all.push({ ...node, orbitRadius: orbit.radius, orbitColor: orbit.color });
    }
  }
  const byRadius: Record<number, typeof all> = { 120: [], 220: [], 340: [] };
  all.forEach((n) => { (byRadius[n.orbitRadius] ??= []).push(n); });
  return all.map((node) => {
    const bucket = byRadius[node.orbitRadius] ?? [];
    const idx = bucket.indexOf(node);
    const angle = (idx / Math.max(bucket.length, 1)) * 2 * Math.PI - Math.PI / 2;
    return { ...node, x: Math.cos(angle) * node.orbitRadius, y: Math.sin(angle) * node.orbitRadius };
  });
}

function CareerPathGraph({ data }: { data: CareerPathData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ node: CareerPathNode & { x: number; y: number }; visible: boolean } | null>(null);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const svg = d3.select(el);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${CX}, ${CY})`);

    const defs = svg.append('defs');
    defs.append('filter').attr('id', 'glow-sun').append('feDropShadow').attr('dx', 0).attr('dy', 0).attr('stdDeviation', 12).attr('flood-color', '#4f46e5').attr('flood-opacity', 0.5);
    defs.append('filter').attr('id', 'glow-node').append('feDropShadow').attr('dx', 0).attr('dy', 0).attr('stdDeviation', 6).attr('flood-color', 'currentColor').attr('flood-opacity', 0.3);
    defs.append('filter').attr('id', 'shadow-node').append('feDropShadow').attr('dx', 0).attr('dy', 2).attr('stdDeviation', 4).attr('flood-opacity', 0.15);

    for (const orbit of ORBIT_CONFIG) {
      g.append('circle').attr('r', orbit.radius).attr('fill', 'none').attr('stroke', orbit.color).attr('stroke-width', 1.5).attr('stroke-dasharray', '6,4').attr('opacity', 0.35);
    }

    const sunG = g.append('g');
    sunG.append('circle').attr('r', 45).attr('fill', '#4f46e5').attr('stroke', '#c7d2fe').attr('stroke-width', 4).attr('filter', 'url(#glow-sun)');
    const lines = (data.currentRole?.title ?? 'Current Role').split(' ');
    const labelG = sunG.append('text').attr('text-anchor', 'middle').attr('fill', 'white').attr('font-size', '11px').attr('font-weight', '600');
    if (lines.length > 1) {
      labelG.append('tspan').attr('x', 0).attr('dy', '-0.4em').text(lines.slice(0, 2).join(' '));
      labelG.append('tspan').attr('x', 0).attr('dy', '1.2em').text(lines.slice(2).join(' '));
    } else {
      labelG.attr('dy', '0.35em').text(lines[0] ?? '');
    }

    const nodes = positionNodes(data);

    const onMouseEnter = function (this: SVGGElement, _d: unknown) {
      const d = _d as CareerPathNode & { x: number; y: number };
      d3.select(this).select('circle').transition().duration(200).attr('r', NODE_RADIUS + 6);
      setTooltip({ node: d, visible: true });
    };
    const onMouseLeave = function (this: SVGGElement) {
      d3.select(this).select('circle').transition().duration(200).attr('r', NODE_RADIUS);
      setTooltip(null);
    };
    const onNodeClick = function (_event: unknown, _d: unknown) {
      const d = _d as CareerPathNode & { x: number; y: number };
      setTooltip((prev) => (prev?.node.roleId === d.roleId && prev?.visible ? null : { node: d, visible: true }));
    };

    for (const node of nodes) {
      g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', node.x).attr('y2', node.y).attr('stroke', node.orbitColor).attr('stroke-width', 1).attr('opacity', 0.12);

      const nodeG = g.append('g').attr('transform', `translate(${node.x}, ${node.y})`).style('cursor', 'pointer').on('mouseenter', onMouseEnter).on('mouseleave', onMouseLeave).on('click', onNodeClick);

      nodeG.append('circle').attr('r', NODE_RADIUS).attr('fill', '#fff').attr('stroke', node.orbitColor).attr('stroke-width', 2.5).attr('filter', 'url(#shadow-node)');

      nodeG.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em').attr('fill', node.orbitColor).attr('font-size', '13px').attr('font-weight', '700').text(`${node.matchScore}%`);

      nodeG.append('text').attr('text-anchor', 'middle').attr('dy', '1.3em').attr('fill', '#6b7280').attr('font-size', '9px').text(node.title.length > 16 ? node.title.slice(0, 15) + '\u2026' : node.title);
    }

    const legendG = svg.append('g').attr('transform', `translate(${WIDTH - 140}, ${HEIGHT - 80})`);
    for (let i = 0; i < ORBIT_CONFIG.length; i++) {
      const y = i * 22;
      const cfg = ORBIT_CONFIG[i]!;
      legendG.append('line').attr('x1', 0).attr('y1', y).attr('x2', 16).attr('y2', y).attr('stroke', cfg.color).attr('stroke-width', 2).attr('stroke-dasharray', '4,2');
      legendG.append('text').attr('x', 22).attr('y', y + 4).attr('fill', '#6b7280').attr('font-size', '11px').text(cfg.label);
    }

    return () => {
      svg.selectAll('*').remove();
    };
  }, [data]);

  const closeTooltip = useCallback(() => setTooltip(null), []);

  return (
    <div className="relative">
      <svg ref={svgRef} width="100%" height={HEIGHT - 100} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" />
      {tooltip?.visible && tooltip.node && (
        <div className="glass-card p-4 animate-slide-up">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-secondary truncate">{tooltip.node.title}</h3>
              <p className="text-xs text-muted mt-0.5">{tooltip.node.department ?? ''} &middot; {tooltip.node.level}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={tooltip.node.matchScore >= 75 ? 'badge-green' : tooltip.node.matchScore >= 55 ? 'badge-blue' : 'badge-yellow'}>{tooltip.node.matchScore}% match</span>
              </div>
              {tooltip.node.skillGaps && tooltip.node.skillGaps.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-secondary mb-1">Skill gaps:</p>
                  <div className="flex flex-wrap gap-1">
                    {tooltip.node.skillGaps.map((g, i) => (
                      <span key={i} className="badge-red">+{g.gap} {g.skillName}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={closeTooltip} className="text-xs text-muted hover:text-secondary shrink-0 ml-3">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleCard({ node, index }: { node: CareerPathNode; index: number }) {
  return (
    <div className="glass-card p-4 animate-slide-up flex flex-col sm:flex-row sm:items-center gap-3" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-secondary truncate">{node.title}</h4>
        <p className="text-xs text-muted mt-0.5">{node.department ?? ''} &middot; {node.level}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={node.matchScore >= 75 ? 'badge-green' : node.matchScore >= 55 ? 'badge-blue' : 'badge-yellow'}>{node.matchScore}% match</span>
      </div>
      {node.skillGaps && node.skillGaps.length > 0 && (
        <div className="flex flex-wrap gap-1 shrink-0">
          {node.skillGaps.slice(0, 3).map((g, i) => (
            <span key={i} className="badge-red text-[10px]">+{g.gap} {g.skillName}</span>
          ))}
          {node.skillGaps.length > 3 && <span className="text-[10px] text-muted">+{node.skillGaps.length - 3}</span>}
        </div>
      )}
    </div>
  );
}

function HorizonSection({ title, description, nodes, color }: { title: string; description: string; nodes: CareerPathNode[]; color: string }) {
  if (nodes.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h3 className="font-semibold text-sm text-secondary">{title}</h3>
        <span className="text-xs text-muted">({nodes.length})</span>
      </div>
      <p className="text-xs text-muted -mt-1">{description}</p>
      <div className="space-y-2">
        {nodes.map((node, i) => (
          <RoleCard key={node.roleId} node={node} index={i} />
        ))}
      </div>
    </div>
  );
}

export function CareerPathPage() {
  const { data, isLoading, error } = useCareerPath();
  const user = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <div className="relative max-w-5xl mx-auto space-y-6 animate-fade-in px-4">
        <div className="floating-orb w-72 h-72 bg-indigo-500/20 -top-20 -left-20" />
        <div className="floating-orb w-96 h-96 bg-purple-500/15 top-1/2 -right-32" />
        <div className="floating-orb w-64 h-64 bg-emerald-500/10 bottom-10 left-1/3" />
        <div className="text-center space-y-3 py-6">
          <div className="skeleton h-8 w-64 mx-auto" />
          <div className="skeleton h-4 w-96 mx-auto" />
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-center h-[600px]">
            <div className="space-y-4 w-full max-w-md">
              <div className="skeleton h-96 w-full rounded-2xl" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
        <div className="space-y-3 mt-4">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative max-w-5xl mx-auto animate-fade-in px-4">
        <div className="floating-orb w-72 h-72 bg-red-500/10 -top-20 -left-20" />
        <div className="floating-orb w-96 h-96 bg-orange-500/10 top-1/2 -right-32" />
        <div className="floating-orb w-64 h-64 bg-rose-500/10 bottom-10 left-1/3" />
        <div className="glass-card p-12 text-center animate-slide-up mt-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          </div>
          <h2 className="text-lg font-semibold text-secondary mb-2">Failed to load career path</h2>
          <p className="text-sm text-muted">We couldn&apos;t retrieve your career path data. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!data || (!data.oneYear.length && !data.twoYear.length && !data.threeYear.length)) {
    return (
      <div className="relative max-w-5xl mx-auto animate-fade-in px-4">
        <div className="floating-orb w-72 h-72 bg-indigo-500/20 -top-20 -left-20" />
        <div className="floating-orb w-96 h-96 bg-purple-500/15 top-1/2 -right-32" />
        <div className="floating-orb w-64 h-64 bg-emerald-500/10 bottom-10 left-1/3" />
        <div className="glass-card p-12 text-center animate-slide-up mt-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
          </div>
          <h2 className="text-lg font-semibold text-secondary mb-2">No career path available</h2>
          <p className="text-sm text-muted">Complete your profile with skills and a current role to discover your career trajectory.</p>
        </div>
      </div>
    );
  }

  const nearTerm = [...data.oneYear].filter((n) => n.matchScore >= 75);
  const mediumTerm = [...data.oneYear, ...data.twoYear].filter((n) => n.matchScore >= 55 && n.matchScore < 75);
  const longTerm = [...data.oneYear, ...data.twoYear, ...data.threeYear].filter((n) => n.matchScore < 55);

  return (
    <div className="relative max-w-5xl mx-auto space-y-6 animate-fade-in px-4 pb-10">
      <div className="floating-orb w-72 h-72 bg-indigo-500/20 -top-20 -left-20" />
      <div className="floating-orb w-96 h-96 bg-purple-500/15 top-1/2 -right-32" />
      <div className="floating-orb w-64 h-64 bg-emerald-500/10 bottom-10 left-1/3" />

      <div className="text-center space-y-2 pt-2">
        <h1 className="text-3xl font-bold gradient-text">Your Career Path</h1>
        <p className="text-sm text-muted">
          {user ? `Based on your skills, ${user.fullName ?? 'here'} are roles you can grow into over time` : 'Discover roles that match your skills and growth potential'}
        </p>
      </div>

      <div className="glass-card p-6">
        <CareerPathGraph data={data} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs text-muted">
        <div className="glass p-3 rounded-xl"><span className="text-green-500 font-bold">&bull;</span> 1 Year &middot; High match, small gap</div>
        <div className="glass p-3 rounded-xl"><span className="text-blue-500 font-bold">&bull;</span> 2 Years &middot; Achievable with focus</div>
        <div className="glass p-3 rounded-xl"><span className="text-purple-500 font-bold">&bull;</span> 3+ Years &middot; Stretch roles</div>
      </div>

      <div className="space-y-6">
        <HorizonSection title="Near Term (1 Year)" description="High match roles with minimal skill gaps" nodes={nearTerm} color="#22c55e" />
        <HorizonSection title="Medium Term (2 Years)" description="Achievable roles with focused development" nodes={mediumTerm} color="#3b82f6" />
        <HorizonSection title="Long Term (3+ Years)" description="Stretch roles requiring significant growth" nodes={longTerm} color="#8b5cf6" />
      </div>
    </div>
  );
}
