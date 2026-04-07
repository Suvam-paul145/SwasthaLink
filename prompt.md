# SwasthaLink — AI Image Generation Prompts

> Use these prompts to generate demo prescription images and medical report images for testing OCR, discharge summary parsing, and the prescription RAG pipeline.

---

## Table of Contents

1. [Handwritten Prescription (OCR-ready)](#1-handwritten-prescription-ocr-ready)
2. [Typed / Printed Prescription](#2-typed--printed-prescription)
3. [Discharge Summary Report](#3-discharge-summary-report)
4. [Blood Test / Lab Report](#4-blood-test--lab-report)
5. [Post-Surgery Discharge Report](#5-post-surgery-discharge-report)
6. [Cardiology Report](#6-cardiology-report)
7. [Radiology / X-Ray Report](#7-radiology--x-ray-report)
8. [Diabetic Follow-Up Prescription](#8-diabetic-follow-up-prescription)
9. [Pediatric Prescription (Handwritten)](#9-pediatric-prescription-handwritten)
10. [Emergency Department Summary](#10-emergency-department-summary)

---

## 1. Handwritten Prescription (OCR-ready)

> **Goal:** Generate a realistic handwritten Indian doctor prescription on a standard Rx pad. Must NOT look AI-generated. Must challenge OCR with natural handwriting imperfections.

### Prompt

```
Generate a photograph of a real handwritten medical prescription on a standard Indian doctor's prescription pad.

PAD LAYOUT:
- Top-left: Preprinted clinic header "Dr. Raghav Menon, MBBS, MD (Gen. Medicine)" in dark blue serif font, smaller line below "Reg. No. WB/18234", below that "Mon–Sat | 10 AM – 1 PM, 5 PM – 8 PM"
- Top-right: Preprinted clinic name "MENON POLYCLINIC" and address "42, M.G. Road, Kolkata – 700012" and phone "033-2456 7890"
- A thin printed horizontal line separates the header from the writing area
- Bottom of pad: Preprinted small text "Get well soon" centered, very faint

HANDWRITTEN CONTENT (written in blue ballpoint pen, natural doctor handwriting — slightly rushed, some letters connected, variable slant, occasional ink pressure changes, NOT calligraphy, NOT neat print):

Patient Name: Anita Sharma        Age/Sex: 34/F        Date: 05/04/2026

Written as "Rx" symbol at top-left of body area, then the following medications listed below it:

1. Tab Amoxicillin 500mg
   1-0-1 x 5 days  (a/f)

2. Tab Paracetamol 650mg
   SOS for fever (max 3/day)

3. Syr. Ambrodil-S  5ml
   TDS x 5 days

4. Tab Cetirizine 10mg
   0-0-1 x 5 days  (h/s)

5. Steam inhalation  — 2-3 times/day

Dx: URTI with productive cough

Below medications, handwritten note: "Plenty of fluids. Avoid cold drinks. F/U after 5 days if not better."

Doctor signature at bottom right — a quick scribbled signature, not perfectly legible

REALISM REQUIREMENTS:
- The paper should look like actual white Rx pad paper, slightly off-white with very faint aging
- Blue ballpoint pen ink with natural pressure variation — some strokes darker where the pen pressed harder, lighter on quick strokes
- Some letters should be slightly ambiguous (e.g., "a" and "o" look similar, "l" and "1" overlap) — this is how real doctors write
- Minor inconsistencies: one line slightly tilted, spacing between items not perfectly even
- A tiny ink dot or pen tap mark somewhere on the pad (natural artifact)
- The "1-0-1" dosage notation should look like the doctor wrote it quickly
- No digital text overlays, no perfect fonts, no ruled lines in the handwriting area
- The prescription should look like it was photographed lying on a desk or table surface — slight shadow at edges, natural ambient lighting, not studio-lit
- Paper edges visible, maybe a slight curl at one corner
- DO NOT make it look like a generated template. The handwriting must have human imperfection, character-to-character variation, and the kind of speed marks that come from a busy OPD

CAMERA ANGLE: Slightly overhead, like someone took a phone photo of the prescription lying on a wooden desk. Natural daylight from the left, soft shadow on the right side of the paper.
```

### What This Tests

- OCR accuracy on real-world handwriting with ambiguous characters
- Medication name extraction from abbreviated dosage formats (1-0-1, TDS, SOS, a/f, h/s)
- Handling of diagnosis abbreviations (URTI, Dx)
- Doctor signature region detection
- Mixed preprinted + handwritten content separation

---

## 2. Typed / Printed Prescription

### Prompt

```
Generate a high-resolution image of a typed medical prescription printed on a hospital letterhead.

HOSPITAL HEADER:
- Hospital logo placeholder (a simple medical cross in a circle, blue)
- "CITY GENERAL HOSPITAL & RESEARCH CENTRE"
- "123, Park Street, Kolkata – 700016"
- "Phone: 033-2234 5678 | Email: info@citygeneral.org"
- Horizontal line below header

PRESCRIPTION BODY (typed in a standard serif font like Times New Roman, 12pt, black):

Date: 03/04/2026
OPD Ticket No: OPD-20260403-0847

Patient Name: Rajesh Kumar Verma
Age: 45 years | Sex: Male
Address: 78, Behala, Kolkata - 700034

Diagnosis: Acute Gastroenteritis with Dehydration

Rx:

1. Tab. Metronidazole 400mg — 1 tablet three times daily after meals × 5 days
2. Tab. Norfloxacin 400mg — 1 tablet twice daily (morning & night) × 5 days
3. Sachet ORS — 1 sachet in 1 litre water, sip throughout the day
4. Tab. Ondansetron 4mg — 1 tablet SOS for nausea (max 3 times/day)
5. Cap. Probiotic (Vizylac) — 1 capsule once daily × 10 days
6. Tab. Pantoprazole 40mg — 1 tablet before breakfast × 7 days

Advice:
- Light diet, avoid oily and spicy food
- Plenty of oral fluids — ORS, coconut water, dal water
- Return to ER if blood in stool, persistent vomiting, or high fever (>101°F)
- Follow-up in General Medicine OPD after 5 days

Dr. Smita Bhattacharya, MD (Internal Medicine)
Reg. No: WB/21098
Signature: [Handwritten signature in blue ink]

LAYOUT:
- Clean white A4 paper, hospital watermark faintly visible behind text
- Printed on a laser printer — crisp text, no smudging
- The signature at the bottom should be handwritten in blue pen over the printed text
- A round hospital stamp/seal in blue-purple ink near the signature (partially overlapping)
- Photo taken straight-on under office lighting, paper on a clipboard
```

---

## 3. Discharge Summary Report

### Prompt

```
Generate a realistic image of a printed discharge summary from an Indian hospital, 1 page, A4 size.

HOSPITAL HEADER:
- "APOLLO MULTISPECIALITY HOSPITAL" in bold blue
- Address line: "14, Diamond Harbour Rd, Kolkata – 700027"
- Phone, Fax, Email line
- Thin blue double-line border around the entire page

CONTENT (typed, black text, structured with bold section headers):

DISCHARGE SUMMARY

Patient Name: Meera Devi                    MR No: MR-2026-08451
Age/Sex: 58 yrs / Female                    Ward: General Medicine – Bed 12
Date of Admission: 01/04/2026               Date of Discharge: 04/04/2026
Treating Doctor: Dr. Arindam Ghosh, MD (General Medicine)

DIAGNOSIS:
1. Community Acquired Pneumonia (Right Lower Lobe)
2. Controlled Type 2 Diabetes Mellitus

PRESENTING COMPLAINTS:
- Fever with chills × 4 days
- Productive cough with yellowish sputum × 3 days
- Breathlessness on exertion × 2 days

HOSPITAL COURSE:
Patient was admitted with high-grade fever and respiratory distress. Chest X-ray showed right lower lobe consolidation. Started on IV antibiotics (Ceftriaxone + Azithromycin). Patient responded well. Fever subsided by Day 2. SpO2 improved from 92% to 97% on room air. Switched to oral antibiotics on Day 3. Blood sugar managed with regular insulin and oral hypoglycemics.

DISCHARGE MEDICATIONS:
1. Tab. Amoxicillin-Clavulanate 625mg — TDS × 7 days (after food)
2. Tab. Azithromycin 500mg — OD × 3 days
3. Syr. Ambrodil-S 5ml — TDS × 5 days
4. Tab. Paracetamol 650mg — SOS for fever
5. Tab. Metformin 500mg — BD (continue as before)
6. Tab. Glimepiride 1mg — OD before breakfast (continue)
7. Tab. Pantoprazole 40mg — OD before breakfast

ADVICE ON DISCHARGE:
- Complete full course of antibiotics
- Monitor blood sugar and temperature daily
- Increase fluid intake and rest
- Follow-up in General Medicine OPD after 7 days with Chest X-ray
- Return to ER if: fever >101°F, worsening breathlessness, blood in sputum

Sign & Stamp area at bottom with doctor signature in blue ink and oval hospital stamp.

APPEARANCE: Realistic hospital printout, slightly folded crease visible across the middle (like it was folded to fit in a file), paper texture visible, natural photo under fluorescent light.
```

---

## 4. Blood Test / Lab Report

### Prompt

```
Generate a realistic photograph of a printed blood test lab report on lab letterhead.

LAB HEADER:
- "METROPOLIS HEALTHCARE LTD."
- "NABL Accredited Laboratory"
- Address and contact details
- Lab registration number

REPORT BODY:

Patient Name: Suresh Mondal                 Age/Sex: 52 / M
Ref. By: Dr. P. K. Saha                    Sample Collected: 02/04/2026, 8:15 AM
Report Date: 02/04/2026                     Sample ID: MTR-2026-78234

COMPLETE BLOOD COUNT (CBC):

| Test                  | Result    | Unit        | Reference Range     |
|-----------------------|-----------|-------------|---------------------|
| Hemoglobin            | 11.8      | g/dL        | 13.0 – 17.0         |
| Total WBC Count       | 12,400    | cells/cumm  | 4,000 – 11,000      |
| RBC Count             | 4.2       | million/cumm| 4.5 – 5.5           |
| Platelet Count        | 1,85,000  | /cumm       | 1,50,000 – 4,00,000 |
| PCV / Hematocrit      | 35.2      | %           | 40 – 50             |
| MCV                   | 83.8      | fL          | 83 – 101            |
| MCH                   | 28.1      | pg          | 27 – 32             |
| MCHC                  | 33.5      | g/dL        | 31.5 – 34.5         |
| ESR                   | 38        | mm/hr       | 0 – 15              |

DIFFERENTIAL COUNT:
Neutrophils: 78% (H) | Lymphocytes: 16% | Monocytes: 4% | Eosinophils: 2% | Basophils: 0%

BLOOD SUGAR:
- Fasting Blood Sugar: 148 mg/dL (H) [Ref: 70–110]
- Post Prandial (2hr): 212 mg/dL (H) [Ref: <140]
- HbA1c: 8.1% (H) [Ref: <5.7 Normal, 5.7–6.4 Prediabetic]

LIPID PROFILE:
- Total Cholesterol: 238 mg/dL (H) [Ref: <200]
- Triglycerides: 195 mg/dL (H) [Ref: <150]
- HDL Cholesterol: 36 mg/dL (L) [Ref: >40]
- LDL Cholesterol: 163 mg/dL (H) [Ref: <100]
- VLDL: 39 mg/dL [Ref: <30]

KIDNEY FUNCTION:
- Serum Creatinine: 1.3 mg/dL [Ref: 0.7–1.3]
- Blood Urea: 42 mg/dL [Ref: 15–40]
- Uric Acid: 7.8 mg/dL (H) [Ref: 3.5–7.2]

Abnormal values marked with (H) for High or (L) for Low, printed in bold or red.
Footer: "Pathologist: Dr. R. Chakraborty, MD (Pathology)" with signature and "This is a computer-generated report and does not require a signature" note.

APPEARANCE: Typical Indian lab report — printed on thermal or laser paper, with lab logo, structured table format, barcoded sample ID at top-right corner. Photo shows the paper lying flat, slightly crumpled edges, fluorescent lab lighting.
```

---

## 5. Post-Surgery Discharge Report

### Prompt

```
Generate a realistic image of a post-surgery discharge summary printed on hospital letterhead, A4 size.

HOSPITAL: "FORTIS HOSPITAL, KOLKATA"
Standard hospital letterhead with logo, NABH accreditation badge, address, emergency number.

CONTENT:

DISCHARGE SUMMARY — SURGICAL

Patient: Bikash Halder                       UHID: FH-KOL-20260342
Age/Sex: 48 yrs / Male                      Ward: Surgical ICU → General Surgery Ward
Admission: 28/03/2026                        Discharge: 03/04/2026
Surgeon: Dr. Nilanjan Roy, MS, MCh (Surgical Gastroenterology)

DIAGNOSIS:
1. Acute Calculous Cholecystitis
2. Cholelithiasis (Multiple Gallstones)

PROCEDURE: Laparoscopic Cholecystectomy (30/03/2026)
Anaesthesia: General Anaesthesia
Duration: 55 minutes
Findings: Distended gallbladder with multiple calculi (largest 18mm), wall thickening, no CBD stones

POST-OP COURSE:
- Drain removed on POD-2, minimal serous output
- Oral feeds started POD-1, tolerated well
- Ambulation started POD-1
- Surgical site clean, no signs of infection

DISCHARGE MEDICATIONS:
1. Tab. Paracetamol 650mg — TDS × 5 days (for pain)
2. Tab. Tramadol 50mg — SOS for severe pain (max BD × 3 days)
3. Tab. Pantoprazole 40mg — OD before breakfast × 14 days
4. Tab. Cefpodoxime 200mg — BD × 5 days
5. Oint. Povidone Iodine 5% — Apply on wounds BD after cleaning

WOUND CARE INSTRUCTIONS:
- Keep wounds dry for 48 hours
- Clean with normal saline, apply betadine, cover with sterile gauze
- Watch for redness, pus discharge, fever — report immediately
- Sutures are absorbable — no removal needed

DIET: Low-fat, bland diet × 3 weeks. Avoid ghee, butter, fried food. Gradually reintroduce normal diet.
ACTIVITY: No lifting >5 kg × 4 weeks. Desk work after 1 week. Exercise after 4 weeks with clearance.
FOLLOW-UP: Surgical OPD in 7 days. Bring this summary and all reports.

Doctor signature in blue, round hospital seal stamp, date stamp.

APPEARANCE: Clean hospital printout with structured headings, hospital watermark visible faintly. Paper photographed on a hospital bed tray table, slightly wrinkled from handling.
```

---

## 6. Cardiology Report

### Prompt

```
Generate a realistic image of a printed cardiology consultation and discharge report, A4, from an Indian hospital.

HOSPITAL: "NARAYANA SUPERSPECIALITY HOSPITAL"
Letterhead with red-blue logo, NABH badge, Howrah address, 24x7 emergency number.

CONTENT:

CARDIOLOGY DISCHARGE SUMMARY

Patient: Tapan Mukherjee                    MR No: NSH-2026-07612
Age/Sex: 62 yrs / Male                     Ward: ICCU → Cardiology Ward
Admission: 25/03/2026                       Discharge: 01/04/2026
Consultant: Dr. Subhajit Bose, DM (Cardiology), FACC

DIAGNOSIS:
1. Acute Anterior Wall ST-Elevation Myocardial Infarction (STEMI)
2. Primary PCI with DES to LAD
3. Type 2 Diabetes Mellitus
4. Essential Hypertension

PROCEDURE:
Coronary Angiography (25/03/2026): 95% stenosis in mid-LAD. RCA and LCx — normal.
Primary PCI (25/03/2026): Drug-Eluting Stent (Xience Sierra 3.0 × 28mm) deployed to mid-LAD. Post-dilatation with NC balloon. TIMI III flow achieved. No complications.

ECHOCARDIOGRAPHY (28/03/2026):
- LVEF: 42% (mild LV systolic dysfunction)
- RWMA: Hypokinesia of anterior wall and apex
- No pericardial effusion, valves normal

DISCHARGE MEDICATIONS (CRITICAL — DO NOT STOP WITHOUT CARDIOLOGIST ADVICE):
1. Tab. Aspirin 75mg — OD morning (LIFELONG)
2. Tab. Ticagrelor 90mg — BD (minimum 12 months — DO NOT STOP)
3. Tab. Atorvastatin 40mg — OD at night
4. Tab. Metoprolol Succinate 25mg — OD morning
5. Tab. Ramipril 2.5mg — OD morning
6. Tab. Pantoprazole 40mg — OD before breakfast
7. Tab. Metformin 500mg — BD after meals
8. Tab. Empagliflozin 10mg — OD morning
9. Tab. Trimetazidine 35mg MR — BD
10. Inj. Enoxaparin 60mg SC — BD × 2 more days (then stop)

CARDIAC REHABILITATION:
- Bed rest × 3 days, then gradual walking
- Phase I cardiac rehab at home
- No driving × 2 weeks
- No heavy exertion × 6 weeks
- Smoking cessation mandatory
- Follow-up ECHO + TMT after 3 months

WARNING — COME TO ER IMMEDIATELY IF:
- Chest pain/heaviness > 5 minutes
- Sudden breathlessness at rest
- Profuse sweating with nausea
- Any bleeding (gums, stool, urine)
- Sudden limb weakness or speech difficulty

FOLLOW-UP: Cardiology OPD in 10 days with ECG.

Doctor signature, hospital round seal, "Prepared by: Dr. Ananya Sen, Registrar" typed below.

APPEARANCE: Multi-section hospital printout, possibly 2 pages. Fold crease in middle. One corner has a paper clip mark. Photo on a desk with reading glasses partially visible at edge of frame.
```

---

## 7. Radiology / X-Ray Report

### Prompt

```
Generate a realistic image of a printed chest X-ray radiology report from an Indian diagnostic center.

CENTER NAME: "SCAN & CARE DIAGNOSTIC CENTRE"
NABL accredited, address "56 Gariahat Road, Kolkata – 700019"

REPORT:

CHEST X-RAY (PA VIEW)

Patient: Meera Devi                          Ref. By: Dr. Arindam Ghosh
Age/Sex: 58 / F                              Date: 01/04/2026
X-Ray ID: XR-2026-04512

FINDINGS:
- Homogeneous opacity noted in the right lower zone with air bronchograms — suggestive of consolidation
- Right costophrenic angle partially obliterated — mild pleural effusion cannot be ruled out
- Left lung field is clear
- Cardiac silhouette appears normal in size
- Trachea is central
- No bony abnormality seen
- Both hemidiaphragms are normal in position and contour

IMPRESSION:
1. Right lower lobe consolidation — likely pneumonia (correlate clinically and with CBC, CRP)
2. Mild right-sided pleural effusion — cannot be excluded
3. No cardiomegaly

Radiologist: Dr. Soumya Banerjee, MD (Radiodiagnosis)
Signature and digital stamp.

APPEARANCE: Standard radiology report format — clean printer output, structured with clear headings. Report printed on white paper with lab logo and registration number at top. A thumbnail of the X-ray image is sometimes placed in the top-right corner (black rectangle placeholder with "X-RAY IMAGE" label). Photo of the paper on a light box or desk, clinical setting.
```

---

## 8. Diabetic Follow-Up Prescription

### Prompt

```
Generate a photograph of a handwritten follow-up prescription for a diabetic patient. Indian doctor's Rx pad.

PAD HEADER (preprinted):
"Dr. Piyali Sen, MBBS, MD (Endocrinology)"
"Diabetes & Thyroid Clinic"
"18, Southern Avenue, Kolkata – 700029"
"By Appointment Only | Ph: 98300 XXXXX"

HANDWRITTEN IN BLACK BALLPOINT PEN (natural doctor handwriting — efficient, slightly messy, medically abbreviated):

Date: 04/04/2026

Pt: Suresh Mondal    Age: 52/M    Wt: 82 kg    BP: 148/92    FBS: 148    PP: 212    HbA1c: 8.1%

↑↑ Sugar control poor. Needs intensification.

Rx:
1. Tab Metformin 1000mg  1-0-1  (continue)
2. Tab Glimepiride 2mg  1-0-0  (↑ from 1mg)
3. Tab Empagliflozin 10mg  1-0-0  (NEW)
4. Tab Atorvastatin 20mg  0-0-1
5. Tab Telmisartan 40mg  1-0-0
6. Inj Insulin Glargine  — start 10 units HS  (teach injection technique)

Advice:
- Strict diet control — avoid rice at dinner, no sweets
- Walk 30 min/day
- SMBG — check FBS + PP twice/week, maintain diary
- Foot care — check feet daily
- Get: Serum Creatinine, Urine Microalbumin, Fundoscopy

Review after 6 weeks with sugar diary + reports

Signature (quick scrawl) at bottom right.

REALISM: Same requirements as Prompt #1 — blue/black pen, natural imperfections, pressure variation, slightly tilted lines, photographed on a desk with phone camera. One or two words may be slightly hard to read. The arrows (↑↑) should be hand-drawn. Numbers should look naturally written, not perfectly formed.
```

---

## 9. Pediatric Prescription (Handwritten)

### Prompt

```
Generate a photograph of a handwritten pediatric prescription from an Indian pediatrician's Rx pad.

PAD HEADER (preprinted):
"Dr. Sharmila Das, MBBS, DCH, MD (Pediatrics)"
"CHILD CARE CLINIC"
"Rainbow Plaza, 2nd Floor, Salt Lake, Kolkata – 700091"
"Mon–Sat 5 PM – 8 PM | Sun 10 AM – 1 PM"

HANDWRITTEN IN BLUE PEN (careful but quick handwriting — pediatricians tend to write slightly more legibly because dosages are weight-based):

Date: 05/04/2026

Name: Baby Aryan (S/o Rohit Das)    Age: 3 yrs    Wt: 14 kg

C/o: Fever × 2 days, runny nose, mild cough, decreased appetite

O/E: Throat congested. Bilateral TMs normal. Chest clear. No rash.

Dx: Viral URTI

Rx:
1. Syr. Paracetamol 250mg/5ml — 5ml SOS for fever >100°F (gap of 6 hrs)
2. Syr. Cetirizine 5mg/5ml — 2.5ml OD × 5 days (at night)
3. Syr. Ambrodil-S — 2.5ml TDS × 5 days
4. Nasoclear saline drops — 2 drops each nostril TDS
5. Steam inhalation (with parent supervision)

Advice:
- Plenty of warm fluids
- Sponging if fever >101°F
- Soft, easy-to-eat food
- No antibiotics needed — viral illness, will resolve in 5-7 days
- Come back if: fever >3 days, ear pain, breathing difficulty, rash

F/U: Only if not improving in 5 days

Signature at bottom.

REALISM: Natural handwriting on a colorful pediatric Rx pad (maybe a small cartoon border or colorful header). Pen strokes show natural doctor writing speed. Dosage calculations visible in margin (14 × 15 = 210 ≈ scratched out, small calculation). Photo taken on a bright clinic desk, good lighting, maybe a toy or stethoscope at edge of frame.
```

---

## 10. Emergency Department Summary

### Prompt

```
Generate a realistic image of a printed Emergency Department discharge summary from an Indian government hospital.

HOSPITAL: "SSKM HOSPITAL (IPGMER)"
"244, AJC Bose Road, Kolkata – 700020"
Government of West Bengal, Department of Health & Family Welfare

CONTENT (typed in a basic font, slightly condensed formatting — government hospital style):

EMERGENCY DEPARTMENT — DISCHARGE SUMMARY

Patient: Ratan Shaw                          ER Reg No: ER-2026-14203
Age/Sex: 28 / Male                          Date/Time In: 04/04/2026, 02:30 AM
Address: 12, Tiljala, Kolkata – 700039      Date/Time Out: 04/04/2026, 08:45 AM
Brought By: Brother (Mohan Shaw)             Mode: Walk-in

CHIEF COMPLAINT: Road traffic accident — fall from motorcycle. C/o pain right forearm, abrasions on right knee and elbow. No LOC, no vomiting, no ENT bleed.

ON EXAMINATION:
- Conscious, oriented, vitals stable (BP 124/80, PR 88/min, SpO2 98%)
- Right forearm: Tenderness, swelling, deformity at distal 1/3rd
- Abrasions: Right knee (4×3 cm), right elbow (3×2 cm) — superficial, no deep tissue injury
- No head injury signs, pupils BERL, GCS 15/15
- Abdomen soft, no tenderness
- Spine: No tenderness

INVESTIGATIONS:
- X-Ray Right Forearm AP/Lat: Fracture distal 1/3rd radius — undisplaced
- X-Ray Chest, Pelvis: Normal
- CBC, RBS: Within normal limits

TREATMENT GIVEN:
- Wound cleaning and dressing
- Tetanus Toxoid 0.5ml IM
- Below-elbow POP slab applied
- Tab. Paracetamol 650mg + Tab. Tramadol 50mg given STAT
- Inj. Diclofenac 75mg IM given

DISCHARGE MEDICATIONS:
1. Tab. Paracetamol 650mg — TDS × 5 days (for pain)
2. Tab. Tramadol 50mg — BD × 3 days (if severe pain)
3. Tab. Pantoprazole 40mg — OD × 7 days
4. Tab. Cefpodoxime 200mg — BD × 5 days
5. Ointment Framycetin — apply on abrasions BD after cleaning
6. Arm sling — keep right arm elevated

ADVICE:
- POP slab care: Keep dry, do not insert objects, watch for swelling/numbness/bluish discoloration of fingers — report immediately
- Orthopaedics OPD follow-up in 5 days with X-ray
- Complete antibiotics course
- Wound dressing change every alternate day
- No heavy use of right hand × 6 weeks

Casualty Medical Officer: Dr. Amit Saha, MBBS (Junior Resident, Dept. of Orthopaedics)
Countersigned: Dr. S. Mukherjee, MS (Ortho), Senior Resident

Stamp: Government hospital round stamp with emblem.

APPEARANCE: Printed on standard government hospital paper — slightly yellow-tinted paper, basic formatting without fancy design, hospital emblem at top, typed text with some sections hand-filled. Stamp is slightly smudged. Photo shows paper in a clear file folder sleeve, taken under tube light.
```

---

## Usage Notes

- **For OCR testing:** Use prompts #1, #8, and #9 (handwritten prescriptions) — these will stress-test the OCR pipeline with real-world handwriting.
- **For discharge summary parsing:** Use prompts #3, #5, #6, and #10 — these match the format SwasthaLink converts into patient-friendly language.
- **For lab report extraction:** Use prompt #4 and the radiology report #7 — these test table/structured data extraction.
- **For the full pipeline (upload → OCR → summarize → deliver):** Combine a handwritten prescription (#1) + lab report (#4) + discharge summary (#3) as a complete patient document set.

### Recommended AI Image Generators

| Tool | Best For | Notes |
|------|----------|-------|
| Midjourney v6+ | Handwritten prescriptions | Best at realistic handwriting texture and pen pressure |
| DALL-E 3 | Structured/typed reports | Clean text layout, good for forms and tables |
| Stable Diffusion (SDXL) | Both | Use ControlNet for layout precision, good with prompts about paper texture |
| Ideogram | Text-heavy images | Handles readable text in images better than most |
| Flux.1 Pro | Photorealistic documents | Excellent paper texture and lighting realism |

### Tips for Maximum Realism

1. **Add post-processing:** Slightly rotate the generated image 1-2°, add subtle JPEG compression, adjust white balance to warm
2. **Paper texture:** Request "slightly creased" or "folded once" — perfectly flat paper looks AI-generated
3. **Lighting:** Natural/ambient light with soft shadows beats studio lighting for document photos
4. **Context objects:** A pen, clip, or desk edge at the frame border adds realism
5. **Multiple generations:** Generate 3-4 variants and pick the most natural-looking one
