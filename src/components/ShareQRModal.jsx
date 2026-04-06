import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * ShareQRModal — generates a QR code for sharing patient records
 * Props:
 *   patientId  — PID-XXXXXX or user identifier
 *   patientName — display name
 *   onClose    — callback to dismiss
 */
export default function ShareQRModal({ patientId, patientName, onClose }) {
  const [copied, setCopied] = useState(false);

  // Build a shareable link (uses current origin + link flow)
  const shareUrl = `${window.location.origin}/family?pid=${encodeURIComponent(patientId)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${patientName}'s Health Records — SwasthaLink`,
          text: `View health records for ${patientName} on SwasthaLink`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[92vw] max-w-sm rounded-3xl border border-white/10 bg-[#0a1929] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <span className="material-symbols-outlined text-4xl text-teal-300 mb-2 block">
            qr_code_2
          </span>
          <h3 className="text-lg font-bold text-white">Share Health Records</h3>
          <p className="text-xs text-slate-400 mt-1">
            Family members can scan this QR to access records
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
          <div className="rounded-2xl bg-white p-4">
            <QRCodeSVG
              value={shareUrl}
              size={180}
              level="M"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>
        </div>

        {/* Patient info */}
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-4 text-center">
          <p className="text-sm font-semibold text-white">{patientName}</p>
          <p className="text-xs text-teal-300 font-mono">{patientId}</p>
        </div>

        {/* URL + Copy */}
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 mb-4">
          <p className="flex-1 text-[11px] text-slate-300 truncate font-mono">{shareUrl}</p>
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-teal-400/15 px-3 py-1.5 text-xs font-bold text-teal-200 hover:bg-teal-400/25 transition-all"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-300 to-cyan-400 text-[#06383a] font-bold text-sm hover:shadow-[0_8px_24px_rgba(20,184,166,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            {navigator.share ? "Share" : "Copy Link"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 font-semibold hover:bg-white/10 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
