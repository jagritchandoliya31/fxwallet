import { useEffect, useState } from 'react';
import { transactionApi } from '../api/transactionApi';

const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await transactionApi.getTransactions({ page, size: 10 });
        if (cancelled) return;
        setTransactions(res.content || []);
        setTotalPages(res.totalPages || 0);
      } catch {
        setTransactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [page]);

  if (loading) return <div className="loading">Loading transactions...</div>;

  return (
    <div>
      <header>
        <div>
          <p className="eyebrow">ACTIVITY</p>
          <h1>Transaction history</h1>
        </div>
      </header>
      <section className="panel">
        {transactions.length === 0 ? (
          <p className="empty-state">No transactions yet.</p>
        ) : (
          <div>
            {transactions.map((tx) => (
              <div className="transaction" key={tx.id}>
                <span className={tx.type === 'BUY' ? 'buy-badge' : 'sell-badge'}>{tx.type}</span>
                <div>
                  <strong>{tx.currencyCode}</strong>
                  <small>{tx.currencyName}</small>
                </div>
                <div className="rate-price">
                  <strong>{money(tx.inrAmount)}</strong>
                  <small>{Number(tx.quantity).toFixed(2)} units</small>
                </div>
                <small className={tx.realizedPl >= 0 ? 'positive' : 'negative'}>
                  {tx.realizedPl >= 0 ? '+' : ''}{money(tx.realizedPl)}
                </small>
                <small>{new Date(tx.timestamp).toLocaleString()}</small>
              </div>
            ))}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                  Previous
                </button>
                <span style={{ alignSelf: 'center', fontSize: 14, color: '#74839c' }}>
                  Page {page + 1} of {totalPages}
                </span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
