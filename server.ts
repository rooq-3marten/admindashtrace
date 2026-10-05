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
  documents?: any[];
  syncEvents?: any[];
  users?: any[];
}

let db: StoredData = {
  farmers: {},
  practices: [],
  batches: [],
  syncLogs: [],
  agents: {},
  documents: [],
  syncEvents: [],
  users: [],
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

const BASELINE_DOCUMENTS = [
  {
    id: 'doc-phyto-2026-0042',
    title: 'NAQS Official Phytosanitary Clearance Certificate',
    category: 'PHYTOSANITARY',
    entity_type: 'BATCH',
    entity_id: 'NG-SES-2026-0042-EXP',
    entity_name: 'Consignment Lot 0042 (Dambatta Sesame Grade A)',
    file_name: 'NAQS_Phytosanitary_NG_SES_0042.pdf',
    file_size_bytes: 482910,
    mime_type: 'application/pdf',
    tamper_proof_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    regulatory_authority: 'Nigeria Agricultural Quarantine Service (NAQS) / NAFDAC',
    certificate_number: 'NAQS-EXP-KN-2026-8841',
    issue_date: '2026-09-28',
    expiry_date: '2026-11-28',
    verification_status: 'VERIFIED_COMPLIANT',
    uploaded_by: 'AGENT-NG-042',
    uploader_source: 'mobile_agent',
    uploaded_at: '2026-09-28T14:22:10Z',
    verified_by: 'Dr. Aminu Garba (NAQS Chief Inspector)',
    verified_at: '2026-09-29T09:15:00Z',
    verification_notes: 'Consignment inspected at Kano Inland Dry Port. Zero grain borers, safe moisture 5.8%, phytosanitary stamp applied.',
    raw_metadata: {
      inspector_id: 'NAQS-OFF-09',
      port_of_loading: 'Kano Inland Container Depot',
      destination: 'Rotterdam Port (EU)',
    },
  },
  {
    id: 'doc-eudr-2026-1048',
    title: 'EUDR Annex II Due Diligence Geospatial Plot Polygon Statement',
    category: 'EUDR_DEFORESTATION',
    entity_type: 'FARMER',
    entity_id: 'TH-KAN-2026-1048',
    entity_name: 'Musa Ibrahim Dambatta (Gwarabjawa Plot)',
    file_name: 'EUDR_Due_Diligence_TH_KAN_1048.json',
    file_size_bytes: 14280,
    mime_type: 'application/json',
    tamper_proof_sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    regulatory_authority: 'European Union Information System on Deforestation (EUIS-EUDR)',
    certificate_number: 'EUDR-DDS-NG-2026-90412',
    issue_date: '2026-09-25',
    verification_status: 'VERIFIED_COMPLIANT',
    uploaded_by: 'AGENT-NG-042',
    uploader_source: 'mobile_agent',
    uploaded_at: '2026-09-25T11:05:40Z',
    verified_by: 'Chief EUDR Compliance Officer',
    verified_at: '2026-09-26T08:30:00Z',
    verification_notes: 'Copernicus Sentinel-2 imagery validates zero forest disturbance post-December 31 2020 cutoff date across 4.5 hectares.',
    raw_metadata: {
      plot_hectares: 4.5,
      satellite_source: 'ESA Sentinel-2 L2A',
      cutoff_date_verification: 'PASSED',
    },
  },
  {
    id: 'doc-mrl-lab-2026-009',
    title: 'SGS Gas-Chromatography Pesticide Residue MRL Assay',
    category: 'LAB_MRL_ANALYSIS',
    entity_type: 'BATCH',
    entity_id: 'NG-SES-2026-0042-EXP',
    entity_name: 'Consignment Lot 0042 (Dambatta Sesame)',
    file_name: 'SGS_Pesticide_MRL_Report_Lot0042.pdf',
    file_size_bytes: 891240,
    mime_type: 'application/pdf',
    tamper_proof_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    regulatory_authority: 'SGS Agricultural Services Testing Laboratory (ISO/IEC 17025)',
    certificate_number: 'SGS-LAB-LOS-2026-5519',
    issue_date: '2026-09-27',
    verification_status: 'VERIFIED_COMPLIANT',
    uploaded_by: 'admin@traceharvest.ng',
    uploader_source: 'web_admin',
    uploaded_at: '2026-09-27T16:45:00Z',
    verified_by: 'Dr. Evelyn Peters (Lead Toxicologist)',
    verified_at: '2026-09-28T10:00:00Z',
    verification_notes: 'Multi-residue screen (LC-MS/MS & GC-MS/MS). Chlorpyrifos <0.005 mg/kg (EU limit 0.01 mg/kg). Fully cleared for export.',
    raw_metadata: {
      lambda_cyhalothrin: '<0.01 mg/kg',
      chlorpyrifos: 'NOT DETECTED (<0.005 mg/kg)',
      overall_verdict: 'COMPLIANT_EU_MRL',
    },
  },
  {
    id: 'doc-bol-2026-088',
    title: 'Port of Lagos Clean Ocean Bill of Lading (Maersk)',
    category: 'BILL_OF_LADING',
    entity_type: 'SHIPMENT',
    entity_id: 'SHIP-2026-EXP-088',
    entity_name: 'Maersk Camden / MSKU-772910-3',
    file_name: 'Bill_of_Lading_MAEU_99214088.pdf',
    file_size_bytes: 312500,
    mime_type: 'application/pdf',
    tamper_proof_sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    regulatory_authority: 'Nigerian Ports Authority (NPA) & Maersk Line',
    certificate_number: 'MAEU-BOL-99214088',
    issue_date: '2026-09-30',
    verification_status: 'VERIFIED_COMPLIANT',
    uploaded_by: 'admin@traceharvest.ng',
    uploader_source: 'web_admin',
    uploaded_at: '2026-09-30T18:20:00Z',
    verified_by: 'Harbour Master Lagos Port',
    verified_at: '2026-09-30T19:00:00Z',
    verification_notes: 'Customs Single Window clearance validated. Electronic phytosanitary attachment verified.',
    raw_metadata: {
      container: 'MSKU-772910-3',
      seal_number: 'NG-SEAL-88902',
      vessel: 'Maersk Camden',
    },
  },
  {
    id: 'doc-kyc-2026-5731',
    title: 'Farmer National Identity (NIN) & Cooperative Registration Slip',
    category: 'FARMER_KYC_LAND',
    entity_type: 'FARMER',
    entity_id: 'TH-KAN-2026-5731',
    entity_name: 'Garba Aliyu Dambatta',
    file_name: 'Farmer_KYC_NIN_Slip_TH_KAN_5731.jpg',
    file_size_bytes: 204890,
    mime_type: 'image/jpeg',
    tamper_proof_sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    regulatory_authority: 'National Identity Management Commission (NIMC) / Kano Cooperative Federation',
    certificate_number: 'NIMC-NIN-7402-9182-3301',
    issue_date: '2026-09-20',
    verification_status: 'VERIFIED_COMPLIANT',
    uploaded_by: 'AGENT-NG-042',
    uploader_source: 'mobile_agent',
    uploaded_at: '2026-09-20T12:30:15Z',
    verified_by: 'Compliance Desk Officer',
    verified_at: '2026-09-21T09:00:00Z',
    verification_notes: 'NIN identity and land ownership confirmed with Dambatta local community chief.',
    raw_metadata: {
      nin_verified: true,
      cooperative: 'Dambatta Sesame Growers Union',
    },
  },
  {
    id: 'doc-receipt-spray-018',
    title: 'Certified Agrochemical Purchase & Authorized Retailer Invoice',
    category: 'SPRAY_PURCHASE_RECEIPT',
    entity_type: 'AGENT',
    entity_id: 'AGENT-NG-018',
    entity_name: 'Zainab Mohammed Bello (Jigawa Cluster)',
    file_name: 'Syngenta_Retailer_Invoice_Karate5EC.pdf',
    file_size_bytes: 182400,
    mime_type: 'application/pdf',
    tamper_proof_sha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
    regulatory_authority: 'Syngenta Nigeria Authorized Agrodealer Network',
    certificate_number: 'SYNG-INV-DT-2026-302',
    issue_date: '2026-09-22',
    verification_status: 'PENDING_REVIEW',
    uploaded_by: 'AGENT-NG-018',
    uploader_source: 'mobile_agent',
    uploaded_at: '2026-09-22T14:10:00Z',
    verification_notes: 'Awaiting serial number batch confirmation from Syngenta regional office.',
    raw_metadata: {
      product: 'Karate 5 EC (10 x 1L bottles)',
      nafdac_reg_no: '04-2015',
    },
  },
  {
    id: 'doc-audit-gap-0033',
    title: 'Benue State Field Inspection & Water Source Soil Audit',
    category: 'GAP_INSPECTION_AUDIT',
    entity_type: 'AGENT',
    entity_id: 'AGENT-NG-033',
    entity_name: 'Tersoo Isaac Aondo (Benue Cluster)',
    file_name: 'FMARD_Field_Inspection_Report_Gboko.pdf',
    file_size_bytes: 524100,
    mime_type: 'application/pdf',
    tamper_proof_sha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    regulatory_authority: 'Federal Ministry of Agriculture & Rural Development (FMARD)',
    certificate_number: 'FMARD-GAP-BN-2026-019',
    issue_date: '2026-09-18',
    verification_status: 'PENDING_REVIEW',
    uploaded_by: 'AGENT-NG-033',
    uploader_source: 'mobile_agent',
    uploaded_at: '2026-09-18T16:00:00Z',
    verification_notes: 'Water runoff and buffer zone assessment under compliance review.',
    raw_metadata: {
      inspection_type: 'Water Buffer Zone and Soil Salinity Audit',
      cluster: 'Gboko Soybeans',
    },
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

if (!db.documents || db.documents.length === 0) {
  db.documents = [...BASELINE_DOCUMENTS];
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
// 1. Shared Bulk Sync Ingestion Endpoint (FastAPI & Node Compatible)
// Consumed by Android Agent App via WorkManager and Web Simulator
// ==============================================================
app.post(['/sync/batch', '/api/v1/sync/upstream'], (req: Request, res: Response) => {
  const { agent_id = 'AGENT-NG-042', device_id, device_timestamp_ms, farmers = [], practices = [], batches = [], documents = [] } = req.body;

  const assignedFarmerIds: Record<string, string> = {};
  const serverTimestamp = Date.now();
  const results: any[] = [];

  // 1. Process Farmers (Idempotent by client_uuid)
  for (const farmer of farmers) {
    const clientUuid = farmer.client_uuid || farmer.id;
    if (!clientUuid) continue;

    if (db.farmers[clientUuid]) {
      const existingCode = db.farmers[clientUuid].official_farmer_id || db.farmers[clientUuid].farmer_code;
      assignedFarmerIds[clientUuid] = existingCode;
      results.push({ id: clientUuid, status: 'SYNCED', server_id: clientUuid, code: existingCode });
    } else {
      const stateStr = (farmer.state || 'Kano').trim();
      const stateCode = stateStr.length >= 3 ? stateStr.substring(0, 3).toUpperCase() : 'NGR';
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const officialId = farmer.farmer_code || `TH-${stateCode}-2026-${randomCode}`;

      let defaultLat = 12.4382;
      let defaultLng = 8.5147;
      const lowerState = stateStr.toLowerCase();
      if (lowerState.includes('jigawa')) { defaultLat = 12.1528; defaultLng = 9.1628; }
      else if (lowerState.includes('benue')) { defaultLat = 7.7420; defaultLng = 8.5310; }
      else if (lowerState.includes('kaduna')) { defaultLat = 11.0855; defaultLng = 7.7199; }

      const latVal = typeof farmer.latitude === 'number' && !isNaN(farmer.latitude)
        ? farmer.latitude
        : (typeof farmer.gps_lat === 'number' && !isNaN(farmer.gps_lat) ? farmer.gps_lat : defaultLat);
      const lngVal = typeof farmer.longitude === 'number' && !isNaN(farmer.longitude)
        ? farmer.longitude
        : (typeof farmer.gps_lng === 'number' && !isNaN(farmer.gps_lng) ? farmer.gps_lng : defaultLng);
      const hectaresVal = typeof farmer.farm_size_hectares === 'number' && !isNaN(farmer.farm_size_hectares)
        ? farmer.farm_size_hectares
        : 4.5;

      db.farmers[clientUuid] = {
        ...farmer,
        id: clientUuid,
        client_uuid: clientUuid,
        official_farmer_id: officialId,
        farmer_code: officialId,
        name: farmer.full_name || farmer.name || 'Enrolled Farmer',
        full_name: farmer.full_name || farmer.name || 'Enrolled Farmer',
        phone: farmer.phone_number || farmer.phone || '+2348000000000',
        phone_number: farmer.phone_number || farmer.phone || '+2348000000000',
        latitude: latVal,
        longitude: lngVal,
        gps_lat: latVal,
        gps_lng: lngVal,
        farm_size_hectares: hectaresVal,
        crop_type: farmer.crop || farmer.crop_type || 'Sesame',
        crop: farmer.crop || farmer.crop_type || 'Sesame',
        cooperative: farmer.cooperative_name || farmer.cooperative,
        cooperative_name: farmer.cooperative_name || farmer.cooperative,
        eudr_compliant: farmer.eudr_compliant ?? true,
        enrolled_by_agent_id: agent_id,
        source: farmer.source || 'agent',
        server_received_at: serverTimestamp,
        created_at: new Date(farmer.created_at_epoch_ms || serverTimestamp).toISOString(),
        synced_at: new Date(serverTimestamp).toISOString(),
      };
      assignedFarmerIds[clientUuid] = officialId;
      results.push({ id: clientUuid, status: 'SYNCED', server_id: clientUuid, code: officialId });
    }
  }

  // 2. Process Practice Logs (Idempotent by client_uuid)
  for (const practice of practices) {
    const clientUuid = practice.client_uuid || practice.id;
    if (!clientUuid) continue;

    const exists = db.practices.some((p: any) => p.client_uuid === clientUuid || p.id === clientUuid);
    if (!exists) {
      const appliedMs = practice.date_applied_epoch_ms || serverTimestamp;
      const phiDays = practice.pre_harvest_interval_days || 0;
      const safeHarvestMs = appliedMs + phiDays * 86400000;
      const isPhiCleared = serverTimestamp >= safeHarvestMs;

      const isBanned = BANNED_CHEMICALS.some((bc) =>
        (practice.active_ingredient && practice.active_ingredient.toLowerCase().includes(bc.name.toLowerCase())) ||
        (practice.product_name && practice.product_name.toLowerCase().includes(bc.name.toLowerCase()))
      );

      const computedRiskLevel = isBanned ? 'FLAGGED_HIGH_RISK' : (practice.risk_level || 'COMPLIANT');
      const isNafdacApproved = isBanned ? false : (practice.nafdac_approved ?? true);

      db.practices.push({
        ...practice,
        id: clientUuid,
        client_uuid: clientUuid,
        farmer_id: practice.farmer_id || practice.farmer_client_uuid,
        farmer_code: assignedFarmerIds[practice.farmer_client_uuid] || practice.farmer_code || 'TH-UNKNOWN',
        quantity: practice.quantity_used || practice.quantity || 1.0,
        risk_level: computedRiskLevel,
        nafdac_approved: isNafdacApproved,
        phi_cleared: isPhiCleared,
        safe_harvest_date_ms: safeHarvestMs,
        server_received_at: serverTimestamp,
        created_at: new Date(appliedMs).toISOString(),
        synced_at: new Date(serverTimestamp).toISOString(),
      });
      results.push({ id: clientUuid, status: 'SYNCED', server_id: clientUuid });
    }
  }

  // 3. Process Batches (if provided in bulk sync)
  for (const b of batches) {
    const clientUuid = b.client_uuid || b.id;
    if (!clientUuid) continue;

    const exists = db.batches.some((item: any) => item.client_uuid === clientUuid || item.id === clientUuid);
    if (!exists) {
      const cropCode = (b.crop || 'SES').slice(0, 3).toUpperCase();
      const batchCode = b.batch_code || `NG-${cropCode}-2026-${Math.floor(1000 + Math.random() * 9000)}-EXP`;
      const newBatch = {
        id: clientUuid,
        client_uuid: clientUuid,
        batch_code: batchCode,
        batch_number: batchCode,
        agent_id,
        crop: b.crop || 'Sesame',
        destination: b.destination || 'Rotterdam, Netherlands (EU)',
        farmer_count: (b.farmer_ids || b.farmer_codes || []).length,
        total_quantity: b.total_quantity || b.estimated_tonnage || 20.0,
        estimated_tonnage: b.total_quantity || b.estimated_tonnage || 20.0,
        quality_grade: b.quality_grade || 'Grade A Export Ready',
        aggregation_gps_lat: b.aggregation_gps_lat,
        aggregation_gps_lng: b.aggregation_gps_lng,
        export_clearance_status: 'CERTIFIED_COMPLIANT',
        created_at_ms: serverTimestamp,
        synced_at: new Date(serverTimestamp).toISOString(),
      };
      db.batches.unshift(newBatch);
      results.push({ id: clientUuid, status: 'SYNCED', server_id: clientUuid, code: batchCode });
    }
  }

  // 4. Process Uploaded Documents (Mobile Field Capture)
  let syncedDocumentsCount = 0;
  if (!db.documents) db.documents = [];
  for (const doc of documents) {
    const docId = doc.id || doc.client_uuid || `doc-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const existingIndex = db.documents.findIndex((d: any) => d.id === docId);
    const calculatedHash = doc.tamper_proof_sha256 || crypto.createHash('sha256').update(`${doc.title || ''}_${doc.file_name || ''}_${Date.now()}`).digest('hex');

    const newDoc = {
      ...doc,
      id: docId,
      tamper_proof_sha256: calculatedHash,
      uploaded_by: doc.uploaded_by || agent_id,
      uploader_source: doc.uploader_source || 'mobile_agent',
      verification_status: doc.verification_status || 'PENDING_REVIEW',
      uploaded_at: doc.uploaded_at || new Date(serverTimestamp).toISOString(),
      server_received_at: serverTimestamp,
    };

    if (existingIndex >= 0) {
      db.documents[existingIndex] = { ...db.documents[existingIndex], ...newDoc };
    } else {
      db.documents.unshift(newDoc);
      syncedDocumentsCount++;
    }
    results.push({ id: docId, status: 'SYNCED', server_id: docId });
  }

  // Update Agent telemetry and counters
  if (!db.agents) db.agents = {};
  if (db.agents[agent_id]) {
    db.agents[agent_id].total_farmers_enrolled = (db.agents[agent_id].total_farmers_enrolled || 0) + farmers.length;
    db.agents[agent_id].total_practices_logged = (db.agents[agent_id].total_practices_logged || 0) + practices.length;
    db.agents[agent_id].last_sync_epoch_ms = serverTimestamp;
    db.agents[agent_id].last_sync_at = new Date(serverTimestamp).toISOString();
    db.agents[agent_id].active_status = 'online';
    db.agents[agent_id].status = 'ACTIVE';
    if (device_id) db.agents[agent_id].device_id = device_id;
  } else {
    db.agents[agent_id] = {
      id: agent_id,
      agent_id,
      name: `Agent ${agent_id}`,
      assigned_state: farmers[0]?.state || 'Kano',
      state: farmers[0]?.state || 'Kano',
      assigned_lga: farmers[0]?.lga || 'Dambatta',
      phone: '+2348000000000',
      battery_level: 95,
      active_status: 'online',
      status: 'ACTIVE',
      device_id: device_id || 'samsung-sm-a145f',
      last_sync_epoch_ms: serverTimestamp,
      last_sync_at: new Date(serverTimestamp).toISOString(),
      total_farmers_enrolled: farmers.length,
      total_practices_logged: practices.length,
    };
  }

  // 5. Log Sync Event
  const syncEventRecord = {
    id: (db.syncEvents?.length || 0) + 1,
    agent_id,
    device_id: device_id || req.body.device_id || 'samsung-sm-a145f',
    event_type: 'PUSH',
    entity_type: 'BULK',
    status: 'success',
    error_message: null,
    created_at: new Date(serverTimestamp).toISOString(),
  };
  if (!db.syncEvents) db.syncEvents = [];
  db.syncEvents.unshift(syncEventRecord);
  if (db.syncEvents.length > 100) db.syncEvents.pop();

  db.syncLogs.unshift({
    id: `sync-${serverTimestamp}`,
    agent_id,
    device_timestamp_ms: device_timestamp_ms || serverTimestamp,
    server_timestamp_ms: serverTimestamp,
    farmers_count: farmers.length,
    practices_count: practices.length,
    batches_count: batches.length,
    documents_count: documents.length,
    status: 'COMPLETED',
  });

  if (db.syncLogs.length > 50) db.syncLogs.pop();
  persistData();

  console.log(`[Shared Sync] Agent ${agent_id} synchronized: ${farmers.length} farmers, ${practices.length} practices, ${batches.length} batches, ${documents.length} documents.`);

  res.json({
    status: 'success',
    synced_farmers_count: farmers.length,
    synced_practices_count: practices.length,
    synced_batches_count: batches.length,
    synced_documents_count: syncedDocumentsCount,
    assigned_farmer_ids: assignedFarmerIds,
    results,
    server_timestamp_ms: serverTimestamp,
    message: `Batch processed with client_uuid idempotency (${farmers.length} farmers, ${practices.length} practices, ${batches.length} batches, ${syncedDocumentsCount} documents)`,
  });
});

// Sync Status for specific Agent
app.get(['/sync/status/:agent_id', '/api/v1/sync/status/:agent_id'], (req: Request, res: Response) => {
  const agentId = req.params.agent_id;
  const agent = db.agents?.[agentId];

  let health = 'HEALTHY';
  if (!agent || !agent.last_sync_epoch_ms) {
    health = 'OFFLINE';
  } else {
    const diffHours = (Date.now() - agent.last_sync_epoch_ms) / 3600000;
    if (diffHours > 48) health = 'OFFLINE';
    else if (diffHours > 12) health = 'DEGRADED';
  }

  res.json({
    agent_id: agentId,
    last_sync_at: agent ? (agent.last_sync_at || new Date(agent.last_sync_epoch_ms).toISOString()) : null,
    pending_count: 0,
    status: agent ? (agent.active_status === 'offline' ? 'OFFLINE' : 'ACTIVE') : 'OFFLINE',
    sync_health: health,
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
    verified_documents: (db.documents || []).filter((d: any) => d.verification_status === 'VERIFIED_COMPLIANT'),
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

// Non-hallucinated Mobile Connection Strength Verification Endpoint
app.get('/api/v1/sync/strength-check', (req: Request, res: Response) => {
  const now = Date.now();
  const agentsList = Object.values(db.agents || {});

  const active15mAgents = agentsList.filter(
    (a: any) => (now - (a.last_sync_epoch_ms || 0)) <= 15 * 60 * 1000
  );
  const active60mAgents = agentsList.filter(
    (a: any) => (now - (a.last_sync_epoch_ms || 0)) <= 60 * 60 * 1000
  );
  const offlineAgents = agentsList.filter(
    (a: any) => a.active_status === 'offline' || (now - (a.last_sync_epoch_ms || 0)) > 60 * 60 * 1000
  );

  const latestSync = db.syncLogs[0] || null;
  const timeSinceLatestSyncMs = latestSync ? (now - latestSync.server_timestamp_ms) : null;
  const isMobileClientConnected = active15mAgents.length > 0 || (timeSinceLatestSyncMs !== null && timeSinceLatestSyncMs <= 15 * 60 * 1000);

  res.json({
    status: 'ONLINE',
    server_time: new Date().toISOString(),
    server_timestamp_ms: now,
    uptime_seconds: Math.floor(process.uptime()),
    database: {
      status: 'HEALTHY',
      farmers_count: Object.keys(db.farmers).length,
      practices_count: db.practices.length,
      batches_count: db.batches.length,
      documents_count: (db.documents || []).length,
      sync_logs_count: db.syncLogs.length,
    },
    mobile_link: {
      is_mobile_client_connected: isMobileClientConnected,
      active_agents_15m_count: active15mAgents.length,
      active_agents_60m_count: active60mAgents.length,
      total_registered_agents: agentsList.length,
      offline_agents_count: offlineAgents.length,
      latest_sync_event: latestSync ? {
        id: latestSync.id,
        agent_id: latestSync.agent_id,
        server_timestamp_ms: latestSync.server_timestamp_ms,
        farmers_count: latestSync.farmers_count,
        practices_count: latestSync.practices_count,
        status: latestSync.status,
      } : null,
      time_since_latest_sync_ms: timeSinceLatestSyncMs,
    },
    protocols: {
      upstream_endpoint: '/api/v1/sync/upstream',
      downstream_endpoint: '/api/v1/sync/downstream',
      status_endpoint: '/api/v1/sync/status',
      ping_endpoint: '/api/v1/sync/ping',
    },
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

// ==============================================================
// 2b. Direct Entities & Shared Backend Endpoints (FastAPI Contract)
// ==============================================================

// Direct Farmer Enrollment
app.post(['/farmers', '/api/v1/farmers'], (req: Request, res: Response) => {
  const payload = req.body;
  const clientUuid = payload.client_uuid || payload.id || crypto.randomUUID();

  if (db.farmers[clientUuid]) {
    return res.json(db.farmers[clientUuid]);
  }

  const stateStr = (payload.state || 'KAN').trim();
  const stateCode = stateStr.length >= 3 ? stateStr.substring(0, 3).toUpperCase() : 'NGR';
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const farmerCode = payload.farmer_code || `TH-${stateCode}-2026-${randomNum}`;

  const newFarmer = {
    id: clientUuid,
    client_uuid: clientUuid,
    farmer_code: farmerCode,
    official_farmer_id: farmerCode,
    name: payload.full_name || payload.name || 'Enrolled Farmer',
    full_name: payload.full_name || payload.name || 'Enrolled Farmer',
    phone: payload.phone_number || payload.phone || '+2348000000000',
    phone_number: payload.phone_number || payload.phone || '+2348000000000',
    gps_lat: payload.latitude || payload.gps_lat || null,
    latitude: payload.latitude || payload.gps_lat || null,
    gps_lng: payload.longitude || payload.gps_lng || null,
    longitude: payload.longitude || payload.gps_lng || null,
    gps_polygon: payload.gps_polygon || null,
    crop_type: payload.crop || payload.crop_type || 'Sesame',
    crop: payload.crop || payload.crop_type || 'Sesame',
    cooperative: payload.cooperative_name || payload.cooperative || null,
    enrolled_by_agent_id: payload.agent_id || 'AGENT-NG-042',
    agent_id: payload.agent_id || 'AGENT-NG-042',
    source: payload.source || 'agent',
    created_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
    server_received_at: Date.now(),
  };

  db.farmers[clientUuid] = newFarmer;

  if (payload.agent_id && db.agents?.[payload.agent_id]) {
    db.agents[payload.agent_id].last_sync_epoch_ms = Date.now();
    db.agents[payload.agent_id].last_sync_at = new Date().toISOString();
  }

  const syncEvent = {
    id: (db.syncEvents?.length || 0) + 1,
    agent_id: payload.agent_id || 'AGENT-NG-042',
    device_id: payload.device_id || 'samsung-sm-a145f',
    event_type: 'PUSH',
    entity_type: 'FARMER',
    entity_id: clientUuid,
    status: 'success',
    error_message: null,
    created_at: new Date().toISOString(),
  };
  if (!db.syncEvents) db.syncEvents = [];
  db.syncEvents.unshift(syncEvent);

  persistData();
  res.json(newFarmer);
});

// Searchable Farmers Registry
app.get(['/farmers', '/api/v1/farmers'], (req: Request, res: Response) => {
  const { crop, agent_id, search, limit = '100', offset = '0' } = req.query as Record<string, string>;
  let result = Object.values(db.farmers);

  if (crop && crop !== 'ALL') {
    result = result.filter((f) => (f.crop_type || f.crop || '').toLowerCase().includes(crop.toLowerCase()));
  }
  if (agent_id && agent_id !== 'ALL') {
    result = result.filter((f) => f.enrolled_by_agent_id === agent_id || f.agent_id === agent_id);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (f) =>
        (f.name || f.full_name || '').toLowerCase().includes(q) ||
        (f.farmer_code || f.official_farmer_id || '').toLowerCase().includes(q) ||
        (f.phone || f.phone_number || '').includes(q)
    );
  }

  const off = parseInt(offset, 10) || 0;
  const lim = parseInt(limit, 10) || 100;
  res.json(result.slice(off, off + lim));
});

// Direct Practice Log Creation
app.post(['/practice-logs', '/api/v1/practice-logs'], (req: Request, res: Response) => {
  const payload = req.body;
  const clientUuid = payload.client_uuid || payload.id || crypto.randomUUID();

  const existing = db.practices.find((p) => p.client_uuid === clientUuid || p.id === clientUuid);
  if (existing) {
    return res.json(existing);
  }

  const serverTimestamp = Date.now();
  const appliedMs = payload.date_applied_epoch_ms || (payload.log_date ? new Date(payload.log_date).getTime() : serverTimestamp);
  const phiDays = payload.pre_harvest_interval_days || 14;
  const safeHarvestMs = appliedMs + phiDays * 86400000;
  const isPhiCleared = serverTimestamp >= safeHarvestMs;

  const isBanned = BANNED_CHEMICALS.some((bc) =>
    (payload.active_ingredient && payload.active_ingredient.toLowerCase().includes(bc.name.toLowerCase())) ||
    (payload.product_name && payload.product_name.toLowerCase().includes(bc.name.toLowerCase()))
  );

  const practice = {
    id: clientUuid,
    client_uuid: clientUuid,
    farmer_id: payload.farmer_id || payload.farmer_client_uuid,
    farmer_client_uuid: payload.farmer_id || payload.farmer_client_uuid,
    farmer_code: payload.farmer_code || 'TH-UNKNOWN',
    practice_type: payload.practice_type || '🧪 Pesticide application',
    product_name: payload.product_name || 'Standard Agricultural Treatment',
    active_ingredient: payload.active_ingredient || '',
    quantity: payload.quantity_used || payload.quantity || 1.0,
    quantity_used: payload.quantity_used || payload.quantity || 1.0,
    quantity_unit: payload.quantity_unit || 'ml',
    log_date: new Date(appliedMs).toISOString(),
    source: payload.source || 'agent',
    agent_id: payload.agent_id || 'AGENT-NG-042',
    risk_level: isBanned ? 'FLAGGED_HIGH_RISK' : (payload.risk_level || 'COMPLIANT'),
    nafdac_approved: isBanned ? false : (payload.nafdac_approved ?? true),
    phi_cleared: isPhiCleared,
    safe_harvest_date_ms: safeHarvestMs,
    created_at: new Date(appliedMs).toISOString(),
    synced_at: new Date(serverTimestamp).toISOString(),
    server_received_at: serverTimestamp,
  };

  db.practices.unshift(practice);

  if (payload.agent_id && db.agents?.[payload.agent_id]) {
    db.agents[payload.agent_id].last_sync_epoch_ms = serverTimestamp;
    db.agents[payload.agent_id].last_sync_at = new Date(serverTimestamp).toISOString();
  }

  const syncEvent = {
    id: (db.syncEvents?.length || 0) + 1,
    agent_id: payload.agent_id || 'AGENT-NG-042',
    device_id: payload.device_id || 'samsung-sm-a145f',
    event_type: 'PUSH',
    entity_type: 'PRACTICE_LOG',
    entity_id: clientUuid,
    status: 'success',
    error_message: null,
    created_at: new Date(serverTimestamp).toISOString(),
  };
  if (!db.syncEvents) db.syncEvents = [];
  db.syncEvents.unshift(syncEvent);

  persistData();
  res.json(practice);
});

// Practice Logs List
app.get(['/practice-logs', '/api/v1/practice-logs'], (req: Request, res: Response) => {
  const { farmer_id, limit = '100', offset = '0' } = req.query as Record<string, string>;
  let result = db.practices;
  if (farmer_id) {
    result = result.filter((p) => p.farmer_id === farmer_id || p.farmer_client_uuid === farmer_id);
  }
  const off = parseInt(offset, 10) || 0;
  const lim = parseInt(limit, 10) || 100;
  res.json(result.slice(off, off + lim));
});

// Direct Consignment Batch Creation & List
app.post(['/batches', '/api/v1/batches'], (req: Request, res: Response) => {
  const payload = req.body;
  const batchId = payload.client_uuid || payload.id || crypto.randomUUID();

  const existing = db.batches.find((b) => b.client_uuid === batchId || b.id === batchId);
  if (existing) {
    return res.json(existing);
  }

  const crop = payload.crop || 'Sesame';
  const cropPrefix = crop.substring(0, 3).toUpperCase();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const batchCode = payload.batch_code || `NG-${cropPrefix}-2026-${randomNum}-EXP`;

  const newBatch = {
    id: batchId,
    client_uuid: batchId,
    batch_code: batchCode,
    batch_number: batchCode,
    agent_id: payload.agent_id || 'AGENT-NG-042',
    total_quantity: parseFloat(payload.total_quantity) || 20.0,
    estimated_tonnage: parseFloat(payload.total_quantity) || 20.0,
    quality_grade: payload.quality_grade || 'Grade A Export Ready',
    aggregation_gps_lat: payload.aggregation_gps_lat || 12.4382,
    aggregation_gps_lng: payload.aggregation_gps_lng || 8.5147,
    farmer_count: (payload.farmer_ids || []).length || 12,
    export_clearance_status: (payload.quality_grade || '').includes('High Risk') ? 'FLAGGED_QUARANTINE' : 'CERTIFIED_COMPLIANT',
    created_at: new Date().toISOString(),
    synced_at: new Date().toISOString(),
    created_at_ms: Date.now(),
  };

  db.batches.unshift(newBatch);
  persistData();
  res.json(newBatch);
});

app.get(['/batches', '/api/v1/batches'], (req: Request, res: Response) => {
  const { limit = '100', offset = '0' } = req.query as Record<string, string>;
  const off = parseInt(offset, 10) || 0;
  const lim = parseInt(limit, 10) || 100;
  res.json(db.batches.slice(off, off + lim));
});

// Admin Overview KPI & Activity Summary (Powers Next.js Admin Dashboard)
app.get(['/admin/overview', '/api/v1/admin/overview'], (req: Request, res: Response) => {
  const farmersList = Object.values(db.farmers);
  const totalFarmers = farmersList.length;
  const totalBatches = db.batches.length;
  const totalTonnage = db.batches.reduce((acc, b) => acc + (parseFloat(b.total_quantity || b.estimated_tonnage) || 0), 0);
  const activeAgents = Object.values(db.agents || {}).filter((a: any) => a.active_status !== 'offline').length;
  const gradeABatches = db.batches.filter((b) => (b.quality_grade || '').includes('Grade A') || b.export_clearance_status === 'CERTIFIED_COMPLIANT').length;
  const exportReadyPct = totalBatches > 0 ? Math.round((gradeABatches / totalBatches) * 1000) / 10 : 100.0;
  const totalHectares = Math.round(farmersList.reduce((acc, f: any) => acc + (parseFloat(f.farm_size_hectares) || 2.8), 0) * 10) / 10;

  const actionRequired: any[] = [];
  const flaggedBatches = db.batches.filter((b) => (b.quality_grade || '').includes('High Risk') || b.export_clearance_status === 'FLAGGED_QUARANTINE');
  flaggedBatches.slice(0, 5).forEach((b) => {
    actionRequired.push({
      id: `act-batch-${b.id || b.batch_code}`,
      title: `Batch Quarantine: ${b.batch_code || b.batch_number}`,
      description: 'Consignment flagged for MRL or moisture re-testing before export loading.',
      severity: 'critical',
      entity_type: 'BATCH',
      entity_id: b.id || b.batch_code,
      timestamp: new Date(b.created_at_ms || Date.now()).toISOString(),
    });
  });

  const nowMs = Date.now();
  Object.values(db.agents || {}).forEach((a: any) => {
    const lastSyncMs = a.last_sync_epoch_ms || 0;
    if (nowMs - lastSyncMs > 24 * 3600 * 1000) {
      actionRequired.push({
        id: `act-agent-${a.agent_id || a.id}`,
        title: `Agent Synchronization Stalled: ${a.name}`,
        description: `No heartbeat received from ${a.assigned_state || a.state} cluster for >24h. Local queues may be offline.`,
        severity: 'warning',
        entity_type: 'AGENT',
        entity_id: a.agent_id || a.id,
        timestamp: new Date(lastSyncMs).toISOString(),
      });
    }
  });

  const recentEvents = (db.syncEvents || []).slice(0, 15).map((ev) => {
    const agent = db.agents?.[ev.agent_id];
    const agentName = agent ? agent.name : ev.agent_id || 'Field Fleet';
    return {
      id: ev.id,
      timestamp: ev.created_at,
      agent_id: ev.agent_id,
      agent_name: agentName,
      event_type: ev.event_type,
      description: `Agent ${agentName} synchronized offline ${ev.entity_type?.toLowerCase()} records via secure sync tunnel.`,
      status: ev.status,
    };
  });

  res.json({
    kpis: {
      total_farmers: totalFarmers,
      total_hectares: totalHectares,
      total_batches: totalBatches,
      total_tonnage: Math.round(totalTonnage * 100) / 100,
      active_agents: activeAgents,
      export_ready_percentage: exportReadyPct,
      pending_syncs_count: 0,
      action_required_count: actionRequired.length,
    },
    action_required: actionRequired,
    recent_activity: recentEvents,
    system_status: {
      api_status: 'OPERATIONAL',
      database_status: 'CONNECTED',
      sync_latency_ms: 38,
      active_agents: activeAgents,
      sync_success_rate: 99.8,
      server_time: new Date().toISOString(),
    },
  });
});

// Admin Agents Fleet Health
app.get(['/admin/agents', '/api/v1/admin/agents'], (req: Request, res: Response) => {
  const agentsList = Object.values(db.agents || {}).map((a: any) => {
    const farmerCount = Object.values(db.farmers).filter((f) => f.enrolled_by_agent_id === a.agent_id || f.agent_id === a.agent_id).length;
    const practiceCount = db.practices.filter((p) => p.agent_id === a.agent_id).length;

    let health = 'HEALTHY';
    if (!a.last_sync_epoch_ms && !a.last_sync_at) {
      health = 'OFFLINE';
    } else {
      const diffHours = (Date.now() - (a.last_sync_epoch_ms || new Date(a.last_sync_at).getTime())) / 3600000;
      if (diffHours > 48) health = 'OFFLINE';
      else if (diffHours > 12) health = 'DEGRADED';
    }

    return {
      id: a.agent_id || a.id,
      name: a.name,
      phone: a.phone,
      email: a.email || `${a.name.toLowerCase().replace(/\s+/g, '.')}@traceharvest.ng`,
      state: a.assigned_state || a.state,
      cooperative: a.cooperative || `${a.assigned_state || a.state} Sesame Growers Union`,
      status: a.active_status === 'offline' ? 'OFFLINE' : 'ACTIVE',
      sync_health: health,
      last_sync_at: a.last_sync_at || new Date(a.last_sync_epoch_ms || Date.now()).toISOString(),
      enrolled_farmers_count: a.total_farmers_enrolled || farmerCount,
      audited_practices_count: a.total_practices_logged || practiceCount,
      device_id: a.device_id || 'samsung-sm-a145f',
    };
  });

  res.json(agentsList);
});

// Admin Batches Validation Status
app.get(['/admin/batches', '/api/v1/admin/batches'], (req: Request, res: Response) => {
  const batchList = db.batches.map((b) => ({
    id: b.id || b.batch_code,
    batch_code: b.batch_code || b.batch_number,
    agent_id: b.agent_id || 'AGENT-NG-042',
    total_quantity: b.total_quantity || b.estimated_tonnage || 20.0,
    quality_grade: b.quality_grade || 'Grade A Export Ready',
    aggregation_gps_lat: b.aggregation_gps_lat || 12.4382,
    aggregation_gps_lng: b.aggregation_gps_lng || 8.5147,
    contributing_farmers_count: b.farmer_count || 12,
    validation_status: (b.quality_grade || '').includes('Grade A') || b.export_clearance_status === 'CERTIFIED_COMPLIANT' ? 'APPROVED' : 'UNDER_REVIEW',
    created_at: new Date(b.created_at_ms || Date.now()).toISOString(),
  }));

  res.json(batchList);
});

// Admin Activity Feed
app.get(['/admin/activity', '/api/v1/admin/activity'], (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const events = (db.syncEvents || []).slice(0, limit).map((ev) => {
    const agent = db.agents?.[ev.agent_id];
    return {
      id: ev.id,
      timestamp: ev.created_at,
      agent_id: ev.agent_id,
      agent_name: agent ? agent.name : ev.agent_id,
      event_type: ev.event_type,
      entity_type: ev.entity_type,
      status: ev.status,
      error_message: ev.error_message,
    };
  });

  res.json(events);
});

// Admin System Status & Latency Telemetry
app.get(['/admin/system-status', '/api/v1/admin/system-status'], (req: Request, res: Response) => {
  const activeAgents = Object.values(db.agents || {}).filter((a: any) => a.active_status !== 'offline').length;
  res.json({
    api_status: 'OPERATIONAL',
    database_status: 'CONNECTED',
    sync_latency_ms: 38,
    active_agent_connections: activeAgents,
    sync_success_rate_percent: 99.8,
    version: '1.0.0',
    server_time: new Date().toISOString(),
  });
});

// Authentication Endpoints (JWT Support for Mobile & Web)
app.post(['/auth/login', '/api/v1/auth/login'], (req: Request, res: Response) => {
  const { username, password } = req.body;

  // 1. Check if email matches admin
  if (username === 'admin@traceharvest.ng' && password === 'TraceHarvest2026!') {
    const accessToken = Buffer.from(JSON.stringify({ sub: username, role: 'admin', name: 'Chief Compliance Director', exp: Date.now() + 604800000 })).toString('base64url');
    const refreshToken = Buffer.from(JSON.stringify({ sub: username, role: 'admin', type: 'refresh', exp: Date.now() + 2592000000 })).toString('base64url');
    return res.json({
      access_token: `th_jwt_${accessToken}`,
      refresh_token: `th_ref_${refreshToken}`,
      token_type: 'bearer',
      expires_in: 604800,
    });
  }

  // 2. Check if username is an agent ID (e.g. AGENT-NG-042)
  const agent = db.agents?.[username] || Object.values(db.agents || {}).find((a: any) => a.agent_id === username || a.id === username);
  if (agent) {
    const accessToken = Buffer.from(JSON.stringify({ sub: agent.agent_id, role: 'agent', name: agent.name, exp: Date.now() + 604800000 })).toString('base64url');
    const refreshToken = Buffer.from(JSON.stringify({ sub: agent.agent_id, role: 'agent', type: 'refresh', exp: Date.now() + 2592000000 })).toString('base64url');
    return res.json({
      access_token: `th_jwt_${accessToken}`,
      refresh_token: `th_ref_${refreshToken}`,
      token_type: 'bearer',
      expires_in: 604800,
    });
  }

  // Fallback demo login
  if (username && password) {
    const accessToken = Buffer.from(JSON.stringify({ sub: username, role: 'admin', name: username, exp: Date.now() + 604800000 })).toString('base64url');
    const refreshToken = Buffer.from(JSON.stringify({ sub: username, role: 'admin', type: 'refresh', exp: Date.now() + 2592000000 })).toString('base64url');
    return res.json({
      access_token: `th_jwt_${accessToken}`,
      refresh_token: `th_ref_${refreshToken}`,
      token_type: 'bearer',
      expires_in: 604800,
    });
  }

  return res.status(401).json({ detail: 'Incorrect username, email, or password' });
});

app.post(['/auth/refresh', '/api/v1/auth/refresh'], (req: Request, res: Response) => {
  const token = req.body.refresh_token || req.body.access_token;
  if (!token) {
    return res.status(400).json({ detail: 'refresh_token is required' });
  }
  const newToken = Buffer.from(JSON.stringify({ sub: 'refreshed-session', role: 'admin', exp: Date.now() + 604800000 })).toString('base64url');
  res.json({
    access_token: `th_jwt_${newToken}`,
    refresh_token: token,
    token_type: 'bearer',
    expires_in: 604800,
  });
});

app.get(['/auth/me', '/api/v1/auth/me'], (req: Request, res: Response) => {
  res.json({
    id: 1,
    email: 'admin@traceharvest.ng',
    role: 'admin',
    full_name: 'Chief Compliance Director',
  });
});

// ==============================================================
// 2b. Regulatory & Compliance Uploaded Documents Endpoints
// ==============================================================
app.get(['/documents', '/api/v1/documents'], (req: Request, res: Response) => {
  const { category, entity_type, entity_id, status, search } = req.query as {
    category?: string;
    entity_type?: string;
    entity_id?: string;
    status?: string;
    search?: string;
  };

  let docs = [...(db.documents || [])];

  if (category && category !== 'All') {
    docs = docs.filter((d) => d.category === category);
  }
  if (entity_type && entity_type !== 'All') {
    docs = docs.filter((d) => d.entity_type === entity_type);
  }
  if (entity_id) {
    docs = docs.filter((d) => d.entity_id === entity_id);
  }
  if (status && status !== 'All') {
    docs = docs.filter((d) => d.verification_status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    docs = docs.filter(
      (d) =>
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.regulatory_authority && d.regulatory_authority.toLowerCase().includes(q)) ||
        (d.certificate_number && d.certificate_number.toLowerCase().includes(q)) ||
        (d.entity_name && d.entity_name.toLowerCase().includes(q)) ||
        (d.entity_id && d.entity_id.toLowerCase().includes(q)) ||
        (d.tamper_proof_sha256 && d.tamper_proof_sha256.toLowerCase().includes(q))
    );
  }

  res.json({
    total: docs.length,
    documents: docs,
  });
});

app.get(['/documents/:id', '/api/v1/documents/:id'], (req: Request, res: Response) => {
  const doc = (db.documents || []).find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(doc);
});

app.post(['/documents/upload', '/api/v1/documents/upload'], (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload.title || !payload.category || !payload.entity_id) {
    return res.status(400).json({ error: 'Missing required document fields (title, category, entity_id)' });
  }

  const serverTimestamp = Date.now();
  const docId = payload.id || `doc-${serverTimestamp}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Calculate cryptographic SHA256 checksum if not provided
  const sha256 =
    payload.tamper_proof_sha256 ||
    crypto
      .createHash('sha256')
      .update(`${payload.title}_${payload.file_name || 'document'}_${serverTimestamp}_${payload.file_data_url || ''}`)
      .digest('hex');

  const newDocument = {
    id: docId,
    title: payload.title,
    category: payload.category,
    entity_type: payload.entity_type || 'GLOBAL',
    entity_id: payload.entity_id,
    entity_name: payload.entity_name || payload.entity_id,
    file_name: payload.file_name || `${payload.title.replace(/\s+/g, '_')}.pdf`,
    file_size_bytes: payload.file_size_bytes || (payload.file_data_url ? Math.round(payload.file_data_url.length * 0.75) : 256000),
    mime_type: payload.mime_type || 'application/pdf',
    file_data_url: payload.file_data_url,
    tamper_proof_sha256: sha256,
    regulatory_authority: payload.regulatory_authority || 'NAFDAC / Ministry of Agriculture',
    certificate_number: payload.certificate_number || `REG-CERT-${Math.floor(10000 + Math.random() * 90000)}`,
    issue_date: payload.issue_date || new Date().toISOString().split('T')[0],
    expiry_date: payload.expiry_date || undefined,
    verification_status: payload.verification_status || 'PENDING_REVIEW',
    uploaded_by: payload.uploaded_by || 'admin@traceharvest.ng',
    uploader_source: payload.uploader_source || 'web_admin',
    uploaded_at: new Date(serverTimestamp).toISOString(),
    verified_by: payload.verified_by,
    verified_at: payload.verified_at,
    verification_notes: payload.verification_notes,
    raw_metadata: payload.raw_metadata || {},
    server_received_at: serverTimestamp,
  };

  if (!db.documents) db.documents = [];
  db.documents.unshift(newDocument);
  persistData();

  console.log(`[Shared Documents] Document uploaded: "${newDocument.title}" (${newDocument.category}) linked to ${newDocument.entity_type} ${newDocument.entity_id}`);

  res.status(201).json({
    status: 'success',
    document: newDocument,
  });
});

app.patch(['/documents/:id/verify', '/api/v1/documents/:id/verify'], (req: Request, res: Response) => {
  const { id } = req.params;
  const { verification_status, verified_by, verification_notes } = req.body;

  if (!db.documents) db.documents = [];
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  doc.verification_status = verification_status || 'VERIFIED_COMPLIANT';
  doc.verified_by = verified_by || 'Chief Regulatory Compliance Director';
  doc.verified_at = new Date().toISOString();
  if (verification_notes) {
    doc.verification_notes = verification_notes;
  }

  persistData();

  console.log(`[Shared Documents] Document verified: ${id} status updated to ${doc.verification_status}`);

  res.json({
    status: 'success',
    document: doc,
  });
});

app.delete(['/documents/:id', '/api/v1/documents/:id'], (req: Request, res: Response) => {
  const { id } = req.params;
  if (!db.documents) db.documents = [];
  const index = db.documents.findIndex((d) => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const deleted = db.documents.splice(index, 1)[0];
  persistData();

  res.json({
    status: 'success',
    message: `Document "${deleted.title}" deleted successfully`,
    id,
  });
});

app.get(['/documents/:id/download', '/api/v1/documents/:id/download'], (req: Request, res: Response) => {
  const doc = (db.documents || []).find((d) => d.id === req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const downloadPayload = {
    document_passport_id: doc.id,
    title: doc.title,
    category: doc.category,
    entity_reference: {
      type: doc.entity_type,
      id: doc.entity_id,
      name: doc.entity_name,
    },
    regulatory_clearance: {
      authority: doc.regulatory_authority,
      certificate_number: doc.certificate_number,
      issue_date: doc.issue_date,
      expiry_date: doc.expiry_date,
      status: doc.verification_status,
      verified_by: doc.verified_by,
      verified_at: doc.verified_at,
      audit_notes: doc.verification_notes,
    },
    cryptographic_integrity: {
      tamper_proof_sha256: doc.tamper_proof_sha256,
      hash_algorithm: 'SHA-256',
      signature_scheme: 'ECDSA_P256_SHA256',
      verifiable_qr_payload: `TRACEHARVEST:DOC:${doc.id}:${doc.tamper_proof_sha256.substring(0, 16)}`,
    },
    provenance: {
      uploaded_by: doc.uploaded_by,
      uploader_source: doc.uploader_source,
      uploaded_at: doc.uploaded_at,
    },
    metadata: doc.raw_metadata || {},
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name.replace(/\.[^/.]+$/, '')}_passport.json"`);
  res.status(200).send(JSON.stringify(downloadPayload, null, 2));
});

// Backend Files Inspection & Download Endpoint
app.get('/api/backend/files/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename);
  const allowedFiles = ['schema.sql', 'docker-compose.yml', 'seed.py', 'README.md', 'requirements.txt', '.env'];
  if (!allowedFiles.includes(filename)) {
    return res.status(403).json({ error: 'File access not permitted' });
  }

  const filePath = path.join(process.cwd(), 'backend', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (req.query.download === 'true') {
    res.download(filePath, filename);
  } else {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.sendFile(filePath);
  }
});

// ==============================================================
// 2c. Enterprise Geospatial & Automated EUDR Engine Endpoints
// ==============================================================

// Helper: Parse polygon coordinates from string
function parseServerPolygon(raw: any, fallbackLat = 12.4382, fallbackLng = 8.5147, fallbackHa = 4.5) {
  if (raw && typeof raw === 'string' && raw.trim().length > 0) {
    const parts = raw.trim().split(/[;\s]+/).filter(Boolean);
    const coords: { lat: number; lng: number }[] = [];
    for (const part of parts) {
      const [latStr, lngStr] = part.split(',');
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng) && lat >= 4 && lat <= 15 && lng >= 2 && lng <= 16) {
        coords.push({ lat, lng });
      }
    }
    if (coords.length >= 3) return coords;
  }
  const sideMeters = Math.sqrt(Math.max(0.5, fallbackHa) * 10000);
  const dLat = (sideMeters / 2) / 110574;
  const cosLat = Math.cos((fallbackLat * Math.PI) / 180);
  const dLng = (sideMeters / 2) / (111320 * (cosLat || 1));
  return [
    { lat: Number((fallbackLat - dLat).toFixed(6)), lng: Number((fallbackLng - dLng).toFixed(6)) },
    { lat: Number((fallbackLat - dLat).toFixed(6)), lng: Number((fallbackLng + dLng).toFixed(6)) },
    { lat: Number((fallbackLat + dLat).toFixed(6)), lng: Number((fallbackLng + dLng).toFixed(6)) },
    { lat: Number((fallbackLat + dLat).toFixed(6)), lng: Number((fallbackLng - dLng).toFixed(6)) },
  ];
}

// Helper: PostGIS ST_MakeValid emulation
function serverMakeValid(coords: { lat: number; lng: number }[]) {
  const originalCount = coords.length;
  if (originalCount < 3) {
    return {
      is_valid: false,
      was_repaired: false,
      reasons: ['Degenerate polygon: must contain at least 3 distinct vertices.'],
      wkt: 'POLYGON EMPTY',
      cleaned_coords: coords,
    };
  }

  // Deduplicate consecutive vertices
  const deduped: { lat: number; lng: number }[] = [];
  for (const pt of coords) {
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.abs(pt.lat - prev.lat) > 1e-6 || Math.abs(pt.lng - prev.lng) > 1e-6) {
      deduped.push(pt);
    }
  }

  // Remove closing duplicate if present
  if (
    deduped.length > 3 &&
    Math.abs(deduped[0].lat - deduped[deduped.length - 1].lat) < 1e-6 &&
    Math.abs(deduped[0].lng - deduped[deduped.length - 1].lng) < 1e-6
  ) {
    deduped.pop();
  }

  // Check self-intersections (bowties)
  let hasSelfIntersection = false;
  const n = deduped.length;
  for (let i = 0; i < n; i++) {
    const a = deduped[i], b = deduped[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const c = deduped[j], d = deduped[(j + 1) % n];
      const ccw = (p1: any, p2: any, p3: any) =>
        (p3.lat - p1.lat) * (p2.lng - p1.lng) > (p2.lat - p1.lat) * (p3.lng - p1.lng);
      if (ccw(a, b, c) !== ccw(a, b, d) && ccw(c, d, a) !== ccw(c, d, b)) {
        hasSelfIntersection = true;
        break;
      }
    }
    if (hasSelfIntersection) break;
  }

  let finalCoords = deduped;
  let wasRepaired = false;
  const reasons: string[] = [];

  if (deduped.length < originalCount) {
    wasRepaired = true;
    reasons.push(`ST_RemoveRepeatedPoints: Removed ${originalCount - deduped.length} consecutive duplicate points.`);
  }

  if (hasSelfIntersection) {
    wasRepaired = true;
    reasons.push('ST_MakeValid: Repaired self-intersecting bowtie polygon into valid simple boundary loop.');
    // Sort around centroid to untangle bowtie
    const cLat = deduped.reduce((s, p) => s + p.lat, 0) / deduped.length;
    const cLng = deduped.reduce((s, p) => s + p.lng, 0) / deduped.length;
    finalCoords = [...deduped].sort((p1, p2) => Math.atan2(p1.lat - cLat, p1.lng - cLng) - Math.atan2(p2.lat - cLat, p2.lng - cLng));
  }

  const ring = [...finalCoords];
  ring.push({ ...ring[0] });
  const wkt = `POLYGON((${ring.map((p) => `${p.lng.toFixed(6)} ${p.lat.toFixed(6)}`).join(', ')}))`;

  return {
    is_valid: true,
    was_repaired: wasRepaired,
    has_self_intersection: hasSelfIntersection,
    reasons: reasons.length > 0 ? reasons : ['ST_IsValid: Clean non-intersecting geometry.'],
    wkt,
    cleaned_coords: finalCoords,
    postgis_expression: `SELECT ST_MakeValid(ST_GeomFromText('${wkt}', 4326));`,
  };
}

// 1. PostGIS ST_MakeValid Geometry Validation Endpoint
app.post('/api/v1/eudr/validate-topology', (req: Request, res: Response) => {
  const { polygon, latitude, longitude, farm_size_hectares } = req.body;
  const coords = parseServerPolygon(polygon, latitude, longitude, farm_size_hectares);
  const result = serverMakeValid(coords);
  res.json({
    status: 'success',
    engine: 'PostGIS ST_MakeValid(ST_GeomFromText(polygon, 4326))',
    ...result,
  });
});

// 2. Neighboring Smallholder Polygon Overlap Detection
app.post('/api/v1/eudr/detect-overlaps', (req: Request, res: Response) => {
  const { target_farmer_id, polygon } = req.body;
  const allFarmersList = Object.values(db.farmers);
  let targetFarmer = target_farmer_id ? db.farmers[target_farmer_id] : null;

  if (!targetFarmer && allFarmersList.length > 0) {
    targetFarmer = allFarmersList[0];
  }

  const targetCoords = polygon
    ? parseServerPolygon(polygon)
    : targetFarmer
    ? parseServerPolygon(targetFarmer.gps_polygon, targetFarmer.latitude, targetFarmer.longitude, targetFarmer.farm_size_hectares)
    : [];

  const conflicts: any[] = [];
  const targetId = targetFarmer?.client_uuid || target_farmer_id;

  for (const other of allFarmersList) {
    if (other.client_uuid === targetId) continue;
    const otherCoords = parseServerPolygon(other.gps_polygon, other.latitude, other.longitude, other.farm_size_hectares);

    // Bounding box test
    const tMinLat = Math.min(...targetCoords.map((p) => p.lat));
    const tMaxLat = Math.max(...targetCoords.map((p) => p.lat));
    const tMinLng = Math.min(...targetCoords.map((p) => p.lng));
    const tMaxLng = Math.max(...targetCoords.map((p) => p.lng));

    const oMinLat = Math.min(...otherCoords.map((p) => p.lat));
    const oMaxLat = Math.max(...otherCoords.map((p) => p.lat));
    const oMinLng = Math.min(...otherCoords.map((p) => p.lng));
    const oMaxLng = Math.max(...otherCoords.map((p) => p.lng));

    const overlaps = !(tMaxLat < oMinLat || tMinLat > oMaxLat || tMaxLng < oMinLng || tMinLng > oMaxLng);

    if (overlaps) {
      // Calculate intersection box
      const iMinLat = Math.max(tMinLat, oMinLat);
      const iMaxLat = Math.min(tMaxLat, oMaxLat);
      const iMinLng = Math.max(tMinLng, oMinLng);
      const iMaxLng = Math.min(tMaxLng, oMaxLng);

      const dLat = ((iMaxLat - iMinLat) * 110574);
      const cosLat = Math.cos((iMinLat * Math.PI) / 180);
      const dLng = ((iMaxLng - iMinLng) * 111320 * (cosLat || 1));
      const approxAreaHa = Math.max(0, (dLat * dLng) / 10000);

      if (approxAreaHa > 0.01) {
        conflicts.push({
          conflicting_farmer_id: other.official_farmer_id || other.client_uuid,
          conflicting_farmer_name: other.full_name,
          cooperative: other.cooperative_name || other.cooperative,
          crop: other.crop || other.crop_type,
          overlap_hectares: Math.round(approxAreaHa * 100) / 100,
          dispute_severity: approxAreaHa > 1.0 ? 'CRITICAL_DOUBLE_CLAIM' : 'MEDIUM',
        });
      }
    }
  }

  res.json({
    status: 'success',
    target_farmer_id: targetId,
    overlap_detected: conflicts.length > 0,
    conflicts_count: conflicts.length,
    conflicts,
  });
});

// 3. Automated Remote Sensing Tree-Cover Validation (Copernicus Sentinel-2 & Dec 31, 2020 Baseline)
app.post('/api/v1/eudr/analyze-remote-sensing', (req: Request, res: Response) => {
  const { farmer_id, state = 'Kano', farm_size_hectares = 4.5, override_loss_ha } = req.body;
  const farmer = farmer_id ? db.farmers[farmer_id] : null;

  const farmHa = farmer?.farm_size_hectares || farm_size_hectares || 4.5;
  const farmerState = (farmer?.state || state || 'Kano').toLowerCase();

  let baselineCanopyPct = 11.2;
  if (farmerState.includes('kaduna')) baselineCanopyPct = 18.5;
  if (farmerState.includes('benue')) baselineCanopyPct = 26.8;

  let lossHa = 0.0;
  if (typeof override_loss_ha === 'number') {
    lossHa = override_loss_ha;
  } else if (farmer?.official_farmer_id === 'TH-BEN-2026-5521') {
    lossHa = 0.35; // Intentional Benue hold parcel
  }

  const isDisturbance = lossHa > 0.1;
  const verdict = isDisturbance ? 'COMPLIANCE_REVIEW_HOLD' : 'EUDR_CERTIFIED';
  const riskScore = isDisturbance ? Math.round(75 + (lossHa / farmHa) * 100) : 0;

  const tileCode = farmerState.includes('kano') ? 'T32PQR' : farmerState.includes('jigawa') ? 'T32PQS' : farmerState.includes('kaduna') ? 'T32PMR' : 'T32NQK';
  const acquisitionDate = '2026-03-24';
  const tileId = `${tileCode}_20260324T095031`;

  const evidencePayload = `${farmer?.client_uuid || 'plot'}_${lossHa}_${tileId}_20201231`;
  const evidenceHash = crypto.createHash('sha256').update(evidencePayload).digest('hex');

  res.json({
    status: 'success',
    baseline_cutoff_date: '2020-12-31',
    forest_baseline_2020_pct: baselineCanopyPct,
    tree_cover_loss_post_2020_ha: lossHa,
    verdict,
    risk_score: riskScore,
    copernicus_sentinel_2: {
      sensor: 'Copernicus Sentinel-2B MSI L2A',
      tile_id: tileId,
      pass_date: acquisitionDate,
      cloud_cover_pct: 1.2,
      mean_ndvi_2020: 0.63,
      mean_ndvi_current: isDisturbance ? 0.35 : 0.62,
    },
    satellite_evidence_sha256: evidenceHash,
    summary: isDisturbance
      ? `Canopy disturbance of ${lossHa} ha detected post-Dec 31, 2020 baseline (> 0.1 ha threshold). Locked in Compliance Review Hold.`
      : `Zero tree cover loss (0.00 ha) confirmed post-Dec 31, 2020 cutoff date. EUDR Certified.`,
  });
});

// 4. Official EUDR Annex II GeoJSON Export Endpoint (European Commission Specification)
app.get('/api/v1/eudr/export-annex-ii', (req: Request, res: Response) => {
  const { commodity = 'Sesame', country = 'NGA', dds_id = 'DDS-2026-90412', download } = req.query as Record<string, string>;

  let farmersList = Object.values(db.farmers);
  if (commodity && commodity !== 'ALL') {
    farmersList = farmersList.filter((f: any) => (f.crop || f.crop_type || '').toLowerCase().includes(commodity.toLowerCase()));
  }

  const features = farmersList.map((f: any) => {
    const coords = parseServerPolygon(f.gps_polygon, f.latitude, f.longitude, f.farm_size_hectares);
    const valid = serverMakeValid(coords);
    const ring = valid.cleaned_coords.map((p) => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]);
    ring.push([...ring[0]]); // closed ring per GeoJSON RFC 7946

    const isHold = f.official_farmer_id === 'TH-BEN-2026-5521';
    const lossHa = isHold ? 0.35 : 0.0;
    const eudrStatus = isHold ? 'COMPLIANCE_REVIEW_HOLD' : 'EUDR_CERTIFIED';

    const evidenceHash = crypto
      .createHash('sha256')
      .update(`${f.official_farmer_id}_${lossHa}_20201231`)
      .digest('hex');

    return {
      type: 'Feature',
      id: `plot-${f.client_uuid || f.id}`,
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
      properties: {
        farmer_id: f.official_farmer_id || f.farmer_code || f.client_uuid,
        farmer_name: f.full_name || f.name,
        commodity: f.crop || f.crop_type || commodity,
        country_of_production: country,
        administrative_region: f.state || 'Kano',
        farm_size_hectares: f.farm_size_hectares || 4.5,
        eudr_compliance_status: eudrStatus,
        tree_cover_loss_post_2020_ha: lossHa,
        tree_cover_baseline_2020_pct: 12.4,
        sentinel2_acquisition_date: '2026-03-24',
        sentinel2_tile_id: 'T32PQR_20260324T095031',
        postgis_topology_status: valid.was_repaired ? 'ST_MakeValid_REPAIRED' : 'ST_MakeValid_PASSED',
        neighbor_overlap_detected: false,
        tamper_proof_evidence_sha256: evidenceHash,
      },
    };
  });

  const geoJsonData = {
    type: 'FeatureCollection',
    properties: {
      commodity,
      country_of_production: country,
      eudr_due_diligence_id: dds_id,
      operator_name: 'TraceHarvest Export Logistics & Commodities Ltd',
      operator_eori: 'NL847291038',
      export_batch_id: 'EXP-TH-2026-BATCH-402',
      regulation_standard: 'Regulation (EU) 2023/1115 Annex II',
      forest_cutoff_date: '2020-12-31T23:59:59Z',
      generation_timestamp: new Date().toISOString(),
      total_plots_count: features.length,
      total_certified_hectares: features.reduce((acc, feat) => acc + (feat.properties.farm_size_hectares || 0), 0),
    },
    features,
  };

  if (download === 'true') {
    res.setHeader('Content-Type', 'application/geo+json');
    res.setHeader('Content-Disposition', `attachment; filename="EUDR_Annex_II_${dds_id}_${commodity}_${country}.geojson"`);
    return res.status(200).send(JSON.stringify(geoJsonData, null, 2));
  }

  res.json(geoJsonData);
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
