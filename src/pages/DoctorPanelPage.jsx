import { useEffect, useMemo, useRef, useState } from "react";
import api, { validators } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ROLE_OPTIONS } from "../utils/auth";

function DoctorPanelPage() {
  const { user } = useAuth();
  const roleLabel = ROLE_OPTIONS.find((r) => r.value === user?.role)?.label || user?.role || 'User';
  const [analysisMode, setAnalysisMode] = useState("Simplified View");
  const [uploadStatus, setUploadStatus] = useState("Idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractionResult, setExtractionResult] = useState(null);
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const [reportType, setReportType] = useState('prescription');
  const fileInputRef = useRef(null);

  const [prescriptionHistory, setPrescriptionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Patient directory — fetch from backend (no fake data)
  const [patientDirectory, setPatientDirectory] = useState([]);

  // Pending reviews from API
  const [pendingReviews, setPendingReviews] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Doctor identity from auth
  const doctorId = user?.user_id || user?.id || 'unknown-doctor';
  const doctorName = user?.name || 'Doctor';

  const selectedReview = pendingReviews.find((review) => review.id === selectedReviewId) ?? pendingReviews[0];
  const selectedPatient = patientDirectory.find((patient) => patient.id === selectedPatientId) ?? patientDirectory[0];

  // Fetch patients from API
  useEffect(() => {
    (async () => {
      try {
        const result = await api.getPatients();
        if (result.items && result.items.length > 0) {
          setPatientDirectory(result.items.map((p) => ({
            id: p.user_id || p.email,
            name: p.full_name || p.name || p.email,
            age: '-',
            risk: '-',
          })));
        }
      } catch (err) {
        console.warn('Patient directory fetch:', err.message);
      }
    })();
  }, []);

  // Fetch pending prescriptions
  useEffect(() => {
    (async () => {
      setPendingLoading(true);
      try {
        const result = await api.getPendingPrescriptions();
        if (result.items && result.items.length > 0) {
          setPendingReviews(result.items.map((item) => {
            const ed = item.extracted_data || item;
            return {
              id: item.prescription_id,
              patientId: ed.patient_id || 'Unknown',
              doctorId: item.doctor_id || 'Unknown',
              priority: (ed.extraction_confidence || 0) < 0.7 ? 'High' : 'Medium',
              summary: ed.diagnosis || 'Prescription pending review',
              submittedAt: item.created_at ? new Date(item.created_at).toLocaleString() : 'Recently',
            };
          }));
        }
      } catch (err) {
        console.warn('Pending prescriptions fetch:', err.message);
      } finally {
        setPendingLoading(false);
      }
    })();
  }, [uploadStatus]);

  // Fetch doctor's prescription history
  useEffect(() => {
    (async () => {
      setHistoryLoading(true);
      try {
        const result = await api.getDoctorPrescriptions(doctorId);
        setPrescriptionHistory(result.items || []);
      } catch (err) {
        console.warn('History fetch:', err.message);
      } finally {
        setHistoryLoading(false);
      }
    })();
  }, [doctorId, uploadStatus]);

  useEffect(() => {
    if (!selectedReview) return;
    setSelectedPatientId(selectedReview.patientId);
  }, [selectedReview]);

  // Compute dynamic stats
  const stats = useMemo(() => {
    const pending = pendingReviews.length;
    const approved = prescriptionHistory.filter((r) => (r.status || r.extracted_data?.status) === 'approved').length;
    return { pending, approved };
  }, [pendingReviews, prescriptionHistory]);

  const applySelectedFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setUploadStatus("Idle");
    setUploadError("");
    setUploadMessage("");
  };

  const handleSelectFile = (event) => {
    const file = event.target.files?.[0];
    applySelectedFile(file);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsDropZoneActive(false);
    const file = event.dataTransfer?.files?.[0];
    applySelectedFile(file);
  };

  const handleUploadPrescription = async () => {
    if (!selectedFile) {
      setUploadError("Please select a prescription file before uploading.");
      setUploadStatus("Failed");
      return;
    }

    try {
      validators.validateFile(selectedFile);
      setUploadStatus("Uploading");
      setUploadError("");
      setUploadMessage("");

      const response = await api.extractPrescription(selectedFile, doctorId, {
        reportType: reportType,
        patientId: selectedPatient?.id || undefined,
      });

      setExtractionResult(response);
      setUploadStatus("Uploaded");
      setUploadMessage(response.message || "Prescription extraction completed and queued for review.");
    } catch (error) {
      setUploadStatus("Failed");
      setUploadError(error.message || "Upload failed. Please try again.");
    }
  };

  return (
    <div className="p-6 lg:p-10 relative z-10">
      <header className="mb-8 lg:mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className="text-primary font-bold tracking-[0.24em] uppercase text-xs">{roleLabel} Panel</span>
          <h2 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-white leading-tight">
            Clinical Review Command Desk
          </h2>
          <p className="text-sm text-teal-200">
            Signed in as: <span className="font-semibold text-white">{user?.name || "Doctor"}</span>
          </p>
          <p className="text-slate-300 max-w-3xl">
            Upload prescriptions &amp; medical reports, track extraction results, and manage your patient communication pipeline.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="glass-card rounded-2xl px-4 py-3 border border-white/10 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Pending</p>
            <p className="text-2xl font-extrabold text-amber-300 mt-1">{stats.pending}</p>
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 border border-white/10 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Approved</p>
            <p className="text-2xl font-extrabold text-emerald-300 mt-1">{stats.approved}</p>
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 border border-white/10 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Total</p>
            <p className="text-2xl font-extrabold text-cyan-300 mt-1">{prescriptionHistory.length}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 lg:gap-7">
        {/* Left Column — Pending Reviews */}
        <section className="col-span-12 lg:col-span-4 glass-card rounded-3xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Pending Reviews</p>
              <p className="text-xs text-slate-400">Prescriptions awaiting admin approval</p>
            </div>
            <span className="material-symbols-outlined text-teal-300">fact_check</span>
          </div>

          <div className="p-4 space-y-3 max-h-[560px] overflow-y-auto">
            {pendingReviews.length === 0 && !pendingLoading && (
              <div className="text-center py-8 text-slate-400 text-sm">
                <span className="material-symbols-outlined text-3xl block mb-2 text-slate-500">inbox</span>
                No pending prescriptions
              </div>
            )}
            {pendingReviews.map((review) => {
              const isSelected = selectedReviewId === review.id;
              return (
                <button
                  key={review.id}
                  onClick={() => setSelectedReviewId(review.id)}
                  className={`w-full text-left rounded-2xl p-4 border transition-all duration-300 ${
                    isSelected
                      ? "bg-teal-400/15 border-teal-300/40 shadow-[0_12px_30px_rgba(20,184,166,0.2)]"
                      : "bg-white/[0.03] border-white/10 hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {patientDirectory.find((p) => p.id === review.patientId)?.name ?? review.patientId}
                      </p>
                      <p className="text-[11px] text-slate-400">{review.id?.slice(0,8)}...</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                        review.priority === "High"
                          ? "bg-rose-500/20 text-rose-200"
                          : review.priority === "Medium"
                            ? "bg-amber-500/20 text-amber-200"
                            : "bg-cyan-500/20 text-cyan-200"
                      }`}
                    >
                      {review.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{review.summary}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {review.submittedAt}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Middle Column — Discharge Summary (NEW) */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Clinical Discharge Summary</p>
                <p className="text-xs text-slate-400">Process complex discharge notes to patient-friendly formats</p>
              </div>
              <span className="material-symbols-outlined text-teal-300">summarize</span>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Patient Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Patient</label>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1f2d] px-3 py-2 flex items-center gap-3">
                    <span className="material-symbols-outlined text-teal-200">person</span>
                    <select
                      value={selectedPatientId || ''}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none"
                    >
                      <option value="" className="bg-[#0d1f2d] text-white">Select a patient...</option>
                      {patientDirectory.map((patient) => (
                        <option key={patient.id} value={patient.id} className="bg-[#0d1f2d] text-white">
                          {patient.name} ({patient.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Target Role</label>
                  <div className="rounded-2xl border border-white/10 bg-[#0d1f2d] px-3 py-2 flex items-center gap-3">
                    <span className="material-symbols-outlined text-cyan-200">manage_accounts</span>
                    <select
                      defaultValue="patient"
                      id="discharge-role-select"
                      className="w-full bg-transparent text-sm text-white outline-none"
                    >
                      <option value="patient" className="bg-[#0d1f2d] text-white">Patient</option>
                      <option value="caregiver" className="bg-[#0d1f2d] text-white">Caregiver</option>
                      <option value="elderly" className="bg-[#0d1f2d] text-white">Elderly Patient</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Discharge Notes</label>
                <textarea
                  id="discharge-text-input"
                  rows="4"
                  className="w-full bg-[#0d1f2d] text-sm text-white border border-white/10 p-4 outline-none rounded-2xl resize-y focus:border-teal-400/50 transition-colors"
                  placeholder="Paste clinical discharge summary here (min 50 chars)..."
                ></textarea>
              </div>

              <button
                onClick={async () => {
                   const text = document.getElementById('discharge-text-input').value;
                   const role = document.getElementById('discharge-role-select').value;
                   if (!selectedPatientId) return alert("Select a patient");
                   if (text.length < 50) return alert("Text too short (min 50 chars)");

                   setUploadStatus("Processing Discharge...");
                   try {
                     const response = await api.processSummary({
                       discharge_text: text,
                       role: role,
                       language: 'en',
                       patient_id: selectedPatientId,
                       doctor_id: doctorId
                     });
                     alert("Discharge processed successfully!");
                     setUploadStatus("Idle");
                   } catch(e) {
                     alert("Error processing: " + e.message);
                     setUploadStatus("Idle");
                   }
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 text-[#06383a] font-bold hover:shadow-[0_12px_28px_rgba(20,184,166,0.35)] transition-all"
              >
                Simplify &amp; Save Discharge Summary
              </button>
            </div>
          </div>

          {/* Upload Configuration for Prescriptions */}
          <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Upload Configuration</p>
                <p className="text-xs text-slate-400">Select patient, report type, and upload</p>
              </div>
              <span className="material-symbols-outlined text-cyan-300">assignment_ind</span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              {/* Patient Selector */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Patient</label>
                <div className="rounded-2xl border border-white/10 bg-[#0d1f2d] px-3 py-2 flex items-center gap-3">
                  <span className="material-symbols-outlined text-teal-200">person</span>
                  <select
                    value={selectedPatientId || ''}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    <option value="" className="bg-[#0d1f2d] text-white">Select a patient...</option>
                    {patientDirectory.map((patient) => (
                      <option key={patient.id} value={patient.id} className="bg-[#0d1f2d] text-white">
                        {patient.name} ({patient.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor (from auth) */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Uploaded By</label>
                <div className="rounded-2xl border border-white/10 bg-[#0d1f2d] px-3 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-cyan-200">stethoscope</span>
                  <div>
                    <p className="text-sm text-white font-semibold">{doctorName}</p>
                    <p className="text-xs text-slate-400">{doctorId}</p>
                  </div>
                </div>
              </div>

              {/* Report Type */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Report Type</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'prescription', label: '💊 Prescription' },
                    { value: 'ecg', label: '❤️ ECG' },
                    { value: 'echo', label: '🫀 Echo' },
                    { value: 'ct_scan', label: '🔍 CT Scan' },
                    { value: 'mri', label: '🧲 MRI' },
                    { value: 'blood_test', label: '🩸 Blood Test' },
                    { value: 'other', label: '📄 Other' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setReportType(type.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        reportType === type.value
                          ? "bg-teal-300/20 border-teal-300/40 text-teal-100 ring-1 ring-teal-300/30"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Upload + Extraction Result */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Document Upload */}
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Document Upload</p>
                  <p className="text-xs text-slate-400">Upload prescription or medical report</p>
                </div>
                <span className="material-symbols-outlined text-cyan-300">upload_file</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-xs text-slate-300 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">Patient:</span> {selectedPatient?.name ?? 'Select a patient'}
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="font-semibold text-white">Type:</span> {reportType}
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDropZoneActive(true); }}
                  onDragLeave={() => setIsDropZoneActive(false)}
                  onDrop={handleFileDrop}
                  className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    isDropZoneActive
                      ? "border-teal-200 bg-teal-400/15 shadow-[0_0_20px_rgba(45,212,191,0.25)]"
                      : "border-teal-300/40 bg-teal-400/5"
                  }`}
                >
                  <span className="material-symbols-outlined text-4xl text-teal-200">cloud_upload</span>
                  <p className="text-sm text-slate-100 mt-2">Drag and drop file here</p>
                  <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, PDF up to 10MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg"
                    onChange={handleSelectFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white font-semibold hover:bg-white/15 transition-all"
                  >
                    Choose File
                  </button>
                  {selectedFile && (
                    <p className="text-xs text-teal-200 mt-3 break-all">Selected: {selectedFile.name}</p>
                  )}
                </div>
                <button
                  onClick={handleUploadPrescription}
                  disabled={uploadStatus === "Uploading"}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 text-[#06383a] font-bold hover:shadow-[0_12px_28px_rgba(20,184,166,0.35)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {uploadStatus === "Uploading" ? "Extracting Document..." : "Upload & Extract"}
                </button>
                <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Upload status</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    uploadStatus === "Uploaded" ? "bg-emerald-500/20 text-emerald-200"
                    : uploadStatus === "Uploading" ? "bg-amber-500/20 text-amber-200"
                    : uploadStatus === "Failed" ? "bg-rose-500/20 text-rose-200"
                    : "bg-slate-500/20 text-slate-200"
                  }`}>
                    {uploadStatus}
                  </span>
                </div>
                {uploadMessage && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-300/30 px-4 py-3 text-xs text-emerald-100">
                    {uploadMessage}
                  </div>
                )}
                {uploadError && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-300/30 px-4 py-3 text-xs text-rose-100">
                    {uploadError}
                  </div>
                )}
              </div>
            </div>

            {/* Extraction Result */}
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Extraction Result</p>
                  <p className="text-xs text-slate-400">AI-extracted structured data</p>
                </div>
                <span className="material-symbols-outlined text-teal-300">auto_awesome</span>
              </div>
              <div className="p-5 space-y-3">
                {extractionResult?.extracted_data ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-wider bg-emerald-500/20 text-emerald-200 px-2 py-1 rounded-full">Live Extraction</span>
                      <span className="text-[10px] text-slate-400">Confidence: {Math.round((extractionResult.extracted_data.extraction_confidence || 0) * 100)}%</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <p className="text-slate-300"><span className="text-white font-semibold">ID:</span> {extractionResult.prescription_id?.slice(0,8)}...</p>
                      <p className="text-slate-300"><span className="text-white font-semibold">Patient:</span> {extractionResult.extracted_data.patient_name || "Unknown"}</p>
                      <p className="text-slate-300"><span className="text-white font-semibold">Doctor:</span> {extractionResult.extracted_data.doctor_name || doctorName}</p>
                      <p className="text-slate-300"><span className="text-white font-semibold">Diagnosis:</span> {extractionResult.extracted_data.diagnosis || "Not specified"}</p>
                      <p className="text-slate-300"><span className="text-white font-semibold">Medications:</span> {extractionResult.extracted_data.medications?.length || 0}</p>
                      {extractionResult.extracted_data.tests?.length > 0 && (
                        <p className="text-slate-300"><span className="text-white font-semibold">Tests:</span> {extractionResult.extracted_data.tests.length}</p>
                      )}
                    </div>
                    {/* Medications list */}
                    {extractionResult.extracted_data.medications?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Medications</p>
                        {extractionResult.extracted_data.medications.map((med, i) => (
                          <div key={i} className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2 text-xs">
                            <p className="font-semibold text-white">{med.name} {med.strength || ''}</p>
                            <p className="text-slate-400">{[med.form, med.frequency, med.duration, med.instructions].filter(Boolean).join(' • ')}</p>
                            {med.purpose && <p className="text-teal-200 mt-1">{med.purpose}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    <span className="material-symbols-outlined text-4xl block mb-2 text-slate-500">biotech</span>
                    Upload a document to see extraction results
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DoctorPanelPage;
