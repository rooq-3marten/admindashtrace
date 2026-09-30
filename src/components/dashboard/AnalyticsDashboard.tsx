import React, { useState } from 'react';
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
  const { farmers, batches, practices, syncLogs, stats } = useData();

  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<{
    date: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // 30-day enrollment trend points (Spec Section 7.1)
  const trendPoints = [
    { date: 'Sep 1', value: 12 },
    { date: 'Sep 4', value: 28 },
    { date: 'Sep 8', value: 65 },
    { date: 'Sep 11', value: 92 },
    { date: 'Sep 15', value: 134 },
    { date: 'Sep 18', value: 168 },
    { date: 'Sep 22', value: 185 },
    { date: 'Sep 25', value: 215 },
    { date: 'Sep 28', value: 248 },
    { date: 'Sep 30', value: 230 },
  ];

  const maxVal = 250;
  const chartHeight = 160;
  const chartWidth = 600;

  // Compute SVG path
  const svgCoords = trendPoints.map((pt, idx) => {
    const x = (idx / (trendPoints.length - 1)) * (chartWidth - 60) + 40;
    const y = chartHeight - (pt.value / maxVal) * (chartHeight - 30) - 15;
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
              {stats.totalFarmers ? stats.totalFarmers.toLocaleString() : '1,247'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ 23 today</span>
          </div>
        </div>

        {/* KPI 2: Batches This Week */}
        <div
          onClick={() => setActiveTab('batches')}
          className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:border-[#1B7F4B] transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            Batches This Week
          </span>
          <div className="my-2">
            <span className="text-[32px] font-bold text-[#111827] dark:text-[#F1F5F9] leading-none">
              {stats.totalBatches ? stats.totalBatches : 89}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>↑ 12 today</span>
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
              {stats.totalShipmentsInTransit || 4}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#2563EB]">
            <span>2 pending customs</span>
          </div>
        </div>

        {/* KPI 4: Sync Health (Warning variant) */}
        <div
          onClick={() => setActiveTab('system_health')}
          className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border-l-4 border-l-[#F59E0B] border-t border-r border-b border-[#E5E7EB] dark:border-[#334155] shadow-sm hover:border-l-[#F59E0B] transition cursor-pointer flex flex-col justify-between"
        >
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
            Sync Health
          </span>
          <div className="my-2">
            <span className="text-[32px] font-bold text-[#111827] dark:text-[#F1F5F9] leading-none">
              97.2%
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#F59E0B]">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>↓ 2.8% (SMS GW degraded)</span>
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
                  3 batches have missing practice logs
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] ml-4 mt-0.5">
                Kano region · 2 hours ago
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
                  2 agents haven't synced in 48 hours
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] ml-4 mt-0.5">
                Fatima S., Emeka N. · 1 day ago
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
                  1 dispute pending resolution
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] ml-4 mt-0.5">
                Farmer TH-KN-2026-00482 · 2 days ago
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
                  5 farmers enrolled without GPS
                </span>
              </div>
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] ml-4 mt-0.5">
                Jigawa region · 3 days ago
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
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B7F4B] mt-1.5 shrink-0" />
              <div>
                <p className="font-medium">
                  Agent Musa enrolled farmer <span className="font-mono text-[#1B7F4B] dark:text-emerald-400">TH-KN-2026-01247</span>
                </p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">2 minutes ago</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
              <div>
                <p className="font-medium">
                  Batch <span className="font-mono text-blue-600 dark:text-blue-400">BATCH-KN-2026-1187</span> created (250kg)
                </p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">15 minutes ago</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
              <div>
                <p className="font-medium">
                  Export consignment <span className="font-mono text-emerald-600 dark:text-emerald-400">EXP-2026-0042</span> validated successfully
                </p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">1 hour ago</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] mt-1.5 shrink-0" />
              <div>
                <p className="font-medium">
                  Farmer <span className="font-mono text-red-600 dark:text-red-400">TH-KN-2026-00482</span> submitted dispute
                </p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">2 hours ago</p>
              </div>
            </div>
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
            Total: 1,247 Smallholders
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
            {svgCoords.map((pt) => (
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
