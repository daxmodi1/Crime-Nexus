import React, { useRef } from 'react';
import { Briefcase, Trash2, Upload, Clock, BarChart3, Users, FileText, Search, Bell, Settings, ArrowRight } from 'lucide-react';
import StatCard from '../ui/StatCard';

const LandingView = ({ savedCases, onUpload, onOpenCase, onDeleteCase, sidebarCollapsed, showCasesOnly }) => {
  const fileInputRef = useRef(null);

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(Array.from(files));
    }
    e.target.value = '';
  };

  // Mock stats
  const totalCases = savedCases.length;
  const activeInvestigations = savedCases.filter(c => c.status === 'Open').length;
  const totalEvidence = savedCases.reduce((sum, c) => sum + (c.files?.length || 0), 0);

  const sidebarWidth = sidebarCollapsed ? 'ml-[68px]' : 'ml-64';

  // ── Cases-Only View ──────────────────────────────────────────────────────────
  if (showCasesOnly) {
    return (
      <div className={`${sidebarWidth} min-h-screen bg-[#f6f7ed] p-5 md:p-8 transition-all duration-300`}>
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-medium uppercase text-[#a1a19b] tracking-wider mb-2">Case Management</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#1f1f1f] mb-1 tracking-tight">All Cases</h1>
          <p className="text-[#71717a] text-sm">View, open, or manage all your investigations.</p>
        </div>



        {/* Cases Table */}
        <div className="bg-white border border-[#e8e8e4] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="p-5 border-b border-[#e8e8e4] flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#1f1f1f]">All Investigations</h3>
            <span className="text-xs px-3 py-1 rounded-full bg-[#f4f4f4] text-[#71717a] border border-[#e8e8e4]">
              {totalCases} total
            </span>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
            <table className="w-full text-sm">
              <thead className="bg-[#f4f4f4] border-b border-[#e8e8e4]">
                <tr className="text-[#71717a] text-xs uppercase">
                  <th className="px-5 py-3 text-left font-semibold">Title</th>
                  <th className="px-5 py-3 text-left font-semibold">Created</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Files</th>
                  <th className="px-5 py-3 text-center font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e8e4]">
                {savedCases.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-2xl bg-[#f4f4f4]">
                          <FileText size={32} className="text-[#d4d4cf]" />
                        </div>
                        <p className="text-[#71717a] font-medium">No cases yet</p>
                        <p className="text-[#a1a19b] text-xs">Upload evidence from the Dashboard to create your first case.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  savedCases.map((c) => (
                    <tr 
                      key={c.id}
                      onClick={() => onOpenCase(c)}
                      className="hover:bg-[#f6f7ed]/60 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 text-[#1f1f1f] font-medium group-hover:text-[#3a3a3a] transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#f4f4f4] group-hover:bg-[#eaeae6] transition-colors">
                            <Briefcase size={14} className="text-[#71717a]" />
                          </div>
                          {c.title}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#a1a19b] text-xs font-mono">
                        {c.date}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${
                          c.status === 'Open' 
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                            : c.status === 'Processing'
                            ? 'text-amber-700 bg-amber-50 border border-amber-200'
                            : 'text-[#71717a] bg-[#f4f4f4] border border-[#e8e8e4]'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#a1a19b] text-xs font-mono">
                        {c.files?.length || c.filesUploaded?.length || 0} files
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); onOpenCase(c); }}
                            className="p-2 rounded-lg hover:bg-[#f4f4f4] text-[#a1a19b] hover:text-[#1f1f1f] transition-colors border-0 bg-transparent"
                            title="Open Case"
                          >
                            <ArrowRight size={15} />
                          </button>
                          <button 
                            onClick={(e) => onDeleteCase(e, c.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-[#a1a19b] hover:text-red-500 transition-colors border-0 bg-transparent"
                            title="Delete Investigation"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── Default Dashboard Landing View ───────────────────────────────────────────
  return (
    <div className={`${sidebarWidth} min-h-screen bg-[#f6f7ed] p-5 md:p-8 transition-all duration-300`}>
      {/* Top Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase text-[#a1a19b] tracking-wider mb-2">Investigation workspace</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#1f1f1f] mb-1 tracking-tight">Welcome back</h1>
          <p className="text-[#71717a] text-sm">Manage your investigations and evidence from one clean command center.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex bg-white border border-[#e8e8e4] rounded-full px-4 py-2.5 items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Search size={16} className="text-[#a1a19b]" />
            <input 
              type="text" 
              placeholder="Search cases..." 
              className="bg-transparent text-sm text-[#1f1f1f] outline-none placeholder-[#a1a19b] w-40"
            />
          </div>
          <button className="p-2.5 bg-white border border-[#e8e8e4] rounded-full text-[#71717a] hover:text-[#1f1f1f] hover:bg-[#f4f4f4] transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Bell size={18} />
          </button>
          <button className="p-2.5 bg-white border border-[#e8e8e4] rounded-full text-[#71717a] hover:text-[#1f1f1f] hover:bg-[#f4f4f4] transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard
          title="Total Investigations"
          value={totalCases}
          subtitle="Click to view all cases"
          icon={Briefcase}
          trend="up"
          trendValue="12"
        />
        <StatCard
          title="Active Cases"
          value={activeInvestigations}
          subtitle="In progress investigations"
          icon={BarChart3}
          trend="up"
          trendValue="8"
        />
        <StatCard
          title="Evidence Files"
          value={totalEvidence}
          subtitle="Total documents uploaded"
          icon={FileText}
          trend="up"
          trendValue="24"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Recent Cases */}
        <div className="lg:col-span-2 space-y-5">
          {/* Upload Section */}
          <div 
            className="relative group cursor-pointer rounded-2xl border-2 border-dashed border-[#d4d4cf] bg-white hover:border-[#1f1f1f] transition-all duration-300 flex flex-col items-center justify-center gap-4 overflow-hidden p-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
            onClick={handleBoxClick}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".pdf,.docx,.pptx,.doc,.ppt,.rtf,.txt,.csv,.json,.log,.zip"
              className="hidden"
            />
            <div className="absolute inset-0 bg-[#f6f7ed]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="p-4 rounded-2xl bg-[#1f1f1f] group-hover:scale-105 transition-transform duration-300 relative z-10">
              <Upload size={28} className="text-white" />
            </div>
            <div className="text-center relative z-10">
              <p className="text-[#1f1f1f] font-semibold text-base">Upload Evidence Files</p>
              <p className="text-[#a1a19b] text-sm mt-1">PDF, DOCX, ZIP and more</p>
            </div>
          </div>

          {/* Cases Table */}
          <div className="bg-white border border-[#e8e8e4] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="p-5 border-b border-[#e8e8e4] flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#1f1f1f]">Recent Investigations</h3>
              <span className="text-xs px-3 py-1 rounded-full bg-[#f4f4f4] text-[#71717a] border border-[#e8e8e4]">
                {totalCases} total
              </span>
            </div>

            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
              <table className="w-full text-sm">
                <thead className="bg-[#f4f4f4] border-b border-[#e8e8e4]">
                  <tr className="text-[#71717a] text-xs uppercase">
                    <th className="px-5 py-3 text-left font-semibold">Title</th>
                    <th className="px-5 py-3 text-left font-semibold">Created</th>
                    <th className="px-5 py-3 text-left font-semibold">Status</th>
                    <th className="px-5 py-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e8e4]">
                  {savedCases.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-5 py-8 text-center text-[#a1a19b]">
                        No investigations yet. Upload evidence to begin.
                      </td>
                    </tr>
                  ) : (
                    savedCases.map((c) => (
                      <tr 
                        key={c.id}
                        onClick={() => onOpenCase(c)}
                        className="hover:bg-[#f6f7ed]/60 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-4 text-[#1f1f1f] font-medium group-hover:text-[#3a3a3a] transition-colors">
                          {c.title}
                        </td>
                        <td className="px-5 py-4 text-[#a1a19b] text-xs font-mono">
                          {c.date}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block ${
                            c.status === 'Open' 
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                              : 'text-[#71717a] bg-[#f4f4f4] border border-[#e8e8e4]'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button 
                            onClick={(e) => onDeleteCase(e, c.id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-[#a1a19b] hover:text-red-500 transition-colors border-0 bg-transparent"
                            title="Delete Investigation"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Quick Stats */}
        <div className="space-y-5">
          {/* Quick Info Card */}
          <div className="bg-white border border-[#e8e8e4] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h4 className="text-xs font-semibold text-[#a1a19b] uppercase tracking-wider mb-4">Investigation Summary</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#a1a19b] mb-2">Evidence Files</p>
                <div className="flex items-end gap-2">
                <span className="text-3xl font-semibold text-[#1f1f1f] tracking-tight">{totalEvidence}</span>
                  <span className="text-xs text-emerald-600 mb-1 font-medium">+24%</span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-[#e8e8e4] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#1f1f1f] rounded-full transition-all" 
                  style={{width: `${Math.min((totalEvidence / 100) * 100, 100)}%`}}
                ></div>
              </div>
            </div>
          </div>

          {/* Activity Card */}
          <div className="bg-white border border-[#e8e8e4] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <h4 className="text-xs font-semibold text-[#a1a19b] uppercase tracking-wider mb-4">Recent Activity</h4>
            <div className="space-y-3">
              {savedCases.slice(0, 3).map((c, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#1f1f1f] mt-2 flex-shrink-0"></div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#1f1f1f] truncate font-medium">{c.title}</p>
                    <p className="text-[10px] text-[#a1a19b] font-mono">{c.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Version Footer */}
          <div className="bg-white border border-[#e8e8e4] rounded-2xl p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] text-[#71717a] font-mono">CRIMENEXUS v1.0</p>
            <p className="text-[10px] text-[#a1a19b] mt-1">Forensic Analysis Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingView;
