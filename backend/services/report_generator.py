"""
SwasthaLink — Backend PDF Health Report Generator.

Generates a professional, multi-page health report PDF from prescription data
using ReportLab.  No LLM required — everything is data-driven.
"""

import io
import logging
import base64
from datetime import datetime
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Wedge
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics import renderPDF

logger = logging.getLogger(__name__)

# ── Brand colours ──────────────────────────────────────────────────────────
TEAL = colors.HexColor("#0d9488")
DARK_TEAL = colors.HexColor("#0f766e")
LIGHT_TEAL = colors.HexColor("#ccfbf1")
DARK_BG = colors.HexColor("#070e17")
WHITE = colors.white
GRAY = colors.HexColor("#64748b")
LIGHT_GRAY = colors.HexColor("#f1f5f9")
RED = colors.HexColor("#dc2626")
AMBER = colors.HexColor("#d97706")
GREEN = colors.HexColor("#16a34a")
BLUE = colors.HexColor("#2563eb")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm


# ── Helpers ────────────────────────────────────────────────────────────────
def _safe(val: Any, fallback: str = "N/A") -> str:
    if val is None:
        return fallback
    return str(val).strip() or fallback


def _trunc(text: str, maxlen: int = 120) -> str:
    if len(text) <= maxlen:
        return text
    return text[: maxlen - 3] + "..."


def _risk_color(level: Optional[str]) -> colors.Color:
    if not level:
        return GRAY
    l = level.lower()
    if l == "high" or l == "critical":
        return RED
    if l == "moderate" or l == "medium":
        return AMBER
    return GREEN


def _make_styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "RTitle", parent=base["Title"],
            fontName="Helvetica-Bold", fontSize=20,
            textColor=WHITE, spaceAfter=2 * mm,
        ),
        "subtitle": ParagraphStyle(
            "RSub", parent=base["Normal"],
            fontName="Helvetica", fontSize=9,
            textColor=colors.HexColor("#94a3b8"),
        ),
        "section": ParagraphStyle(
            "RSec", parent=base["Heading2"],
            fontName="Helvetica-Bold", fontSize=12,
            textColor=TEAL, spaceBefore=6 * mm, spaceAfter=3 * mm,
            borderWidth=0, borderPadding=0,
        ),
        "body": ParagraphStyle(
            "RBody", parent=base["Normal"],
            fontName="Helvetica", fontSize=9,
            textColor=colors.HexColor("#334155"),
            leading=13, spaceAfter=2 * mm,
        ),
        "body_bold": ParagraphStyle(
            "RBodyB", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=9,
            textColor=colors.HexColor("#1e293b"),
            leading=13, spaceAfter=1 * mm,
        ),
        "small": ParagraphStyle(
            "RSmall", parent=base["Normal"],
            fontName="Helvetica", fontSize=8,
            textColor=GRAY, leading=11,
        ),
        "do": ParagraphStyle(
            "RDo", parent=base["Normal"],
            fontName="Helvetica", fontSize=9,
            textColor=colors.HexColor("#15803d"),
            leading=13, leftIndent=8 * mm, bulletIndent=4 * mm,
        ),
        "dont": ParagraphStyle(
            "RDont", parent=base["Normal"],
            fontName="Helvetica", fontSize=9,
            textColor=colors.HexColor("#b91c1c"),
            leading=13, leftIndent=8 * mm, bulletIndent=4 * mm,
        ),
        "warning": ParagraphStyle(
            "RWarn", parent=base["Normal"],
            fontName="Helvetica-Bold", fontSize=9,
            textColor=colors.HexColor("#b45309"),
            leading=13, leftIndent=8 * mm, bulletIndent=4 * mm,
        ),
        "footer": ParagraphStyle(
            "RFoot", parent=base["Normal"],
            fontName="Helvetica", fontSize=7,
            textColor=GRAY, alignment=TA_CENTER,
        ),
    }


# ── Drawing: Risk Gauge ───────────────────────────────────────────────────
def _risk_gauge(score: int, level: str) -> Drawing:
    """Simple semicircle gauge for readmission risk score."""
    d = Drawing(160, 90)
    # background arc segments
    import math
    cx, cy, r = 80, 70, 55
    # green / amber / red arcs
    for start, end, clr in [
        (180, 240, colors.HexColor("#bbf7d0")),
        (240, 300, colors.HexColor("#fef3c7")),
        (300, 360, colors.HexColor("#fecaca")),
    ]:
        d.add(Wedge(cx, cy, r, start, end, fillColor=clr, strokeColor=None, strokeWidth=0))
    # cover centre
    d.add(Circle(cx, cy, 34, fillColor=WHITE, strokeColor=None))
    # needle angle (0→180 maps to 180→360)
    angle = 180 + (score / 100) * 180
    rad = math.radians(angle)
    nx = cx + 40 * math.cos(rad)
    ny = cy + 40 * math.sin(rad)
    from reportlab.graphics.shapes import Line
    d.add(Line(cx, cy, nx, ny, strokeColor=DARK_BG, strokeWidth=2))
    d.add(Circle(cx, cy, 4, fillColor=DARK_BG, strokeColor=None))
    # labels
    d.add(String(cx, cy - 18, f"{score}/100", fontSize=14, fontName="Helvetica-Bold",
                 fillColor=_risk_color(level), textAnchor="middle"))
    d.add(String(cx, cy - 30, level.upper() if level else "",
                 fontSize=8, fontName="Helvetica-Bold",
                 fillColor=_risk_color(level), textAnchor="middle"))
    return d


# ── Drawing: Medication schedule wheel ────────────────────────────────────
def _med_schedule_chart(medications: List[dict]) -> Optional[Drawing]:
    """Pie chart showing morning/afternoon/evening/night distribution."""
    counts = {"Morning": 0, "Afternoon": 0, "Evening": 0, "Night": 0}
    for med in medications:
        sched = med.get("schedule") or {}
        if sched.get("morning"):
            counts["Morning"] += 1
        if sched.get("afternoon"):
            counts["Afternoon"] += 1
        if sched.get("evening"):
            counts["Evening"] += 1
        if sched.get("night"):
            counts["Night"] += 1
    data = [(k, v) for k, v in counts.items() if v > 0]
    if not data:
        return None
    d = Drawing(200, 130)
    pie = Pie()
    pie.x, pie.y, pie.width, pie.height = 30, 10, 100, 100
    pie.data = [v for _, v in data]
    pie.labels = [f"{k} ({v})" for k, v in data]
    clrs = [
        colors.HexColor("#fbbf24"),  # morning
        colors.HexColor("#38bdf8"),  # afternoon
        colors.HexColor("#818cf8"),  # evening
        colors.HexColor("#475569"),  # night
    ]
    for i in range(len(data)):
        pie.slices[i].fillColor = clrs[i % len(clrs)]
        pie.slices[i].strokeColor = WHITE
        pie.slices[i].strokeWidth = 1.5
    pie.sideLabels = True
    pie.slices.fontSize = 7
    pie.slices.fontName = "Helvetica"
    d.add(pie)
    return d


# ── Page header / footer callbacks ────────────────────────────────────────
def _on_page(canvas, doc, patient_name: str, patient_id: str):
    canvas.saveState()
    # Header bar
    canvas.setFillColor(DARK_BG)
    canvas.rect(0, PAGE_H - 28 * mm, PAGE_W, 28 * mm, fill=1, stroke=0)
    canvas.setFillColor(TEAL)
    canvas.rect(0, PAGE_H - 28.5 * mm, PAGE_W, 1 * mm, fill=1, stroke=0)
    # Logo text
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica-Bold", 16)
    canvas.drawString(MARGIN, PAGE_H - 14 * mm, "SwasthaLink")
    canvas.setFillColor(colors.HexColor("#94a3b8"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(MARGIN, PAGE_H - 19 * mm, "AI-Powered Health Intelligence Report")
    # Date
    canvas.setFillColor(WHITE)
    canvas.setFont("Helvetica", 8)
    now = datetime.now()
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 12 * mm,
                           now.strftime("%d %b %Y"))
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 17 * mm,
                           now.strftime("%I:%M %p"))
    # Footer
    canvas.setFillColor(LIGHT_GRAY)
    canvas.rect(0, 0, PAGE_W, 12 * mm, fill=1, stroke=0)
    canvas.setFillColor(GRAY)
    canvas.setFont("Helvetica", 6.5)
    canvas.drawString(MARGIN, 5 * mm,
                      f"Patient: {_safe(patient_name)} | ID: {_safe(patient_id)}")
    canvas.drawRightString(PAGE_W - MARGIN, 5 * mm,
                           f"Generated by SwasthaLink • Page {doc.page}")
    canvas.setFillColor(TEAL)
    canvas.rect(0, 12 * mm, PAGE_W, 0.5 * mm, fill=1, stroke=0)
    canvas.restoreState()


# ── Main generator ─────────────────────────────────────────────────────────
def generate_report_pdf(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a comprehensive health report PDF.

    Parameters
    ----------
    data : dict with keys:
        patient_name, patient_id, patient_age, patient_gender,
        doctor_name, diagnosis, notes, medications (list),
        tests (list), patient_insights (dict), discharge_history (list),
        prescription_date

    Returns
    -------
    dict : { pdf_bytes, pdf_base64, text_summary, file_name }
    """
    patient_name = _safe(data.get("patient_name"), "Patient")
    patient_id = _safe(data.get("patient_id"))
    patient_age = _safe(data.get("patient_age"))
    patient_gender = _safe(data.get("patient_gender"))
    doctor_name = _safe(data.get("doctor_name"))
    diagnosis = data.get("diagnosis") or ""
    notes = data.get("notes") or ""
    medications: List[dict] = data.get("medications") or []
    tests: List[dict] = data.get("tests") or []
    insights: dict = data.get("patient_insights") or {}
    discharge_history: List[dict] = data.get("discharge_history") or []
    prescription_date = _safe(data.get("prescription_date"), datetime.now().strftime("%Y-%m-%d"))

    styles = _make_styles()
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=32 * mm, bottomMargin=16 * mm,
        leftMargin=MARGIN, rightMargin=MARGIN,
    )

    story: List = []

    # ── 1. Patient Information Card ──────────────────────────────────────
    info_data = [
        [
            Paragraph(f"<b>Patient Name</b><br/>{patient_name}", styles["body"]),
            Paragraph(f"<b>Patient ID</b><br/>{patient_id}", styles["body"]),
            Paragraph(f"<b>Age / Gender</b><br/>{patient_age} / {patient_gender}", styles["body"]),
        ],
        [
            Paragraph(f"<b>Doctor</b><br/>{doctor_name}", styles["body"]),
            Paragraph(f"<b>Prescription Date</b><br/>{prescription_date}", styles["body"]),
            Paragraph(f"<b>Report Date</b><br/>{datetime.now().strftime('%d %b %Y, %I:%M %p')}", styles["body"]),
        ],
    ]
    info_table = Table(info_data, colWidths=[(PAGE_W - 2 * MARGIN) / 3] * 3)
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdfa")),
        ("BOX", (0, 0), (-1, -1), 0.8, TEAL),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#99f6e4")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3 * mm),
        ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm),
        ("RIGHTPADDING", (0, 0), (-1, -1), 3 * mm),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 4 * mm))

    # ── 2. Diagnosis ─────────────────────────────────────────────────────
    if diagnosis:
        story.append(Paragraph("DIAGNOSIS", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))
        story.append(Paragraph(diagnosis, styles["body"]))
        if notes:
            story.append(Paragraph(f"<b>Clinical Notes:</b> {notes}", styles["small"]))
        story.append(Spacer(1, 2 * mm))

    # ── 3. Health Summary ────────────────────────────────────────────────
    health_summary = insights.get("health_summary")
    if health_summary:
        story.append(Paragraph("HEALTH SUMMARY", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))
        story.append(Paragraph(health_summary, styles["body"]))
        story.append(Spacer(1, 2 * mm))

    # ── 4. Medications Table ─────────────────────────────────────────────
    if medications:
        story.append(Paragraph(f"MEDICATIONS ({len(medications)})", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))

        usable = PAGE_W - 2 * MARGIN
        col_widths = [8*mm, 32*mm, 18*mm, 32*mm, 20*mm, usable - 110*mm]

        header = [
            Paragraph("<b>#</b>", styles["small"]),
            Paragraph("<b>Medication</b>", styles["small"]),
            Paragraph("<b>Strength</b>", styles["small"]),
            Paragraph("<b>Frequency</b>", styles["small"]),
            Paragraph("<b>Duration</b>", styles["small"]),
            Paragraph("<b>Instructions</b>", styles["small"]),
        ]
        rows = [header]
        for i, med in enumerate(medications, 1):
            rows.append([
                Paragraph(str(i), styles["small"]),
                Paragraph(_safe(med.get("name"), "-"), styles["body_bold"]),
                Paragraph(_safe(med.get("strength"), "-"), styles["small"]),
                Paragraph(_safe(med.get("frequency"), "-"), styles["small"]),
                Paragraph(_safe(med.get("duration"), "-"), styles["small"]),
                Paragraph(_safe(med.get("instructions"), "-"), styles["small"]),
            ])
        med_table = Table(rows, colWidths=col_widths, repeatRows=1)
        med_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEAL),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#f0fdfa")]),
            ("BOX", (0, 0), (-1, -1), 0.5, TEAL),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
        ]))
        story.append(med_table)
        story.append(Spacer(1, 3 * mm))

        # Medication details (purpose + warnings)
        details_parts = []
        for med in medications:
            purpose = med.get("purpose")
            warnings = med.get("warnings")
            if purpose or warnings:
                name = _safe(med.get("name"), "Medication")
                parts = [f"<b>{name}:</b>"]
                if purpose:
                    parts.append(f" Purpose — {purpose}.")
                if warnings:
                    parts.append(f" <font color='#b45309'>⚠ {warnings}</font>")
                details_parts.append(Paragraph(" ".join(parts), styles["body"]))
        if details_parts:
            story.append(Paragraph("<b>Medication Notes</b>", styles["body_bold"]))
            story.extend(details_parts)
            story.append(Spacer(1, 2 * mm))

        # Medication schedule chart
        chart = _med_schedule_chart(medications)
        if chart:
            story.append(Paragraph("<b>Dosing Schedule Distribution</b>", styles["body_bold"]))
            story.append(chart)
            story.append(Spacer(1, 3 * mm))

    # ── 5. Test Results Table ────────────────────────────────────────────
    if tests:
        story.append(Paragraph(f"TEST RESULTS ({len(tests)})", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))

        usable = PAGE_W - 2 * MARGIN
        t_header = [
            Paragraph("<b>#</b>", styles["small"]),
            Paragraph("<b>Test Name</b>", styles["small"]),
            Paragraph("<b>Result</b>", styles["small"]),
            Paragraph("<b>Normal Range</b>", styles["small"]),
            Paragraph("<b>Status</b>", styles["small"]),
        ]
        t_rows = [t_header]
        for i, t in enumerate(tests, 1):
            status = _safe(t.get("status"), "-")
            status_style = styles["small"]
            if status.lower() in ("abnormal", "high", "critical"):
                status_style = ParagraphStyle("statR", parent=styles["small"],
                                              textColor=RED, fontName="Helvetica-Bold")
            elif status.lower() == "completed":
                status_style = ParagraphStyle("statG", parent=styles["small"],
                                              textColor=GREEN)
            t_rows.append([
                Paragraph(str(i), styles["small"]),
                Paragraph(_safe(t.get("name"), "-"), styles["body_bold"]),
                Paragraph(_safe(t.get("result"), "-"), styles["small"]),
                Paragraph(_safe(t.get("normal_range"), "-"), styles["small"]),
                Paragraph(status, status_style),
            ])
        test_cols = [8*mm, 36*mm, usable - 116*mm, 36*mm, 36*mm]
        test_table = Table(t_rows, colWidths=test_cols, repeatRows=1)
        test_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEAL),
            ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#f0fdfa")]),
            ("BOX", (0, 0), (-1, -1), 0.5, TEAL),
            ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5 * mm),
            ("LEFTPADDING", (0, 0), (-1, -1), 2 * mm),
        ]))
        story.append(test_table)
        story.append(Spacer(1, 3 * mm))

        # Test guide from insights
        test_guide = insights.get("test_guide") or []
        if test_guide:
            story.append(Paragraph("<b>Test Explanations</b>", styles["body_bold"]))
            for tg in test_guide:
                name = _safe(tg.get("name"), "Test")
                why = tg.get("why", "")
                expect = tg.get("what_to_expect", "")
                para = f"<b>{name}:</b> {why}"
                if expect:
                    para += f" <i>(What to expect: {expect})</i>"
                story.append(Paragraph(para, styles["body"]))
            story.append(Spacer(1, 2 * mm))

    # ── 6. Medication Guide (plain-language) ─────────────────────────────
    med_guide = insights.get("medication_guide") or []
    if med_guide:
        story.append(Paragraph("MEDICATION GUIDE (Plain Language)", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))
        for mg in med_guide:
            name = _safe(mg.get("name"), "Medication")
            what_text = mg.get("what", "")
            why_text = mg.get("why", "")
            when_text = mg.get("when", "")
            caution = mg.get("caution", "")
            lines = [f"<b>{name}</b>"]
            if what_text:
                lines.append(f"What: {what_text}")
            if why_text:
                lines.append(f"Why: {why_text}")
            if when_text:
                lines.append(f"When: {when_text}")
            if caution:
                lines.append(f"<font color='#b45309'>Caution: {caution}</font>")
            story.append(Paragraph("<br/>".join(lines), styles["body"]))
            story.append(Spacer(1, 1 * mm))

    # ── 7. Do's and Don'ts ───────────────────────────────────────────────
    dos = (insights.get("dos_and_donts") or {}).get("do") or []
    donts = (insights.get("dos_and_donts") or {}).get("dont") or []
    if dos or donts:
        story.append(Paragraph("DO'S &amp; DON'TS", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))
        if dos:
            story.append(Paragraph("<b>✓ DO:</b>", styles["body_bold"]))
            for item in dos:
                story.append(Paragraph(f"• {item}", styles["do"]))
            story.append(Spacer(1, 2 * mm))
        if donts:
            story.append(Paragraph("<b>✗ DON'T:</b>", styles["body_bold"]))
            for item in donts:
                story.append(Paragraph(f"• {item}", styles["dont"]))
            story.append(Spacer(1, 2 * mm))

    # ── 8. Readmission Risk Assessment ───────────────────────────────────
    latest = discharge_history[0] if discharge_history else None
    if latest:
        story.append(Paragraph("READMISSION RISK ASSESSMENT", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))

        risk_score = latest.get("risk_score")
        risk_level = latest.get("risk_level", "")
        if risk_score is not None:
            gauge = _risk_gauge(int(risk_score), risk_level)
            story.append(gauge)
            story.append(Spacer(1, 2 * mm))

        warn_signs = latest.get("warning_signs") or []
        if warn_signs:
            story.append(Paragraph("<b>Warning Signs — Seek Immediate Help If:</b>", styles["body_bold"]))
            for w in warn_signs:
                story.append(Paragraph(f"⚠ {w}", styles["warning"]))
            story.append(Spacer(1, 2 * mm))

        follow_up = latest.get("follow_up")
        if follow_up:
            fu_text = follow_up if isinstance(follow_up, str) else str(follow_up)
            story.append(Paragraph(f"<b>Follow-up:</b> {fu_text}", styles["body"]))
            story.append(Spacer(1, 2 * mm))

    # ── 9. Discharge Summary (English) ───────────────────────────────────
    if latest and latest.get("simplified_english"):
        story.append(Paragraph("DISCHARGE SUMMARY", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))
        for para_text in latest["simplified_english"].split("\n\n"):
            if para_text.strip():
                story.append(Paragraph(para_text.strip(), styles["body"]))
        story.append(Spacer(1, 2 * mm))

    # ── 10. Discharge Summary (Bengali) ──────────────────────────────────
    if latest and latest.get("simplified_bengali"):
        story.append(Paragraph("ডিসচার্জ সারাংশ (বাংলা)", styles["section"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=2 * mm))
        # Bengali text may not render in default Helvetica — include notice
        story.append(Paragraph(
            "<i>Note: Bengali text rendering requires a Unicode font. "
            "Please install Noto Sans Bengali for full support.</i>",
            styles["small"],
        ))
        story.append(Spacer(1, 2 * mm))

    # ── Build PDF ────────────────────────────────────────────────────────
    def page_callback(canvas, doc_inner):
        _on_page(canvas, doc_inner, patient_name, patient_id)

    doc.build(story, onFirstPage=page_callback, onLaterPages=page_callback)

    pdf_bytes = buf.getvalue()
    buf.close()

    # Build text summary for WhatsApp
    text_summary = _build_text_summary(data, medications, tests, insights, latest)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = (patient_name or "Patient").replace(" ", "_")[:20]
    file_name = f"SwasthaLink_Report_{safe_name}_{ts}.pdf"

    return {
        "pdf_bytes": pdf_bytes,
        "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
        "text_summary": text_summary,
        "file_name": file_name,
    }


def _build_text_summary(
    data: dict, medications: list, tests: list,
    insights: dict, discharge: Optional[dict],
) -> str:
    """Build a plain-text summary for WhatsApp (≤ 1500 chars)."""
    parts = [
        "📋 *SwasthaLink Health Report*",
        f"Patient: {_safe(data.get('patient_name'))}",
        f"ID: {_safe(data.get('patient_id'))}",
        f"Doctor: {_safe(data.get('doctor_name'))}",
        f"Date: {datetime.now().strftime('%d %b %Y')}",
    ]
    if data.get("diagnosis"):
        parts.append(f"\n*Diagnosis:* {_trunc(data['diagnosis'], 200)}")
    if insights.get("health_summary"):
        parts.append(f"\n*Summary:* {_trunc(insights['health_summary'], 300)}")
    if medications:
        parts.append(f"\n*Medications ({len(medications)}):*")
        for m in medications[:8]:
            parts.append(f"• {_safe(m.get('name'))} {_safe(m.get('strength'), '')}"
                        f" — {_safe(m.get('frequency'), '')}")
    if discharge:
        rs = discharge.get("risk_score")
        rl = discharge.get("risk_level", "")
        if rs is not None:
            parts.append(f"\n*Risk:* {rs}/100 ({rl.upper()})")
    parts.append("\n_Generated by SwasthaLink_")

    full = "\n".join(parts)
    return full[:1550]
