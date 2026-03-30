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

  const defaultOptions = {
    headers: {
      ...DEFAULT_HEADERS,
      ...(options.headers || {}),
    },
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

/**
 * API Service Methods
 */
const api = {
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
   * @returns {Promise<Object>} Extracted prescription data + record ID
   */
  extractPrescription: async (file, doctorId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doctor_id', doctorId);

    return apiRequest(API_ENDPOINTS.PRESCRIPTION_EXTRACT, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for multipart/form-data
    });
  },

  /**
   * Fetch all prescriptions pending admin review.
   * @returns {Promise<Object>} { count, items }
   */
  getPendingPrescriptions: async () => {
    return apiRequest(API_ENDPOINTS.PRESCRIPTIONS_PENDING, {
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
    return apiRequest(API_ENDPOINTS.PRESCRIPTION_APPROVE(prescriptionId), {
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
    return apiRequest(API_ENDPOINTS.PRESCRIPTION_REJECT(prescriptionId), {
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
    return apiRequest(API_ENDPOINTS.PRESCRIPTION_PATIENT_VIEW(prescriptionId), {
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

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only PDF, JPG, and PNG files are allowed');
    }

    return true;
  },
};

export default api;
