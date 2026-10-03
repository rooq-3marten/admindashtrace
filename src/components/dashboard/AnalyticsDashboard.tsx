import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { TabType } from '../layout/Sidebar';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Sparkles,
  Smartphone,
  Server,
  Database,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  setActiveTab: (tab: TabType) => void;
  onOpenSimulator: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  setActiveTab,
  onOpenSimulator,
}) => {
  const { farmers, batches, practices, syncLogs, stats, agents, disputes } = useData();

  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<{
    date: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // Dynamic 30-day enrollment trend points from actual farmers
  const trendPoints = useMemo(() => {
    if (farmers.length === 0) {
      return [
        { date: 'Day 1', value: 0 },
        { date: 'Day 5', value: 0 },
        { date: 'Day 10', value: 0 },
        { date: 'Day 15', value: 0 },
        { date: 'Day 20', value: 0 },
        { date: 'Day 25', value: 0 },
        { date: 'Today', value: 0 },
      ];
    }
    // Sort farmers by creation time and build cumulative points
    const sorted = [...farmers].sort((a, b) => a.created_at_epoch_ms - b.created_at_epoch_ms);
    const intervals = 8;
    const minTime = sorted[0].created_at_epoch_ms;
    const maxTime = Math.max(Date.now(), sorted[sorted.length - 1].created_at_epoch_ms);
    const step = (maxTime - minTime) / (intervals - 1) || 1;

    return Array.from({ length: intervals }).map((_, idx) => {
      const threshold = minTime + idx * step;
      const count = sorted.filter((f) => f.created_at_epoch_ms <= threshold).length;
      const d = new Date(threshold);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return { date: label, value: count };
    });
  }, [farmers]);

  const maxVal = Math.max(...trendPoints.map((p: { value: number }) => p.value), 10);
  const chartHeight = 160;
  const chartWidth = 600;

  // Compute SVG path
  const svgCoords = trendPoints.map((pt: { date: string; value: number }, idx: number) => {
    const x = (idx / (trendPoints.length - 1)) * (chartWidth - 60) + 40;
    const y = chartHeight - (pt.value / maxVal) * (chartHeight - 30) - 15;
    return { ...pt, x, y };
  });

  const pathD = svgCoords.reduce((acc: string, curr: typeof svgCoords[0], idx: number) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = svgCoords[idx - 1];
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (curr.x - prev.x) / 2;
    const cpY2 = curr.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${svgCoords[svgCoords.length - 1].x} ${chartHeight - 10} L ${svgCoords[0].x} ${chartHeight - 10} Z`;

  // Dynamic Action Required calculations
  const incompleteBatches = batches.filter((b) => b.export_clearance_status === 'PENDING_CLEARANCE');
  const staleAgents = (agents || []).filter((a: any) => a.active_status === 'offline' || Date.now() - a.last_sync_epoch_ms > 24 * 3600 * 1000);
  const openDisputes = disputes ? disputes.filter((d) => d.status === 'Open') : [];
  const missingGpsFarmers = farmers.filter((f) => !f.latitude || !f.longitude || !f.gps_polygon);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* 4 KPI Cards (Spec Section 6.1 & 7.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Farmers Enrolled */}
        <div
          onClick={() => setActiveTab('farmers')}
          className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:border-[#1B7F4B] transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            Farmers Enrolled
          </span>
          <div className="my-2">
            <span className="text-[32px] font-bold text-[#111827] dark:text-[#F1F5F9] leading-none">
              {stats.totalFarmers.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ {farmers.filter((f) => Date.now() - f.created_at_epoch_ms < 86400000).length} today</span>
          </div>
        </div>

        {/* KPI 2: Batches This Week */}
        <div
          onClick={() => setActiveTab('batches')}
          className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:border-[#1B7F4B] transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            Batches Registered
          </span>
          <div className="my-2">
            <span className="text-[32px] font-bold text-[#111827] dark:text-[#F1F5F9] leading-none">
              {stats.totalBatches}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{stats.certifiedBatchesCount} Certified EUDR/NAFDAC</span>
          </div>
        </div>

        {/* KPI 3: Shipments In Transit */}
        <div
          onClick={() => setActiveTab('shipments')}
          className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:border-[#1B7F4B] transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            Shipments In Transit
          </span>
          <div className="my-2">
            <span className="text-[32px] font-bold text-[#111827] dark:text-[#F1F5F9] leading-none">
              {stats.totalShipmentsInTransit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#2563EB]">
            <span>Maritime routes active</span>
          </div>
        </div>

        {/* KPI 4: Sync Health (Warning variant) */}
        <div
          onClick={() => setActiveTab('system_health')}
          className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border-l-4 border-l-[#16A34A] border-t border-r border-b border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:border-l-[#16A34A] transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            Sync Health
          </span>
          <div className="my-2">
            <span className="text-[32px] font-bold text-[#111827] dark:text-[#F1F5F9] leading-none">
              {stats.syncHealthPercentage}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.activeAgentsCount} Agents syncing live</span>
          </div>
        </div>
      </div>

      {/* Action Required Panel (Spec Section 6.2 & 7.1) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#334155]">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <h2 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              ACTION REQUIRED
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('data_quality')}
            className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400 hover:underline cursor-pointer"
          >
            [View All]
          </button>
        </div>

        <div className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-xs">
          {/* Action Item 1 */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                <span className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
                  {incompleteBatches.length > 0 ? `${incompleteBatches.length} export batches pending clearance` : 'All export lots cleared'}
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] ml-4 mt-0.5">
                {incompleteBatches.length > 0 ? `${incompleteBatches[0].batch_number} awaiting final certification` : 'EUDR/NAFDAC certificates intact'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('batches')}
              className="px-3 py-1.5 rounded-md bg-[#1B7F4B] text-white hover:bg-[#145C36] font-medium transition cursor-pointer shrink-0"
            >
              Review →
            </button>
          </div>

          {/* Action Item 2 */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
                  {staleAgents.length > 0 ? `${staleAgents.length} field enumerators offline or pending sync` : 'All field agents active'}
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] ml-4 mt-0.5">
                {staleAgents.length > 0 ? `${staleAgents.map((a: any) => a.name).join(', ')}` : 'Low latency connectivity'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('fleet')}
              className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition cursor-pointer shrink-0"
            >
              Notify →
            </button>
          </div>

          {/* Action Item 3 */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                <span className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
                  {openDisputes.length} smallholder {openDisputes.length === 1 ? 'dispute' : 'disputes'} pending resolution
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] ml-4 mt-0.5">
                {openDisputes.length > 0 ? `${openDisputes[0].farmer_name} (${openDisputes[0].farmer_id})` : 'Dispute tribunal clear'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('disputes')}
              className="px-3 py-1.5 rounded-md bg-[#1B7F4B] text-white hover:bg-[#145C36] font-medium transition cursor-pointer shrink-0"
            >
              Resolve →
            </button>
          </div>

          {/* Action Item 4 */}
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
                  {missingGpsFarmers.length} farmers enrolled without polygon boundaries
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] ml-4 mt-0.5">
                {missingGpsFarmers.length > 0 ? `Centroid check required for ${missingGpsFarmers[0].state} cluster` : '100% EUDR plot coverage'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('data_quality')}
              className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-200 dark:hover:bg-slate-700 font-medium transition cursor-pointer shrink-0"
            >
              View →
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Recent Activity & System Status (Spec Section 7.1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-sm space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
              Recent Activity
            </h3>
            <span className="text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8]">
              Live Ingestion Stream
            </span>
          </div>

          <div className="space-y-3.5 text-xs text-[#111827] dark:text-[#F1F5F9]">
            {/* Dynamic Activity Item 1: Latest Mobile Sync */}
            {syncLogs.length > 0 && (
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1B7F4B] mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    Agent <span className="font-mono text-[#1B7F4B] dark:text-emerald-400">{syncLogs[0].agent_id}</span> synced {syncLogs[0].farmers_count} farmers, {syncLogs[0].practices_count} practice logs
                  </p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                    {Math.max(1, Math.round((Date.now() - syncLogs[0].server_timestamp_ms) / 60000))} minutes ago
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Activity Item 2: Latest Farmer Registered */}
            {farmers.length > 0 && (
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    Smallholder <span className="font-semibold">{farmers[0].full_name}</span> (<span className="font-mono text-blue-600 dark:text-blue-400">{farmers[0].official_farmer_id}</span>) enrolled in {farmers[0].lga}, {farmers[0].state}
                  </p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                    {Math.max(1, Math.round((Date.now() - farmers[0].created_at_epoch_ms) / 3600000))} hours ago
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Activity Item 3: Latest Batch Certified or Created */}
            {batches.length > 0 && (
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    Export lot <span className="font-mono text-emerald-600 dark:text-emerald-400">{batches[0].batch_number}</span> ({batches[0].crop} · {batches[0].estimated_tonnage} MT) {batches[0].export_clearance_status === 'CERTIFIED_COMPLIANT' ? 'certified compliant' : 'logged'}
                  </p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                    {Math.max(1, Math.round((Date.now() - batches[0].created_at_ms) / 3600000))} hours ago
                  </p>
                </div>
              </div>
            )}

            {/* Dynamic Activity Item 4: Latest Dispute or Flag */}
            {openDisputes.length > 0 ? (
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    Dispute logged: <span className="font-mono text-red-600 dark:text-red-400">{openDisputes[0].farmer_id}</span> ({openDisputes[0].issue})
                  </p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">{openDisputes[0].date}</p>
                </div>
              </div>
            ) : practices.length > 0 ? (
              <div className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    Practice log verified: <span className="font-mono text-emerald-600 dark:text-emerald-400">{practices[0].farmer_code}</span> ({practices[0].product_name})
                  </p>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">PHI Verified</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* System Status (Spec Section 7.1) */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-sm space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
              System Status
            </h3>
            <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
              Last deploy: 2 days ago
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <span className="text-[#6B7280] dark:text-[#94A3B8]">API:</span>
              <span className="flex items-center gap-1.5 font-medium text-[#16A34A]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Healthy
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <span className="text-[#6B7280] dark:text-[#94A3B8]">Database:</span>
              <span className="flex items-center gap-1.5 font-medium text-[#16A34A]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Healthy
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <span className="text-[#6B7280] dark:text-[#94A3B8]">USSD GW:</span>
              <span className="flex items-center gap-1.5 font-medium text-[#16A34A]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Healthy
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60">
              <span className="text-[#6B7280] dark:text-[#94A3B8]">SMS GW:</span>
              <span className="flex items-center gap-1.5 font-medium text-[#F59E0B]">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Degraded
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 col-span-2">
              <span className="text-[#6B7280] dark:text-[#94A3B8]">S3 Storage:</span>
              <span className="flex items-center gap-1.5 font-medium text-[#16A34A]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Healthy
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
            <span>Uptime (30d): <strong className="text-[#111827] dark:text-[#F1F5F9]">99.94%</strong></span>
            <span>Avg API latency: <strong className="text-[#111827] dark:text-[#F1F5F9]">142ms</strong></span>
          </div>
        </div>
      </div>

      {/* ENROLLMENT TREND (Last 30 Days) Chart (Spec Section 7.1) */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-[#111827] dark:text-[#F1F5F9]">
              ENROLLMENT TREND (Last 30 Days)
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
              Smallholders onboarding trajectory across northern aggregation clusters
            </p>
          </div>
          <span className="text-xs font-semibold text-[#1B7F4B] dark:text-emerald-400">
            Total: {farmers.length.toLocaleString()} Smallholders
          </span>
        </div>

        {/* SVG Chart Area */}
        <div className="relative pt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-48 select-none"
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1B7F4B" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#1B7F4B" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0, 50, 100, 150, 200, 250].map((v) => {
              const y = chartHeight - (v / maxVal) * (chartHeight - 30) - 15;
              return (
                <g key={v}>
                  <line
                    x1="40"
                    y1={y}
                    x2={chartWidth - 20}
                    y2={y}
                    stroke="currentColor"
                    className="text-[#E5E7EB] dark:text-[#334155]"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="30"
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-[#9CA3AF] dark:fill-[#64748B]"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Area Fill */}
            <path d={areaD} fill="url(#trendGradient)" />

            {/* Trend Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#1B7F4B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            {svgCoords.map((pt: any) => (
              <circle
                key={pt.date}
                cx={pt.x}
                cy={pt.y}
                r="4"
                className="fill-white dark:fill-[#0F172A] stroke-[#1B7F4B] stroke-2 hover:r-6 transition-all cursor-pointer"
                onMouseEnter={() => setHoveredTrendPoint(pt)}
                onMouseLeave={() => setHoveredTrendPoint(null)}
              />
            ))}

            {/* X-axis Labels */}
            {['Sep 1', 'Sep 8', 'Sep 15', 'Sep 22', 'Sep 29'].map((dateLabel, idx) => {
              const xPos = 40 + idx * ((chartWidth - 60) / 4);
              return (
                <text
                  key={dateLabel}
                  x={xPos}
                  y={chartHeight - 2}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-[#6B7280] dark:fill-[#94A3B8]"
                >
                  {dateLabel}
                </text>
              );
            })}
          </svg>

          {/* Hover Tooltip */}
          {hoveredTrendPoint && (
            <div
              className="absolute pointer-events-none px-2.5 py-1 rounded bg-[#111827] text-white text-xs font-mono shadow-lg -translate-x-1/2 -translate-y-8"
              style={{
                left: `${(hoveredTrendPoint.x / chartWidth) * 100}%`,
                top: `${(hoveredTrendPoint.y / chartHeight) * 100}%`,
              }}
            >
              {hoveredTrendPoint.date}: <strong>{hoveredTrendPoint.value} enrolled</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
