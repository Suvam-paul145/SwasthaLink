import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate a comprehensive health report PDF from patient prescription data.
 * Returns { pdfBlob, textSummary, fileName }.
 */
export function generateHealthReport({ patientName, patientId, diagnosis, medications, tests, insights, dischargeHistory, doctorName }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 20;

  const teal = [13, 148, 136];
  const darkBg = [7, 14, 23];
  const white = [255, 255, 255];
  const gray = [148, 163, 184];

  // ── Header ──
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, pageW, 42, 'F');
  doc.setFillColor(...teal);
  doc.rect(0, 42, pageW, 1.5, 'F');

  doc.setTextColor(...white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SwasthaLink', margin, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gray);
  doc.text('AI-Powered Health Intelligence', margin, y + 7);

  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.text(`Report Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageW - margin, y, { align: 'right' });
  doc.text(`Time: ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, pageW - margin, y + 6, { align: 'right' });

  y = 50;

  // ── Patient Info Box ──
  doc.setFillColor(20, 30, 45);
  doc.roundedRect(margin, y, pageW - margin * 2, 28, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setTextColor(...teal);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT INFORMATION', margin + 6, y + 8);
  doc.setFontSize(9);
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${patientName || 'N/A'}`, margin + 6, y + 16);
  doc.text(`Patient ID: ${patientId || 'N/A'}`, margin + 80, y + 16);
  doc.text(`Doctor: ${doctorName || 'N/A'}`, margin + 6, y + 23);
  if (diagnosis) doc.text(`Diagnosis: ${diagnosis.substring(0, 70)}`, margin + 80, y + 23);

  y += 36;

  // ── Diagnosis Section ──
  if (diagnosis) {
    y = sectionHeader(doc, 'DIAGNOSIS', y, margin, pageW, teal);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(diagnosis, pageW - margin * 2 - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 5 + 6;
  }

  // ── Health Summary ──
  const healthSummary = insights?.health_summary;
  if (healthSummary) {
    y = checkPageBreak(doc, y, 40);
    y = sectionHeader(doc, 'HEALTH SUMMARY', y, margin, pageW, teal);
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    const lines = doc.splitTextToSize(healthSummary, pageW - margin * 2 - 4);
    doc.text(lines, margin + 2, y);
    y += lines.length * 4.5 + 6;
  }

  // ── Medications Table ──
  if (medications?.length > 0) {
    y = checkPageBreak(doc, y, 50);
    y = sectionHeader(doc, `MEDICATIONS (${medications.length})`, y, margin, pageW, teal);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Medication', 'Strength', 'Frequency', 'Duration', 'Instructions']],
      body: medications.map((med, i) => [
        i + 1,
        med.name || '-',
        med.strength || '-',
        med.frequency || '-',
        med.duration || '-',
        med.instructions || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
      headStyles: { fillColor: teal, textColor: white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 32 } },
      theme: 'grid',
    });
    y = doc.previousAutoTable.finalY + 8;

    // Medication purposes & warnings
    const medsWithDetails = medications.filter(m => m.purpose || m.warnings);
    if (medsWithDetails.length > 0) {
      y = checkPageBreak(doc, y, 30);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...teal);
      doc.text('Medication Notes:', margin + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      medsWithDetails.forEach(med => {
        y = checkPageBreak(doc, y, 12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(`${med.name}:`, margin + 4, y);
        doc.setFont('helvetica', 'normal');
        if (med.purpose) {
          const pLines = doc.splitTextToSize(`Purpose: ${med.purpose}`, pageW - margin * 2 - 20);
          doc.text(pLines, margin + 6, y + 4);
          y += pLines.length * 4;
        }
        if (med.warnings) {
          doc.setTextColor(180, 80, 0);
          const wLines = doc.splitTextToSize(`Warning: ${med.warnings}`, pageW - margin * 2 - 20);
          doc.text(wLines, margin + 6, y + 4);
          doc.setTextColor(60, 60, 60);
          y += wLines.length * 4;
        }
        y += 5;
      });
    }
  }

  // ── Test Results Table ──
  if (tests?.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = sectionHeader(doc, `TEST RESULTS (${tests.length})`, y, margin, pageW, teal);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['#', 'Test Name', 'Result', 'Normal Range', 'Status']],
      body: tests.map((t, i) => [
        i + 1,
        t.name || '-',
        t.result || '-',
        t.normal_range || '-',
        t.status || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
      headStyles: { fillColor: teal, textColor: white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [240, 253, 250] },
      theme: 'grid',
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = (data.cell.raw || '').toLowerCase();
          if (val === 'abnormal' || val === 'high' || val === 'critical') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
    y = doc.previousAutoTable.finalY + 8;
  }

  // ── Do's & Don'ts ──
  const dos = insights?.dos_and_donts?.do || [];
  const donts = insights?.dos_and_donts?.dont || [];
  if (dos.length > 0 || donts.length > 0) {
    y = checkPageBreak(doc, y, 40);
    y = sectionHeader(doc, "DO'S & DON'TS", y, margin, pageW, teal);

    if (dos.length > 0) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(34, 197, 94);
      doc.text('DO:', margin + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      dos.forEach((item, i) => {
        y = checkPageBreak(doc, y, 8);
        const lines = doc.splitTextToSize(`${i + 1}. ${item}`, pageW - margin * 2 - 10);
        doc.text(lines, margin + 6, y);
        y += lines.length * 4 + 2;
      });
      y += 3;
    }

    if (donts.length > 0) {
      y = checkPageBreak(doc, y, 10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(239, 68, 68);
      doc.text("DON'T:", margin + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(8);
      donts.forEach((item, i) => {
        y = checkPageBreak(doc, y, 8);
        const lines = doc.splitTextToSize(`${i + 1}. ${item}`, pageW - margin * 2 - 10);
        doc.text(lines, margin + 6, y);
        y += lines.length * 4 + 2;
      });
    }
    y += 4;
  }

  // ── Discharge Risk ──
  const latestDischarge = dischargeHistory?.[0];
  if (latestDischarge) {
    y = checkPageBreak(doc, y, 30);
    y = sectionHeader(doc, 'READMISSION RISK ASSESSMENT', y, margin, pageW, teal);

    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    if (latestDischarge.risk_score !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Risk Score: ${latestDischarge.risk_score}/100`, margin + 2, y);
      doc.text(`Risk Level: ${(latestDischarge.risk_level || '').toUpperCase()}`, margin + 60, y);
      y += 6;
    }
    doc.setFont('helvetica', 'normal');
    if (latestDischarge.warning_signs?.length > 0) {
      doc.setTextColor(180, 80, 0);
      doc.text('Warning Signs:', margin + 2, y);
      y += 4;
      doc.setFontSize(8);
      latestDischarge.warning_signs.forEach(w => {
        y = checkPageBreak(doc, y, 6);
        doc.text(`• ${w}`, margin + 6, y);
        y += 4;
      });
      y += 2;
    }
    if (latestDischarge.follow_up) {
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      const fLines = doc.splitTextToSize(`Follow-up: ${latestDischarge.follow_up}`, pageW - margin * 2 - 4);
      doc.text(fLines, margin + 2, y);
      y += fLines.length * 4.5 + 4;
    }
  }

  // ── Footer on every page ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    doc.setFillColor(...darkBg);
    doc.rect(0, pH - 14, pageW, 14, 'F');
    doc.setFillColor(...teal);
    doc.rect(0, pH - 14, pageW, 0.5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...gray);
    doc.text('SwasthaLink Health Report — Confidential', margin, pH - 5);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pH - 5, { align: 'right' });
  }

  // ── Generate outputs ──
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `SwasthaLink_Report_${(patientName || 'Patient').replace(/\s+/g, '_')}_${timestamp}.pdf`;
  const pdfBlob = doc.output('blob');

  // Build a WhatsApp-friendly text summary (max 1500 chars to leave room)
  const textSummary = buildTextSummary({ patientName, patientId, diagnosis, medications, tests, insights, latestDischarge, doctorName });

  return { pdfBlob, textSummary, fileName, pdfDataUri: doc.output('datauristring') };
}

/* ── Helpers ── */

function sectionHeader(doc, title, y, margin, pageW, teal) {
  doc.setFillColor(...teal);
  doc.rect(margin, y, pageW - margin * 2, 7, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, margin + 4, y + 5);
  return y + 12;
}

function checkPageBreak(doc, y, needed) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 20) {
    doc.addPage();
    return 16;
  }
  return y;
}

function buildTextSummary({ patientName, patientId, diagnosis, medications, tests, insights, latestDischarge, doctorName }) {
  const parts = [];
  parts.push(`🏥 *SwasthaLink Health Report*`);
  parts.push(`📋 Patient: ${patientName || 'N/A'} (${patientId || ''})`);
  if (doctorName) parts.push(`👨‍⚕️ Doctor: ${doctorName}`);
  parts.push(`📅 ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
  parts.push('');

  if (diagnosis) {
    parts.push(`*Diagnosis:* ${diagnosis}`);
    parts.push('');
  }

  if (medications?.length > 0) {
    parts.push(`*💊 Medications (${medications.length}):*`);
    medications.slice(0, 5).forEach(m => {
      parts.push(`• ${m.name} ${m.strength || ''} — ${m.frequency || ''}`);
    });
    if (medications.length > 5) parts.push(`  +${medications.length - 5} more`);
    parts.push('');
  }

  if (tests?.length > 0) {
    parts.push(`*🔬 Key Tests:*`);
    tests.slice(0, 4).forEach(t => {
      parts.push(`• ${t.name}: ${t.result || t.status || 'Pending'}`);
    });
    parts.push('');
  }

  if (latestDischarge?.risk_score !== undefined) {
    parts.push(`*⚠️ Readmission Risk:* ${latestDischarge.risk_score}/100 (${latestDischarge.risk_level})`);
    parts.push('');
  }

  const dos = insights?.dos_and_donts?.do || [];
  if (dos.length > 0) {
    parts.push('*✅ Key Do\'s:*');
    dos.slice(0, 3).forEach(d => parts.push(`• ${d}`));
    parts.push('');
  }

  parts.push('📄 Full PDF report available in the SwasthaLink app.');

  let summary = parts.join('\n');
  if (summary.length > 1500) summary = summary.substring(0, 1497) + '...';
  return summary;
}
