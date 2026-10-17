import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ratesApi } from '../api/ratesApi';

const PERIODS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

const FALLBACK_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
];

function normalizeRate(item) {
  return {
    code: String(
      item?.code ??
        item?.currencyCode ??
        item?.currency?.code ??
        ''
    ).toUpperCase(),

    name:
      item?.name ??
      item?.currencyName ??
      item?.currency?.name ??
      item?.code ??
      item?.currencyCode ??
      'Currency',

    symbol:
      item?.symbol ??
      item?.currencySymbol ??
      item?.currency?.symbol ??
      '',

    rate: Number(
      item?.rate ??
        item?.exchangeRate ??
        item?.value ??
        item?.currentRate ??
        0
    ),
  };
}

function normalizeHistoryItem(item) {
  const timestamp =
    item?.timestamp ??
    item?.createdAt ??
    item?.recordedAt ??
    item?.time ??
    item?.date;

  const rate = Number(
    item?.rate ??
      item?.exchangeRate ??
      item?.value ??
      item?.currentRate ??
      0
  );

  return {
    timestamp,
    rate,
  };
}

function getHistoryArray(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.history)) {
    return response.history;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.records)) {
    return response.records;
  }

  return [];
}

function getDateKey(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDateLabel(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatFullDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRate(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatRateCompact(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function calculateChange(history) {
  if (!history || history.length < 2) {
    return null;
  }

  const first = Number(history[0].rate);
  const last = Number(history[history.length - 1].rate);

  if (
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    first === 0
  ) {
    return null;
  }

  return ((last - first) / first) * 100;
}

/*
 * Converts intraday history into one point per day.
 *
 * Example:
 *
 * 17 Sep 10:00 -> 95.90
 * 17 Sep 14:00 -> 95.94
 * 17 Sep 18:00 -> 95.97
 *
 * becomes:
 *
 * 17 Sep -> 95.97
 *
 * This keeps the latest recorded rate for each day.
 */
function aggregateDailyHistory(history) {
  const dailyMap = new Map();

  history.forEach((item) => {
    const key = getDateKey(item.timestamp);

    if (!key) {
      return;
    }

    const existing = dailyMap.get(key);

    if (!existing) {
      dailyMap.set(key, item);
      return;
    }

    const existingTime = new Date(existing.timestamp).getTime();
    const currentTime = new Date(item.timestamp).getTime();

    if (currentTime > existingTime) {
      dailyMap.set(key, item);
    }
  });

  return Array.from(dailyMap.values()).sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime()
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const point = payload[0]?.payload;

  if (!point) {
    return null;
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '12px 14px',
        boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
        minWidth: 175,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: '#64748b',
          marginBottom: 5,
        }}
      >
        {formatFullDate(point.timestamp)}
      </div>

      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: '#0f172a',
        }}
      >
        ₹{formatRate(point.rate)}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          color: '#94a3b8',
        }}
      >
        Last recorded rate of the day
      </div>
    </div>
  );
}

export default function Market() {
  const [rates, setRates] = useState([]);
  const [selectedCode, setSelectedCode] = useState('USD');
  const [history, setHistory] = useState([]);
  const [periodDays, setPeriodDays] = useState(30);

  const [loadingRates, setLoadingRates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [ratesError, setRatesError] = useState('');
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    loadRates();
  }, []);

  useEffect(() => {
    if (selectedCode) {
      loadHistory(selectedCode);
    }
  }, [selectedCode]);

  async function loadRates() {
    try {
      setLoadingRates(true);
      setRatesError('');

      const response = await ratesApi.getAllRates();

      const rawRates = Array.isArray(response)
        ? response
        : Array.isArray(response?.rates)
          ? response.rates
          : Array.isArray(response?.data)
            ? response.data
            : [];

      const normalized = rawRates
        .map(normalizeRate)
        .filter(
          (item) =>
            item.code &&
            Number.isFinite(item.rate)
        );

      setRates(normalized);

      if (normalized.length > 0) {
        const hasSelected = normalized.some(
          (item) => item.code === selectedCode
        );

        if (!hasSelected) {
          setSelectedCode(normalized[0].code);
        }
      }
    } catch (error) {
      console.error('Failed to load rates:', error);
      setRatesError(
        'Unable to load current exchange rates.'
      );
    } finally {
      setLoadingRates(false);
    }
  }

  async function loadHistory(code) {
    try {
      setLoadingHistory(true);
      setHistoryError('');

      const response = await ratesApi.getHistory(code);

      const historyArray = getHistoryArray(response);

      const normalizedHistory = historyArray
        .map(normalizeHistoryItem)
        .filter((item) => {
          const parsedDate = new Date(item.timestamp);

          return (
            Number.isFinite(item.rate) &&
            item.rate > 0 &&
            !Number.isNaN(parsedDate.getTime())
          );
        })
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() -
            new Date(b.timestamp).getTime()
        );

      setHistory(normalizedHistory);
    } catch (error) {
      console.error(
        'Failed to load rate history:',
        error
      );

      setHistory([]);
      setHistoryError(
        'Unable to load rate history.'
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  const selectedCurrency = useMemo(() => {
    return (
      rates.find(
        (item) => item.code === selectedCode
      ) ||
      FALLBACK_CURRENCIES.find(
        (item) => item.code === selectedCode
      ) || {
        code: selectedCode,
        name: selectedCode,
        symbol: '',
      }
    );
  }, [rates, selectedCode]);

  const currentRate = useMemo(() => {
    const current = rates.find(
      (item) => item.code === selectedCode
    );

    if (
      current &&
      Number.isFinite(current.rate)
    ) {
      return current.rate;
    }

    if (history.length > 0) {
      return Number(
        history[history.length - 1].rate
      );
    }

    return 0;
  }, [rates, selectedCode, history]);

  /*
   * First apply the selected time window to the
   * raw history, then aggregate it into daily points.
   */
  const periodHistory = useMemo(() => {
    if (!history.length) {
      return [];
    }

    const latestTimestamp = new Date(
      history[history.length - 1].timestamp
    ).getTime();

    const cutoff =
      latestTimestamp -
      periodDays * 24 * 60 * 60 * 1000;

    const filtered = history.filter(
      (item) =>
        new Date(item.timestamp).getTime() >=
        cutoff
    );

    const availableData =
      filtered.length >= 2
        ? filtered
        : history.slice(
            -Math.min(history.length, 10)
          );

    return aggregateDailyHistory(
      availableData
    );
  }, [history, periodDays]);

  const chartData = useMemo(() => {
    return periodHistory.map((item) => ({
      ...item,
      label: formatDateLabel(item.timestamp),
    }));
  }, [periodHistory]);

  const statistics = useMemo(() => {
    if (!periodHistory.length) {
      return {
        current: currentRate,
        change: null,
        low: null,
        high: null,
        average: null,
      };
    }

    const values = periodHistory
      .map((item) => Number(item.rate))
      .filter(Number.isFinite);

    const low = Math.min(...values);
    const high = Math.max(...values);

    const average =
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length;

    const change =
      calculateChange(periodHistory);

    return {
      current: currentRate,
      change,
      low,
      high,
      average,
    };
  }, [periodHistory, currentRate]);

  const yAxisDomain = useMemo(() => {
    const values = chartData
      .map((item) => Number(item.rate))
      .filter(Number.isFinite);

    if (!values.length) {
      return ['auto', 'auto'];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
      const padding = Math.max(
        Math.abs(min) * 0.003,
        0.05
      );

      return [
        min - padding,
        max + padding,
      ];
    }

    const range = max - min;
    const padding = range * 0.12;

    return [
      min - padding,
      max + padding,
    ];
  }, [chartData]);

  const periodLabel =
    PERIODS.find(
      (period) => period.days === periodDays
    )?.label || '30D';

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
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#0f172a',
            }}
          >
            Market
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              color: '#64748b',
            }}
          >
            Track live exchange rates and historical
            currency movements.
          </div>
        </div>

        <div
          className="market-header-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/alerts"
            className="market-alert-button"
            style={{
              border: '1px solid #dbeafe',
              background: '#eff6ff',
              color: '#1d4ed8',
              borderRadius: 12,
              padding: '10px 15px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow:
                '0 4px 14px rgba(37,99,235,0.07)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            🔔 Rate Alerts
          </Link>

          <button
            type="button"
            onClick={loadRates}
            style={{
              border: '1px solid #dbe3ef',
              background: '#ffffff',
              color: '#334155',
              borderRadius: 12,
              padding: '10px 15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow:
                '0 4px 14px rgba(15,23,42,0.05)',
            }}
          >
            ↻ Refresh Rates
          </button>
        </div>
      </div>

      {/* ERROR */}
      {ratesError && (
        <div
          style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#9a3412',
            borderRadius: 12,
            padding: '12px 14px',
            marginBottom: 18,
          }}
        >
          {ratesError}
        </div>
      )}

      {/* CURRENT RATES */}
      <div style={{ marginBottom: 26 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 750,
            marginBottom: 13,
          }}
        >
          Current Exchange Rates
        </div>

        {loadingRates ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              border: '1px solid #e2e8f0',
              padding: 30,
              color: '#64748b',
            }}
          >
            Loading exchange rates...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 14,
            }}
          >
            {rates.map((currency) => {
              const active =
                currency.code === selectedCode;

              return (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() =>
                    setSelectedCode(
                      currency.code
                    )
                  }
                  style={{
                    textAlign: 'left',
                    border: active
                      ? '1px solid #93c5fd'
                      : '1px solid #e2e8f0',
                    background: active
                      ? '#eff6ff'
                      : '#ffffff',
                    borderRadius: 18,
                    padding: 17,
                    cursor: 'pointer',
                    boxShadow: active
                      ? '0 8px 24px rgba(37,99,235,0.09)'
                      : '0 6px 18px rgba(15,23,42,0.045)',
                    transition:
                      'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'center',
                        background: active
                          ? '#dbeafe'
                          : '#f1f5f9',
                        color: '#1e40af',
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {currency.code}
                    </div>

                    <div
                      style={{
                        fontSize: 19,
                        fontWeight: 800,
                        color: '#0f172a',
                      }}
                    >
                      ₹{formatRate(currency.rate)}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: '#64748b',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {currency.name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* HISTORY CARD */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 22,
          boxShadow:
            '0 12px 35px rgba(15,23,42,0.055)',
          overflow: 'hidden',
        }}
      >
        {/* CARD HEADER */}
        <div
          style={{
            padding: '22px 24px 18px',
            borderBottom:
              '1px solid #eef2f7',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent:
                'space-between',
              gap: 18,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#0f172a',
                  }}
                >
                  {selectedCurrency.code} / INR
                </span>

                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    padding: '5px 9px',
                    borderRadius: 999,
                    background: '#f1f5f9',
                    color: '#475569',
                  }}
                >
                  Historical Rate
                </span>
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 13,
                  color: '#64748b',
                }}
              >
                {selectedCurrency.name}
              </div>
            </div>

            {/* PERIOD SELECTOR */}
            <div
              style={{
                display: 'flex',
                gap: 5,
                padding: 4,
                borderRadius: 11,
                background: '#f1f5f9',
              }}
            >
              {PERIODS.map((period) => {
                const active =
                  period.days === periodDays;

                return (
                  <button
                    key={period.days}
                    type="button"
                    onClick={() =>
                      setPeriodDays(
                        period.days
                      )
                    }
                    style={{
                      border: 'none',
                      background: active
                        ? '#ffffff'
                        : 'transparent',
                      color: active
                        ? '#1d4ed8'
                        : '#64748b',
                      fontWeight: 750,
                      fontSize: 12,
                      borderRadius: 8,
                      padding: '8px 11px',
                      cursor: 'pointer',
                      boxShadow: active
                        ? '0 2px 8px rgba(15,23,42,0.08)'
                        : 'none',
                    }}
                  >
                    {period.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RATE SUMMARY */}
          <div
            className="market-rate-summary"
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(220px, 1.4fr) repeat(3, minmax(120px, 1fr))',
              gap: 14,
              marginTop: 22,
            }}
          >
            <div
              style={{
                padding: '16px 18px',
                borderRadius: 16,
                background:
                  'linear-gradient(135deg, #eff6ff, #f8fbff)',
                border:
                  '1px solid #dbeafe',
              }}
            >
              <div
                style={{
                  color: '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Current Rate
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 27,
                  fontWeight: 850,
                  letterSpacing: '-0.03em',
                  color: '#0f172a',
                }}
              >
                ₹{formatRate(
                  statistics.current
                )}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: '#64748b',
                }}
              >
                1 {selectedCurrency.code} in INR
              </div>
            </div>

            <StatBox
              label={`${periodLabel} Change`}
              value={formatPercentage(
                statistics.change
              )}
              positive={
                statistics.change !== null
                  ? statistics.change >= 0
                  : null
              }
            />

            <StatBox
              label="Lowest"
              value={
                statistics.low !== null
                  ? `₹${formatRateCompact(
                      statistics.low
                    )}`
                  : '—'
              }
            />

            <StatBox
              label="Highest"
              value={
                statistics.high !== null
                  ? `₹${formatRateCompact(
                      statistics.high
                    )}`
                  : '—'
              }
            />
          </div>
        </div>

        {/* CHART */}
        <div
          style={{
            padding: '20px 18px 24px',
          }}
        >
          {historyError && (
            <div
              style={{
                background: '#fff7ed',
                border:
                  '1px solid #fed7aa',
                color: '#9a3412',
                borderRadius: 12,
                padding: 12,
                marginBottom: 15,
              }}
            >
              {historyError}
            </div>
          )}

          {loadingHistory ? (
            <div
              style={{
                minHeight: 390,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                color: '#64748b',
                fontSize: 14,
              }}
            >
              Loading historical data...
            </div>
          ) : chartData.length > 0 ? (
            <>
              <div
                style={{
                  width: '100%',
                  height: 390,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <AreaChart
                    data={chartData}
                    margin={{
                      top: 12,
                      right: 12,
                      left: 4,
                      bottom: 8,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="rateHistoryFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#2563eb"
                          stopOpacity={0.24}
                        />

                        <stop
                          offset="75%"
                          stopColor="#60a5fa"
                          stopOpacity={0.08}
                        />

                        <stop
                          offset="100%"
                          stopColor="#93c5fd"
                          stopOpacity={0}
                        />
                      </linearGradient>

                      <filter
                        id="chartShadow"
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                      >
                        <feDropShadow
                          dx="0"
                          dy="2"
                          stdDeviation="2"
                          floodOpacity="0.12"
                        />
                      </filter>
                    </defs>

                    <CartesianGrid
                      stroke="#e8edf4"
                      strokeDasharray="4 6"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#94a3b8',
                        fontSize: 11,
                      }}
                      minTickGap={35}
                    />

                    <YAxis
                      domain={yAxisDomain}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: '#94a3b8',
                        fontSize: 11,
                      }}
                      width={65}
                      tickFormatter={(value) =>
                        `₹${Number(value).toFixed(
                          2
                        )}`
                      }
                    />

                    <Tooltip
                      content={
                        <CustomTooltip />
                      }
                      cursor={{
                        stroke: '#94a3b8',
                        strokeDasharray:
                          '4 4',
                      }}
                    />

                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fill="url(#rateHistoryFill)"
                      activeDot={{
                        r: 5,
                        stroke: '#ffffff',
                        strokeWidth: 3,
                        fill: '#2563eb',
                      }}
                      dot={false}
                      isAnimationActive
                      animationDuration={850}
                      filter="url(#chartShadow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* BOTTOM STATS */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                  marginTop: 3,
                }}
              >
                <MiniStat
                  label="Average"
                  value={
                    statistics.average !==
                    null
                      ? `₹${formatRateCompact(
                          statistics.average
                        )}`
                      : '—'
                  }
                />

                <MiniStat
                  label="Days"
                  value={chartData.length}
                />

                <MiniStat
                  label="Period"
                  value={periodLabel}
                />
              </div>
            </>
          ) : (
            <div
              style={{
                minHeight: 390,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  'center',
                flexDirection: 'column',
                textAlign: 'center',
                color: '#64748b',
                padding: 30,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    'center',
                  fontSize: 25,
                  marginBottom: 14,
                }}
              >
                📈
              </div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 750,
                  color: '#334155',
                }}
              >
                No historical data
                available
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  maxWidth: 360,
                }}
              >
                Historical rate points
                will appear here as
                FXWallet collects
                market-rate snapshots.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  positive,
}) {
  let valueColor = '#0f172a';

  if (positive === true) {
    valueColor = '#15803d';
  }

  if (positive === false) {
    valueColor = '#dc2626';
  }

  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 16,
        background: '#f8fafc',
        border:
          '1px solid #eef2f7',
      }}
    >
      <div
        style={{
          color: '#64748b',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 8,
          fontSize: 18,
          fontWeight: 800,
          color: valueColor,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        border:
          '1px solid #eef2f7',
        background: '#fafcff',
        borderRadius: 12,
        padding: '11px 13px',
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#94a3b8',
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 3,
          fontSize: 13,
          fontWeight: 750,
          color: '#334155',
        }}
      >
        {value}
      </div>
    </div>
  );
}