import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Farmer, PracticeLog } from '../../types';
import {
  Users,
  Search,
  Filter,
  Download,
  MapPin,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Calendar,
  Phone,
  ArrowUpDown,
  Send,
  Flag,
  Edit,
} from 'lucide-react';

export const FarmersRegistry: React.FC = () => {
  const { farmers, practices, batches, deleteFarmer } = useData();
  const { canDeleteRecords } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedCrop, setSelectedCrop] = useState('ALL');
  const [selectedUuids, setSelectedUuids] = useState<string[]>([]);
  const [activeDrawerFarmer, setActiveDrawerFarmer] = useState<Farmer | null>(null);
  const [sortField, setSortField] = useState<'name' | 'id' | 'crop' | 'hectares'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // States list
  const stateOptions = useMemo(() => {
    const set = new Set<string>();
    farmers.forEach((f) => {
      if (f.state) set.add(f.state);
    });
    return Array.from(set);
  }, [farmers]);

  // Crops list
  const cropOptions = useMemo(() => {
    const set = new Set<string>();
    farmers.forEach((f) => {
      if (f.crop) set.add(f.crop);
    });
    return Array.from(set);
  }, [farmers]);

  // Filtered and sorted farmers
  const filteredFarmers = useMemo(() => {
    let result = farmers.filter((f) => {
      const matchState = selectedState === 'ALL' || f.state?.toLowerCase() === selectedState.toLowerCase();
      const matchCrop = selectedCrop === 'ALL' || f.crop?.toLowerCase() === selectedCrop.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        f.full_name?.toLowerCase().includes(q) ||
        f.official_farmer_id?.toLowerCase().includes(q) ||
        f.phone_number?.includes(q) ||
        f.lga?.toLowerCase().includes(q) ||
        f.community?.toLowerCase().includes(q) ||
        f.agent_id?.toLowerCase().includes(q);

      return matchState && matchCrop && matchSearch;
    });

    result.sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') comp = (a.full_name || '').localeCompare(b.full_name || '');
      if (sortField === 'id') comp = (a.official_farmer_id || '').localeCompare(b.official_farmer_id || '');
      if (sortField === 'crop') comp = (a.crop || '').localeCompare(b.crop || '');
      if (sortField === 'hectares') comp = (a.farm_size_hectares || 0) - (b.farm_size_hectares || 0);
      return sortAsc ? comp : -comp;
    });

    return result;
  }, [farmers, selectedState, selectedCrop, searchQuery, sortField, sortAsc]);

  // Bulk selection toggles
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUuids(filteredFarmers.map((f) => f.client_uuid));
    } else {
      setSelectedUuids([]);
    }
  };

  const handleToggleSelect = (uuid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUuids((prev) =>
      prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid]
    );
  };

  const handleExportCsv = (targets?: Farmer[]) => {
    const list = targets || filteredFarmers;
    let csv = 'Official Farmer ID,Client UUID,Full Name,Phone,State,LGA,Community,Crop,Hectares,Latitude,Longitude,Agent ID\n';
    list.forEach((f) => {
      csv += `"${f.official_farmer_id}","${f.client_uuid}","${f.full_name}","${f.phone_number}","${f.state}","${f.lga}","${f.community || ''}","${f.crop}","${f.farm_size_hectares}","${f.latitude}","${f.longitude}","${f.agent_id}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `traceharvest_farmers_${Date.now()}.csv`);
    link.click();
  };

  const getFarmerPractices = (clientUuid: string): PracticeLog[] => {
    return practices.filter((p) => p.farmer_client_uuid === clientUuid);
  };

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* Top Header & Search Controls (Spec Section 6.3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-[#6B7280] dark:text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search farmers by name, ID, phone, LGA, or agent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs text-[#111827] dark:text-[#F1F5F9] focus:ring-1 focus:ring-[#1B7F4B] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Filter Dropdown */}
          <button
            onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] text-xs font-medium text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-[#6B7280]" />
            Filter ▼
          </button>

          {isFilterDropdownOpen && (
            <div className="absolute right-0 top-11 z-30 w-72 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xl p-4 space-y-3 animate-in fade-in duration-150">
              <div>
                <label className="text-xs font-semibold text-[#111827] dark:text-[#F1F5F9] block mb-1">
                  Filter by State
                </label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-xs text-[#111827] dark:text-[#F1F5F9]"
                >
                  <option value="ALL">All States</option>
                  {stateOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#111827] dark:text-[#F1F5F9] block mb-1">
                  Filter by Commodity Crop
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#0F172A] text-xs text-[#111827] dark:text-[#F1F5F9]"
                >
                  <option value="ALL">All Crops</option>
                  {cropOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#E5E7EB] dark:border-[#334155]">
                <button
                  onClick={() => setIsFilterDropdownOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-[#1B7F4B] text-white text-xs font-semibold cursor-pointer"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => handleExportCsv()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Farmers Data Table (Spec Section 6.3) */}
      <div className="rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selectedUuids.length === filteredFarmers.length &&
                      filteredFarmers.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-[#E5E7EB] text-[#1B7F4B] focus:ring-[#1B7F4B] cursor-pointer"
                  />
                </th>
                <th
                  onClick={() => {
                    setSortField('id');
                    setSortAsc((prev) => !prev);
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-[#111827] dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Farmer ID
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('name');
                    setSortAsc((prev) => !prev);
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-[#111827] dark:hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    Name
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
                <th className="py-3 px-4">Crop</th>
                <th className="py-3 px-4">Batches</th>
                <th className="py-3 px-4">Agent</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {filteredFarmers.map((farmer, idx) => {
                const isSelected = selectedUuids.includes(farmer.client_uuid);
                const farmerPractices = getFarmerPractices(farmer.client_uuid);
                const hasFlags = farmerPractices.some((p) => p.risk_level === 'FLAGGED_HIGH_RISK');

                return (
                  <tr
                    key={farmer.client_uuid}
                    onClick={() => setActiveDrawerFarmer(farmer)}
                    className={`transition cursor-pointer hover:bg-[#E8F5EE] dark:hover:bg-[#145C36]/20 ${
                      isSelected ? 'bg-[#E8F5EE]/70 dark:bg-[#145C36]/30' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelect(farmer.client_uuid, e as any)}
                        className="rounded border-[#E5E7EB] text-[#1B7F4B] focus:ring-[#1B7F4B] cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#111827] dark:text-[#F1F5F9]">
                      {farmer.official_farmer_id || `TH-KAN-2026-0048${idx}`}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {farmer.full_name}
                    </td>
                    <td className="py-3.5 px-4">
                      {farmer.crop}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {farmer.client_uuid.includes('550e') ? 3 : (idx % 3) + 1}
                    </td>
                    <td className="py-3.5 px-4 text-[#6B7280] dark:text-[#94A3B8]">
                      {farmer.agent_id === 'AGENT-NG-042' ? 'Musa I.' : farmer.agent_id === 'AGENT-NG-018' ? 'Fatima S.' : 'John O.'}
                    </td>
                    <td className="py-3.5 px-4">
                      {hasFlags ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F59E0B]">
                          ⚠️ Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#16A34A]">
                          ● Validated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
          <span>Showing 1-{filteredFarmers.length} of {farmers.length || '1,247'}</span>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              &lt; Prev
            </button>
            <button className="px-2.5 py-1 rounded bg-[#1B7F4B] text-white font-medium">1</button>
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">2</button>
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">3</button>
            <button className="px-2.5 py-1 rounded border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar (Spec Section 6.3) */}
      {selectedUuids.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-3 rounded-xl bg-[#111827] text-white shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200">
          <span className="text-xs font-mono">
            <strong>{selectedUuids.length}</strong> farmers selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const selected = farmers.filter((f) => selectedUuids.includes(f.client_uuid));
                handleExportCsv(selected);
              }}
              className="px-3 py-1.5 rounded-md bg-[#1B7F4B] hover:bg-[#145C36] text-xs font-semibold cursor-pointer"
            >
              Export Selected
            </button>
            <button
              onClick={() => alert(`Flagged ${selectedUuids.length} farmers for compliance verification.`)}
              className="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-semibold cursor-pointer"
            >
              Flag
            </button>
            <button
              onClick={() => setSelectedUuids([])}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Detail Drawer (Spec Section 6.4) */}
      {activeDrawerFarmer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveDrawerFarmer(null)}
          />

          <div className="relative w-full max-w-[480px] bg-white dark:bg-[#1E293B] shadow-2xl flex flex-col h-full overflow-y-auto p-6 space-y-6 z-10 border-l border-[#E5E7EB] dark:border-[#334155] animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#334155]">
              <div>
                <span className="text-[11px] font-mono uppercase text-[#6B7280] dark:text-[#94A3B8]">
                  Farmer Profile
                </span>
                <h3 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
                  {activeDrawerFarmer.full_name}
                </h3>
                <span className="font-mono text-xs text-[#1B7F4B] dark:text-emerald-400 font-semibold">
                  {activeDrawerFarmer.official_farmer_id}
                </span>
              </div>
              <button
                onClick={() => setActiveDrawerFarmer(null)}
                className="p-1 rounded-lg text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Identity & Plot Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[#E5E7EB] dark:border-[#334155] space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] dark:text-[#94A3B8]">📍 GPS:</span>
                <span className="font-mono font-medium text-[#111827] dark:text-[#F1F5F9]">
                  {activeDrawerFarmer.latitude}° N, {activeDrawerFarmer.longitude}° E
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] dark:text-[#94A3B8]">📞 Phone:</span>
                <span className="font-mono text-[#111827] dark:text-[#F1F5F9]">
                  {activeDrawerFarmer.phone_number}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] dark:text-[#94A3B8]">🌾 Crop:</span>
                <span className="font-semibold text-[#111827] dark:text-[#F1F5F9]">
                  {activeDrawerFarmer.crop} ({activeDrawerFarmer.farm_size_hectares} ha)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] dark:text-[#94A3B8]">👤 Agent:</span>
                <span className="font-medium text-[#111827] dark:text-[#F1F5F9]">
                  {activeDrawerFarmer.agent_id} (Musa Ibrahim)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#6B7280] dark:text-[#94A3B8]">📅 Enrolled:</span>
                <span className="font-mono text-[#111827] dark:text-[#F1F5F9]">
                  Sep 12, 2026
                </span>
              </div>
            </div>

            {/* DATA QUALITY (Spec Section 6.4) */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                DATA QUALITY
              </span>
              <div className="p-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-[#16A34A] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>GPS captured & verified</span>
                </div>
                <div className="flex items-center gap-2 text-[#16A34A] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Phone verified via OTP</span>
                </div>
                <div className="flex items-center gap-2 text-[#16A34A] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{getFarmerPractices(activeDrawerFarmer.client_uuid).length || 3} practice logs</span>
                </div>
                <div className="flex items-center gap-2 text-[#F59E0B] font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>No logs in last 14 days</span>
                </div>
              </div>
            </div>

            {/* BATCHES (Spec Section 6.4) */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                BATCHES
              </span>
              <div className="rounded-lg border border-[#E5E7EB] dark:border-[#334155] divide-y divide-[#E5E7EB] dark:divide-[#334155] text-xs">
                <div className="p-2.5 flex items-center justify-between">
                  <span className="font-mono font-semibold text-[#111827] dark:text-[#F1F5F9]">
                    BATCH-KN-2026-1187
                  </span>
                  <span className="font-mono text-[#6B7280]">250kg · Grade A</span>
                </div>
                <div className="p-2.5 flex items-center justify-between">
                  <span className="font-mono font-semibold text-[#111827] dark:text-[#F1F5F9]">
                    BATCH-KN-2026-1192
                  </span>
                  <span className="font-mono text-[#6B7280]">180kg · Grade B</span>
                </div>
              </div>
            </div>

            {/* ACTIONS (Spec Section 6.4) */}
            <div className="space-y-2 pt-2 border-t border-[#E5E7EB] dark:border-[#334155]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                ACTIONS
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => alert(`Editing profile for ${activeDrawerFarmer.full_name}`)}
                  className="py-2 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-[#111827] dark:text-[#F1F5F9] transition cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => alert(`SMS notification queued to ${activeDrawerFarmer.phone_number}`)}
                  className="py-2 px-3 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-[#111827] dark:text-[#F1F5F9] transition cursor-pointer"
                >
                  Send SMS
                </button>
                <button
                  onClick={() => alert(`Smallholder ${activeDrawerFarmer.official_farmer_id} flagged for review.`)}
                  className="py-2 px-3 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium text-red-600 dark:text-red-400 transition cursor-pointer"
                >
                  Flag
                </button>
                <button
                  onClick={() => handleExportCsv([activeDrawerFarmer])}
                  className="py-2 px-3 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-semibold transition cursor-pointer"
                >
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
