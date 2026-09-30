import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { AgentBatchSyncRequest, AgentBatchSyncResponse } from '../../types';
import {
  Smartphone,
  Send,
  RotateCcw,
  CheckCircle2,
  Copy,
  Check,
  X,
  Radio,
  FileCode,
  Zap,
} from 'lucide-react';

interface MobileSyncSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSyncSimulator: React.FC<MobileSyncSimulatorProps> = ({ isOpen, onClose }) => {
  const { processUpstreamSync, isSyncing } = useData();

  const [activeScenario, setActiveScenario] = useState<string>('scenario_kano');
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [responseResult, setResponseResult] = useState<AgentBatchSyncResponse | null>(null);

  const now = Date.now();

  const sampleScenarios: Record<string, { title: string; desc: string; payload: AgentBatchSyncRequest }> = {
    scenario_kano: {
      title: 'Agent AGENT-NG-042: Kano Dambatta Sesame Smallholder',
      desc: 'Enrolls new farmer Lawan Sani with GPS polygon and logs Karate 5 EC spray with 14-day PHI.',
      payload: {
        agent_id: 'AGENT-NG-042',
        device_timestamp_ms: now,
        farmers: [
          {
            client_uuid: `f-kano-${Math.floor(1000 + Math.random() * 9000)}`,
            full_name: 'Lawan Sani Dambatta',
            phone_number: '+2348039912044',
            state: 'Kano',
            lga: 'Dambatta',
            community: 'Fagwalawa',
            crop: 'Sesame',
            farm_size_hectares: 5.2,
            latitude: 12.4412,
            longitude: 8.5204,
            gps_polygon: '12.4400,8.5190;12.4400,8.5220;12.4430,8.5220;12.4430,8.5190',
            cooperative_name: 'Fagwalawa Sesame Union',
            agent_id: 'AGENT-NG-042',
            created_at_epoch_ms: now - 3600000,
            eudr_compliant: true,
          },
        ],
        practices: [
          {
            client_uuid: `p-kano-${Math.floor(1000 + Math.random() * 9000)}`,
            farmer_client_uuid: '', // set dynamically
            farmer_code: '',
            practice_type: '🧪 Pesticide application',
            product_name: 'Karate 5 EC',
            active_ingredient: 'Lambda-cyhalothrin (50 g/L EC)',
            dosage: '400 ml/ha',
            quantity_used: 2000.0,
            quantity_unit: 'ml',
            date_applied_epoch_ms: now - 2 * 86400000, // applied 2 days ago
            pre_harvest_interval_days: 14,
            nafdac_reg_no: '04-2015',
            nafdac_approved: true,
            gps_coordinates: '12.4412°N, 8.5204°E',
            risk_level: 'COMPLIANT',
            agent_id: 'AGENT-NG-042',
          },
        ],
      },
    },

    scenario_idempotent: {
      title: 'Idempotency Test: Fixed Client UUID Resend',
      desc: 'Uses fixed client_uuid 550e8400-e29b-41d4-a716-446655440000. Demonstrates network retries do NOT duplicate records.',
      payload: {
        agent_id: 'AGENT-NG-042',
        device_timestamp_ms: now,
        farmers: [
          {
            client_uuid: '550e8400-e29b-41d4-a716-446655440000',
            full_name: 'Musa Ibrahim Dambatta',
            phone_number: '+2348034512991',
            state: 'Kano',
            lga: 'Dambatta',
            community: 'Gwarabjawa',
            crop: 'Sesame',
            farm_size_hectares: 4.5,
            latitude: 12.4382,
            longitude: 8.5147,
            gps_polygon: '12.4374,8.5131;12.4374,8.5163;12.4342,8.5163;12.4342,8.5131',
            cooperative_name: 'Dambatta Sesame Growers Union',
            agent_id: 'AGENT-NG-042',
            created_at_epoch_ms: now - 86400000 * 14,
            eudr_compliant: true,
          },
        ],
        practices: [
          {
            client_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
            farmer_client_uuid: '550e8400-e29b-41d4-a716-446655440000',
            farmer_code: 'TH-KAN-2026-1048',
            practice_type: '🧪 Pesticide application',
            product_name: 'Karate 5 EC',
            active_ingredient: 'Lambda-cyhalothrin (50 g/L EC)',
            dosage: '400 ml',
            quantity_used: 400.0,
            quantity_unit: 'ml',
            date_applied_epoch_ms: now - 86400000 * 16,
            pre_harvest_interval_days: 14,
            nafdac_reg_no: '04-2015',
            nafdac_approved: true,
            gps_coordinates: '12.4382°N, 8.5147°E',
            risk_level: 'COMPLIANT',
            agent_id: 'AGENT-NG-042',
          },
        ],
      },
    },

    scenario_flagged: {
      title: 'Agent AGENT-NG-033: High Risk Chemical Flag',
      desc: 'Logs application of an unregistered / EU-banned organophosphate in Benue. Sentinel enforces quarantine.',
      payload: {
        agent_id: 'AGENT-NG-033',
        device_timestamp_ms: now,
        farmers: [
          {
            client_uuid: `f-benue-${Math.floor(1000 + Math.random() * 9000)}`,
            full_name: 'Terungwa Philip Makurdi',
            phone_number: '+2348169904411',
            state: 'Benue',
            lga: 'Makurdi',
            community: 'Fiidi',
            crop: 'Soybeans',
            farm_size_hectares: 8.5,
            latitude: 7.742,
            longitude: 8.531,
            gps_polygon: '7.740,8.529;7.740,8.533;7.744,8.533;7.744,8.529',
            cooperative_name: 'Fiidi Grain Growers',
            agent_id: 'AGENT-NG-033',
            created_at_epoch_ms: now - 7200000,
            eudr_compliant: true,
          },
        ],
        practices: [
          {
            client_uuid: `p-benue-${Math.floor(1000 + Math.random() * 9000)}`,
            farmer_client_uuid: '',
            farmer_code: '',
            practice_type: '⚠️ Unregistered chemical spray',
            product_name: 'Unregistered Organophosphate Spray 50',
            active_ingredient: 'Chlorpyrifos (Restricted EU ban)',
            dosage: '1000 ml/ha',
            quantity_used: 8500.0,
            quantity_unit: 'ml',
            date_applied_epoch_ms: now - 86400000,
            pre_harvest_interval_days: 30,
            nafdac_reg_no: 'BANNED-EU-MRL',
            nafdac_approved: false,
            gps_coordinates: '7.742°N, 8.531°E',
            risk_level: 'FLAGGED_HIGH_RISK',
            agent_id: 'AGENT-NG-033',
          },
        ],
      },
    },
  };

  const currentPayload = sampleScenarios[activeScenario]?.payload;

  const handleSendSync = async () => {
    if (!currentPayload) return;

    // Link farmer client uuid if empty
    const payloadCopy = JSON.parse(JSON.stringify(currentPayload)) as AgentBatchSyncRequest;
    if (payloadCopy.farmers[0] && payloadCopy.practices[0]) {
      payloadCopy.practices[0].farmer_client_uuid = payloadCopy.farmers[0].client_uuid;
    }

    const res = await processUpstreamSync(payloadCopy);
    setResponseResult(res);
  };

  const handleCopyResponse = () => {
    if (!responseResult) return;
    navigator.clipboard.writeText(JSON.stringify(responseResult, null, 2));
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 max-h-[92vh] overflow-y-auto space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Android Mobile Field Sync Simulator</h3>
              <p className="text-xs text-slate-400">
                Simulate rural Android enumerator synchronization to <code className="text-emerald-400 font-mono">POST /api/v1/sync/upstream</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenario Selector Pills */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Select Field Simulation Scenario:</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {Object.entries(sampleScenarios).map(([key, item]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveScenario(key);
                  setResponseResult(null);
                }}
                className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  activeScenario === key
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200">{item.title}</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* JSON Request & Response Split View */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Request Payload View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-400" /> Request Payload (AgentBatchSyncRequest):
              </span>
              <span className="text-[10px] text-slate-500">application/json</span>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed select-all">
              {JSON.stringify(currentPayload, null, 2)}
            </pre>
          </div>

          {/* Response Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" /> Response (AgentBatchSyncResponse):
              </span>
              {responseResult && (
                <button
                  onClick={handleCopyResponse}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white cursor-pointer"
                >
                  {copiedResponse ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedResponse ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-teal-300 font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed">
              {responseResult
                ? JSON.stringify(responseResult, null, 2)
                : '// Click "Send Upstream Batch Sync" below to execute the request.'}
            </pre>
          </div>
        </div>

        {/* Idempotency & Protocol Explanation Banner */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">Client UUID Idempotency Guarantee:</strong> When rural Android agents experience flaky 2G/EDGE network drops during sync retries, the server checks <code className="text-emerald-400 font-mono">client_uuid</code>. Existing records are never duplicated, and previously assigned official IDs are securely returned.
          </p>
        </div>

        {/* Actions Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={handleSendSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950 transition cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSyncing ? 'Transmitting Batch...' : 'Send Upstream Batch Sync'}
          </button>
        </div>
      </div>
    </div>
  );
};
