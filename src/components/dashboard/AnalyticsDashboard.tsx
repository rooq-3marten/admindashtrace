import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { TabType } from '../layout/Sidebar';

interface AnalyticsDashboardProps {
  setActiveTab: (tab: TabType) => void;
  onOpenSimulator: () => void;
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
    if (farmers.length === 0) {
      return [
        { date: '1 Sep', value: 120 },
        { date: '6 Sep', value: 240 },
        { date: '12 Sep', value: 410 },
        { date: '18 Sep', value: 680 },
        { date: '24 Sep', value: 920 },
        { date: '30 Sep', value: 1140 },
        { date: 'Today', value: 1247 },
      ];
    }
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
    const x = (idx / (trendPoints.length - 1)) * (chartWidth - 80) + 50;
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

  const areaD = `${pathD} L ${svgCoords[svgCoords.length - 1].x} ${chartHeight - 10} L ${svgCoords[0].x} ${chartHeight - 10} Z`;

  // Action items
  const incompleteBatches = batches.filter((b) => b.export_clearance_status === 'PENDING_CLEARANCE');
  const staleAgents = (agents || []).filter(
    (a) => a.active_status === 'offline' || Date.now() - a.last_sync_epoch_ms > 24 * 3600 * 1000
  );
  const openDisputes = disputes ? disputes.filter((d) => d.status === 'Open') : [];

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
            <span>↑ {farmers.filter((f) => Date.now() - f.created_at_epoch_ms < 86400000).length || 23} enrolled today</span>
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
            <span>{stats.certifiedBatchesCount} lots cleared for export</span>
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
            <span>Rotterdam & Hamburg routes</span>
          </div>
        </div>

        {/* Card 4: Sync health (3.5 cols — deliberately wider for context) */}
        <div
          onClick={() => setActiveTab('system_health')}
          className="lg:col-span-3 p-5 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card hover:border-[#D1DBD5] transition-all cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[13px] font-medium text-[#5A6B60] dark:text-[#A1B3A7]">
            Sync health
          </span>
          <div className="my-2">
            <span className="text-[34px] font-mono font-bold text-[#1A2E23] dark:text-white tabular-nums leading-tight">
              {stats.syncHealthPercentage}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
            <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" />
            <span>{stats.activeAgentsCount} agents syncing live</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: NEEDS YOUR ATTENTION (Warm, direct, not alarmist) */}
      <div className="p-6 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5EBE7] dark:border-[#2D4536]">
          <div>
            <h2 className="font-serif font-bold text-lg text-[#1A2E23] dark:text-white tracking-tight">
              Needs your attention
            </h2>
            <p className="text-xs text-[#5A6B60] dark:text-[#8A968E] mt-0.5">
              Items requiring administrative review before consignment dispatch
            </p>
          </div>
          <button
            onClick={() => setActiveTab('data_quality')}
            className="text-xs font-semibold text-[#1A4D2E] dark:text-[#86EFAC] hover:underline cursor-pointer"
          >
            See all items →
          </button>
        </div>

        <div className="divide-y divide-[#E5EBE7] dark:divide-[#2D4536] text-sm">
          {/* Item 1 */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#A63A2E] mt-2 shrink-0" />
              <div>
                <span className="font-medium text-[#1A2E23] dark:text-[#F1F5F9]">
                  {incompleteBatches.length > 0 ? `${incompleteBatches.length} batches have pending compliance clearance` : '3 export lots awaiting review'}
                </span>
                <p className="text-[12px] text-[#8A968E] mt-0.5">
                  Kano & Jigawa aggregation hubs · 2 hours ago
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('batches')}
              className="text-xs font-semibold text-[#1A4D2E] dark:text-[#86EFAC] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-center"
            >
              Review <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Item 2 */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#B8860B] mt-2 shrink-0" />
              <div>
                <span className="font-medium text-[#1A2E23] dark:text-[#F1F5F9]">
                  {staleAgents.length > 0 ? `${staleAgents.length} field enumerators haven't synced in 48 hours` : '2 agents haven\'t synced recently'}
                </span>
                <p className="text-[12px] text-[#8A968E] mt-0.5">
                  Fatima Bello (Kano), Emeka Nwosu (Benue) · 1 day ago
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('fleet')}
              className="text-xs font-semibold text-[#1A4D2E] dark:text-[#86EFAC] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-center"
            >
              Notify <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Item 3 */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#A63A2E] mt-2 shrink-0" />
              <div>
                <span className="font-medium text-[#1A2E23] dark:text-[#F1F5F9]">
                  {openDisputes.length > 0 ? `${openDisputes.length} smallholder land title disputes logged` : '1 farmer boundary clarification required'}
                </span>
                <p className="text-[12px] text-[#8A968E] mt-0.5">
                  Abubakar Ali (Dambatta plot, Kano) · 4 hours ago
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('disputes')}
              className="text-xs font-semibold text-[#1A4D2E] dark:text-[#86EFAC] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-center"
            >
              Resolve <span aria-hidden="true">→</span>
            </button>
          </div>

          {/* Item 4 */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#B8860B] mt-2 shrink-0" />
              <div>
                <span className="font-medium text-[#1A2E23] dark:text-[#F1F5F9]">
                  Annex II plot polygon verification needed for new enrollments
                </span>
                <p className="text-[12px] text-[#8A968E] mt-0.5">
                  Hadiza Musa, Terna Ior (Jigawa & Benue smallholder clusters)
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('eudr_engine')}
              className="text-xs font-semibold text-[#1A4D2E] dark:text-[#86EFAC] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-center"
            >
              Inspect <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: TWO COLUMN LAYOUT — WHAT'S HAPPENING & SYSTEM HEALTH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* What's happening (Recent Activity with dashed separators) */}
        <div className="p-6 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card space-y-4">
          <div className="pb-3 border-b border-[#E5EBE7] dark:border-[#2D4536] flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#1A2E23] dark:text-white">
              What's happening
            </h3>
            <span className="text-[12px] font-mono text-[#8A968E]">
              Ingestion feed
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {syncLogs.length > 0 && (
              <div className="pb-3 border-b border-dashed border-[#E5EBE7] dark:border-[#2D4536] flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-[#1A4D2E] mt-1 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[#1A2E23] dark:text-[#F1F5F9] font-medium leading-relaxed">
                    Field agent <strong className="font-mono text-[#1A4D2E] dark:text-[#86EFAC]">{syncLogs[0].agent_id}</strong> synced {syncLogs[0].farmers_count} smallholders and {syncLogs[0].practices_count} chemical logs.
                  </p>
                  <p className="text-[11px] text-[#8A968E]">
                    {Math.max(1, Math.round((Date.now() - syncLogs[0].server_timestamp_ms) / 60000))} minutes ago · Kano aggregation point
                  </p>
                </div>
              </div>
            )}

            <div className="pb-3 border-b border-dashed border-[#E5EBE7] dark:border-[#2D4536] flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#2D6A4F] mt-1 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[#1A2E23] dark:text-[#F1F5F9] font-medium leading-relaxed">
                  Smallholder <strong>Ngozi Eze</strong> enrolled with verified GPS plot polygon in Benue State.
                </p>
                <p className="text-[11px] text-[#8A968E]">
                  1 hour ago · Soybeans cluster
                </p>
              </div>
            </div>

            <div className="pb-3 border-b border-dashed border-[#E5EBE7] dark:border-[#2D4536] flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#4A6FA5] mt-1 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[#1A2E23] dark:text-[#F1F5F9] font-medium leading-relaxed">
                  Export batch <strong className="font-mono text-slate-800 dark:text-slate-200">BATCH-KN-2026-1187</strong> (42.50 MT Sesame) loaded onto vessel CMA CGM Africa One.
                </p>
                <p className="text-[11px] text-[#8A968E]">
                  3 hours ago · Lagos Apapa Port
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full bg-[#2D6A4F] mt-1 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-[#1A2E23] dark:text-[#F1F5F9] font-medium leading-relaxed">
                  NAQS Phytosanitary certificate issued for consignment lot 0042. Chlorpyrifos &lt;0.005 mg/kg confirmed.
                </p>
                <p className="text-[11px] text-[#8A968E]">
                  5 hours ago · SGS Testing Laboratory
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System health (Calm, factual, not alarmist) */}
        <div className="p-6 rounded-xl bg-white dark:bg-[#1A2E23] border border-[#E5EBE7] dark:border-[#2D4536] shadow-warm-card space-y-4">
          <div className="pb-3 border-b border-[#E5EBE7] dark:border-[#2D4536] flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-[#1A2E23] dark:text-white">
              System health
            </h3>
            <span className="text-[12px] text-[#5A6B60] dark:text-[#8A968E]">
              All core services operating
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C]">
              <span className="font-medium text-[#1A2E23] dark:text-white">Traceability Ingestion API</span>
              <div className="flex items-center gap-1.5 font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
                <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" />
                <span>Healthy</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C]">
              <span className="font-medium text-[#1A2E23] dark:text-white">PostgreSQL & GIS Geometries</span>
              <div className="flex items-center gap-1.5 font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
                <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" />
                <span>Healthy</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C]">
              <span className="font-medium text-[#1A2E23] dark:text-white">USSD Enumeration Gateway</span>
              <div className="flex items-center gap-1.5 font-medium text-[#2D6A4F] dark:text-[#86EFAC]">
                <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" />
                <span>Healthy</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F7F9F7] dark:bg-[#14261C]">
              <span className="font-medium text-[#1A2E23] dark:text-white">SMS Notification Gateway</span>
              <div className="flex items-center gap-1.5 font-medium text-[#B8860B] dark:text-[#FCD34D]">
                <span className="w-2 h-2 rounded-full bg-[#B8860B]" />
                <span>Minor queue delay</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5EBE7] dark:border-[#2D4536] flex items-center justify-between text-xs text-[#5A6B60] dark:text-[#8A968E]">
            <span>Uptime (30 days): <strong className="text-[#1A2E23] dark:text-white font-mono">99.96%</strong></span>
            <span>Last checked 30 seconds ago</span>
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
              Smallholders onboarding across Kano, Benue, and Jigawa clusters
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#1A4D2E] dark:text-[#86EFAC] font-mono tabular-nums">
              Total: {farmers.length.toLocaleString()} smallholders
            </span>
          </div>
        </div>

        {/* SVG Chart with dashed gridlines and subtle area fill */}
        <div className="relative pt-2 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 select-none"
          >
            {/* Dashed Horizontal Gridlines */}
            {[0, 250, 500, 750, 1000, 1250].map((v) => {
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

            {/* Hand-drawn Annotation */}
            <g transform={`translate(${chartWidth - 210}, 30)`}>
              <rect x="0" y="0" width="160" height="24" rx="4" fill="#FFFFFF" stroke="#E5EBE7" />
              <text x="8" y="16" className="text-[11px] fill-[#5A6B60] font-sans">
                ✦ Harvest season begins
              </text>
            </g>
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
        </div>
      </div>
    </div>
  );
};
