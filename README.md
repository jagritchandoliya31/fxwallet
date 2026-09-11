# FXWallet

**Real-Time Multi-Currency Digital Wallet & Forex Trading Simulation Platform**

FXWallet is a full-stack web application that simulates currency trading using virtual INR. Users can register, view live exchange rates, buy and sell foreign currencies, track their portfolio P&L, set rate alerts, and get AI-inspired currency insights.

> **Disclaimer:** This is a simulation / educational tool. It is NOT real currency trading, and it is NOT financial advice.

---

## 1. Project Overview

FXWallet allows a user to:

- Register / Login with JWT authentication
- Start with ₹100,000 virtual INR
- View live exchange rates for USD, EUR, GBP
- Buy foreign currency using INR
- Sell held foreign currency back to INR
- Track portfolio value, invested amount, and profit/loss
- View transaction history with pagination
- View historical rate charts
- Create rate alerts
- Get Smart Currency Advisor insights

---

## 2. Features

| Feature | Description |
|---------|-------------|
| Authentication | Register, Login, JWT-based session |
| Wallet | ₹100,000 INR on registration, persisted in DB |
| Live Rates | Fetched from external API, cached & persisted |
| Buy | Convert INR → foreign currency at authoritative backend rate |
| Sell | Convert foreign currency → INR, realize P/L |
| Portfolio | Current value, invested value, unrealized P/L, P/L % |
| Transactions | Paginated history of BUY/SELL with timestamps |
| Rate History | Historical rate chart per currency |
| Alerts | Create/delete rate alerts, auto-trigger when target reached |
| Smart Advisor | Trend, momentum, volatility, ranking score, disclaimer |

---

## 3. Architecture

```
Frontend (React + Vite)
    ↓ axios / REST
Backend (Spring Boot 3.2)
    ↓ JPA / Hibernate
Database (MySQL)
```

---

## 4. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Axios, Recharts |
| Backend | Spring Boot 3.2, Spring Security, JWT (JJWT) |
| Database | MySQL 8 |
| Build | Maven (backend), Vite (frontend) |
| Language | Java 17 (backend), JavaScript (frontend) |

---

## 5. Project Structure

```
fxwallet/
├── backend/
│   ├── src/main/java/com/fxwallet/
│   │   ├── config/          # Security, JWT filter, data init
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Request/Response objects
│   │   ├── entity/          # JPA entities
│   │   ├── exception/       # Global exception handler
│   │   ├── repository/      # Spring Data JPA repos
│   │   ├── security/        # JWT util, UserDetailsService
│   │   ├── service/         # Business logic
│   │   └── util/            # BigDecimal helpers
│   ├── src/main/resources/
│   │   └── application.yml
│   ├── src/test/java/...    # Unit tests
│   └── pom.xml
├── frontend/                 # React app (if separate folder)
├── src/
│   ├── api/                  # Axios clients
│   ├── context/              # Auth context
│   ├── pages/                # Route pages
│   ├── App.jsx
│   └── main.jsx
├── package.json
├── styles.css
└── README.md
```

---

## 6. Database Entities

| Entity | Table | Key Fields |
|--------|-------|-----------|
| User | users | id, email, password, name, role |
| Wallet | wallets | id, user_id, balance, currency |
| Currency | currencies | id, code, name, symbol, active |
| Holding | holdings | id, user_id, currency_id, quantity, avg_buy_rate |
| Transaction | transactions | id, user_id, currency_id, type, inr_amount, quantity, exchange_rate, realized_pl, timestamp |
| RateHistory | rate_history | id, currency_id, rate, timestamp |
| RateAlert | rate_alerts | id, user_id, currency_id, target_rate, triggered, created_at |

---

## 7. API Endpoints

### Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`

### Wallet
- `GET /api/wallet`

### Rates
- `GET /api/rates`
- `GET /api/rates/{code}/history`

### Transactions
- `POST /api/transactions/buy`
- `POST /api/transactions/sell`
- `GET /api/transactions?page=0&size=20&sortBy=timestamp&direction=DESC`
  - Valid sort fields: `timestamp`, `amount`, `quantity`, `currency`, `type`
  - Invalid page, size, direction, or sort field values return HTTP 400

BUY and SELL requests are rejected with HTTP 503 when the exchange rate is temporarily unavailable; no wallet, holding, or transaction state is modified in that case.

### Portfolio
- `GET /api/portfolio`

### Alerts
- `GET /api/alerts`
- `POST /api/alerts`
- `DELETE /api/alerts/{id}`

### Advisor
- `GET /api/advisor/{code}`

---

## 8. Environment Variables

### Backend (`backend/.env` or system env)
```
JWT_SECRET=your-secret-key
EXCHANGE_RATE_API_KEY=
EXCHANGE_RATES_API_URL=https://api.exchangerate-api.com/v4/latest/USD
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/fxwallet
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=root
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (`.env`)
```
VITE_API_BASE_URL=http://localhost:8080/api
```

---

## 9. MySQL Setup

```bash
# Create database
CREATE DATABASE fxwallet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional)
CREATE USER 'fxwallet'@'localhost' IDENTIFIED BY 'fxwallet';
GRANT ALL PRIVILEGES ON fxwallet.* TO 'fxwallet'@'localhost';
FLUSH PRIVILEGES;
```

The application uses `ddl-auto: update`, so tables are created automatically on startup.

---

## 10. Backend Setup

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

Or run tests:
```bash
mvn test
```

---

## 11. Frontend Setup

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
```

---

## 12. How to Run Locally

1. Ensure MySQL is running on `localhost:3306`.
2. Create the `fxwallet` database (see MySQL Setup).
3. Start the backend:
   ```bash
   cd backend
   mvn spring-boot:run
   ```
4. In a new terminal, start the frontend:
   ```bash
   npm install
   npm run dev
   ```
5. Open `http://localhost:5173` in your browser.

---

## 13. How to Test

Backend unit tests:
```bash
cd backend
mvn test
```

Frontend build check:
```bash
npm run build
```

---

## 14. BUY Flow

1. User selects a currency (e.g., USD) and enters an INR amount.
2. Frontend sends `POST /api/transactions/buy` with `{ currencyCode, amountInr }`.
3. Backend:
   - Authenticates the user from JWT.
   - Validates the currency exists.
   - Fetches the **authoritative** exchange rate from the rate service.
   - Rejects the request with HTTP 503 if the rate is temporarily unavailable (no state is modified).
   - Calculates `quantity = amountInr / rate`.
   - Checks wallet balance.
   - Debits wallet, updates/creates holding, records transaction.
4. Frontend shows success message with quantity received.

All financial calculations are performed server-side using `BigDecimal`.

---

## 15. SELL Flow

1. User selects a currency and enters a quantity.
2. Frontend sends `POST /api/transactions/sell` with `{ currencyCode, quantity }`.
3. Backend:
   - Authenticates the user from JWT.
   - Validates the currency exists.
   - Fetches the current rate.
   - Rejects the request with HTTP 503 if the rate is temporarily unavailable (no state is modified).
   - Checks holding quantity.
   - Calculates `proceeds = quantity * rate`.
   - Calculates `realizedP/L = proceeds - (avgBuyRate * quantity)`.
   - Credits wallet, reduces holding, records transaction.
4. Frontend shows success message with INR added to wallet.

---

## 16. Smart Currency Advisor

The Advisor analyzes the last 30 days of rate history for a selected currency and returns:

- **Current rate**
- **Historical average**
- **Recent percentage change**
- **Trend direction** (Positive / Negative / Neutral)
- **Momentum** (Strong / Moderate / Weak)
- **Volatility** (High / Medium / Low)
- **Score** (0–100)
- **Disclaimer:** "Simulation / educational insight — not financial advice."

Formulas use `BigDecimal` and handle edge cases like insufficient history, zero values, and API failures.

---

## 17. Security

- Passwords are BCrypt hashed; plaintext passwords are never stored.
- JWT tokens are signed with a configurable secret.
- All protected endpoints require a valid JWT.
- CORS is configured via environment variables.
- Users can only access their own wallet, holdings, transactions, and alerts.
- Database credentials and API keys are loaded from environment variables.
- `.env` files are gitignored.

---

## 18. Simulation-Only Disclaimer

FXWallet is a **virtual trading simulator**. No real money is involved. Exchange rates are for educational simulation only. The Smart Currency Advisor does NOT provide financial advice. Always consult a licensed financial advisor for real investment decisions.

---

## License

This project is created for B.Tech academic evaluation.
