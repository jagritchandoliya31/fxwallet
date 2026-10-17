import { useEffect, useMemo, useState } from 'react';
import { advisorApi } from '../api/advisorApi';

const CURRENCIES = [
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    flag: '🇦🇪',
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    flag: '🇯🇵',
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    flag: '🇦🇺',
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    flag: '🇨🇦',
  },
  {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    flag: '🇨🇭',
  },
  {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    flag: '🇸🇬',
  },
  {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    flag: '🇨🇳',
  },
  {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: '﷼',
    flag: '🇸🇦',
  },
  {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    flag: '🇭🇰',
  },
  {
    code: 'NZD',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    flag: '🇳🇿',
  },
];

function formatNumber(value, digits = 4) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return number.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercentage(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
}

function getChangeClass(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '';
  }

  return number >= 0 ? 'positive' : 'negative';
}

function getTrendStyle(trend) {
  const value = String(trend || '').toLowerCase();

  if (
    value.includes('positive') ||
    value.includes('up') ||
    value.includes('bull')
  ) {
    return {
      background: '#ecfdf5',
      color: '#047857',
      border: '#bbf7d0',
      icon: '↗',
    };
  }

  if (
    value.includes('negative') ||
    value.includes('down') ||
    value.includes('bear')
  ) {
    return {
      background: '#fef2f2',
      color: '#b91c1c',
      border: '#fecaca',
      icon: '↘',
    };
  }

  return {
    background: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0',
    icon: '→',
  };
}

function getScoreLabel(score) {
  const number = Number(score);

  if (!Number.isFinite(number)) {
    return 'No score';
  }

  if (number >= 80) {
    return 'Strong';
  }

  if (number >= 60) {
    return 'Positive';
  }

  if (number >= 40) {
    return 'Neutral';
  }

  return 'Weak';
}

function getScoreColor(score) {
  const number = Number(score);

  if (!Number.isFinite(number)) {
    return '#94a3b8';
  }

  if (number >= 80) {
    return '#059669';
  }

  if (number >= 60) {
    return '#2563eb';
  }

  if (number >= 40) {
    return '#d97706';
  }

  return '#dc2626';
}

function MetricCard({
  icon,
  label,
  value,
  caption,
  valueClass = '',
}) {
  return (
    <article
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 18,
        padding: 20,
        boxShadow: '0 8px 25px rgba(15,23,42,0.045)',
        minHeight: 125,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 17,
          }}
        >
          {icon}
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          Market
        </div>
      </div>

      <div
        style={{
          marginTop: 15,
          fontSize: 12,
          color: '#64748b',
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        className={valueClass}
        style={{
          marginTop: 4,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color:
            valueClass === 'positive'
              ? '#15803d'
              : valueClass === 'negative'
                ? '#dc2626'
                : '#0f172a',
        }}
      >
        {value}
      </div>

      {caption && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: '#94a3b8',
          }}
        >
          {caption}
        </div>
      )}
    </article>
  );
}

export default function Advisor() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('USD');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await advisorApi.getAdvisor(code);

        if (cancelled) {
          return;
        }

        setData(res);
      } catch (err) {
        console.error('Advisor error:', err);

        if (cancelled) {
          return;
        }

        setData(null);
        setError(
          'Unable to load advisor analysis right now.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const selectedCurrency = useMemo(() => {
    return (
      CURRENCIES.find(
        (currency) => currency.code === code
      ) || CURRENCIES[0]
    );
  }, [code]);

  const trendStyle = useMemo(() => {
    return getTrendStyle(data?.trendDirection);
  }, [data]);

  const score = Number(data?.score);

  const safeScore = Number.isFinite(score)
    ? Math.max(0, Math.min(100, score))
    : 0;

  const scoreColor = getScoreColor(safeScore);

  const circumference = 2 * Math.PI * 47;

  const scoreOffset =
    circumference -
    (safeScore / 100) * circumference;

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '28px',
        background:
          'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        color: '#0f172a',
      }}
    >
      {/* PAGE HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 24,
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
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.06em',
              marginBottom: 10,
            }}
          >
            🧠 SMART CURRENCY ADVISOR
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 850,
              letterSpacing: '-0.03em',
              color: '#0f172a',
            }}
          >
            Currency Intelligence
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              fontSize: 14,
              color: '#64748b',
              maxWidth: 620,
              lineHeight: 1.6,
            }}
          >
            Analyze historical currency behavior,
            market momentum and volatility in one place.
          </p>
        </div>

        {/* CURRENCY SELECTOR */}
        <div
          className="advisor-currency-selector"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            padding: 6,
            display: 'flex',
            gap: 5,
            boxShadow:
              '0 6px 18px rgba(15,23,42,0.045)',
          }}
        >
          {CURRENCIES.map((currency) => {
            const active =
              currency.code === code;

            return (
              <button
                key={currency.code}
                type="button"
                onClick={() => {
                  setCode(currency.code);
                }}
                style={{
                  border: active
                    ? '1px solid #bfdbfe'
                    : '1px solid transparent',
                  background: active
                    ? '#eff6ff'
                    : 'transparent',
                  color: active
                    ? '#1d4ed8'
                    : '#64748b',
                  padding: '9px 13px',
                  borderRadius: 11,
                  cursor: 'pointer',
                  fontWeight: 750,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{currency.flag}</span>
                <span>{currency.code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 20,
            minHeight: 430,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            boxShadow:
              '0 8px 28px rgba(15,23,42,0.045)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: '4px solid #dbeafe',
              borderTopColor: '#2563eb',
              animation: 'spin 0.9s linear infinite',
            }}
          />

          <div
            style={{
              marginTop: 18,
              fontWeight: 750,
              color: '#334155',
            }}
          >
            Analyzing {selectedCurrency.name}...
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: '#94a3b8',
            }}
          >
            Calculating historical market metrics
          </div>

          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #fecaca',
            borderRadius: 20,
            padding: 28,
            boxShadow:
              '0 8px 28px rgba(15,23,42,0.045)',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              marginBottom: 14,
            }}
          >
            ⚠️
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 18,
              color: '#991b1b',
            }}
          >
            Advisor unavailable
          </h2>

          <p
            style={{
              marginTop: 8,
              color: '#7f1d1d',
              fontSize: 14,
            }}
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              setCode(code);
              setLoading(true);
            }}
            style={{
              marginTop: 10,
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: 11,
              padding: '10px 15px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </section>
      )}

      {/* RESULTS */}
      {!loading && !error && data && (
        <>
          {/* HERO SUMMARY */}
          <section
            style={{
              background:
                'linear-gradient(135deg, #0f172a 0%, #172554 100%)',
              borderRadius: 22,
              padding: '24px 25px',
              color: '#ffffff',
              boxShadow:
                '0 18px 40px rgba(15,23,42,0.16)',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 25,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 15,
                      background:
                        'rgba(255,255,255,0.10)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 25,
                    }}
                  >
                    {selectedCurrency.flag}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 850,
                      }}
                    >
                      {selectedCurrency.code} / INR
                    </div>

                    <div
                      style={{
                        marginTop: 3,
                        fontSize: 13,
                        color: '#cbd5e1',
                      }}
                    >
                      {selectedCurrency.name}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 22,
                    fontSize: 12,
                    color: '#94a3b8',
                    textTransform:
                      'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                  }}
                >
                  Current Exchange Rate
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 34,
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                  }}
                >
                  ₹{formatNumber(
                    data.currentRate,
                    4
                  )}
                </div>
              </div>

              {/* SCORE */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: 130,
                    height: 130,
                  }}
                >
                  <svg
                    width="130"
                    height="130"
                    viewBox="0 0 120 120"
                    style={{
                      transform:
                        'rotate(-90deg)',
                    }}
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="47"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="9"
                    />

                    <circle
                      cx="60"
                      cy="60"
                      r="47"
                      fill="none"
                      stroke={scoreColor}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={scoreOffset}
                      style={{
                        transition:
                          'stroke-dashoffset 0.8s ease',
                      }}
                    />
                  </svg>

                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:
                        'center',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 27,
                        fontWeight: 900,
                      }}
                    >
                      {Number.isFinite(score)
                        ? score.toFixed(0)
                        : '—'}
                    </div>

                    <div
                      style={{
                        fontSize: 10,
                        color: '#94a3b8',
                        fontWeight: 700,
                      }}
                    >
                      / 100
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      textTransform:
                        'uppercase',
                      letterSpacing:
                        '0.08em',
                      fontWeight: 700,
                    }}
                  >
                    Advisor Score
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 22,
                      fontWeight: 850,
                    }}
                  >
                    {getScoreLabel(score)}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 12,
                      color: '#94a3b8',
                      maxWidth: 170,
                      lineHeight: 1.5,
                    }}
                  >
                    Based on the available
                    historical market metrics.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* METRICS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 15,
              marginBottom: 20,
            }}
          >
            <MetricCard
              icon="💰"
              label="Current Rate"
              value={`₹${formatNumber(
                data.currentRate,
                4
              )}`}
              caption="Latest available market rate"
            />

            <MetricCard
              icon="📊"
              label="Historical Average"
              value={`₹${formatNumber(
                data.historicalAverage,
                4
              )}`}
              caption="Average historical rate"
            />

            <MetricCard
              icon={
                Number(data.recentPercentageChange) >= 0
                  ? '↗️'
                  : '↘️'
              }
              label="Recent Change"
              value={formatPercentage(
                data.recentPercentageChange
              )}
              caption="Recent historical movement"
              valueClass={getChangeClass(
                data.recentPercentageChange
              )}
            />

            <MetricCard
              icon="📈"
              label="Trend"
              value={data.trendDirection}
              caption="Historical direction"
            />

            <MetricCard
              icon="⚡"
              label="Momentum"
              value={data.momentum}
              caption="Recent price behavior"
            />

            <MetricCard
              icon="〽️"
              label="Volatility"
              value={data.volatility}
              caption="Historical rate variability"
            />
          </div>

          {/* INSIGHT ROW */}
          <div
            className="advisor-insight-row"
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(0, 1.5fr) minmax(280px, 0.7fr)',
              gap: 18,
              marginBottom: 20,
            }}
          >
            {/* MARKET SIGNAL */}
            <section
              style={{
                background: '#ffffff',
                border:
                  '1px solid #e2e8f0',
                borderRadius: 20,
                padding: 22,
                boxShadow:
                  '0 8px 25px rgba(15,23,42,0.045)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: 15,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#64748b',
                      letterSpacing:
                        '0.08em',
                      textTransform:
                        'uppercase',
                    }}
                  >
                    Market Signal
                  </div>

                  <h2
                    style={{
                      margin:
                        '5px 0 0',
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    Historical Snapshot
                  </h2>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    padding:
                      '8px 11px',
                    borderRadius: 999,
                    background:
                      trendStyle.background,
                    color:
                      trendStyle.color,
                    border:
                      `1px solid ${trendStyle.border}`,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <span>
                    {trendStyle.icon}
                  </span>
                  <span>
                    {data.trendDirection}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    border:
                      '1px solid #eef2f7',
                    background:
                      '#fafcff',
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      fontWeight: 700,
                      textTransform:
                        'uppercase',
                    }}
                  >
                    Historical Average
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 21,
                      fontWeight: 800,
                    }}
                  >
                    ₹{formatNumber(
                      data.historicalAverage,
                      4
                    )}
                  </div>
                </div>

                <div
                  style={{
                    border:
                      '1px solid #eef2f7',
                    background:
                      '#fafcff',
                    borderRadius: 14,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: '#94a3b8',
                      fontWeight: 700,
                      textTransform:
                        'uppercase',
                    }}
                  >
                    Recent Movement
                  </div>

                  <div
                    className={getChangeClass(
                      data.recentPercentageChange
                    )}
                    style={{
                      marginTop: 8,
                      fontSize: 21,
                      fontWeight: 800,
                      color:
                        Number(
                          data.recentPercentageChange
                        ) >= 0
                          ? '#15803d'
                          : '#dc2626',
                    }}
                  >
                    {formatPercentage(
                      data.recentPercentageChange
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* MOMENTUM */}
            <section
              style={{
                background:
                  'linear-gradient(135deg, #eff6ff, #f8fbff)',
                border:
                  '1px solid #dbeafe',
                borderRadius: 20,
                padding: 22,
                boxShadow:
                  '0 8px 25px rgba(15,23,42,0.045)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#1d4ed8',
                  letterSpacing:
                    '0.08em',
                  textTransform:
                    'uppercase',
                }}
              >
                Momentum
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 28,
                  fontWeight: 900,
                  color: '#0f172a',
                }}
              >
                {data.momentum}
              </div>

              <p
                style={{
                  marginTop: 9,
                  marginBottom: 0,
                  color: '#64748b',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                A summary of recent
                historical price behavior
                for {selectedCurrency.code}.
              </p>

              <div
                style={{
                  marginTop: 20,
                  padding:
                    '10px 12px',
                  borderRadius: 11,
                  background:
                    'rgba(255,255,255,0.72)',
                  border:
                    '1px solid rgba(191,219,254,0.8)',
                  fontSize: 11,
                  color: '#475569',
                }}
              >
                This indicator is derived from
                historical data available to the
                advisor.
              </div>
            </section>
          </div>

          {/* DISCLAIMER */}
          <section
            style={{
              background: '#ffffff',
              border:
                '1px solid #e2e8f0',
              borderRadius: 20,
              padding: '20px 22px',
              boxShadow:
                '0 8px 25px rgba(15,23,42,0.035)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 13,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background:
                    '#fff7ed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  fontSize: 17,
                  flexShrink: 0,
                }}
              >
                ℹ️
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#9a3412',
                    textTransform:
                      'uppercase',
                    letterSpacing:
                      '0.06em',
                  }}
                >
                  Important Notice
                </div>

                <p
                  style={{
                    margin:
                      '6px 0 0',
                    fontSize: 13,
                    color: '#64748b',
                    lineHeight: 1.65,
                  }}
                >
                  {data.disclaimer}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}