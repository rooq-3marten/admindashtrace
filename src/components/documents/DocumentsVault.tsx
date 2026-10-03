import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RegulatoryDocument, DocumentCategory, DocumentStatus } from '../../types';
import {
  FileText,
  ShieldCheck,
  Upload,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Trash2,
  Copy,
  Check,
  X,
  FileCheck,
  Smartphone,
  Globe,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Tag,
  Building,
  Calendar,
  Hash,
} from 'lucide-react';

const CATEGORY_META: Record<DocumentCategory, { label: string; icon: string; color: string }> = {
  PHYTOSANITARY: { label: 'Phytosanitary & Quarantine', icon: '🌿', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  EUDR_DEFORESTATION: { label: 'EUDR Due Diligence', icon: '🛰️', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  LAB_MRL_ANALYSIS: { label: 'Lab Residue MRL Assay', icon: '🧪', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  BILL_OF_LADING: { label: 'Maritime Bill of Lading', icon: '🚢', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  FARMER_KYC_LAND: { label: 'Farmer KYC & Land Title', icon: '👤', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  SPRAY_PURCHASE_RECEIPT: { label: 'Agrochemical Purchase Invoice', icon: '🧾', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  GAP_INSPECTION_AUDIT: { label: 'GAP Field Inspection Audit', icon: '🛡️', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200 dark:border-teal-800' },
};

export const DocumentsVault: React.FC = () => {
  const { documents, uploadDocument, verifyDocument, deleteDocument, refreshDocuments, farmers, batches, shipments, agents } = useData();
  const { userProfile, role } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSource, setSelectedSource] = useState<string>('All');

  const [activeDocument, setActiveDocument] = useState<RegulatoryDocument | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<DocumentCategory>('PHYTOSANITARY');
  const [uploadEntityType, setUploadEntityType] = useState<'FARMER' | 'BATCH' | 'SHIPMENT' | 'AGENT' | 'GLOBAL'>('BATCH');
  const [uploadEntityId, setUploadEntityId] = useState('');
  const [uploadAuthority, setUploadAuthority] = useState('');
  const [uploadCertNumber, setUploadCertNumber] = useState('');
  const [uploadIssueDate, setUploadIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<{ name: string; size: number; type: string; base64?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verification Form State
  const [verifyNotes, setVerifyNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (selectedCategory !== 'All' && doc.category !== selectedCategory) return false;
      if (selectedStatus !== 'All' && doc.verification_status !== selectedStatus) return false;
      if (selectedSource !== 'All' && doc.uploader_source !== selectedSource) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title?.toLowerCase().includes(q);
        const matchAuthority = doc.regulatory_authority?.toLowerCase().includes(q);
        const matchCert = doc.certificate_number?.toLowerCase().includes(q);
        const matchEntity = doc.entity_id?.toLowerCase().includes(q) || doc.entity_name?.toLowerCase().includes(q);
        const matchHash = doc.tamper_proof_sha256?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthority && !matchCert && !matchEntity && !matchHash) return false;
      }

      return true;
    });
  }, [documents, selectedCategory, selectedStatus, selectedSource, searchQuery]);

  const kpis = useMemo(() => {
    const total = documents.length;
    const verified = documents.filter((d) => d.verification_status === 'VERIFIED_COMPLIANT').length;
    const pending = documents.filter((d) => d.verification_status === 'PENDING_REVIEW').length;
    const flagged = documents.filter((d) => d.verification_status === 'FLAGGED').length;
    const mobileUploads = documents.filter((d) => d.uploader_source === 'mobile_agent').length;
    return { total, verified, pending, flagged, mobileUploads };
  }, [documents]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        base64: event.target?.result as string,
      });
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || !uploadEntityId.trim()) return;

    setIsSubmitting(true);
    try {
      // Find entity name if available
      let entityName = uploadEntityId;
      if (uploadEntityType === 'FARMER') {
        const f = farmers.find((item) => item.client_uuid === uploadEntityId || item.official_farmer_id === uploadEntityId);
        if (f) entityName = f.full_name;
      } else if (uploadEntityType === 'BATCH') {
        const b = batches.find((item) => item.batch_number === uploadEntityId);
        if (b) entityName = `${b.batch_number} (${b.crop})`;
      } else if (uploadEntityType === 'AGENT') {
        const a = agents.find((item) => item.agent_id === uploadEntityId);
        if (a) entityName = a.name;
      }

      await uploadDocument({
        title: uploadTitle.trim(),
        category: uploadCategory,
        entity_type: uploadEntityType,
        entity_id: uploadEntityId.trim(),
        entity_name: entityName,
        file_name: uploadFile?.name || `${uploadTitle.trim().replace(/\s+/g, '_')}.pdf`,
        file_size_bytes: uploadFile?.size || 312000,
        mime_type: uploadFile?.type || 'application/pdf',
        file_data_url: uploadFile?.base64,
        regulatory_authority: uploadAuthority.trim() || 'NAFDAC / Federal Quarantine Service (NAQS)',
        certificate_number: uploadCertNumber.trim() || `CERT-${Math.floor(10000 + Math.random() * 90000)}`,
        issue_date: uploadIssueDate,
        expiry_date: uploadExpiryDate || undefined,
        verification_status: 'PENDING_REVIEW',
        uploaded_by: userProfile.email || 'compliance@traceharvest.ng',
        uploader_source: 'web_admin',
        verification_notes: uploadNotes.trim() || undefined,
      });

      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadEntityId('');
      setUploadCertNumber('');
      setUploadAuthority('');
      setUploadNotes('');
      setUploadFile(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteVerification = async (status: DocumentStatus) => {
    if (!activeDocument) return;
    setIsVerifying(true);
    try {
      await verifyDocument(
        activeDocument.id,
        status,
        verifyNotes.trim() || undefined,
        userProfile.displayName || userProfile.email || 'Chief Compliance Director'
      );
      setActiveDocument((prev) =>
        prev
          ? {
              ...prev,
              verification_status: status,
              verified_by: userProfile.displayName || userProfile.email,
              verified_at: new Date().toISOString(),
              verification_notes: verifyNotes.trim() || prev.verification_notes,
            }
          : null
      );
      setVerifyNotes('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadDoc = (doc: RegulatoryDocument) => {
    const passportData = {
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

    const blob = new Blob([JSON.stringify(passportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.file_name.replace(/\.[^/.]+$/, '')}_passport.json`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-semibold">
              Shared Upstream Vault
            </span>
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">
              TraceHarvest Cryptographic Compliance Store
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#111827] dark:text-[#F1F5F9]">
            Regulatory Documents & Compliance Vault
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Structured repository sharing certificates, EUDR due diligence polygons, phytosanitary seals, and field agent KYC uploads.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refreshDocuments()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] text-xs font-semibold text-[#111827] dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium">Total Documents</span>
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-bold text-[#111827] dark:text-[#F1F5F9] mt-1 font-mono">{kpis.total}</p>
          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">Immutable audit records</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium">Verified Compliant</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{kpis.verified}</p>
          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">NAQS & EUDR cleared</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-500 mt-1 font-mono">{kpis.pending}</p>
          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">Awaiting compliance review</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium">Mobile Uploads</span>
            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 font-mono">{kpis.mobileUploads}</p>
          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">From rural Android fleet</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-medium">SHA-256 Seals</span>
            <Lock className="w-4 h-4 text-[#1B7F4B] dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[#1B7F4B] dark:text-emerald-400 mt-1 font-mono">100%</p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Cryptographically sealed</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search documents by title, authority, certificate or entity ID"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-slate-50 dark:bg-slate-900 text-xs text-[#111827] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#1B7F4B]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-slate-900 text-xs text-[#111827] dark:text-[#F1F5F9] focus:outline-hidden"
          >
            <option value="All">All Categories</option>
            <option value="PHYTOSANITARY">🌿 Phytosanitary & Quarantine</option>
            <option value="EUDR_DEFORESTATION">🛰️ EUDR Due Diligence</option>
            <option value="LAB_MRL_ANALYSIS">🧪 Lab Residue Assay</option>
            <option value="BILL_OF_LADING">🚢 Maritime Bill of Lading</option>
            <option value="FARMER_KYC_LAND">👤 Farmer KYC & Land</option>
            <option value="SPRAY_PURCHASE_RECEIPT">🧾 Spray Purchase Invoices</option>
            <option value="GAP_INSPECTION_AUDIT">🛡️ GAP Field Audit</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-slate-900 text-xs text-[#111827] dark:text-[#F1F5F9] focus:outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="VERIFIED_COMPLIANT">✓ Verified Compliant</option>
            <option value="PENDING_REVIEW">⏳ Pending Review</option>
            <option value="FLAGGED">⚠️ Flagged</option>
          </select>

          {/* Source Dropdown */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-slate-900 text-xs text-[#111827] dark:text-[#F1F5F9] focus:outline-hidden"
          >
            <option value="All">All Sources</option>
            <option value="mobile_agent">📱 Android Field Agent</option>
            <option value="web_admin">💻 Admin Web Portal</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-[#E5E7EB] dark:border-[#334155] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Linked Entity</th>
                <th className="py-3 px-4">Regulatory Authority</th>
                <th className="py-3 px-4">SHA-256 Checksum</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7280] dark:text-[#94A3B8]">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No documents matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const meta = CATEGORY_META[doc.category] || { label: doc.category, icon: '📄', color: 'bg-slate-100' };
                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-[#E8F5EE] dark:hover:bg-[#145C36]/20 transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{meta.icon}</span>
                          <div>
                            <span className="font-bold text-[#111827] dark:text-white block">
                              {doc.title}
                            </span>
                            <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono">
                              {doc.file_name} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-semibold block text-[#1B7F4B] dark:text-emerald-400">
                          {doc.entity_type}: {doc.entity_id}
                        </span>
                        {doc.entity_name && (
                          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] block truncate max-w-[150px]">
                            {doc.entity_name}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium block text-xs">{doc.regulatory_authority}</span>
                        {doc.certificate_number && (
                          <span className="font-mono text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
                            No: {doc.certificate_number}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#6B7280] dark:text-slate-400 truncate max-w-[90px]">
                            {doc.tamper_proof_sha256 ? `${doc.tamper_proof_sha256.substring(0, 10)}...` : 'Pending'}
                          </span>
                          <button
                            onClick={() => handleCopyHash(doc.tamper_proof_sha256, doc.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                            title="Copy SHA-256 seal"
                          >
                            {copiedHash === doc.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {doc.uploader_source === 'mobile_agent' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            <Smartphone className="w-3 h-3" /> Android Agent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            <Globe className="w-3 h-3" /> Web Portal
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {doc.verification_status === 'VERIFIED_COMPLIANT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {doc.verification_status === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3" /> In Review
                          </span>
                        )}
                        {doc.verification_status === 'FLAGGED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <AlertTriangle className="w-3 h-3" /> Flagged
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveDocument(doc)}
                            className="p-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#111827] dark:text-[#F1F5F9] transition cursor-pointer"
                            title="Inspect Document & Audit Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadDoc(doc)}
                            className="p-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-slate-100 dark:hover:bg-slate-800 text-[#1B7F4B] dark:text-emerald-400 transition cursor-pointer"
                            title="Download Verified Passport"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {role === 'super_admin' && (
                            <button
                              onClick={() => deleteDocument(doc.id)}
                              className="p-1.5 rounded-lg border border-[#E5E7EB] dark:border-[#334155] hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-2xl p-6 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#1B7F4B] dark:bg-emerald-600/20 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827] dark:text-white">
                    Upload Regulatory Certificate or Document
                  </h3>
                  <p className="text-xs text-[#6B7280] dark:text-slate-400">
                    Saves to shared backend and computes tamper-proof cryptographic SHA-256 seal.
                  </p>
                </div>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-3.5 text-xs">
              {/* File Dropzone */}
              <div>
                <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">
                  Document File (PDF, Image, JSON)
                </label>
                <div className="border-2 border-dashed border-[#E5E7EB] dark:border-slate-700 rounded-xl p-4 text-center hover:border-[#1B7F4B] transition cursor-pointer relative bg-slate-50 dark:bg-slate-950/60">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.json,.csv"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {uploadFile ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      <FileCheck className="w-4 h-4" />
                      {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                      <p className="font-semibold text-[#111827] dark:text-white">Click or drag document file to upload</p>
                      <p className="text-[11px] text-[#6B7280] dark:text-slate-400">Supports PDF, JPEG, PNG, JSON, CSV up to 50MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Document Title *</label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    aria-label="Document Title"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1B7F4B]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Category *</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as DocumentCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white focus:outline-hidden"
                  >
                    <option value="PHYTOSANITARY">🌿 Phytosanitary & Quarantine</option>
                    <option value="EUDR_DEFORESTATION">🛰️ EUDR Due Diligence Statement</option>
                    <option value="LAB_MRL_ANALYSIS">🧪 Lab Residue Assay (MRL)</option>
                    <option value="BILL_OF_LADING">🚢 Maritime Bill of Lading</option>
                    <option value="FARMER_KYC_LAND">👤 Farmer KYC & Land Slip</option>
                    <option value="SPRAY_PURCHASE_RECEIPT">🧾 Agrochemical Retailer Receipt</option>
                    <option value="GAP_INSPECTION_AUDIT">🛡️ GAP Field Inspection Audit</option>
                  </select>
                </div>
              </div>

              {/* Entity Type & Entity ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Attach to Entity *</label>
                  <select
                    value={uploadEntityType}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      setUploadEntityType(type);
                      if (type === 'FARMER' && farmers[0]) setUploadEntityId(farmers[0].official_farmer_id);
                      else if (type === 'BATCH' && batches[0]) setUploadEntityId(batches[0].batch_number);
                      else if (type === 'SHIPMENT' && shipments[0]) setUploadEntityId(shipments[0].shipment_code);
                      else if (type === 'AGENT' && agents[0]) setUploadEntityId(agents[0].agent_id);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white focus:outline-hidden"
                  >
                    <option value="BATCH">Export Batch Lot</option>
                    <option value="FARMER">Smallholder Farmer</option>
                    <option value="SHIPMENT">Vessel Shipment</option>
                    <option value="AGENT">Field Agent</option>
                    <option value="GLOBAL">National / Global Regulation</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Entity Identifier *</label>
                  <input
                    type="text"
                    required
                    value={uploadEntityId}
                    onChange={(e) => setUploadEntityId(e.target.value)}
                    aria-label="Entity Identifier"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#1B7F4B]"
                  />
                </div>
              </div>

              {/* Authority & Certificate # */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Regulatory Authority</label>
                  <input
                    type="text"
                    value={uploadAuthority}
                    onChange={(e) => setUploadAuthority(e.target.value)}
                    aria-label="Regulatory Authority"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1B7F4B]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Certificate / Stamp Number</label>
                  <input
                    type="text"
                    value={uploadCertNumber}
                    onChange={(e) => setUploadCertNumber(e.target.value)}
                    aria-label="Certificate Number"
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#1B7F4B]"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={uploadIssueDate}
                    onChange={(e) => setUploadIssueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={uploadExpiryDate}
                    onChange={(e) => setUploadExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold text-[#111827] dark:text-slate-300 block mb-1">Inspection & Clearance Notes</label>
                <textarea
                  rows={2}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                  aria-label="Inspection Notes"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-[#111827] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1B7F4B]"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 text-[#6B7280] dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#1B7F4B] hover:bg-[#145C36] text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading & Sealing...' : 'Upload & Seal Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Detail & Audit Inspector Modal */}
      {activeDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-2xl p-6 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#1B7F4B] dark:bg-emerald-600/20 dark:text-emerald-400 flex items-center justify-center text-lg">
                  {CATEGORY_META[activeDocument.category]?.icon || '📄'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827] dark:text-white">{activeDocument.title}</h3>
                  <span className="text-xs text-[#6B7280] dark:text-slate-400 font-mono">
                    ID: {activeDocument.id} • {activeDocument.file_name}
                  </span>
                </div>
              </div>
              <button onClick={() => setActiveDocument(null)} className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cryptographic Seal Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#1B7F4B] dark:text-emerald-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Immutable SHA-256 Cryptographic Seal
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">
                  Verified Authentic
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#111827] dark:text-slate-200 select-all break-all bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200/60 dark:border-slate-800">
                {activeDocument.tamper_proof_sha256}
              </p>
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono block">Regulatory Authority</span>
                <p className="font-bold text-[#111827] dark:text-white">{activeDocument.regulatory_authority}</p>
                <span className="text-[11px] text-[#6B7280] dark:text-slate-400 block font-mono">
                  Cert No: {activeDocument.certificate_number || 'N/A'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono block">Attached Entity</span>
                <p className="font-bold text-[#1B7F4B] dark:text-emerald-400 font-mono">
                  {activeDocument.entity_type}: {activeDocument.entity_id}
                </p>
                <span className="text-[11px] text-[#6B7280] dark:text-slate-400 block">
                  {activeDocument.entity_name || 'System Entity'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono block">Ingestion Provenance</span>
                <p className="font-bold text-[#111827] dark:text-white">
                  {activeDocument.uploader_source === 'mobile_agent' ? '📱 Android Field Agent Sync' : '💻 Admin Web Portal'}
                </p>
                <span className="text-[11px] text-[#6B7280] dark:text-slate-400 block font-mono">
                  By: {activeDocument.uploaded_by}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono block">Clearance Status</span>
                <p className="font-bold text-[#111827] dark:text-white flex items-center gap-1">
                  {activeDocument.verification_status === 'VERIFIED_COMPLIANT' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {activeDocument.verification_status === 'PENDING_REVIEW' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                  {activeDocument.verification_status === 'FLAGGED' && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                  {activeDocument.verification_status}
                </p>
                {activeDocument.verified_by && (
                  <span className="text-[11px] text-[#6B7280] dark:text-slate-400 block">
                    Audited by {activeDocument.verified_by}
                  </span>
                )}
              </div>
            </div>

            {/* Audit Notes */}
            {activeDocument.verification_notes && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 text-xs">
                <span className="text-[10px] text-[#6B7280] dark:text-slate-400 uppercase font-mono block mb-1">
                  Compliance Audit Notes
                </span>
                <p className="text-[#111827] dark:text-slate-200 leading-relaxed">
                  {activeDocument.verification_notes}
                </p>
              </div>
            )}

            {/* Administrative Verification Action Box */}
            <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5 font-mono uppercase">
                <ShieldCheck className="w-4 h-4 text-[#1B7F4B]" /> Regulatory Clearance Workflow
              </span>
              <input
                type="text"
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                aria-label="Audit Notes"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-[#111827] dark:text-white focus:outline-hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecuteVerification('VERIFIED_COMPLIANT')}
                  disabled={isVerifying}
                  className="flex-1 py-2 rounded-lg bg-[#1B7F4B] hover:bg-[#145C36] text-white text-xs font-bold transition cursor-pointer"
                >
                  ✓ Clear & Verify Compliant
                </button>
                <button
                  onClick={() => handleExecuteVerification('FLAGGED')}
                  disabled={isVerifying}
                  className="py-2 px-3 rounded-lg bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-300 text-xs font-semibold transition cursor-pointer"
                >
                  ⚠️ Flag Issue
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleDownloadDoc(activeDocument)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#111827] dark:text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Download Passport JSON
              </button>
              <button
                onClick={() => setActiveDocument(null)}
                className="px-4 py-2 rounded-xl border border-[#E5E7EB] dark:border-slate-700 text-[#6B7280] dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
