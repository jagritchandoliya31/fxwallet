import { useState } from 'react';
import { transactionApi } from '../api/transactionApi';

const FEE_RATE = 0.001; // 0.10%

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatQuantity = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  if (Number.isInteger(num)) return String(num);
  return String(num).replace(/\.?0+$/, '');
};

export default function FeeTradePanel({ rates, onTradeComplete, walletBalance }) {
  const [selected, setSelected] = useState('USD');
  const [amount, setAmount] = useState('10000');
  const [mode, setMode] = useState('buy');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numericalAmount = Number(amount) || 0;
  const selectedRate = rates.find((r) => r.code === selected);
  const rate = selectedRate ? Number(selectedRate.rate) : NaN;
  const rateAvailable = Number.isFinite(rate) && rate > 0;

  const preview = rateAvailable
    ? mode === 'buy' ? numericalAmount / rate : numericalAmount * rate
    : null;
  const tradeValue = rateAvailable ? (mode === 'buy' ? numericalAmount : preview) : 0;
  const platformFee = tradeValue * FEE_RATE;
  const totalDebit = tradeValue + platformFee;
  const netCredit = Math.max(0, tradeValue - platformFee);

  const submitTrade = async (e) => {
    e.preventDefault();
    if (submitting || !rateAvailable) return;
    setMessage('');

    if (numericalAmount <= 0) {
      setMessage('Enter an amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'buy') {
        if (Number.isFinite(Number(walletBalance)) && totalDebit > Number(walletBalance)) {
          setMessage('Insufficient wallet balance for trade plus platform fee.');
          setSubmitting(false);
          return;
        }

        const res = await transactionApi.buy({
          currencyCode: selected,
          amountInr: numericalAmount,
        });

        setMessage(
          `Bought ${formatQuantity(res.quantity)} ${selected}. Platform fee: ${money(res.platformFee)}.`
        );
      } else {
        const res = await transactionApi.sell({
          currencyCode: selected,
          quantity: numericalAmount,
        });

        setMessage(
          `Sold ${formatQuantity(res.quantity)} ${selected}; ${money(
            Number(res.inrAmount) - Number(res.platformFee || 0)
          )} added to wallet after ${money(res.platformFee)} fee.`
        );
      }

      await onTradeComplete?.();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Transaction failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isError =
    message.toLowerCase().includes('failed') ||
    message.toLowerCase().includes('insufficient') ||
    message.toLowerCase().includes('unavailable');

  return (
    <form onSubmit={submitTrade} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 22, padding: 22, boxShadow: '0 10px 28px rgba(15,23,42,0.045)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 15 }}>
        <div>
          <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Quick Trade</div>
          <h2 style={{ margin: '5px 0 0', fontSize: 20, fontWeight: 850 }}>Buy or sell currency</h2>
        </div>
        <div style={{ padding: '7px 9px', borderRadius: 10, background: '#f8fafc', color: '#64748b', fontSize: 10, fontWeight: 750 }}>0.10% FEE</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginTop: 18, padding: 5, background: '#f1f5f9', borderRadius: 13 }}>
        {['buy', 'sell'].map((option) => (
          <button key={option} type="button" onClick={() => { setMode(option); setMessage(''); }} style={{ border: 'none', height: 38, borderRadius: 9, background: mode === option ? '#ffffff' : 'transparent', color: mode === option ? (option === 'buy' ? '#047857' : '#dc2626') : '#64748b', fontSize: 12, fontWeight: 850, cursor: 'pointer', boxShadow: mode === option ? '0 3px 10px rgba(15,23,42,0.07)' : 'none' }}>
            {option === 'buy' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      <label style={{ display: 'block', marginTop: 18, fontSize: 11, color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Currency</label>
      <div style={{ marginTop: 7, border: '1px solid #cbd5e1', borderRadius: 13, padding: '3px 10px', background: '#f8fafc' }}>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} disabled={!rates.length} style={{ width: '100%', height: 39, border: 'none', outline: 'none', background: 'transparent', color: '#0f172a', fontSize: 13, fontWeight: 750 }}>
          {rates.map((r) => <option key={r.code} value={r.code}>{r.code}</option>)}
        </select>
      </div>

      <label style={{ display: 'block', marginTop: 16, fontSize: 11, color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {mode === 'buy' ? 'Amount in INR' : `Amount in ${selected}`}
      </label>
      <input type="number" min="0" step={mode === 'buy' ? '0.01' : '0.000001'} value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', height: 45, marginTop: 7, boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 13, outline: 'none', padding: '0 12px', fontSize: 14, fontWeight: 750, color: '#0f172a' }} />

      <div style={{ marginTop: 14, borderRadius: 15, padding: 15, background: mode === 'buy' ? '#eff6ff' : '#fef2f2', border: mode === 'buy' ? '1px solid #dbeafe' : '1px solid #fee2e2' }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>Trade Breakdown</div>
        <div style={{ marginTop: 10, display: 'grid', gap: 7, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Trade value</span><strong>{rateAvailable ? money(tradeValue) : '—'}</strong></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform fee (0.10%)</span><strong>{rateAvailable ? money(platformFee) : '—'}</strong></div>
          <div style={{ height: 1, background: mode === 'buy' ? '#dbeafe' : '#fee2e2' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 850 }}><span>{mode === 'buy' ? 'Total wallet debit' : 'Net wallet credit'}</span><strong>{rateAvailable ? money(mode === 'buy' ? totalDebit : netCredit) : '—'}</strong></div>
        </div>
        <div style={{ marginTop: 9, fontSize: 10, color: '#64748b' }}>
          {rateAvailable ? (mode === 'buy' ? `${preview.toFixed(4)} ${selected} received • 1 ${selected} = ${money(rate)}` : `${formatQuantity(numericalAmount)} ${selected} sold • 1 ${selected} = ${money(rate)}`) : 'Rate unavailable'}
        </div>
      </div>

      <button type="submit" disabled={submitting || !rateAvailable} style={{ width: '100%', height: 46, marginTop: 16, border: 'none', borderRadius: 13, background: mode === 'buy' ? (submitting || !rateAvailable ? '#93c5fd' : '#2563eb') : (submitting || !rateAvailable ? '#fca5a5' : '#dc2626'), color: '#ffffff', fontSize: 13, fontWeight: 850, cursor: submitting || !rateAvailable ? 'not-allowed' : 'pointer' }}>
        {!rateAvailable ? 'Rate Unavailable' : submitting ? 'Processing...' : mode === 'buy' ? `Buy ${selected}` : `Sell ${selected}`}
      </button>

      {message && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 11, background: isError ? '#fef2f2' : '#ecfdf5', border: isError ? '1px solid #fecaca' : '1px solid #bbf7d0', color: isError ? '#b91c1c' : '#047857', fontSize: 11, lineHeight: 1.5 }}>
          {message}
        </div>
      )}
    </form>
  );
}
