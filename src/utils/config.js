/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 */

// Get API base URL from environment variables or use default
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// API Endpoints
export const API_ENDPOINTS = {
  // Core endpoints
  PROCESS: '/api/process',
  SEND_WHATSAPP: '/api/send-whatsapp',
  SUBMIT_QUIZ: '/api/quiz/submit',
  UPLOAD: '/api/upload',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_SIGNUP: '/api/auth/signup',
  AUTH_SEND_OTP: '/api/auth/send-otp',
  AUTH_VERIFY_OTP: '/api/auth/verify-otp',

  // Prescription RAG pipeline endpoints
  PRESCRIPTION_EXTRACT: '/api/prescriptions/extract',
  PRESCRIPTIONS_PENDING: '/api/prescriptions/pending',
  PRESCRIPTION_APPROVE: (id) => `/api/prescriptions/${id}/approve`,
  PRESCRIPTION_REJECT: (id) => `/api/prescriptions/${id}/reject`,
  PRESCRIPTION_ESCALATE: (id) => `/api/prescriptions/${id}/escalate`,
  PRESCRIPTION_PATIENT_VIEW: (id) => `/api/prescriptions/${id}/patient-view`,
  PRESCRIPTIONS_BY_DOCTOR: (doctorId) => `/api/prescriptions/by-doctor/${doctorId}`,
  PRESCRIPTIONS_FOR_PATIENT: (patientId) => `/api/prescriptions/for-patient/${patientId}`,
  PRESCRIPTIONS_ALL: '/api/prescriptions/all',
  PRESCRIPTION_DOCTOR_VIEW: (id) => `/api/prescriptions/${id}/doctor-view`,
  PRESCRIPTION_ADMIN_VIEW: (id) => `/api/prescriptions/${id}/admin-view`,
  PRESCRIPTION_AUDIT_LOG: (id) => `/api/prescriptions/${id}/audit-log`,
  RATE_LIMIT_STATUS: '/api/rate-limit-status',
  PATIENTS_LIST: '/api/patients',

  // Patient data chunks & chatbot
  PATIENT_CHUNKS: (patientId) => `/api/patients/${patientId}/chunks`,
  PATIENT_CHUNKS_BY_TYPE: (patientId, type) => `/api/patients/${patientId}/chunks/${type}`,
  PATIENT_CHATBOT_CONTEXT: (patientId) => `/api/patients/${patientId}/chatbot-context`,
  PATIENT_FAQ_SUGGESTIONS: (patientId) => `/api/patients/${patientId}/faq-suggestions`,

  // Utility endpoints
  HEALTH: '/api/health',
  SESSION_COUNT: '/api/sessions/count',
  ANALYTICS: '/api/analytics',
  SANDBOX_INSTRUCTIONS: '/api/whatsapp/sandbox-instructions',
};

// Request timeout (milliseconds)
export const REQUEST_TIMEOUT = 60000; // 60 seconds for AI processing

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Role options
export const ROLES = {
  PATIENT: 'patient',
  CAREGIVER: 'caregiver',
  ELDERLY: 'elderly',
};

// Language options
export const LANGUAGES = {
  ENGLISH: 'en',
  BENGALI: 'bn',
  BOTH: 'both',
};

// File upload constraints
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png'],
};

// Validation constraints
export const VALIDATION = {
  MIN_DISCHARGE_TEXT_LENGTH: 50,
  MAX_DISCHARGE_TEXT_LENGTH: 10000,
  PHONE_NUMBER_PATTERN: /^\+\d{10,15}$/,
  MAX_WHATSAPP_MESSAGE_LENGTH: 1600,
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. The server took too long to respond.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  REQUEST_TIMEOUT,
  DEFAULT_HEADERS,
  ROLES,
  LANGUAGES,
  FILE_UPLOAD,
  VALIDATION,
  ERROR_MESSAGES,
};
