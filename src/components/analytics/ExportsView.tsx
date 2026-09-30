import React from 'react';
import { useData } from '../../context/DataContext';
import { Download, FileSpreadsheet, Database, FileText, CheckCircle2 } from 'lucide-react';

export const ExportsView: React.FC = () => {
  const { farmers, practices, batches, syncLogs } = useData();

  const handleExportFarmers = () => {
    let csv = 'Official Farmer ID,Client UUID,Full Name,Phone,State,LGA,Community,Crop,Hectares,Latitude,Longitude,Agent ID\n';
    farmers.forEach((f) => {
      csv += `"${f.official_farmer_id}","${f.client_uuid}","${f.full_name}","${f.phone_number}","${f.state}","${f.lga}","${f.community || ''}","${f.crop}","${f.farm_size_hectares}","${f.latitude}","${f.longitude}","${f.agent_id}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traceharvest_farmers_registry_${Date.now()}.csv`;
    link.click();
  };

  const handleExportBatches = () => {
    let csv = 'Batch Number,Crop,Destination,Tonnage,Status,Tamper Proof SHA256\n';
    batches.forEach((b) => {
      csv += `"${b.batch_number}","${b.crop}","${b.destination}","${b.estimated_tonnage}","${b.export_clearance_status}","${b.tamper_proof_sha256}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traceharvest_batches_registry_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Data Export Center
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Export structured compliance datasets into CSV, JSON, SQLite offline pre-seed formats for government regulators and trading partners.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Export 1: Farmers Registry */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#1B7F4B]" />
            <h3 className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
              Farmers Registry Dataset
            </h3>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            Full registry including cryptographic UUIDs, official farmer codes, phone numbers, state/LGA, crop, and centroid GPS coordinates.
          </p>
          <span className="text-xs font-mono text-[#6B7280] block">
            Records: {farmers.length} smallholders
          </span>
          <button
            onClick={handleExportFarmers}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Farmers CSV
          </button>
        </div>

        {/* Export 2: Export Batches */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#2563EB]" />
            <h3 className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
              Consignment Batches & Passports
            </h3>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            Batch lot numbers, destination ports, certified tonnages, container markings, and tamper-proof SHA-256 digital seals.
          </p>
          <span className="text-xs font-mono text-[#6B7280] block">
            Records: {batches.length} export lots
          </span>
          <button
            onClick={handleExportBatches}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download Batches CSV
          </button>
        </div>

        {/* Export 3: Offline Mobile Room Seed */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-sm text-[#111827] dark:text-[#F1F5F9]">
              Android Offline SQLite Seed
            </h3>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            Pre-seed bundle in JSON for Android Room SQLite to deploy on field tablets without consuming high cellular data in rural zones.
          </p>
          <span className="text-xs font-mono text-[#6B7280] block">
            Schema: v1.0 Offline Pre-seed
          </span>
          <a
            href="/api/v1/mobile/download/offline-seed.json"
            download="traceharvest_offline_seed.json"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-[#111827] dark:text-[#F1F5F9] transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Seed JSON
          </a>
        </div>
      </div>
    </div>
  );
};
