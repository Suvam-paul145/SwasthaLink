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
  const { timeout = REQUEST_TIMEOUT, ...requestOptions } = options;
  const requestHeaders = {
    ...DEFAULT_HEADERS,
    ...(requestOptions.headers || {}),
  };

  // FormData must not send a JSON content type.
  if (requestOptions.body instanceof FormData) {
    delete requestHeaders['Content-Type'];
  }

  const defaultOptions = {
    headers: requestHeaders,
  };

    try {
      const response = await fetchWithTimeout(url, {
        ...defaultOptions,
        ...requestOptions,
      }, timeout);

    return await handleResponse(response);
  } catch (error) {
    // Handle network errors
    if (error instanceof APIError) {
      throw error;
    }

    if (error.message === 'Failed to fetch') {
      throw new APIError(
        `Cannot reach backend at ${API_BASE_URL}. Check that the backend server is running and retry.`,
        0,
        { url, baseUrl: API_BASE_URL }
      );
    }

    throw new APIError(ERROR_MESSAGES.UNKNOWN_ERROR, 500, { originalError: error.message });
  }
};



/**
 * API Service Methods
 */
const api = {
  // Auth endpoints can hit cold-start latency right after deployment on free-tier hosting.
  AUTH_REQUEST_TIMEOUT: 180000, // 3 minutes
  /**
   * Login with role, email and password.
   * @param {Object} data - Login request data
   * @param {string} data.role - User role ('patient' | 'doctor' | 'admin')
   * @param {string} data.email - Email address
   * @param {string} data.password - Password
   * @returns {Promise<Object>} Auth response with user profile
   */
  login: async (data) => {
    return await apiRequest(API_ENDPOINTS.AUTH_LOGIN, {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: api.AUTH_REQUEST_TIMEOUT,
    });
  },

  /**
   * Verify the current JWT session with the backend.
   * Used on page load to confirm the stored token is still valid.
   * @returns {Promise<Object>} { success, user } if valid
   */
  verifySession: async () => {
    return await apiRequest(API_ENDPOINTS.AUTH_ME, {
      method: 'GET',
      timeout: api.AUTH_REQUEST_TIMEOUT,
    });
  },

  /**
   * Request an OTP for password reset
   * @param {Object} data - Includes { email, phone }
   */
  requestPasswordResetOTP: async (data) => {
    return await apiRequest(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: api.AUTH_REQUEST_TIMEOUT,
    });
  },

  /**
   * Reset password with the provided OTP
   * @param {Object} data - Includes { phone, code, new_password }
   */
  resetPasswordWithOTP: async (data) => {
    return await apiRequest(API_ENDPOINTS.AUTH_RESET_PASSWORD, {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: api.AUTH_REQUEST_TIMEOUT,
    });
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
   * Generate health report PDF on the backend
   * @param {Object} data - Prescription/patient data
   * @returns {Promise<{success: boolean, pdf_base64: string, text_summary: string, file_name: string}>}
   */
  generateReport: async (data) => {
    return apiRequest(API_ENDPOINTS.REPORT_GENERATE, {
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
    if (context.reportType) formData.append('report_type', context.reportType);
    if (context.patientId) formData.append('patient_id', context.patientId);
    if (context.linkedPrescriptionId) formData.append('linked_prescription_id', context.linkedPrescriptionId);
    return await apiRequest(API_ENDPOINTS.PRESCRIPTION_EXTRACT, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Fetch all prescriptions pending admin review.
   * @returns {Promise<Object>} { count, items }
   */
  getPendingPrescriptions: async () => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTIONS_PENDING, {
      method: 'GET',
    });
  },

  /**
   * Approve a prescription (admin action).
   * @param {string} prescriptionId - UUID of the prescription record
   * @param {string} adminId - ID of the approving admin
   * @returns {Promise<Object>} Updated status
   */
  approvePrescription: async (prescriptionId, adminId) => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTION_APPROVE(prescriptionId), {
      method: 'POST',
      body: JSON.stringify({ admin_id: adminId }),
    });
  },

  /**
   * Reject a prescription (admin action).
   * @param {string} prescriptionId - UUID of the prescription record
   * @param {string} adminId - ID of the rejecting admin
   * @param {string} reason - Reason for rejection
   * @returns {Promise<Object>} Updated status
   */
  rejectPrescription: async (prescriptionId, adminId, reason) => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTION_REJECT(prescriptionId), {
      method: 'POST',
      body: JSON.stringify({ admin_id: adminId, reason }),
    });
  },

  /**
   * Retrieve patient-readable view for an approved prescription.
   * @param {string} prescriptionId - UUID of the prescription record
   * @returns {Promise<Object>} Patient-facing prescription data
   */
  getPatientPrescriptionView: async (prescriptionId) => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTION_PATIENT_VIEW(prescriptionId), {
      method: 'GET',
    });
  },

  // -------------------------------------------------------------------------
  // Patient signup & OTP
  // -------------------------------------------------------------------------

  /**
   * Register a new user account.
   * @param {Object} data - Signup data
   * @param {string} data.role - User role ('patient' | 'doctor' | 'admin')
   * @param {string} data.name - Full name
   * @param {string} data.email - Email address
   * @param {string} data.password - Password
   * @param {string} data.phone - WhatsApp phone in E.164 format
   * @returns {Promise<Object>} Signup result
   */
  signup: async (data) => {
    return await apiRequest(API_ENDPOINTS.AUTH_SIGNUP, {
      method: 'POST',
      body: JSON.stringify(data),
      timeout: api.AUTH_REQUEST_TIMEOUT,
    });
  },

  /**
   * Send OTP to a phone number.
   * @param {string} phone - E.164 phone number
   * @param {string} channel - 'whatsapp' or 'sms'
   * @returns {Promise<Object>} OTP send result
   */
  sendOtp: async (phone, channel = 'whatsapp') => {
    return await apiRequest(API_ENDPOINTS.AUTH_SEND_OTP, {
      method: 'POST',
      body: JSON.stringify({ phone, channel }),
      timeout: api.AUTH_REQUEST_TIMEOUT,
    });
  },

  /**
   * Verify OTP code.
   * @param {string} phone - E.164 phone number
   * @param {string} code - OTP code
   * @returns {Promise<Object>} Verification result
   */
  verifyOtp: async (phone, code, options = {}) => {
    return await apiRequest(API_ENDPOINTS.AUTH_VERIFY_OTP, {
      method: 'POST',
      body: JSON.stringify({ phone, code, ...options }),
      timeout: api.AUTH_REQUEST_TIMEOUT,
    });
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
    return await apiRequest(API_ENDPOINTS.PRESCRIPTIONS_BY_DOCTOR(doctorId), {
      method: 'GET',
    });
  },

  /**
   * Get all approved prescriptions for a patient.
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} { count, items }
   */
  getPatientPrescriptions: async (patientId) => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTIONS_FOR_PATIENT(patientId), {
      method: 'GET',
    });
  },

  /**
   * Get list of registered patients (for doctor dropdowns).
   * @returns {Promise<Object>} { count, items }
   */
  getPatients: async () => {
    return await apiRequest(API_ENDPOINTS.PATIENTS_LIST, {
      method: 'GET',
    });
  },

  /**
   * Get ALL prescriptions (admin history view).
   * @returns {Promise<Object>} { count, items }
   */
  getAllPrescriptions: async () => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTIONS_ALL, {
      method: 'GET',
    });
  },

  /**
   * Get full clinical view of a prescription (doctor view).
   * @param {string} prescriptionId - UUID
   * @returns {Promise<Object>} Full prescription record
   */
  getDoctorView: async (prescriptionId) => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTION_DOCTOR_VIEW(prescriptionId), {
      method: 'GET',
    });
  },

  /**
   * Get Gemini API rate limit usage status.
   * @returns {Promise<Object>} Rate limit usage stats
   */
  getRateLimitStatus: async () => {
    return await apiRequest(API_ENDPOINTS.RATE_LIMIT_STATUS, {
      method: 'GET',
    });
  },

  // -------------------------------------------------------------------------
  // Data Pipeline — Patient Chunks & Chatbot
  // -------------------------------------------------------------------------

  /**
   * Get all data chunks for a patient.
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} { count, items }
   */
  getPatientChunks: async (patientId) => {
    return await apiRequest(API_ENDPOINTS.PATIENT_CHUNKS(patientId), {
      method: 'GET',
    });
  },

  /**
   * Get all past discharge sessions for a patient.
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} { results }
   */
  getPatientHistory: async (patientId) => {
    return await apiRequest(API_ENDPOINTS.PATIENT_HISTORY(patientId), {
      method: 'GET',
    });
  },

  /**
   * Get patient chunks filtered by type.
   * @param {string} patientId - Patient ID
   * @param {string} type - Chunk type (medication|routine|explanation|faq_context)
   * @returns {Promise<Object>} { count, items }
   */
  getPatientChunksByType: async (patientId, type) => {
    return await apiRequest(API_ENDPOINTS.PATIENT_CHUNKS_BY_TYPE(patientId, type), {
      method: 'GET',
    });
  },

  /**
   * Get RAG-ready chatbot context for a patient.
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} ChatbotContextPayload
   */
  getChatbotContext: async (patientId) => {
    return await apiRequest(API_ENDPOINTS.PATIENT_CHATBOT_CONTEXT(patientId), {
      method: 'GET',
    });
  },

  /**
   * Get pre-built FAQ question/answer pairs.
   * @param {string} patientId - Patient ID
   * @returns {Promise<Object>} { count, items }
   */
  getFaqSuggestions: async (patientId) => {
    return await apiRequest(API_ENDPOINTS.PATIENT_FAQ_SUGGESTIONS(patientId), {
      method: 'GET',
    });
  },

  /**
   * Get full admin view with risk flags, raw/processed toggle, audit trail.
   * @param {string} prescriptionId - UUID
   * @returns {Promise<Object>} AdminPanelPayload
   */
  getAdminFullView: async (prescriptionId) => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTION_ADMIN_VIEW(prescriptionId), {
      method: 'GET',
    });
  },

  /**
   * Get the full audit trail for a prescription.
   * @param {string} prescriptionId - UUID
   * @returns {Promise<Object>} { count, items }
   */
  getAuditLog: async (prescriptionId) => {
    return await apiRequest(API_ENDPOINTS.PRESCRIPTION_AUDIT_LOG(prescriptionId), {
      method: 'GET',
    });
  },

  /**
   * Ask a question to the chatbot using stored patient data only.
   * @param {string} patientId - Patient ID
   * @param {string} question - The question to ask
   * @returns {Promise<Object>} { answer, source, confidence }
   */
  askChatbot: async (patientId, question) => {
    return await apiRequest(API_ENDPOINTS.PATIENT_CHATBOT_QUERY(patientId), {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },

  /**
   * Get daily summary of doctor's activity.
   * @param {string} doctorId - Doctor ID
   * @returns {Promise<Object>} Summary data
   */
  getDailySummary: async (doctorId) => {
    return await apiRequest(`/api/doctor/daily-summary?doctor_id=${doctorId}`, {
      method: 'GET',
    });
  },

  /**
   * Link a system-generated PID to the current patient profile.
   * @param {string} pid - PID-XXXXXX code
   * @returns {Promise<Object>} Result message
   */
  linkPatientPid: async (pid) => {
    return await apiRequest('/api/patient/link-pid', {
      method: 'POST',
      body: JSON.stringify({ pid }),
    });
  },

  /**
   * Get the logged-in patient's profile (including linked PID).
   * @returns {Promise<Object>} Patient profile
   */
  getPatientProfile: async () => {
    return await apiRequest('/api/patient/profile', {
      method: 'GET',
    });
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
