import React, { useState } from 'react';
import { premiumApi } from '../api/premiumApi';

export default function Premium() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [purchased, setPurchased] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [otp, setOtp] = useState('');

  const handlePurchase = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      const response = await premiumApi.requestPurchaseVerification();
      setMessage(response || 'A 4-digit verification code was sent to your email.');
      setVerificationStep(true);
    } catch (err) {
      setError(err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : 'Unable to send verification code.'));
    } finally {
      setLoading(false);
    }
  };

  const confirmPurchase = async (e) => {
    e.preventDefault();
    if (otp.length !== 4) return;

    try {
      setLoading(true);
      setMessage('');
      setError('');

      const response = await premiumApi.confirmPremiumPurchase(otp);
      setMessage(response || 'Premium activated successfully.');
      setPurchased(true);
      setVerificationStep(false);
      setOtp('');
    } catch (err) {
      setError(err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : 'Invalid verification code.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '18px',
          padding: '40px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            color: '#6b7280',
            fontWeight: '700',
            letterSpacing: '1px',
          }}
        >
          FXWALLET PREMIUM
        </p>

        <h1
          style={{
            marginTop: '12px',
            fontSize: '42px',
          }}
        >
          Premium Currency Advisor
        </h1>

        <p
          style={{
            maxWidth: '650px',
            margin: '15px auto',
            color: '#6b7280',
            fontSize: '17px',
          }}
        >
          Get advanced historical currency analysis, risk-based allocation
          suggestions, and simulated return scenarios.
        </p>

        <div
          style={{
            margin: '30px auto',
            maxWidth: '320px',
            padding: '25px',
            border: '1px solid #e5e7eb',
            borderRadius: '14px',
          }}
        >
          <div style={{ color: '#6b7280' }}>
            Premium Plan
          </div>

          <div
            style={{
              fontSize: '42px',
              fontWeight: '800',
              margin: '8px 0',
            }}
          >
            ₹999
          </div>

          <div style={{ color: '#6b7280' }}>
            Premium access
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '15px',
            marginTop: '30px',
            textAlign: 'left',
          }}
        >
          <Feature text="Historical currency analysis" />
          <Feature text="Risk-based analysis" />
          <Feature text="Currency allocation suggestions" />
          <Feature text="Historical positive-return frequency" />
          <Feature text="Estimated scenario return" />
          <Feature text="Premium Currency Advisor" />
        </div>

        {!purchased ? (
          verificationStep ? (
            <div style={{ marginTop: '35px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ padding: '18px', borderRadius: '14px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '13px', lineHeight: 1.5 }}>
                🔐 <strong>2-step verification</strong><br />
                Enter the 4-digit code sent to your registered email before completing the ₹999 Premium purchase.
              </div>
              <form onSubmit={confirmPurchase}>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={4}
                  placeholder="••••"
                  autoFocus
                  required
                  style={{ width: '100%', boxSizing: 'border-box', height: '58px', marginTop: '14px', textAlign: 'center', letterSpacing: '0.65em', fontSize: '26px', fontWeight: 800, border: '1px solid #dbe3ee', borderRadius: '13px', background: '#f8fafc' }}
                />
                <button type="submit" disabled={loading || otp.length !== 4} style={{ width: '100%', height: '50px', marginTop: '12px', border: 'none', borderRadius: '12px', background: '#111', color: '#fff', fontWeight: 700, opacity: loading || otp.length !== 4 ? 0.6 : 1 }}>
                  {loading ? 'Verifying...' : 'Verify & Buy Premium'}
                </button>
              </form>
              <button type="button" onClick={() => { setVerificationStep(false); setOtp(''); setError(''); }} style={{ marginTop: '10px', border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 700 }}>
                Cancel
              </button>
            </div>
          ) : (
          <button
            onClick={handlePurchase}
            disabled={loading}
            style={{
              marginTop: '35px',
              padding: '14px 30px',
              border: 'none',
              borderRadius: '10px',
              background: '#111',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? 'Activating Premium...'
              : 'Buy Premium ₹999'}
          </button>
          )
        ) : (
          <div
            style={{
              marginTop: '35px',
              padding: '15px 20px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#047857',
              fontWeight: '700',
            }}
          >
            ✓ Premium Active
          </div>
        )}

        {message && (
          <p
            style={{
              marginTop: '20px',
              color: '#047857',
              fontWeight: '600',
            }}
          >
            {message}
          </p>
        )}

        {error && (
          <p
            style={{
              marginTop: '20px',
              color: '#dc2626',
              fontWeight: '600',
            }}
          >
            {error}
          </p>
        )}

        <p
          style={{
            marginTop: '18px',
            fontSize: '13px',
            color: '#777',
          }}
        >
          Demo subscription for the FXWallet simulation project.
        </p>
      </div>
    </div>
  );
}

function Feature({ text }) {
  return (
    <div
      style={{
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '10px',
      }}
    >
      ✓ {text}
    </div>
  );
}
