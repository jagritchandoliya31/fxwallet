import { useEffect, useState } from 'react';
import { ratesApi } from '../api/ratesApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function Market() {
  const [rates, setRates] = useState([]);
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await ratesApi.getAllRates();
        if (cancelled) return;
        setRates(data || []);
        if (data?.length) {
          setSelectedCode(data[0].code);
        }
      } catch {
        setRates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedCode) return;
    let cancelled = false;
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/rates/${selectedCode}/history`);
        const data = await res.json();
        if (cancelled) return;
        const mapped = (data || []).map((h) => ({
          time: new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rate: Number(h.rate),
        }));
        setHistory((prev) => ({ ...prev, [selectedCode]: mapped }));
      } catch {
        // ignore
      }
    };
    loadHistory();
    return () => { cancelled = true; };
  }, [selectedCode]);

  if (loading) return <div className="loading">Loading rates...</div>;

  return (
    <div>
      <header>
        <div>
          <p className="eyebrow">MARKET</p>
          <h1>Live exchange rates</h1>
        </div>
      </header>
      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">CURRENCIES</p>
            <h2>USD / EUR / GBP vs INR</h2>
          </div>
        </div>
        <div className="rate-list">
          {rates.map((r) => (
            <div className="rate-row" key={r.code}>
              <div className="currency-icon">{r.symbol}</div>
              <div>
                <strong>{r.code}/INR</strong>
                <small>{r.name}</small>
              </div>
              <div className="rate-price">
                <strong>{money(r.rate)}</strong>
                <small className={String(r.change).startsWith('+') ? 'positive' : 'negative'}>
                  {r.change}
                </small>
              </div>
              <button type="button" onClick={() => setSelectedCode(r.code)} className={selectedCode === r.code ? 'selected' : ''}>
                History
              </button>
            </div>
          ))}
        </div>
      </section>
      {selectedCode && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">RATE HISTORY</p>
              <h2>{selectedCode}/INR — last updates</h2>
            </div>
          </div>
          {history[selectedCode]?.length ? (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={history[selectedCode]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="#14734a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="empty-state">No history available yet. Rates will appear after the first update.</p>
          )}
        </section>
      )}
    </div>
  );
}
