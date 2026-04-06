import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ChatbotPanel from '../components/ChatbotPanel';
import RiskGauge from '../components/RiskGauge';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'medications', label: 'Medications', icon: 'medication' },
  { id: 'routine', label: 'Daily Routine', icon: 'schedule' },
  { id: 'recovery', label: 'Recovery', icon: 'trending_up' },
  { id: 'explanations', label: 'Explanations', icon: 'help_outline' },
  { id: 'documents', label: 'Documents', icon: 'folder_supervised' },
];

function FamilyDashboardPage() {
  const { user } = useAuth();
  const patientName = user?.name || 'Patient';
  const patientId = user?.user_id || user?.id || user?.email || '';

  const [activeTab, setActiveTab] = useState('overview');
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxLoading, setRxLoading] = useState(true);
  const [chunks, setChunks] = useState({});
  const [chunksLoading, setChunksLoading] = useState(false);
  const [dischargeLoading, setDischargeLoading] = useState(false);
  const [linkedPid, setLinkedPid] = useState(null);
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkStatus, setLinkStatus] = useState({ type: '', message: '' });

  // Fetch prescriptions and history
  useEffect(() => {
    (async () => {
      setRxLoading(true);
      setDischargeLoading(true);
      try {
        // First get profile for linked PID
        const profile = await api.getPatientProfile().catch(() => ({}));
        const currentPid = profile.linked_pid;
        setLinkedPid(currentPid);

        const idsToFetch = [patientId];
        if (currentPid) idsToFetch.push(currentPid);

        // Fetch for all associated IDs
        const fetchResults = await Promise.all(idsToFetch.map(id => 
          Promise.all([
            api.getPatientPrescriptions(id).catch(() => ({ items: [] })),
            api.getPatientHistory(id).catch(() => ({ results: [] }))
          ])
        ));

        // Merge results
        const allRx = fetchResults.flatMap(r => r[0].items || []);
        const allDischarge = fetchResults.flatMap(r => r[1].results || []);

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
    setLinkStatus({ type: 'info', message: 'Linking your records...' });
    try {
      const res = await api.linkPatientPid(linkInput);
      setLinkStatus({ type: 'success', message: res.message });
      setLinkedPid(linkInput);
      setLinkInput('');
      // Trigger refresh
      window.location.reload(); 
    } catch (err) {
      setLinkStatus({ type: 'error', message: err.message });
    } finally {
      setLinking(false);
    }
  };

  // Fetch chunks when tab changes
  useEffect(() => {
    if (!patientId) return;
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
  const insights = latestRx?.patient_insights;
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
    <div style={{ minHeight: '100vh', background: '#070e17', color: '#fff', padding: '24px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-100px', right: '-80px', width: '280px', height: '280px', background: 'rgba(13,148,136,.1)', borderRadius: '50%', filter: 'blur(100px)' }} />
      <div style={{ position: 'absolute', bottom: '-120px', left: '-80px', width: '300px', height: '300px', background: 'rgba(34,211,238,.08)', borderRadius: '50%', filter: 'blur(120px)' }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ background: 'rgba(13,148,136,.2)', color: '#5eead4', padding: '4px 12px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', border: '1px solid rgba(13,148,136,.2)' }}>AI Clinical Insights</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Family Dashboard</h1>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginTop: '6px' }}>
            AI-generated clinical insights for <span style={{ color: '#5eead4', fontWeight: 600 }}>{patientName}</span>
            {linkedPid && <span style={{ marginLeft: '12px', fontSize: '12px', background: 'rgba(94,234,212,.1)', color: '#5eead4', padding: '2px 8px', borderRadius: '6px' }}>Linked: {linkedPid}</span>}
          </p>
        </div>

        {/* Link Records Section */}
        {!linkedPid && (
          <div style={{ background: 'rgba(13,148,136,.05)', border: '1px dashed rgba(13,148,136,.3)', borderRadius: '20px', padding: '24px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <h4 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#5eead4' }}>Link Your Medical Records</h4>
              <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>Did your doctor give you a system-generated ID? Enter it here to see your records instantly.</p>
            </div>
            <form onSubmit={handleLinkPid} style={{ display: 'flex', gap: '10px', flex: '0 0 auto' }}>
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
                {linking ? 'Linking...' : 'Link ID'}
              </button>
            </form>
            {linkStatus.message && (
              <p style={{ width: '100%', fontSize: '12px', color: linkStatus.type === 'error' ? '#f87171' : '#5eead4', margin: 0 }}>
                {linkStatus.message}
              </p>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
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
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '400px' }}>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
              {/* Clinical Status */}
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.2em', color: '#64748b' }}>Clinical Status</p>
                    <h4 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 0' }}>Current Condition</h4>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: '#0d9488', background: 'rgba(13,148,136,.1)', padding: '10px', borderRadius: '14px' }}>monitoring</span>
                </div>
                {rxLoading ? (<SkeletonBlock />) : insights?.health_summary ? (
                  <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7 }}>{insights.health_summary}</p>
                ) : extracted?.diagnosis ? (
                  <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7 }}>Diagnosis: {extracted.diagnosis}</p>
                ) : <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>Waiting for clinical data.</p>}
              </div>

              {/* Critical Instructions */}
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.2em', color: '#64748b' }}>Important</p>
                    <h4 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 0' }}>Critical Instructions</h4>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: '#f59e0b', background: 'rgba(245,158,11,.1)', padding: '10px', borderRadius: '14px' }}>priority_high</span>
                </div>
                {rxLoading ? (<SkeletonBlock />) : insights?.critical_instructions?.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {insights.critical_instructions.map((inst, i) => (
                      <li key={i} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(245,158,11,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245,158,11,.2)', color: '#f59e0b', fontWeight: 700, fontSize: '11px', flexShrink: 0 }}>{i + 1}</div>
                        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>{inst}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>No critical instructions.</p>}
              </div>

              {/* Doctor Info */}
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,.08)', gridColumn: 'span 1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(13,148,136,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(13,148,136,.2)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#0d9488' }}>stethoscope</span>
                  </div>
                  <div>
                    <p style={{ fontSize: '10px', color: '#0d9488', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.2em' }}>Lead Physician</p>
                    <h4 style={{ fontSize: '18px', fontWeight: 700, margin: '4px 0 0' }}>{extracted?.doctor_name || 'Pending Assignment'}</h4>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{extracted?.diagnosis || 'Diagnosis Pending'}</p>
                  </div>
                </div>
              </div>

              {/* Readmission Risk */}
              <div style={{ background: 'rgba(255,255,255,.03)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,.08)', gridColumn: 'span 1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                  <div>
                    <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.2em', color: '#64748b' }}>Risk Assessment</p>
                    <h4 style={{ fontSize: '20px', fontWeight: 800, margin: '8px 0 0' }}>Readmission Risk</h4>
                  </div>
                </div>
                {dischargeLoading ? <SkeletonBlock /> : dischargeHistory.length > 0 && dischargeHistory[0].risk_score !== undefined ? (
                  <RiskGauge score={dischargeHistory[0].risk_score} level={dischargeHistory[0].risk_level} />
                ) : (
                  <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>Risk score not computed yet. Ask Doctor to process discharge summary.</p>
                )}
              </div>

              {/* Clarity Center Link */}
              <div style={{ background: 'linear-gradient(135deg, rgba(13,148,136,.08), transparent)', borderRadius: '20px', padding: '28px', border: '1px solid rgba(13,148,136,.2)' }}>
                <h4 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '10px' }}>🧠 Clarity Center</h4>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>AI translation of complex medical jargon for clear family communication.</p>
                <a href="/clarity-hub" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: '12px', background: '#2dd4bf', color: '#071325', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.1em', textDecoration: 'none' }}>
                  Go To Clarity Center
                </a>
              </div>
            </div>
          )}

          {/* MEDICATIONS TAB */}
          {activeTab === 'medications' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>💊 Your Medications</h3>
              {chunksLoading || rxLoading ? <SkeletonGrid /> : displayMeds.length === 0 ? (
                <EmptyState message="No medications found in your records." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {displayMeds.map((med, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '16px', padding: '22px', border: '1px solid rgba(255,255,255,.08)', transition: 'border-color .2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{med.name}</h4>
                        {med.form && <span style={{ fontSize: '10px', background: 'rgba(13,148,136,.15)', color: '#5eead4', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>{med.form}</span>}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                        {med.strength && <Detail label="Strength" value={med.strength} />}
                        {med.frequency && <Detail label="Frequency" value={med.frequency} />}
                        {med.duration && <Detail label="Duration" value={med.duration} />}
                        {med.instructions && <Detail label="Instructions" value={med.instructions} />}
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
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>📅 Daily Care Routine</h3>
              {chunksLoading ? <SkeletonBlock /> : routineSteps.length === 0 ? (
                <EmptyState message="No daily routine instructions available yet." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {routineSteps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,.03)', borderRadius: '14px', padding: '18px 22px', border: '1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>{step.order || i + 1}</div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{step.action}</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{step.timing}{step.instructions ? ` — ${step.instructions}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RECOVERY TAB */}
          {activeTab === 'recovery' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>📈 Recovery Timeline</h3>
              {displayMeds.length === 0 ? (
                <EmptyState message="No medication durations available to build recovery timeline." />
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
                        <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>{med.frequency || 'As directed'}</p>
                      </div>
                    );
                  })}
                  {displayMeds.filter(m => !m.duration).length > 0 && (
                    <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginTop: '8px' }}>
                      {displayMeds.filter(m => !m.duration).length} medication(s) without specified duration
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* EXPLANATIONS TAB */}
          {activeTab === 'explanations' && (
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>❓ Why These Medicines</h3>
              {chunksLoading ? <SkeletonBlock /> : explanations.length === 0 ? (
                // Fallback to prescription data
                displayMeds.length === 0 ? (
                  <EmptyState message="No explanation data available." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {displayMeds.map((med, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '14px', padding: '20px 24px', border: '1px solid rgba(255,255,255,.06)' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#5eead4', marginBottom: '8px' }}>{med.name}</h4>
                        <p style={{ fontSize: '13px', color: '#cbd5e1' }}>💡 {med.purpose || 'Prescribed by your doctor for your treatment.'}</p>
                        {med.warnings && <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px' }}>⚠️ {med.warnings}</p>}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {explanations.map((exp, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '14px', padding: '20px 24px', border: '1px solid rgba(255,255,255,.06)' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#5eead4', marginBottom: '8px' }}>{exp.medicine}</h4>
                      <p style={{ fontSize: '13px', color: '#cbd5e1' }}>💡 {exp.reason}</p>
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
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>📁 Clinical Documents</h3>
              {rxLoading ? <SkeletonGrid /> : prescriptions.length === 0 ? (
                <EmptyState message="No clinical documents available." />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                  {prescriptions.map(rx => {
                    const ed = rx.extracted_data || rx;
                    const meds = ed.medications || rx.medications || [];
                    const type = rx.report_type || 'prescription';
                    const imageUrl = rx.image_url || null;
                    return (
                      <div key={rx.prescription_id} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '16px', padding: '22px', border: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '14px' }}>
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 700 }}>{ed.doctor_name || 'Medical Team'}</p>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: '2px' }}>
                              {new Date(rx.created_at || ed.prescription_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span style={{ fontSize: '9px', background: 'rgba(13,148,136,.1)', color: '#5eead4', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', border: '1px solid rgba(13,148,136,.2)' }}>{type}</span>
                        </div>
                        {(ed.diagnosis || rx.diagnosis) && (
                          <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.1em', marginBottom: '4px' }}>Diagnosis</p>
                            <p style={{ fontSize: '12px', color: '#cbd5e1' }}>{ed.diagnosis || rx.diagnosis}</p>
                          </div>
                        )}
                        {meds.length > 0 && (
                          <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.1em', marginBottom: '8px' }}>Medications</p>
                            {meds.slice(0, 3).map((med, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#2dd4bf', flexShrink: 0 }} />
                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{med.name}</span>
                                {med.frequency && <span style={{ fontSize: '11px', color: '#5eead4' }}>{med.frequency}</span>}
                              </div>
                            ))}
                            {meds.length > 3 && <p style={{ fontSize: '10px', color: '#475569', marginLeft: '14px' }}>+ {meds.length - 3} more</p>}
                          </div>
                        )}
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
        </div>
      </div>

      {/* Chatbot Panel */}
      <ChatbotPanel />
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: 'rgba(255,255,255,.03)', borderRadius: '16px', padding: '24px', height: '160px' }}>
          <SkeletonBlock />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#334155', display: 'block', marginBottom: '16px' }}>clinical_notes</span>
      <h4 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>No Data Available</h4>
      <p style={{ fontSize: '13px', color: '#475569' }}>{message}</p>
    </div>
  );
}

function PrescriptionImageViewer({ imageUrl, prescriptionId }) {
  const [showImage, setShowImage] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
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
        {showImage ? 'Hide Prescription Image' : 'View Prescription Image'}
      </button>
      {showImage && (
        <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.08)', position: 'relative' }}>
          {imgLoading && !imgError && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#5eead4', fontSize: '13px', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 1.5s linear infinite' }}>progress_activity</span>
              Loading image...
            </div>
          )}
          {imgError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#f87171' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px' }}>broken_image</span>
              <p style={{ fontSize: '12px' }}>Image unavailable or link expired</p>
              <button
                onClick={() => { setImgError(false); setImgLoading(true); }}
                style={{ marginTop: '10px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }}
              >
                Retry
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
