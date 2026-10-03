import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import {
  BookOpen,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Code,
  Terminal,
  Server,
  Radio,
  FileCheck,
  Activity,
  ShieldCheck,
  RefreshCw,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export const MobileIntegrationGuide: React.FC = () => {
  const { connectionReport, isCheckingStrength, checkConnectionStrength } = useData();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!connectionReport) {
      checkConnectionStrength();
    }
  }, [connectionReport, checkConnectionStrength]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const curlExample = `curl -X POST "${currentHost}/api/v1/sync/upstream" \\
  -H "Content-Type: application/json" \\
  -H "User-Agent: TraceHarvest-Android/1.0" \\
  -d '{
    "agent_id": "AGENT-NG-042",
    "device_timestamp_ms": ${Date.now()},
    "farmers": [
      {
        "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
        "full_name": "Musa Ibrahim Dambatta",
        "phone_number": "+2348034512991",
        "state": "Kano",
        "lga": "Dambatta",
        "community": "Gwarabjawa",
        "crop": "Sesame",
        "farm_size_hectares": 4.5,
        "latitude": 12.4382,
        "longitude": 8.5147,
        "gps_polygon": "12.4374,8.5131;12.4374,8.5163;12.4342,8.5163;12.4342,8.5131",
        "cooperative_name": "Dambatta Sesame Growers Union",
        "agent_id": "AGENT-NG-042",
        "created_at_epoch_ms": ${Date.now() - 3600000}
      }
    ],
    "practices": [
      {
        "client_uuid": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "farmer_client_uuid": "550e8400-e29b-41d4-a716-446655440000",
        "farmer_code": "TH-KAN-2026-1048",
        "practice_type": "🧪 Pesticide application",
        "product_name": "Karate 5 EC",
        "active_ingredient": "Lambda-cyhalothrin (50 g/L EC)",
        "dosage": "400 ml",
        "quantity_used": 400.0,
        "quantity_unit": "ml",
        "date_applied_epoch_ms": ${Date.now() - 86400000 * 2},
        "pre_harvest_interval_days": 14,
        "nafdac_reg_no": "04-2015",
        "nafdac_approved": true,
        "gps_coordinates": "12.4382°N, 8.5147°E",
        "risk_level": "COMPLIANT",
        "agent_id": "AGENT-NG-042"
      }
    ],
    "documents": [
      {
        "id": "doc-field-${Date.now()}",
        "title": "Farmer National Identity (NIN) Field Photo Slip",
        "category": "FARMER_KYC_LAND",
        "entity_type": "FARMER",
        "entity_id": "550e8400-e29b-41d4-a716-446655440000",
        "file_name": "NIN_Slip_Musa_Dambatta.jpg",
        "file_size_bytes": 284100,
        "mime_type": "image/jpeg",
        "tamper_proof_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "regulatory_authority": "National Identity Management Commission (NIMC)",
        "certificate_number": "NIN-2026-90412",
        "issue_date": "2026-09-18",
        "verification_status": "PENDING_REVIEW",
        "uploaded_by": "AGENT-NG-042",
        "uploader_source": "mobile_agent"
      }
    ]
  }'`;

  const retrofitExample = `// Retrofit Interface for Android Field App
interface TraceHarvestSyncApi {
    @POST("api/v1/sync/upstream")
    suspend fun uploadBatch(
        @Body request: AgentBatchSyncRequest
    ): Response<AgentBatchSyncResponse>
}

// Room Database to API serialization
val syncPayload = AgentBatchSyncRequest(
    agentId = agentPreferences.getAgentId(),
    deviceTimestampMs = System.currentTimeMillis(),
    farmers = offlineDatabase.farmerDao().getUnsyncedFarmers(),
    practices = offlineDatabase.practiceDao().getUnsyncedPractices()
)`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
            Technical Specification v1.0
          </span>
          <span className="text-xs text-[#6B7280] dark:text-slate-400 font-mono">TraceHarvest Android Fleet Upstream Protocol</span>
        </div>
        <h2 className="text-2xl font-bold text-[#111827] dark:text-white tracking-tight">Android Mobile App Integration Guide</h2>
        <p className="text-sm text-[#6B7280] dark:text-slate-400 max-w-2xl mt-0.5">
          Step-by-step instructions to link the offline-first TraceHarvest Android field app with this Admin Web Portal.
        </p>
      </div>

      {/* Target URL Selector Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-[#111827] dark:text-white flex items-center gap-2">
          <Server className="w-5 h-5 text-[#1B7F4B] dark:text-emerald-400" />
          Choose Your Sync Endpoint URL
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-slate-400">
          Enter one of these URLs into the Android mobile app's <strong>Sync Tab → ADMIN WEBSITE CONNECTION → Configure</strong>:
        </p>

        <div className="overflow-x-auto rounded-xl border border-[#E5E7EB] dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-[#6B7280] dark:text-slate-400 font-mono uppercase text-[11px] border-b border-[#E5E7EB] dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Android Running Environment</th>
                <th className="py-3 px-4">Target Server URL</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-800 text-[#111827] dark:text-slate-300">
              <tr>
                <td className="py-3.5 px-4 font-semibold text-[#111827] dark:text-white">
                  Android Studio Emulator
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block font-normal">Runs on same PC</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[#1B7F4B] dark:text-emerald-400 font-bold">
                  http://10.0.2.2:3000/
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => copyToClipboard('http://10.0.2.2:3000/', 'emu')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#111827] dark:text-slate-200 text-xs font-mono transition cursor-pointer"
                  >
                    {copiedUrl === 'emu' ? 'Copied!' : 'Copy'}
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-[#111827] dark:text-white">
                  Physical Phone on Same Wi-Fi
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block font-normal">Connects via local LAN IPv4</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[#1B7F4B] dark:text-emerald-400 font-bold">
                  http://192.168.1.100:3000/
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => copyToClipboard('http://192.168.1.100:3000/', 'lan')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#111827] dark:text-slate-200 text-xs font-mono transition cursor-pointer"
                  >
                    {copiedUrl === 'lan' ? 'Copied!' : 'Copy'}
                  </button>
                </td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-semibold text-[#111827] dark:text-white">
                  Current Web Portal Host
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block font-normal">Cloud & Preview Host</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-[#1B7F4B] dark:text-emerald-400 font-bold truncate max-w-xs">
                  {currentHost}/
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => copyToClipboard(`${currentHost}/`, 'cloud')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#111827] dark:text-slate-200 text-xs font-mono transition cursor-pointer"
                  >
                    {copiedUrl === 'cloud' ? 'Copied!' : 'Copy'}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Live Verifiable Connection Strength Test Panel (Zero Hallucination) */}
        <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400" />
              <span className="font-bold text-xs uppercase tracking-wider text-[#111827] dark:text-white font-mono">
                Live Gateway & Mobile Link Strength Verifier
              </span>
            </div>
            <button
              onClick={async () => {
                await checkConnectionStrength();
              }}
              disabled={isCheckingStrength}
              className="px-3 py-1.5 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStrength ? 'animate-spin' : ''}`} />
              {isCheckingStrength ? 'Verifying...' : 'Perform Strength Check'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800">
              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block font-sans">LINK QUALITY</span>
              <p className="font-bold text-sm text-[#1B7F4B] dark:text-emerald-400">
                {connectionReport ? `${connectionReport.strength_score}% (${connectionReport.signal_level})` : (isCheckingStrength ? 'Probing Link...' : 'Not Tested')}
              </p>
              <span className="text-[10px] text-[#6B7280] dark:text-slate-500 font-sans">
                {connectionReport ? `${connectionReport.bars} of 4 Signal Bars` : 'Live RTT verification'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800">
              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block font-sans">HTTP RTT LATENCY</span>
              <p className="font-bold text-sm text-[#111827] dark:text-white">
                {connectionReport ? `${connectionReport.gateway.latency_ms} ms` : (isCheckingStrength ? 'Measuring...' : 'Awaiting Check')}
              </p>
              <span className={`text-[10px] font-sans ${connectionReport?.gateway.reachable ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                {connectionReport ? (connectionReport.gateway.reachable ? `Ping Status: ${connectionReport.gateway.http_status} OK` : 'Host Unreachable') : 'Endpoint: /api/v1/sync/ping'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800">
              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block font-sans">DOWNSTREAM CACHE</span>
              <p className="font-bold text-sm text-[#111827] dark:text-white">
                {connectionReport ? `${connectionReport.downstream_cache.record_count} Records` : (isCheckingStrength ? 'Fetching Catalog...' : 'Pending Query')}
              </p>
              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-sans">
                {connectionReport?.downstream_cache.reachable ? `${connectionReport.downstream_cache.latency_ms}ms round-trip` : 'Catalog /sync/downstream'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800">
              <span className="text-[10px] text-[#6B7280] dark:text-slate-400 block font-sans">MOBILE UPLINK</span>
              <p className="font-bold text-sm text-blue-600 dark:text-blue-400">
                {connectionReport ? (connectionReport.mobile_link.is_mobile_transmitting ? 'Actively Transmitting' : 'Awaiting Mobile Device') : (isCheckingStrength ? 'Checking Fleet...' : 'Standby')}
              </p>
              <span className="text-[10px] text-[#6B7280] dark:text-slate-500 font-sans">
                {connectionReport ? `${connectionReport.mobile_link.active_mobile_devices} Device(s) in last 15m` : '0 Active Devices in 15m'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#6B7280] dark:text-slate-400 font-sans">
            <strong>Factual Connection Verdict:</strong> {connectionReport?.verdict || (isCheckingStrength ? 'Probing gateway server and testing downstream/upstream sync channels...' : 'Click "Perform Strength Check" to verify link latency, cryptographic integrity, and mobile uplink telemetry.')}
          </p>
        </div>
      </div>

      {/* 4 Steps Walkthrough */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-600/30 text-[#1B7F4B] dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-xs">
              1
            </span>
            <h4 className="font-bold text-[#111827] dark:text-white text-sm">Launch Android Mobile App</h4>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed">
            Open the TraceHarvest field agent app on your physical device or emulator. Navigate to the <strong>Sync Tab</strong> at the bottom of the screen.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-600/30 text-[#1B7F4B] dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-xs">
              2
            </span>
            <h4 className="font-bold text-[#111827] dark:text-white text-sm">Configure Admin Website Target</h4>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed">
            Locate the <strong>ADMIN WEBSITE CONNECTION</strong> card, tap <strong>Configure</strong>, paste your server URL, and tap <strong>Save Endpoint</strong>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-600/30 text-[#1B7F4B] dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-xs">
              3
            </span>
            <h4 className="font-bold text-[#111827] dark:text-white text-sm">Record Smallholder in Offline Field</h4>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed">
            Go to <strong>Enroll Tab</strong>, log a new smallholder with GPS plot boundary polygon, and record a pesticide application in the <strong>Practices Tab</strong>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-600/30 text-[#1B7F4B] dark:text-emerald-400 font-mono font-bold flex items-center justify-center text-xs">
              4
            </span>
            <h4 className="font-bold text-[#111827] dark:text-white text-sm">Execute Live Synchronization</h4>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-slate-400 leading-relaxed">
            Tap <strong>Sync Now</strong>. The server processes records idempotently with <code className="text-[#1B7F4B] dark:text-emerald-400 font-mono">client_uuid</code>, generates official IDs (<code className="text-[#1B7F4B] dark:text-emerald-400 font-mono">TH-KAN-2026-XXXX</code>), and renders plots on the GIS map.
          </p>
        </div>
      </div>

      {/* Curl and Retrofit Code Snippets */}
      <div className="space-y-4">
        {/* Curl */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#111827] dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400" />
              Direct HTTP Ingestion Test via cURL
            </span>
            <button
              onClick={() => copyToClipboard(curlExample, 'curl')}
              className="flex items-center gap-1 text-[11px] text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white cursor-pointer"
            >
              {copiedUrl === 'curl' ? <Check className="w-3.5 h-3.5 text-[#1B7F4B] dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl === 'curl' ? 'Copied' : 'Copy cURL Command'}</span>
            </button>
          </div>
          <pre className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto select-all">
            {curlExample}
          </pre>
        </div>

        {/* Retrofit */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs space-y-2">
          <span className="text-xs font-mono font-bold text-[#111827] dark:text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Android Kotlin (Retrofit2 / Room Integration: Upstream & Downstream)
          </span>
          <pre className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 font-mono text-[11px] text-teal-300 overflow-x-auto select-all">
{`// TraceHarvest Mobile Sync Retrofit Service
interface TraceHarvestSyncApi {
    // 1. Upstream: Upload offline smallholders, spray practices & documents
    @POST("api/v1/sync/upstream")
    suspend fun uploadBatch(
        @Body request: AgentBatchSyncRequest
    ): Response<AgentBatchSyncResponse>

    // 2. Direct Document & Certificate Upload (Multipart / Form-data)
    @Multipart
    @POST("api/v1/documents/upload")
    suspend fun uploadRegulatoryDocument(
        @Part("title") title: RequestBody,
        @Part("category") category: RequestBody,
        @Part("entity_type") entityType: RequestBody,
        @Part("entity_id") entityId: RequestBody,
        @Part file: MultipartBody.Part
    ): Response<DocumentUploadResponse>

    // 3. Downstream: Download approved chemicals, verified regulatory documents & assigned farmers
    @GET("api/v1/sync/downstream")
    suspend fun fetchDownstreamCatalog(
        @Query("agent_id") agentId: String,
        @Query("since_epoch_ms") sinceMs: Long = 0
    ): Response<DownstreamSyncResponse>

    // 4. Heartbeat & Ping
    @GET("api/v1/sync/ping")
    suspend fun pingGateway(): Response<PingResponse>

    // 5. Remote telemetry & battery reporting
    @POST("api/v1/mobile/agents/heartbeat")
    suspend fun reportHeartbeat(
        @Body heartbeat: AgentHeartbeat
    ): Response<HeartbeatResponse>
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
