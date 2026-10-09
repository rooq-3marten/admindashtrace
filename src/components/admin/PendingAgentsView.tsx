/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TraceHarvest Admin Portal - Field Agent Approval & Verification Desk
 * Allows compliance officers and administrators to inspect self-registered mobile field agents,
 * verify cooperative associations, and approve, reject, suspend, or reinstate accounts.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  UserCheck,
  UserMinus,
  MagnifyingGlass,
  Funnel,
  ArrowsClockwise,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Warning,
  Prohibit,
  ArrowClockwise,
  Envelope,
  Phone,
  MapPin,
  Buildings,
  CalendarBlank,
  ClockCounterClockwise,
  CaretLeft,
  CaretRight,
  Info,
} from '@phosphor-icons/react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RegisteredAgent, AgentStatus } from '../../types';

export const PendingAgentsView: React.FC = () => {
  const {
    registeredAgents,
    pendingAgentsCount,
    fetchRegisteredAgents,
    approveAgent,
    rejectAgent,
    suspendAgent,
    reinstateAgent,
    agentAuditLogs,
    fetchAgentAuditLogs,
  } = useData();
  const { userProfile } = useAuth();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AgentStatus | 'all'>('pending');
  const [selectedAssociation, setSelectedAssociation] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal / Detail States
  const [selectedAgent, setSelectedAgent] = useState<RegisteredAgent | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTabInModal, setActiveTabInModal] = useState<'details' | 'audit'>('details');

  // Action Dialog States
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'reinstate' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch latest data on load
  useEffect(() => {
    fetchRegisteredAgents();
  }, [fetchRegisteredAgents]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchRegisteredAgents();
      if (selectedAgent) {
        await fetchAgentAuditLogs(selectedAgent.id);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Derive unique associations and locations for dropdown filters
  const uniqueAssociations = useMemo(() => {
    const set = new Set<string>();
    registeredAgents.forEach((a) => {
      if (a.association) set.add(a.association);
    });
    return Array.from(set).sort();
  }, [registeredAgents]);

  const uniqueLocations = useMemo(() => {
    const set = new Set<string>();
    registeredAgents.forEach((a) => {
      if (a.location) set.add(a.location);
    });
    return Array.from(set).sort();
  }, [registeredAgents]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const pending = registeredAgents.filter((a) => a.status === 'pending').length;
    const approved = registeredAgents.filter((a) => a.status === 'approved').length;
    const rejected = registeredAgents.filter((a) => a.status === 'rejected').length;
    const suspended = registeredAgents.filter((a) => a.status === 'suspended').length;
    return { pending, approved, rejected, suspended, total: registeredAgents.length };
  }, [registeredAgents]);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return registeredAgents.filter((agent) => {
      // Status filter
      if (selectedStatus !== 'all' && agent.status !== selectedStatus) {
        return false;
      }
      // Association filter
      if (selectedAssociation !== 'all' && agent.association !== selectedAssociation) {
        return false;
      }
      // Location filter
      if (selectedLocation !== 'all' && agent.location !== selectedLocation) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = (agent.full_name || '').toLowerCase().includes(q);
        const matchesEmail = (agent.email || '').toLowerCase().includes(q);
        const matchesPhone = (agent.phone || '').includes(q);
        const matchesAssoc = (agent.association || '').toLowerCase().includes(q);
        const matchesLoc = (agent.location || '').toLowerCase().includes(q);
        const matchesId = (agent.id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesAssoc && !matchesLoc && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [registeredAgents, selectedStatus, selectedAssociation, selectedLocation, searchTerm]);

  // Paginated agents
  const totalPages = Math.ceil(filteredAgents.length / pageSize) || 1;
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  // Open detail view
  const handleOpenDetail = (agent: RegisteredAgent) => {
    setSelectedAgent(agent);
    setActiveTabInModal('details');
    setActionType(null);
    setActionReason('');
    setReasonError('');
    setIsDetailOpen(true);
    fetchAgentAuditLogs(agent.id);
  };

  // Open action dialog
  const handleInitiateAction = (type: 'approve' | 'reject' | 'suspend' | 'reinstate', agent?: RegisteredAgent) => {
    if (agent) {
      setSelectedAgent(agent);
    }
    setActionType(type);
    setActionReason('');
    setReasonError('');
    setActionErrorMessage(null);
  };

  // Execute Action
  const handleConfirmAction = async () => {
    if (!selectedAgent || !actionType) return;

    if (actionType === 'reject' && !actionReason.trim()) {
      setReasonError('A detailed rejection reason is required so the field agent can understand the compliance issue.');
      return;
    }

    setIsSubmittingAction(true);
    setActionErrorMessage(null);
    const reviewerName = userProfile?.displayName || userProfile?.email || 'Compliance Directorate';

    try {
      if (actionType === 'approve') {
        await approveAgent(selectedAgent.id, reviewerName);
        setActionSuccessMessage(`Agent ${selectedAgent.full_name} has been approved. Activation notification email sent.`);
      } else if (actionType === 'reject') {
        await rejectAgent(selectedAgent.id, actionReason, reviewerName);
        setActionSuccessMessage(`Agent application rejected. Official reason notification sent to ${selectedAgent.email}.`);
      } else if (actionType === 'suspend') {
        await suspendAgent(selectedAgent.id, actionReason || 'Operational audit hold', reviewerName);
        setActionSuccessMessage(`Agent account suspended. Field data access has been revoked.`);
      } else if (actionType === 'reinstate') {
        await reinstateAgent(selectedAgent.id, reviewerName);
        setActionSuccessMessage(`Agent ${selectedAgent.full_name} has been reinstated and activated.`);
      }

      // Update local selected agent
      await fetchRegisteredAgents();
      const updated = registeredAgents.find((a) => a.id === selectedAgent.id);
      if (updated) setSelectedAgent(updated);

      setActionType(null);
      setActionReason('');

      setTimeout(() => {
        setActionSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'Action could not be completed. Please check network connection.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Agent Audit Logs for selected agent
  const currentAgentLogs = useMemo(() => {
    if (!selectedAgent) return [];
    return agentAuditLogs.filter((l) => l.target_agent_id === selectedAgent.id);
  }, [agentAuditLogs, selectedAgent]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner & Context */}
      <div className="bg-white dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#243B2C] rounded-xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF5F1] text-[#1A4D2E] dark:bg-[#1A4D2E]/40 dark:text-[#D8E8DE] border border-[#D8E8DE] dark:border-[#243B2C] flex items-center gap-1.5">
                <ShieldCheck size={14} weight="bold" />
                Access Control & Field Extension Gate
              </span>
              {pendingAgentsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#B8860B]/15 text-[#B8860B] border border-[#B8860B]/30 animate-pulse">
                  {pendingAgentsCount} Awaiting Review
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A2E23] dark:text-[#E8F0EA] tracking-tight">
              Field Agent Applications & Approvals
            </h1>
            <p className="text-sm text-[#5A6B60] dark:text-[#A1B2A7] mt-1 max-w-2xl leading-relaxed">
              Review self-registered agricultural extension agents from mobile applications. Verified agents gain clearance to enroll smallholders, capture EUDR geospatial plot boundaries, and submit chemical logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#D1DBD5] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#162B20] text-[#1A2E23] dark:text-[#E8F0EA] hover:bg-[#F7F9F7] active:scale-98 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <ArrowsClockwise size={15} className={isRefreshing ? 'animate-spin text-[#1A4D2E]' : ''} />
              {isRefreshing ? 'Syncing...' : 'Refresh Roster'}
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {actionSuccessMessage && (
          <div className="mt-4 p-3.5 rounded-lg bg-[#EEF5F1] border border-[#2D6A4F]/30 text-[#1A4D2E] text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-xs animate-in fade-in">
            <CheckCircle size={18} weight="fill" className="text-[#2D6A4F] shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Card */}
        <div
          onClick={() => { setSelectedStatus('pending'); setCurrentPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'pending'
              ? 'bg-[#FBFCFB] dark:bg-[#192D21] border-[#B8860B] ring-1 ring-[#B8860B] shadow-xs'
              : 'bg-white dark:bg-[#14261C] border-[#E5EBE7] dark:border-[#243B2C] hover:border-[#D1DBD5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#B8860B]">Pending Review</span>
            <span className="p-1.5 rounded-md bg-[#B8860B]/10 text-[#B8860B]">
              <UserCheck size={18} weight="bold" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#1A2E23] dark:text-[#E8F0EA]">{stats.pending}</span>
            <span className="text-[11px] text-[#5A6B60] dark:text-[#A1B2A7]">applicants</span>
          </div>
          <p className="text-[11px] text-[#8A968E] dark:text-[#7A8E82] mt-1">Awaiting compliance verification</p>
        </div>

        {/* Approved Card */}
        <div
          onClick={() => { setSelectedStatus('approved'); setCurrentPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'approved'
              ? 'bg-[#FBFCFB] dark:bg-[#192D21] border-[#1A4D2E] ring-1 ring-[#1A4D2E] shadow-xs'
              : 'bg-white dark:bg-[#14261C] border-[#E5EBE7] dark:border-[#243B2C] hover:border-[#D1DBD5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2D6A4F]">Approved Fleet</span>
            <span className="p-1.5 rounded-md bg-[#2D6A4F]/10 text-[#2D6A4F]">
              <CheckCircle size={18} weight="bold" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#1A2E23] dark:text-[#E8F0EA]">{stats.approved}</span>
            <span className="text-[11px] text-[#5A6B60] dark:text-[#A1B2A7]">active agents</span>
          </div>
          <p className="text-[11px] text-[#8A968E] dark:text-[#7A8E82] mt-1">Operational in Nigerian farming clusters</p>
        </div>

        {/* Rejected Card */}
        <div
          onClick={() => { setSelectedStatus('rejected'); setCurrentPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'rejected'
              ? 'bg-[#FBFCFB] dark:bg-[#192D21] border-[#A63A2E] ring-1 ring-[#A63A2E] shadow-xs'
              : 'bg-white dark:bg-[#14261C] border-[#E5EBE7] dark:border-[#243B2C] hover:border-[#D1DBD5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A63A2E]">Declined</span>
            <span className="p-1.5 rounded-md bg-[#A63A2E]/10 text-[#A63A2E]">
              <UserMinus size={18} weight="bold" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#1A2E23] dark:text-[#E8F0EA]">{stats.rejected}</span>
            <span className="text-[11px] text-[#5A6B60] dark:text-[#A1B2A7]">records</span>
          </div>
          <p className="text-[11px] text-[#8A968E] dark:text-[#7A8E82] mt-1">Rejection reason documented</p>
        </div>

        {/* Suspended Card */}
        <div
          onClick={() => { setSelectedStatus('suspended'); setCurrentPage(1); }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'suspended'
              ? 'bg-[#FBFCFB] dark:bg-[#192D21] border-[#3A5A7A] ring-1 ring-[#3A5A7A] shadow-xs'
              : 'bg-white dark:bg-[#14261C] border-[#E5EBE7] dark:border-[#243B2C] hover:border-[#D1DBD5]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#3A5A7A]">Suspended</span>
            <span className="p-1.5 rounded-md bg-[#3A5A7A]/10 text-[#3A5A7A]">
              <Prohibit size={18} weight="bold" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-[#1A2E23] dark:text-[#E8F0EA]">{stats.suspended}</span>
            <span className="text-[11px] text-[#5A6B60] dark:text-[#A1B2A7]">paused</span>
          </div>
          <p className="text-[11px] text-[#8A968E] dark:text-[#7A8E82] mt-1">Sync access suspended</p>
        </div>
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="bg-white dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#243B2C] rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A968E]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by agent name, email, phone (+234...), cooperative, or location..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-lg border border-[#D1DBD5] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#162B20] text-[#1A2E23] dark:text-[#E8F0EA] focus:outline-none focus:ring-1 focus:ring-[#1A4D2E] focus:border-[#1A4D2E]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8A968E] hover:text-[#1A2E23]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-[#F7F9F7] dark:bg-[#182C20] p-1 rounded-lg border border-[#E5EBE7] dark:border-[#243B2C] overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => { setSelectedStatus('pending'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedStatus === 'pending'
                  ? 'bg-white dark:bg-[#14261C] text-[#B8860B] font-bold shadow-2xs'
                  : 'text-[#5A6B60] dark:text-[#A1B2A7] hover:text-[#1A2E23]'
              }`}
            >
              <span>Pending</span>
              {stats.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#B8860B]/15 text-[#B8860B]">
                  {stats.pending}
                </span>
              )}
            </button>
            <button
              onClick={() => { setSelectedStatus('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                selectedStatus === 'all'
                  ? 'bg-white dark:bg-[#14261C] text-[#1A4D2E] font-bold shadow-2xs'
                  : 'text-[#5A6B60] dark:text-[#A1B2A7] hover:text-[#1A2E23]'
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => { setSelectedStatus('approved'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                selectedStatus === 'approved'
                  ? 'bg-white dark:bg-[#14261C] text-[#2D6A4F] font-bold shadow-2xs'
                  : 'text-[#5A6B60] dark:text-[#A1B2A7] hover:text-[#1A2E23]'
              }`}
            >
              Approved ({stats.approved})
            </button>
            <button
              onClick={() => { setSelectedStatus('rejected'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                selectedStatus === 'rejected'
                  ? 'bg-white dark:bg-[#14261C] text-[#A63A2E] font-bold shadow-2xs'
                  : 'text-[#5A6B60] dark:text-[#A1B2A7] hover:text-[#1A2E23]'
              }`}
            >
              Declined ({stats.rejected})
            </button>
            <button
              onClick={() => { setSelectedStatus('suspended'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                selectedStatus === 'suspended'
                  ? 'bg-white dark:bg-[#14261C] text-[#3A5A7A] font-bold shadow-2xs'
                  : 'text-[#5A6B60] dark:text-[#A1B2A7] hover:text-[#1A2E23]'
              }`}
            >
              Suspended ({stats.suspended})
            </button>
          </div>
        </div>

        {/* Association & Location Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[#E5EBE7]/60 dark:border-[#243B2C]/60 text-xs text-[#5A6B60] dark:text-[#A1B2A7]">
          <span className="font-semibold flex items-center gap-1 text-[#1A2E23] dark:text-[#E8F0EA]">
            <Funnel size={13} />
            Filters:
          </span>

          {/* Association Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#8A968E]">Cooperative:</span>
            <select
              value={selectedAssociation}
              onChange={(e) => { setSelectedAssociation(e.target.value); setCurrentPage(1); }}
              className="py-1 px-2.5 rounded-md border border-[#D1DBD5] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#162B20] text-[#1A2E23] dark:text-[#E8F0EA] focus:outline-none focus:ring-1 focus:ring-[#1A4D2E]"
            >
              <option value="all">All Associations</option>
              {uniqueAssociations.map((assoc) => (
                <option key={assoc} value={assoc}>{assoc}</option>
              ))}
            </select>
          </div>

          {/* Location Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#8A968E]">Location:</span>
            <select
              value={selectedLocation}
              onChange={(e) => { setSelectedLocation(e.target.value); setCurrentPage(1); }}
              className="py-1 px-2.5 rounded-md border border-[#D1DBD5] dark:border-[#2D4536] bg-[#FBFCFB] dark:bg-[#162B20] text-[#1A2E23] dark:text-[#E8F0EA] focus:outline-none focus:ring-1 focus:ring-[#1A4D2E]"
            >
              <option value="all">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {(selectedAssociation !== 'all' || selectedLocation !== 'all' || searchTerm) && (
            <button
              onClick={() => { setSelectedAssociation('all'); setSelectedLocation('all'); setSearchTerm(''); }}
              className="ml-auto text-xs text-[#1A4D2E] dark:text-[#D8E8DE] underline hover:opacity-80 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Agents List / Table */}
      <div className="bg-white dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#243B2C] rounded-xl shadow-xs overflow-hidden">
        {filteredAgents.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-[#EEF5F1] dark:bg-[#1E3627] text-[#1A4D2E] dark:text-[#D8E8DE] flex items-center justify-center">
              <UserCheck size={28} weight="light" />
            </div>
            <h3 className="text-base font-bold text-[#1A2E23] dark:text-[#E8F0EA]">
              No field agent applications found
            </h3>
            <p className="text-xs text-[#5A6B60] dark:text-[#A1B2A7] max-w-md mx-auto mt-1.5">
              {searchTerm || selectedAssociation !== 'all' || selectedLocation !== 'all'
                ? 'No agents matched the selected filter criteria. Try adjusting your search query or reset filters.'
                : selectedStatus === 'pending'
                ? 'There are currently no agent applications pending review. All field agents have been reviewed.'
                : 'No agents match this status category.'}
            </p>
            {(searchTerm || selectedAssociation !== 'all' || selectedLocation !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setSelectedAssociation('all'); setSelectedLocation('all'); }}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1A4D2E] text-white hover:bg-[#0F3320] cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5EBE7] dark:border-[#243B2C] bg-[#F7F9F7] dark:bg-[#162B20] text-[11px] font-bold uppercase tracking-wider text-[#5A6B60] dark:text-[#A1B2A7]">
                  <th className="py-3 px-4">Applicant</th>
                  <th className="py-3 px-4">Cooperative Union</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Submission Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBE7] dark:divide-[#243B2C] text-xs">
                {paginatedAgents.map((agent) => {
                  const isPending = agent.status === 'pending';
                  const isApproved = agent.status === 'approved';
                  const isRejected = agent.status === 'rejected';
                  const isSuspended = agent.status === 'suspended';

                  return (
                    <tr
                      key={agent.id}
                      onClick={() => handleOpenDetail(agent)}
                      className="hover:bg-[#F7F9F7] dark:hover:bg-[#182C20] transition-colors cursor-pointer group"
                    >
                      {/* Name & ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#EEF5F1] dark:bg-[#1F382A] text-[#1A4D2E] dark:text-[#D8E8DE] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D8E8DE] dark:border-[#2D4536]">
                            {agent.full_name
                              ? agent.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                              : 'AG'}
                          </div>
                          <div>
                            <div className="font-bold text-[#1A2E23] dark:text-[#E8F0EA] group-hover:text-[#1A4D2E] transition-colors">
                              {agent.full_name}
                            </div>
                            <div className="text-[10px] font-mono text-[#8A968E] dark:text-[#7A8E82]">
                              {agent.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cooperative */}
                      <td className="py-3.5 px-4 text-[#1A2E23] dark:text-[#E8F0EA] font-medium">
                        <div className="flex items-center gap-1.5 max-w-[200px] truncate" title={agent.association}>
                          <Buildings size={14} className="text-[#8A968E] shrink-0" />
                          <span className="truncate">{agent.association}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-[#5A6B60] dark:text-[#A1B2A7]">
                        <div className="flex items-center gap-1.5 max-w-[180px] truncate" title={agent.location}>
                          <MapPin size={14} className="text-[#8A968E] shrink-0" />
                          <span className="truncate">{agent.location}</span>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="text-[#1A2E23] dark:text-[#E8F0EA] font-mono text-[11px]">
                          {agent.phone}
                        </div>
                        <div className="text-[11px] text-[#5A6B60] dark:text-[#A1B2A7] truncate max-w-[160px]">
                          {agent.email}
                        </div>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3.5 px-4 text-[#5A6B60] dark:text-[#A1B2A7] whitespace-nowrap">
                        <div>
                          {agent.created_at
                            ? new Date(agent.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'N/A'}
                        </div>
                        <div className="text-[10px] text-[#8A968E]">
                          {agent.created_at
                            ? new Date(agent.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ''}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#B8860B]/12 text-[#B8860B] border border-[#B8860B]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#B8860B] animate-pulse"></span>
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2D6A4F]/12 text-[#2D6A4F] border border-[#2D6A4F]/30">
                            <CheckCircle size={12} weight="bold" />
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#A63A2E]/12 text-[#A63A2E] border border-[#A63A2E]/30">
                            <XCircle size={12} weight="bold" />
                            Declined
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#3A5A7A]/12 text-[#3A5A7A] border border-[#3A5A7A]/30">
                            <Prohibit size={12} weight="bold" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleInitiateAction('approve', agent)}
                                title="Approve Agent"
                                className="px-2.5 py-1.5 rounded-md bg-[#1A4D2E] hover:bg-[#0F3320] text-white font-semibold text-xs transition-all cursor-pointer shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleInitiateAction('reject', agent)}
                                title="Reject Agent"
                                className="px-2.5 py-1.5 rounded-md bg-white border border-[#A63A2E] text-[#A63A2E] hover:bg-[#A63A2E]/10 font-semibold text-xs transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {!isPending && (
                            <button
                              onClick={() => handleOpenDetail(agent)}
                              className="px-2.5 py-1.5 rounded-md border border-[#D1DBD5] dark:border-[#2D4536] hover:bg-[#EEF5F1] text-[#1A2E23] dark:text-[#E8F0EA] font-semibold text-xs transition-all cursor-pointer"
                            >
                              Review Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Pagination Footer */}
        {filteredAgents.length > 0 && (
          <div className="py-3.5 px-4 border-t border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5A6B60] dark:text-[#A1B2A7]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="py-1 px-2 rounded border border-[#D1DBD5] dark:border-[#2D4536] bg-white dark:bg-[#14261C] text-[#1A2E23] dark:text-[#E8F0EA]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-[#8A968E] ml-2">
                Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAgents.length)} to {Math.min(currentPage * pageSize, filteredAgents.length)} of {filteredAgents.length} agents
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-[#D1DBD5] dark:border-[#2D4536] bg-white dark:bg-[#14261C] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F9F7] cursor-pointer"
              >
                <CaretLeft size={14} />
              </button>
              <span className="px-2 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-md border border-[#D1DBD5] dark:border-[#2D4536] bg-white dark:bg-[#14261C] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F9F7] cursor-pointer"
              >
                <CaretRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Detailed Drawer / Modal */}
      {isDetailOpen && selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#243B2C] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20] flex items-start justify-between">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#1A4D2E] text-white font-serif font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                  {selectedAgent.full_name
                    ? selectedAgent.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')
                    : 'AG'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-serif text-[#1A2E23] dark:text-[#E8F0EA]">
                      {selectedAgent.full_name}
                    </h2>
                    {selectedAgent.status === 'pending' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#B8860B]/15 text-[#B8860B] border border-[#B8860B]/30">
                        Pending
                      </span>
                    )}
                    {selectedAgent.status === 'approved' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2D6A4F]/15 text-[#2D6A4F] border border-[#2D6A4F]/30">
                        Approved
                      </span>
                    )}
                    {selectedAgent.status === 'rejected' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#A63A2E]/15 text-[#A63A2E] border border-[#A63A2E]/30">
                        Rejected
                      </span>
                    )}
                    {selectedAgent.status === 'suspended' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#3A5A7A]/15 text-[#3A5A7A] border border-[#3A5A7A]/30">
                        Suspended
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#5A6B60] dark:text-[#A1B2A7] mt-0.5">
                    Agent ID: <span className="font-mono text-[#1A2E23] dark:text-[#E8F0EA] font-semibold">{selectedAgent.id}</span> • Auth User: <span className="font-mono">{selectedAgent.auth_user_id}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-8 h-8 rounded-full border border-[#D1DBD5] dark:border-[#2D4536] flex items-center justify-center text-[#5A6B60] hover:text-[#1A2E23] cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[#E5EBE7] dark:border-[#243B2C] px-6 text-xs font-semibold bg-[#FBFCFB] dark:bg-[#162B20]">
              <button
                onClick={() => setActiveTabInModal('details')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-colors ${
                  activeTabInModal === 'details'
                    ? 'border-[#1A4D2E] text-[#1A4D2E] dark:text-[#D8E8DE]'
                    : 'border-transparent text-[#5A6B60] hover:text-[#1A2E23]'
                }`}
              >
                Submitted Information
              </button>
              <button
                onClick={() => setActiveTabInModal('audit')}
                className={`py-3 px-4 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  activeTabInModal === 'audit'
                    ? 'border-[#1A4D2E] text-[#1A4D2E] dark:text-[#D8E8DE]'
                    : 'border-transparent text-[#5A6B60] hover:text-[#1A2E23]'
                }`}
              >
                <ClockCounterClockwise size={14} />
                Audit Trail ({currentAgentLogs.length})
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {activeTabInModal === 'details' ? (
                <>
                  {/* Status Banner Callouts */}
                  {selectedAgent.status === 'rejected' && (
                    <div className="p-4 rounded-xl bg-[#FDF2F0] border border-[#F5C6CB] text-[#A63A2E] text-xs">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                        <XCircle size={16} weight="fill" />
                        Application Declined
                      </div>
                      <p className="font-medium text-[#1A2E23] mt-1 bg-white/70 p-2.5 rounded-md border border-[#F5C6CB]/60">
                        "{selectedAgent.rejection_reason || 'Documentation did not meet verification criteria.'}"
                      </p>
                      <div className="text-[11px] text-[#A63A2E] mt-2">
                        Reviewed by: <strong>{selectedAgent.reviewed_by || 'Compliance Desk'}</strong> on {selectedAgent.reviewed_at ? new Date(selectedAgent.reviewed_at).toUTCString() : 'N/A'}
                      </div>
                    </div>
                  )}

                  {selectedAgent.status === 'suspended' && (
                    <div className="p-4 rounded-xl bg-[#F0F4F8] border border-[#C6D4E1] text-[#3A5A7A] text-xs">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                        <Prohibit size={16} weight="fill" />
                        Account Suspended
                      </div>
                      <p className="font-medium text-[#1A2E23] mt-1 bg-white/70 p-2.5 rounded-md border border-[#C6D4E1]/60">
                        "{selectedAgent.rejection_reason || 'Temporary compliance hold.'}"
                      </p>
                      <div className="text-[11px] text-[#3A5A7A] mt-2">
                        Actioned by: <strong>{selectedAgent.reviewed_by || 'Compliance Desk'}</strong> on {selectedAgent.reviewed_at ? new Date(selectedAgent.reviewed_at).toUTCString() : 'N/A'}
                      </div>
                    </div>
                  )}

                  {selectedAgent.status === 'approved' && (
                    <div className="p-4 rounded-xl bg-[#EEF5F1] border border-[#D8E8DE] text-[#1A4D2E] text-xs">
                      <div className="font-bold flex items-center gap-1.5 mb-1 text-sm">
                        <CheckCircle size={16} weight="fill" className="text-[#2D6A4F]" />
                        Official Field Clearance Granted
                      </div>
                      <p className="text-[12px] text-[#5A6B60] mt-0.5">
                        This agent is actively authorized to synchronize smallholder farmers and log chemical applications.
                      </p>
                      <div className="text-[11px] text-[#1A4D2E] mt-2">
                        Approved by: <strong>{selectedAgent.reviewed_by || 'Chief Compliance Director'}</strong> on {selectedAgent.reviewed_at ? new Date(selectedAgent.reviewed_at).toUTCString() : 'N/A'}
                      </div>
                    </div>
                  )}

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl border border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20]">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-[#8A968E] block mb-1">
                        Full Name
                      </span>
                      <span className="text-sm font-semibold text-[#1A2E23] dark:text-[#E8F0EA]">
                        {selectedAgent.full_name}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20]">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-[#8A968E] block mb-1">
                        Email Address
                      </span>
                      <span className="text-sm font-semibold text-[#1A2E23] dark:text-[#E8F0EA] flex items-center gap-1.5">
                        <Envelope size={14} className="text-[#1A4D2E]" />
                        {selectedAgent.email}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20]">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-[#8A968E] block mb-1">
                        Nigerian Mobile Phone
                      </span>
                      <span className="text-sm font-semibold text-[#1A2E23] dark:text-[#E8F0EA] font-mono flex items-center gap-1.5">
                        <Phone size={14} className="text-[#1A4D2E]" />
                        {selectedAgent.phone}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20]">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-[#8A968E] block mb-1">
                        Farmers Association
                      </span>
                      <span className="text-sm font-semibold text-[#1A2E23] dark:text-[#E8F0EA] flex items-center gap-1.5">
                        <Buildings size={14} className="text-[#1A4D2E]" />
                        {selectedAgent.association}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20]">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-[#8A968E] block mb-1">
                        Assigned Location / LGA
                      </span>
                      <span className="text-sm font-semibold text-[#1A2E23] dark:text-[#E8F0EA] flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#1A4D2E]" />
                        {selectedAgent.location}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl border border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20]">
                      <span className="text-[11px] uppercase font-bold tracking-wider text-[#8A968E] block mb-1">
                        Registration Date
                      </span>
                      <span className="text-sm font-semibold text-[#1A2E23] dark:text-[#E8F0EA] flex items-center gap-1.5">
                        <CalendarBlank size={14} className="text-[#1A4D2E]" />
                        {selectedAgent.created_at ? new Date(selectedAgent.created_at).toLocaleString('en-GB') : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Developer Endpoint Guidance */}
                  <div className="p-3.5 rounded-xl bg-[#F7F9F7] dark:bg-[#182C20] border border-[#E5EBE7] dark:border-[#243B2C] text-xs space-y-1">
                    <span className="font-bold text-[#1A4D2E] dark:text-[#D8E8DE] flex items-center gap-1">
                      <Info size={14} />
                      Mobile App Sync Rules
                    </span>
                    <p className="text-[#5A6B60] dark:text-[#A1B2A7] text-[11px]">
                      {selectedAgent.status === 'approved'
                        ? 'This account has active authorization tokens and can hit /sync/batch and /api/v1/sync/upstream.'
                        : 'Any synchronization attempt by this agent ID will be halted by middleware with 403 Forbidden (ACCOUNT_NOT_APPROVED).'}
                    </p>
                  </div>
                </>
              ) : (
                /* Audit Trail View */
                <div className="space-y-3">
                  {currentAgentLogs.length === 0 ? (
                    <div className="text-center py-8 text-[#8A968E] text-xs">
                      No audit events recorded for this agent yet.
                    </div>
                  ) : (
                    currentAgentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-xl border border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1A2E23] dark:text-[#E8F0EA] uppercase tracking-wider text-[11px]">
                            Action: <span className="text-[#1A4D2E]">{log.action.replace('_', ' ')}</span>
                          </span>
                          <span className="text-[10px] text-[#8A968E]">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[#5A6B60] dark:text-[#A1B2A7]">
                          Actor: <strong>{log.actor_name || log.actor_id}</strong>
                        </div>
                        {log.details && (
                          <div className="p-2 rounded-md bg-white dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#243B2C] font-mono text-[11px] text-[#1A2E23] dark:text-[#E8F0EA]">
                            {log.details.rejection_reason && (
                              <div>Rejection Reason: {log.details.rejection_reason}</div>
                            )}
                            {log.details.from_status && (
                              <div>Status Transition: {log.details.from_status} → {log.details.to_status}</div>
                            )}
                            {log.details.email && <div>Registered Email: {log.details.email}</div>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Modal Action Controls Footer */}
            <div className="p-5 border-t border-[#E5EBE7] dark:border-[#243B2C] bg-[#FBFCFB] dark:bg-[#162B20] flex items-center justify-between gap-3">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#D1DBD5] text-[#5A6B60] hover:text-[#1A2E23] cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedAgent.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleInitiateAction('reject')}
                      className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#A63A2E] text-[#A63A2E] hover:bg-[#A63A2E]/10 cursor-pointer transition-all"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleInitiateAction('approve')}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] text-white shadow-xs cursor-pointer transition-all"
                    >
                      Approve Agent
                    </button>
                  </>
                )}

                {selectedAgent.status === 'approved' && (
                  <button
                    onClick={() => handleInitiateAction('suspend')}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#3A5A7A] text-[#3A5A7A] hover:bg-[#3A5A7A]/10 cursor-pointer transition-all"
                  >
                    Suspend Account
                  </button>
                )}

                {(selectedAgent.status === 'rejected' || selectedAgent.status === 'suspended') && (
                  <button
                    onClick={() => handleInitiateAction('reinstate')}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-[#1A4D2E] hover:bg-[#0F3320] text-white shadow-xs cursor-pointer transition-all"
                  >
                    Reinstate & Approve
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Action Confirmation & Rejection Reason Dialog */}
      {actionType && selectedAgent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#14261C] border border-[#E5EBE7] dark:border-[#243B2C] rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  actionType === 'approve' || actionType === 'reinstate'
                    ? 'bg-[#EEF5F1] text-[#1A4D2E]'
                    : actionType === 'reject'
                    ? 'bg-[#FDF2F0] text-[#A63A2E]'
                    : 'bg-[#F0F4F8] text-[#3A5A7A]'
                }`}
              >
                {actionType === 'approve' || actionType === 'reinstate' ? (
                  <CheckCircle size={22} weight="fill" />
                ) : actionType === 'reject' ? (
                  <XCircle size={22} weight="fill" />
                ) : (
                  <Prohibit size={22} weight="fill" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1A2E23] dark:text-[#E8F0EA]">
                  {actionType === 'approve' && `Approve Field Agent`}
                  {actionType === 'reject' && `Decline Agent Application`}
                  {actionType === 'suspend' && `Suspend Field Agent`}
                  {actionType === 'reinstate' && `Reinstate Field Agent`}
                </h3>
                <p className="text-xs text-[#5A6B60] dark:text-[#A1B2A7]">
                  Target: <strong>{selectedAgent.full_name}</strong> ({selectedAgent.association})
                </p>
              </div>
            </div>

            {/* Explanatory notice */}
            <p className="text-xs text-[#5A6B60] dark:text-[#A1B2A7] leading-relaxed">
              {actionType === 'approve' && (
                'Approving will activate this agent account immediately. An official approval clearance email will be sent to their address with instructions to sign in to the mobile app.'
              )}
              {actionType === 'reject' && (
                'You must provide a clear, specific rejection reason. This reason will be recorded in the audit trail and sent to the applicant via email.'
              )}
              {actionType === 'suspend' && (
                'Suspending this agent will immediately revoke operational API access to offline sync and farmer logs.'
              )}
              {actionType === 'reinstate' && (
                'Reinstating will restore active status and allow the agent to resume synchronization operations.'
              )}
            </p>

            {/* Rejection Reason Textarea (MANDATORY for reject) */}
            {(actionType === 'reject' || actionType === 'suspend') && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1A2E23] dark:text-[#E8F0EA] flex items-center justify-between">
                  <span>
                    {actionType === 'reject' ? 'Rejection Reason (Required)' : 'Suspension Reason / Internal Notes'}
                  </span>
                  {actionType === 'reject' && (
                    <span className="text-[10px] text-[#A63A2E] font-semibold">Mandatory</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={actionReason}
                  onChange={(e) => { setActionReason(e.target.value); setReasonError(''); }}
                  placeholder={
                    actionType === 'reject'
                      ? 'e.g. Unverified farmers association credentials; please register with an accredited LGA cooperative...'
                      : 'e.g. Discrepancy detected in geospatial plot polygon boundaries...'
                  }
                  className={`w-full p-2.5 text-xs rounded-lg border ${
                    reasonError
                      ? 'border-[#A63A2E] ring-1 ring-[#A63A2E]'
                      : 'border-[#D1DBD5] dark:border-[#2D4536]'
                  } bg-[#FBFCFB] dark:bg-[#162B20] text-[#1A2E23] dark:text-[#E8F0EA] focus:outline-none focus:ring-1 focus:ring-[#1A4D2E]`}
                />
                {reasonError && (
                  <p className="text-[11px] text-[#A63A2E] font-medium">{reasonError}</p>
                )}
              </div>
            )}

            {actionErrorMessage && (
              <div className="p-2.5 rounded-lg bg-[#FDF2F0] border border-[#F5C6CB] text-[#A63A2E] text-xs">
                {actionErrorMessage}
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActionType(null)}
                disabled={isSubmittingAction}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#D1DBD5] text-[#5A6B60] hover:text-[#1A2E23] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmittingAction}
                className={`px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs cursor-pointer transition-all disabled:opacity-50 ${
                  actionType === 'approve' || actionType === 'reinstate'
                    ? 'bg-[#1A4D2E] hover:bg-[#0F3320]'
                    : actionType === 'reject'
                    ? 'bg-[#A63A2E] hover:bg-[#8B2F24]'
                    : 'bg-[#3A5A7A] hover:bg-[#2C4661]'
                }`}
              >
                {isSubmittingAction ? (
                  <span className="flex items-center gap-1.5">
                    <ArrowClockwise size={14} className="animate-spin" />
                    Processing...
                  </span>
                ) : actionType === 'approve' ? (
                  'Confirm Approval'
                ) : actionType === 'reject' ? (
                  'Confirm Rejection'
                ) : actionType === 'suspend' ? (
                  'Confirm Suspension'
                ) : (
                  'Confirm Reinstatement'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
