/**
 * FinanceAPI - Data & Storage Service Layer
 *
 * Centralized service for data persistence.
 * Finance data is stored by the authenticated backend.
 */

const API_ORIGIN =
  window.location.port === "5500"
    ? "http://localhost:3000"
    : window.location.origin;

const API_CONFIG = {
  USE_BACKEND: true,
  API_BASE_URL: `${API_ORIGIN}/api`,
};

async function backendRequest(path, options = {}) {
  const response = await fetch(`${API_CONFIG.API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && !options.allowUnauthorized) {
    window.location.replace(new URL("../auth.html", window.location.href));
    throw new Error("Please sign in to continue.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  if (response.status === 204) return null;
  return response.json();
}

const STORAGE_KEYS = {
  TRANSACTIONS: "finance_transactions_data",
  BUDGETS: "finance_budget_data",
  INVESTMENTS: "finance_investments_data",
};

const DEFAULT_TRANSACTIONS = [
  {
    id: 1,
    date: "2026-09-11",
    description: "Star Bazaar groceries",
    category: "Food",
    type: "expense",
    amount: 54.2,
  },
  {
    id: 2,
    date: "2026-09-10",
    description: "Salary — September",
    category: "Income",
    type: "income",
    amount: 3200.0,
  },
  {
    id: 3,
    date: "2026-09-10",
    description: "Rent",
    category: "Housing",
    type: "expense",
    amount: 1100.0,
  },
  {
    id: 4,
    date: "2026-09-08",
    description: "Electricity bill",
    category: "Utilities",
    type: "expense",
    amount: 62.5,
  },
  {
    id: 5,
    date: "2026-09-07",
    description: "Movie night",
    category: "Entertainment",
    type: "expense",
    amount: 24.0,
  },
  {
    id: 6,
    date: "2026-09-04",
    description: "Freelance design work",
    category: "Income",
    type: "income",
    amount: 450.0,
  },
  {
    id: 7,
    date: "2026-09-03",
    description: "Bus pass",
    category: "Transport",
    type: "expense",
    amount: 40.0,
  },
  {
    id: 8,
    date: "2026-09-02",
    description: "Pharmacy",
    category: "Health",
    type: "expense",
    amount: 18.75,
  },
  {
    id: 9,
    date: "2026-08-30",
    description: "New shoes",
    category: "Shopping",
    type: "expense",
    amount: 65.0,
  },
  {
    id: 10,
    date: "2026-08-29",
    description: "Transfer to savings",
    category: "Savings",
    type: "expense",
    amount: 300.0,
  },
];

const DEFAULT_BUDGETS = {
  Housing: 1200.0,
  Food: 300.0,
  Utilities: 100.0,
  Entertainment: 100.0,
  Transport: 100.0,
  Health: 50.0,
  Shopping: 150.0,
};

const DEFAULT_INVESTMENTS = [
  {
    id: 1,
    name: "Nifty 50 Index Fund",
    assetClass: "Mutual Funds",
    invested: 50000,
    current: 62400,
  },
  {
    id: 2,
    name: "Parag Parikh Flexi Cap",
    assetClass: "Mutual Funds",
    invested: 40000,
    current: 48600,
  },
  {
    id: 3,
    name: "Bluechip Equities Basket",
    assetClass: "Equities / Stocks",
    invested: 35000,
    current: 42000,
  },
  {
    id: 4,
    name: "HDFC Bank Fixed Deposit",
    assetClass: "Fixed Deposit",
    invested: 30000,
    current: 31800,
  },
  {
    id: 5,
    name: "Sovereign Gold Bonds (SGB)",
    assetClass: "Gold",
    invested: 20000,
    current: 24200,
  },
  {
    id: 6,
    name: "High-Yield Emergency Reserve",
    assetClass: "Emergency Fund",
    invested: 35000,
    current: 36000,
  },
];

window.FinanceAPI = {
  BASE_CAPITAL: 0,

  config: API_CONFIG,

  auth: {
    signup(details) {
      return backendRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify(details),
        allowUnauthorized: true,
      });
    },
    login(details) {
      return backendRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(details),
        allowUnauthorized: true,
      });
    },
    me() {
      return backendRequest("/auth/me", { allowUnauthorized: true });
    },
    logout() {
      return backendRequest("/auth/logout", { method: "POST" });
    },
  },

  /**
   * Transactions API
   */
  transactions: {
    async getAll() {
      if (API_CONFIG.USE_BACKEND) {
        return await backendRequest("/transactions");
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (err) {
        console.warn(
          "FinanceAPI: Error reading transactions from storage:",
          err,
        );
      }
      return [...DEFAULT_TRANSACTIONS];
    },

    async saveAll(transactions) {
      if (API_CONFIG.USE_BACKEND) {
        await backendRequest("/transactions/bulk", {
          method: "PUT",
          body: JSON.stringify(transactions),
        });
        return await this.getAll();
      }

      try {
        localStorage.setItem(
          STORAGE_KEYS.TRANSACTIONS,
          JSON.stringify(transactions),
        );
        return true;
      } catch (err) {
        console.error("FinanceAPI: Error saving transactions:", err);
        return false;
      }
    },

    async create(transaction) {
      if (API_CONFIG.USE_BACKEND) {
        const current = await this.getAll();
        current.unshift(transaction);
        await this.saveAll(current);
        return current[0];
      }

      const current = await this.getAll();
      const newTransaction = {
        ...transaction,
        id: transaction.id || Date.now(),
      };
      current.unshift(newTransaction);
      await this.saveAll(current);
      return newTransaction;
    },
  },

  /**
   * Budgets API
   */
  budgets: {
    async getAll() {
      if (API_CONFIG.USE_BACKEND) {
        return await backendRequest("/budgets");
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEYS.BUDGETS);
        if (stored) return JSON.parse(stored);
      } catch (err) {
        console.warn("FinanceAPI: Error reading budgets from storage:", err);
      }
      return { ...DEFAULT_BUDGETS };
    },

    async saveAll(budgets) {
      if (API_CONFIG.USE_BACKEND) {
        await backendRequest("/budgets", {
          method: "PUT",
          body: JSON.stringify(budgets),
        });
        return true;
      }

      try {
        localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
        return true;
      } catch (err) {
        console.error("FinanceAPI: Error saving budgets:", err);
        return false;
      }
    },
  },

  /**
   * Savings & Investments API
   */
  investments: {
    async getAll() {
      if (API_CONFIG.USE_BACKEND) {
        return await backendRequest("/investments");
      }

      try {
        const stored = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
        if (stored) return JSON.parse(stored);
      } catch (err) {
        console.warn(
          "FinanceAPI: Error reading investments from storage:",
          err,
        );
      }
      return [...DEFAULT_INVESTMENTS];
    },

    async saveAll(investments) {
      if (API_CONFIG.USE_BACKEND) {
        await backendRequest("/investments/bulk", {
          method: "PUT",
          body: JSON.stringify(investments),
        });
        return await this.getAll();
      }

      try {
        localStorage.setItem(
          STORAGE_KEYS.INVESTMENTS,
          JSON.stringify(investments),
        );
        return true;
      } catch (err) {
        console.error("FinanceAPI: Error saving investments:", err);
        return false;
      }
    },

    async create(investment) {
      if (API_CONFIG.USE_BACKEND) {
        const current = await this.getAll();
        current.push(investment);
        await this.saveAll(current);
        return current[current.length - 1];
      }

      const current = await this.getAll();
      const newInvestment = {
        ...investment,
        id: investment.id || Date.now(),
      };
      current.push(newInvestment);
      await this.saveAll(current);
      return newInvestment;
    },
  },
};
