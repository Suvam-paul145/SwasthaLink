// ============================================================================
// Mock Data Module — Demo-only hardcoded data for judge-ready presentation
// Only activates for: patient@gmail.com, admin@gmail.com, doctor@mail.com
// Patient scenario: Severe Diabetes + Hypertension (emergency BP 200/120) + Migraine
// ============================================================================

export const DEMO_EMAILS = {
  patient: 'patient@gmail.com',
  admin: 'admin@gmail.com',
  doctor: 'doctor@mail.com',
};

export function isDemoAccount(email) {
  if (!email) return false;
  return Object.values(DEMO_EMAILS).includes(email.toLowerCase());
}

export function isDemoPatient(email) {
  return email?.toLowerCase() === DEMO_EMAILS.patient;
}
export function isDemoDoctor(email) {
  return email?.toLowerCase() === DEMO_EMAILS.doctor;
}
export function isDemoAdmin(email) {
  return email?.toLowerCase() === DEMO_EMAILS.admin;
}

// ---------------------------------------------------------------------------
// Dates — relative to "now" so the demo always looks fresh
// ---------------------------------------------------------------------------
const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h) => new Date(now.getTime() - h * 3600000).toISOString();

// ---------------------------------------------------------------------------
// PRESCRIPTIONS — three prescription records covering the full clinical picture
// ---------------------------------------------------------------------------
const MOCK_PRESCRIPTIONS = [
  // ---- Rx 1 (latest): Emergency hypertensive crisis + diabetes management ----
  {
    prescription_id: 'RX-DEMO-001',
    status: 'approved',
    doctor_id: 'DOC-SYSTEM-001',
    report_type: 'prescription',
    created_at: daysAgo(2),
    reviewed_at: daysAgo(1),
    admin_id: 'ADM-SYSTEM-001',
    s3_key: 'demo/rx_emergency_hypertension.jpg',
    image_url: null,
    extracted_data: {
      doctor_name: 'Dr. Anirban Mukherjee',
      patient_id: 'PID-DEMO01',
      patient_name: 'Suvam Paul',
      patient_age: '28',
      patient_gender: 'Male',
      prescription_date: daysAgo(2).split('T')[0],
      diagnosis: 'Hypertensive Emergency (BP 200/120 mmHg), Type 2 Diabetes Mellitus (Uncontrolled, HbA1c 9.8%), Chronic Migraine with Aura',
      extraction_confidence: 0.94,
      report_type: 'prescription',
      notes: 'Patient admitted via ER with BP 200/120. IV Labetalol administered. Stabilized to 150/95 over 6 hours. Insulin regimen adjusted. Migraine prophylaxis continued. Strict salt restriction and daily BP monitoring advised. Follow-up in 5 days.',
      medications: [
        {
          name: 'Amlodipine',
          strength: '10mg',
          form: 'Tablet',
          frequency: 'Once daily (morning)',
          duration: '90 days',
          instructions: 'Take on empty stomach. Monitor BP daily.',
          purpose: 'Calcium channel blocker for hypertension control',
          schedule: { morning: true, afternoon: false, evening: false, night: false },
          warnings: 'May cause ankle swelling. Avoid grapefruit juice.',
        },
        {
          name: 'Telmisartan',
          strength: '80mg',
          form: 'Tablet',
          frequency: 'Once daily (evening)',
          duration: '90 days',
          instructions: 'Take with or without food at the same time daily.',
          purpose: 'ARB for blood pressure and kidney protection',
          schedule: { morning: false, afternoon: false, evening: true, night: false },
          warnings: 'Do not use with potassium supplements without doctor advice.',
        },
        {
          name: 'Metformin',
          strength: '1000mg',
          form: 'Tablet',
          frequency: 'Twice daily (after breakfast & dinner)',
          duration: '90 days',
          instructions: 'Take immediately after meals to reduce stomach upset.',
          purpose: 'First-line oral medication for Type 2 Diabetes',
          schedule: { morning: true, afternoon: false, evening: false, night: true },
          warnings: 'Stop if you have severe vomiting or diarrhea. Avoid alcohol.',
        },
        {
          name: 'Insulin Glargine (Lantus)',
          strength: '18 units',
          form: 'Subcutaneous Injection',
          frequency: 'Once daily (bedtime)',
          duration: '90 days',
          instructions: 'Inject in abdomen or thigh. Rotate injection sites.',
          purpose: 'Long-acting insulin for basal glucose control',
          schedule: { morning: false, afternoon: false, evening: false, night: true },
          warnings: 'Monitor blood sugar before injection. Keep refrigerated.',
        },
        {
          name: 'Topiramate',
          strength: '50mg',
          form: 'Tablet',
          frequency: 'Twice daily',
          duration: '60 days',
          instructions: 'Increase gradually. Drink plenty of water.',
          purpose: 'Migraine prevention and frequency reduction',
          schedule: { morning: true, afternoon: false, evening: false, night: true },
          warnings: 'May cause tingling in hands/feet. Report vision changes.',
        },
        {
          name: 'Sumatriptan',
          strength: '50mg',
          form: 'Tablet',
          frequency: 'As needed for migraine attack (max 2/day)',
          duration: '30 days',
          instructions: 'Take at first sign of migraine. Do not use more than 10 days/month.',
          purpose: 'Acute migraine relief',
          schedule: { morning: false, afternoon: false, evening: false, night: false },
          warnings: 'Do not use with ergotamine. Avoid if you have uncontrolled BP.',
        },
        {
          name: 'Atorvastatin',
          strength: '20mg',
          form: 'Tablet',
          frequency: 'Once daily (bedtime)',
          duration: '90 days',
          instructions: 'Take at night for best cholesterol lowering effect.',
          purpose: 'Cholesterol management and cardiovascular risk reduction',
          schedule: { morning: false, afternoon: false, evening: false, night: true },
          warnings: 'Report unexplained muscle pain. Avoid excessive alcohol.',
        },
      ],
      tests: [
        { name: 'HbA1c', status: 'completed', result: '9.8%', normal_range: '< 7.0%' },
        { name: 'Fasting Blood Sugar', status: 'completed', result: '285 mg/dL', normal_range: '70-100 mg/dL' },
        { name: 'Serum Creatinine', status: 'completed', result: '1.3 mg/dL', normal_range: '0.7-1.3 mg/dL' },
        { name: 'Lipid Profile', status: 'completed', result: 'LDL 168 mg/dL, HDL 38 mg/dL', normal_range: 'LDL < 100, HDL > 40' },
        { name: 'ECG', status: 'completed', result: 'Left Ventricular Hypertrophy (LVH)' },
        { name: 'Urine Microalbumin', status: 'pending' },
        { name: 'Fundoscopy (Eye)', status: 'pending' },
      ],
      patient_insights: {
        medication_guide: [
          { name: 'Amlodipine 10mg', what: 'Blood pressure tablet (calcium channel blocker)', why: 'Relaxes blood vessels to lower your dangerously high BP (was 200/120)', when: 'Every morning on empty stomach', caution: 'May swell ankles. Avoid grapefruit.' },
          { name: 'Telmisartan 80mg', what: 'Blood pressure tablet (ARB)', why: 'Protects kidneys and heart while lowering BP', when: 'Every evening at the same time', caution: 'Do not take extra potassium without asking doctor.' },
          { name: 'Metformin 1000mg', what: 'Diabetes tablet', why: 'Helps your body use insulin better and lowers blood sugar (yours was 285)', when: 'After breakfast and dinner', caution: 'Take with food. Stop if severe vomiting. No alcohol.' },
          { name: 'Insulin Glargine 18 units', what: 'Long-acting insulin injection', why: 'Controls blood sugar through the night (HbA1c was 9.8%)', when: 'Bedtime — inject in belly or thigh', caution: 'Check sugar before injecting. Keep in fridge.' },
          { name: 'Topiramate 50mg', what: 'Migraine prevention tablet', why: 'Reduces how often you get migraines', when: 'Morning and night', caution: 'Drink lots of water. Tell doctor if vision changes.' },
          { name: 'Sumatriptan 50mg', what: 'Migraine rescue tablet', why: 'Stops a migraine once it starts', when: 'Only when migraine starts (max 2 per day)', caution: 'Do not use more than 10 days a month. Skip if BP is very high.' },
          { name: 'Atorvastatin 20mg', what: 'Cholesterol tablet', why: 'Your LDL cholesterol is too high (168). Protects your heart.', when: 'Bedtime', caution: 'Tell doctor about muscle pain. Limit alcohol.' },
        ],
        test_guide: [
          { name: 'HbA1c', why: 'Measures 3-month average blood sugar. Yours is 9.8% (target: below 7%). Very high — needs urgent control.', what_to_expect: 'Simple blood draw. No fasting needed. Repeat every 3 months.' },
          { name: 'Fasting Blood Sugar', why: 'Your morning sugar was 285 mg/dL (normal: 70-100). A key marker to track daily.', what_to_expect: 'Blood test after 8 hours of fasting.' },
          { name: 'Lipid Profile', why: 'LDL 168 (should be <100), HDL 38 (should be >40). High heart attack risk.', what_to_expect: 'Fasting blood test checking cholesterol levels.' },
          { name: 'ECG', why: 'Found Left Ventricular Hypertrophy — your heart muscle thickened from high BP.', what_to_expect: 'Painless test with electrodes on chest. Takes 5 mins.' },
          { name: 'Urine Microalbumin', why: 'Checks for early kidney damage from diabetes and high BP.', what_to_expect: 'Urine sample. Results in 1-2 days.' },
          { name: 'Fundoscopy', why: 'Checks for diabetic eye damage (retinopathy).', what_to_expect: 'Eye drops to dilate pupils, then doctor examines. Vision blurry for 2-3 hours after.' },
        ],
        health_summary: 'You have three conditions that need careful attention: (1) Severe hypertension — your BP reached 200/120 mmHg which is a medical emergency. You are now on two BP medications. (2) Uncontrolled Type 2 Diabetes — your HbA1c is 9.8% (should be under 7%). You need both tablets and insulin. (3) Chronic migraine with aura — preventive and rescue medications prescribed. Your heart shows early stress (LVH on ECG) and your cholesterol is high. Daily BP and sugar monitoring is critical. Follow up in 5 days.',
        dos_and_donts: {
          do: [
            'Check blood pressure twice daily (morning and evening) and record',
            'Check fasting blood sugar daily before breakfast',
            'Take all 7 medications exactly as prescribed — do not skip',
            'Follow strict low-salt diet (less than 5g/day)',
            'Walk gently for 20-30 minutes after meals',
            'Drink 2-3 liters of water daily',
            'Keep insulin refrigerated between 2-8°C',
            'Carry a glucose candy/juice for low sugar emergencies',
            'Keep migraine diary — note triggers and frequency',
          ],
          dont: [
            'Do NOT eat pickles, papad, processed food (high salt)',
            'Do NOT skip insulin even if you feel fine',
            'Do NOT take Sumatriptan if BP is above 160/100',
            'Do NOT drink alcohol — interacts with Metformin and liver',
            'Do NOT stop any medication without consulting doctor',
            'Do NOT eat more than 2 hours gap between meals',
            'Do NOT drive during a migraine with aura',
            'Do NOT ignore chest pain, severe headache, or blurred vision',
          ],
        },
      },
    },
  },

  // ---- Rx 2: Initial diabetes diagnosis (6 months ago) ----
  {
    prescription_id: 'RX-DEMO-002',
    status: 'approved',
    doctor_id: 'DOC-SYSTEM-001',
    report_type: 'prescription',
    created_at: daysAgo(180),
    reviewed_at: daysAgo(179),
    admin_id: 'ADM-SYSTEM-001',
    s3_key: 'demo/rx_diabetes_initial.jpg',
    image_url: null,
    extracted_data: {
      doctor_name: 'Dr. Anirban Mukherjee',
      patient_id: 'PID-DEMO01',
      patient_name: 'Suvam Paul',
      patient_age: '28',
      patient_gender: 'Male',
      prescription_date: daysAgo(180).split('T')[0],
      diagnosis: 'Type 2 Diabetes Mellitus (Newly Diagnosed, HbA1c 8.1%), Stage 1 Hypertension (BP 140/90)',
      extraction_confidence: 0.91,
      report_type: 'prescription',
      notes: 'Newly diagnosed T2DM. Started Metformin. BP borderline — lifestyle modification advised first. Migraine history noted. Referred to ophthalmology.',
      medications: [
        { name: 'Metformin', strength: '500mg', form: 'Tablet', frequency: 'Twice daily', duration: '90 days', instructions: 'Take after meals.', purpose: 'Initial diabetes management' },
        { name: 'Amlodipine', strength: '5mg', form: 'Tablet', frequency: 'Once daily', duration: '90 days', instructions: 'Morning dose.', purpose: 'Mild hypertension control' },
      ],
      tests: [
        { name: 'HbA1c', status: 'completed', result: '8.1%' },
        { name: 'Fasting Blood Sugar', status: 'completed', result: '195 mg/dL' },
        { name: 'Lipid Profile', status: 'completed', result: 'LDL 142 mg/dL' },
      ],
      patient_insights: {
        medication_guide: [
          { name: 'Metformin 500mg', what: 'Diabetes tablet', why: 'To lower blood sugar', when: 'After breakfast and dinner', caution: 'Take with food' },
          { name: 'Amlodipine 5mg', what: 'BP tablet', why: 'Your blood pressure is slightly high (140/90)', when: 'Every morning', caution: 'May cause swelling' },
        ],
        test_guide: [],
        health_summary: 'Newly diagnosed with Type 2 Diabetes. Blood sugar and BP slightly elevated. Started on basic medications with lifestyle changes.',
        dos_and_donts: { do: ['Exercise 30 min daily', 'Reduce sugar and rice intake'], dont: ['Avoid sugary drinks', 'Do not skip meals'] },
      },
    },
  },

  // ---- Rx 3: Migraine follow-up (3 months ago) ----
  {
    prescription_id: 'RX-DEMO-003',
    status: 'approved',
    doctor_id: 'DOC-SYSTEM-002',
    report_type: 'prescription',
    created_at: daysAgo(90),
    reviewed_at: daysAgo(89),
    admin_id: 'ADM-SYSTEM-001',
    s3_key: 'demo/rx_migraine_followup.jpg',
    image_url: null,
    extracted_data: {
      doctor_name: 'Dr. Priya Sen',
      patient_id: 'PID-DEMO01',
      patient_name: 'Suvam Paul',
      patient_age: '28',
      patient_gender: 'Male',
      prescription_date: daysAgo(90).split('T')[0],
      diagnosis: 'Chronic Migraine with Aura (6-8 episodes/month), Tension-type headache overlay',
      extraction_confidence: 0.88,
      report_type: 'prescription',
      notes: 'Migraine frequency increasing. MRI normal. Starting prophylaxis with Topiramate. Continue acute treatment with Sumatriptan.',
      medications: [
        { name: 'Topiramate', strength: '25mg', form: 'Tablet', frequency: 'Once daily (bedtime)', duration: '30 days', instructions: 'Increase to 50mg after 2 weeks if tolerated.', purpose: 'Migraine prevention' },
        { name: 'Sumatriptan', strength: '50mg', form: 'Tablet', frequency: 'PRN for migraine', duration: '30 days', instructions: 'Take at first sign of aura.', purpose: 'Acute migraine relief' },
      ],
      tests: [
        { name: 'Brain MRI', status: 'completed', result: 'Normal — no structural abnormality' },
      ],
      patient_insights: {
        medication_guide: [
          { name: 'Topiramate 25mg', what: 'Migraine prevention tablet', why: 'You are getting 6-8 migraines per month', when: 'Bedtime — will increase dose later', caution: 'May tingle. Drink water.' },
          { name: 'Sumatriptan 50mg', what: 'Migraine rescue tablet', why: 'Stops migraine quickly', when: 'When migraine starts', caution: 'Max 2 per day. Not for daily use.' },
        ],
        test_guide: [],
        health_summary: 'Chronic migraine with increasing frequency. Brain MRI normal. Starting preventive treatment.',
        dos_and_donts: { do: ['Keep a headache diary', 'Sleep 7-8 hours'], dont: ['Avoid bright screens at night', 'Do not overuse pain killers'] },
      },
    },
  },
];

// ---- Pending prescription for Admin review ----
const MOCK_PENDING_PRESCRIPTION = {
  prescription_id: 'RX-DEMO-PENDING-001',
  status: 'pending_admin_review',
  doctor_id: 'DOC-SYSTEM-001',
  report_type: 'prescription',
  created_at: hoursAgo(3),
  s3_key: 'demo/rx_pending_review.jpg',
  image_url: null,
  extracted_data: {
    doctor_name: 'Dr. Anirban Mukherjee',
    patient_id: 'PID-DEMO01',
    patient_name: 'Suvam Paul',
    patient_age: '28',
    patient_gender: 'Male',
    prescription_date: new Date().toISOString().split('T')[0],
    diagnosis: 'Type 2 DM (follow-up), Hypertension — dosage adjustment',
    extraction_confidence: 0.87,
    report_type: 'prescription',
    notes: 'HbA1c improving (8.5% → 7.9%). Reduce Insulin Glargine to 14 units. Continue Metformin 1000mg. BP stable at 135/85.',
    medications: [
      { name: 'Metformin', strength: '1000mg', form: 'Tablet', frequency: 'Twice daily', duration: '90 days', instructions: 'After meals' },
      { name: 'Insulin Glargine', strength: '14 units', form: 'Injection', frequency: 'Once daily (bedtime)', duration: '90 days', instructions: 'Reduced from 18 units' },
      { name: 'Amlodipine', strength: '10mg', form: 'Tablet', frequency: 'Once daily', duration: '90 days', instructions: 'Morning' },
      { name: 'Telmisartan', strength: '80mg', form: 'Tablet', frequency: 'Once daily', duration: '90 days', instructions: 'Evening' },
    ],
    tests: [
      { name: 'HbA1c', status: 'completed', result: '7.9%' },
      { name: 'Fasting Blood Sugar', status: 'completed', result: '148 mg/dL' },
    ],
  },
};

// ---------------------------------------------------------------------------
// DISCHARGE HISTORY — emergency admission scenario
// ---------------------------------------------------------------------------
const MOCK_DISCHARGE_HISTORY = [
  {
    id: 'DIS-DEMO-001',
    created_at: daysAgo(2),
    risk_score: 82,
    risk_level: 'high',
    simplified_english: 'You were admitted to the Emergency Room because your blood pressure shot up to 200/120 mmHg — this is called a Hypertensive Emergency and is very dangerous. It can cause stroke, heart failure, or kidney damage if not treated immediately.\n\nIn the ER, you received IV Labetalol (a strong blood pressure medicine through drip) to bring your BP down slowly and safely. Over 6 hours, your BP came down to 150/95.\n\nYour blood sugar was also very high (285 mg/dL) because your diabetes was not well-controlled. Your HbA1c test (which shows 3-month average sugar) was 9.8% — the target is below 7%.\n\nYour heart ECG showed thickening of the heart muscle (Left Ventricular Hypertrophy) which happens when BP stays high for a long time.\n\nYou are being sent home with 7 medications. It is VERY important to take all of them exactly as prescribed and check your BP and sugar every day.',
    simplified_bengali: 'আপনাকে ইমার্জেন্সিতে ভর্তি করা হয়েছিল কারণ আপনার রক্তচাপ ২০০/১২০ mmHg-এ উঠে গিয়েছিল — এটাকে হাইপারটেনসিভ ইমার্জেন্সি বলে এবং এটা খুবই বিপজ্জনক। চিকিৎসা না করলে স্ট্রোক, হার্ট ফেইলিওর বা কিডনি ক্ষতি হতে পারে।\n\nইমার্জেন্সিতে আপনাকে শিরায় Labetalol (ড্রিপের মাধ্যমে শক্তিশালী রক্তচাপের ওষুধ) দেওয়া হয়েছিল। ৬ ঘণ্টায় আপনার রক্তচাপ ১৫০/৯৫-এ নেমে আসে।\n\nআপনার রক্তে শর্করাও অনেক বেশি ছিল (২৮৫ mg/dL) কারণ আপনার ডায়াবেটিস নিয়ন্ত্রণে ছিল না। HbA1c পরীক্ষা ছিল ৯.৮% — লক্ষ্যমাত্রা ৭%-এর নিচে।\n\nআপনার ECG-তে হার্টের পেশী মোটা হওয়া দেখা গেছে (Left Ventricular Hypertrophy) যা দীর্ঘদিন উচ্চ রক্তচাপের কারণে হয়।\n\nআপনাকে ৭টি ওষুধ দিয়ে বাড়ি পাঠানো হচ্ছে। প্রতিটি ওষুধ ঠিকমতো খাওয়া এবং প্রতিদিন রক্তচাপ ও রক্তে শর্করা পরীক্ষা করা অত্যন্ত জরুরি।',
    medications: [
      'Amlodipine 10mg — Morning (BP control)',
      'Telmisartan 80mg — Evening (BP + kidney protection)',
      'Metformin 1000mg — After breakfast & dinner (diabetes)',
      'Insulin Glargine 18 units — Bedtime injection (diabetes)',
      'Topiramate 50mg — Morning & night (migraine prevention)',
      'Sumatriptan 50mg — Only during migraine attack',
      'Atorvastatin 20mg — Bedtime (cholesterol)',
    ],
    follow_up: 'Follow-up with Dr. Anirban Mukherjee in 5 days. Bring BP and sugar logs.',
    warning_signs: [
      'BP above 180/110 or below 90/60',
      'Severe headache with vision changes',
      'Blood sugar above 400 or below 60 mg/dL',
      'Chest pain, breathlessness, or arm/jaw pain',
      'Sudden weakness on one side of body (stroke sign)',
      'Swelling of face, hands, or feet',
      'Confusion, excessive drowsiness, or fainting',
    ],
    comprehension_questions: [
      { question: 'What is your target blood pressure?', answer: 'Below 130/80 mmHg' },
      { question: 'How many medications are you taking?', answer: '7 medications daily' },
      { question: 'When should you call emergency?', answer: 'If BP goes above 180/110 or below 90/60, or if I get chest pain or sudden weakness' },
      { question: 'What is your HbA1c target?', answer: 'Below 7%' },
    ],
    share_token: 'DEMO-SHARE-TOKEN-001',
  },
  {
    id: 'DIS-DEMO-002',
    created_at: daysAgo(90),
    risk_score: 42,
    risk_level: 'moderate',
    simplified_english: 'Follow-up visit for chronic migraine. MRI scan came back normal. Starting new preventive medication (Topiramate). Blood sugar and BP remain slightly above target.',
    simplified_bengali: 'দীর্ঘস্থায়ী মাইগ্রেনের জন্য ফলো-আপ ভিজিট। MRI স্ক্যান স্বাভাবিক এসেছে। নতুন প্রতিরোধমূলক ওষুধ (Topiramate) শুরু করা হচ্ছে।',
    medications: [
      'Topiramate 25mg — Bedtime (migraine prevention)',
      'Sumatriptan 50mg — During migraine only',
    ],
    follow_up: 'Follow-up in 4 weeks to assess migraine frequency.',
    warning_signs: ['Sudden worst headache of your life', 'Vision loss', 'Numbness or weakness'],
    comprehension_questions: [],
    share_token: 'DEMO-SHARE-TOKEN-002',
  },
];

// ---------------------------------------------------------------------------
// DATA CHUNKS — medication, routine, explanation, faq_context
// ---------------------------------------------------------------------------
const MOCK_CHUNKS = {
  medication: [
    {
      chunk_id: 'CHK-MED-001',
      prescription_id: 'RX-DEMO-001',
      patient_id: 'PID-DEMO01',
      chunk_type: 'medication',
      version: 1,
      created_at: daysAgo(2),
      data: {
        medications: [
          {
            name: 'Amlodipine',
            strength: '10mg',
            form: 'Tablet',
            frequency: 'Once daily (morning)',
            duration: '90 days',
            instructions: 'Take on empty stomach. Monitor BP daily.',
            purpose: 'Blood pressure control',
            schedule: { morning: true, afternoon: false, evening: false, night: false },
            warnings: 'May cause ankle swelling',
          },
          {
            name: 'Telmisartan',
            strength: '80mg',
            form: 'Tablet',
            frequency: 'Once daily (evening)',
            duration: '90 days',
            instructions: 'Take at the same time every evening.',
            purpose: 'BP and kidney protection',
            schedule: { morning: false, afternoon: false, evening: true, night: false },
            warnings: 'Avoid potassium supplements',
          },
          {
            name: 'Metformin',
            strength: '1000mg',
            form: 'Tablet',
            frequency: 'Twice daily (after breakfast & dinner)',
            duration: '90 days',
            instructions: 'Take after meals.',
            purpose: 'Diabetes management',
            schedule: { morning: true, afternoon: false, evening: false, night: true },
            warnings: 'No alcohol. Stop if severe GI upset.',
          },
          {
            name: 'Insulin Glargine',
            strength: '18 units',
            form: 'Injection',
            frequency: 'Once daily (bedtime)',
            duration: '90 days',
            instructions: 'Inject subcutaneously. Rotate sites.',
            purpose: 'Basal insulin for overnight sugar control',
            schedule: { morning: false, afternoon: false, evening: false, night: true },
            warnings: 'Check sugar before injecting',
          },
          {
            name: 'Topiramate',
            strength: '50mg',
            form: 'Tablet',
            frequency: 'Twice daily',
            duration: '60 days',
            instructions: 'Drink plenty of water.',
            purpose: 'Migraine prevention',
            schedule: { morning: true, afternoon: false, evening: false, night: true },
            warnings: 'May cause tingling',
          },
          {
            name: 'Sumatriptan',
            strength: '50mg',
            form: 'Tablet',
            frequency: 'As needed',
            duration: '30 days',
            instructions: 'Take at first sign of migraine. Max 2/day.',
            purpose: 'Acute migraine relief',
            schedule: { morning: false, afternoon: false, evening: false, night: false },
            warnings: 'Skip if BP is high. Max 10 days/month.',
          },
          {
            name: 'Atorvastatin',
            strength: '20mg',
            form: 'Tablet',
            frequency: 'Once daily (bedtime)',
            duration: '90 days',
            instructions: 'Take at night.',
            purpose: 'Cholesterol control',
            schedule: { morning: false, afternoon: false, evening: false, night: true },
            warnings: 'Report muscle pain',
          },
        ],
      },
    },
  ],
  routine: [
    {
      chunk_id: 'CHK-ROU-001',
      prescription_id: 'RX-DEMO-001',
      patient_id: 'PID-DEMO01',
      chunk_type: 'routine',
      version: 1,
      created_at: daysAgo(2),
      data: {
        steps: [
          { time: '6:30 AM', activity: 'Wake up — Check fasting blood sugar with glucometer', icon: 'glucose', priority: 'critical' },
          { time: '6:45 AM', activity: 'Check blood pressure (sit quietly for 5 min before measuring)', icon: 'monitor_heart', priority: 'critical' },
          { time: '7:00 AM', activity: 'Take Amlodipine 10mg + Topiramate 50mg + Metformin 1000mg (after breakfast)', icon: 'medication', priority: 'critical' },
          { time: '7:30 AM', activity: 'Breakfast — Low salt, low sugar, high fiber (oats, eggs, vegetables)', icon: 'restaurant', priority: 'high' },
          { time: '8:00 AM', activity: 'Gentle walk for 20-30 minutes (avoid strenuous exercise)', icon: 'directions_walk', priority: 'high' },
          { time: '10:00 AM', activity: 'Small mid-morning snack (handful of nuts, fruit)', icon: 'lunch_dining', priority: 'moderate' },
          { time: '1:00 PM', activity: 'Lunch — Balanced meal, limited rice, plenty of vegetables', icon: 'restaurant', priority: 'high' },
          { time: '3:30 PM', activity: 'Light snack + hydration check (aim 2-3L water/day)', icon: 'water_drop', priority: 'moderate' },
          { time: '5:00 PM', activity: 'Check blood pressure (evening reading)', icon: 'monitor_heart', priority: 'critical' },
          { time: '6:00 PM', activity: 'Take Telmisartan 80mg', icon: 'medication', priority: 'critical' },
          { time: '7:30 PM', activity: 'Dinner — Light, low-salt meal. Take Metformin 1000mg after eating', icon: 'restaurant', priority: 'high' },
          { time: '9:30 PM', activity: 'Take Topiramate 50mg + Atorvastatin 20mg', icon: 'medication', priority: 'critical' },
          { time: '10:00 PM', activity: 'Check blood sugar. Inject Insulin Glargine 18 units', icon: 'vaccines', priority: 'critical' },
          { time: '10:30 PM', activity: 'Sleep — Aim for 7-8 hours. Keep glucose candy near bed', icon: 'bedtime', priority: 'high' },
        ],
      },
    },
  ],
  explanation: [
    {
      chunk_id: 'CHK-EXP-001',
      prescription_id: 'RX-DEMO-001',
      patient_id: 'PID-DEMO01',
      chunk_type: 'explanation',
      version: 1,
      created_at: daysAgo(2),
      data: {
        explanations: [
          {
            topic: 'What is a Hypertensive Emergency?',
            explanation: 'A hypertensive emergency is when blood pressure rises to extremely dangerous levels (above 180/120 mmHg). At 200/120, your blood vessels are under enormous strain. Without immediate treatment, this can cause stroke (brain bleeding), heart failure, kidney shutdown, or vision loss. You received IV medication in the ER to slowly bring the pressure down — it must be lowered gradually to avoid complications.',
          },
          {
            topic: 'Why is HbA1c 9.8% Dangerous?',
            explanation: 'HbA1c measures your average blood sugar over 3 months. A reading of 9.8% means your blood sugar has been critically high, averaging around 240 mg/dL. Normal is below 5.7%, diabetic target is below 7%. At 9.8%, sugar is damaging your blood vessels, nerves, kidneys, and eyes every single day. This is why you now need insulin in addition to oral tablets.',
          },
          {
            topic: 'What is Left Ventricular Hypertrophy (LVH)?',
            explanation: 'Your ECG showed that the left side of your heart muscle has become thicker than normal. This happens because your heart has been pumping against very high blood pressure for months/years — like lifting heavy weights continuously. The thickened muscle becomes stiff and less efficient at pumping. Controlling your BP is essential to prevent this from worsening into heart failure.',
          },
          {
            topic: 'Why Two Blood Pressure Medicines?',
            explanation: 'With BP at 200/120, a single medication is not enough. Amlodipine (calcium channel blocker) relaxes blood vessels, while Telmisartan (ARB) works on the hormonal system that controls BP. Together, they attack high BP from two different angles and also protect your kidneys — which is important because diabetes can damage kidneys too.',
          },
          {
            topic: 'Migraine and High Blood Pressure Connection',
            explanation: 'High blood pressure can trigger or worsen migraines. When BP spikes, it increases pressure inside your skull, making migraines more frequent and severe. Some migraine medications (like Sumatriptan) can temporarily raise BP, which is why you must NOT use Sumatriptan when your BP is very high. Topiramate (preventive) is actually BP-neutral and safe.',
          },
        ],
      },
    },
  ],
  faq_context: [
    {
      chunk_id: 'CHK-FAQ-001',
      prescription_id: 'RX-DEMO-001',
      patient_id: 'PID-DEMO01',
      chunk_type: 'faq_context',
      version: 1,
      created_at: daysAgo(2),
      data: {
        faqs: [
          { q: 'Can I eat rice?', a: 'Yes, but limit to one small cup per meal. Choose brown rice over white rice. Rice raises blood sugar quickly.' },
          { q: 'Can I exercise?', a: 'Gentle walking after meals is recommended. Avoid heavy exercise or gym until BP is consistently below 140/90. No exercise during a migraine.' },
          { q: 'What if I forget a medicine?', a: 'Take it as soon as you remember — unless it is almost time for the next dose. Never double-dose. For insulin, if you miss bedtime, take it within 4 hours; otherwise skip that night and take next day.' },
          { q: 'Can I eat sweets or mishti?', a: 'Strictly avoid. Your blood sugar is dangerously high (HbA1c 9.8%). Even small amounts of sweets can spike it further. Try sugar-free alternatives if needed.' },
          { q: 'When should I go to ER?', a: 'Go immediately if: BP > 180/110, sugar > 400 or < 60, chest pain, sudden severe headache, weakness on one side, difficulty speaking, or if you faint.' },
          { q: 'Can I take paracetamol for headache?', a: 'Yes, paracetamol (Crocin) is safe. But for migraine attacks, use Sumatriptan. Do not use Aspirin or Ibuprofen regularly — they can interact with your BP medicines.' },
        ],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Chart data for analytics components
// ---------------------------------------------------------------------------
export const MOCK_VITAL_SIGNS = {
  labels: ['Day 1 (ER)', 'Day 1 (6h)', 'Day 2 AM', 'Day 2 PM', 'Day 3 AM', 'Day 3 PM', 'Day 4', 'Day 5'],
  heartRate: [112, 98, 88, 84, 82, 78, 76, 74],
  bloodPressure: {
    systolic: [200, 168, 155, 148, 142, 138, 135, 132],
    diastolic: [120, 102, 95, 92, 88, 86, 85, 82],
  },
  bloodSugar: [285, 245, 210, 188, 165, 152, 148, 140],
};

export const MOCK_READMISSION_RISK = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
  risk: [82, 68, 55, 45, 38, 30],
};

export const MOCK_COMPREHENSION_SCORES = {
  labels: ['Medications', 'Warning Signs', 'Daily Routine', 'Diet Plan', 'When to Call ER'],
  scores: [75, 90, 60, 55, 85],
};

// ---------------------------------------------------------------------------
// Doctor panel mock data
// ---------------------------------------------------------------------------
export const MOCK_DOCTOR_PATIENT_LIST = [
  {
    id: 'user-demo-patient-001',
    full_name: 'Suvam Paul',
    email: 'patient@gmail.com',
    pid: 'PID-DEMO01',
    phone: '+91-9876543210',
    role: 'patient',
    created_at: daysAgo(180),
  },
  {
    id: 'user-demo-patient-002',
    full_name: 'Rina Dey',
    email: 'rina.dey@example.com',
    pid: 'PID-DEMO02',
    phone: '+91-9876543211',
    role: 'patient',
    created_at: daysAgo(120),
  },
  {
    id: 'user-demo-patient-003',
    full_name: 'Amit Ghosh',
    email: 'amit.ghosh@example.com',
    pid: 'PID-DEMO03',
    phone: '+91-9876543212',
    role: 'patient',
    created_at: daysAgo(60),
  },
];

export const MOCK_DOCTOR_HISTORY = [
  ...MOCK_PRESCRIPTIONS,
  {
    prescription_id: 'RX-DEMO-DOC-004',
    status: 'approved',
    doctor_id: 'DOC-SYSTEM-001',
    report_type: 'prescription',
    created_at: daysAgo(45),
    reviewed_at: daysAgo(44),
    extracted_data: {
      doctor_name: 'Dr. Anirban Mukherjee',
      patient_id: 'PID-DEMO02',
      patient_name: 'Rina Dey',
      patient_age: '45',
      patient_gender: 'Female',
      diagnosis: 'Hypothyroidism, Vitamin D Deficiency',
      extraction_confidence: 0.92,
      medications: [
        { name: 'Levothyroxine', strength: '75mcg', form: 'Tablet', frequency: 'Once daily (empty stomach)', duration: '90 days' },
        { name: 'Cholecalciferol', strength: '60000 IU', form: 'Sachet', frequency: 'Once weekly', duration: '8 weeks' },
      ],
    },
  },
  {
    prescription_id: 'RX-DEMO-DOC-005',
    status: 'approved',
    doctor_id: 'DOC-SYSTEM-001',
    report_type: 'prescription',
    created_at: daysAgo(30),
    reviewed_at: daysAgo(29),
    extracted_data: {
      doctor_name: 'Dr. Anirban Mukherjee',
      patient_id: 'PID-DEMO03',
      patient_name: 'Amit Ghosh',
      patient_age: '55',
      patient_gender: 'Male',
      diagnosis: 'Osteoarthritis (Knee), GERD',
      extraction_confidence: 0.89,
      medications: [
        { name: 'Diclofenac', strength: '50mg', form: 'Tablet', frequency: 'Twice daily', duration: '14 days' },
        { name: 'Pantoprazole', strength: '40mg', form: 'Tablet', frequency: 'Once daily (before breakfast)', duration: '30 days' },
      ],
    },
  },
];

export const MOCK_DOCTOR_PENDING_REVIEWS = [
  {
    id: MOCK_PENDING_PRESCRIPTION.prescription_id,
    patientId: MOCK_PENDING_PRESCRIPTION.extracted_data.patient_id,
    doctorId: MOCK_PENDING_PRESCRIPTION.doctor_id,
    priority: 'Medium',
    summary: MOCK_PENDING_PRESCRIPTION.extracted_data.diagnosis,
    submittedAt: new Date(MOCK_PENDING_PRESCRIPTION.created_at).toLocaleString(),
  },
];

// ---------------------------------------------------------------------------
// Admin panel mock data — all prescriptions combined
// ---------------------------------------------------------------------------
export const MOCK_ADMIN_ALL_RECORDS = [
  ...MOCK_PRESCRIPTIONS,
  MOCK_PENDING_PRESCRIPTION,
  ...MOCK_DOCTOR_HISTORY.filter(r => !MOCK_PRESCRIPTIONS.some(p => p.prescription_id === r.prescription_id)),
];

export const MOCK_ADMIN_PENDING = [MOCK_PENDING_PRESCRIPTION];

// ---------------------------------------------------------------------------
// Public getters — to be called from dashboard pages
// ---------------------------------------------------------------------------
export function getMockPrescriptions() {
  return [...MOCK_PRESCRIPTIONS];
}

export function getMockDischargeHistory() {
  return [...MOCK_DISCHARGE_HISTORY];
}

export function getMockChunksByType(type) {
  return MOCK_CHUNKS[type] ? [...MOCK_CHUNKS[type]] : [];
}

export function getMockAllChunks() {
  return { ...MOCK_CHUNKS };
}

export function getMockPendingPrescription() {
  return { ...MOCK_PENDING_PRESCRIPTION };
}

export function getMockDoctorPatientList() {
  return [...MOCK_DOCTOR_PATIENT_LIST];
}

export function getMockDoctorHistory() {
  return [...MOCK_DOCTOR_HISTORY];
}

export function getMockDoctorPendingReviews() {
  return [...MOCK_DOCTOR_PENDING_REVIEWS];
}

export function getMockAdminAllRecords() {
  return [...MOCK_ADMIN_ALL_RECORDS];
}

export function getMockAdminPending() {
  return [...MOCK_ADMIN_PENDING];
}
