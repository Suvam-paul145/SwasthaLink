import React from "react";

function DrugWarningBanner({ interactions = [] }) {
  const flagged = interactions.filter(
    (item) => item?.severity === "severe" || item?.severity === "moderate"
  );

  if (flagged.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4">
      <p className="mb-2 text-sm font-bold text-red-700">Potential Drug Interactions</p>
      <ul className="space-y-2">
        {flagged.map((item, idx) => {
          const sev = (item.severity || "").toUpperCase();
          const sevClass = item.severity === "severe" ? "text-red-700" : "text-amber-700";

          return (
            <li key={idx} className="text-sm text-slate-800">
              <span className={`font-bold ${sevClass}`}>[{sev}]</span>{" "}
              <span className="font-semibold">{item.drug_a}</span> +{" "}
              <span className="font-semibold">{item.drug_b}</span> —{" "}
              <span>{item.description}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DrugWarningBanner;

