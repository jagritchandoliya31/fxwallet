import { useEffect, useState } from 'react';
import { walletApi } from '../api/apiClient';
import { ratesApi } from '../api/ratesApi';
import { portfolioApi } from '../api/portfolioApi';
import { transactionApi } from '../api/transactionApi';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [rates, setRates] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [walletRes, portfolioRes, txRes] = await Promise.all([
      walletApi.getWallet().catch(() => null),
      portfolioApi.getPortfolio().catch(() => null),
      transactionApi.getTransactions({ page: 0, size: 4 }).catch(() => ({ content: [] })),
    ]);
    if (walletRes) setWallet(walletRes);
    if (portfolioRes) setPortfolio(portfolioRes);
    if (txRes?.content) setTransactions(txRes.content);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [walletRes, ratesRes, portfolioRes, txRes] = await Promise.all([
          walletApi.getWallet().catch(() => null),
          ratesApi.getAllRates().catch(() => []),
          portfolioApi.getPortfolio().catch(() => null),
          transactionApi.getTransactions({ page: 0, size: 4 }).catch(() => ({ content: [] })),
        ]);
        if (cancelled) return;
        if (walletRes) setWallet(walletRes);
        if (ratesRes && ratesRes.length) setRates(ratesRes);
        if (portfolioRes) setPortfolio(portfolioRes);
        if (txRes?.content) setTransactions(txRes.content);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="loading">Loading...</div>;

  const portfolioValue = portfolio?.totalPortfolioValue;
  const profit = portfolio?.totalProfitLoss;

  return (
    <>
      <header>
        <div>
          <p className="eyebrow">GOOD MORNING</p>
          <h1>Your currency dashboard</h1>
        </div>
        <div className="avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
      </header>
      <section className="stats">
        <article>
          <p>Virtual INR wallet</p>
          <h2>{wallet ? money(wallet.balance) : '₹0'}</h2>
          <span>Available to trade</span>
        </article>
        <article>
          <p>Portfolio value</p>
          <h2>{portfolioValue == null ? 'Unavailable' : money(portfolioValue)}</h2>
          <span className="positive">↑ 1.67% this month</span>
        </article>
        <article>
          <p>Overall profit / loss</p>
          <h2 className={profit == null ? '' : profit >= 0 ? 'positive' : 'negative'}>
            {profit == null ? 'Unavailable' : `${profit >= 0 ? '+' : ''}${money(profit)}`}
          </h2>
          <span>Against your average buy rate</span>
        </article>
      </section>
      <section className="content-grid">
        <div className="panel market">
          <div className="panel-title">
            <div>
              <p className="eyebrow">MARKET</p>
              <h2>Live exchange rates</h2>
            </div>
            <Link to="/market" className="trade-button" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>View all</Link>
          </div>
          {rates.slice(0, 5).map((r) => (
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
            </div>
          ))}
        </div>
        <TradePanel rates={rates} onTradeComplete={refresh} />
      </section>
      <section className="panel holdings" id="portfolio">
        <div className="panel-title">
          <div>
            <p className="eyebrow">PORTFOLIO</p>
            <h2>Your holdings</h2>
          </div>
          <Link to="/portfolio" className="trade-button" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>Full portfolio</Link>
        </div>
        <div className="holding-grid">
          {portfolio?.holdings?.length ? (
            portfolio.holdings.map((h) => (
              <article key={h.code}>
                <div>
                  <span className="currency-icon">{h.symbol}</span>
                  <strong>{h.code}</strong>
                </div>
                <h3>{formatQuantity(h.quantity)} {h.code}</h3>
                {h.currentValue == null ? (
                  <p className="message error">Valuation unavailable</p>
                ) : (
                  <p>{money(h.currentValue)}</p>
                )}
                {h.profitLoss == null ? (
                  <small>Rate unavailable</small>
                ) : (
                  <small className={h.profitLoss >= 0 ? 'positive' : 'negative'}>
                    {h.profitLoss >= 0 ? '+' : ''}{money(h.profitLoss)} P/L
                  </small>
                )}
              </article>
            ))
          ) : (
            <p className="empty-state">No holdings yet. Start trading to build your portfolio.</p>
          )}
        </div>
      </section>
      <section className="panel transactions" id="transactions">
        <div className="panel-title">
          <div>
            <p className="eyebrow">ACTIVITY</p>
            <h2>Recent transactions</h2>
          </div>
          <Link to="/transactions" className="trade-button" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>View all</Link>
        </div>
        {transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          transactions.map((tx, index) => (
            <div className="transaction" key={`${tx.id}-${index}`}>
              <span className={tx.type === 'BUY' ? 'buy-badge' : 'sell-badge'}>{tx.type}</span>
              <div>
                <strong>{tx.currencyCode}</strong>
                <small>{tx.currencyName}</small>
              </div>
              <div className="rate-price">
                <strong>{money(tx.inrAmount)}</strong>
                  <small>{formatQuantity(tx.quantity)} units</small>
              </div>
              <small className={tx.realizedPl >= 0 ? 'positive' : 'negative'}>
                {tx.realizedPl >= 0 ? '+' : ''}{money(tx.realizedPl)}
              </small>
              <small>{new Date(tx.timestamp).toLocaleString()}</small>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function TradePanel({ rates, onTradeComplete }) {
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
    ? (mode === 'buy' ? numericalAmount / rate : numericalAmount * rate)
    : null;

  const submitTrade = async (e) => {
    e.preventDefault();
    if (submitting || !rateAvailable) return;
    setMessage('');
    const numericalAmount = Number(amount) || 0;
    if (numericalAmount <= 0) return setMessage('Enter an amount greater than zero.');
    setSubmitting(true);
    try {
      if (mode === 'buy') {
        const res = await transactionApi.buy({ currencyCode: selected, amountInr: numericalAmount });
        setMessage(`Bought ${formatQuantity(res.quantity)} ${selected} in your virtual portfolio.`);
      } else {
        const res = await transactionApi.sell({ currencyCode: selected, quantity: numericalAmount });
        setMessage(`Sold ${formatQuantity(res.quantity)} ${selected}; ${money(res.inrAmount)} added to wallet.`);
      }
      onTradeComplete?.();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Transaction failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="panel trade" id="trade" onSubmit={submitTrade}>
      <div className="panel-title">
        <div>
          <p className="eyebrow">QUICK TRADE</p>
          <h2>Buy or sell currency</h2>
        </div>
      </div>
      <div className="tabs">
        <button type="button" onClick={() => setMode('buy')} className={mode === 'buy' ? 'selected' : ''}>
          Buy
        </button>
        <button type="button" onClick={() => setMode('sell')} className={mode === 'sell' ? 'selected' : ''}>
          Sell
        </button>
      </div>
      <label>
        Currency
        {rates.length === 0 ? (
          <p className="message error">Exchange rates unavailable.</p>
        ) : (
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {rates.map((r) => (
              <option key={r.code} value={r.code}>
                {r.code}
              </option>
            ))}
          </select>
        )}
      </label>
      <label>
        {mode === 'buy' ? 'Amount in INR' : `Amount in ${selected}`}
        <input
          type="number"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <div className="calculation">
        {!rateAvailable ? (
          <p className="message error">Exchange rate unavailable.</p>
        ) : mode === 'buy' ? (
          <>You receive <strong>{preview.toFixed(2)} {selected}</strong></>
        ) : (
          <>You receive <strong>{money(preview)}</strong></>
        )}
        {rateAvailable && <small>Rate: 1 {selected} = {money(rate)}</small>}
      </div>
      <button type="submit" className="trade-button" disabled={submitting || !rateAvailable}>
        {!rateAvailable ? 'Rate unavailable' : submitting ? 'Processing...' : mode === 'buy' ? `Buy ${selected}` : `Sell ${selected}`}
      </button>
      {message && <p className={`message ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('insufficient') ? 'error' : ''}`}>{message}</p>}
    </form>
  );
}
