import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { showToast } from '../utils/toast';
import './Login.css';

const Login = ({ setAuthToken }) => {
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);

  // Form states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Forgot Password State
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signInEmail, password: signInPassword })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('secureshare_token', data.token);
        setAuthToken(data.token);
        showToast('Login successful', 'success');
      } else {
        if (data.requiresVerification) {
          setRequiresOtp(true);
          setOtpEmail(data.email);
          showToast('Please check your email for the OTP', 'success');
        } else {
          const errorMsg = data.error || 'Login failed';
          setError(errorMsg);
          showToast(errorMsg, 'error');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please ensure backend is running.');
      showToast('Network error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signUpEmail, password: signUpPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setRequiresOtp(true);
        setOtpEmail(data.email);
        showToast('Registration successful! Please verify OTP', 'success');
      } else {
        const errorMsg = data.error || 'Registration failed';
        setError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please ensure backend is running.');
      showToast('Network error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, otp: otpCode })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('secureshare_token', data.token);
        setAuthToken(data.token);
        showToast('Email verified successfully', 'success');
      } else {
        const errorMsg = data.error || 'Verification failed';
        setError(errorMsg);
        showToast(errorMsg, 'error');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
      showToast('Network error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('secureshare_token', data.token);
        setAuthToken(data.token);
        showToast('Google Sign-In successful', 'success');
      } else {
        setError(data.error || 'Google Sign-In failed');
        showToast(data.error || 'Google Sign-In failed', 'error');
      }
    } catch (err) {
      console.error(err);
      setError('Network error during Google Sign-In.');
      showToast('Network error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setResetStep(2);
        showToast('Reset code sent to your email', 'success');
      } else {
        setError(data.error || 'Failed to send reset code');
      }
    } catch (err) {
      setError('Network error');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotPasswordEmail, otp: resetOtp, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setIsForgotPassword(false);
        setResetStep(1);
        showToast('Password reset successfully! You can now log in.', 'success');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error');
    } finally { setLoading(false); }
  };

  if (isForgotPassword) {
    return (
      <div className="login-wrapper">
        <div className="verify-container" style={{ width: '450px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '24px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ backgroundColor: 'var(--primary-container)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px' }}>lock_reset</span>
          </div>
          <h1 className="font-headline-lg text-primary mb-2 text-center">Reset Password</h1>
          
          {resetStep === 1 ? (
            <>
              <p className="font-body-md text-on-surface-variant mb-8 text-center" style={{ lineHeight: '1.5' }}>
                Enter your email address and we'll send you a recovery code.
              </p>
              <form onSubmit={handleForgotPassword} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="input-group" style={{ marginBottom: '24px' }}>
                  <input type="email" placeholder="Email Address" className="custom-input" value={forgotPasswordEmail} onChange={(e) => setForgotPasswordEmail(e.target.value)} required />
                </div>
                {error && <div className="error-banner font-body-sm mb-6" style={{ marginTop: 0 }}><span className="material-symbols-outlined">error</span>{error}</div>}
                <button type="submit" className="action-btn" style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px' }} disabled={loading}>{loading ? 'Sending...' : 'Send Reset Code'}</button>
                <button type="button" className="ghost-btn" style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', border: 'none', color: 'var(--primary)', marginTop: '8px' }} onClick={() => setIsForgotPassword(false)}>Back to Login</button>
              </form>
            </>
          ) : (
            <>
              <p className="font-body-md text-on-surface-variant mb-8 text-center" style={{ lineHeight: '1.5' }}>
                Enter the 6-digit code sent to <strong className="text-on-surface">{forgotPasswordEmail}</strong> and your new password.
              </p>
              <form onSubmit={handleResetPassword} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <input type="text" placeholder="000000" className="custom-input text-center" value={resetOtp} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))} maxLength="6" required style={{ letterSpacing: '8px', fontSize: '20px', fontWeight: 'bold' }} />
                </div>
                <div className="input-group" style={{ marginBottom: '24px' }}>
                  <input type="password" placeholder="New Password" className="custom-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                {error && <div className="error-banner font-body-sm mb-6" style={{ marginTop: 0 }}><span className="material-symbols-outlined">error</span>{error}</div>}
                <button type="submit" className="action-btn" style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px' }} disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
                <button type="button" className="ghost-btn" style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', border: 'none', color: 'var(--primary)', marginTop: '8px' }} onClick={() => setResetStep(1)}>Back</button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  if (requiresOtp) {
    return (
      <div className="login-wrapper">
        <div className="verify-container" style={{ width: '450px', backgroundColor: 'var(--surface-container-lowest)', borderRadius: '24px', padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ backgroundColor: 'var(--primary-container)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px' }}>mark_email_unread</span>
          </div>
          <h1 className="font-headline-lg text-primary mb-2 text-center">Verify Email</h1>
          <p className="font-body-md text-on-surface-variant mb-8 text-center" style={{ lineHeight: '1.5' }}>
            We've sent a 6-digit code to<br/> <strong className="text-on-surface">{otpEmail}</strong>
          </p>
          
          <form onSubmit={handleVerifyOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <input 
                type="text" 
                placeholder="000000" 
                className="custom-input text-center"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                maxLength="6"
                required
                style={{ letterSpacing: '16px', fontSize: '24px', fontWeight: 'bold', padding: '16px', borderRadius: '12px' }}
              />
            </div>

            {error && (
              <div className="error-banner font-body-sm mb-6" style={{ marginTop: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
                {error}
              </div>
            )}

            <button type="submit" className="action-btn" style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', marginTop: '0' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
            <button type="button" className="ghost-btn" style={{ width: '100%', padding: '16px', fontSize: '16px', borderRadius: '12px', border: 'none', color: 'var(--primary)', marginTop: '8px' }} onClick={() => setRequiresOtp(false)}>Back to Login</button>
          </form>
          
          <div style={{ marginTop: '32px', textAlign: 'center', backgroundColor: 'var(--surface-container)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--primary)', width: '100%' }}>
            <p className="text-on-surface font-body-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '20px' }}>terminal</span>
              <strong>Dev Mode:</strong> Check terminal for OTP
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrapper">
      <div className={`container ${isRightPanelActive ? 'right-panel-active' : ''}`} id="container">
        
        {/* Sign Up Container */}
        <div className="form-container sign-up-container">
          <form onSubmit={handleSignUp}>
            <h1 className="font-headline-lg text-primary mb-2">Create Account</h1>
            <p className="font-body-sm text-on-surface-variant mb-6">Register a new access node</p>
            
            <div className="input-group">
              <span className="material-symbols-outlined icon">mail</span>
              <input 
                type="email" 
                placeholder="Email Address" 
                className="custom-input"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <span className="material-symbols-outlined icon">key</span>
              <input 
                type="password" 
                placeholder="Master Password" 
                className="custom-input"
                value={signUpPassword}
                onChange={(e) => setSignUpPassword(e.target.value)}
                required
              />
            </div>

            {error && isRightPanelActive && (
              <div className="error-banner font-body-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                {error}
              </div>
            )}

            <button type="submit" className="action-btn" disabled={loading}>
              {loading ? 'Initializing...' : 'Sign Up'}
            </button>
            <div style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setError('Google Sign-In Failed');
                  showToast('Google Sign-In Failed', 'error');
                }}
              />
            </div>
          </form>
        </div>

        {/* Sign In Container */}
        <div className="form-container sign-in-container">
          <form onSubmit={handleSignIn}>
            <h1 className="font-headline-lg text-primary mb-2">Sign in</h1>
            <p className="font-body-sm text-on-surface-variant mb-6">Authorize your session</p>
            
            <div className="input-group">
              <span className="material-symbols-outlined icon">mail</span>
              <input 
                type="email" 
                placeholder="Email Address" 
                className="custom-input"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <span className="material-symbols-outlined icon">key</span>
              <input 
                type="password" 
                placeholder="Master Password" 
                className="custom-input"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                required
              />
            </div>

            {error && !isRightPanelActive && (
              <div className="error-banner font-body-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                {error}
              </div>
            )}

            <button type="button" className="font-body-sm text-primary mb-4" style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '12px' }} onClick={() => setIsForgotPassword(true)}>
              Forgot your password?
            </button>

            <button type="submit" className="action-btn" disabled={loading} style={{ marginTop: '0' }}>
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
            <div style={{ marginTop: '20px', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setError('Google Sign-In Failed');
                  showToast('Google Sign-In Failed', 'error');
                }}
              />
            </div>
          </form>
        </div>

        {/* Overlay Container */}
        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1 className="font-headline-lg mb-4 text-on-primary">Welcome Back!</h1>
              <p className="font-body-md text-on-primary-container mb-8 px-8">
                To keep connected with us please login with your personal info
              </p>
              <button className="ghost-btn" onClick={() => setIsRightPanelActive(false)}>Sign In</button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1 className="font-headline-lg mb-4 text-on-primary">Hello, Friend!</h1>
              <p className="font-body-md text-on-primary-container mb-8 px-8">
                Enter your personal details and start journey with us
              </p>
              <button className="ghost-btn" onClick={() => setIsRightPanelActive(true)}>Sign Up</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
