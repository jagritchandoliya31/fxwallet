import { useEffect, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { walletApi } from './src/api/apiClient';
import { ratesApi } from './src/api/ratesApi';
import { portfolioApi } from './src/api/portfolioApi';
import { transactionApi } from './src/api/transactionApi';
import { alertsApi } from './src/api/alertsApi';
import { advisorApi } from './src/api/advisorApi';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);

function LoginForm({ mode }) {
  const { login, register, error, setError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch {
      // error handled in context
    }
  };

  return (
    <div className="panel auth-panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">{mode === 'register' ? 'GET STARTED' : 'WELCOME BACK'}</p>
          <h2>{mode === 'register' ? 'Create an account' : 'Sign in to FXWallet'}</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <label>
            Name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        {error && <p className="message error">{error}</p>}
        <button type="submit" className="trade-button" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'register' ? 'Register' : 'Sign In'}
        </button>
        <p className="switch-text">
          {mode === 'register' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <Link to={mode === 'register' ? '/login' : '/register'}>{mode === 'register' ? 'Sign in' : 'Register'}</Link>
        </p>
      </form>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [rates, setRates] = useState(defaultRates);
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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
        if (ratesRes && ratesRes.length) {
          const map = {};
          ratesRes.forEach((r) => {
            map[r.code] = { name: r.name, symbol: r.symbol, rate: Number(r.rate), change: r.change };
          });
          setRates(map);
        }
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

  const portfolioValue = portfolio?.totalPortfolioValue || 0;
  const profit = portfolio?.totalProfitLoss || 0;

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
          <h2>{money(portfolioValue)}</h2>
          <span className="positive">↑ 1.67% this month</span>
        </article>
        <article>
          <p>Overall profit / loss</p>
          <h2 className={profit >= 0 ? 'positive' : 'negative'}>
            {profit >= 0 ? '+' : ''}{money(profit)}
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
            <button>View all</button>
          </div>
          {Object.entries(rates).map(([code, item]) => (
            <div className="rate-row" key={code}>
              <div className="currency-icon">{item.symbol}</div>
              <div>
                <strong>{code}/INR</strong>
                <small>{item.name}</small>
              </div>
              <div className="rate-price">
                <strong>{money(item.rate)}</strong>
                <small className={item.change.startsWith('+') ? 'positive' : 'negative'}>
                  {item.change}
                </small>
              </div>
            </div>
          ))}
        </div>
        <TradePanel rates={rates} onTradeComplete={() => {}} />
      </section>
      <section className="panel holdings" id="portfolio">
        <div className="panel-title">
          <div>
            <p className="eyebrow">PORTFOLIO</p>
            <h2>Your holdings</h2>
          </div>
          <button>Full portfolio</button>
        </div>
        <div className="holding-grid">
          {portfolio?.holdings?.length ? (
            portfolio.holdings.map((h) => (
              <article key={h.code}>
                <div>
                  <span className="currency-icon">{h.symbol}</span>
                  <strong>{h.code}</strong>
                </div>
                <h3>{Number(h.quantity).toFixed(2)} {h.code}</h3>
                <p>{money(h.currentValue)}</p>
                <small className={h.profitLoss >= 0 ? 'positive' : 'negative'}>
                  {h.profitLoss >= 0 ? '+' : ''}{money(h.profitLoss)} P/L
                </small>
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
        </div>
        {transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          transactions.map((tx, index) => (
            <div className="transaction" key={`${tx.id}-${index}`}>
              <span className={tx.type === 'BUY' ? 'buy-badge' : 'sell-badge'}>{tx.type}</span>
              <strong>{tx.currencyCode}</strong>
              <span>{money(tx.inrAmount)}</span>
              <small>{new Date(tx.timestamp).toLocaleString()}</small>
            </div>
          ))
        )}
      </section>
    </>
  );
}

function TradePanel({ rates, onTradeComplete }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState('USD');
  const [amount, setAmount] = useState('10000');
  const [mode, setMode] = useState('buy');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numericalAmount = Number(amount) || 0;
  const rate = Number(rates[selected]?.rate || 0);
  const preview = mode === 'buy' ? numericalAmount / rate : numericalAmount * rate;

  const submitTrade = async (e) => {
    e.preventDefault();
    setMessage('');
    if (numericalAmount <= 0) return setMessage('Enter an amount greater than zero.');
    setSubmitting(true);
    try {
      if (mode === 'buy') {
        const res = await transactionApi.buy({ currencyCode: selected, amountInr: numericalAmount });
        setMessage(`Bought ${Number(res.quantity).toFixed(2)} ${selected} in your virtual portfolio.`);
      } else {
        const res = await transactionApi.sell({ currencyCode: selected, quantity: numericalAmount });
        setMessage(`Sold ${Number(res.quantity).toFixed(2)} ${selected}; ${money(res.inrAmount)} added to wallet.`);
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
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          {Object.keys(rates).map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
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
        {mode === 'buy' ? (
          <>You receive <strong>{preview.toFixed(2)} {selected}</strong></>
        ) : (
          <>You receive <strong>{money(preview)}</strong></>
        )}
        <small>Rate: 1 {selected} = {money(rate)}</small>
      </div>
      <button type="submit" className="trade-button" disabled={submitting}>
        {submitting ? 'Processing...' : mode === 'buy' ? `Buy ${selected}` : `Sell ${selected}`}
      </button>
      {message && <p className={`message ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('insufficient') ? 'error' : ''}`}>{message}</p>}
    </form>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand"><span>FX</span>Wallet</div>
          <p className="sim-label">VIRTUAL TRADING SIMULATOR</p>
          <nav>
            <Link className={location.pathname === '/' ? 'active' : ''} to="/">▦ Dashboard</Link>
            <Link className={location.pathname === '/login' ? 'active' : ''} to="/login">◉ Profile</Link>
          </nav>
          <div className="demo-note">
            Demo only<br />
            <strong>Not real currency or payments.</strong>
          </div>
        </aside>
        <main className="auth-main">
          <Routes>
            <Route path="/" element={<LoginForm mode="login" />} />
            <Route path="/login" element={<LoginForm mode="login" />} />
            <Route path="/register" element={<LoginForm mode="register" />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>FX</span>Wallet</div>
        <p className="sim-label">VIRTUAL TRADING SIMULATOR</p>
        <nav>
          <Link className="active" to="/">▦ Dashboard</Link>
          <Link to="/">◈ Portfolio</Link>
          <Link to="/">⇄ Buy & Sell</Link>
          <Link to="/">▤ Transactions</Link>
          <a href="#profile" onClick={(e) => { e.preventDefault(); logout(); }}>◉ Profile / Logout</a>
        </nav>
        <div className="demo-note">Demo only<br /><strong>Not real currency or payments.</strong></div>
      </aside>
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
