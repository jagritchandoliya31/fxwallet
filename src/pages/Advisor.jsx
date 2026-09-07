import { useEffect, useState } from 'react';
import { advisorApi } from '../api/advisorApi';

export default function Advisor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('USD');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await advisorApi.getAdvisor(code);
        if (cancelled) return;
        setData(res);
      } catch {
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [code]);

  if (loading) return <div className="loading">Loading advisor...</div>;

  return (
    <div>
      <header>
        <div>
          <p className="eyebrow">SMART CURRENCY ADVISOR</p>
          <h1>Advisor</h1>
        </div>
      </header>
      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">SELECT CURRENCY</p>
            <h2>Choose a currency to analyze</h2>
          </div>
        </div>
        <label>
          Currency
          <select value={code} onChange={(e) => { setCode(e.target.value); setLoading(true); }}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </label>
      </section>
      {data && (
        <section className="stats">
          <article>
            <p>Current rate</p>
            <h2>{Number(data.currentRate).toFixed(4)}</h2>
          </article>
          <article>
            <p>Historical average</p>
            <h2>{Number(data.historicalAverage).toFixed(4)}</h2>
          </article>
          <article>
            <p>Recent change</p>
            <h2 className={Number(data.recentPercentageChange) >= 0 ? 'positive' : 'negative'}>
              {Number(data.recentPercentageChange).toFixed(2)}%
            </h2>
          </article>
          <article>
            <p>Trend</p>
            <h2>{data.trendDirection}</h2>
          </article>
          <article>
            <p>Momentum</p>
            <h2>{data.momentum}</h2>
          </article>
          <article>
            <p>Volatility</p>
            <h2>{data.volatility}</h2>
          </article>
          <article>
            <p>Score</p>
            <h2>{Number(data.score).toFixed(0)} / 100</h2>
          </article>
        </section>
      )}
      {data && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">DISCLAIMER</p>
              <h2>Important notice</h2>
            </div>
          </div>
          <p style={{ fontSize: 14, color: '#74839c', lineHeight: 1.6 }}>{data.disclaimer}</p>
        </section>
      )}
    </div>
  );
}
