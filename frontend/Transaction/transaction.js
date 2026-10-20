let BASE_CAPITAL = (window.FinanceAPI && window.FinanceAPI.BASE_CAPITAL) ?? 0;
let transactions = [];

async function loadTransactions() {
  if (window.FinanceAPI) {
    return await FinanceAPI.transactions.getAll();
  }
  return [];
}

async function saveTransactions() {
  if (window.FinanceAPI) {
    transactions = await FinanceAPI.transactions.saveAll(transactions);
  }
}

// DOM Elements
const tbody = document.getElementById("transaction-tbody");
const balanceEl = document.getElementById("current-balance");
const incomeEl = document.getElementById("total-income");
const expenseEl = document.getElementById("total-expenses");
const savingsRateEl = document.getElementById("savings-rate");

const formSection = document.getElementById("transaction-form-section");
const addBtn = document.getElementById("add-entry-btn");
const closeFormBtn = document.getElementById("close-form-btn");
const form = document.getElementById("add-transaction-form");

const searchInput = document.getElementById("search-input");
const filterCategory = document.getElementById("filter-category");
const filterType = document.getElementById("filter-type");

// Helper to format currency in rupees with commas
function formatRupee(amount) {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
const formatDollar = formatRupee; // alias for backwards compatibility

// Format date without timezone drift (e.g. '2026-09-11' -> 'Sep 11')
function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthIndex = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return `${months[monthIndex]} ${day}`;
}

// Toggle Add Form Drawer
addBtn.addEventListener("click", () => {
  formSection.classList.toggle("hidden");
  if (!formSection.classList.contains("hidden")) {
    // Set today's date by default
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("form-date");
    if (!dateInput.value) {
      dateInput.value = today;
    }
    document.getElementById("form-amount").focus();
  }
});

if (closeFormBtn) {
  closeFormBtn.addEventListener("click", () => {
    formSection.classList.add("hidden");
  });
}

// Recalculate summary stats based on full or active transactions
function updateSummaryCards() {
  let totalAllIncome = 0;
  let totalAllExpense = 0;

  let monthlyIncome = 0;
  let monthlyExpense = 0;

  // We consider September 2026 (or the month of current data) as "this month"
  const now = new Date();
  const targetYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  transactions.forEach((t) => {
    if (t.type === "income") {
      totalAllIncome += t.amount;
      if (t.date && t.date.startsWith(targetYearMonth)) {
        monthlyIncome += t.amount;
      }
    } else {
      totalAllExpense += t.amount;
      if (t.date && t.date.startsWith(targetYearMonth)) {
        monthlyExpense += t.amount;
      }
    }
  });

  const netBalance = BASE_CAPITAL + totalAllIncome - totalAllExpense;

  let savingsRate = 0;
  if (monthlyIncome > 0) {
    savingsRate = Math.round(
      ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100,
    );
  }

  balanceEl.innerText = formatRupee(netBalance);
  incomeEl.innerText = formatRupee(monthlyIncome);
  expenseEl.innerText = formatRupee(monthlyExpense);
  savingsRateEl.innerText = `${savingsRate}%`;
}

// Render ledger rows
function renderTransactions(list) {
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No matching transactions found.</td></tr>`;
    return;
  }

  list.forEach((item) => {
    const tr = document.createElement("tr");
    const isIncome = item.type === "income";
    const amountClass = isIncome ? "income-text" : "expense-text";
    const sign = isIncome ? "+" : "-";

    tr.innerHTML = `
            <td class="col-date">${formatDate(item.date)}</td>
            <td class="col-desc">${escapeHtml(item.description)}</td>
            <td class="col-category">
                <span class="category-badge">${escapeHtml(item.category)}</span>
            </td>
            <td class="col-amount ${amountClass}">
                ${sign}${formatRupee(item.amount)}
            </td>
            <td class="col-action">
                <button class="delete-btn" type="button" title="Delete entry" onclick="deleteTransaction(${item.id})">✕</button>
            </td>
        `;

    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Handle Form Submission
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const type = document.getElementById("form-type").value;
  const amount = parseFloat(document.getElementById("form-amount").value);
  const category = document.getElementById("form-category").value;
  const description = document.getElementById("form-description").value.trim();
  const date = document.getElementById("form-date").value;

  if (!description || isNaN(amount) || amount <= 0 || !date) {
    return;
  }

  const newTransaction = {
    id: Date.now(),
    date: date,
    description: description,
    category: category,
    type: type,
    amount: amount,
  };

  // Insert at beginning of list (chronological top)
  transactions.unshift(newTransaction);
  await saveTransactions();

  updateSummaryCards();
  applyFilters();
  form.reset();
  formSection.classList.add("hidden");
});

// Delete Transaction
window.deleteTransaction = async function (id) {
  transactions = transactions.filter((t) => t.id !== id);
  await saveTransactions();
  updateSummaryCards();
  applyFilters();
};

// Optional: Reset data back to default initial dataset
window.resetTransactions = async function () {
  if (localStorage) localStorage.removeItem("finance_transactions_data");
  transactions = await loadTransactions();
  updateSummaryCards();
  applyFilters();
};

// Filter & Search Logic
function applyFilters() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = filterCategory.value;
  const selectedType = filterType.value;

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.description.toLowerCase().includes(searchTerm) ||
      t.category.toLowerCase().includes(searchTerm);

    const matchesCategory =
      selectedCategory === "all" || t.category === selectedCategory;
    const matchesType = selectedType === "all" || t.type === selectedType;

    return matchesSearch && matchesCategory && matchesType;
  });

  renderTransactions(filtered);
}

// Listeners
searchInput.addEventListener("input", applyFilters);
filterCategory.addEventListener("change", applyFilters);
filterType.addEventListener("change", applyFilters);

// Initial Load
async function init() {
  transactions = await loadTransactions();
  updateSummaryCards();
  applyFilters();
}
init();
