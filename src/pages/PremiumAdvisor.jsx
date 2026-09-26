import React, { useState } from 'react';
import { premiumAdvisorApi } from '../api/premiumAdvisorApi';

export default function PremiumAdvisor() {
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [riskLevel, setRiskLevel] = useState('MEDIUM');
  const [analysisPeriodDays, setAnalysisPeriodDays] = useState(30);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {

    setError('');
    setResult(null);

    if (!investmentAmount || Number(investmentAmount) <= 0) {
      setError('Please enter a valid investment amount.');
      return;
    }

    try {
      setLoading(true);

      const data = await premiumAdvisorApi.analyze(
        Number(investmentAmount),
        riskLevel,
        Number(analysisPeriodDays)
      );

      setResult(data);
    } catch (err) {
      console.error(err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(
          'Unable to generate Premium Advisor analysis. Please make sure you have a PREMIUM account.'
        );
      }
    } finally {
      setLoading(false);
    }
  };
    const estimatedMin = Number(result?.estimatedProfitMin ?? 0);
  const estimatedMax = Number(result?.estimatedProfitMax ?? 0);

  let profitLabel = 'Estimated Range';

  if (estimatedMin >= 0 && estimatedMax >= 0) {
    profitLabel = 'Estimated Gain';
  } else if (estimatedMin <= 0 && estimatedMax <= 0) {
    profitLabel = 'Estimated Loss';
  }

  const formatProfit = (value) => {
    const number = Number(value ?? 0);

    return `${number < 0 ? '-₹' : '₹'}${Math.abs(number).toLocaleString(
      'en-IN',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`;
  };

  return (
    <div style={{ padding: '30px' }}>
      <h1>Premium Currency Advisor</h1>

      <p style={{ color: '#666' }}>
        Historical simulation based on currency rate data.
      </p>

      <div
        style={{
          background: '#fff',
          padding: '25px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
          marginTop: '20px',
          maxWidth: '700px'
        }}
      >
        <div style={{ marginBottom: '18px' }}>
          <label>Investment Amount (₹)</label>
          <input
            type="number"
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(e.target.value)}
            placeholder="Enter amount"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label>Risk Level</label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            style={inputStyle}
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label>Analysis Period (Days)</label>
          <input
            type="number"
            min="7"
            max="3650"
            value={analysisPeriodDays}
            onChange={(e) => setAnalysisPeriodDays(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={buttonStyle}
        >
          {loading ? 'Analyzing...' : 'Analyze Portfolio'}
        </button>

        {error && (
          <p style={{ color: 'red', marginTop: '15px' }}>
            {error}
          </p>
        )}
      </div>

      {result && (
        <div style={{ marginTop: '30px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '15px'
            }}
          >
            <StatCard
              title="Wallet Balance"
              value={`₹${Number(result.walletBalance).toLocaleString()}`}
            />

            <StatCard
              title="Investment"
              value={`₹${Number(result.investmentAmount).toLocaleString()}`}
            />

            <StatCard
              title="Estimated Return"
              value={`${result.estimatedReturnMinPercentage}% - ${result.estimatedReturnMaxPercentage}%`}
            />

            <StatCard
  title={profitLabel}
  value={`${formatProfit(estimatedMin)} - ${formatProfit(estimatedMax)}`}
/>
          </div>

          <h2 style={{ marginTop: '30px' }}>
            Recommended Currencies
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}
          >
            {result.recommendations.map((currency) => (
              <div
                key={currency.currencyCode}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
                }}
              >
                <h3>
                  {currency.currencyName} ({currency.currencyCode})
                </h3>

                <p>
                  <strong>Current Rate:</strong>{' '}
                  ₹{Number(currency.currentRate).toFixed(4)}
                </p>

                <p>
                  <strong>Allocation:</strong>{' '}
                  ₹{Number(currency.allocationAmount).toLocaleString()}
                </p>

                <p>
                  <strong>Allocation %:</strong>{' '}
                  {currency.allocationPercentage}%
                </p>

                <p>
                  <strong>Historical Return:</strong>{' '}
                  {currency.historicalReturnPercentage}%
                </p>

                <p>
                  <strong>Positive Return Frequency:</strong>{' '}
                  {currency.positiveReturnProbability}%
                </p>

                <p>
                  <strong>Volatility:</strong>{' '}
                  {currency.volatility}%
                </p>

                <p>
                  <strong>Trend:</strong>{' '}
                  {currency.trend}
                </p>

                <p style={{ color: '#555' }}>
                  {currency.reasoning}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '25px',
              padding: '15px',
              background: '#fff8e1',
              borderRadius: '10px'
            }}
          >
            <strong>Disclaimer:</strong> {result.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)'
      }}
    >
      <div style={{ color: '#777', fontSize: '14px' }}>
        {title}
      </div>

      <div
        style={{
          marginTop: '8px',
          fontSize: '20px',
          fontWeight: 'bold'
        }}
      >
        {value}
      </div>
    </div>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: '7px',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #ccc',
  boxSizing: 'border-box'
};

const buttonStyle = {
  padding: '12px 22px',
  border: 'none',
  borderRadius: '8px',
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 'bold'
};