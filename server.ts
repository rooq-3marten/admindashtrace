import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const app = express();

// Parse port from env or args (--port 3000 or --port=3000)
let parsedPort = 3000;
const portArgIndex = process.argv.indexOf('--port');
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  parsedPort = parseInt(process.argv[portArgIndex + 1], 10);
} else {
  const eqArg = process.argv.find((a) => a.startsWith('--port='));
  if (eqArg) {
    parsedPort = parseInt(eqArg.split('=')[1], 10);
  } else if (process.env.PORT) {
    parsedPort = parseInt(process.env.PORT, 10);
  }
}

const PORT = isNaN(parsedPort) ? 3000 : parsedPort;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, User-Agent');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-Memory Database Store with file persistence
const DATA_FILE = path.join(process.cwd(), 'data_store.json');

interface StoredData {
  farmers: Record<string, any>;
  practices: any[];
  batches: any[];
  syncLogs: any[];
  agents: Record<string, any>;
}

let db: StoredData = {
  farmers: {},
  practices: [],
  batches: [],
  syncLogs: [],
  agents: {},
};

const BANNED_CHEMICALS = [
  { name: 'Chlorpyrifos', reason: 'EU Regulation 2020/1085 - Complete Ban & 0.01 mg/kg MRL', category: 'Organophosphate' },
  { name: 'Dichlorvos (DDVP / Sniper)', reason: 'NAFDAC Ban on Small-Pack & Grain Storage Application', category: 'Organophosphate' },
  { name: 'Endosulfan', reason: 'Stockholm Convention on Persistent Organic Pollutants', category: 'Organochlorine' },
  { name: 'Paraquat Dichloride', reason: 'NAFDAC Phase-Out Directive & High Mammalian Toxicity', category: 'Bipyridinium' },
  { name: 'Monocrotophos', reason: 'Rotterdam Convention & Global Export Proscription', category: 'Organophosphate' },
  { name: 'Carbofuran (Furadan)', reason: 'Severe Soil & Water Contamination Hazard', category: 'Carbamate' },
];

const NAFDAC_APPROVED_PRODUCTS = [
  {
    product_name: 'Karate 5 EC',
    active_ingredient: 'Lambda-cyhalothrin (50 g/L EC)',
    nafdac_reg_no: '04-2015',
    target_crops: ['Sesame', 'Soybeans', 'Maize', 'Vegetables'],
    standard_dosage: '400 ml/ha',
    pre_harvest_interval_days: 14,
    hazard_class: 'Class II (Moderately Hazardous)',
    manufacturer: 'Syngenta Nigeria',
  },
  {
    product_name: 'Belt Expert',
    active_ingredient: 'Flubendiamide (240g/L) + Thiacloprid (240g/L)',
    nafdac_reg_no: '04-6320',
    target_crops: ['Soybeans', 'Sesame', 'Pulses'],
    standard_dosage: '250 ml/ha',
    pre_harvest_interval_days: 10,
    hazard_class: 'Class III (Slightly Hazardous)',
    manufacturer: 'Bayer CropScience',
  },
  {
    product_name: 'Apron Star 42 WS',
    active_ingredient: 'Thiamethoxam + Difenoconazole + Mefenoxam',
    nafdac_reg_no: '04-1082',
    target_crops: ['Sesame', 'Soybeans', 'Sorghum', 'Maize'],
    standard_dosage: '10g / 4kg seed',
    pre_harvest_interval_days: 0,
    hazard_class: 'Class III (Seed Dressing)',
    manufacturer: 'Syngenta Nigeria',
  },
  {
    product_name: 'Ridomil Gold MZ 68 WG',
    active_ingredient: 'Mefenoxam (40g/kg) + Mancozeb (640g/kg)',
    nafdac_reg_no: '04-0992',
    target_crops: ['Ginger', 'Cocoa', 'Vegetables'],
    standard_dosage: '2.5 kg/ha',
    pre_harvest_interval_days: 21,
    hazard_class: 'Class III (Fungicide)',
    manufacturer: 'Syngenta Nigeria',
  },
  {
    product_name: 'Amistar Top',
    active_ingredient: 'Azoxystrobin (200 g/L) + Difenoconazole (125 g/L)',
    nafdac_reg_no: '04-7811',
    target_crops: ['Sesame', 'Soybeans', 'Ginger'],
    standard_dosage: '500 ml/ha',
    pre_harvest_interval_days: 14,
    hazard_class: 'Class III (Broad Spectrum Fungicide)',
    manufacturer: 'Syngenta Nigeria',
  },
  {
    product_name: 'Force 1.5 G',
    active_ingredient: 'Tefluthrin (15 g/kg)',
    nafdac_reg_no: '04-3319',
    target_crops: ['Sesame', 'Maize', 'Groundnuts'],
    standard_dosage: '10 kg/ha',
    pre_harvest_interval_days: 30,
    hazard_class: 'Class II (Soil Insecticide)',
    manufacturer: 'Syngenta Nigeria',
  },
];

const BASELINE_AGENTS = [
  {
    agent_id: 'AGENT-NG-042',
    name: 'Haruna Abdullahi',
    phone: '+234 802 319 8812',
    assigned_state: 'Kano',
    assigned_lga: 'Dambatta',
    active_status: 'online',
    last_sync_epoch_ms: Date.now() - 12 * 60 * 1000,
    battery_level: 84,
    total_farmers_enrolled: 48,
    total_practices_logged: 112,
  },
  {
    agent_id: 'AGENT-NG-018',
    name: 'Zainab Mohammed Bello',
    phone: '+234 803 774 2109',
    assigned_state: 'Jigawa',
    assigned_lga: 'Dutse',
    active_status: 'online',
    last_sync_epoch_ms: Date.now() - 34 * 60 * 1000,
    battery_level: 71,
    total_farmers_enrolled: 35,
    total_practices_logged: 89,
  },
  {
    agent_id: 'AGENT-NG-091',
    name: 'Emeka Chukwuemeka',
    phone: '+234 814 552 9011',
    assigned_state: 'Kaduna',
    assigned_lga: 'Zaria',
    active_status: 'syncing',
    last_sync_epoch_ms: Date.now() - 4 * 60 * 1000,
    battery_level: 92,
    total_farmers_enrolled: 52,
    total_practices_logged: 130,
  },
  {
    agent_id: 'AGENT-NG-033',
    name: 'Tersoo Isaac Aondo',
    phone: '+234 809 113 4567',
    assigned_state: 'Benue',
    assigned_lga: 'Gboko',
    active_status: 'offline',
    last_sync_epoch_ms: Date.now() - 3 * 3600 * 1000,
    battery_level: 45,
    total_farmers_enrolled: 29,
    total_practices_logged: 64,
  },
];

const BASELINE_FARMERS = [
  {
    client_uuid: '550e8400-e29b-41d4-a716-446655440000',
    official_farmer_id: 'TH-KAN-2026-1048',
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
    created_at_epoch_ms: Date.now() - 14 * 86400000,
    server_received_at: Date.now() - 14 * 86400000,
  },
  {
    client_uuid: '661f9511-f30c-42e5-b827-557766551111',
    official_farmer_id: 'TH-KAN-2026-4821',
    full_name: 'Amina Sani Kura',
    phone_number: '+2348028834412',
    state: 'Kano',
    lga: 'Kura',
    community: 'Dan Hassan',
    crop: 'Soybeans',
    farm_size_hectares: 6.2,
    latitude: 11.7725,
    longitude: 8.4231,
    gps_polygon: '11.7750,8.4200;11.7750,8.4260;11.7700,8.4260;11.7700,8.4200',
    cooperative_name: 'Kura Valley Agro-Allied Cluster',
    agent_id: 'AGENT-NG-042',
    created_at_epoch_ms: Date.now() - 12 * 86400000,
    server_received_at: Date.now() - 12 * 86400000,
  },
  {
    client_uuid: '772a0622-a41d-43f6-c938-668877662222',
    official_farmer_id: 'TH-JIG-2026-9014',
    full_name: 'Babangida Usman Dutse',
    phone_number: '+2348149921104',
    state: 'Jigawa',
    lga: 'Dutse',
    community: 'Kudai',
    crop: 'Sesame',
    farm_size_hectares: 8.0,
    latitude: 11.7594,
    longitude: 9.3389,
    gps_polygon: '11.7630,9.3350;11.7630,9.3420;11.7560,9.3420;11.7560,9.3350',
    cooperative_name: 'Jigawa Export Commodity Cooperative',
    agent_id: 'AGENT-NG-018',
    created_at_epoch_ms: Date.now() - 10 * 86400000,
    server_received_at: Date.now() - 10 * 86400000,
  },
  {
    client_uuid: '994c2844-c63f-45b8-eb50-880099884444',
    official_farmer_id: 'TH-KAD-2026-3392',
    full_name: 'Yakubu Danladi Zaria',
    phone_number: '+2348031127763',
    state: 'Kaduna',
    lga: 'Zaria',
    community: 'Samaru',
    crop: 'Ginger',
    farm_size_hectares: 5.4,
    latitude: 11.0855,
    longitude: 7.7199,
    gps_polygon: '11.0880,7.7160;11.0880,7.7230;11.0830,7.7230;11.0830,7.7160',
    cooperative_name: 'Kaduna Ginger Export Syndicate',
    agent_id: 'AGENT-NG-091',
    created_at_epoch_ms: Date.now() - 6 * 86400000,
    server_received_at: Date.now() - 6 * 86400000,
  },
  {
    client_uuid: 'aa5d3955-d74a-46c9-fc61-991100995555',
    official_farmer_id: 'TH-BEN-2026-7840',
    full_name: 'Moses Terver Gboko',
    phone_number: '+2348164402288',
    state: 'Benue',
    lga: 'Gboko',
    community: 'Yandev',
    crop: 'Soybeans',
    farm_size_hectares: 7.1,
    latitude: 7.3195,
    longitude: 8.9984,
    gps_polygon: '7.3220,8.9950;7.3220,9.0020;7.3170,9.0020;7.3170,8.9950',
    cooperative_name: 'Benue Grain & Legume Producers',
    agent_id: 'AGENT-NG-033',
    created_at_epoch_ms: Date.now() - 5 * 86400000,
    server_received_at: Date.now() - 5 * 86400000,
  },
];

const BASELINE_PRACTICES = [
  {
    client_uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    farmer_client_uuid: '550e8400-e29b-41d4-a716-446655440000',
    farmer_code: 'TH-KAN-2026-1048',
    practice_type: '🧪 Pesticide application',
    product_name: 'Karate 5 EC',
    active_ingredient: 'Lambda-cyhalothrin (50 g/L EC)',
    dosage: '400 ml/ha',
    quantity_used: 1800.0,
    quantity_unit: 'ml',
    date_applied_epoch_ms: Date.now() - 16 * 86400000,
    pre_harvest_interval_days: 14,
    nafdac_reg_no: '04-2015',
    nafdac_approved: true,
    gps_coordinates: '12.4382°N, 8.5147°E',
    risk_level: 'COMPLIANT',
    phi_cleared: true,
    safe_harvest_date_ms: Date.now() - 2 * 86400000,
    agent_id: 'AGENT-NG-042',
    server_received_at: Date.now() - 14 * 86400000,
  },
  {
    client_uuid: '8d0f778a-8536-41ef-a55c-f18fd20a1bf8',
    farmer_client_uuid: '661f9511-f30c-42e5-b827-557766551111',
    farmer_code: 'TH-KAN-2026-4821',
    practice_type: '🧪 Insecticide spraying',
    product_name: 'Belt Expert',
    active_ingredient: 'Flubendiamide (240g/L) + Thiacloprid (240g/L)',
    dosage: '250 ml/ha',
    quantity_used: 1550.0,
    quantity_unit: 'ml',
    date_applied_epoch_ms: Date.now() - 4 * 86400000,
    pre_harvest_interval_days: 10,
    nafdac_reg_no: '04-6320',
    nafdac_approved: true,
    gps_coordinates: '11.7725°N, 8.4231°E',
    risk_level: 'COMPLIANT',
    phi_cleared: false,
    safe_harvest_date_ms: Date.now() + 6 * 86400000,
    agent_id: 'AGENT-NG-042',
    server_received_at: Date.now() - 4 * 86400000,
  },
];

if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    db = JSON.parse(raw);
    console.log(`[Storage] Loaded existing data: ${Object.keys(db.farmers).length} farmers, ${db.practices.length} practices.`);
  } catch (e: any) {
    console.error('[Storage] Error loading data file:', e.message);
  }
}

// Seed baseline if store is empty
if (Object.keys(db.farmers).length === 0) {
  BASELINE_FARMERS.forEach((f) => {
    db.farmers[f.client_uuid] = f;
  });
  db.practices = [...BASELINE_PRACTICES];
}

if (!db.agents || Object.keys(db.agents).length === 0) {
  db.agents = {};
  BASELINE_AGENTS.forEach((a) => {
    db.agents[a.agent_id] = { ...a };
  });
}
persistData();

function persistData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e: any) {
    console.error('[Storage] Failed to persist data:', e.message);
  }
}

// ==============================================================
// 1. Upstream Sync Ingestion Endpoint (Called by Android App)
// ==============================================================
app.post('/api/v1/sync/upstream', (req: Request, res: Response) => {
  const { agent_id, device_timestamp_ms, farmers = [], practices = [] } = req.body;

  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id is required' });
  }

  const assignedFarmerIds: Record<string, string> = {};
  const serverTimestamp = Date.now();

  // 1. Process Farmers (Idempotent by client_uuid)
  for (const farmer of farmers) {
    const clientUuid = farmer.client_uuid;
    if (!clientUuid) continue;

    if (db.farmers[clientUuid]) {
      // Already exists -> return existing assigned ID
      assignedFarmerIds[clientUuid] = db.farmers[clientUuid].official_farmer_id;
    } else {
      // Generate new official Farmer ID: TH-{STATE}-2026-{RANDOM}
      const stateStr = (farmer.state || 'NGR').trim();
      const stateCode = stateStr.length >= 3 ? stateStr.substring(0, 3).toUpperCase() : 'NGR';
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const officialId = `TH-${stateCode}-2026-${randomCode}`;

      db.farmers[clientUuid] = {
        ...farmer,
        official_farmer_id: officialId,
        server_received_at: serverTimestamp,
      };
      assignedFarmerIds[clientUuid] = officialId;
    }
  }

  // 2. Process Practice Logs (Idempotent by client_uuid)
  for (const practice of practices) {
    const clientUuid = practice.client_uuid;
    if (!clientUuid) continue;

    const exists = db.practices.some((p: any) => p.client_uuid === clientUuid);
    if (!exists) {
      // Evaluate Pre-Harvest Interval (PHI) clearance
      const appliedMs = practice.date_applied_epoch_ms || serverTimestamp;
      const phiDays = practice.pre_harvest_interval_days || 0;
      const safeHarvestMs = appliedMs + phiDays * 86400000;
      const isPhiCleared = serverTimestamp >= safeHarvestMs;

      // Cross-check against banned chemical substances
      const isBanned = BANNED_CHEMICALS.some((bc) =>
        (practice.active_ingredient && practice.active_ingredient.toLowerCase().includes(bc.name.toLowerCase())) ||
        (practice.product_name && practice.product_name.toLowerCase().includes(bc.name.toLowerCase()))
      );

      const computedRiskLevel = isBanned ? 'FLAGGED_HIGH_RISK' : (practice.risk_level || 'COMPLIANT');
      const isNafdacApproved = isBanned ? false : (practice.nafdac_approved ?? true);

      db.practices.push({
        ...practice,
        farmer_code: assignedFarmerIds[practice.farmer_client_uuid] || practice.farmer_code || 'TH-UNKNOWN',
        risk_level: computedRiskLevel,
        nafdac_approved: isNafdacApproved,
        phi_cleared: isPhiCleared,
        safe_harvest_date_ms: safeHarvestMs,
        server_received_at: serverTimestamp,
      });
    }
  }

  // Update Agent telemetry and counters
  if (!db.agents) db.agents = {};
  if (db.agents[agent_id]) {
    db.agents[agent_id].total_farmers_enrolled = (db.agents[agent_id].total_farmers_enrolled || 0) + farmers.length;
    db.agents[agent_id].total_practices_logged = (db.agents[agent_id].total_practices_logged || 0) + practices.length;
    db.agents[agent_id].last_sync_epoch_ms = serverTimestamp;
    db.agents[agent_id].active_status = 'online';
  } else {
    db.agents[agent_id] = {
      agent_id,
      name: `Agent ${agent_id}`,
      assigned_state: farmers[0]?.state || 'Kano',
      assigned_lga: farmers[0]?.lga || 'Dambatta',
      battery_level: 95,
      active_status: 'online',
      last_sync_epoch_ms: serverTimestamp,
      total_farmers_enrolled: farmers.length,
      total_practices_logged: practices.length,
    };
  }

  // 3. Log Sync Event
  db.syncLogs.unshift({
    id: `sync-${serverTimestamp}`,
    agent_id,
    device_timestamp_ms: device_timestamp_ms || serverTimestamp,
    server_timestamp_ms: serverTimestamp,
    farmers_count: farmers.length,
    practices_count: practices.length,
    status: 'COMPLETED',
  });

  if (db.syncLogs.length > 50) db.syncLogs.pop();

  persistData();

  console.log(`[Sync] Agent ${agent_id} uploaded ${farmers.length} farmers and ${practices.length} practices.`);

  // Return standard AgentBatchSyncResponse
  res.json({
    status: 'synced',
    synced_farmers_count: farmers.length,
    synced_practices_count: practices.length,
    assigned_farmer_ids: assignedFarmerIds,
    server_timestamp_ms: serverTimestamp,
    message: `Batch processed with client_uuid idempotency (${farmers.length} farmers, ${practices.length} practices)`,
  });
});

// ==============================================================
// 1b. Downstream Sync Endpoint (Pulled by Android App for offline cache)
// ==============================================================
app.get('/api/v1/sync/downstream', (req: Request, res: Response) => {
  const { agent_id, since_epoch_ms } = req.query as { agent_id?: string; since_epoch_ms?: string };
  const sinceMs = since_epoch_ms ? parseInt(since_epoch_ms, 10) : 0;

  let farmersList = Object.values(db.farmers);
  if (sinceMs > 0) {
    farmersList = farmersList.filter((f: any) => (f.server_received_at || f.created_at_epoch_ms || 0) > sinceMs);
  }

  const cooperatives = Array.from(
    new Set(Object.values(db.farmers).map((f: any) => f.cooperative_name).filter(Boolean))
  );

  res.json({
    status: 'success',
    server_timestamp_ms: Date.now(),
    agent_id: agent_id || 'ALL',
    delta_sync: sinceMs > 0,
    farmers_count: farmersList.length,
    farmers: farmersList,
    nafdac_approved_products: NAFDAC_APPROVED_PRODUCTS,
    banned_chemicals: BANNED_CHEMICALS,
    cooperatives,
    open_export_batches: db.batches.filter((b: any) => b.export_clearance_status !== 'FLAGGED_QUARANTINE'),
    eudr_regulations: {
      deforestation_cutoff_date: '2020-12-31',
      polygon_required_hectare_threshold: 4.0,
      supported_commodities: ['Sesame', 'Soybeans', 'Cocoa', 'Coffee', 'Oil Palm', 'Rubber', 'Cattle', 'Wood'],
      geolocation_format: 'WGS84 lat,long',
    },
  });
});

// Sync Status & Heartbeat
app.get('/api/v1/sync/status', (req: Request, res: Response) => {
  const farmersList = Object.values(db.farmers);
  const lastSync = db.syncLogs[0] || null;

  res.json({
    status: 'ONLINE',
    mode: 'BIDIRECTIONAL_REALTIME',
    server_timestamp_ms: Date.now(),
    last_sync_timestamp_ms: lastSync ? lastSync.server_timestamp_ms : Date.now(),
    counts: {
      farmers: farmersList.length,
      practices: db.practices.length,
      batches: db.batches.length,
      agents: Object.keys(db.agents || {}).length,
      sync_logs: db.syncLogs.length,
    },
    latest_event: lastSync,
  });
});

app.get('/api/v1/sync/ping', (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'TraceHarvest Mobile Upstream Ingestion Gateway',
    server_time: new Date().toISOString(),
    timestamp_ms: Date.now(),
  });
});

// Mobile App Configuration Payload (for QR code pairing)
app.get('/api/v1/mobile/config', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  res.json({
    app_name: 'TraceHarvest Field Agent',
    api_version: '1.0.0',
    gateway_url: baseUrl,
    endpoints: {
      upstream_sync: `${baseUrl}/api/v1/sync/upstream`,
      downstream_sync: `${baseUrl}/api/v1/sync/downstream`,
      status_ping: `${baseUrl}/api/v1/sync/ping`,
      heartbeat: `${baseUrl}/api/v1/mobile/agents/heartbeat`,
    },
    supported_crops: ['Sesame', 'Soybeans', 'Ginger', 'Cocoa', 'Cashew', 'Hibiscus'],
    supported_states: ['Kano', 'Jigawa', 'Kaduna', 'Benue', 'Oyo', 'Cross River', 'Taraba', 'Plateau'],
    offline_max_queue_size: 5000,
    heartbeat_interval_sec: 180,
  });
});

// Mobile Agent Heartbeat
app.post('/api/v1/mobile/agents/heartbeat', (req: Request, res: Response) => {
  const { agent_id, battery_level, active_status } = req.body;
  if (!agent_id) return res.status(400).json({ error: 'agent_id required' });

  if (!db.agents) db.agents = {};
  if (!db.agents[agent_id]) {
    db.agents[agent_id] = {
      agent_id,
      name: `Agent ${agent_id}`,
      assigned_state: 'Kano',
      assigned_lga: 'Dambatta',
      battery_level: battery_level ?? 80,
      active_status: active_status ?? 'online',
      last_sync_epoch_ms: Date.now(),
      total_farmers_enrolled: 0,
      total_practices_logged: 0,
    };
  } else {
    if (battery_level !== undefined) db.agents[agent_id].battery_level = battery_level;
    if (active_status !== undefined) db.agents[agent_id].active_status = active_status;
    db.agents[agent_id].last_sync_epoch_ms = Date.now();
  }

  persistData();
  res.json({ success: true, agent: db.agents[agent_id] });
});

// Agent Fleet Roster
app.get('/api/v1/admin/agents', (req: Request, res: Response) => {
  res.json(Object.values(db.agents || {}));
});

// Offline pre-seed download for Android devices
app.get('/api/v1/mobile/download/offline-seed.json', (req: Request, res: Response) => {
  const seed = {
    generated_at_ms: Date.now(),
    schema_version: 1,
    farmers: Object.values(db.farmers),
    practices: db.practices,
    nafdac_approved_products: NAFDAC_APPROVED_PRODUCTS,
    banned_chemicals: BANNED_CHEMICALS,
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="traceharvest_offline_seed.json"');
  res.send(JSON.stringify(seed, null, 2));
});

// ==============================================================
// 2. Admin Web Dashboard Endpoints
// ==============================================================

app.get('/api/v1/admin/stats', (req: Request, res: Response) => {
  const farmersList = Object.values(db.farmers);
  const totalHectares = farmersList.reduce((acc, f: any) => acc + (parseFloat(f.farm_size_hectares) || 0), 0);
  const nonCompliantPractices = db.practices.filter(
    (p: any) => !p.nafdac_approved || p.risk_level === 'FLAGGED_HIGH_RISK'
  ).length;
  const activePhiHoldCount = db.practices.filter((p: any) => !p.phi_cleared).length;

  res.json({
    total_farmers: farmersList.length,
    total_hectares: Math.round(totalHectares * 10) / 10,
    total_practices: db.practices.length,
    non_compliant_practices: nonCompliantPractices,
    active_phi_holds: activePhiHoldCount,
    total_batches: db.batches.length,
    last_sync_log: db.syncLogs[0] || null,
  });
});

app.get('/api/v1/admin/farmers', (req: Request, res: Response) => {
  const { state, crop, search } = req.query as { state?: string; crop?: string; search?: string };
  let result = Object.values(db.farmers);

  if (state && state !== 'ALL') {
    result = result.filter((f: any) => f.state?.toLowerCase() === state.toLowerCase());
  }
  if (crop && crop !== 'ALL') {
    result = result.filter((f: any) => f.crop?.toLowerCase() === crop.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (f: any) =>
        f.full_name?.toLowerCase().includes(q) ||
        f.official_farmer_id?.toLowerCase().includes(q) ||
        f.phone_number?.includes(q)
    );
  }

  res.json(result);
});

app.get('/api/v1/admin/practices', (req: Request, res: Response) => {
  res.json(db.practices);
});

app.get('/api/v1/admin/batches', (req: Request, res: Response) => {
  res.json(db.batches);
});

app.post('/api/v1/admin/batches/create', (req: Request, res: Response) => {
  const { crop, destination, farmer_client_uuids = [], estimated_tonnage = 20.0 } = req.body;
  const batchNumber = `EXP-TH-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const newBatch = {
    id: db.batches.length + 1,
    batch_number: batchNumber,
    crop: crop || 'Sesame',
    destination: destination || 'Rotterdam, Netherlands (EU)',
    farmer_count: farmer_client_uuids.length,
    estimated_tonnage: parseFloat(estimated_tonnage) || 20.0,
    created_at_ms: Date.now(),
    export_clearance_status: 'CERTIFIED_COMPLIANT',
    tamper_proof_sha256: crypto.createHash('sha256').update(batchNumber + Date.now()).digest('hex'),
  };

  db.batches.unshift(newBatch);
  persistData();
  res.json({ success: true, batch: newBatch });
});

// CSV Export for Regulatory Compliance
app.get('/api/v1/admin/export/csv', (req: Request, res: Response) => {
  const farmersList = Object.values(db.farmers);
  let csv = 'Official Farmer ID,Client UUID,Full Name,Phone,State,LGA,Community,Crop,Hectares,Latitude,Longitude,Agent ID\n';

  farmersList.forEach((f: any) => {
    csv += `"${f.official_farmer_id}","${f.client_uuid}","${f.full_name}","${f.phone_number}","${f.state}","${f.lga}","${f.community || ''}","${f.crop}","${f.farm_size_hectares}","${f.latitude}","${f.longitude}","${f.agent_id}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="traceharvest_farmers_registry.csv"');
  res.status(200).send(csv);
});

// ==============================================================
// 3. Mount Vite or Static Frontend
// ==============================================================
async function startServer() {
  const httpServer = http.createServer(app);

  const distPath = path.resolve(process.cwd(), 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${PORT} address in use. Retrying in 1.5s...`);
      setTimeout(() => {
        try {
          httpServer.close();
        } catch (_) {}
        httpServer.listen(PORT, '0.0.0.0');
      }, 1500);
    } else {
      console.error('[Server] Server listen error:', err);
    }
  });

  const onShutdown = () => {
    console.log('[Server] Closing server gracefully...');
    httpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 3000);
  };

  process.once('SIGTERM', onShutdown);
  process.once('SIGINT', onShutdown);

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🌾 TraceHarvest Central Admin Portal & Ingestion API`);
    console.log(`🚀 Server running on: http://0.0.0.0:${PORT}`);
    console.log(`📡 Upstream Sync Endpoint: http://0.0.0.0:${PORT}/api/v1/sync/upstream`);
    console.log(`📱 Connect your Android App in Sync Tab -> Configure`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
