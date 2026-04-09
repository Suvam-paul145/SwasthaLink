import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AmbientLungs = lazy(() => import('../components/effects/AmbientLungs'));
const AmbientHeart = lazy(() => import('../components/effects/AmbientHeart'));
import api from '../services/api';
import ChatbotPanel from '../components/ChatbotPanel';
import RiskGauge from '../components/RiskGauge';
import ShareQRModal from '../components/ShareQRModal';
import EmergencyQRCard from '../components/EmergencyQRCard';
import { isDemoPatient, getMockPrescriptions, getMockDischargeHistory, getMockAllChunks, MOCK_DOCTOR_PATIENT_LIST } from '../utils/mockData';
import { saveReport, getReports, deleteReport, downloadReportPdf } from '../services/reportStore';
import { useLanguage } from '../context/LanguageContext';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'medications', label: 'Medications', icon: 'medication' },
  { id: 'routine', label: 'Daily Routine', icon: 'schedule' },
  { id: 'recovery', label: 'Recovery', icon: 'trending_up' },
  { id: 'explanations', label: 'Explanations', icon: 'help_outline' },
  { id: 'documents', label: 'Documents', icon: 'folder_supervised' },
  { id: 'reports', label: 'Reports', icon: 'description' },
];

function FamilyDashboardPage() {
  const { user, updateUserProfile } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = { en: 'en-IN', bn: 'bn-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN' }[language] || 'en-IN';
  const patientName = user?.name || 'Patient';
  const patientId = user?.user_id || user?.id || user?.email || '';

  const [activeTab, setActiveTab] = useState('overview');
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxLoading, setRxLoading] = useState(true);
  const [chunks, setChunks] = useState({});
  const [chunksLoading, setChunksLoading] = useState(false);
  const [dischargeHistory, setDischargeHistory] = useState([]);
  const [dischargeLoading, setDischargeLoading] = useState(false);
  const [linkedPid, setLinkedPid] = useState(user?.linkedPid || null);
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkStatus, setLinkStatus] = useState({ type: '', message: '' });
  const [showShareQR, setShowShareQR] = useState(false);
  const [showEmergencyCard, setShowEmergencyCard] = useState(false);
  const [savedReports, setSavedReports] = useState(() => getReports());
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportStage, setReportStage] = useState(-1); // -1 = not running
  const [reportToast, setReportToast] = useState(null);
  const [viewingReport, setViewingReport] = useState(null);

  // Support ?tab=reports from sidebar button
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && TABS.some(tb => tb.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Derive all unique PIDs from prescriptions for the "Your Medical IDs" section
  const patientPids = prescriptions.reduce((acc, rx) => {
    const pid = rx.extracted_data?.patient_id || rx.patient_id;
    if (!pid || acc.find(p => p.pid === pid)) return acc;
    acc.push({
      pid,
      patientName: rx.extracted_data?.patient_name || rx.patient_name || patientName,
      doctorName: rx.extracted_data?.doctor_name || 'Unknown Doctor',
      reportType: rx.report_type || 'prescription',
      createdAt: rx.created_at,
      status: rx.status,
    });
    return acc;
  }, []);

  // Fetch prescriptions and history — use linkedPid from AuthContext session
  useEffect(() => {
    (async () => {
      setRxLoading(true);
      setDischargeLoading(true);

      // Demo mode: inject hardcoded mock data for patient@gmail.com
      if (isDemoPatient(user?.email)) {
        setPrescriptions(getMockPrescriptions());
        setDischargeHistory(getMockDischargeHistory());
        setChunks(getMockAllChunks());
        setLinkedPid('PID-DEMO01');
        setRxLoading(false);
        setDischargeLoading(false);
        return;
      }

      try {
        // Use linkedPid from auth session (already fetched during login/verify)
        let currentPid = linkedPid;
        if (!currentPid) {
          const profile = await api.getPatientProfile().catch(() => ({}));
          currentPid = profile.linked_pid || null;
          if (currentPid) {
            setLinkedPid(currentPid);
            updateUserProfile({ linkedPid: currentPid });
          }
        }

        const idsToFetch = [patientId];
        if (currentPid) idsToFetch.push(currentPid);

        // Fetch for all associated IDs
        const fetchResults = await Promise.all(idsToFetch.map(id => 
          Promise.all([
            api.getPatientPrescriptions(id).catch(() => ({ items: [] })),
            api.getPatientHistory(id).catch(() => ({ results: [] }))
          ])
        ));

        // Merge and deduplicate results
        const seenRx = new Set();
        const allRx = fetchResults.flatMap(r => r[0].items || []).filter(rx => {
          if (seenRx.has(rx.prescription_id)) return false;
          seenRx.add(rx.prescription_id);
          return true;
        });
        const seenDis = new Set();
        const allDischarge = fetchResults.flatMap(r => r[1].results || []).filter(d => {
          const key = d.id || d.created_at;
          if (seenDis.has(key)) return false;
          seenDis.add(key);
          return true;
        });

        // Sort by date
        allRx.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        allDischarge.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        setPrescriptions(allRx);
        setDischargeHistory(allDischarge);
      } catch (err) {
        console.warn('Failed to load data:', err.message);
      } finally { 
        setRxLoading(false); 
        setDischargeLoading(false);
      }
    })();
  }, [patientId]);

  const handleLinkPid = async (e) => {
    e.preventDefault();
    if (!linkInput.trim()) return;
    setLinking(true);
    setLinkStatus({ type: 'info', message: t('link.linking_msg') });
    try {
      const res = await api.linkPatientPid(linkInput);
      setLinkStatus({ type: 'success', message: res.message });
      setLinkedPid(linkInput);
      updateUserProfile({ linkedPid: linkInput });
      setLinkInput('');
      // Trigger refresh
      window.location.reload(); 
    } catch (err) {
      setLinkStatus({ type: 'error', message: err.message });
    } finally {
      setLinking(false);
    }
  };

  // Report generation stages for progress animation
  const REPORT_STAGES = [
    { icon: 'search', label: t('stage.0') },
    { icon: 'medication', label: t('stage.1') },
    { icon: 'assessment', label: t('stage.2') },
    { icon: 'picture_as_pdf', label: t('stage.3') },
    { icon: 'check_circle', label: t('stage.4') },
  ];

  // Generate health report PDF, save to localStorage, optionally send WhatsApp summary
  const handleGenerateReport = async (rx, sendWhatsApp = false) => {
    if (reportGenerating) return;
    setReportGenerating(true);
    setReportStage(0);
    setReportToast(null);

    // Stage advancement timer — each stage lasts 1 second (5 stages = 5 seconds)
    const stageTimer = setInterval(() => {
      setReportStage((prev) => (prev < REPORT_STAGES.length - 1 ? prev + 1 : prev));
    }, 1000);

    // Minimum 5-second display promise
    const minDelay = new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      const ed = rx?.extracted_data || rx || {};
      const reportPayload = {
        patient_name: ed.patient_name || patientName,
        patient_id: ed.patient_id || linkedPid || patientId,
        patient_age: ed.patient_age || null,
        patient_gender: ed.patient_gender || null,
        doctor_name: ed.doctor_name || null,
        diagnosis: ed.diagnosis || null,
        notes: ed.notes || null,
        prescription_date: ed.prescription_date || rx?.created_at || null,
        medications: ed.medications || [],
        tests: ed.tests || [],
        patient_insights: ed.patient_insights || null,
        discharge_history: dischargeHistory.map(d => ({
          discharge_date: d.discharge_date || d.created_at,
          diagnosis: d.diagnosis,
          risk_score: d.risk_score,
          risk_level: d.risk_level,
          follow_up_instructions: d.follow_up_instructions,
        })),
        language,
      };

      // Run API call and minimum delay in parallel
      const [res] = await Promise.all([api.generateReport(reportPayload), minDelay]);
      clearInterval(stageTimer);
      setReportStage(REPORT_STAGES.length - 1);

      if (!res.success) throw new Error('Backend returned failure');

      const pdfDataUri = `data:application/pdf;base64,${res.pdf_base64}`;
      const textSummary = res.text_summary;
      const fileName = res.file_name;

      // Save report to localStorage
      const saved = saveReport({
        patientId: reportPayload.patient_id,
        patientName: reportPayload.patient_name,
        diagnosis: reportPayload.diagnosis,
        summary: textSummary,
        fileName,
        pdfDataUri,
        prescriptionId: rx?.prescription_id,
      });
      setSavedReports(getReports());

      // Show PDF inline in the reports tab
      setViewingReport(saved);
      setActiveTab('reports');

      // Send WhatsApp summary if requested
      if (sendWhatsApp) {
        let phone = user?.phone;
        // Demo mode — use mock phone
        if (!phone && isDemoPatient(user?.email)) {
          const demoPatient = MOCK_DOCTOR_PATIENT_LIST.find(p => p.email === user.email);
          phone = demoPatient?.phone?.replace(/-/g, '') || '+919876543210';
        }
        if (phone) {
          // Normalize to E.164: strip dashes/spaces, ensure + prefix
          let normalizedPhone = phone.replace(/[-\s()]/g, '');
          if (!normalizedPhone.startsWith('+')) {
            normalizedPhone = '+' + normalizedPhone;
          }
          try {
            await api.sendWhatsApp({ phone_number: normalizedPhone, message: textSummary });
            setReportToast({ type: 'success', message: `${t('toast.report_whatsapp')} ${normalizedPhone}` });
          } catch (whatsErr) {
            console.warn('WhatsApp send failed:', whatsErr.message);
            const detail = whatsErr?.details?.detail || whatsErr.message || '';
            const isSandbox = detail.toLowerCase().includes('sandbox');
            setReportToast({
              type: 'warning',
              message: isSandbox
                ? (detail || t('toast.sandbox_report'))
                : (detail || t('toast.whatsapp_fail')),
            });
          }
        } else {
          setReportToast({ type: 'success', message: t('toast.no_phone') });
        }
      } else {
        setReportToast({ type: 'success', message: t('toast.report_success') });
      }

      // Auto-dismiss toast
      setTimeout(() => setReportToast(null), 6000);
    } catch (err) {
      clearInterval(stageTimer);
      console.error('Report generation failed:', err);
      setReportToast({ type: 'error', message: t('toast.report_fail') });
      setTimeout(() => setReportToast(null), 5000);
    } finally {
      setReportGenerating(false);
      setReportStage(-1);
    }
  };

  // Delete a saved report
  const handleDeleteReport = (reportId) => {
    deleteReport(reportId);
    setSavedReports(getReports());
    if (viewingReport?.id === reportId) setViewingReport(null);
  };

  // Send a saved report summary via WhatsApp
  const handleShareReportWhatsApp = async (report) => {
    let phone = user?.phone;
    if (!phone && isDemoPatient(user?.email)) {
      const demoPatient = MOCK_DOCTOR_PATIENT_LIST.find(p => p.email === user.email);
      phone = demoPatient?.phone?.replace(/-/g, '') || '+919876543210';
    }
    if (!phone) {
      setReportToast({ type: 'warning', message: t('toast.no_phone_update') });
      setTimeout(() => setReportToast(null), 5000);
      return;
    }
    // Normalize to E.164: strip dashes/spaces, ensure + prefix
    let normalizedPhone = phone.replace(/[-\s()]/g, '');
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    try {
      await api.sendWhatsApp({ phone_number: normalizedPhone, message: report.summary });
      setReportToast({ type: 'success', message: `${t('toast.whatsapp_sent')}` });
    } catch (err) {
      const detail = err?.details?.detail || err.message || '';
      const isSandbox = detail.toLowerCase().includes('sandbox');
      setReportToast({
        type: 'error',
        message: isSandbox
          ? (detail || t('toast.sandbox_share'))
          : (detail || t('toast.whatsapp_delivery_fail')),
      });
    }
    setTimeout(() => setReportToast(null), 5000);
  };

  // Fetch chunks when tab changes
  useEffect(() => {
    if (!patientId || isDemoPatient(user?.email)) return;
    const typeMap = { medications: 'medication', routine: 'routine', explanations: 'explanation', recovery: 'medication' };
    const chunkType = typeMap[activeTab];
    if (!chunkType || chunks[chunkType]) return;

    setChunksLoading(true);
    api.getPatientChunksByType(patientId, chunkType)
      .then(res => setChunks(prev => ({ ...prev, [chunkType]: res.items || [] })))
      .catch(() => {})
      .finally(() => setChunksLoading(false));
  }, [activeTab, patientId]);

  const latestRx = prescriptions[0];
  const insights = latestRx?.extracted_data?.patient_insights || latestRx?.patient_insights;
  const extracted = latestRx?.extracted_data || latestRx || {};
  const medicationChunks = chunks.medication || [];
  const routineChunks = chunks.routine || [];
  const explanationChunks = chunks.explanation || [];

  // Flatten medication data
  const allMedications = medicationChunks.flatMap(c => c.data?.medications || []);
  const routineSteps = routineChunks.flatMap(c => c.data?.steps || []);
  const explanations = explanationChunks.flatMap(c => c.data?.explanations || []);

  // Fallback: use prescription data directly if no chunks exist
  const fallbackMeds = (extracted?.medications || []);
  const displayMeds = allMedications.length > 0 ? allMedications : fallbackMeds;

  return (
    <div className="family-dashboard-page" style={{ minHeight: '100vh', background: '#070e17', color: '#fff', padding: '24px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-100px', right: '-80px', width: '280px', height: '280px', background: 'rgba(13,148,136,.1)', borderRadius: '50%', filter: 'blur(100px)' }} />
      <div style={{ position: 'absolute', bottom: '-120px', left: '-80px', width: '300px', height: '300px', background: 'rgba(34,211,238,.08)', borderRadius: '50%', filter: 'blur(120px)' }} />

      <Suspense fallback={null}>
        <AmbientHeart className="hidden lg:block absolute right-8 top-20 w-44 h-44 opacity-25 z-0" />
        <AmbientLungs className="hidden lg:block absolute -left-8 bottom-40 w-48 h-48 opacity-20 z-0" />
      </Suspense>

      <div className="family-dashboard-inner" style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div className="family-dashboard-header" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ background: 'rgba(13,148,136,.2)', color: '#5eead4', padding: '4px 12px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', border: '1px solid rgba(13,148,136,.2)' }}>{t('header.badge')}</span>
          </div>
          <h1 className="family-dashboard-title" style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>{t('header.title')}</h1>
          <div className="family-dashboard-header-meta" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
            <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
              {t('header.subtitle')} <span style={{ color: '#5eead4', fontWeight: 600 }}>{patientName}</span>
              {linkedPid && <span style={{ marginLeft: '12px', fontSize: '12px', background: 'rgba(94,234,212,.1)', color: '#5eead4', padding: '2px 8px', borderRadius: '6px' }}>{t('linked')}: {linkedPid}</span>}
            </p>
            <button
              onClick={() => setShowShareQR(true)}
              className="family-dashboard-header-button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(13,148,136,.15)', border: '1px solid rgba(13,148,136,.3)', borderRadius: '10px', padding: '6px 14px', color: '#5eead4', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>qr_code_2</span>
              {t('share.family')}
            </button>
            <button
              onClick={() => setShowEmergencyCard(true)}
              className="family-dashboard-header-button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '10px', padding: '6px 14px', color: '#fca5a5', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>emergency</span>
              {t('emergency.card')}
            </button>
          </div>
        </div>

        {/* Link Records Section */}
        {!linkedPid && (
          <div className="family-dashboard-link-card" style={{ background: 'rgba(13,148,136,.05)', border: '1px dashed rgba(13,148,136,.3)', borderRadius: '20px', padding: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div className="family-dashboard-link-info" style={{ flex: 1, minWidth: '300px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#5eead4' }}>{t('link.title')}</h4>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>{t('link.subtitle')}</p>
            </div>
            <form className="family-dashboard-link-form" onSubmit={handleLinkPid} style={{ display: 'flex', gap: '10px', flex: '0 0 auto' }}>
              <input 
                type="text" 
                placeholder="PID-XXXXXX"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value.toUpperCase())}
                style={{ background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '10px', padding: '10px 16px', color: '#fff', fontSize: '14px', width: '140px', outline: 'none' }}
              />
              <button 
                type="submit" 
                disabled={linking || !linkInput}
                style={{ background: '#0d9488', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', opacity: (linking || !linkInput) ? 0.6 : 1 }}
              >
                {linking ? t('link.linking') : t('link.button')}
              </button>
            </form>
            {linkStatus.message && (
              <p style={{ width: '100%', fontSize: '12px', color: linkStatus.type === 'error' ? '#f87171' : '#5eead4', margin: 0 }}>
                {linkStatus.message}
              </p>
            )}
          </div>
        )}

        {/* Your Medical IDs — all PIDs from prescriptions */}
        {patientPids.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '20px', padding: '24px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#5eead4' }}>badge</span>
              <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#e2e8f0' }}>{t('medical.ids')}</h4>
              <span style={{ fontSize: '11px', color: '#64748b', background: 'rgba(255,255,255,.05)', padding: '2px 8px', borderRadius: '6px' }}>{patientPids.length} {patientPids.length !== 1 ? t('misc.records') : t('misc.record')}</span>
            </div>
            <div className="family-dashboard-pid-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {patientPids.map((p) => {
                const date = p.createdAt ? new Date(p.createdAt) : null;
                return (
                  <div key={p.pid} className="family-dashboard-pid-card" style={{ background: 'rgba(13,148,136,.06)', border: '1px solid rgba(13,148,136,.15)', borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="family-dashboard-pid-main">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', color: '#5eead4' }}>{p.pid}</span>
                        {p.pid === linkedPid && <span style={{ fontSize: '9px', background: 'rgba(94,234,212,.15)', color: '#5eead4', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>{t('linked').toUpperCase()}</span>}
                        <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, background: p.status === 'approved' ? 'rgba(34,197,94,.12)' : p.status === 'pending_admin_review' ? 'rgba(234,179,8,.12)' : 'rgba(255,255,255,.06)', color: p.status === 'approved' ? '#4ade80' : p.status === 'pending_admin_review' ? '#facc15' : '#94a3b8' }}>
                          {p.status === 'approved' ? t('approved') : p.status === 'pending_admin_review' ? t('status.pending') : p.status || 'N/A'}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                        {p.doctorName} &middot; {p.reportType}
                      </p>
                      {date && (
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                          {date.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })} {date.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className="family-dashboard-pid-actions">
                      <button onClick={() => { navigator.clipboard.writeText(p.pid); }} title="Copy PID" style={{ background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>content_copy</span>
                      </button>
                      <button
                        onClick={() => {
                          const rx = prescriptions.find(r => (r.extracted_data?.patient_id || r.patient_id) === p.pid);
                          if (rx) handleGenerateReport(rx, true);
                        }}
                        disabled={reportGenerating}
                        title="Generate Health Report & Send to WhatsApp"
                        style={{ background: reportGenerating ? 'rgba(13,148,136,.1)' : 'rgba(13,148,136,.15)', border: '1px solid rgba(13,148,136,.3)', borderRadius: '8px', padding: '6px 10px', cursor: reportGenerating ? 'wait' : 'pointer', color: '#5eead4', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, transition: 'all .2s' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{reportGenerating ? 'progress_activity' : 'picture_as_pdf'}</span>
                        {t('report')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="family-dashboard-tabs" style={{ display: 'flex', gap: '4px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px', borderRadius: '14px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #0d9488, #0f766e)' : 'rgba(255,255,255,.04)',
                color: activeTab === tab.id ? '#fff' : '#94a3b8',
                border: activeTab === tab.id ? 'none' : '1px solid rgba(255,255,255,.06)',
                transition: 'all .2s',
              }}
              id={`tab-${tab.id}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
              {t('tab.' + tab.id)}
            </button>
          ))}
        </div>

        {/* Report Generation Stage Animation Overlay */}
        {reportGenerating && reportStage >= 0 && (
          <div className="family-dashboard-stage" style={{
            background: 'rgba(15,23,42,.92)', backdropFilter: 'blur(12px)',
            borderRadius: '20px', padding: '36px', marginBottom: '28px',
            border: '1px solid rgba(13,148,136,.25)', position: 'relative', overflow: 'hidden',
          }}>
            {/* Animated gradient bar at top */}
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '3px',
              width: `${((reportStage + 1) / REPORT_STAGES.length) * 100}%`,
              background: 'linear-gradient(90deg, #0d9488, #2dd4bf, #5eead4)',
              transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
              borderRadius: '0 3px 3px 0',
            }} />
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <span className="material-symbols-outlined" style={{
                fontSize: '36px', color: '#2dd4bf',
                animation: 'spin 1.5s linear infinite',
              }}>progress_activity</span>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '12px 0 4px', color: '#f0fdfa' }}>
                {t('stage.title')}
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>{t('stage.wait')}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {REPORT_STAGES.map((stage, i) => {
                const isActive = i === reportStage;
                const isDone = i < reportStage;
                const isPending = i > reportStage;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '12px 16px', borderRadius: '12px',
                    background: isActive ? 'rgba(13,148,136,.15)' : isDone ? 'rgba(13,148,136,.06)' : 'transparent',
                    border: isActive ? '1px solid rgba(13,148,136,.3)' : '1px solid transparent',
                    transition: 'all 0.5s ease',
                    opacity: isPending ? 0.35 : 1,
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: '20px',
                      color: isDone ? '#2dd4bf' : isActive ? '#5eead4' : '#475569',
                      animation: isActive ? 'spin 1.5s linear infinite' : 'none',
                    }}>
                      {isDone ? 'check_circle' : isActive ? 'progress_activity' : stage.icon}
                    </span>
                    <span style={{
                      fontSize: '13px', fontWeight: isActive ? 600 : 400,
                      color: isDone ? '#2dd4bf' : isActive ? '#f0fdfa' : '#64748b',
                      transition: 'color 0.3s',
                    }}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Tab Content */}
        <div className="family-dashboard-content" style={{ minHeight: '400px' }}>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="family-dashboard-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
              {/* Clinical Status */}
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.2em', color: '#64748b' }}>{t('overview.clinical')}</p>
                    <h4 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 0' }}>{t('overview.condition')}</h4>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: '#0d9488', background: 'rgba(13,148,136,.1)', padding: '10px', borderRadius: '14px' }}>monitoring</span>
                </div>
                {rxLoading ? (<SkeletonBlock />) : insights?.health_summary ? (
                  <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7 }}>{insights.health_summary}</p>
                ) : extracted?.diagnosis ? (
                  <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7 }}>{t('docs.diagnosis')}: {extracted.diagnosis}</p>
                ) : <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>{t('overview.clinical_wait')}</p>}
              </div>

              {/* Do's & Don'ts (AI Suggestions) */}
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.2em', color: '#64748b' }}>{t('overview.suggestions')}</p>
                    <h4 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 0' }}>{t('overview.dos_donts')}</h4>
                  </div>
                  <span className="material-symbols_outlined" style={{ color: '#f59e0b', background: 'rgba(245,158,11,.1)', padding: '10px', borderRadius: '14px' }}>priority_high</span>
                </div>
                {rxLoading ? (<SkeletonBlock />) : (insights?.dos_and_donts?.do?.length > 0 || insights?.dos_and_donts?.dont?.length > 0) ? (
                  <div>
                    {insights.dos_and_donts.do?.length > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <p style={{ fontSize: '11px', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: '8px' }}>✅ {t('overview.do')}</p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {insights.dos_and_donts.do.map((item, i) => (
                            <li key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(34,197,94,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(34,197,94,.2)', color: '#4ade80', fontWeight: 700, fontSize: '10px', flexShrink: 0 }}>{i + 1}</div>
                              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>{item}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {insights.dos_and_donts.dont?.length > 0 && (
                      <div>
                        <p style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.15em', marginBottom: '8px' }}>❌ {t('overview.dont')}</p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {insights.dos_and_donts.dont.map((item, i) => (
                            <li key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', fontWeight: 700, fontSize: '10px', flexShrink: 0 }}>{i + 1}</div>
                              <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>{item}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>{t('overview.ai_wait')}</p>}
              </div>

              {/* Doctor Info */}
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,.08)', gridColumn: 'span 1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(13,148,136,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(13,148,136,.2)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0d9488' }}>stethoscope</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: '#0d9488', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.2em' }}>{t('overview.lead_physician')}</p>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0 0' }}>{extracted?.doctor_name || t('overview.pending_assign')}</h4>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{extracted?.diagnosis || t('overview.diag_pending')}</p>
                  </div>
                </div>
              </div>

              {/* Readmission Risk — only visible when patient has been admitted/discharged */}
              {dischargeHistory.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,.08)', gridColumn: 'span 1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.2em', color: '#64748b' }}>{t('overview.risk')}</p>
                      <h4 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 0' }}>{t('overview.readmission')}</h4>
                    </div>
                  </div>
                  {dischargeLoading ? <SkeletonBlock /> : dischargeHistory[0].risk_score !== undefined ? (
                    <RiskGauge score={dischargeHistory[0].risk_score} level={dischargeHistory[0].risk_level} />
                  ) : (
                    <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>{t('overview.risk_none')}</p>
                  )}
                </div>
              )}

              {/* Clarity Center Link */}
              <div style={{ background: 'linear-gradient(135deg, rgba(13,148,136,.08), transparent)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(13,148,136,.2)' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '10px' }}>🧠 {t('overview.clarity')}</h4>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>{t('overview.clarity_desc')}</p>
                <a href="/clarity-hub" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#2dd4bf', color: '#071325', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.1em', textDecoration: 'none' }}>
                  {t('overview.go_clarity')}
                </a>
              </div>
            </div>
          )}

          {/* MEDICATIONS TAB */}
          {activeTab === 'medications' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>💊 {t('med.title')}</h3>
              {chunksLoading || rxLoading ? <SkeletonGrid /> : displayMeds.length === 0 ? (
                <EmptyState message={t('med.empty')} />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {displayMeds.map((med, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '16px', padding: '22px', border: '1px solid rgba(255,255,255,.08)', transition: 'border-color .2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{med.name}</h4>
                        {med.form && <span style={{ fontSize: '10px', background: 'rgba(13,148,136,.15)', color: '#5eead4', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>{med.form}</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                        {med.strength && <Detail label={t('med.strength')} value={med.strength} />}
                        {med.frequency && <Detail label={t('med.frequency')} value={med.frequency} />}
                        {med.duration && <Detail label={t('med.duration')} value={med.duration} />}
                        {med.instructions && <Detail label={t('med.instructions')} value={med.instructions} />}
                      </div>
                      {med.purpose && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,.06)' }}>💡 {med.purpose}</p>}
                      {med.warnings && <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>⚠️ {med.warnings}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DAILY ROUTINE TAB */}
          {activeTab === 'routine' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>📅 {t('routine.title')}</h3>
              {chunksLoading ? <SkeletonBlock /> : routineSteps.length === 0 ? (
                <EmptyState message={t('routine.empty')} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {routineSteps.map((step, i) => {
                    const priorityColors = { critical: '#ef4444', high: '#f59e0b', moderate: '#3b82f6' };
                    const borderColor = priorityColors[step.priority] || '#0d9488';
                    return (
                      <div key={i} style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,.03)', borderRadius: '14px', padding: '18px 22px', border: '1px solid rgba(255,255,255,.06)', borderLeft: `3px solid ${borderColor}` }}>
                        <div style={{ minWidth: '64px', textAlign: 'center', flexShrink: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 700, color: '#5eead4', margin: 0 }}>{step.time || step.timing || ''}</p>
                          {step.icon && <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b', marginTop: '4px', display: 'block' }}>{step.icon}</span>}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{step.activity || step.action}</p>
                          {step.priority && <span style={{ fontSize: '10px', fontWeight: 600, color: borderColor, textTransform: 'uppercase', letterSpacing: '.1em', marginTop: '4px', display: 'inline-block' }}>{step.priority}</span>}
                          {step.instructions && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{step.instructions}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* RECOVERY TAB */}
          {activeTab === 'recovery' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>📈 {t('recovery.title')}</h3>
              {displayMeds.length === 0 ? (
                <EmptyState message={t('recovery.empty')} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {displayMeds.filter(m => m.duration).map((med, i) => {
                    const durationDays = parseInt(med.duration) || 7;
                    const progress = Math.min(100, Math.round((1 / durationDays) * 100 * 2));
                    return (
                      <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '14px', padding: '18px 22px', border: '1px solid rgba(255,255,255,.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>{med.name}</h4>
                          <span style={{ fontSize: '12px', color: '#5eead4', fontWeight: 600 }}>{med.duration}</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #0d9488, #2dd4bf)', borderRadius: '8px', transition: 'width 1s ease' }} />
                        </div>
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>{med.frequency || t('med.as_directed')}</p>
                      </div>
                    );
                  })}
                  {displayMeds.filter(m => !m.duration).length > 0 && (
                    <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginTop: '8px' }}>
                      {displayMeds.filter(m => !m.duration).length} {t('med.no_duration')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* EXPLANATIONS TAB */}
          {activeTab === 'explanations' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>❓ {t('explain.title')}</h3>
              {chunksLoading ? <SkeletonBlock /> : explanations.length === 0 ? (
                // Fallback to prescription data
                displayMeds.length === 0 ? (
                  <EmptyState message={t('explain.empty')} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {displayMeds.map((med, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '14px', padding: '20px 24px', border: '1px solid rgba(255,255,255,.06)' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#5eead4', marginBottom: '8px' }}>{med.name}</h4>
                        <p style={{ fontSize: '13px', color: '#cbd5e1' }}>💡 {med.purpose || t('explain.prescribed')}</p>
                        {med.warnings && <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px' }}>⚠️ {med.warnings}</p>}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {explanations.map((exp, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '14px', padding: '20px 24px', border: '1px solid rgba(255,255,255,.06)' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#5eead4', marginBottom: '8px' }}>{exp.topic || exp.medicine}</h4>
                      <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.7 }}>💡 {exp.explanation || exp.reason}</p>
                      {exp.how_it_works && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>🔬 {exp.how_it_works}</p>}
                      {exp.caution && <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>⚠️ {exp.caution}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>📁 {t('docs.title')}</h3>
              {rxLoading ? <SkeletonGrid /> : prescriptions.length === 0 ? (
                <EmptyState message={t('docs.empty')} />
              ) : (
                <div className="family-dashboard-doc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {prescriptions.map(rx => {
                    const ed = rx.extracted_data || rx;
                    const meds = ed.medications || rx.medications || [];
                    const type = rx.report_type || 'prescription';
                    const imageUrl = rx.image_url || null;
                    return (
                      <div key={rx.prescription_id} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '16px', padding: '22px', border: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '14px' }}>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 700 }}>{ed.doctor_name || t('docs.medical_team')}</p>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: '2px' }}>
                              {new Date(rx.created_at || ed.prescription_date).toLocaleDateString(dateLocale)}
                            </p>
                          </div>
                          <span style={{ fontSize: '9px', background: 'rgba(13,148,136,.1)', color: '#5eead4', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', border: '1px solid rgba(13,148,136,.2)' }}>{type}</span>
                        </div>
                        {(ed.diagnosis || rx.diagnosis) && (
                          <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.1em', marginBottom: '4px' }}>{t('docs.diagnosis')}</p>
                            <p style={{ fontSize: '12px', color: '#cbd5e1' }}>{ed.diagnosis || rx.diagnosis}</p>
                          </div>
                        )}
                        {meds.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.1em', marginBottom: '8px' }}>{t('med.medications')}</p>
                            {meds.slice(0, 3).map((med, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2dd4bf', flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{med.name}</span>
                                {med.frequency && <span style={{ fontSize: '11px', color: '#5eead4' }}>{med.frequency}</span>}
                              </div>
                            ))}
                            {meds.length > 3 && <p style={{ fontSize: '10px', color: '#475569', marginLeft: '14px' }}>+ {meds.length - 3} {t('med.more')}</p>}
                          </div>
                        )}
                        {/* Generate Report Button on Document Card */}
                        <button
                          onClick={() => handleGenerateReport(rx, true)}
                          disabled={reportGenerating}
                          style={{
                            marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,.06)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: 'rgba(13,148,136,.1)', border: '1px solid rgba(13,148,136,.25)',
                            borderRadius: '10px', padding: '10px 16px', cursor: reportGenerating ? 'wait' : 'pointer',
                            color: '#5eead4', fontSize: '12px', fontWeight: 600, width: '100%', transition: 'all .2s',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{reportGenerating ? 'progress_activity' : 'picture_as_pdf'}</span>
                          {reportGenerating ? t('docs.generating') : t('docs.generate_whatsapp')}
                        </button>
                        {/* Prescription Image from S3 */}
                        {imageUrl && (
                          <PrescriptionImageViewer imageUrl={imageUrl} prescriptionId={rx.prescription_id} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <div>
              <div className="family-dashboard-reports-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>📄 {t('reports.title')}</h3>
                <div className="family-dashboard-reports-actions" style={{ display: 'flex', gap: '8px' }}>
                  {viewingReport && (
                    <button
                      onClick={() => setViewingReport(null)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '12px', padding: '10px 16px', color: '#94a3b8', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                      {t('reports.back')}
                    </button>
                  )}
                  {prescriptions.length > 0 && (
                    <button
                      onClick={() => handleGenerateReport(prescriptions[0], false)}
                      disabled={reportGenerating}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                        border: 'none', borderRadius: '12px', padding: '10px 20px',
                        color: '#fff', fontSize: '13px', fontWeight: 700, cursor: reportGenerating ? 'wait' : 'pointer',
                        boxShadow: '0 4px 15px rgba(13,148,136,.3)', transition: 'all .2s',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{reportGenerating ? 'progress_activity' : 'add_circle'}</span>
                      {reportGenerating ? t('docs.generating') : t('reports.generate_new')}
                    </button>
                  )}
                </div>
              </div>

              {/* Inline PDF Viewer */}
              {viewingReport && viewingReport.pdfDataUri && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', border: '1px solid rgba(13,148,136,.2)', overflow: 'hidden' }}>
                    {/* Viewer toolbar */}
                    <div className="family-dashboard-viewer-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'rgba(13,148,136,.08)', borderBottom: '1px solid rgba(13,148,136,.15)', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0d9488' }}>picture_as_pdf</span>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#e2e8f0' }}>{viewingReport.patientName || t('docs.health_report')}</h4>
                          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                            {new Date(viewingReport.timestamp).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="family-dashboard-viewer-actions" style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => downloadReportPdf(viewingReport)}
                          title="Download PDF"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(13,148,136,.15)', border: '1px solid rgba(13,148,136,.3)', borderRadius: '10px', padding: '8px 14px', color: '#5eead4', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                          {t('reports.download')}
                        </button>
                        <button
                          onClick={() => handleShareReportWhatsApp(viewingReport)}
                          title="Send summary via WhatsApp"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(37,211,102,.12)', border: '1px solid rgba(37,211,102,.3)', borderRadius: '10px', padding: '8px 14px', color: '#25d366', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                          {t('reports.whatsapp')}
                        </button>
                        <button
                          onClick={() => setViewingReport(null)}
                          title="Close viewer"
                          style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '10px', padding: '8px', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                        </button>
                      </div>
                    </div>
                    {/* PDF iframe */}
                    <iframe
                      src={viewingReport.pdfDataUri}
                      title="Health Report PDF"
                      className="family-dashboard-report-frame"
                      style={{ width: '100%', height: '75vh', border: 'none', background: '#1e293b' }}
                    />
                  </div>
                </div>
              )}

              {/* Report list */}
              {!viewingReport && savedReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#334155', display: 'block', marginBottom: '16px' }}>description</span>
                  <h4 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>{t('reports.no_reports')}</h4>
                  <p style={{ fontSize: '13px', color: '#475569', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                    {t('reports.no_reports_desc')}
                  </p>
                </div>
              ) : !viewingReport && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {savedReports.map(report => {
                    const date = new Date(report.timestamp);
                    return (
                      <div key={report.id} className="family-dashboard-report-item" style={{ background: 'rgba(255,255,255,.03)', borderRadius: '16px', padding: '20px 24px', border: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div className="family-dashboard-report-item-main" style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0d9488' }}>picture_as_pdf</span>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#e2e8f0' }}>{report.patientName || t('docs.health_report')}</h4>
                            <span style={{ fontSize: '9px', background: 'rgba(13,148,136,.1)', color: '#5eead4', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>{report.patientId}</span>
                          </div>
                          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>{report.diagnosis || t('reports.general')}</p>
                          <p style={{ fontSize: '11px', color: '#64748b' }}>
                            {date.toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })} {date.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="family-dashboard-report-item-actions" style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setViewingReport(report)}
                            title="View PDF"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(13,148,136,.15)', border: '1px solid rgba(13,148,136,.3)', borderRadius: '10px', padding: '8px 14px', color: '#5eead4', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                            {t('reports.view')}
                          </button>
                          <button
                            onClick={() => downloadReportPdf(report)}
                            title="Download PDF"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '10px', padding: '8px 14px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
                            {t('reports.download')}
                          </button>
                          <button
                            onClick={() => handleShareReportWhatsApp(report)}
                            title="Send summary via WhatsApp"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(37,211,102,.12)', border: '1px solid rgba(37,211,102,.3)', borderRadius: '10px', padding: '8px 14px', color: '#25d366', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>send</span>
                            {t('reports.whatsapp')}
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            title="Delete Report"
                            style={{ display: 'flex', alignItems: 'center', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '8px', color: '#f87171', cursor: 'pointer', transition: 'all .2s' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report Toast Notification */}
      {reportToast && (
        <div className="family-dashboard-toast" style={{
          position: 'fixed', bottom: '100px', right: '24px', zIndex: 9999,
          background: reportToast.type === 'success' ? 'rgba(13,148,136,.95)' : reportToast.type === 'warning' ? 'rgba(245,158,11,.95)' : 'rgba(239,68,68,.95)',
          color: '#fff', padding: '14px 22px', borderRadius: '14px', maxWidth: '420px',
          fontSize: '13px', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', gap: '10px', animation: 'slideUp .3s ease',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {reportToast.type === 'success' ? 'check_circle' : reportToast.type === 'warning' ? 'warning' : 'error'}
          </span>
          {reportToast.message}
          <button onClick={() => setReportToast(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '8px', padding: '2px', display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
      )}

      {/* Chatbot Panel */}
      <ChatbotPanel prescriptions={prescriptions} dischargeHistory={dischargeHistory} />

      {/* Share QR Modal */}
      {showShareQR && (
        <ShareQRModal
          patientId={linkedPid || patientId}
          patientName={patientName}
          onClose={() => setShowShareQR(false)}
        />
      )}
      {/* Emergency Card Modal */}
      {showEmergencyCard && (
        <EmergencyQRCard
          patientName={patientName}
          bloodGroup={prescriptions[0]?.extracted_data?.blood_group}
          allergies={prescriptions[0]?.extracted_data?.allergies || []}
          emergencyContact={user?.phone}
          patientId={linkedPid || patientId}
          onClose={() => setShowEmergencyCard(false)}
        />
      )}
    </div>
  );
}

/* Helper Components */
function Detail({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.1em' }}>{label}</p>
      <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px' }}>{value}</p>
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ height: '14px', background: 'rgba(255,255,255,.06)', borderRadius: '6px', width: '75%' }} />
      <div style={{ height: '14px', background: 'rgba(255,255,255,.06)', borderRadius: '6px', width: '100%' }} />
      <div style={{ height: '14px', background: 'rgba(255,255,255,.06)', borderRadius: '6px', width: '60%' }} />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="family-dashboard-doc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '16px', padding: '24px', height: '160px' }}>
          <SkeletonBlock />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  const { t } = useLanguage();
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#334155', display: 'block', marginBottom: '16px' }}>clinical_notes</span>
      <h4 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>{t('empty.title')}</h4>
      <p style={{ fontSize: '13px', color: '#475569' }}>{message}</p>
    </div>
  );
}

function PrescriptionImageViewer({ imageUrl, prescriptionId }) {
  const [showImage, setShowImage] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="family-dashboard-rx-image" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
      <button
        onClick={() => { setShowImage(!showImage); setImgError(false); setImgLoading(true); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
          background: showImage ? 'rgba(13,148,136,.15)' : 'rgba(255,255,255,.04)',
          border: '1px solid rgba(13,148,136,.3)', borderRadius: '10px', padding: '8px 14px',
          color: '#5eead4', fontSize: '12px', fontWeight: 600, width: '100%', justifyContent: 'center',
          transition: 'all .2s',
        }}
        id={`view-rx-image-${prescriptionId}`}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
          {showImage ? 'visibility_off' : 'image'}
        </span>
        {showImage ? t('docs.hide_image') : t('docs.view_image')}
      </button>
      {showImage && (
        <div className="family-dashboard-rx-image-preview" style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.08)', position: 'relative' }}>
          {imgLoading && !imgError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#5eead4', fontSize: '13px', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 1.5s linear infinite' }}>progress_activity</span>
              {t('docs.loading_image')}
            </div>
          )}
          {imgError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#f87171' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px' }}>broken_image</span>
              <p style={{ fontSize: '12px' }}>{t('docs.image_unavailable')}</p>
              <button
                onClick={() => { setImgError(false); setImgLoading(true); }}
                style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}
              >
                {t('action.retry')}
              </button>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Prescription document"
              onLoad={() => setImgLoading(false)}
              onError={() => { setImgLoading(false); setImgError(true); }}
              style={{
                width: '100%', height: 'auto', display: imgLoading ? 'none' : 'block',
                borderRadius: '12px', cursor: 'zoom-in',
              }}
              onClick={() => window.open(imageUrl, '_blank')}
            />
          )}
        </div>
      )}

    </div>
  );
}

export default FamilyDashboardPage;
