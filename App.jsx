import { useMemo, useState } from 'react'

const rates = {
  USD: { name: 'US Dollar', symbol: '$', rate: 87.12, change: '+0.18%' },
  EUR: { name: 'Euro', symbol: '€', rate: 94.45, change: '-0.07%' },
  GBP: { name: 'British Pound', symbol: '£', rate: 110.6, change: '+0.31%' },
}

const initialHoldings = {
  USD: { quantity: 150.25, avgBuyRate: 85.8 },
  EUR: { quantity: 80.5, avgBuyRate: 95.1 },
  GBP: { quantity: 45.2, avgBuyRate: 108.4 },
}

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)

export default function App() {
  const [wallet, setWallet] = useState(100000)
  const [holdings, setHoldings] = useState(initialHoldings)
  const [selected, setSelected] = useState('USD')
  const [amount, setAmount] = useState('10000')
  const [mode, setMode] = useState('buy')
  const [transactions, setTransactions] = useState([
    { type: 'BUY', currency: 'USD', amount: 10000, date: 'Today, 10:30 AM' },
    { type: 'SELL', currency: 'EUR', amount: 3500, date: 'Yesterday, 4:10 PM' },
    { type: 'BUY', currency: 'GBP', amount: 5000, date: '28 Aug, 1:45 PM' },
  ])
  const [message, setMessage] = useState('')

  const portfolioValue = useMemo(() => Object.entries(holdings).reduce((total, [code, holding]) => total + holding.quantity * rates[code].rate, 0), [holdings])
  const invested = useMemo(() => Object.entries(holdings).reduce((total, [code, holding]) => total + holding.quantity * holding.avgBuyRate, 0), [holdings])
  const profit = portfolioValue - invested
  const numericalAmount = Number(amount) || 0
  const preview = mode === 'buy' ? numericalAmount / rates[selected].rate : numericalAmount * rates[selected].rate

  function submitTrade(event) {
    event.preventDefault()
    setMessage('')
    if (numericalAmount <= 0) return setMessage('Enter an amount greater than zero.')
    if (mode === 'buy') {
      if (numericalAmount > wallet) return setMessage('Your virtual INR balance is too low.')
      const quantity = numericalAmount / rates[selected].rate
      setWallet((value) => value - numericalAmount)
      setHoldings((value) => {
        const old = value[selected] || { quantity: 0, avgBuyRate: rates[selected].rate }
        const newQuantity = old.quantity + quantity
        return { ...value, [selected]: { quantity: newQuantity, avgBuyRate: ((old.quantity * old.avgBuyRate) + numericalAmount) / newQuantity } }
      })
      setTransactions((value) => [{ type: 'BUY', currency: selected, amount: numericalAmount, date: 'Just now' }, ...value])
      setMessage(`Bought ${quantity.toFixed(2)} ${selected} in your virtual portfolio.`)
    } else {
      const available = holdings[selected]?.quantity || 0
      if (numericalAmount > available) return setMessage(`You have only ${available.toFixed(2)} ${selected} available.`)
      const proceeds = numericalAmount * rates[selected].rate
      setWallet((value) => value + proceeds)
      setHoldings((value) => ({ ...value, [selected]: { ...value[selected], quantity: available - numericalAmount } }))
      setTransactions((value) => [{ type: 'SELL', currency: selected, amount: proceeds, date: 'Just now' }, ...value])
      setMessage(`Sold ${numericalAmount.toFixed(2)} ${selected}; ${money(proceeds)} added to wallet.`)
    }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>FX</span>Wallet</div>
      <p className="sim-label">VIRTUAL TRADING SIMULATOR</p>
      <nav>
        <a className="active" href="#dashboard">▦ Dashboard</a><a href="#portfolio">◈ Portfolio</a><a href="#trade">⇄ Buy & Sell</a><a href="#transactions">▤ Transactions</a><a href="#profile">◉ Profile</a>
      </nav>
      <div className="demo-note">Demo only<br/><strong>Not real currency or payments.</strong></div>
    </aside>
    <main>
      <header><div><p className="eyebrow">GOOD MORNING</p><h1>Your currency dashboard</h1></div><div className="avatar">JC</div></header>
      <section className="stats">
        <article><p>Virtual INR wallet</p><h2>{money(wallet)}</h2><span>Available to trade</span></article>
        <article><p>Portfolio value</p><h2>{money(portfolioValue)}</h2><span className="positive">↑ 1.67% this month</span></article>
        <article><p>Overall profit / loss</p><h2 className={profit >= 0 ? 'positive' : 'negative'}>{profit >= 0 ? '+' : ''}{money(profit)}</h2><span>Against your average buy rate</span></article>
      </section>
      <section className="content-grid">
        <div className="panel market"><div className="panel-title"><div><p className="eyebrow">MARKET</p><h2>Live exchange rates</h2></div><button>View all</button></div>
          {Object.entries(rates).map(([code, item]) => <div className="rate-row" key={code}><div className="currency-icon">{item.symbol}</div><div><strong>{code}/INR</strong><small>{item.name}</small></div><div className="rate-price"><strong>{money(item.rate)}</strong><small className={item.change.startsWith('+') ? 'positive' : 'negative'}>{item.change}</small></div></div>)}
        </div>
        <form className="panel trade" id="trade" onSubmit={submitTrade}><div className="panel-title"><div><p className="eyebrow">QUICK TRADE</p><h2>Buy or sell currency</h2></div></div>
          <div className="tabs"><button type="button" onClick={() => setMode('buy')} className={mode === 'buy' ? 'selected' : ''}>Buy</button><button type="button" onClick={() => setMode('sell')} className={mode === 'sell' ? 'selected' : ''}>Sell</button></div>
          <label>Currency<select value={selected} onChange={(e) => setSelected(e.target.value)}>{Object.keys(rates).map((code) => <option key={code}>{code}</option>)}</select></label>
          <label>{mode === 'buy' ? 'Amount in INR' : `Amount in ${selected}`}<input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <div className="calculation">{mode === 'buy' ? <>You receive <strong>{preview.toFixed(2)} {selected}</strong></> : <>You receive <strong>{money(preview)}</strong></>}<small>Rate: 1 {selected} = {money(rates[selected].rate)}</small></div>
          <button className="trade-button">{mode === 'buy' ? `Buy ${selected}` : `Sell ${selected}`}</button>{message && <p className="message">{message}</p>}
        </form>
      </section>
      <section className="panel holdings" id="portfolio"><div className="panel-title"><div><p className="eyebrow">PORTFOLIO</p><h2>Your holdings</h2></div><button>Full portfolio</button></div><div className="holding-grid">{Object.entries(holdings).filter(([, item]) => item.quantity > 0).map(([code, item]) => <article key={code}><div><span className="currency-icon">{rates[code].symbol}</span><strong>{code}</strong></div><h3>{item.quantity.toFixed(2)} {code}</h3><p>{money(item.quantity * rates[code].rate)}</p><small className={rates[code].rate >= item.avgBuyRate ? 'positive' : 'negative'}>{rates[code].rate >= item.avgBuyRate ? '+' : ''}{money((rates[code].rate - item.avgBuyRate) * item.quantity)} P/L</small></article>)}</div></section>
      <section className="panel transactions" id="transactions"><div className="panel-title"><div><p className="eyebrow">ACTIVITY</p><h2>Recent transactions</h2></div></div>{transactions.slice(0, 4).map((transaction, index) => <div className="transaction" key={`${transaction.date}-${index}`}><span className={transaction.type === 'BUY' ? 'buy-badge' : 'sell-badge'}>{transaction.type}</span><strong>{transaction.currency}</strong><span>{money(transaction.amount)}</span><small>{transaction.date}</small></div>)}</section>
    </main>
  </div>
}
