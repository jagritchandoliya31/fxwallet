import { useEffect, useMemo, useState } from 'react';
import { portfolioApi } from '../api/portfolioApi';

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

function getFlag(code) {
  return (
    currencyFlags[String(code || '').toUpperCase()] ||
    '💱'
  );
}

function StatCard({
  icon,
  label,
  value,
  caption,
  accent = '#2563eb',
  valueColor = '#0f172a',
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
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 13,
            background: `${accent}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            fontSize: 18,
          }}
        >
          {icon}
        </div>

        <div
          style={{
            fontSize: 10,
            color: '#94a3b8',
            fontWeight: 800,
            letterSpacing: '0.07em',
            textTransform: 'uppercase',
          }}
        >
          Portfolio
        </div>
      </div>

      <div
        style={{
          marginTop: 15,
          fontSize: 11,
          color: '#64748b',
          fontWeight: 750,
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
          fontWeight: 800,
          letterSpacing: '-0.025em',
          color: valueColor,
          fontVariantNumeric: 'tabular-nums',
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

function PerformanceBadge({ profit }) {
  if (profit == null) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '6px 9px',
          borderRadius: 999,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          color: '#64748b',
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        Rate unavailable
      </span>
    );
  }

  const positive = Number(profit) >= 0;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 9px',
        borderRadius: 999,
        background: positive ? '#ecfdf5' : '#fef2f2',
        border: positive
          ? '1px solid #bbf7d0'
          : '1px solid #fecaca',
        color: positive ? '#047857' : '#b91c1c',
        fontSize: 10,
        fontWeight: 850,
      }}
    >
      {positive ? '↗' : '↘'} {positive ? '+' : ''}
      {money(profit)}
    </span>
  );
}

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPortfolio = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      setError('');

      const data = await portfolioApi.getPortfolio();

      setPortfolio(data);
    } catch (err) {
      console.error('Portfolio loading error:', err);

      setPortfolio(null);
      setError('Unable to load portfolio data right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, []);

  const holdings = portfolio?.holdings || [];

  const totalValue = Number(
    portfolio?.totalPortfolioValue || 0
  );

  const totalInvested = Number(
    portfolio?.totalInvested || 0
  );

  const totalProfitLoss =
    portfolio?.totalProfitLoss == null
      ? null
      : Number(portfolio.totalProfitLoss);

  const profitLossPercentage =
    portfolio?.profitLossPercentage == null
      ? null
      : Number(portfolio.profitLossPercentage);

  const calculatedAllocation = useMemo(() => {
    return holdings.map((holding) => {
      const value = Number(holding.currentValue || 0);

      const percentage =
        totalValue > 0
          ? (value / totalValue) * 100
          : 0;

      return {
        ...holding,
        allocationPercentage: percentage,
      };
    });
  }, [holdings, totalValue]);

  const largestHolding = useMemo(() => {
    if (!calculatedAllocation.length) {
      return null;
    }

    return [...calculatedAllocation].sort(
      (a, b) =>
        Number(b.currentValue || 0) -
        Number(a.currentValue || 0)
    )[0];
  }, [calculatedAllocation]);

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
              'portfolioSpin 0.8s linear infinite',
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
          Loading your portfolio...
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          Calculating your current holdings
        </div>

        <style>
          {`
            @keyframes portfolioSpin {
              from {
                transform: rotate(0deg);
              }

              to {
                transform: rotate(360deg);
              }
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
            💼 PORTFOLIO
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 31,
              fontWeight: 850,
              letterSpacing: '-0.035em',
            }}
          >
            Your Portfolio
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              color: '#64748b',
              fontSize: 14,
              lineHeight: 1.55,
              maxWidth: 640,
            }}
          >
            Monitor your virtual currency positions,
            portfolio value and profit or loss.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadPortfolio(true)}
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
            cursor: refreshing ? 'not-allowed' : 'pointer',
            opacity: refreshing ? 0.65 : 1,
          }}
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </header>

      {/* ERROR */}
      {error && (
        <div
          style={{
            marginBottom: 18,
            padding: '12px 14px',
            borderRadius: 13,
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {/* HERO */}
      <section
        className="portfolio-hero"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 1.45fr) minmax(270px, 0.75fr)',
          gap: 16,
          marginBottom: 18,
        }}
      >
        {/* PORTFOLIO VALUE */}
        <div
          className="portfolio-value-card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 22,
            padding: 25,
            color: '#ffffff',
            background:
              'linear-gradient(135deg, #0f172a 0%, #172554 65%, #1e3a8a 100%)',
            boxShadow:
              '0 18px 40px rgba(15,23,42,0.16)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: '50%',
              right: -75,
              top: -90,
              background:
                'rgba(59,130,246,0.12)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: 125,
              height: 125,
              borderRadius: '50%',
              right: 80,
              bottom: -75,
              border:
                '1px solid rgba(148,163,184,0.13)',
            }}
          />

          <div
            style={{
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#94a3b8',
                textTransform: 'uppercase',
                fontWeight: 800,
                letterSpacing: '0.09em',
              }}
            >
              Current Portfolio Value
            </div>

            {/* CLEAN MONEY DISPLAY */}
            <div
              style={{
                marginTop: 10,
                fontSize: 34,
                lineHeight: 1.1,
                fontWeight: 700,
                letterSpacing: '-0.025em',
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontVariantNumeric: 'tabular-nums',
                color: '#ffffff',
              }}
            >
              {money(totalValue)}
            </div>

            <div
              style={{
                marginTop: 10,
                color: '#cbd5e1',
                fontSize: 12,
              }}
            >
              Current market value of your virtual
              currency holdings
            </div>

            <div
              style={{
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
                  Invested
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 16,
                    fontWeight: 750,
                  }}
                >
                  {money(totalInvested)}
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
                  Holdings
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 18,
                    fontWeight: 750,
                  }}
                >
                  {holdings.length}
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
                  P/L
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 16,
                    fontWeight: 750,
                    color:
                      totalProfitLoss == null
                        ? '#ffffff'
                        : totalProfitLoss >= 0
                          ? '#86efac'
                          : '#fca5a5',
                  }}
                >
                  {totalProfitLoss == null
                    ? '—'
                    : `${
                        totalProfitLoss >= 0
                          ? '+'
                          : ''
                      }${money(
                        totalProfitLoss
                      )}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE */}
        <div
          className="portfolio-performance-card"
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
            Portfolio Performance
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 31,
              fontWeight: 750,
              letterSpacing: '-0.025em',
              fontVariantNumeric: 'tabular-nums',
              color:
                totalProfitLoss == null
                  ? '#0f172a'
                  : totalProfitLoss >= 0
                    ? '#15803d'
                    : '#dc2626',
            }}
          >
            {profitLossPercentage == null
              ? '—'
              : `${
                  profitLossPercentage >= 0 ? '+' : ''
                }${profitLossPercentage.toFixed(2)}%`}
          </div>

          <div
            style={{
              marginTop: 8,
            }}
          >
            <PerformanceBadge
              profit={totalProfitLoss}
            />
          </div>

          <div
            style={{
              marginTop: 23,
              paddingTop: 17,
              borderTop:
                '1px solid #eef2f7',
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
              Largest Position
            </div>

            {largestHolding ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 11,
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
                    fontSize: 20,
                  }}
                >
                  {getFlag(largestHolding.code)}
                </div>

                <div>
                  <div
                    style={{
                      fontWeight: 750,
                      fontSize: 15,
                    }}
                  >
                    {largestHolding.code}
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 10,
                      color: '#94a3b8',
                    }}
                  >
                    {largestHolding.allocationPercentage.toFixed(
                      1
                    )}
                    % of portfolio
                  </div>
                </div>

                <div
                  style={{
                    marginLeft: 'auto',
                    fontSize: 14,
                    fontWeight: 750,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {money(largestHolding.currentValue)}
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: '#94a3b8',
                }}
              >
                No holdings yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SUMMARY STATS */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <StatCard
          icon="💰"
          label="Portfolio Value"
          value={money(totalValue)}
          caption="Current market value"
        />

        <StatCard
          icon="🏦"
          label="Total Invested"
          value={money(totalInvested)}
          caption="Amount invested virtually"
          accent="#7c3aed"
        />

        <StatCard
          icon={
            totalProfitLoss != null &&
            totalProfitLoss >= 0
              ? '🟢'
              : '🔴'
          }
          label="Overall P/L"
          value={
            totalProfitLoss == null
              ? '—'
              : `${
                  totalProfitLoss >= 0 ? '+' : ''
                }${money(totalProfitLoss)}`
          }
          caption="Unrealized portfolio P/L"
          accent={
            totalProfitLoss != null &&
            totalProfitLoss < 0
              ? '#dc2626'
              : '#059669'
          }
          valueColor={
            totalProfitLoss == null
              ? '#0f172a'
              : totalProfitLoss >= 0
                ? '#15803d'
                : '#dc2626'
          }
        />

        <StatCard
          icon="🌎"
          label="Currencies"
          value={holdings.length}
          caption="Currencies currently held"
          accent="#0891b2"
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
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 15,
            marginBottom: 18,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: '#64748b',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
              }}
            >
              HOLDINGS
            </div>

            <h2
              style={{
                margin: '5px 0 0',
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              Current Positions
            </h2>
          </div>

          <div
            style={{
              padding: '7px 10px',
              borderRadius: 10,
              background: '#f8fafc',
              border:
                '1px solid #e2e8f0',
              color: '#64748b',
              fontSize: 10,
              fontWeight: 800,
            }}
          >
            {holdings.length}{' '}
            {holdings.length === 1
              ? 'currency'
              : 'currencies'}
          </div>
        </div>

        {calculatedAllocation.length ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {calculatedAllocation.map((holding) => {
              const value = Number(
                holding.currentValue || 0
              );

              const invested =
                holding.investedAmount == null
                  ? null
                  : Number(
                      holding.investedAmount
                    );

              const profit =
                holding.profitLoss == null
                  ? null
                  : Number(
                      holding.profitLoss
                    );

              const positive =
                profit == null || profit >= 0;

              return (
                <article
                  key={holding.code}
                  style={{
                    border:
                      '1px solid #e2e8f0',
                    borderRadius: 18,
                    padding: 18,
                    background:
                      'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  }}
                >
                  {/* CARD HEADER */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'flex-start',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems:
                          'center',
                        gap: 11,
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          background:
                            '#eff6ff',
                          display: 'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          fontSize: 21,
                        }}
                      >
                        {getFlag(
                          holding.code
                        )}
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 850,
                          }}
                        >
                          {holding.code} / INR
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 10,
                            color:
                              '#94a3b8',
                          }}
                        >
                          {holding.name ||
                            holding.currencyName ||
                            'Currency holding'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '5px 8px',
                        borderRadius: 999,
                        background: '#f1f5f9',
                        color: '#475569',
                        fontSize: 9,
                        fontWeight: 800,
                      }}
                    >
                      {holding.allocationPercentage.toFixed(
                        1
                      )}
                      %
                    </div>
                  </div>

                  {/* VALUE */}
                  <div
                    style={{
                      marginTop: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: '#94a3b8',
                        textTransform:
                          'uppercase',
                        fontWeight: 700,
                        letterSpacing:
                          '0.06em',
                      }}
                    >
                      Current Value
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 26,
                        fontWeight: 750,
                        letterSpacing:
                          '-0.025em',
                        fontVariantNumeric:
                          'tabular-nums',
                      }}
                    >
                      {holding.currentValue ==
                      null
                        ? '—'
                        : money(value)}
                    </div>
                  </div>

                  {/* QUANTITY + INVESTED */}
                  <div
                    style={{
                      marginTop: 16,
                      display: 'grid',
                      gridTemplateColumns:
                        '1fr 1fr',
                      gap: 9,
                    }}
                  >
                    <div
                      style={{
                        padding: '11px 12px',
                        borderRadius: 12,
                        background:
                          '#ffffff',
                        border:
                          '1px solid #eef2f7',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: '#94a3b8',
                          textTransform:
                            'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Quantity
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 14,
                          fontWeight: 750,
                        }}
                      >
                        {formatQuantity(
                          holding.quantity
                        )}{' '}
                        {holding.code}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: '11px 12px',
                        borderRadius: 12,
                        background:
                          '#ffffff',
                        border:
                          '1px solid #eef2f7',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: '#94a3b8',
                          textTransform:
                            'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Invested
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 14,
                          fontWeight: 750,
                        }}
                      >
                        {invested == null
                          ? '—'
                          : money(invested)}
                      </div>
                    </div>
                  </div>

                  {/* P/L */}
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop:
                        '1px solid #eef2f7',
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'flex-end',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 9,
                          color: '#94a3b8',
                          textTransform:
                            'uppercase',
                          fontWeight: 700,
                        }}
                      >
                        Profit / Loss
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 16,
                          fontWeight: 850,
                          color:
                            profit == null
                              ? '#64748b'
                              : positive
                                ? '#15803d'
                                : '#dc2626',
                          fontVariantNumeric:
                            'tabular-nums',
                        }}
                      >
                        {profit == null
                          ? '—'
                          : `${
                              positive
                                ? '+'
                                : ''
                            }${money(
                              profit
                            )}`}
                      </div>
                    </div>

                    <PerformanceBadge
                      profit={profit}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              minHeight: 300,
              border:
                '1px dashed #cbd5e1',
              borderRadius: 17,
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              textAlign: 'center',
              padding: 30,
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 19,
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 15,
              }}
            >
              💼
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#334155',
              }}
            >
              No holdings yet
            </div>

            <div
              style={{
                marginTop: 7,
                maxWidth: 380,
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 1.6,
              }}
            >
              Start a virtual currency trade from
              the Dashboard or Market page to build
              your portfolio.
            </div>
          </div>
        )}
      </section>

      {/* NOTE */}
      <div
        style={{
          marginTop: 18,
          padding: '13px 16px',
          borderRadius: 14,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          color: '#64748b',
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        <strong style={{ color: '#334155' }}>
          💡 Portfolio view:
        </strong>{' '}
        Values shown here are based on your virtual
        FXWallet holdings and the available exchange
        rates.
      </div>
    </div>
  );
}