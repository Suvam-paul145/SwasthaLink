import { lazy, Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const AmbientMolecule = lazy(() => import('../components/effects/AmbientMolecule'));
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ROLE_OPTIONS } from '../utils/auth';
import { isDemoAdmin, getMockAdminPending, getMockAdminAllRecords } from '../utils/mockData';
import { AnimatedStatCard, LivePulseIndicator } from '../components/AnimatedStatCard';
import { DashboardHero3D } from '../components/DashboardHero3D';
import { pageTransition, dashboardStagger, tableRowIn } from '../utils/animations';

// ---------------------------------------------------------------------------
// Prescription queue panel (doctor → admin → patient pipeline)
// ---------------------------------------------------------------------------

function PrescriptionQueuePanel({ onAction }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const adminId = user?.systemId || '';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [actionStatus, setActionStatus] = useState({}); // { [id]: 'approving'|'rejecting'|'done' }
  const [rejectReason, setRejectReason] = useState('');
  const [adminView, setAdminView] = useState(null);
  const [auditLog, setAuditLog] = useState([]);

  const fetchPending = useCallback(async () => {
    if (isDemoAdmin(user?.email)) {
      setRecords(getMockAdminPending());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPendingPrescriptions();
      setRecords(data.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load pending prescriptions');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleApprove = async (id) => {
    setActionStatus((s) => ({ ...s, [id]: 'approving' }));
    try {
      await api.approvePrescription(id, adminId);
      setRecords((prev) => prev.filter((r) => r.prescription_id !== id));
      if (selected?.prescription_id === id) setSelected(null);
      if (onAction) onAction();
    } catch (err) {
      alert(`Approval failed: ${err.message}`);
    } finally {
      setActionStatus((s) => ({ ...s, [id]: 'done' }));
    }
  };

  const handleReject = async (id) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }
    setActionStatus((s) => ({ ...s, [id]: 'rejecting' }));
    try {
      await api.rejectPrescription(id, adminId, rejectReason.trim());
      setRecords((prev) => prev.filter((r) => r.prescription_id !== id));
      if (selected?.prescription_id === id) setSelected(null);
      setRejectReason('');
      if (onAction) onAction();
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
    } finally {
      setActionStatus((s) => ({ ...s, [id]: 'done' }));
    }
  };

  // Fetch admin view and audit log when selected prescription changes
  useEffect(() => {
    if (!selected) return;
    const id = selected.prescription_id;
    api.getAdminFullView(id).then(v => setAdminView(v)).catch(() => setAdminView(null));
    api.getAuditLog(id).then(r => setAuditLog(r.items || [])).catch(() => setAuditLog([]));
  }, [selected]);

  return (
    <div className="glass-card rounded-xl overflow-hidden border border-white/5 flex flex-col h-full">
      {/* Panel header */}
      <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center bg-white/[0.01]">
        <div>
          <h3 className="text-lg font-headline font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">medication</span>
            {t('admin.queue_title')}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {t('admin.queue_desc')}
          </p>

        </div>
        <button
          onClick={fetchPending}
          className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-400"
          title="Refresh"
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
      </div>

      {/* Auto Admin ID badge */}
      <div className="px-4 sm:px-6 py-3 border-b border-white/5 flex flex-wrap items-center gap-3 bg-white/[0.02]">
        <span className="material-symbols-outlined text-sm text-teal-400">verified_user</span>
        <span className="text-xs text-slate-400">{t('admin.reviewing_as')}</span>
        <span className="text-xs font-mono font-bold text-teal-300 bg-teal-400/10 px-2.5 py-1 rounded-lg border border-teal-400/20">
          {adminId || t('admin.no_id')}
        </span>
        <LivePulseIndicator status="active" label={t('admin.auto_assigned')} />
      </div>

      {loading && (
        <div className="p-8 text-center text-slate-400 text-sm">
          <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
          <p className="mt-2">{t('admin.loading_rx')}</p>
        </div>
      )}

      {error && (
        <div className="p-6 text-sm text-error-container bg-error/10 flex items-center gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          {error}
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="p-8 text-center text-slate-500 text-sm">
          <span className="material-symbols-outlined text-3xl mb-2 block text-slate-600">check_circle</span>
          {t('admin.no_pending')}
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/5 flex-1 min-h-[500px]">
          {/* Left — list */}
          <div className="overflow-y-auto max-h-[600px] p-4 space-y-3">
            {records.map((rec) => {
              const d = rec.extracted_data;
              const busy = actionStatus[rec.prescription_id] === 'approving'
                        || actionStatus[rec.prescription_id] === 'rejecting';
              return (
                <div
                  key={rec.prescription_id}
                  onClick={() => !busy && setSelected(rec)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selected?.prescription_id === rec.prescription_id
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-surface-container-low hover:bg-surface-container-high border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-white">
                      {d.patient_name || t('admin.unknown_patient')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full uppercase font-bold">
                      {t('admin.pending')}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 space-y-0.5">
                    {d.patient_id && <p>ID: {d.patient_id}</p>}
                    {d.report_type && <p>Type: <span className="capitalize">{d.report_type}</span></p>}
                    {d.doctor_name && <p>Dr. {d.doctor_name}</p>}
                    {d.medications?.length > 0 && (
                      <p>{d.medications.length} medication{d.medications.length !== 1 ? 's' : ''} extracted</p>
                    )}
                    <p className="text-slate-600">
                      {new Date(rec.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — detail / action pane */}
          <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto max-h-[600px] bg-white/[0.01]">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm gap-2">
                <span className="material-symbols-outlined text-3xl text-slate-600">touch_app</span>
                {t('admin.select_doc')}
              </div>
            ) : (
              <>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:items-center">
                  <span>{t('admin.extracted_data')}</span>
                  <span className="text-[10px] text-primary bg-primary/20 px-2 py-1 rounded capitalize">{selected.report_type || t('admin.prescription')}</span>
                </h4>

                {/* Risk Flags Banner */}
                {adminView?.risk_flags?.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">⚠️ {t('admin.risk_flags')}</p>
                    {adminView.risk_flags.map((flag, i) => (
                      <p key={i} className="text-xs text-amber-200">{flag}</p>
                    ))}
                  </div>
                )}

                <div className="space-y-4 text-sm text-slate-300 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      [t('admin.doctor'), selected.extracted_data.doctor_name],
                      [t('admin.patient_name'), selected.extracted_data.patient_name],
                      [t('admin.patient_id'), selected.extracted_data.patient_id],
                      [t('admin.age'), selected.extracted_data.patient_age],
                      [t('admin.date'), selected.extracted_data.prescription_date],
                    ].map(([label, value]) =>
                      value ? (
                        <div key={label} className="bg-white/5 p-2 rounded">
                          <span className="text-slate-500 block mb-1">{label}</span>
                          <span className="text-white font-medium">{value}</span>
                        </div>
                      ) : null
                    )}
                  </div>

                  {selected.extracted_data.diagnosis && (
                    <div className="bg-white/5 p-3 rounded">
                      <span className="text-slate-500 block mb-1">{t('admin.diagnosis')}</span>
                      <span className="text-white">{selected.extracted_data.diagnosis}</span>
                    </div>
                  )}

                  {selected.extracted_data.tests?.length > 0 && (
                    <div>
                      <p className="text-slate-500 mb-2">{t('admin.tests')}</p>
                      <ul className="space-y-2">
                        {selected.extracted_data.tests.map((t, i) => (
                          <li key={i} className="text-xs text-white bg-surface-container-low border border-white/10 rounded-lg px-3 py-2 flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:items-center">
                            <span className="font-semibold">{t.name}</span>
                            {t.status && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.status === 'completed' ? 'bg-primary/20 text-primary' : 'bg-yellow-500/20 text-yellow-300'} uppercase font-bold`}>
                                {t.status}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selected.extracted_data.medications?.length > 0 && (
                    <div>
                      <p className="text-slate-500 mb-2">{t('admin.medications')}</p>
                      <ul className="space-y-2">
                        {selected.extracted_data.medications.map((m, i) => (
                          <li key={i} className="text-xs text-white bg-surface-container-low border border-white/10 rounded-lg p-3">
                            <div className="font-semibold text-sm text-primary mb-1">{m.name} {m.strength && ` ${m.strength}`}</div>
                            <div className="text-slate-400 grid grid-cols-2 gap-1 mt-2">
                              {m.form && <span>Form: <span className="text-white">{m.form}</span></span>}
                              {m.frequency && <span>Freq: <span className="text-white">{m.frequency}</span></span>}
                              {m.duration && <span className="col-span-2">Dur: <span className="text-white">{m.duration}</span></span>}
                              {m.instructions && <span className="col-span-2 text-yellow-200/70 italic mt-1">{m.instructions}</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selected.extracted_data.notes && (
                    <div className="bg-white/5 p-3 rounded text-xs">
                      <span className="text-slate-500 block mb-1">{t('admin.notes')}</span>
                      <span className="text-white">{selected.extracted_data.notes}</span>
                    </div>
                  )}

                  {/* Audit Trail */}
                  {auditLog.length > 0 && (
                    <div className="mt-4">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-2 font-bold">{t('admin.audit_trail')}</p>
                      <div className="space-y-2">
                        {auditLog.map((entry, i) => (
                          <div key={i} className="flex items-start gap-3 text-[11px] bg-white/[0.02] rounded-lg p-2.5 border border-white/5">
                            <span className={`material-symbols-outlined text-sm mt-0.5 ${
                              entry.action === 'uploaded' ? 'text-blue-400'
                              : entry.action === 'approved' ? 'text-emerald-400'
                              : entry.action === 'rejected' ? 'text-rose-400'
                              : entry.action === 'chunked' ? 'text-cyan-400'
                              : 'text-slate-400'
                            }`}>
                              {entry.action === 'uploaded' ? 'upload' : entry.action === 'approved' ? 'check_circle' : entry.action === 'rejected' ? 'cancel' : entry.action === 'chunked' ? 'data_object' : 'history'}
                            </span>
                            <div>
                              <p className="text-white font-medium capitalize">{entry.action}</p>
                              <p className="text-slate-500">{entry.actor_role}: {entry.actor_id} — {new Date(entry.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reject reason input */}
                <input
                  type="text"
                  placeholder={t('admin.reject_reason')}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-surface-container-highest border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none mt-4"
                />

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleApprove(selected.prescription_id)}
                    disabled={actionStatus[selected.prescription_id] === 'approving'}
                    className="flex-1 py-3 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(79,219,200,0.3)] transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    {actionStatus[selected.prescription_id] === 'approving' ? t('admin.approving') : t('admin.approve_send')}
                  </button>
                  <button
                    onClick={() => handleReject(selected.prescription_id)}
                    disabled={actionStatus[selected.prescription_id] === 'rejecting'}
                    className="flex-1 py-3 bg-error/20 text-error font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-error/30 transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-lg">cancel</span>
                    {actionStatus[selected.prescription_id] === 'rejecting' ? t('admin.rejecting') : t('admin.reject_btn')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Panel — Redesigned with 3D hero, animated stats, auto system IDs
// ---------------------------------------------------------------------------

function AdminPanelPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const roleLabel = ROLE_OPTIONS.find((r) => r.value === user?.role)?.label || user?.role || 'Admin';

  const [allRecords, setAllRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all');

  const fetchHistory = useCallback(async () => {
    if (isDemoAdmin(user?.email)) {
      setAllRecords(getMockAdminAllRecords());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllPrescriptions();
      setAllRecords(data.items || []);
    } catch {
      setError('Failed to load prescription history');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const stats = useMemo(() => {
    const total = allRecords.length;
    const pending = allRecords.filter((r) => r.status === 'pending_admin_review').length;
    const approved = allRecords.filter((r) => r.status === 'approved').length;
    const rejected = allRecords.filter((r) => r.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [allRecords]);

  const filteredRecords = useMemo(() => {
    if (historyFilter === 'all') return allRecords;
    return allRecords.filter((r) => r.status === historyFilter);
  }, [allRecords, historyFilter]);

  return (
    <motion.div
      className="relative min-h-screen pb-20"
      {...pageTransition}
    >
      {/* 3D Hero Background */}
      <div className="absolute inset-0 h-72 pointer-events-none overflow-hidden">
        <DashboardHero3D variant="admin" height="280px" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070e17]/60 to-[#070e17]" />
      </div>

      <Suspense fallback={null}>
        <AmbientMolecule className="hidden lg:block absolute -left-8 bottom-40 w-40 h-40 opacity-25 z-0" />
      </Suspense>

      {/* Topbar Navigation */}
      <header className="sticky top-0 z-30 mx-4 mt-4 flex flex-col gap-4 rounded-2xl border border-white/5 bg-slate-950/80 px-4 py-4 backdrop-blur-2xl sm:mx-6 sm:flex-row sm:items-center sm:justify-between lg:mx-0 lg:mt-0 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:px-8 lg:py-0 lg:h-20">
        <div className="flex items-center gap-4">
          <h2 className="text-teal-400 font-bold tracking-tighter text-2xl font-headline">{t('admin.title')}</h2>
          <LivePulseIndicator status="active" label={t('admin.live')} />
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-4">
          <div className="hidden md:flex flex-col items-end">
            <p className="text-xs text-slate-400 uppercase tracking-[0.14em]">{roleLabel}</p>
            <p className="text-sm font-semibold text-white">{user?.name || t('admin.administrator')}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-10 h-10 rounded-full border border-violet-400/30 bg-violet-500/20 flex items-center justify-center text-violet-300">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
            <span className="text-[8px] font-mono text-violet-300/60 tracking-wider">{user?.systemId || ''}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pt-8 max-w-[1600px] mx-auto space-y-8 relative z-10">
        
        {/* Section: Animated Stats Ribbon */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          {...dashboardStagger}
        >
          <AnimatedStatCard 
            title={t('admin.total_processed')} 
            value={stats.total} 
            icon="monitoring" 
            gradient="from-blue-400 to-indigo-500" 
            delay={0}
            trend={12}
            trendLabel={t('admin.this_month')}
          />
          <AnimatedStatCard 
            title={t('admin.pending_approval')} 
            value={stats.pending} 
            icon="hourglass_top" 
            gradient="from-amber-400 to-orange-500" 
            delay={0.07}
            sparkline={[4,6,8,5,10,7,stats.pending]}
          />
          <AnimatedStatCard 
            title={t('admin.approved')} 
            value={stats.approved} 
            icon="check_circle" 
            gradient="from-teal-400 to-emerald-500" 
            delay={0.14}
            trend={8}
          />
          <AnimatedStatCard 
            title={t('admin.rejected')} 
            value={stats.rejected} 
            icon="cancel" 
            gradient="from-rose-400 to-red-500" 
            delay={0.21}
          />
        </motion.div>

        {/* Section: Active Queue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <PrescriptionQueuePanel onAction={fetchHistory} />
        </motion.div>

        {/* Section: Prescription History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col min-h-[400px]"
        >
          <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center bg-white/[0.01]">
            <div>
              <h3 className="text-lg font-headline font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history</span>
                {t('admin.history_title')}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {t('admin.history_desc')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Status filter pills */}
              {[{ value: 'all', label: t('admin.all') }, { value: 'pending_admin_review', label: t('admin.pending') }, { value: 'approved', label: t('admin.approved') }, { value: 'rejected', label: t('admin.rejected') }].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setHistoryFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                    historyFilter === f.value
                      ? 'bg-teal-400/20 text-teal-300 border border-teal-400/30'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <button
                onClick={fetchHistory}
                className="p-2 flex items-center gap-2 hover:bg-white/5 rounded-full transition-all text-slate-400 text-sm font-semibold"
                title="Refresh History"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1 h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl mb-4">progress_activity</span>
                <p>{t('admin.loading_history')}</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-error text-sm">
                <span className="material-symbols-outlined text-4xl mb-4">error</span>
                <p>{error}</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                <span className="material-symbols-outlined text-4xl mb-4 block text-slate-600">inbox</span>
                {historyFilter === 'all' ? t('admin.no_history') : t('admin.no_filtered').replace('{filter}', historyFilter)}
              </div>
            ) : (
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface-container-high text-xs uppercase tracking-wider text-slate-400 border-b border-white/5 shadow-md">
                    <th className="p-4 font-semibold whitespace-nowrap">{t('admin.col_date')}</th>
                    <th className="p-4 font-semibold whitespace-nowrap">{t('admin.col_type')}</th>
                    <th className="p-4 font-semibold whitespace-nowrap">{t('admin.col_patient')}</th>
                    <th className="p-4 font-semibold whitespace-nowrap">{t('admin.col_doctor')}</th>
                    <th className="p-4 font-semibold whitespace-nowrap">{t('admin.col_status')}</th>
                    <th className="p-4 font-semibold whitespace-nowrap">{t('admin.col_score')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRecords.map((rec, index) => {
                    const d = rec.extracted_data || {};
                    return (
                      <motion.tr
                        key={rec.prescription_id}
                        initial={tableRowIn.initial}
                        animate={tableRowIn.animate}
                        transition={{ ...tableRowIn.transition, delay: index * 0.03 }}
                        className="hover:bg-white/[0.02] text-sm text-slate-300 transition-colors"
                      >
                        <td className="p-4 whitespace-nowrap">
                          {new Date(rec.created_at).toLocaleDateString()}
                          <span className="block text-xs text-slate-500 mt-0.5">{new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="p-4 font-medium text-white capitalize">
                          {rec.report_type || t('admin.prescription')}
                        </td>
                        <td className="p-4">
                          <span className="text-white font-medium">{d.patient_name || t('admin.unknown')}</span>
                          <span className="block text-[10px] text-slate-500 mt-0.5 tracking-wider">ID: {d.patient_id || 'N/A'}</span>
                        </td>
                        <td className="p-4 text-slate-300">
                          {d.doctor_name ? `Dr. ${d.doctor_name}` : t('admin.unknown')}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 inline-flex items-center gap-1 rounded justify-center text-[10px] font-bold uppercase tracking-wider border ${
                            rec.status === 'approved' ? 'bg-primary/10 text-primary border-primary/20' :
                            rec.status === 'rejected' ? 'bg-error/10 text-error border-error/20' :
                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}>
                            <span className="material-symbols-outlined text-[10px]">
                              {rec.status === 'approved' ? 'check_circle' : rec.status === 'rejected' ? 'cancel' : 'hourglass_top'}
                            </span>
                            {rec.status === 'pending_admin_review' ? t('admin.pending') : rec.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {d.extraction_confidence ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-mono text-xs ${d.extraction_confidence > 0.8 ? 'text-primary' : 'text-yellow-400'}`}>
                                {Math.round(d.extraction_confidence * 100)}%
                              </span>
                            </div>
                          ) : '--'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>

      </main>
    </motion.div>
  );
}

export default AdminPanelPage;
