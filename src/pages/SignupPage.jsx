import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const STEPS = { FORM: 'form', OTP: 'otp', DONE: 'done' };

export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEPS.FORM);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpChannel, setOtpChannel] = useState('whatsapp');
  const [signupResult, setSignupResult] = useState(null);

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  }, []);

  // Step 1: Create account
  const handleSignup = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    const { name, email, password, phone } = formData;
    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!/^\+\d{10,15}$/.test(phone.trim())) {
      setError('Phone must be in E.164 format (e.g. +919876543210)');
      return;
    }

    setLoading(true);
    try {
      const result = await api.signup({ name: name.trim(), email: email.trim(), password, phone: phone.trim() });
      setSignupResult(result);

      // Send OTP automatically
      const otpResult = await api.sendOtp(phone.trim(), otpChannel);
      if (otpResult.demo_mode) {
        setError('Demo mode: Use OTP code 123456');
      }
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formData, otpChannel]);

  // Step 2: Verify OTP
  const handleVerifyOtp = useCallback(async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.length < 4) {
      setError('Please enter the OTP code');
      return;
    }

    setLoading(true);
    try {
      const result = await api.verifyOtp(formData.phone.trim(), otp);
      if (result.verified) {
        setStep(STEPS.DONE);
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [otp, formData.phone, navigate]);

  // Resend OTP
  const handleResendOtp = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const result = await api.sendOtp(formData.phone.trim(), otpChannel);
      if (result.demo_mode) {
        setError('Demo mode: Use OTP code 123456');
      } else {
        setError('OTP resent successfully!');
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  }, [formData.phone, otpChannel]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo/Header */}
        <div style={styles.header}>
          <div style={styles.logoCircle}>
            <span style={styles.logoText}>🩺</span>
          </div>
          <h1 style={styles.title}>SwasthaLink</h1>
          <p style={styles.subtitle}>
            {step === STEPS.FORM && 'Create your Patient Account'}
            {step === STEPS.OTP && 'Verify your Phone Number'}
            {step === STEPS.DONE && 'Account Created!'}
          </p>
        </div>

        {/* Progress */}
        <div style={styles.progress}>
          <div style={{ ...styles.progressDot, ...(step === STEPS.FORM ? styles.progressActive : step !== STEPS.FORM ? styles.progressDone : {}) }}>1</div>
          <div style={styles.progressLine} />
          <div style={{ ...styles.progressDot, ...(step === STEPS.OTP ? styles.progressActive : step === STEPS.DONE ? styles.progressDone : {}) }}>2</div>
          <div style={styles.progressLine} />
          <div style={{ ...styles.progressDot, ...(step === STEPS.DONE ? styles.progressActive : {}) }}>✓</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ ...styles.alert, ...(error.includes('Demo') || error.includes('resent') ? styles.alertInfo : styles.alertError) }}>
            {error}
          </div>
        )}

        {/* Step 1: Signup Form */}
        {step === STEPS.FORM && (
          <form onSubmit={handleSignup} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text" name="name" value={formData.name} onChange={handleChange}
                placeholder="Enter your full name" style={styles.input} required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="patient@example.com" style={styles.input} required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                type="password" name="password" value={formData.password} onChange={handleChange}
                placeholder="Minimum 6 characters" style={styles.input} required minLength={6}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>WhatsApp Phone Number</label>
              <input
                type="tel" name="phone" value={formData.phone} onChange={handleChange}
                placeholder="+919876543210" style={styles.input} required
              />
              <small style={styles.hint}>E.164 format with country code (e.g. +91 for India)</small>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>OTP Channel</label>
              <div style={styles.radioGroup}>
                <label style={styles.radioLabel}>
                  <input type="radio" value="whatsapp" checked={otpChannel === 'whatsapp'}
                    onChange={() => setOtpChannel('whatsapp')} style={styles.radio} />
                  <span style={styles.radioIcon}>💬</span> WhatsApp
                </label>
                <label style={styles.radioLabel}>
                  <input type="radio" value="sms" checked={otpChannel === 'sms'}
                    onChange={() => setOtpChannel('sms')} style={styles.radio} />
                  <span style={styles.radioIcon}>📱</span> SMS
                </label>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ ...styles.btn, ...(loading ? styles.btnDisabled : {}) }}>
              {loading ? '⏳ Creating Account...' : '🚀 Sign Up & Send OTP'}
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === STEPS.OTP && (
          <form onSubmit={handleVerifyOtp} style={styles.form}>
            <p style={styles.otpInfo}>
              We've sent a verification code to <strong>{formData.phone}</strong> via {otpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}.
            </p>
            <div style={styles.field}>
              <label style={styles.label}>Enter OTP Code</label>
              <input
                type="text" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                placeholder="• • • • • •" style={{ ...styles.input, ...styles.otpInput }} maxLength={6}
                autoFocus inputMode="numeric" autoComplete="one-time-code"
              />
            </div>
            <button type="submit" disabled={loading || otp.length < 4} style={{ ...styles.btn, ...(loading || otp.length < 4 ? styles.btnDisabled : {}) }}>
              {loading ? '⏳ Verifying...' : '✅ Verify OTP'}
            </button>
            <button type="button" onClick={handleResendOtp} disabled={loading} style={styles.linkBtn}>
              Didn't receive code? Resend OTP
            </button>
          </form>
        )}

        {/* Step 3: Success */}
        {step === STEPS.DONE && (
          <div style={styles.success}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle}>Phone Verified!</h2>
            <p style={styles.successText}>Your account has been created and verified. Redirecting to login...</p>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.footerLink}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------
const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: '24px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    background: 'rgba(30, 41, 59, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(99, 179, 237, 0.15)',
    padding: '40px 32px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(99, 179, 237, 0.08)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    boxShadow: '0 4px 20px rgba(59,130,246,0.4)',
  },
  logoText: { fontSize: '26px' },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 4px',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0',
    marginBottom: '24px',
  },
  progressDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
    background: 'rgba(51, 65, 85, 0.6)',
    color: '#64748b',
    border: '2px solid rgba(100, 116, 139, 0.3)',
    transition: 'all 0.3s ease',
  },
  progressActive: {
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    border: '2px solid rgba(99,179,237,0.5)',
    boxShadow: '0 0 20px rgba(59,130,246,0.4)',
  },
  progressDone: {
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#22c55e',
    border: '2px solid rgba(34, 197, 94, 0.4)',
  },
  progressLine: {
    width: '40px',
    height: '2px',
    background: 'rgba(100, 116, 139, 0.3)',
  },
  alert: {
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '13px',
    marginBottom: '16px',
    lineHeight: '1.4',
  },
  alertError: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#fca5a5',
  },
  alertInfo: {
    background: 'rgba(59, 130, 246, 0.12)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    color: '#93c5fd',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#cbd5e1',
    letterSpacing: '0.2px',
  },
  input: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(100, 116, 139, 0.3)',
    background: 'rgba(15, 23, 42, 0.6)',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  hint: {
    fontSize: '11px',
    color: '#64748b',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#cbd5e1',
    fontSize: '13px',
    cursor: 'pointer',
  },
  radio: {
    accentColor: '#3b82f6',
  },
  radioIcon: { fontSize: '16px' },
  otpInfo: {
    color: '#94a3b8',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: 0,
    textAlign: 'center',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: '24px',
    letterSpacing: '12px',
    fontWeight: 700,
    padding: '16px',
  },
  btn: {
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
    marginTop: '4px',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 0',
    textAlign: 'center',
  },
  success: {
    textAlign: 'center',
    padding: '20px 0',
  },
  successIcon: { fontSize: '48px', marginBottom: '12px' },
  successTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#22c55e',
    margin: '0 0 8px',
  },
  successText: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0,
    lineHeight: '1.5',
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(100, 116, 139, 0.2)',
    fontSize: '13px',
    color: '#64748b',
  },
  footerLink: {
    color: '#60a5fa',
    textDecoration: 'none',
    fontWeight: 500,
  },
};
