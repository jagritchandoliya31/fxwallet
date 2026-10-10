import { useEffect, useMemo, useState } from 'react';
import { transactionApi } from '../api/transactionApi';

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
    currencyFlags[
      String(code || '').toUpperCase()
    ] || '💱'
  );
}

function formatDate(timestamp) {
  if (!timestamp) {
    return {
      date: '—',
      time: '',
    };
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return {
      date: '—',
      time: '',
    };
  }

  return {
    date: date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function SummaryCard({
  icon,
  label,
  value,
  caption,
  accent,
}) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 17,
        padding: 17,
        boxShadow:
          '0 8px 22px rgba(15,23,42,0.035)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${accent}12`,
          color: accent,
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
          marginTop: 13,
          fontSize: 10,
          color: '#94a3b8',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 4,
          fontSize: 22,
          fontWeight: 850,
          color: '#0f172a',
          fontVariantNumeric:
            'tabular-nums',
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 3,
          fontSize: 10,
          color: '#94a3b8',
        }}
      >
        {caption}
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  const isBuy = type === 'BUY';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 9px',
        borderRadius: 999,
        background: isBuy
          ? '#ecfdf5'
          : '#fff1f2',
        border: isBuy
          ? '1px solid #bbf7d0'
          : '1px solid #fecdd3',
        color: isBuy
          ? '#047857'
          : '#be123c',
        fontSize: 10,
        fontWeight: 850,
        letterSpacing: '0.04em',
      }}
    >
      <span
        style={{
          fontSize: 12,
          lineHeight: 1,
        }}
      >
        {isBuy ? '↙' : '↗'}
      </span>

      {type}
    </span>
  );
}

export default function Transactions() {
  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [page, setPage] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(0);

  const [filter, setFilter] =
    useState('ALL');

  const [search, setSearch] =
    useState('');

  const [error, setError] =
    useState('');

  const loadTransactions = async (
    pageNumber = page,
    showRefresh = false
  ) => {
    if (showRefresh) {
      setRefreshing(true);
    }

    try {
      setError('');

      const res =
        await transactionApi.getTransactions({
          page: pageNumber,
          size: 10,
        });

      setTransactions(
        res?.content || []
      );

      setTotalPages(
        res?.totalPages || 0
      );
    } catch (err) {
      console.error(
        'Transaction loading error:',
        err
      );

      setTransactions([]);
      setTotalPages(0);
      setError(
        'Unable to load transaction history right now.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions(page);
  }, [page]);

  const filteredTransactions =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return transactions.filter(
        (tx) => {
          const matchesType =
            filter === 'ALL' ||
            tx.type === filter;

          const matchesSearch =
            !query ||
            String(
              tx.currencyCode || ''
            )
              .toLowerCase()
              .includes(query) ||
            String(
              tx.currencyName || ''
            )
              .toLowerCase()
              .includes(query);

          return (
            matchesType &&
            matchesSearch
          );
        }
      );
    }, [transactions, filter, search]);

  const buyCount =
    transactions.filter(
      (tx) => tx.type === 'BUY'
    ).length;

  const sellCount =
    transactions.filter(
      (tx) => tx.type === 'SELL'
    ).length;

  const pageVolume =
    transactions.reduce(
      (sum, tx) =>
        sum + Number(tx.inrAmount || 0),
      0
    );

  const pageRealizedPL =
    transactions.reduce(
      (sum, tx) =>
        sum + Number(tx.realizedPl || 0),
      0
    );

  const pageFees =
    transactions.reduce(
      (sum, tx) =>
        sum + Number(tx.platformFee || 0),
      0
    );

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
            border:
              '4px solid #dbeafe',
            borderTopColor:
              '#2563eb',
            animation:
              'transactionSpin 0.8s linear infinite',
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
          Loading activity...
        </div>

        <div
          style={{
            marginTop: 5,
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          Fetching your transaction history
        </div>

        <style>
          {`
            @keyframes transactionSpin {
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
          justifyContent:
            'space-between',
          alignItems:
            'flex-start',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding:
                '7px 11px',
              borderRadius: 999,
              background:
                '#eff6ff',
              color: '#1d4ed8',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing:
                '0.07em',
              marginBottom: 10,
            }}
          >
            ◈ ACTIVITY CENTER
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 31,
              fontWeight: 900,
              letterSpacing:
                '-0.04em',
            }}
          >
            Transaction History
          </h1>

          <p
            style={{
              margin:
                '7px 0 0',
              color: '#64748b',
              fontSize: 14,
              lineHeight: 1.55,
              maxWidth: 650,
            }}
          >
            A complete view of your virtual
            currency trading activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadTransactions(
              page,
              true
            )
          }
          disabled={refreshing}
          style={{
            height: 40,
            padding: '0 13px',
            borderRadius: 11,
            border:
              '1px solid #dbeafe',
            background:
              '#ffffff',
            color: '#1d4ed8',
            fontSize: 12,
            fontWeight: 800,
            cursor: refreshing
              ? 'not-allowed'
              : 'pointer',
            opacity: refreshing
              ? 0.65
              : 1,
          }}
        >
          {refreshing
            ? 'Refreshing...'
            : '↻ Refresh'}
        </button>
      </header>

      {/* ERROR */}
      {error && (
        <div
          style={{
            marginBottom: 18,
            padding:
              '12px 14px',
            borderRadius: 13,
            background:
              '#fef2f2',
            border:
              '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {error}
        </div>
      )}

      {/* DARK OVERVIEW */}
      <section
        style={{
          position:
            'relative',
          overflow: 'hidden',
          borderRadius: 22,
          padding: 24,
          color: '#ffffff',
          background:
            'linear-gradient(135deg, #0f172a 0%, #172554 60%, #1e3a8a 100%)',
          boxShadow:
            '0 18px 40px rgba(15,23,42,0.15)',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            position:
              'absolute',
            width: 210,
            height: 210,
            borderRadius: '50%',
            right: -75,
            top: -95,
            background:
              'rgba(59,130,246,0.11)',
          }}
        />

        <div
          style={{
            position:
              'relative',
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'flex-end',
            gap: 30,
            flexWrap:
              'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: '#94a3b8',
                fontWeight: 800,
                textTransform:
                  'uppercase',
                letterSpacing:
                  '0.09em',
              }}
            >
              Current Activity
            </div>

            <div
              style={{
                marginTop: 7,
                fontSize: 29,
                fontWeight: 850,
                letterSpacing:
                  '-0.03em',
              }}
            >
              {transactions.length}{' '}
              transactions
            </div>

            <div
              style={{
                marginTop: 6,
                color: '#cbd5e1',
                fontSize: 12,
              }}
            >
              Showing the latest page of your
              trading history
            </div>
          </div>

          <div
            style={{
              minWidth: 190,
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
                  '0.07em',
              }}
            >
              Current Page Volume
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 23,
                fontWeight: 800,
                fontVariantNumeric:
                  'tabular-nums',
              }}
            >
              {money(pageVolume)}
            </div>
          </div>
        </div>

        <div
          style={{
            position:
              'relative',
            display: 'grid',
            gridTemplateColumns:
              'repeat(4, minmax(0, 1fr))',
            gap: 10,
            marginTop: 23,
          }}
        >
          <div
            style={{
              padding: 13,
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
              BUY
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 19,
                fontWeight: 850,
              }}
            >
              {buyCount}
            </div>
          </div>

          <div
            style={{
              padding: 13,
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
              SELL
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 19,
                fontWeight: 850,
              }}
            >
              {sellCount}
            </div>
          </div>

          <div
            style={{
              padding: 13,
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
              PLATFORM FEES
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 16,
                fontWeight: 850,
                color: '#bfdbfe',
              }}
            >
              {money(pageFees)}
            </div>

            <div
              style={{
                marginTop: 2,
                fontSize: 9,
                color: '#94a3b8',
              }}
            >
              0.10% per trade
            </div>
          </div>

          <div
            style={{
              padding: 13,
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
              REALIZED P/L
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 16,
                fontWeight: 850,
                color:
                  pageRealizedPL >= 0
                    ? '#86efac'
                    : '#fca5a5',
                fontVariantNumeric:
                  'tabular-nums',
              }}
            >
              {pageRealizedPL >= 0
                ? '+'
                : ''}
              {money(
                pageRealizedPL
              )}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK SUMMARY */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 13,
          marginBottom: 18,
        }}
      >
        <SummaryCard
          icon="↙"
          label="Buy Orders"
          value={buyCount}
          caption="On this page"
          accent="#059669"
        />

        <SummaryCard
          icon="↗"
          label="Sell Orders"
          value={sellCount}
          caption="On this page"
          accent="#e11d48"
        />

        <SummaryCard
          icon="₹"
          label="Trading Volume"
          value={money(pageVolume)}
          caption="INR value on this page"
          accent="#2563eb"
        />

        <SummaryCard
          icon="📊"
          label="Realized P/L"
          value={`${pageRealizedPL >= 0 ? '+' : ''}${money(
            pageRealizedPL
          )}`}
          caption="Based on displayed transactions"
          accent={
            pageRealizedPL >= 0
              ? '#059669'
              : '#dc2626'
          }
        />
      </section>

      {/* TRANSACTION CENTER */}
      <section
        style={{
          background: '#ffffff',
          border:
            '1px solid #e2e8f0',
          borderRadius: 22,
          padding: 22,
          boxShadow:
            '0 10px 28px rgba(15,23,42,0.045)',
        }}
      >
        {/* TOOLBAR */}
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            gap: 14,
            flexWrap:
              'wrap',
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: '#64748b',
                fontWeight: 800,
                textTransform:
                  'uppercase',
                letterSpacing:
                  '0.09em',
              }}
            >
              TRANSACTION CENTER
            </div>

            <h2
              style={{
                margin:
                  '5px 0 0',
                fontSize: 20,
                fontWeight: 850,
              }}
            >
              Trading Activity
            </h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              gap: 8,
              flexWrap:
                'wrap',
            }}
          >
            {/* FILTER */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                padding: 4,
                background:
                  '#f1f5f9',
                borderRadius: 11,
              }}
            >
              {['ALL', 'BUY', 'SELL'].map(
                (option) => {
                  const active =
                    filter === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setFilter(
                          option
                        )
                      }
                      style={{
                        border:
                          'none',
                        background:
                          active
                            ? '#ffffff'
                            : 'transparent',
                        color:
                          active
                            ? '#1d4ed8'
                            : '#64748b',
                        borderRadius: 8,
                        padding:
                          '7px 10px',
                        fontSize: 10,
                        fontWeight: 850,
                        cursor:
                          'pointer',
                        boxShadow:
                          active
                            ? '0 2px 8px rgba(15,23,42,0.07)'
                            : 'none',
                      }}
                    >
                      {option}
                    </button>
                  );
                }
              )}
            </div>

            {/* SEARCH */}
            <div
              style={{
                display:
                  'flex',
                alignItems:
                  'center',
                width: 175,
                height: 36,
                border:
                  '1px solid #e2e8f0',
                borderRadius: 10,
                background:
                  '#f8fafc',
                padding:
                  '0 10px',
                gap: 7,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: '#94a3b8',
                }}
              >
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search currency"
                style={{
                  width: '100%',
                  border:
                    'none',
                  outline:
                    'none',
                  background:
                    'transparent',
                  fontSize: 11,
                  color:
                    '#0f172a',
                }}
              />
            </div>
          </div>
        </div>

        {/* COLUMN LABELS */}
        {filteredTransactions.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                '95px minmax(160px, 1fr) 150px 125px 120px',
              gap: 12,
              padding:
                '0 14px 9px 14px',
              color: '#94a3b8',
              fontSize: 9,
              fontWeight: 800,
              textTransform:
                'uppercase',
              letterSpacing:
                '0.06em',
            }}
          >
            <div>
              Type
            </div>
            <div>
              Currency
            </div>
            <div>
              Amount
            </div>
            <div>
              Realized P/L
            </div>
            <div>
              Time
            </div>
          </div>
        )}

        {/* TRANSACTIONS */}
        {filteredTransactions.length === 0 ? (
          <div
            style={{
              minHeight: 330,
              border:
                '1px dashed #cbd5e1',
              borderRadius: 17,
              background:
                '#f8fafc',
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              flexDirection:
                'column',
              textAlign:
                'center',
              padding: 30,
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 19,
                background:
                  '#eff6ff',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                fontSize: 27,
                marginBottom: 15,
              }}
            >
              {transactions.length === 0
                ? '🧾'
                : '🔎'}
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color:
                  '#334155',
              }}
            >
              {transactions.length === 0
                ? 'No transactions yet'
                : 'No matching transactions'}
            </div>

            <div
              style={{
                marginTop: 7,
                maxWidth: 380,
                fontSize: 12,
                color:
                  '#94a3b8',
                lineHeight: 1.6,
              }}
            >
              {transactions.length === 0
                ? 'Complete your first virtual currency trade and your activity will appear here.'
                : 'Try another currency or change the transaction filter.'}
            </div>
          </div>
        ) : (
          <div
            style={{
              display:
                'flex',
              flexDirection:
                'column',
              gap: 8,
            }}
          >
            {filteredTransactions.map(
              (tx, index) => {
                const date =
                  formatDate(
                    tx.timestamp
                  );

                const realizedPL =
                  Number(
                    tx.realizedPl ||
                      0
                  );

                const isPositive =
                  realizedPL >=
                  0;

                return (
                  <div
                    key={`${tx.id}-${index}`}
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        '95px minmax(160px, 1fr) 150px 125px 120px',
                      gap: 12,
                      alignItems:
                        'center',
                      padding:
                        '13px 14px',
                      borderRadius: 15,
                      background:
                        '#ffffff',
                      border:
                        '1px solid #eef2f7',
                      transition:
                        'background 0.15s ease',
                    }}
                  >
                    {/* TYPE */}
                    <div>
                      <TypeBadge
                        type={
                          tx.type
                        }
                      />
                    </div>

                    {/* CURRENCY */}
                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap: 10,
                        minWidth:
                          0,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background:
                            '#f8fafc',
                          border:
                            '1px solid #e2e8f0',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          fontSize: 18,
                          flexShrink:
                            0,
                        }}
                      >
                        {getFlag(
                          tx.currencyCode
                        )}
                      </div>

                      <div
                        style={{
                          minWidth:
                            0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 850,
                            color:
                              '#0f172a',
                          }}
                        >
                          {tx.currencyCode}{' '}
                          <span
                            style={{
                              color:
                                '#94a3b8',
                              fontWeight:
                                600,
                              fontSize: 10,
                            }}
                          >
                            / INR
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            fontSize: 10,
                            color:
                              '#94a3b8',
                            whiteSpace:
                              'nowrap',
                            overflow:
                              'hidden',
                            textOverflow:
                              'ellipsis',
                          }}
                        >
                          {tx.currencyName}
                        </div>
                      </div>
                    </div>

                    {/* AMOUNT */}
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 850,
                          color:
                            '#0f172a',
                          fontVariantNumeric:
                            'tabular-nums',
                        }}
                      >
                        {tx.type ===
                        'BUY'
                          ? '−'
                          : '+'}
                        {money(
                          tx.inrAmount
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 10,
                          color:
                            '#94a3b8',
                        }}
                      >
                        {formatQuantity(
                          tx.quantity
                        )}{' '}
                        units
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 9,
                          color: '#64748b',
                        }}
                      >
                        Fee: {money(tx.platformFee)}
                      </div>
                    </div>

                    {/* P/L */}
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color:
                            '#94a3b8',
                        }}
                      >
                        Realized
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 11,
                          fontWeight: 850,
                          color:
                            isPositive
                              ? '#15803d'
                              : '#dc2626',
                          fontVariantNumeric:
                            'tabular-nums',
                        }}
                      >
                        {isPositive
                          ? '+'
                          : ''}
                        {money(
                          realizedPL
                        )}
                      </div>
                    </div>

                    {/* DATE */}
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 750,
                          color:
                            '#334155',
                        }}
                      >
                        {date.date}
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 10,
                          color:
                            '#94a3b8',
                        }}
                      >
                        {date.time}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div
            style={{
              display:
                'flex',
              justifyContent:
                'space-between',
              alignItems:
                'center',
              gap: 12,
              marginTop: 18,
              paddingTop: 16,
              borderTop:
                '1px solid #eef2f7',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#94a3b8',
              }}
            >
              Page{' '}
              <strong
                style={{
                  color:
                    '#334155',
                }}
              >
                {page + 1}
              </strong>{' '}
              of{' '}
              <strong
                style={{
                  color:
                    '#334155',
                }}
              >
                {totalPages}
              </strong>
            </div>

            <div
              style={{
                display:
                  'flex',
                gap: 7,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        0,
                        current - 1
                      )
                  )
                }
                disabled={
                  page === 0
                }
                style={{
                  height: 35,
                  padding:
                    '0 11px',
                  borderRadius: 9,
                  border:
                    '1px solid #e2e8f0',
                  background:
                    '#ffffff',
                  color:
                    page === 0
                      ? '#cbd5e1'
                      : '#334155',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor:
                    page === 0
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        totalPages -
                          1,
                        current + 1
                      )
                  )
                }
                disabled={
                  page >=
                  totalPages - 1
                }
                style={{
                  height: 35,
                  padding:
                    '0 11px',
                  borderRadius: 9,
                  border:
                    '1px solid #dbeafe',
                  background:
                    '#eff6ff',
                  color:
                    page >=
                    totalPages - 1
                      ? '#93c5fd'
                      : '#1d4ed8',
                  fontSize: 10,
                  fontWeight: 800,
                  cursor:
                    page >=
                    totalPages - 1
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER NOTE */}
      <div
        style={{
          marginTop: 18,
          padding:
            '13px 16px',
          borderRadius: 14,
          background:
            '#ffffff',
          border:
            '1px solid #e2e8f0',
          color: '#64748b',
          fontSize: 11,
          lineHeight: 1.55,
        }}
      >
        <strong
          style={{
            color: '#334155',
          }}
        >
          💡 Activity view:
        </strong>{' '}
        Transaction amounts and realized P/L shown here
        come directly from your virtual FXWallet trading
        records.
      </div>
    </div>
  );
}
