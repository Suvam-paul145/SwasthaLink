import { useEffect, useMemo, useState } from "react";

function DoctorPanelPage() {
  const [analysisMode, setAnalysisMode] = useState("Simplified View");
  const [uploadStatus, setUploadStatus] = useState("Idle");
  const [deliveryMode, setDeliveryMode] = useState("WhatsApp + PDF");
  const [feedbackFocus, setFeedbackFocus] = useState("Medication Safety");
  const [feedbackDraft, setFeedbackDraft] = useState(
    "Use more conversational Bengali for elderly caregiver context and keep medication timing bold."
  );

  const patientDirectory = useMemo(
    () => [
      { id: "PT-1007", name: "Rahat Karim", age: 54, risk: "High", preferredLanguage: "Bilingual" },
      { id: "PT-1008", name: "Fatima Akter", age: 46, risk: "Medium", preferredLanguage: "Bengali" },
      { id: "PT-1009", name: "Shamim Ahmed", age: 61, risk: "Low", preferredLanguage: "English" },
    ],
    []
  );

  const doctorDirectory = useMemo(
    () => [
      { id: "DR-004", name: "Dr. Nusrat Jahan", specialty: "Cardiology", shift: "Morning" },
      { id: "DR-007", name: "Dr. Mahmud Hasan", specialty: "Internal Medicine", shift: "Evening" },
      { id: "DR-011", name: "Dr. Tania Rahman", specialty: "Diabetology", shift: "Night" },
    ],
    []
  );

  const pendingReviews = useMemo(
    () => [
      {
        id: "RV-3021",
        patientId: "PT-1007",
        doctorId: "DR-004",
        priority: "High",
        summary: "Post-surgery discharge summary needs medication clarity validation.",
        submittedAt: "10 mins ago",
      },
      {
        id: "RV-3018",
        patientId: "PT-1008",
        doctorId: "DR-011",
        priority: "Medium",
        summary: "Diabetes follow-up instructions require caregiver-level wording.",
        submittedAt: "24 mins ago",
      },
      {
        id: "RV-3012",
        patientId: "PT-1009",
        doctorId: "DR-007",
        priority: "Low",
        summary: "Routine hypertension plan pending doctor final approval.",
        submittedAt: "52 mins ago",
      },
    ],
    []
  );

  const [selectedReviewId, setSelectedReviewId] = useState("RV-3021");
  const [selectedPatientId, setSelectedPatientId] = useState("PT-1007");
  const [selectedDoctorId, setSelectedDoctorId] = useState("DR-004");

  const selectedReview = pendingReviews.find((review) => review.id === selectedReviewId) ?? pendingReviews[0];
  const selectedPatient = patientDirectory.find((patient) => patient.id === selectedPatientId) ?? patientDirectory[0];
  const selectedDoctor = doctorDirectory.find((doctor) => doctor.id === selectedDoctorId) ?? doctorDirectory[0];

  useEffect(() => {
    if (!selectedReview) return;
    setSelectedPatientId(selectedReview.patientId);
    setSelectedDoctorId(selectedReview.doctorId);
  }, [selectedReview]);

  const handleUploadPrescription = () => {
    setUploadStatus("Uploading");
    window.setTimeout(() => {
      setUploadStatus("Uploaded");
    }, 900);
  };

  return (
    <div className="p-6 lg:p-10 relative z-10">
      <header className="mb-8 lg:mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <span className="text-primary font-bold tracking-[0.24em] uppercase text-xs">Doctor Panel</span>
          <h2 className="text-4xl lg:text-5xl font-headline font-extrabold tracking-tight text-white leading-tight">
            Clinical Review Command Desk
          </h2>
          <p className="text-slate-300 max-w-3xl">
            Approve pending discharge summaries, run analysis mode checks, upload prescriptions, and deliver feedback to keep patient communication safe and clear.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
          <div className="glass-card rounded-2xl px-4 py-3 border border-white/10 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Pending</p>
            <p className="text-2xl font-extrabold text-amber-300 mt-1">14</p>
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 border border-white/10 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Approved</p>
            <p className="text-2xl font-extrabold text-emerald-300 mt-1">38</p>
          </div>
          <div className="glass-card rounded-2xl px-4 py-3 border border-white/10 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Avg TAT</p>
            <p className="text-2xl font-extrabold text-cyan-300 mt-1">12m</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 lg:gap-7">
        <section className="col-span-12 lg:col-span-4 glass-card rounded-3xl border border-white/10 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Pending Reviews</p>
              <p className="text-xs text-slate-400">Accept or decline before sending</p>
            </div>
            <span className="material-symbols-outlined text-teal-300">fact_check</span>
          </div>

          <div className="p-4 space-y-3 max-h-[560px] overflow-y-auto">
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
                        {patientDirectory.find((patient) => patient.id === review.patientId)?.name ?? review.patientId}
                      </p>
                      <p className="text-[11px] text-slate-400">{review.id}</p>
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

        <section className="col-span-12 lg:col-span-8 space-y-6">
          <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Case Assignment</p>
                <p className="text-xs text-slate-400">Select patient and doctor context for upload and feedback</p>
              </div>
              <span className="material-symbols-outlined text-cyan-300">assignment_ind</span>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Patient Option</label>
                <div className="rounded-2xl border border-white/10 bg-[#0d1f2d] px-3 py-2 flex items-center gap-3">
                  <span className="material-symbols-outlined text-teal-200">person</span>
                  <select
                    value={selectedPatientId}
                    onChange={(event) => setSelectedPatientId(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    {patientDirectory.map((patient) => (
                      <option key={patient.id} value={patient.id} className="bg-[#0d1f2d] text-white">
                        {patient.name} ({patient.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>Age: {selectedPatient.age}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span>Language: {selectedPatient.preferredLanguage}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Doctor Option</label>
                <div className="rounded-2xl border border-white/10 bg-[#0d1f2d] px-3 py-2 flex items-center gap-3">
                  <span className="material-symbols-outlined text-cyan-200">stethoscope</span>
                  <select
                    value={selectedDoctorId}
                    onChange={(event) => setSelectedDoctorId(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    {doctorDirectory.map((doctor) => (
                      <option key={doctor.id} value={doctor.id} className="bg-[#0d1f2d] text-white">
                        {doctor.name} ({doctor.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-3">
                  <span>{selectedDoctor.specialty}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span>Shift: {selectedDoctor.shift}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Prescription Delivery</label>
                <div className="flex flex-wrap gap-2">
                  {["WhatsApp + PDF", "Print Copy", "Caregiver Only"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setDeliveryMode(mode)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        deliveryMode === mode
                          ? "bg-teal-300/20 border-teal-300/40 text-teal-100"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Feedback Focus</label>
                <div className="flex flex-wrap gap-2">
                  {["Medication Safety", "Language Tone", "Follow-up Clarity"].map((focus) => (
                    <button
                      key={focus}
                      onClick={() => setFeedbackFocus(focus)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        feedbackFocus === focus
                          ? "bg-cyan-300/20 border-cyan-300/40 text-cyan-100"
                          : "bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]"
                      }`}
                    >
                      {focus}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-white">Analysis Mode</p>
                <p className="text-xs text-slate-400">Cross-check raw clinical output against patient-ready language</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-[#0d1f2e] border border-white/10 p-1">
                {[
                  "Raw Medical",
                  "Simplified View",
                  "Bilingual Preview",
                ].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAnalysisMode(mode)}
                    className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-all ${
                      analysisMode === mode
                        ? "bg-gradient-to-r from-teal-300 to-cyan-400 text-[#09383a] shadow-lg"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-5">
              <div className="rounded-2xl border border-white/10 bg-[#0e1f2e]/90 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Raw Clinical Summary</p>
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">description</span>
                </div>
                <div className="p-4 text-sm leading-relaxed text-slate-300 h-56 overflow-y-auto">
                  Patient discharged post angioplasty. Continue dual antiplatelet regimen, monitor blood pressure twice daily, limit sodium, and revisit cardiology OPD within 72 hours if chest discomfort persists.
                </div>
              </div>

              <div className="rounded-2xl border border-teal-300/30 bg-[#10283a]/90 overflow-hidden">
                <div className="px-4 py-3 border-b border-teal-300/25 flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-teal-200">Doctor-Reviewed Output</p>
                  <span className="material-symbols-outlined text-teal-200 text-[18px]">auto_awesome</span>
                </div>
                <div className="p-4 space-y-3 h-56 overflow-y-auto">
                  <p className="text-sm leading-relaxed text-slate-100">
                    Please take your heart medicines exactly on time, check BP two times daily, and avoid extra salt.
                  </p>
                  <p className="text-xs leading-relaxed text-teal-100/90">
                    হার্টের ওষুধ সময়মতো খান, প্রতিদিন দুইবার BP মাপুন, এবং অতিরিক্ত লবণ এড়িয়ে চলুন।
                  </p>
                  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-[11px] text-slate-300">
                    Active mode: <span className="text-teal-200 font-semibold">{analysisMode}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 md:px-5 pb-5 flex flex-wrap gap-3">
              <button className="px-5 py-3 rounded-xl bg-emerald-500/90 text-white font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>
                Accept
              </button>
              <button className="px-5 py-3 rounded-xl bg-rose-500/90 text-white font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">cancel</span>
                Decline
              </button>
              <button className="px-5 py-3 rounded-xl bg-white/10 border border-white/10 text-slate-100 font-semibold hover:bg-white/15 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">edit</span>
                Edit & Approve
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Prescription Upload</p>
                  <p className="text-xs text-slate-400">Attach signed prescription to patient package</p>
                </div>
                <span className="material-symbols-outlined text-cyan-300">upload_file</span>
              </div>
              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-xs text-slate-300 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">Patient:</span> {selectedPatient.name}
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="font-semibold text-white">Doctor:</span> {selectedDoctor.name}
                </div>
                <div className="rounded-2xl border-2 border-dashed border-teal-300/40 bg-teal-400/5 p-6 text-center">
                  <span className="material-symbols-outlined text-4xl text-teal-200">cloud_upload</span>
                  <p className="text-sm text-slate-100 mt-2">Drag and drop prescription PDF or image</p>
                  <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, PDF up to 10MB</p>
                </div>
                <button
                  onClick={handleUploadPrescription}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 text-[#06383a] font-bold hover:shadow-[0_12px_28px_rgba(20,184,166,0.35)] transition-all"
                >
                  Upload Prescription
                </button>
                <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Upload status</span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      uploadStatus === "Uploaded"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : uploadStatus === "Uploading"
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-slate-500/20 text-slate-200"
                    }`}
                  >
                    {uploadStatus}
                  </span>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Delivery option</span>
                  <span className="text-xs font-semibold text-teal-200">{deliveryMode}</span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03] flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Doctor Feedback</p>
                  <p className="text-xs text-slate-400">Quality notes for AI and care team</p>
                </div>
                <span className="material-symbols-outlined text-teal-300">rate_review</span>
              </div>

              <div className="p-5 space-y-4">
                <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-xs text-slate-300">
                  Active review: <span className="font-bold text-white">{selectedPatient.name}</span> ({selectedReview.id})
                  <span className="block mt-1 text-slate-400">Assigned doctor: {selectedDoctor.name}</span>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-slate-300">Feedback focus</span>
                  <span className="text-xs font-semibold text-cyan-200">{feedbackFocus}</span>
                </div>
                <textarea
                  value={feedbackDraft}
                  onChange={(event) => setFeedbackDraft(event.target.value)}
                  className="w-full min-h-36 rounded-2xl bg-[#0e2130] border border-white/10 text-slate-100 p-4 text-sm leading-relaxed outline-none focus:border-teal-300/50 transition-colors"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button className="py-3 rounded-xl bg-white/10 border border-white/10 text-slate-100 font-semibold hover:bg-white/15 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">save</span>
                    Save Draft
                  </button>
                  <button className="py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-[#042f31] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">send</span>
                    Send Feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DoctorPanelPage;