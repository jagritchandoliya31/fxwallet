import { useEffect, useState } from 'react';
import { portfolioApi } from '../api/portfolioApi';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatQuantity = (value) => {
  const num = Number(value);
  if (Number.isInteger(num)) return String(num);
  return String(num).replace(/\.?0+$/, '');
};

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await portfolioApi.getPortfolio();
        if (cancelled) return;
        setPortfolio(data);
      } catch {
        setPortfolio(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="loading">Loading portfolio...</div>;

  return (
    <div>
      <header>
        <div>
          <p className="eyebrow">PORTFOLIO</p>
          <h1>Your holdings</h1>
        </div>
      </header>
      <section className="stats">
        <article>
          <p>Total portfolio value</p>
          <h2>{money(portfolio?.totalPortfolioValue)}</h2>
        </article>
        <article>
          <p>Total invested</p>
          <h2>{money(portfolio?.totalInvested)}</h2>
        </article>
        <article>
          <p>Overall profit / loss</p>
          <h2 className={portfolio?.totalProfitLoss >= 0 ? 'positive' : 'negative'}>
            {portfolio?.totalProfitLoss >= 0 ? '+' : ''}{money(portfolio?.totalProfitLoss)}
          </h2>
          <small>{portfolio?.profitLossPercentage?.toFixed(2)}%</small>
        </article>
      </section>
      <section className="panel">
        <div className="panel-title">
          <div>
            <p className="eyebrow">HOLDINGS</p>
            <h2>Current positions</h2>
          </div>
        </div>
        {portfolio?.holdings?.length ? (
          <div className="holding-grid">
            {portfolio.holdings.map((h) => (
              <article key={h.code}>
                <div>
                  <span className="currency-icon">{h.symbol}</span>
                  <strong>{h.code}</strong>
                </div>
                <h3>{formatQuantity(h.quantity)} {h.code}</h3>
                <p>{money(h.currentValue)}</p>
                <small className={h.profitLoss >= 0 ? 'positive' : 'negative'}>
                  {h.profitLoss >= 0 ? '+' : ''}{money(h.profitLoss)} P/L
                </small>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">No holdings yet. Start trading to build your portfolio.</p>
        )}
      </section>
    </div>
  );
}
