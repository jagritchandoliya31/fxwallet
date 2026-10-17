import { useEffect, useMemo, useState } from 'react';
import { walletApi } from '../api/apiClient';
import { ratesApi } from '../api/ratesApi';
import { portfolioApi } from '../api/portfolioApi';
import { transactionApi } from '../api/transactionApi';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FeeTradePanel from '../components/FeeTradePanel';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatQuantity = (value) => {
  const num = Number(value);

  if (!Number.isFinite(num)) {
    return '0';
  }

  if (Number.isInteger(num)) {
    return String(num);
  }

  return String(num).replace(/\.?0+$/, '');
};

const currencyFlags = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  AED: '🇦🇪',
  JPY: '🇯🇵',
  AUD: '🇦🇺',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  SGD: '🇸🇬',
  CNY: '🇨🇳',
  SAR: '🇸🇦',
  HKD: '🇭🇰',
  NZD: '🇳🇿',
};

function flagFor(code) {
  return currencyFlags[String(code || '').toUpperCase()] || '💱';
}

function changeIsPositive(change) {
  return String(change || '').trim().startsWith('+');
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '—';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Badge({ children, positive = true }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 8px',
        borderRadius: 999,
        background: positive ? '#ecfdf5' : '#fef2f2',
        border: positive
          ? '1px solid #bbf7d0'
          : '1px solid #fecaca',
        color: positive ? '#047857' : '#b91c1c',
        fontSize: 10,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  caption,
  accent = '#2563eb',
}) {
  return (
    <article
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 18,
        padding: 19,
        boxShadow: '0 8px 25px rgba(15,23,42,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${accent}12`,
            color: accent,
            fontSize: 18,
          }}
        >
          {icon}
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}
        >
          FXWallet
        </div>
      </div>

      <div
        style={{
          marginTop: 15,
          fontSize: 11,
          color: '#64748b',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 25,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          color: '#0f172a',
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 5,
          fontSize: 11,
          color: '#94a3b8',
        }}
      >
        {caption}
      </div>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 15,
        marginBottom: 17,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            color: '#64748b',
            fontWeight: 800,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
          }}
        >
          {eyebrow}
        </div>

        <h2
          style={{
            margin: '5px 0 0',
            fontSize: 20,
            fontWeight: 850,
            color: '#0f172a',
          }}
        >
          {title}
        </h2>
      </div>

      {action}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [wallet, setWallet] = useState(null);
  const [rates, setRates] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      const [
        walletRes,
        ratesRes,
        portfolioRes,
        txRes,
      ] = await Promise.all([
        walletApi.getWallet().catch(() => null),
        ratesApi.getAllRates().catch(() => []),
        portfolioApi.getPortfolio().catch(() => null),
        transactionApi
          .getTransactions({
            page: 0,
            size: 4,
          })
          .catch(() => ({ content: [] })),
      ]);

      if (walletRes) {
        setWallet(walletRes);
      }

      if (ratesRes) {
        setRates(ratesRes);
      }

      if (portfolioRes) {
        setPortfolio(portfolioRes);
      }

      if (txRes?.content) {
        setTransactions(txRes.content);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleTradeComplete = async () => {
    await loadDashboard();
  };

  const portfolioValue = Number(
    portfolio?.totalPortfolioValue || 0
  );

  const profit = Number(
    portfolio?.totalProfitLoss || 0
  );

  const holdingCount = portfolio?.holdings?.length || 0;

  const marketCurrencies = useMemo(
    () => rates.slice(0, 6),
    [rates]
  );

  const topHolding = useMemo(() => {
    if (!portfolio?.holdings?.length) {
      return null;
    }

    return [...portfolio.holdings].sort(
      (a, b) =>
        Number(b.currentValue || 0) -
        Number(a.currentValue || 0)
    )[0];
  }, [portfolio]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#64748b',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: '4px solid #dbeafe',
            borderTopColor: '#2563eb',
            animation:
              'dashboardSpin 0.8s linear infinite',
          }}
        />

        <div
          style={{
            marginTop: 16,
            fontSize: 15,
            fontWeight: 750,
            color: '#334155',
          }}
        >
          Preparing your dashboard...
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          Loading wallet, market and portfolio data
        </div>

        <style>
          {`
            @keyframes dashboardSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100%',
        padding: 28,
        background:
          'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        color: '#0f172a',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 23,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 11px',
              borderRadius: 999,
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.07em',
              marginBottom: 10,
            }}
          >
            📊 PERSONAL DASHBOARD
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 31,
              fontWeight: 900,
              letterSpacing: '-0.04em',
            }}
          >
            Welcome back
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              color: '#64748b',
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            Track your virtual wallet, portfolio and
            currency market activity from one place.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
          }}
        >
          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            style={{
              height: 40,
              padding: '0 13px',
              borderRadius: 11,
              border: '1px solid #dbeafe',
              background: '#ffffff',
              color: '#1d4ed8',
              fontSize: 12,
              fontWeight: 800,
              cursor: refreshing
                ? 'not-allowed'
                : 'pointer',
              opacity: refreshing ? 0.65 : 1,
            }}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>

          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background:
                'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 850,
              boxShadow:
                '0 8px 18px rgba(37,99,235,0.22)',
            }}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        className="dashboard-hero"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 1.45fr) minmax(270px, 0.7fr)',
          gap: 16,
          marginBottom: 18,
        }}
      >
        {/* WALLET HERO */}
        <div
          style={{
            borderRadius: 22,
            padding: 25,
            color: '#ffffff',
            background:
              'linear-gradient(135deg, #0f172a 0%, #172554 65%, #1e3a8a 100%)',
            boxShadow:
              '0 18px 40px rgba(15,23,42,0.16)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 210,
              height: 210,
              borderRadius: '50%',
              background:
                'rgba(59,130,246,0.12)',
              right: -65,
              top: -75,
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              borderRadius: '50%',
              border:
                '1px solid rgba(148,163,184,0.14)',
              right: 40,
              bottom: -60,
            }}
          />

          <div
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
          <div>
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.08em',
                lineHeight: 1.4,
              }}
            >
              Virtual Wallet Balance
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 40,
                lineHeight: 1.15,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                fontVariantNumeric: 'tabular-nums',
                color: '#f8fafc',
              }}
            >
              {wallet
                ? money(wallet.balance)
                : '₹0.00'}
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: '#cbd5e1',
              }}
            >
              Available INR balance for simulation trading
            </div>
          </div>

            <div
              style={{
                minWidth: 120,
                padding: '11px 13px',
                borderRadius: 14,
                background:
                  'rgba(255,255,255,0.08)',
                border:
                  '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                }}
              >
                Portfolio
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 17,
                  fontWeight: 850,
                }}
              >
                {money(portfolioValue)}
              </div>
            </div>
          </div>

          <div
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginTop: 25,
            }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 13,
                background:
                  'rgba(255,255,255,0.06)',
                border:
                  '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: '#94a3b8',
                }}
              >
                Holdings
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 18,
                  fontWeight: 850,
                }}
              >
                {holdingCount}
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 13,
                background:
                  'rgba(255,255,255,0.06)',
                border:
                  '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: '#94a3b8',
                }}
              >
                Trades
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 18,
                  fontWeight: 850,
                }}
              >
                {transactions.length}
                <span
                  style={{
                    fontSize: 10,
                    marginLeft: 4,
                    color: '#94a3b8',
                    fontWeight: 600,
                  }}
                >
                  recent
                </span>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 13,
                background:
                  'rgba(255,255,255,0.06)',
                border:
                  '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: '#94a3b8',
                }}
              >
                Market Rates
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 18,
                  fontWeight: 850,
                }}
              >
                {rates.length}
              </div>
            </div>
          </div>
        </div>

        {/* PORTFOLIO SNAPSHOT */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 22,
            padding: 22,
            boxShadow:
              '0 10px 28px rgba(15,23,42,0.045)',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: '#64748b',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Portfolio Snapshot
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 29,
              fontWeight: 900,
              letterSpacing: '-0.03em',
            }}
          >
            {money(portfolioValue)}
          </div>

          <div
            style={{
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 9px',
              borderRadius: 999,
              background:
                profit >= 0 ? '#ecfdf5' : '#fef2f2',
              color:
                profit >= 0 ? '#047857' : '#b91c1c',
              border:
                profit >= 0
                  ? '1px solid #bbf7d0'
                  : '1px solid #fecaca',
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {profit >= 0 ? '▲' : '▼'}{' '}
            {profit >= 0 ? '+' : ''}
            {money(profit)} P/L
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 17,
              borderTop: '1px solid #eef2f7',
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: '#94a3b8',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Largest Holding
            </div>

            {topHolding ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  marginTop: 10,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 13,
                    background: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 19,
                  }}
                >
                  {flagFor(topHolding.code)}
                </div>

                <div>
                  <div
                    style={{
                      fontWeight: 850,
                      fontSize: 15,
                    }}
                  >
                    {topHolding.code}
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      color: '#94a3b8',
                      fontSize: 11,
                    }}
                  >
                    {formatQuantity(
                      topHolding.quantity
                    )}{' '}
                    units
                  </div>
                </div>

                <div
                  style={{
                    marginLeft: 'auto',
                    fontWeight: 850,
                    fontSize: 14,
                  }}
                >
                  {money(
                    topHolding.currentValue
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  color: '#94a3b8',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                No currency holdings yet.
              </div>
            )}
          </div>

          <Link
            to="/portfolio"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              marginTop: 18,
              height: 39,
              borderRadius: 11,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              textDecoration: 'none',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Open Portfolio →
          </Link>
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section
        className="dashboard-summary-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <SummaryCard
          icon="💰"
          label="Wallet"
          value={wallet ? money(wallet.balance) : '₹0'}
          caption="Available to trade"
        />

        <SummaryCard
          icon="📈"
          label="Portfolio Value"
          value={money(portfolioValue)}
          caption="Current value of holdings"
          accent="#7c3aed"
        />

        <SummaryCard
          icon={profit >= 0 ? '🟢' : '🔴'}
          label="Overall P/L"
          value={`${profit >= 0 ? '+' : ''}${money(profit)}`}
          caption="Against average buy rate"
          accent={profit >= 0 ? '#059669' : '#dc2626'}
        />

        <SummaryCard
          icon="🌎"
          label="Markets Tracked"
          value={rates.length}
          caption="Available currency rates"
          accent="#0891b2"
        />
      </section>

      {/* MARKET + TRADE */}
      <section
        className="dashboard-market-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 1.15fr) minmax(330px, 0.85fr)',
          gap: 18,
          alignItems: 'start',
          marginBottom: 20,
        }}
      >
        {/* MARKET */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 22,
            padding: 22,
            boxShadow:
              '0 10px 28px rgba(15,23,42,0.045)',
          }}
        >
          <SectionHeader
            eyebrow="MARKET"
            title="Live exchange rates"
            action={
              <Link
                to="/market"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: 36,
                  padding: '0 12px',
                  borderRadius: 10,
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  color: '#1d4ed8',
                  textDecoration: 'none',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                View Market →
              </Link>
            }
          />

          {marketCurrencies.length === 0 ? (
            <div
              style={{
                minHeight: 250,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  marginBottom: 10,
                }}
              >
                📡
              </div>

              <div
                style={{
                  fontSize: 14,
                  fontWeight: 750,
                  color: '#475569',
                }}
              >
                Market data unavailable
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 11,
                }}
              >
                Exchange rates will appear here
                when available.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {marketCurrencies.map((rate) => {
                const positive =
                  changeIsPositive(rate.change);

                return (
                  <div
                    key={rate.code}
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'auto minmax(0, 1fr) auto',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 12px',
                      borderRadius: 14,
                      background: '#f8fafc',
                      border:
                        '1px solid #eef2f7',
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        background: '#ffffff',
                        border:
                          '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'center',
                        fontSize: 19,
                      }}
                    >
                      {flagFor(rate.code)}
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 850,
                          color: '#0f172a',
                        }}
                      >
                        {rate.code} / INR
                      </div>

                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 10,
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow:
                            'ellipsis',
                        }}
                      >
                        {rate.name}
                      </div>
                    </div>

                    <div
                      style={{
                        textAlign: 'right',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 850,
                          color: '#0f172a',
                        }}
                      >
                        {money(rate.rate)}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          color: positive
                            ? '#15803d'
                            : '#dc2626',
                        }}
                      >
                        {rate.change}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* TRADE PANEL */}
        <FeeTradePanel
          rates={rates}
          onTradeComplete={handleTradeComplete}
          walletBalance={wallet?.balance}
        />
      </section>

      {/* HOLDINGS */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 22,
          padding: 22,
          boxShadow:
            '0 10px 28px rgba(15,23,42,0.045)',
          marginBottom: 20,
        }}
      >
        <SectionHeader
          eyebrow="PORTFOLIO"
          title="Your holdings"
          action={
            <Link
              to="/portfolio"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 36,
                padding: '0 12px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#334155',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              Full Portfolio →
            </Link>
          }
        />

        {portfolio?.holdings?.length ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 12,
            }}
          >
            {portfolio.holdings.map((holding) => {
              const holdingProfit =
                holding.profitLoss == null
                  ? null
                  : Number(holding.profitLoss);

              return (
                <article
                  key={holding.code}
                  style={{
                    border:
                      '1px solid #e2e8f0',
                    borderRadius: 17,
                    padding: 16,
                    background:
                      'linear-gradient(180deg, #ffffff, #f8fafc)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 19,
                      }}
                    >
                      {flagFor(holding.code)}
                    </div>

                    <div>
                      <div
                        style={{
                          fontWeight: 850,
                          fontSize: 15,
                        }}
                      >
                        {holding.code}
                      </div>

                      <div
                        style={{
                          marginTop: 2,
                          fontSize: 10,
                          color: '#94a3b8',
                        }}
                      >
                        {holding.symbol ||
                          holding.currencyName ||
                          'Currency'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 17,
                      fontSize: 22,
                      fontWeight: 900,
                    }}
                  >
                    {formatQuantity(
                      holding.quantity
                    )}{' '}
                    {holding.code}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: '#94a3b8',
                    }}
                  >
                    Current quantity
                  </div>

                  <div
                    style={{
                      marginTop: 15,
                      paddingTop: 13,
                      borderTop:
                        '1px solid #eef2f7',
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems: 'flex-end',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#94a3b8',
                          textTransform:
                            'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Value
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 14,
                          fontWeight: 850,
                        }}
                      >
                        {holding.currentValue ==
                        null
                          ? '—'
                          : money(
                              holding.currentValue
                            )}
                      </div>
                    </div>

                    {holdingProfit == null ? (
                      <Badge positive={false}>
                        Rate unavailable
                      </Badge>
                    ) : (
                      <Badge
                        positive={
                          holdingProfit >= 0
                        }
                      >
                        {holdingProfit >= 0
                          ? '+'
                          : ''}
                        {money(holdingProfit)}
                      </Badge>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              minHeight: 180,
              border:
                '1px dashed #cbd5e1',
              borderRadius: 16,
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center',
              flexDirection: 'column',
              textAlign: 'center',
              padding: 25,
            }}
          >
            <div
              style={{
                fontSize: 28,
                marginBottom: 10,
              }}
            >
              💼
            </div>

            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: '#334155',
              }}
            >
              No holdings yet
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 11,
                color: '#94a3b8',
              }}
            >
              Use Quick Trade to build your
              virtual currency portfolio.
            </div>
          </div>
        )}
      </section>

      {/* RECENT ACTIVITY */}
      <section
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 22,
          padding: 22,
          boxShadow:
            '0 10px 28px rgba(15,23,42,0.045)',
        }}
      >
        <SectionHeader
          eyebrow="ACTIVITY"
          title="Recent transactions"
          action={
            <Link
              to="/transactions"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 36,
                padding: '0 12px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#334155',
                textDecoration: 'none',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              View All →
            </Link>
          }
        />

        {transactions.length === 0 ? (
          <div
            style={{
              minHeight: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 28,
                marginBottom: 9,
              }}
            >
              🧾
            </div>

            <div
              style={{
                fontSize: 14,
                fontWeight: 750,
                color: '#475569',
              }}
            >
              No transactions yet
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 11,
              }}
            >
              Your recent trading activity will
              appear here.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {transactions.map((tx, index) => {
              const isBuy = tx.type === 'BUY';

              return (
                <div
                  key={`${tx.id}-${index}`}
                  className="dashboard-transaction-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'auto minmax(0, 1fr) auto auto',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 13px',
                    borderRadius: 14,
                    background: '#f8fafc',
                    border:
                      '1px solid #eef2f7',
                  }}
                >
                  <Badge positive={isBuy}>
                    {isBuy ? 'BUY' : 'SELL'}
                  </Badge>

                  <div
                    style={{
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 16,
                        }}
                      >
                        {flagFor(
                          tx.currencyCode
                        )}
                      </span>

                      <strong
                        style={{
                          fontSize: 13,
                        }}
                      >
                        {tx.currencyCode}
                      </strong>
                    </div>

                    <small
                      style={{
                        display: 'block',
                        marginTop: 2,
                        color: '#94a3b8',
                        fontSize: 10,
                      }}
                    >
                      {tx.currencyName}
                    </small>
                  </div>

                  <div
                    style={{
                      textAlign: 'right',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 850,
                      }}
                    >
                      {money(tx.inrAmount)}
                    </div>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 10,
                        color: '#94a3b8',
                      }}
                    >
                      {formatQuantity(
                        tx.quantity
                      )}{' '}
                      units
                    </div>
                  </div>

                  <div
                    style={{
                      textAlign: 'right',
                      minWidth: 105,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: '#94a3b8',
                      }}
                    >
                      P/L
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 11,
                        fontWeight: 800,
                        color:
                          Number(tx.realizedPl) >=
                          0
                            ? '#15803d'
                            : '#dc2626',
                      }}
                    >
                      {Number(tx.realizedPl) >=
                      0
                        ? '+'
                        : ''}
                      {money(tx.realizedPl)}
                    </div>

                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 9,
                        color: '#94a3b8',
                      }}
                    >
                      {formatTimestamp(
                        tx.timestamp
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function TradePanel({
  rates,
  onTradeComplete,
  walletBalance,
}) {
  const [selected, setSelected] = useState('USD');
  const [amount, setAmount] = useState('10000');
  const [mode, setMode] = useState('buy');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numericalAmount =
    Number(amount) || 0;

  const selectedRate = rates.find(
    (r) => r.code === selected
  );

  const rate = selectedRate
    ? Number(selectedRate.rate)
    : NaN;

  const rateAvailable =
    Number.isFinite(rate) && rate > 0;

  const preview = rateAvailable
    ? mode === 'buy'
      ? numericalAmount / rate
      : numericalAmount * rate
    : null;

  const selectedFlag = flagFor(selected);

  const submitTrade = async (e) => {
    e.preventDefault();

    if (submitting || !rateAvailable) {
      return;
    }

    setMessage('');

    const amountValue =
      Number(amount) || 0;

    if (amountValue <= 0) {
      setMessage(
        'Enter an amount greater than zero.'
      );
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'buy') {
        if (
          Number.isFinite(
            Number(walletBalance)
          ) &&
          amountValue >
            Number(walletBalance)
        ) {
          setMessage(
            'Insufficient wallet balance.'
          );
          setSubmitting(false);
          return;
        }

        const res =
          await transactionApi.buy({
            currencyCode: selected,
            amountInr: amountValue,
          });

        setMessage(
          `Bought ${formatQuantity(
            res.quantity
          )} ${selected} in your virtual portfolio.`
        );
      } else {
        const res =
          await transactionApi.sell({
            currencyCode: selected,
            quantity: amountValue,
          });

        setMessage(
          `Sold ${formatQuantity(
            res.quantity
          )} ${selected}; ${money(
            res.inrAmount
          )} added to wallet.`
        );
      }

      await onTradeComplete?.();
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          'Transaction failed. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isError =
    message.toLowerCase().includes('failed') ||
    message
      .toLowerCase()
      .includes('insufficient') ||
    message
      .toLowerCase()
      .includes('unavailable');

  return (
    <form
      onSubmit={submitTrade}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 22,
        padding: 22,
        boxShadow:
          '0 10px 28px rgba(15,23,42,0.045)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'flex-start',
          gap: 15,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: '#2563eb',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Quick Trade
          </div>

          <h2
            style={{
              margin: '5px 0 0',
              fontSize: 20,
              fontWeight: 850,
            }}
          >
            Buy or sell currency
          </h2>
        </div>

        <div
          style={{
            padding: '7px 9px',
            borderRadius: 10,
            background: '#f8fafc',
            color: '#64748b',
            fontSize: 10,
            fontWeight: 750,
          }}
        >
          VIRTUAL
        </div>
      </div>

      {/* BUY / SELL */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            '1fr 1fr',
          gap: 5,
          marginTop: 18,
          padding: 5,
          background: '#f1f5f9',
          borderRadius: 13,
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMode('buy');
            setMessage('');
          }}
          style={{
            border: 'none',
            height: 38,
            borderRadius: 9,
            background:
              mode === 'buy'
                ? '#ffffff'
                : 'transparent',
            color:
              mode === 'buy'
                ? '#047857'
                : '#64748b',
            fontSize: 12,
            fontWeight: 850,
            cursor: 'pointer',
            boxShadow:
              mode === 'buy'
                ? '0 3px 10px rgba(15,23,42,0.07)'
                : 'none',
          }}
        >
          Buy
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('sell');
            setMessage('');
          }}
          style={{
            border: 'none',
            height: 38,
            borderRadius: 9,
            background:
              mode === 'sell'
                ? '#ffffff'
                : 'transparent',
            color:
              mode === 'sell'
                ? '#dc2626'
                : '#64748b',
            fontSize: 12,
            fontWeight: 850,
            cursor: 'pointer',
            boxShadow:
              mode === 'sell'
                ? '0 3px 10px rgba(15,23,42,0.07)'
                : 'none',
          }}
        >
          Sell
        </button>
      </div>

      {/* CURRENCY */}
      <label
        style={{
          display: 'block',
          marginTop: 18,
          fontSize: 11,
          color: '#475569',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Currency
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          marginTop: 7,
          border: '1px solid #cbd5e1',
          borderRadius: 13,
          padding: '3px 10px',
          background: '#f8fafc',
        }}
      >
        <span
          style={{
            fontSize: 19,
          }}
        >
          {selectedFlag}
        </span>

        <select
          value={selected}
          onChange={(e) =>
            setSelected(e.target.value)
          }
          disabled={!rates.length}
          style={{
            width: '100%',
            height: 39,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: '#0f172a',
            fontSize: 13,
            fontWeight: 750,
          }}
        >
          {rates.map((r) => (
            <option
              key={r.code}
              value={r.code}
            >
              {r.code}
            </option>
          ))}
        </select>
      </div>

      {/* INPUT */}
      <label
        style={{
          display: 'block',
          marginTop: 16,
          fontSize: 11,
          color: '#475569',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {mode === 'buy'
          ? 'Amount in INR'
          : `Amount in ${selected}`}
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 7,
          border: '1px solid #cbd5e1',
          borderRadius: 13,
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            height: 45,
            minWidth: 48,
            padding: '0 11px',
            borderRight:
              '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {mode === 'buy'
            ? '₹'
            : selected}
        </div>

        <input
          type="number"
          min="0"
          step={
            mode === 'buy'
              ? '0.01'
              : '0.000001'
          }
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
          style={{
            width: '100%',
            height: 45,
            border: 'none',
            outline: 'none',
            padding: '0 12px',
            fontSize: 14,
            fontWeight: 750,
            color: '#0f172a',
          }}
        />
      </div>

      {/* PREVIEW */}
      <div
        style={{
          marginTop: 14,
          borderRadius: 15,
          padding: 15,
          background:
            mode === 'buy'
              ? '#eff6ff'
              : '#fef2f2',
          border:
            mode === 'buy'
              ? '1px solid #dbeafe'
              : '1px solid #fee2e2',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 800,
          }}
        >
          Estimated Result
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 20,
            fontWeight: 900,
            color:
              mode === 'buy'
                ? '#1d4ed8'
                : '#b91c1c',
          }}
        >
          {!rateAvailable
            ? 'Rate unavailable'
            : mode === 'buy'
              ? `${preview.toFixed(4)} ${selected}`
              : money(preview)}
        </div>

        {rateAvailable && (
          <div
            style={{
              marginTop: 5,
              fontSize: 10,
              color: '#64748b',
            }}
          >
            1 {selected} ={' '}
            {money(rate)}
          </div>
        )}
      </div>

      {/* BUTTON */}
      <button
        type="submit"
        disabled={
          submitting || !rateAvailable
        }
        style={{
          width: '100%',
          height: 46,
          marginTop: 16,
          border: 'none',
          borderRadius: 13,
          background:
            mode === 'buy'
              ? submitting ||
                !rateAvailable
                ? '#93c5fd'
                : '#2563eb'
              : submitting ||
                !rateAvailable
                ? '#fca5a5'
                : '#dc2626',
          color: '#ffffff',
          fontSize: 13,
          fontWeight: 850,
          cursor:
            submitting ||
            !rateAvailable
              ? 'not-allowed'
              : 'pointer',
          boxShadow:
            submitting ||
            !rateAvailable
              ? 'none'
              : mode === 'buy'
                ? '0 8px 18px rgba(37,99,235,0.20)'
                : '0 8px 18px rgba(220,38,38,0.18)',
        }}
      >
        {!rateAvailable
          ? 'Rate Unavailable'
          : submitting
            ? 'Processing...'
            : mode === 'buy'
              ? `Buy ${selected}`
              : `Sell ${selected}`}
      </button>

      {message && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 11,
            background: isError
              ? '#fef2f2'
              : '#ecfdf5',
            border: isError
              ? '1px solid #fecaca'
              : '1px solid #bbf7d0',
            color: isError
              ? '#b91c1c'
              : '#047857',
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      )}
    </form>
  );
}