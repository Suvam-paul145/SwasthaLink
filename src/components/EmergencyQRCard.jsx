import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

function EmergencyQRCard({ patientName, bloodGroup, allergies = [], emergencyContact, patientId, onClose }) {
  const [isPrinting, setIsPrinting] = useState(false);

  // Encode critical info into QR data
  const qrData = JSON.stringify({
    name: patientName,
    blood: bloodGroup || 'Unknown',
    allergies: allergies.length ? allergies : ['None known'],
    emergency: emergencyContact || 'N/A',
    pid: patientId,
  });

  const handlePrint = () => {
    setIsPrinting(true);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }
    printWindow.document.write(`
      <html><head><title>Emergency Card - ${patientName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .card { border: 3px solid #e53e3e; border-radius: 16px; padding: 24px; max-width: 340px; margin: auto; }
        .header { background: #e53e3e; color: white; text-align: center; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
        .header h2 { margin: 0; font-size: 18px; }
        .field { margin-bottom: 12px; }
        .field label { font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: 1px; }
        .field p { margin: 4px 0 0; font-size: 16px; font-weight: bold; }
        .qr { text-align: center; margin-top: 16px; }
        .qr img { width: 120px; height: 120px; }
        .footer { text-align: center; margin-top: 12px; font-size: 10px; color: #999; }
      </style></head><body>
      <div class="card">
        <div class="header"><h2>⚕ EMERGENCY MEDICAL CARD</h2></div>
        <div class="field"><label>Patient Name</label><p>${patientName}</p></div>
        <div class="field"><label>Blood Group</label><p>${bloodGroup || 'Unknown'}</p></div>
        <div class="field"><label>Allergies</label><p>${allergies.length ? allergies.join(', ') : 'None known'}</p></div>
        <div class="field"><label>Emergency Contact</label><p>${emergencyContact || 'N/A'}</p></div>
        <div class="qr"><canvas id="qr"></canvas></div>
        <div class="footer">Scan QR for full medical record • SwasthaLink</div>
      </div>
      <script>window.onload = () => { window.print(); window.close(); }<${"/"}script>
      </body></html>
    `);
    printWindow.document.close();
    setIsPrinting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-b from-slate-900/95 to-[#071b2a]/95 border border-red-400/30 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red Header */}
        <div className="bg-red-600 px-6 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-white text-2xl">emergency</span>
            <h3 className="text-lg font-bold text-white tracking-wide">EMERGENCY MEDICAL CARD</h3>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Patient Info */}
          <div className="space-y-3">
            <InfoRow label="Patient Name" value={patientName} icon="person" />
            <InfoRow label="Blood Group" value={bloodGroup || 'Unknown'} icon="water_drop" highlight />
            <InfoRow label="Allergies" value={allergies.length ? allergies.join(', ') : 'None known'} icon="warning" />
            <InfoRow label="Emergency Contact" value={emergencyContact || 'N/A'} icon="call" />
          </div>

          {/* QR Code */}
          <div className="flex justify-center py-3">
            <div className="bg-white p-3 rounded-xl">
              <QRCodeSVG value={qrData} size={140} level="M" />
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">Scan for full medical record</p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 bg-red-600/20 text-red-300 border border-red-500/30 py-3 rounded-xl font-bold text-sm hover:bg-red-600/40 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              Print Card
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-white/5 text-slate-300 border border-white/10 py-3 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon, highlight }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
      <span className={`material-symbols-outlined text-xl ${highlight ? 'text-red-400' : 'text-slate-400'}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
        <p className={`text-sm font-semibold truncate ${highlight ? 'text-red-300' : 'text-white'}`}>{value}</p>
      </div>
    </div>
  );
}

export default EmergencyQRCard;
