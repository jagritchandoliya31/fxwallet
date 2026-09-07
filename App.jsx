import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { walletApi } from './src/api/apiClient';
import { ratesApi } from './src/api/ratesApi';
import { portfolioApi } from './src/api/portfolioApi';
import { transactionApi } from './src/api/transactionApi';
import { alertsApi } from './src/api/alertsApi';
import { advisorApi } from './src/api/advisorApi';
import Dashboard from './src/pages/Dashboard';
import Market from './src/pages/Market';
import Portfolio from './src/pages/Portfolio';
import Transactions from './src/pages/Transactions';
import Alerts from './src/pages/Alerts';
import Advisor from './src/pages/Advisor';

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
          <Link className={location.pathname === '/' ? 'active' : ''} to="/">▦ Dashboard</Link>
          <Link className={location.pathname === '/market' ? 'active' : ''} to="/market">📈 Market</Link>
          <Link className={location.pathname === '/portfolio' ? 'active' : ''} to="/portfolio">◈ Portfolio</Link>
          <Link className={location.pathname === '/transactions' ? 'active' : ''} to="/transactions">▤ Transactions</Link>
          <Link className={location.pathname === '/alerts' ? 'active' : ''} to="/alerts">🔔 Alerts</Link>
          <Link className={location.pathname === '/advisor' ? 'active' : ''} to="/advisor">🧠 Advisor</Link>
          <a href="#profile" onClick={(e) => { e.preventDefault(); logout(); }}>◉ Profile / Logout</a>
        </nav>
        <div className="demo-note">Demo only<br /><strong>Not real currency or payments.</strong></div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/market" element={<Market />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/advisor" element={<Advisor />} />
        </Routes>
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
