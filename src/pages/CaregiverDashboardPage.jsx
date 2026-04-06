import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import RiskGauge from "../components/RiskGauge";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function CaregiverDashboardPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setInvalidLink(true);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setInvalidLink(false);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/api/share/${token}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.status === 404) {
          setInvalidLink(true);
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to load caregiver view");
        }

        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err.message || "Failed to load caregiver view");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const groupedMedications = useMemo(() => {
    const groups = { morning: [], evening: [], night: [] };
    const meds = data?.medications || [];

    meds.forEach((med) => {
      const name = typeof med === "string" ? med : med?.name || "Medication";
      const timingRaw = typeof med === "object" ? med?.timing : "";
      const timings = Array.isArray(timingRaw) ? timingRaw : [timingRaw];

      let matched = false;
      timings.forEach((timing) => {
        const key = String(timing || "").toLowerCase();
        if (groups[key]) {
          groups[key].push(name);
          matched = true;
        }
      });

      if (!matched) groups.morning.push(name);
    });

    return groups;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
          <div className="h-8 w-80 rounded bg-white/10" />
          <div className="h-24 rounded-2xl bg-white/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl bg-white/10" />
            <div className="h-44 rounded-2xl bg-white/10" />
          </div>
          <div className="h-44 rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-6 py-5">
          <p className="text-red-200 font-bold text-lg">Link expired or invalid</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-6 py-5">
          <p className="text-amber-200 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            SwasthaLink - Caregiver View
          </h1>
          <span className="rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            Zero-PHI
          </span>
        </header>

        <section className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Follow-up Date</p>
          <p className="mt-2 text-2xl md:text-3xl font-extrabold text-white">
            {data?.follow_up || "Not provided"}
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-300">
            Medication Schedule
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {["morning", "evening", "night"].map((slot) => (
              <div key={slot} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
                <p className="mb-3 text-sm font-bold capitalize text-white">{slot}</p>
                <div className="flex flex-wrap gap-2">
                  {(groupedMedications[slot] || []).length > 0 ? (
                    groupedMedications[slot].map((med, idx) => (
                      <span
                        key={`${slot}-${idx}`}
                        className="rounded-full border border-teal-300/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-200"
                      >
                        {med}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No meds</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-300">Warning Signs</p>
          <ul className="space-y-2">
            {(data?.warning_signs || []).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-slate-200">
                <span className="text-yellow-400">⚠</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-300">Risk Summary</p>
          <RiskGauge score={data?.risk_score ?? 0} level={data?.risk_level || "low"} />
        </section>
      </div>
    </div>
  );
}

export default CaregiverDashboardPage;

