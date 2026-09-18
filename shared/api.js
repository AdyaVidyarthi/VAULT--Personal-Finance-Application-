/**
 * FinanceAPI - Data & Storage Service Layer
 * 
 * Centralized service for data persistence.
 * Currently uses browser localStorage as a fallback.
 * When the backend server is ready, update API_CONFIG below to switch
 * to real HTTP/REST API endpoints without altering UI logic.
 */

const API_CONFIG = {
    // Toggle to true once backend server is active
    USE_BACKEND: false,
    API_BASE_URL: 'http://localhost:5000/api'
};

const STORAGE_KEYS = {
    TRANSACTIONS: 'finance_transactions_data',
    BUDGETS: 'finance_budget_data',
    INVESTMENTS: 'finance_investments_data',
    CATEGORIES: 'finance_custom_categories_data'
};

const DEFAULT_TRANSACTIONS = [
    { id: 1, date: '2026-09-11', description: 'Star Bazaar groceries', category: 'Food', type: 'expense', amount: 54.20 },
    { id: 2, date: '2026-09-10', description: 'Salary — September', category: 'Income', type: 'income', amount: 3200.00 },
    { id: 3, date: '2026-09-10', description: 'Rent', category: 'Housing', type: 'expense', amount: 1100.00 },
    { id: 4, date: '2026-09-08', description: 'Electricity bill', category: 'Utilities', type: 'expense', amount: 62.50 },
    { id: 5, date: '2026-09-07', description: 'Movie night', category: 'Entertainment', type: 'expense', amount: 24.00 },
    { id: 6, date: '2026-09-04', description: 'Freelance design work', category: 'Income', type: 'income', amount: 450.00 },
    { id: 7, date: '2026-09-03', description: 'Bus pass', category: 'Transport', type: 'expense', amount: 40.00 },
    { id: 8, date: '2026-09-02', description: 'Pharmacy', category: 'Health', type: 'expense', amount: 18.75 },
    { id: 9, date: '2026-08-30', description: 'New shoes', category: 'Shopping', type: 'expense', amount: 65.00 },
    { id: 10, date: '2026-08-29', description: 'Transfer to savings', category: 'Savings', type: 'expense', amount: 300.00 }
];

const DEFAULT_BUDGETS = {
    'Housing': 1200.00,
    'Food': 300.00,
    'Utilities': 100.00,
    'Entertainment': 100.00,
    'Transport': 100.00,
    'Health': 50.00,
    'Shopping': 150.00
};

const DEFAULT_INVESTMENTS = [
    { id: 1, name: 'Nifty 50 Index Fund', assetClass: 'Mutual Funds', invested: 50000, current: 62400 },
    { id: 2, name: 'Parag Parikh Flexi Cap', assetClass: 'Mutual Funds', invested: 40000, current: 48600 },
    { id: 3, name: 'Bluechip Equities Basket', assetClass: 'Equities / Stocks', invested: 35000, current: 42000 },
    { id: 4, name: 'HDFC Bank Fixed Deposit', assetClass: 'Fixed Deposit', invested: 30000, current: 31800 },
    { id: 5, name: 'Sovereign Gold Bonds (SGB)', assetClass: 'Gold', invested: 20000, current: 24200 },
    { id: 6, name: 'High-Yield Emergency Reserve', assetClass: 'Emergency Fund', invested: 35000, current: 36000 }
];

/**
 * Built-in transaction categories, separated by transaction type.
 * Derived from the categories already in use across DEFAULT_TRANSACTIONS.
 * User-created categories are stored separately (see categories.getCustom).
 */
const DEFAULT_CATEGORIES = {
    income: ['Income'],
    expense: ['Food', 'Housing', 'Utilities', 'Entertainment', 'Transport', 'Health', 'Shopping', 'Savings']
};

window.FinanceAPI = {
    // Initial capital to balance ledger
    BASE_CAPITAL: 3828.30,

    config: API_CONFIG,

    /**
     * Transactions API
     */
    transactions: {
        async getAll() {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/transactions`);
                if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.statusText}`);
                return await res.json();
            }

            try {
                const stored = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (err) {
                console.warn('FinanceAPI: Error reading transactions from storage:', err);
            }
            return [...DEFAULT_TRANSACTIONS];
        },

        async saveAll(transactions) {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/transactions/bulk`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transactions)
                });
                if (!res.ok) throw new Error(`Failed to save transactions: ${res.statusText}`);
                return await res.json();
            }

            try {
                localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
                return true;
            } catch (err) {
                console.error('FinanceAPI: Error saving transactions:', err);
                return false;
            }
        },

        async create(transaction) {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/transactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transaction)
                });
                if (!res.ok) throw new Error(`Failed to create transaction: ${res.statusText}`);
                return await res.json();
            }

            const current = await this.getAll();
            const newTransaction = {
                ...transaction,
                id: transaction.id || Date.now()
            };
            current.unshift(newTransaction);
            await this.saveAll(current);
            return newTransaction;
        }
    },

    /**
     * Categories API
     * Built-in categories live in DEFAULTS (read-only, split by transaction type).
     * Only user-created ("custom") categories are persisted.
     */
    categories: {
        DEFAULTS: DEFAULT_CATEGORIES,

        async getCustom() {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/categories`);
                if (!res.ok) throw new Error(`Failed to fetch categories: ${res.statusText}`);
                return await res.json();
            }

            try {
                const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    return {
                        income: Array.isArray(parsed.income) ? parsed.income : [],
                        expense: Array.isArray(parsed.expense) ? parsed.expense : []
                    };
                }
            } catch (err) {
                console.warn('FinanceAPI: Error reading categories from storage:', err);
            }
            return { income: [], expense: [] };
        },

        async saveCustom(categories) {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/categories`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(categories)
                });
                if (!res.ok) throw new Error(`Failed to save categories: ${res.statusText}`);
                return await res.json();
            }

            try {
                localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
                return true;
            } catch (err) {
                console.error('FinanceAPI: Error saving categories:', err);
                return false;
            }
        }
    },

    /**
     * Budgets API
     */
    budgets: {
        async getAll() {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/budgets`);
                if (!res.ok) throw new Error(`Failed to fetch budgets: ${res.statusText}`);
                return await res.json();
            }

            try {
                const stored = localStorage.getItem(STORAGE_KEYS.BUDGETS);
                if (stored) return JSON.parse(stored);
            } catch (err) {
                console.warn('FinanceAPI: Error reading budgets from storage:', err);
            }
            return { ...DEFAULT_BUDGETS };
        },

        async saveAll(budgets) {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/budgets`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(budgets)
                });
                if (!res.ok) throw new Error(`Failed to save budgets: ${res.statusText}`);
                return await res.json();
            }

            try {
                localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(budgets));
                return true;
            } catch (err) {
                console.error('FinanceAPI: Error saving budgets:', err);
                return false;
            }
        }
    },

    /**
     * Savings & Investments API
     */
    investments: {
        async getAll() {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/investments`);
                if (!res.ok) throw new Error(`Failed to fetch investments: ${res.statusText}`);
                return await res.json();
            }

            try {
                const stored = localStorage.getItem(STORAGE_KEYS.INVESTMENTS);
                if (stored) return JSON.parse(stored);
            } catch (err) {
                console.warn('FinanceAPI: Error reading investments from storage:', err);
            }
            return [...DEFAULT_INVESTMENTS];
        },

        async saveAll(investments) {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/investments/bulk`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(investments)
                });
                if (!res.ok) throw new Error(`Failed to save investments: ${res.statusText}`);
                return await res.json();
            }

            try {
                localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(investments));
                return true;
            } catch (err) {
                console.error('FinanceAPI: Error saving investments:', err);
                return false;
            }
        },

        async create(investment) {
            if (API_CONFIG.USE_BACKEND) {
                const res = await fetch(`${API_CONFIG.API_BASE_URL}/investments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(investment)
                });
                if (!res.ok) throw new Error(`Failed to create investment: ${res.statusText}`);
                return await res.json();
            }

            const current = await this.getAll();
            const newInvestment = {
                ...investment,
                id: investment.id || Date.now()
            };
            current.push(newInvestment);
            await this.saveAll(current);
            return newInvestment;
        }
    }
};
