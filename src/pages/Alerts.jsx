import { useEffect, useState } from 'react';
import { alertsApi } from '../api/alertsApi';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [targetRate, setTargetRate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await alertsApi.getAlerts();
        if (cancelled) return;
        setAlerts(data || []);
      } catch {
        setAlerts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const createAlert = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!targetRate || Number(targetRate) <= 0) return setMessage('Enter a valid target rate.');
    setSubmitting(true);
    try {
      const res = await alertsApi.createAlert({ currencyCode, targetRate: Number(targetRate) });
      setAlerts((prev) => [...prev, res]);
      setTargetRate('');
      setMessage('Alert created successfully.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAlert = async (id) => {
    try {
      await alertsApi.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    }
  };

  if (loading) return <div className="loading">Loading alerts...</div>;

  return (
    <div>
      <header>
        <div>
          <p className="eyebrow">RATE ALERTS</p>
          <h1>Price alerts</h1>
        </div>
      </header>
      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">CREATE ALERT</p>
            <h2>Get notified when a rate is reached</h2>
          </div>
        </div>
        <form onSubmit={createAlert}>
          <label>
            Currency
            <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </label>
          <label>
            Target rate (INR)
            <input
              type="number"
              step="0.0001"
              min="0"
              value={targetRate}
              onChange={(e) => setTargetRate(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="trade-button" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create alert'}
          </button>
          {message && <p className={`message ${message.toLowerCase().includes('failed') ? 'error' : ''}`}>{message}</p>}
        </form>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">YOUR ALERTS</p>
            <h2>Active alerts</h2>
          </div>
        </div>
        {alerts.length === 0 ? (
          <p className="empty-state">No alerts yet.</p>
        ) : (
          <div>
            {alerts.map((a) => (
              <div className="transaction" key={a.id}>
                <div>
                  <strong>{a.currencyCode}</strong>
                  <small>{a.currencyName}</small>
                </div>
                <div className="rate-price">
                  <strong>Target: {a.targetRate}</strong>
                </div>
                <span className={a.triggered ? 'buy-badge' : 'sell-badge'}>{a.triggered ? 'Triggered' : 'Active'}</span>
                <button type="button" onClick={() => deleteAlert(a.id)} className="trade-button" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
