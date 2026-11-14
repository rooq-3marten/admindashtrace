import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { TabType } from '../layout/Sidebar';
import { practiceNeedsReview } from '../../utils/practiceReview';

interface AnalyticsDashboardProps {
  setActiveTab: (tab: TabType) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  setActiveTab,
}) => {
  const { farmers, batches, practices, syncLogs, stats, agents, disputes } = useData();

  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<{
    date: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // Dynamic 30-day enrollment trajectory
  const trendPoints = useMemo(() => {
    if (farmers.length === 0) return [] as { date: string; value: number }[];
    const sorted = [...farmers].sort((a, b) => a.created_at_epoch_ms - b.created_at_epoch_ms);
    const intervals = 8;
    const minTime = sorted[0].created_at_epoch_ms;
    const maxTime = Math.max(Date.now(), sorted[sorted.length - 1].created_at_epoch_ms);
    const step = (maxTime - minTime) / (intervals - 1) || 1;

    return Array.from({ length: intervals }).map((_, idx) => {
      const threshold = minTime + idx * step;
      const count = sorted.filter((f) => f.created_at_epoch_ms <= threshold).length;
      const d = new Date(threshold);
      const label = d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
      return { date: label, value: count };
    });
  }, [farmers]);

  const maxVal = Math.max(...trendPoints.map((p) => p.value), 10);
  const chartHeight = 170;
  const chartWidth = 640;

  // Compute SVG coordinates
  const svgCoords = trendPoints.map((pt, idx) => {
    const x = (idx / Math.max(1, trendPoints.length - 1)) * (chartWidth - 80) + 50;
    const y = chartHeight - (pt.value / maxVal) * (chartHeight - 40) - 20;
    return { ...pt, x, y };
  });

  const pathD = svgCoords.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = svgCoords[idx - 1];
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (curr.x - prev.x) / 2;
    const cpY2 = curr.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = svgCoords.length > 0 ? `${pathD} L ${svgCoords[svgCoords.length - 1].x} ${chartHeight - 10} L ${svgCoords[0].x} ${chartHeight - 10} Z` : '';

  // Action items
  const incompleteBatches = batches.filter((b) => b.export_clearance_status === 'PENDING_CLEARANCE');
  const staleAgents = (agents || []).filter(
    (a) => a.active_status === 'offline' || Date.now() - a.last_sync_epoch_ms > 24 * 3600 * 1000
  );
  const openDisputes = disputes ? disputes.filter((d) => d.status === 'Open') : [];
  const farmersWithoutBoundary = farmers.filter(
    (f) => (f.gps_polygon || '').split(';').filter((p) => p.trim().length > 0).length < 3
  );
  const practicesToReview = practices.filter((p) => practiceNeedsReview(p));

  const attentionItems: { key: string; text: string; detail?: string; action: string; tab: TabType; tone: 'red' | 'amber' }[] = [];
  if (incompleteBatches.length > 0)
    attentionItems.push({ key: 'batches', text: `${incompleteBatches.length} batch${incompleteBatches.length === 1 ? '' : 'es'} pending clearance`, action: 'Review', tab: 'batches', tone: 'red' });
  if (practicesToReview.length > 0)
    attentionItems.push({ key: 'practices', text: `${practicesToReview.length} logged practice${practicesToReview.length === 1 ? '' : 's'} flagged or using unapproved products`, action: 'Inspect', tab: 'data_quality', tone: 'red' });
  if (openDisputes.length > 0)
    attentionItems.push({ key: 'disputes', text: `${openDisputes.length} open land dispute${openDisputes.length === 1 ? '' : 's'}`, action: 'Resolve', tab: 'disputes', tone: 'red' });
  if (staleAgents.length > 0)
    attentionItems.push({
      key: 'agents',
      text: `${staleAgents.length} field agent${staleAgents.length === 1 ? '' : 's'} offline or not synced in 24 hours`,
      detail: staleAgents.slice(0, 3).map((a) => a.name || a.agent_id).join(', '),
      action: 'View',
      tab: 'fleet',
      tone: 'amber',
    });
  if (farmersWithoutBoundary.length > 0)
    attentionItems.push({ key: 'boundary', text: `${farmersWithoutBoundary.length} farmer${farmersWithoutBoundary.length === 1 ? '' : 's'} without a mapped boundary (needed for EUDR)`, action: 'Inspect', tab: 'eudr_engine', tone: 'amber' });

  const timeAgo = (ms: number) => {
    const mins = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (mins < 60) return `${mins} min ago`;
    if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
    return `${Math.round(mins / 1440)} d ago`;
  };
  const recentSyncs = [...syncLogs].sort((a, b) => b.server_timestamp_ms - a.server_timestamp_ms).slice(0, 5);

  return (
    <div className="space-y-7 max-w-[1400px] mx-auto animate-in fade-in duration-150">
      {/* SECTION 1: KPI CARDS — Warm, tactile, deliberate asymmetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Card 1: Farmers enrolled (3 cols) */}
        <div
          onClick={() => setActiveTab('farmers')}
          className="lg:col-span-3 p-5 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card hover:border-[#D1DBD5] transition-all cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[13px] font-medium text-[#5A6B60] dark:text-[#A1B3A7]">
            Farmers enrolled
          </span>
          <div className="my-2">
            <span className="text-[34px] font-mono font-bold text-[#1A2E23] dark:text-white tabular-nums leading-tight">
              {stats.totalFarmers.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
            <span>↑ {farmers.filter((f) => Date.now() - f.created_at_epoch_ms < 86400000).length} enrolled in the last 24 h</span>
          </div>
        </div>

        {/* Card 2: Export lots (3 cols) */}
        <div
          onClick={() => setActiveTab('batches')}
          className="lg:col-span-3 p-5 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card hover:border-[#D1DBD5] transition-all cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[13px] font-medium text-[#5A6B60] dark:text-[#A1B3A7]">
            Export batches
          </span>
          <div className="my-2">
            <span className="text-[34px] font-mono font-bold text-[#1A2E23] dark:text-white tabular-nums leading-tight">
              {stats.totalBatches}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
            <span>{stats.certifiedBatchesCount} marked cleared in the dashboard</span>
          </div>
        </div>

        {/* Card 3: Maritime cargo (2.5 cols) */}
        <div
          onClick={() => setActiveTab('shipments')}
          className="lg:col-span-3 p-5 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card hover:border-[#D1DBD5] transition-all cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[13px] font-medium text-[#5A6B60] dark:text-[#A1B3A7]">
            Cargo in transit
          </span>
          <div className="my-2">
            <span className="text-[34px] font-mono font-bold text-[#1A2E23] dark:text-white tabular-nums leading-tight">
              {stats.totalShipmentsInTransit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#4A6FA5] dark:text-[#93C5FD]">
            <span>Shipments marked In Transit</span>
          </div>
        </div>

        {/* Card 4: Sync health (3.5 cols — deliberately wider for context) */}
        <div
          onClick={() => setActiveTab('system_health')}
          className="lg:col-span-3 p-5 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card hover:border-[#D1DBD5] transition-all cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[13px] font-medium text-[#5A6B60] dark:text-[#A1B3A7]">
            Agents synced (48 h)
          </span>
          <div className="my-2">
            <span className="text-[34px] font-mono font-bold text-[#1A2E23] dark:text-white tabular-nums leading-tight">
              {stats.syncHealthPercentage}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
            <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" />
            <span>{stats.activeAgentsCount} of {agents.length} agents online now</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: NEEDS YOUR ATTENTION (computed from live records only) */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card">
        <div className="pb-4 border-b border-[#E5EBE7] dark:border-[#2D4536]">
          <h2 className="font-serif font-bold text-lg text-[#1A2E23] dark:text-white tracking-tight">Needs your attention</h2>
          <p className="text-xs text-[#5A6B60] dark:text-[#8A968E] mt-0.5">Counted from the records currently loaded</p>
        </div>
        <div className="divide-y divide-[#E5EBE7] dark:divide-[#2D4536] text-sm">
          {attentionItems.length === 0 && (
            <p className="py-4 text-[#5A6B60] dark:text-[#A1B3A7]">Nothing needs attention in the records currently loaded.</p>
          )}
          {attentionItems.map((item) => (
            <div key={item.key} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${item.tone === 'red' ? 'bg-[#A63A2E]' : 'bg-[#B8860B]'}`} />
                <div>
                  <span className="font-medium text-[#1A2E23] dark:text-[#F1F5F9]">{item.text}</span>
                  {item.detail && <p className="text-[12px] text-[#8A968E] mt-0.5">{item.detail}</p>}
                </div>
              </div>
              <button
                onClick={() => setActiveTab(item.tab)}
                className="text-xs font-semibold text-[#1A4D2E] dark:text-[#86EFAC] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-center"
              >
                {item.action} <span aria-hidden="true">→</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: RECENT SYNCS & DATA COVERAGE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card space-y-4">
          <div className="pb-3 border-b border-[#E5EBE7] dark:border-[#2D4536] flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#1A2E23] dark:text-white">Recent syncs</h3>
            <span className="text-[12px] font-mono text-[#8A968E]">From the sync log</span>
          </div>
          <div className="space-y-3 text-xs">
            {recentSyncs.length === 0 && <p className="text-[#5A6B60] dark:text-[#A1B3A7]">No syncs recorded yet.</p>}
            {recentSyncs.map((log, i) => (
              <div key={log.id || i} className="pb-3 border-b border-dashed border-[#E5EBE7] dark:border-[#2D4536] last:border-0 flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-[#1A4D2E] mt-1 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[#1A2E23] dark:text-[#F1F5F9] font-medium leading-relaxed">
                    <strong className="font-mono">{log.agent_id}</strong> synced {log.farmers_count} farmer{log.farmers_count === 1 ? '' : 's'} and {log.practices_count} practice{log.practices_count === 1 ? '' : 's'}
                  </p>
                  <p className="text-[11px] text-[#8A968E]">{timeAgo(log.server_timestamp_ms)} · {log.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card space-y-4">
          <div className="pb-3 border-b border-[#E5EBE7] dark:border-[#2D4536]">
            <h3 className="font-serif font-bold text-base text-[#1A2E23] dark:text-white">Data coverage</h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {[
              ['Farmers with a mapped boundary', `${farmers.length - farmersWithoutBoundary.length} of ${farmers.length}`],
              ['Practices logged', String(practices.length)],
              ['Practices flagged or unapproved', String(practicesToReview.length)],
              ['Agents online now', `${stats.activeAgentsCount} of ${agents.length}`],
              ['Last sync received', syncLogs.length > 0 ? timeAgo(Math.max(...syncLogs.map((l) => l.server_timestamp_ms))) : 'None yet'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C]">
                <span className="font-medium text-[#1A2E23] dark:text-white">{label}</span>
                <span className="font-mono font-semibold text-[#1A2E23] dark:text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 4: ENROLLMENT TRAJECTORY (Hand-drawn warmth) */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-base text-[#1A2E23] dark:text-white">
              Enrollment trajectory
            </h3>
            <p className="text-xs text-[#5A6B60] dark:text-[#8A968E]">
              Cumulative smallholders enrolled over time
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#1A4D2E] dark:text-[#86EFAC] font-mono tabular-nums">
              Total: {farmers.length.toLocaleString()} smallholders
            </span>
          </div>
        </div>

        {trendPoints.length === 0 && (
          <p className="text-xs text-[#5A6B60] dark:text-[#A1B3A7]">No farmers enrolled yet.</p>
        )}
        {/* SVG Chart with dashed gridlines and subtle area fill */}
        {trendPoints.length > 0 && (<div className="relative pt-2 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 select-none"
          >
            {/* Dashed Horizontal Gridlines */}
            {[0, 1, 2, 3, 4].map((i) => Math.round((maxVal * i) / 4)).map((v) => {
              const y = chartHeight - (v / maxVal) * (chartHeight - 40) - 20;
              return (
                <g key={v}>
                  <line
                    x1="50"
                    y1={y}
                    x2={chartWidth - 30}
                    y2={y}
                    stroke="#E5EBE7"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x="40"
                    y={y + 4}
                    textAnchor="end"
                    className="text-[11px] font-mono fill-[#8A968E]"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Subtle Area Fill */}
            <path d={areaD} fill="#EEF5F1" className="dark:fill-[#1E382A]" />

            {/* Solid Deep Green Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#1A4D2E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Circles */}
            {svgCoords.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={hoveredTrendPoint?.date === pt.date ? 5 : 3.5}
                fill="#1A4D2E"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredTrendPoint(pt)}
                onMouseLeave={() => setHoveredTrendPoint(null)}
              />
            ))}

          </svg>

          {/* X-Axis Dates */}
          <div className="flex justify-between pl-12 pr-6 pt-2 text-[11px] font-mono text-[#8A968E]">
            {trendPoints.map((p, i) => (
              <span key={i}>{p.date}</span>
            ))}
          </div>

          {/* Tooltip */}
          {hoveredTrendPoint && (
            <div
              className="absolute z-10 px-3 py-1.5 rounded-md bg-white border border-[#E5EBE7] shadow-sm text-xs font-mono pointer-events-none"
              style={{
                left: `${(hoveredTrendPoint.x / chartWidth) * 100}%`,
                top: `${(hoveredTrendPoint.y / chartHeight) * 100}%`,
                transform: 'translate(-50%, -120%)',
              }}
            >
              <div className="font-bold text-[#1A2E23]">{hoveredTrendPoint.value} farmers</div>
              <div className="text-[10px] text-[#8A968E]">{hoveredTrendPoint.date}</div>
            </div>
          )}
        </div>)}
      </div>
    </div>
  );
};
