import { useEffect, useMemo, useState } from 'react';
import { alertsApi } from '../api/alertsApi';

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: '🇭🇰' },
  { code: 'NZD', name: 'New Zealand Dollar', flag: '🇳🇿' },
];

function formatRate(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return number.toLocaleString('en-IN', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function getCurrency(code) {
  return (
    CURRENCIES.find((item) => item.code === code) || {
      code,
      name: 'Currency',
      flag: '💱',
    }
  );
}

function StatusBadge({ triggered }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 11px',
        borderRadius: 999,
        background: triggered ? '#ecfdf5' : '#eff6ff',
        color: triggered ? '#047857' : '#1d4ed8',
        border: triggered
          ? '1px solid #bbf7d0'
          : '1px solid #bfdbfe',
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: triggered ? '#10b981' : '#3b82f6',
        }}
      />
      {triggered ? 'Triggered' : 'Active'}
    </span>
  );
}

function SummaryCard({ icon, label, value, caption }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 18,
        padding: 18,
        boxShadow: '0 8px 24px rgba(15,23,42,0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
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

        <div>
          <div
            style={{
              fontSize: 11,
              color: '#94a3b8',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {label}
          </div>

          <div
            style={{
              marginTop: 2,
              fontSize: 23,
              fontWeight: 850,
              color: '#0f172a',
            }}
          >
            {value}
          </div>
        </div>
      </div>

      {caption && (
        <div
          style={{
            marginTop: 11,
            fontSize: 11,
            color: '#94a3b8',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [targetRate, setTargetRate] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);

      const data = await alertsApi.getAlerts();

      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setAlerts([]);
      setMessage('Unable to load your alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const createAlert = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!targetRate || Number(targetRate) <= 0) {
      setMessage('Enter a valid target rate.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await alertsApi.createAlert({
        currencyCode,
        targetRate: Number(targetRate),
      });

      setAlerts((prev) => [...prev, res]);
      setTargetRate('');
      setMessage('Alert created successfully.');
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          'Failed to create alert.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAlert = async (id) => {
    try {
      setDeletingId(id);

      await alertsApi.deleteAlert(id);

      setAlerts((prev) =>
        prev.filter((alert) => alert.id !== id)
      );

      setMessage('Alert deleted successfully.');
    } catch (err) {
      console.error('Failed to delete alert:', err);
      setMessage('Failed to delete alert.');
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = useMemo(
    () => alerts.filter((alert) => !alert.triggered).length,
    [alerts]
  );

  const triggeredCount = useMemo(
    () => alerts.filter((alert) => alert.triggered).length,
    [alerts]
  );

  const selectedCurrency = getCurrency(currencyCode);

  if (loading) {
    return (
      <div
        style={{
          minHeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#64748b',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '4px solid #dbeafe',
            borderTopColor: '#2563eb',
            animation: 'alertSpin 0.8s linear infinite',
          }}
        />

        <div
          style={{
            marginTop: 16,
            fontWeight: 750,
            color: '#334155',
          }}
        >
          Loading your alerts...
        </div>

        <style>
          {`
            @keyframes alertSpin {
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
      className="alerts-page"
      style={{
        minHeight: '100%',
        padding: 28,
        background:
          'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        color: '#0f172a',
      }}
    >
      {/* HEADER */}
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
            🔔 RATE ALERTS
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 850,
              letterSpacing: '-0.03em',
            }}
          >
            Price Alerts
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              maxWidth: 640,
              fontSize: 14,
              lineHeight: 1.6,
              color: '#64748b',
            }}
          >
            Set target exchange rates and keep track of
            currencies you want to watch.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 13px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            color: '#64748b',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ fontSize: 16 }}>🛡️</span>
          Virtual FXWallet alerts
        </div>
      </div>

      {/* SUMMARY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <SummaryCard
          icon="🔔"
          label="Total Alerts"
          value={alerts.length}
          caption="All alerts created by you"
        />

        <SummaryCard
          icon="🟢"
          label="Active"
          value={activeCount}
          caption="Waiting for target rate"
        />

        <SummaryCard
          icon="✅"
          label="Triggered"
          value={triggeredCount}
          caption="Target rate reached"
        />
      </div>

      {/* MAIN GRID */}
      <div
        className="alerts-main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(300px, 0.85fr) minmax(0, 1.55fr)',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {/* CREATE ALERT */}
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
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                boxShadow:
                  '0 8px 18px rgba(37,99,235,0.22)',
              }}
            >
              +
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Create Alert
              </div>

              <h2
                style={{
                  margin: '4px 0 0',
                  fontSize: 20,
                  fontWeight: 850,
                }}
              >
                Set a target rate
              </h2>
            </div>
          </div>

          <form onSubmit={createAlert}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: '#475569',
                fontWeight: 750,
                marginBottom: 8,
              }}
            >
              Currency
            </label>

            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 13,
                background: '#f8fafc',
                padding: '3px 10px',
                marginBottom: 17,
              }}
            >
              <select
                value={currencyCode}
                onChange={(e) =>
                  setCurrencyCode(e.target.value)
                }
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  padding: '10px 3px',
                  color: '#0f172a',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {CURRENCIES.map((currency) => (
                  <option
                    key={currency.code}
                    value={currency.code}
                  >
                    {currency.flag} {currency.code} —{' '}
                    {currency.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                padding: '13px 14px',
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid #eef2f7',
                marginBottom: 17,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: '#94a3b8',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Selected Currency
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  marginTop: 7,
                }}
              >
                <span style={{ fontSize: 22 }}>
                  {selectedCurrency.flag}
                </span>

                <div>
                  <div
                    style={{
                      fontWeight: 850,
                      fontSize: 15,
                    }}
                  >
                    {selectedCurrency.code} / INR
                  </div>

                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: '#94a3b8',
                    }}
                  >
                    {selectedCurrency.name}
                  </div>
                </div>
              </div>
            </div>

            <label
              style={{
                display: 'block',
                fontSize: 12,
                color: '#475569',
                fontWeight: 750,
                marginBottom: 8,
              }}
            >
              Target Rate
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border:
                  targetRate && Number(targetRate) > 0
                    ? '1px solid #93c5fd'
                    : '1px solid #cbd5e1',
                borderRadius: 13,
                overflow: 'hidden',
                background: '#ffffff',
                marginBottom: 17,
              }}
            >
              <div
                style={{
                  padding: '0 13px',
                  color: '#64748b',
                  fontWeight: 800,
                  fontSize: 14,
                  borderRight: '1px solid #e2e8f0',
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                ₹
              </div>

              <input
                type="number"
                step="0.0001"
                min="0"
                value={targetRate}
                onChange={(e) =>
                  setTargetRate(e.target.value)
                }
                required
                placeholder="Enter target rate"
                style={{
                  width: '100%',
                  height: 44,
                  border: 'none',
                  outline: 'none',
                  padding: '0 13px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              />
            </div>

            <div
              style={{
                padding: '11px 13px',
                borderRadius: 12,
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                color: '#475569',
                fontSize: 11,
                lineHeight: 1.55,
                marginBottom: 18,
              }}
            >
              <strong style={{ color: '#1d4ed8' }}>
                Example:
              </strong>{' '}
              Set USD target rate to ₹98.00. Your alert
              will remain active until the target is
              reached.
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                height: 46,
                border: 'none',
                borderRadius: 13,
                background: submitting
                  ? '#93c5fd'
                  : '#2563eb',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 800,
                cursor: submitting
                  ? 'not-allowed'
                  : 'pointer',
                boxShadow: submitting
                  ? 'none'
                  : '0 8px 18px rgba(37,99,235,0.20)',
              }}
            >
              {submitting
                ? 'Creating Alert...'
                : 'Create Rate Alert'}
            </button>

            {message && (
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  borderRadius: 11,
                  background: message
                    .toLowerCase()
                    .includes('failed') ||
                    message
                      .toLowerCase()
                      .includes('unable')
                    ? '#fef2f2'
                    : '#ecfdf5',
                  border:
                    message
                      .toLowerCase()
                      .includes('failed') ||
                    message
                      .toLowerCase()
                      .includes('unable')
                      ? '1px solid #fecaca'
                      : '1px solid #bbf7d0',
                  color:
                    message
                      .toLowerCase()
                      .includes('failed') ||
                    message
                      .toLowerCase()
                      .includes('unable')
                      ? '#b91c1c'
                      : '#047857',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {message}
              </div>
            )}
          </form>
        </section>

        {/* ALERT LIST */}
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
                  fontSize: 11,
                  color: '#64748b',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Your Alerts
              </div>

              <h2
                style={{
                  margin: '4px 0 0',
                  fontSize: 20,
                  fontWeight: 850,
                }}
              >
                Alert Monitor
              </h2>
            </div>

            <button
              type="button"
              onClick={loadAlerts}
              style={{
                border: '1px solid #dbeafe',
                background: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: 11,
                padding: '8px 12px',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
          </div>

          {alerts.length === 0 ? (
            <div
              style={{
                minHeight: 330,
                borderRadius: 17,
                border: '1px dashed #cbd5e1',
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
                🔔
              </div>

              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: '#334155',
                }}
              >
                No alerts yet
              </div>

              <div
                style={{
                  marginTop: 7,
                  maxWidth: 330,
                  fontSize: 12,
                  color: '#94a3b8',
                  lineHeight: 1.6,
                }}
              >
                Create your first currency rate alert
                using the panel on the left.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {alerts.map((alert) => {
                const currency = getCurrency(
                  alert.currencyCode
                );

                return (
                  <div
                    key={alert.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 17,
                      padding: 17,
                      background: alert.triggered
                        ? '#fafafa'
                        : '#ffffff',
                      transition:
                        'transform 0.15s ease, box-shadow 0.15s ease',
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 46,
                            height: 46,
                            borderRadius: 14,
                            background: '#f8fafc',
                            border:
                              '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems:
                              'center',
                            justifyContent:
                              'center',
                            fontSize: 21,
                          }}
                        >
                          {currency.flag}
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 850,
                              color: '#0f172a',
                            }}
                          >
                            {alert.currencyCode}{' '}
                            / INR
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontSize: 11,
                              color: '#94a3b8',
                            }}
                          >
                            {alert.currencyName ||
                              currency.name}
                          </div>
                        </div>
                      </div>

                      <StatusBadge
                        triggered={alert.triggered}
                      />
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(2, minmax(0, 1fr))',
                        gap: 10,
                        marginTop: 15,
                      }}
                    >
                      <div
                        style={{
                          padding: 13,
                          borderRadius: 13,
                          background: '#f8fafc',
                          border:
                            '1px solid #eef2f7',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: '#94a3b8',
                            fontWeight: 700,
                            textTransform:
                              'uppercase',
                            letterSpacing:
                              '0.06em',
                          }}
                        >
                          Target Rate
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 20,
                            fontWeight: 850,
                            color: '#0f172a',
                          }}
                        >
                          ₹{formatRate(
                            alert.targetRate
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 13,
                          borderRadius: 13,
                          background: alert.triggered
                            ? '#ecfdf5'
                            : '#eff6ff',
                          border: alert.triggered
                            ? '1px solid #d1fae5'
                            : '1px solid #dbeafe',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            color: alert.triggered
                              ? '#059669'
                              : '#2563eb',
                            fontWeight: 700,
                            textTransform:
                              'uppercase',
                            letterSpacing:
                              '0.06em',
                          }}
                        >
                          Status
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 14,
                            fontWeight: 800,
                            color: alert.triggered
                              ? '#047857'
                              : '#1d4ed8',
                          }}
                        >
                          {alert.triggered
                            ? 'Target reached'
                            : 'Watching rate'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'flex-end',
                        marginTop: 13,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          deleteAlert(alert.id)
                        }
                        disabled={
                          deletingId === alert.id
                        }
                        style={{
                          border:
                            '1px solid #fecaca',
                          background: '#fff7f7',
                          color: '#dc2626',
                          borderRadius: 10,
                          padding:
                            '8px 12px',
                          fontSize: 11,
                          fontWeight: 800,
                          cursor:
                            deletingId === alert.id
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            deletingId === alert.id
                              ? 0.6
                              : 1,
                        }}
                      >
                        {deletingId === alert.id
                          ? 'Deleting...'
                          : 'Delete Alert'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* FOOTER INFO */}
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
          💡 How alerts work:
        </strong>{' '}
        Create a target rate for a currency and FXWallet
        will track that alert. Triggered alerts remain in
        your alert history.
      </div>
    </div>
  );
}