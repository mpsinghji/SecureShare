import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { showToast } from '../utils/toast';

const Login = ({ setAuthToken }) => {
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);

  // Form states
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');

  // OTP State
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');

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

  if (requiresOtp) {
    return (
      <div className="login-wrapper">
        <div className="container" style={{ width: '400px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <span className="material-symbols-outlined text-primary mb-4" style={{ fontSize: '48px' }}>mark_email_unread</span>
          <h1 className="font-headline-md text-primary mb-2">Verify Your Email</h1>
          <p className="font-body-sm text-on-surface-variant mb-6 text-center">We've sent a 6-digit code to <strong>{otpEmail}</strong></p>
          
          <form onSubmit={handleVerifyOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="input-group">
              <span className="material-symbols-outlined icon">password</span>
              <input 
                type="text" 
                placeholder="Enter 6-digit OTP" 
                className="custom-input text-center"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                maxLength="6"
                required
                style={{ letterSpacing: '8px', fontSize: '18px', fontWeight: 'bold' }}
              />
            </div>

            {error && (
              <div className="error-banner font-body-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span>
                {error}
              </div>
            )}

            <button type="submit" className="action-btn" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
            <button type="button" className="ghost-btn" style={{ marginTop: '16px', color: 'var(--primary)', borderColor: 'var(--primary)' }} onClick={() => setRequiresOtp(false)}>Back to Login</button>
          </form>
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

            <button type="submit" className="action-btn" disabled={loading}>
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

      <style>{`
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top right, var(--surface-container-high), var(--background));
          padding: 24px;
        }

        .container {
          background-color: var(--surface-container-lowest);
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
          width: 900px;
          max-width: 100%;
          min-height: 550px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .form-container {
          position: absolute;
          top: 0;
          height: 100%;
          transition: all 0.6s ease-in-out;
        }

        .form-container form {
          background-color: var(--surface-container-lowest);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 50px;
          height: 100%;
          text-align: center;
        }

        .input-group {
          position: relative;
          width: 100%;
          margin: 8px 0;
        }

        .input-group .icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--on-surface-variant);
        }

        .custom-input {
          background-color: var(--surface-container);
          border: 1px solid var(--border-subtle);
          padding: 14px 16px 14px 48px;
          width: 100%;
          border-radius: var(--radius-md);
          color: var(--on-surface);
          font-family: var(--font-inter);
          outline: none;
          transition: border-color 0.2s, background-color 0.2s;
        }

        .custom-input:focus {
          border-color: var(--on-surface);
          background-color: var(--surface-container-high);
        }

        .sign-in-container {
          left: 0;
          width: 50%;
          z-index: 2;
        }

        .container.right-panel-active .sign-in-container {
          transform: translateX(100%);
        }

        .sign-up-container {
          left: 0;
          width: 50%;
          opacity: 0;
          z-index: 1;
        }

        .container.right-panel-active .sign-up-container {
          transform: translateX(100%);
          opacity: 1;
          z-index: 5;
          animation: show 0.6s;
        }

        @keyframes show {
          0%, 49.99% {
            opacity: 0;
            z-index: 1;
          }
          50%, 100% {
            opacity: 1;
            z-index: 5;
          }
        }

        .overlay-container {
          position: absolute;
          top: 0;
          left: 50%;
          width: 50%;
          height: 100%;
          overflow: hidden;
          transition: transform 0.6s ease-in-out;
          z-index: 100;
        }

        .container.right-panel-active .overlay-container {
          transform: translateX(-100%);
        }

        .overlay {
          background: var(--primary-container);
          background: linear-gradient(135deg, var(--inverse-surface), var(--primary-container));
          background-repeat: no-repeat;
          background-size: cover;
          background-position: 0 0;
          color: #ffffff;
          position: relative;
          left: -100%;
          height: 100%;
          width: 200%;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
        }

        .container.right-panel-active .overlay {
          transform: translateX(50%);
        }

        .overlay-panel {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 40px;
          text-align: center;
          top: 0;
          height: 100%;
          width: 50%;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
        }

        .overlay-left {
          transform: translateX(-20%);
        }

        .container.right-panel-active .overlay-left {
          transform: translateX(0);
        }

        .overlay-right {
          right: 0;
          transform: translateX(0);
        }

        .container.right-panel-active .overlay-right {
          transform: translateX(20%);
        }

        .action-btn {
          border-radius: var(--radius-full);
          border: 1px solid var(--on-surface);
          background-color: var(--on-surface);
          color: var(--surface);
          font-size: 14px;
          font-weight: bold;
          padding: 14px 45px;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: transform 80ms ease-in;
          margin-top: 16px;
        }

        .action-btn:active {
          transform: scale(0.95);
        }
        
        .action-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .ghost-btn {
          background-color: transparent;
          border-color: #ffffff;
          border-radius: var(--radius-full);
          border: 1px solid #ffffff;
          color: #ffffff;
          font-size: 14px;
          font-weight: bold;
          padding: 14px 45px;
          letter-spacing: 1px;
          text-transform: uppercase;
          transition: transform 80ms ease-in, background-color 0.2s;
        }
        
        .ghost-btn:hover {
          background-color: rgba(255,255,255,0.1);
        }

        .ghost-btn:active {
          transform: scale(0.95);
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background-color: rgba(239, 68, 68, 0.1);
          color: var(--status-critical);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(239, 68, 68, 0.2);
          margin-top: 12px;
          width: 100%;
        }

        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .mb-6 { margin-bottom: 24px; }
        .mb-8 { margin-bottom: 32px; }
        .px-8 { padding-left: 32px; padding-right: 32px; }
      `}</style>
    </div>
  );
};

export default Login;
