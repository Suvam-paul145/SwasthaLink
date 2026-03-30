/**
 * SwasthaLink API Service
 * Handles all API communications with the backend
 * Uses native fetch API for HTTP requests
 */

import {
  API_BASE_URL,
  API_ENDPOINTS,
  REQUEST_TIMEOUT,
  DEFAULT_HEADERS,
  ERROR_MESSAGES,
} from '../utils/config';

/**
 * Custom API Error class for better error handling
 */
export class APIError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Fetch with timeout wrapper
 */
const fetchWithTimeout = async (url, options = {}, timeout = REQUEST_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new APIError(ERROR_MESSAGES.TIMEOUT_ERROR, 408);
    }
    throw error;
  }
};

/**
 * Handle API response and errors
 */
const handleResponse = async (response) => {
  // Check if response is ok
  if (!response.ok) {
    let errorMessage = ERROR_MESSAGES.SERVER_ERROR;
    let errorDetails = null;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.detail || errorMessage;
      errorDetails = errorData;
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new APIError(errorMessage, response.status, errorDetails);
  }

  // Parse JSON response
  try {
    return await response.json();
  } catch (e) {
    throw new APIError('Invalid response from server', 500);
  }
};

/**
 * Make API request with error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const requestHeaders = {
    ...DEFAULT_HEADERS,
    ...(options.headers || {}),
  };

  // FormData must not send a JSON content type.
  if (options.body instanceof FormData) {
    delete requestHeaders['Content-Type'];
  }

  const defaultOptions = {
    headers: requestHeaders,
  };

  try {
    const response = await fetchWithTimeout(url, {
      ...defaultOptions,
      ...options,
    });

    return await handleResponse(response);
  } catch (error) {
    // Handle network errors
    if (error instanceof APIError) {
      throw error;
    }

    if (error.message === 'Failed to fetch') {
      throw new APIError(ERROR_MESSAGES.NETWORK_ERROR, 0);
    }

    throw new APIError(ERROR_MESSAGES.UNKNOWN_ERROR, 500, { originalError: error.message });
  }
};

const DEMO_PRESCRIPTION_STORE_KEY = 'swasthalink_demo_prescription_store_v1';
let demoStoreMemoryFallback = null;

const DEMO_MEDICATION_TEMPLATES = [
  [
    {
      name: 'Aspirin',
      strength: '75mg',
      form: 'Tab',
      frequency: 'OD',
      duration: '30 days',
      instructions: 'After breakfast',
    },
    {
      name: 'Atorvastatin',
      strength: '20mg',
      form: 'Tab',
      frequency: 'HS',
      duration: '30 days',
      instructions: 'After dinner',
    },
  ],
  [
    {
      name: 'Metformin',
      strength: '500mg',
      form: 'Tab',
      frequency: 'BD',
      duration: '30 days',
      instructions: 'After food',
    },
    {
      name: 'Pantoprazole',
      strength: '40mg',
      form: 'Tab',
      frequency: 'OD',
      duration: '15 days',
      instructions: 'Before breakfast',
    },
  ],
  [
    {
      name: 'Telmisartan',
      strength: '40mg',
      form: 'Tab',
      frequency: 'OD',
      duration: '30 days',
      instructions: 'Morning dose',
    },
    {
      name: 'Vitamin D3',
      strength: '60000 IU',
      form: 'Cap',
      frequency: 'Weekly',
      duration: '6 weeks',
      instructions: 'After lunch',
    },
  ],
];

const DEMO_AUTH_USERS = [
  {
    id: 'demo-patient-1007',
    name: 'Rahat Karim',
    email: 'patient@swasthalink.demo',
    password: 'Patient@123',
    role: 'patient',
  },
  {
    id: 'demo-doctor-004',
    name: 'Dr. Nusrat Jahan',
    email: 'doctor@swasthalink.demo',
    password: 'Doctor@123',
    role: 'doctor',
  },
  {
    id: 'demo-admin-001',
    name: 'Afiya Rahman',
    email: 'admin@swasthalink.demo',
    password: 'Admin@123',
    role: 'admin',
  },
];

const supportsLocalStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const saveDemoStore = (records) => {
  if (supportsLocalStorage()) {
    window.localStorage.setItem(DEMO_PRESCRIPTION_STORE_KEY, JSON.stringify(records));
    return;
  }
  demoStoreMemoryFallback = records;
};

const seedDemoRecords = () => {
  const now = Date.now();
  return [
    {
      prescription_id: 'demo-rx-seed-1007',
      status: 'pending_admin_review',
      doctor_id: 'DR-004',
      extracted_data: {
        doctor_name: 'Dr. Nusrat Jahan',
        patient_id: 'PT-1007',
        patient_name: 'Rahat Karim',
        patient_age: '54/M',
        patient_gender: 'Male',
        prescription_date: '2026-03-29',
        medications: DEMO_MEDICATION_TEMPLATES[0],
        diagnosis: 'Post-angioplasty follow-up',
        notes: 'Check BP twice daily and avoid extra salt.',
        extraction_confidence: 0.86,
      },
      s3_key: null,
      created_at: new Date(now - 1000 * 60 * 90).toISOString(),
      admin_id: null,
      reviewed_at: null,
      rejection_reason: null,
    },
    {
      prescription_id: 'demo-rx-seed-1008',
      status: 'pending_admin_review',
      doctor_id: 'DR-011',
      extracted_data: {
        doctor_name: 'Dr. Tania Rahman',
        patient_id: 'PT-1008',
        patient_name: 'Fatima Akter',
        patient_age: '46/F',
        patient_gender: 'Female',
        prescription_date: '2026-03-29',
        medications: DEMO_MEDICATION_TEMPLATES[1],
        diagnosis: 'Type 2 diabetes follow-up',
        notes: 'Record fasting sugar in a daily log book.',
        extraction_confidence: 0.82,
      },
      s3_key: null,
      created_at: new Date(now - 1000 * 60 * 45).toISOString(),
      admin_id: null,
      reviewed_at: null,
      rejection_reason: null,
    },
  ];
};

const loadDemoStore = () => {
  if (supportsLocalStorage()) {
    const raw = window.localStorage.getItem(DEMO_PRESCRIPTION_STORE_KEY);
    if (!raw) {
      const seeded = seedDemoRecords();
      saveDemoStore(seeded);
      return seeded;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // If parsing fails, reset to seed data.
    }

    const seeded = seedDemoRecords();
    saveDemoStore(seeded);
    return seeded;
  }

  if (!Array.isArray(demoStoreMemoryFallback)) {
    demoStoreMemoryFallback = seedDemoRecords();
  }

  return demoStoreMemoryFallback;
};

const shouldUseDemoFallback = (error) => {
  const status = error?.statusCode ?? error?.status ?? 0;
  return status === 0 || status === 408 || status >= 500;
};

const isDemoPrescriptionId = (prescriptionId) =>
  typeof prescriptionId === 'string' && prescriptionId.startsWith('demo-rx-');

const sanitizePersonName = (value, fallback) => (value && value.trim() ? value.trim() : fallback);

const authenticateDemoLogin = ({ role, email, password }) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return DEMO_AUTH_USERS.find(
    (item) =>
      item.role === role &&
      item.email.toLowerCase() === normalizedEmail &&
      item.password === password
  );
};

const buildDemoPrescriptionRecord = (file, doctorId, context = {}) => {
  const medicationIndex = Math.floor(Math.random() * DEMO_MEDICATION_TEMPLATES.length);
  const now = new Date();
  const extractedData = {
    doctor_name: sanitizePersonName(context.doctorName, `Dr. Demo Physician (${doctorId})`),
    patient_id: sanitizePersonName(context.patientId, `PT-${Math.floor(1000 + Math.random() * 9000)}`),
    patient_name: sanitizePersonName(context.patientName, 'Demo Patient'),
    patient_age: sanitizePersonName(context.patientAge, '48 years'),
    patient_gender: sanitizePersonName(context.patientGender, 'Unknown'),
    prescription_date: now.toISOString().slice(0, 10),
    medications: DEMO_MEDICATION_TEMPLATES[medicationIndex],
    diagnosis: sanitizePersonName(context.diagnosis, 'General follow-up'),
    notes: `Demo extraction generated from ${file.name}. Please verify clinically before use.`,
    extraction_confidence: 0.79,
  };

  return {
    prescription_id: `demo-rx-${Date.now()}`,
    status: 'pending_admin_review',
    doctor_id: doctorId,
    extracted_data: extractedData,
    s3_key: null,
    created_at: now.toISOString(),
    admin_id: null,
    reviewed_at: null,
    rejection_reason: null,
  };
};

const insertDemoRecord = (record) => {
  const records = loadDemoStore();
  const updated = [record, ...records];
  saveDemoStore(updated);
  return record;
};

const findAndUpdateDemoRecord = (prescriptionId, updater) => {
  const records = loadDemoStore();
  let updatedRecord = null;

  const nextRecords = records.map((record) => {
    if (record.prescription_id !== prescriptionId) {
      return record;
    }
    updatedRecord = updater(record);
    return updatedRecord;
  });

  if (!updatedRecord) {
    return null;
  }

  saveDemoStore(nextRecords);
  return updatedRecord;
};

const getDemoPendingResponse = () => {
  const pending = loadDemoStore().filter((record) => record.status === 'pending_admin_review');
  return {
    count: pending.length,
    items: pending,
    demo_mode: true,
  };
};

/**
 * API Service Methods
 */
const api = {
  /**
   * Login with role, email and password.
   * @param {Object} data - Login request data
   * @param {string} data.role - User role ('patient' | 'doctor' | 'admin')
   * @param {string} data.email - Email address
   * @param {string} data.password - Password
   * @returns {Promise<Object>} Auth response with user profile
   */
  login: async (data) => {
    try {
      return await apiRequest(API_ENDPOINTS.AUTH_LOGIN, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }

      const matchedDemoUser = authenticateDemoLogin(data);
      if (!matchedDemoUser) {
        throw new APIError('Invalid email, password, or role', 401);
      }

      return {
        success: true,
        message: 'Demo login successful',
        user: {
          id: matchedDemoUser.id,
          name: matchedDemoUser.name,
          email: matchedDemoUser.email,
          role: matchedDemoUser.role,
        },
        access_token: `demo-token-${matchedDemoUser.id}`,
        is_demo: true,
      };
    }
  },

  /**
   * Process discharge summary
   * @param {Object} data - Request data
   * @param {string} data.discharge_text - Clinical discharge summary text
   * @param {string} data.role - Target audience ('patient', 'caregiver', 'elderly')
   * @param {string} data.language - Output language ('en', 'bn', 'both')
   * @param {boolean} data.re_explain - Trigger simpler re-explanation
   * @param {string} data.previous_simplified - Previous simplified text
   * @returns {Promise<Object>} Simplified summary with medications, quiz, etc.
   */
  processSummary: async (data) => {
    return apiRequest(API_ENDPOINTS.PROCESS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Send WhatsApp message
   * @param {Object} data - Request data
   * @param {string} data.phone_number - Phone number in E.164 format
   * @param {string} data.message - Message content
   * @returns {Promise<Object>} Delivery status
   */
  sendWhatsApp: async (data) => {
    return apiRequest(API_ENDPOINTS.SEND_WHATSAPP, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Submit quiz answers
   * @param {Object} data - Request data
   * @param {string} data.session_id - Session ID
   * @param {Array<string>} data.answers - User answers
   * @param {Array<string>} data.correct_answers - Correct answers
   * @returns {Promise<Object>} Quiz score and feedback
   */
  submitQuiz: async (data) => {
    return apiRequest(API_ENDPOINTS.SUBMIT_QUIZ, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Upload file for OCR extraction
   * @param {File} file - File to upload
   * @param {string} sessionId - Session ID (optional)
   * @returns {Promise<Object>} Extracted text
   */
  uploadFile: async (file, sessionId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    return apiRequest(API_ENDPOINTS.UPLOAD, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for multipart/form-data
    });
  },

  /**
   * Check API health
   * @returns {Promise<Object>} Health status
   */
  checkHealth: async () => {
    return apiRequest(API_ENDPOINTS.HEALTH, {
      method: 'GET',
    });
  },

  /**
   * Get session count
   * @returns {Promise<Object>} Total sessions count
   */
  getSessionCount: async () => {
    return apiRequest(API_ENDPOINTS.SESSION_COUNT, {
      method: 'GET',
    });
  },

  /**
   * Get analytics data
   * @returns {Promise<Object>} Analytics summary
   */
  getAnalytics: async () => {
    return apiRequest(API_ENDPOINTS.ANALYTICS, {
      method: 'GET',
    });
  },

  /**
   * Get WhatsApp sandbox instructions
   * @returns {Promise<Object>} Sandbox setup instructions
   */
  getSandboxInstructions: async () => {
    return apiRequest(API_ENDPOINTS.SANDBOX_INSTRUCTIONS, {
      method: 'GET',
    });
  },

  // -------------------------------------------------------------------------
  // Prescription RAG pipeline
  // -------------------------------------------------------------------------

  /**
   * Upload a handwritten prescription and trigger RAG extraction.
   * @param {File} file - Prescription image or PDF
   * @param {string} doctorId - ID of the uploading doctor
   * @param {Object} context - Optional context for demo-mode extraction
   * @returns {Promise<Object>} Extracted prescription data + record ID
   */
  extractPrescription: async (file, doctorId, context = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doctor_id', doctorId);
    try {
      return await apiRequest(API_ENDPOINTS.PRESCRIPTION_EXTRACT, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }

      const demoRecord = buildDemoPrescriptionRecord(file, doctorId, context);
      insertDemoRecord(demoRecord);
      return {
        prescription_id: demoRecord.prescription_id,
        status: demoRecord.status,
        extracted_data: demoRecord.extracted_data,
        message: 'Demo extraction completed and queued for admin review',
        demo_mode: true,
      };
    }
  },

  /**
   * Fetch all prescriptions pending admin review.
   * @returns {Promise<Object>} { count, items }
   */
  getPendingPrescriptions: async () => {
    try {
      const liveData = await apiRequest(API_ENDPOINTS.PRESCRIPTIONS_PENDING, {
        method: 'GET',
      });
      if (Array.isArray(liveData.items) && liveData.items.length > 0) {
        return liveData;
      }
      return getDemoPendingResponse();
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }
      return getDemoPendingResponse();
    }
  },

  /**
   * Approve a prescription (admin action).
   * @param {string} prescriptionId - UUID of the prescription record
   * @param {string} adminId - ID of the approving admin
   * @returns {Promise<Object>} Updated status
   */
  approvePrescription: async (prescriptionId, adminId) => {
    try {
      return await apiRequest(API_ENDPOINTS.PRESCRIPTION_APPROVE(prescriptionId), {
        method: 'POST',
        body: JSON.stringify({ admin_id: adminId }),
      });
    } catch (error) {
      if (!isDemoPrescriptionId(prescriptionId) && !shouldUseDemoFallback(error)) {
        throw error;
      }

      const approvedRecord = findAndUpdateDemoRecord(prescriptionId, (record) => ({
        ...record,
        status: 'approved',
        admin_id: adminId,
        reviewed_at: new Date().toISOString(),
      }));

      if (!approvedRecord) {
        throw new APIError(`Prescription ${prescriptionId} not found`, 404);
      }

      return {
        prescription_id: approvedRecord.prescription_id,
        status: approvedRecord.status,
        reviewed_at: approvedRecord.reviewed_at,
        message: 'Prescription approved and delivered to patient',
        demo_mode: true,
      };
    }
  },

  /**
   * Reject a prescription (admin action).
   * @param {string} prescriptionId - UUID of the prescription record
   * @param {string} adminId - ID of the rejecting admin
   * @param {string} reason - Reason for rejection
   * @returns {Promise<Object>} Updated status
   */
  rejectPrescription: async (prescriptionId, adminId, reason) => {
    try {
      return await apiRequest(API_ENDPOINTS.PRESCRIPTION_REJECT(prescriptionId), {
        method: 'POST',
        body: JSON.stringify({ admin_id: adminId, reason }),
      });
    } catch (error) {
      if (!isDemoPrescriptionId(prescriptionId) && !shouldUseDemoFallback(error)) {
        throw error;
      }

      const rejectedRecord = findAndUpdateDemoRecord(prescriptionId, (record) => ({
        ...record,
        status: 'rejected',
        admin_id: adminId,
        rejection_reason: reason,
        reviewed_at: new Date().toISOString(),
      }));

      if (!rejectedRecord) {
        throw new APIError(`Prescription ${prescriptionId} not found`, 404);
      }

      return {
        prescription_id: rejectedRecord.prescription_id,
        status: rejectedRecord.status,
        reviewed_at: rejectedRecord.reviewed_at,
        rejection_reason: rejectedRecord.rejection_reason,
        message: 'Prescription rejected',
        demo_mode: true,
      };
    }
  },

  /**
   * Retrieve patient-readable view for an approved prescription.
   * @param {string} prescriptionId - UUID of the prescription record
   * @returns {Promise<Object>} Patient-facing prescription data
   */
  getPatientPrescriptionView: async (prescriptionId) => {
    try {
      return await apiRequest(API_ENDPOINTS.PRESCRIPTION_PATIENT_VIEW(prescriptionId), {
        method: 'GET',
      });
    } catch (error) {
      if (!isDemoPrescriptionId(prescriptionId) && !shouldUseDemoFallback(error)) {
        throw error;
      }

      const record = loadDemoStore().find((item) => item.prescription_id === prescriptionId);
      if (!record) {
        throw new APIError('Prescription not found', 404);
      }
      if (record.status === 'pending_admin_review') {
        throw new APIError('Prescription is awaiting admin approval', 403);
      }
      if (record.status === 'rejected') {
        throw new APIError('Prescription was rejected by admin', 403);
      }

      const data = record.extracted_data;
      return {
        prescription_id: record.prescription_id,
        doctor_name: data.doctor_name || 'Your doctor',
        patient_name: data.patient_name || 'Patient',
        patient_age: data.patient_age || null,
        prescription_date: data.prescription_date || null,
        diagnosis: data.diagnosis || null,
        medications: data.medications || [],
        notes: data.notes || null,
        approved_at: record.reviewed_at || null,
        demo_mode: true,
      };
    }
  },

  // -------------------------------------------------------------------------
  // Patient signup & OTP
  // -------------------------------------------------------------------------

  /**
   * Register a new patient account.
   * @param {Object} data - Signup data
   * @param {string} data.name - Full name
   * @param {string} data.email - Email address
   * @param {string} data.password - Password
   * @param {string} data.phone - WhatsApp phone in E.164 format
   * @returns {Promise<Object>} Signup result
   */
  signup: async (data) => {
    try {
      return await apiRequest(API_ENDPOINTS.AUTH_SIGNUP, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }
      // Demo fallback: simulate successful signup
      const demoId = `demo-patient-${Date.now()}`;
      return {
        success: true,
        message: 'Demo signup successful. Please verify your phone.',
        user_id: demoId,
        is_demo: true,
      };
    }
  },

  /**
   * Send OTP to a phone number.
   * @param {string} phone - E.164 phone number
   * @param {string} channel - 'whatsapp' or 'sms'
   * @returns {Promise<Object>} OTP send result
   */
  sendOtp: async (phone, channel = 'whatsapp') => {
    try {
      return await apiRequest(API_ENDPOINTS.AUTH_SEND_OTP, {
        method: 'POST',
        body: JSON.stringify({ phone, channel }),
      });
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }
      return {
        success: true,
        message: `Demo OTP (123456) sent to ${phone}`,
        demo_mode: true,
      };
    }
  },

  /**
   * Verify OTP code.
   * @param {string} phone - E.164 phone number
   * @param {string} code - OTP code
   * @returns {Promise<Object>} Verification result
   */
  verifyOtp: async (phone, code) => {
    try {
      return await apiRequest(API_ENDPOINTS.AUTH_VERIFY_OTP, {
        method: 'POST',
        body: JSON.stringify({ phone, code }),
      });
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }
      const verified = code === '123456';
      return {
        success: true,
        verified,
        status: verified ? 'approved' : 'pending',
        demo_mode: true,
      };
    }
  },

  // -------------------------------------------------------------------------
  // Doctor / Patient prescription lists
  // -------------------------------------------------------------------------

  /**
   * Get all prescriptions uploaded by a specific doctor.
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<Object>} { count, items }
   */
  getDoctorPrescriptions: async (doctorId) => {
    try {
      return await apiRequest(API_ENDPOINTS.PRESCRIPTIONS_BY_DOCTOR(doctorId), {
        method: 'GET',
      });
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }
      const records = loadDemoStore().filter((r) => r.doctor_id === doctorId);
      return { count: records.length, items: records, demo_mode: true };
    }
  },

  /**
   * Get all approved prescriptions for a patient.
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} { count, items }
   */
  getPatientPrescriptions: async (patientId) => {
    try {
      return await apiRequest(API_ENDPOINTS.PRESCRIPTIONS_FOR_PATIENT(patientId), {
        method: 'GET',
      });
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }
      const records = loadDemoStore().filter(
        (r) => r.status === 'approved' && r.extracted_data?.patient_id === patientId
      );
      return { count: records.length, items: records, demo_mode: true };
    }
  },

  /**
   * Get list of registered patients (for doctor dropdowns).
   * @returns {Promise<Object>} { count, items }
   */
  getPatients: async () => {
    try {
      return await apiRequest(API_ENDPOINTS.PATIENTS_LIST, {
        method: 'GET',
      });
    } catch (error) {
      if (!shouldUseDemoFallback(error)) {
        throw error;
      }
      return { count: 0, items: [], demo_mode: true };
    }
  },
};

/**
 * Request interceptor (for adding auth tokens, logging, etc.)
 */
export const setAuthToken = (token) => {
  if (token) {
    DEFAULT_HEADERS['Authorization'] = `Bearer ${token}`;
  } else {
    delete DEFAULT_HEADERS['Authorization'];
  }
};

/**
 * Helper functions for validation
 */
export const validators = {
  /**
   * Validate discharge text
   */
  validateDischargeText: (text) => {
    if (!text || text.trim().length < 50) {
      throw new Error('Discharge summary must be at least 50 characters');
    }
    if (text.length > 10000) {
      throw new Error('Discharge summary is too long (max 10,000 characters)');
    }
    return true;
  },

  /**
   * Validate phone number (E.164 format)
   */
  validatePhoneNumber: (phone) => {
    const phoneRegex = /^\+\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Phone number must be in E.164 format (e.g., +919876543210)');
    }
    return true;
  },

  /**
   * Validate file for upload
   */
  validateFile: (file) => {
    const maxSizeMB = 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      throw new Error(`File size must be less than ${maxSizeMB}MB`);
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileName = (file.name || '').toLowerCase();
    const hasAllowedExtension = allowedExtensions.some((extension) => fileName.endsWith(extension));
    const hasAllowedType = file.type ? allowedTypes.includes(file.type) : false;

    if (!hasAllowedType && !hasAllowedExtension) {
      throw new Error('Only PDF, JPG, and PNG files are allowed');
    }

    return true;
  },
};

export default api;
