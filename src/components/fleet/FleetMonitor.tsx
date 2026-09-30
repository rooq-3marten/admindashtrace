import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useData } from '../../context/DataContext';
import {
  Radio,
  Smartphone,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  MapPin,
  RefreshCw,
  QrCode,
  Download,
  Copy,
  Check,
  Database,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface FleetMonitorProps {
  onOpenSimulator: () => void;
}

export const FleetMonitor: React.FC<FleetMonitorProps> = ({ onOpenSimulator }) => {
  const { agents, syncLogs, isSyncing, lastSyncEvent, syncWithMobileBackend, lastServerSyncTime, liveSyncStatus } = useData();

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downstreamData, setDownstreamData] = useState<any>(null);
  const [isLoadingDownstream, setIsLoadingDownstream] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const configUrl = `${currentOrigin}/api/v1/mobile/config`;

  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify({
        traceharvest_pairing_v1: true,
        gateway_url: currentOrigin,
        upstream: `${currentOrigin}/api/v1/sync/upstream`,
        downstream: `${currentOrigin}/api/v1/sync/downstream`,
        ping: `${currentOrigin}/api/v1/sync/ping`,
      }),
      {
        width: 220,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }
    )
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.warn('QR code generation error:', err));
  }, [currentOrigin]);

  const handleFetchDownstream = async () => {
    setIsLoadingDownstream(true);
    try {
      const res = await fetch('/api/v1/sync/downstream?agent_id=AGENT-NG-042');
      if (res.ok) {
        const data = await res.json();
        setDownstreamData(data);
      }
    } catch (err) {
      console.warn('Downstream fetch error:', err);
    } finally {
      setIsLoadingDownstream(false);
    }
  };

  const copyConfigUrl = () => {
    navigator.clipboard.writeText(configUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/20 to-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
              Android Fleet Telemetry
            </span>
            <span className="text-xs text-slate-400 font-mono">Northern & Middle-Belt Agricultural Corridors</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Field Fleet Operations & Upstream Ingestion</h2>
          <p className="text-sm text-slate-400 max-w-2xl mt-0.5">
            Monitor active Android field enumerators, offline backlog synchronization, and battery health in rural communities.
          </p>
        </div>

        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950 transition cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          Test Field Agent Sync
        </button>
      </div>

      {/* Agents Roster Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const isOnline = agent.active_status === 'online' || agent.active_status === 'syncing';

          return (
            <div
              key={agent.agent_id}
              className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                {/* Agent Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-white text-sm">{agent.agent_id}</span>
                    <h3 className="font-bold text-slate-200 text-base mt-0.5">{agent.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      {agent.assigned_lga}, {agent.assigned_state}
                    </p>
                  </div>

                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      agent.active_status === 'online'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : agent.active_status === 'syncing'
                        ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        agent.active_status === 'online'
                          ? 'bg-emerald-400'
                          : agent.active_status === 'syncing'
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    {agent.active_status.toUpperCase()}
                  </span>
                </div>

                {/* Device Telemetry Box */}
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5 mt-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-emerald-400" /> Battery:
                    </span>
                    <span className="font-mono font-bold text-white">{agent.battery_level}%</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Last Seen:
                    </span>
                    <span className="font-mono text-slate-300">
                      {new Date(agent.last_sync_epoch_ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono">FARMERS</span>
                  <p className="font-bold text-emerald-400 font-mono text-sm">{agent.total_farmers_enrolled}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-mono">PRACTICES</span>
                  <p className="font-bold text-teal-300 font-mono text-sm">{agent.total_practices_logged}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Pairing & Downstream Sync Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Android Device Pairing Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-emerald-400">
                <QrCode className="w-4 h-4" /> Device Pairing QR
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                Instant Auto-Pair
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Scan with TraceHarvest Mobile</h3>
            <p className="text-xs text-slate-400 mt-1">
              Open the Android Field App camera to link device endpoint, auth tokens, and offline schemas.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="Mobile Pairing QR Code"
                className="w-40 h-40 rounded-lg shadow-md border border-slate-800 bg-white p-1"
              />
            ) : (
              <div className="w-40 h-40 flex items-center justify-center text-slate-500 font-mono text-xs">
                Generating QR...
              </div>
            )}
            <span className="text-[10px] text-slate-500 font-mono mt-2 text-center truncate max-w-full px-2">
              {currentOrigin}
            </span>
          </div>

          <div className="space-y-2">
            <button
              onClick={copyConfigUrl}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedUrl ? 'Config URL Copied!' : 'Copy Pairing Config URL'}
            </button>

            <a
              href="/api/v1/mobile/download/offline-seed.json"
              download="traceharvest_offline_seed.json"
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-emerald-300 text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download Offline Room Seed (.json)
            </a>
          </div>
        </div>

        {/* Downstream Sync & Regulatory Reference Inspector */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-blue-400">
                <Database className="w-4 h-4" /> Downstream Sync Stream
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                GET /api/v1/sync/downstream
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Regulatory Agrochemical & Smallholder Directory</h3>
            <p className="text-xs text-slate-400 mt-1">
              Field agents pull this catalog to inspect NAFDAC registration numbers, MRL clearance thresholds, and EUDR geofences offline.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono">APPROVED CHEMICALS</span>
              <p className="text-base font-bold text-emerald-400 font-mono">6 Products</p>
              <span className="text-[10px] text-slate-400">NAFDAC Certified</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono">BANNED CHEMICALS</span>
              <p className="text-base font-bold text-red-400 font-mono">6 Prohibited</p>
              <span className="text-[10px] text-slate-400">EU Annex II Blacklist</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono">SYNC STATUS</span>
              <p className="text-base font-bold text-teal-300 font-mono">Real-time</p>
              <span className="text-[10px] text-slate-400">Live Polling Active</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-mono">ACTIVE AGENTS</span>
              <p className="text-base font-bold text-blue-400 font-mono">{agents.length} Online</p>
              <span className="text-[10px] text-slate-400">Northern Corridors</span>
            </div>
          </div>

          {/* Downstream Data Inspector */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Live Downstream Payload Preview
              </span>
              <button
                onClick={handleFetchDownstream}
                disabled={isLoadingDownstream}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingDownstream ? 'animate-spin' : ''}`} />
                {isLoadingDownstream ? 'Pulling...' : 'Test Pull Downstream'}
              </button>
            </div>

            <div className="h-32 overflow-y-auto font-mono text-[11px] text-slate-400 p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
              {downstreamData ? (
                <pre>{JSON.stringify(downstreamData, null, 2)}</pre>
              ) : (
                <div className="text-slate-500 flex flex-col items-center justify-center h-full">
                  <span>Click "Test Pull Downstream" to inspect the JSON payload delivered to field devices.</span>
                  <span className="text-[10px] text-slate-600 mt-1">Endpoint: /api/v1/sync/downstream?agent_id=AGENT-NG-042</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upstream Sync Telemetry Audit Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-white text-base">Upstream Fleet Ingestion Telemetry</h3>
              <p className="text-xs text-slate-400">
                Audited HTTP transmissions from Android devices to /api/v1/sync/upstream
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Protocol: AgentBatchSyncRequest v1
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Field Agent</th>
                <th className="py-3 px-4">Transmission Time</th>
                <th className="py-3 px-4">Farmers Ingested</th>
                <th className="py-3 px-4">Practices Logged</th>
                <th className="py-3 px-4">Idempotency Check</th>
                <th className="py-3 px-4 text-right">Ingestion Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {syncLogs.map((log, index) => (
                <tr key={log.id || index} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{log.agent_id}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {new Date(log.server_timestamp_ms).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                    +{log.farmers_count} Smallholders
                  </td>
                  <td className="py-3 px-4 font-mono text-teal-300">
                    +{log.practices_count} Practices
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Client UUID Verified
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
