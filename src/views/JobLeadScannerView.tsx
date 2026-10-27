import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Briefcase,
  AlertTriangle,
  Send,
  Copy,
  Check,
  Download,
  Filter,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle,
  Building2,
  MapPin,
  DollarSign,
  Clock,
  Sparkles,
  RefreshCw,
  Bookmark,
  BookmarkCheck,
  ShieldAlert,
  Zap,
  Code2,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { ScannedJobLead, scanOnlineJobsAndLeads } from '../services/geminiService';

interface JobLeadScannerViewProps {
  onOpenSubscriptionModal: () => void;
  isPro: boolean;
}

export const JobLeadScannerView: React.FC<JobLeadScannerViewProps> = ({
  onOpenSubscriptionModal,
  isPro,
}) => {
  const [leads, setLeads] = useState<ScannedJobLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('Nigeria');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [customSearchQuery, setCustomSearchQuery] = useState<string>('');
  const [savedLeadIds, setSavedLeadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('testimony_saved_leads');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Pitch Modal State
  const [activePitchLead, setActivePitchLead] = useState<ScannedJobLead | null>(null);
  const [copiedPitch, setCopiedPitch] = useState<boolean>(false);
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  const fetchLeads = async (countryParam = selectedCountry, catParam = selectedCategory) => {
    setIsLoading(true);
    try {
      const results = await scanOnlineJobsAndLeads({
        country: countryParam,
        category: catParam,
        industry: selectedIndustry,
        customQuery: customSearchQuery,
      });
      setLeads(results);
    } catch (err) {
      console.warn('Failed to load live leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [selectedCountry, selectedCategory, selectedIndustry]);

  const toggleSaveLead = (id: string) => {
    setSavedLeadIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
      try {
        localStorage.setItem('testimony_saved_leads', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopyContact = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContact(id);
    setTimeout(() => setCopiedContact(null), 2000);
  };

  const handleExportCSV = () => {
    if (leads.length === 0) return;
    const headers = [
      'Type',
      'Title',
      'Business Name',
      'Country',
      'City',
      'Industry',
      'Website',
      'Issue / Need',
      'Budget',
      'Contact Person',
      'Email',
      'Phone / WhatsApp',
      'Pitch Angle'
    ];
    const rows = leads.map((l) => [
      `"${l.type}"`,
      `"${l.title.replace(/"/g, '""')}"`,
      `"${l.businessName.replace(/"/g, '""')}"`,
      `"${l.country}"`,
      `"${(l.city || '').replace(/"/g, '""')}"`,
      `"${l.industry}"`,
      `"${l.websiteUrl || ''}"`,
      `"${l.issueOrNeed.replace(/"/g, '""')}"`,
      `"${l.estimatedBudget}"`,
      `"${(l.contactPerson || '').replace(/"/g, '""')}"`,
      `"${l.contactEmail || ''}"`,
      `"${l.contactPhoneOrWhatsApp || ''}"`,
      `"${l.pitchAngle.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Testimony_Leads_${selectedCountry}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const failingWebsitesCount = leads.filter((l) => l.type === 'website_fix').length;
  const urgentHelpCount = leads.filter((l) => l.type === 'online_help').length;
  const remoteJobsCount = leads.filter((l) => l.type === 'remote_job').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090d16] text-slate-100 overflow-y-auto">
      {/* Top Banner */}
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>ONLINE JOBS &amp; CLIENT LEAD SCANNER</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Scan Failing Business Websites, Urgent Online Help &amp; Remote Jobs
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Discover real businesses in Nigeria, the US, the UK, and worldwide that urgently need website fixing or redesign, businesses seeking online freelance help, and verified remote jobs with direct decision-maker contact details.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchLeads()}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Scanning Live...' : 'Scan Now'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={leads.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Download all scanned business leads & jobs into CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/60">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block">Total Scanned Leads</span>
            <span className="text-lg font-black text-white">{leads.length} Active</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-rose-500/20">
            <span className="text-[11px] text-rose-300 block">Failing Websites to Fix</span>
            <span className="text-lg font-black text-rose-400">{failingWebsitesCount} High-Ticket</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-amber-500/20">
            <span className="text-[11px] text-amber-300 block">Urgent Online Help</span>
            <span className="text-lg font-black text-amber-400">{urgentHelpCount} Openings</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-300 block">Verified Remote Jobs</span>
            <span className="text-lg font-black text-emerald-400">{remoteJobsCount} Verified</span>
          </div>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap text-xs font-semibold">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              All Leads ({leads.length})
            </button>
            <button
              onClick={() => setSelectedCategory('website_fix')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'website_fix'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-rose-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Websites Needing Fix</span>
            </button>
            <button
              onClick={() => setSelectedCategory('online_help')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'online_help'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-amber-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Urgent Online Help</span>
            </button>
            <button
              onClick={() => setSelectedCategory('remote_job')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'remote_job'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-emerald-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Remote Jobs</span>
            </button>
          </div>

          {/* Location & Industry Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Country Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="Nigeria" className="bg-slate-900">🇳🇬 Nigeria (Lagos, Abuja, PH)</option>
                <option value="United States" className="bg-slate-900">🇺🇸 United States</option>
                <option value="United Kingdom" className="bg-slate-900">🇬🇧 United Kingdom</option>
                <option value="Canada" className="bg-slate-900">🇨🇦 Canada</option>
                <option value="Worldwide Remote" className="bg-slate-900">🌍 Worldwide Remote</option>
              </select>
            </div>

            {/* Industry Selector */}
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">All Industries</option>
              <option value="Healthcare & Dental">Healthcare &amp; Dental</option>
              <option value="Real Estate & Hospitality">Real Estate &amp; Hotels</option>
              <option value="Logistics & Supply Chain">Logistics &amp; Transport</option>
              <option value="E-commerce & Retail">E-Commerce Stores</option>
              <option value="Legal Services">Law &amp; Legal</option>
              <option value="Software & Technology">Software &amp; Tech</option>
            </select>
          </div>
        </div>

        {/* Custom Scan Prompt Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchLeads();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={customSearchQuery}
              onChange={(e) => setCustomSearchQuery(e.target.value)}
              placeholder="Custom Scan (e.g. 'Private schools in Lagos needing websites' or 'Remote React roles for Nigerians')..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span>Run Deep Scan</span>
          </button>
        </form>

        {/* Leads Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-purple-300">
              Scanning online jobs, failing websites &amp; client directories in {selectedCountry}...
            </p>
            <p className="text-xs text-slate-500">
              Analyzing broken mobile layouts, missing booking tools, and urgent remote positions.
            </p>
          </div>
        ) : leads.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 p-8 space-y-3">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Leads Found Matching Filters</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try switching your country to Nigeria or Worldwide Remote, or clear custom filters.
            </p>
            <button
              onClick={() => {
                setSelectedCountry('Nigeria');
                setSelectedCategory('all');
                setSelectedIndustry('all');
                setCustomSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.map((lead) => {
              const isSaved = savedLeadIds.includes(lead.id);
              const isWebsiteFix = lead.type === 'website_fix';
              const isOnlineHelp = lead.type === 'online_help';
              const isRemoteJob = lead.type === 'remote_job';

              return (
                <div
                  key={lead.id}
                  className="rounded-2xl p-4 sm:p-5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4 shadow-lg group relative overflow-hidden"
                >
                  <div>
                    {/* Top Type & Urgency Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isWebsiteFix && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Failing Website (Needs Fix)</span>
                          </span>
                        )}
                        {isOnlineHelp && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Urgent Online Help</span>
                          </span>
                        )}
                        {isRemoteJob && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-emerald-400" />
                            <span>Remote Online Job</span>
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {lead.industry}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleSaveLead(lead.id)}
                        className="p-1 rounded text-slate-400 hover:text-amber-400 transition cursor-pointer"
                        title={isSaved ? 'Remove from saved' : 'Save this lead'}
                      >
                        {isSaved ? (
                          <BookmarkCheck className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Business / Job Title */}
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                      {lead.title}
                    </h3>

                    {/* Company Name & Location */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="font-semibold text-slate-200 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-purple-400" />
                        {lead.businessName}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        {lead.city ? `${lead.city}, ` : ''}{lead.country}
                      </span>
                    </div>

                    {/* Website URL & Status */}
                    {lead.websiteUrl && (
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300 truncate max-w-[280px]">
                          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-mono text-[11px] truncate">{lead.websiteUrl}</span>
                        </div>
                        <a
                          href={lead.websiteUrl.startsWith('http') ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-0.5 shrink-0 ml-2"
                        >
                          <span>Inspect</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {/* Breakdown of why their website is failing / urgent problem */}
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
                      <div className="font-bold text-rose-300 flex items-center gap-1 text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        <span>Identified Problem &amp; Revenue Risk:</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        {lead.issueOrNeed}
                      </p>
                    </div>

                    {/* Estimated Budget / Pay */}
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Estimated Budget / Salary:</span>
                      <span className="font-extrabold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-800/40">
                        {lead.estimatedBudget}
                      </span>
                    </div>

                    {/* Contact Details Dossier */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs space-y-1">
                      <div className="text-[11px] font-bold text-slate-400">Direct Contact Dossier:</div>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {lead.contactPerson && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] font-medium">
                            👤 {lead.contactPerson}
                          </span>
                        )}
                        {lead.contactEmail && (
                          <button
                            onClick={() => handleCopyContact(lead.contactEmail, `${lead.id}_email`)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px] transition cursor-pointer"
                            title="Click to copy email"
                          >
                            <Mail className="w-3 h-3 text-cyan-400" />
                            <span>{lead.contactEmail}</span>
                            {copiedContact === `${lead.id}_email` ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        )}
                        {lead.contactPhoneOrWhatsApp && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-[11px]">
                            <MessageCircle className="w-3 h-3 text-emerald-400" />
                            <span>{lead.contactPhoneOrWhatsApp}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActivePitchLead(lead)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>1-Click AI Outreach Pitch</span>
                    </button>

                    {lead.contactEmail && (
                      <a
                        href={`mailto:${lead.contactEmail}?subject=${encodeURIComponent(`Website Enhancement for ${lead.businessName}`)}&body=${encodeURIComponent(lead.pitchAngle)}`}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                        title="Send Direct Email"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1-Click AI Pitch Modal */}
      {activePitchLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActivePitchLead(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI-Tailored Outreach Proposal</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Pitch Proposal for {activePitchLead.businessName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Targeting: {activePitchLead.contactPerson || 'Decision Maker'} ({activePitchLead.contactEmail || activePitchLead.contactPhoneOrWhatsApp})
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Generated Message (Ready to Email / WhatsApp):
              </div>
              <div className="p-3 rounded-xl bg-slate-900 text-slate-200 leading-relaxed font-mono text-xs whitespace-pre-line border border-slate-800/80">
                {`Subject: Quick question regarding ${activePitchLead.businessName}'s website\n\nDear ${activePitchLead.contactPerson || 'Team'},\n\nI was reviewing your online presence at ${activePitchLead.websiteUrl || activePitchLead.businessName} and noticed a critical issue affecting your client conversions: ${activePitchLead.issueOrNeed}.\n\nWhen prospective clients visit on mobile, this bug causes high bounce rates and lost bookings to your competitors.\n\nI specialize in rapid web fixes and redesigns for ${activePitchLead.industry} companies. I can resolve this issue, optimize your mobile speed, and install a direct booking/intake engine within 48 to 72 hours.\n\nWould you be open to a brief 5-minute chat or WhatsApp message this week to see how we can fix this?\n\nBest regards,\nTestimony Bassey`}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyPitch(
                    `Subject: Quick question regarding ${activePitchLead.businessName}'s website\n\nDear ${activePitchLead.contactPerson || 'Team'},\n\nI was reviewing your online presence at ${activePitchLead.websiteUrl || activePitchLead.businessName} and noticed a critical issue affecting your client conversions: ${activePitchLead.issueOrNeed}.\n\nWhen prospective clients visit on mobile, this bug causes high bounce rates and lost bookings to your competitors.\n\nI specialize in rapid web fixes and redesigns for ${activePitchLead.industry} companies. I can resolve this issue, optimize your mobile speed, and install a direct booking/intake engine within 48 to 72 hours.\n\nWould you be open to a brief 5-minute chat or WhatsApp message this week to see how we can fix this?\n\nBest regards,\nTestimony Bassey`
                  )
                }
                className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                {copiedPitch ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Pitch Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Outreach Pitch</span>
                  </>
                )}
              </button>

              {activePitchLead.contactEmail && (
                <a
                  href={`mailto:${activePitchLead.contactEmail}?subject=${encodeURIComponent(`Website enhancement for ${activePitchLead.businessName}`)}&body=${encodeURIComponent(activePitchLead.pitchAngle)}`}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send via Email</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
