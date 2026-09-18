let BASE_CAPITAL = (window.FinanceAPI && window.FinanceAPI.BASE_CAPITAL) || 3828.30;
let transactions = [];
let customCategories = { income: [], expense: [] };

async function loadTransactions() {
    if (window.FinanceAPI) {
        return await FinanceAPI.transactions.getAll();
    }
    return [];
}

async function loadCustomCategories() {
    if (window.FinanceAPI && FinanceAPI.categories) {
        return await FinanceAPI.categories.getCustom();
    }
    return { income: [], expense: [] };
}

async function saveCustomCategories() {
    if (window.FinanceAPI && FinanceAPI.categories) {
        await FinanceAPI.categories.saveCustom(customCategories);
    }
}

async function saveTransactions() {
    if (window.FinanceAPI) {
        await FinanceAPI.transactions.saveAll(transactions);
    }
}

// DOM Elements
const tbody = document.getElementById('transaction-tbody');
const balanceEl = document.getElementById('current-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expenses');
const savingsRateEl = document.getElementById('savings-rate');

const formSection = document.getElementById('transaction-form-section');
const addBtn = document.getElementById('add-entry-btn');
const closeFormBtn = document.getElementById('close-form-btn');
const form = document.getElementById('add-transaction-form');
const exportBtn = document.getElementById('export-entries-btn');

const typeSelect = document.getElementById('form-type');
const categorySelect = document.getElementById('form-category');
const customCategoryRow = document.getElementById('custom-category-row');
const customCategoryInput = document.getElementById('form-custom-category');
const formDrawerTitle = document.getElementById('form-drawer-title');

// null = the drawer is adding a new entry; an id = it is editing that entry.
let editingId = null;

const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const filterType = document.getElementById('filter-type');

// Helper to format currency in rupees with commas
function formatRupee(amount) {
    return '₹' + amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
const formatDollar = formatRupee; // alias for backwards compatibility

// Format date without timezone drift (e.g. '2026-09-11' -> 'Sep 11')
function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${months[monthIndex]} ${day}`;
}

// Toggle Add Form Drawer
addBtn.addEventListener('click', () => {
    if (editingId !== null) {
        // Drawer is showing an existing entry: switch it back to a blank one.
        resetFormToAddMode();
        formSection.classList.remove('hidden');
    } else {
        formSection.classList.toggle('hidden');
    }

    if (!formSection.classList.contains('hidden')) {
        // Set today's date by default
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('form-date');
        if (!dateInput.value) {
            dateInput.value = '2026-09-13';
        }
        document.getElementById('form-amount').focus();
    }
});

if (closeFormBtn) {
    closeFormBtn.addEventListener('click', () => {
        formSection.classList.add('hidden');
        if (editingId !== null) {
            resetFormToAddMode();
        }
    });
}

// --------------------------------------------------------------------------
// Category Options (separate lists per transaction type + custom categories)
// --------------------------------------------------------------------------

// Sentinel value for the "add a new category" option in the category dropdown.
const CUSTOM_CATEGORY_OPTION = '__add_custom__';

// Built-in categories for a type, followed by any user-created ones.
function getCategoriesForType(type) {
    const defaults = (window.FinanceAPI && FinanceAPI.categories && FinanceAPI.categories.DEFAULTS[type]) || [];
    const custom = customCategories[type] || [];
    return [...defaults, ...custom];
}

// Rebuild the category dropdown for the given type.
function populateCategoryOptions(type, preferredValue) {
    const list = getCategoriesForType(type);

    categorySelect.innerHTML = '';

    list.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        categorySelect.appendChild(option);
    });

    const customOption = document.createElement('option');
    customOption.value = CUSTOM_CATEGORY_OPTION;
    customOption.textContent = '+ Add custom category…';
    categorySelect.appendChild(customOption);

    if (preferredValue) {
        // An existing entry may carry a category that is no longer in the list
        // for its type — keep it selectable so editing never changes it silently.
        if (!list.includes(preferredValue)) {
            const preservedOption = document.createElement('option');
            preservedOption.value = preferredValue;
            preservedOption.textContent = preferredValue;
            categorySelect.insertBefore(preservedOption, customOption);
        }
        categorySelect.value = preferredValue;
    }
}

function showCustomCategoryRow() {
    customCategoryRow.classList.remove('hidden');
    customCategoryInput.required = true;
    customCategoryInput.focus();
}

function hideCustomCategoryRow() {
    customCategoryRow.classList.add('hidden');
    customCategoryInput.required = false;
    customCategoryInput.value = '';
}

// Switching type swaps the available categories and cancels custom entry.
typeSelect.addEventListener('change', () => {
    populateCategoryOptions(typeSelect.value);
    hideCustomCategoryRow();
});

categorySelect.addEventListener('change', () => {
    if (categorySelect.value === CUSTOM_CATEGORY_OPTION) {
        showCustomCategoryRow();
    } else {
        hideCustomCategoryRow();
    }
});

// --------------------------------------------------------------------------
// Edit an existing entry (reuses the drawer in "edit mode")
// --------------------------------------------------------------------------

// Return the drawer to a blank New Transaction state.
function resetFormToAddMode() {
    editingId = null;
    if (formDrawerTitle) {
        formDrawerTitle.innerText = 'New Transaction';
    }
    form.reset();
    populateCategoryOptions(typeSelect.value);
    hideCustomCategoryRow();
}

// Load an existing entry into the drawer for editing.
function openEditForm(id) {
    const entry = transactions.find(t => t.id === id);
    if (!entry) return;

    editingId = id;
    if (formDrawerTitle) {
        formDrawerTitle.innerText = 'Edit Transaction';
    }

    typeSelect.value = entry.type;
    populateCategoryOptions(entry.type, entry.category);
    hideCustomCategoryRow();

    document.getElementById('form-amount').value = entry.amount;
    document.getElementById('form-date').value = entry.date;
    document.getElementById('form-description').value = entry.description;

    formSection.classList.remove('hidden');
    // The drawer sits above the table, so bring it into view on small screens.
    formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Recalculate summary stats based on full or active transactions
function updateSummaryCards() {
    let totalAllIncome = 0;
    let totalAllExpense = 0;

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    // We consider September 2026 (or the month of current data) as "this month"
    const targetYearMonth = '2026-09';

    transactions.forEach(t => {
        if (t.type === 'income') {
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
        savingsRate = Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100);
    }

    balanceEl.innerText = formatRupee(netBalance);
    incomeEl.innerText = formatRupee(monthlyIncome);
    expenseEl.innerText = formatRupee(monthlyExpense);
    savingsRateEl.innerText = `${savingsRate}%`;
}

// Render ledger rows
function renderTransactions(list) {
    tbody.innerHTML = '';

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No matching transactions found.</td></tr>`;
        return;
    }

    list.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.id = item.id;
        const isIncome = item.type === 'income';
        const amountClass = isIncome ? 'income-text' : 'expense-text';
        const sign = isIncome ? '+' : '-';

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

        tr.addEventListener('click', (e) => {
            // Let the delete button keep its own behaviour.
            if (e.target.closest('.delete-btn')) return;
            openEditForm(item.id);
        });

        tbody.appendChild(tr);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Handle Form Submission
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const type = document.getElementById('form-type').value;
    const amount = parseFloat(document.getElementById('form-amount').value);
    const description = document.getElementById('form-description').value.trim();
    const date = document.getElementById('form-date').value;

    // Category comes from the dropdown, unless the user is creating a new one.
    let category = categorySelect.value;
    let isNewCategory = false;

    if (category === CUSTOM_CATEGORY_OPTION) {
        const typedName = customCategoryInput.value.trim();
        if (!typedName) {
            return;
        }
        // Reuse an existing category if the typed name already matches one.
        const existing = getCategoriesForType(type)
            .find(name => name.toLowerCase() === typedName.toLowerCase());
        if (existing) {
            category = existing;
        } else {
            category = typedName;
            isNewCategory = true;
        }
    }

    if (!description || isNaN(amount) || amount <= 0 || !date) {
        return;
    }

    if (isNewCategory) {
        customCategories[type] = [...(customCategories[type] || []), category];
        await saveCustomCategories();
    }

    if (editingId !== null) {
        // Update the existing entry in place, keeping its id and list position.
        const target = transactions.find(t => t.id === editingId);
        if (!target) {
            resetFormToAddMode();
            formSection.classList.add('hidden');
            return;
        }
        target.date = date;
        target.description = description;
        target.category = category;
        target.type = type;
        target.amount = amount;
    } else {
        const newTransaction = {
            id: Date.now(),
            date: date,
            description: description,
            category: category,
            type: type,
            amount: amount
        };

        // Insert at beginning of list (chronological top)
        transactions.unshift(newTransaction);
    }

    await saveTransactions();

    updateSummaryCards();
    applyFilters();
    resetFormToAddMode();
    formSection.classList.add('hidden');
});

// Delete Transaction
window.deleteTransaction = async function (id) {
    if (editingId === id) {
        // The entry open in the drawer is gone — drop out of edit mode.
        resetFormToAddMode();
        formSection.classList.add('hidden');
    }
    transactions = transactions.filter(t => t.id !== id);
    await saveTransactions();
    updateSummaryCards();
    applyFilters();
};

// Optional: Reset data back to default initial dataset
window.resetTransactions = async function () {
    if (localStorage) localStorage.removeItem('finance_transactions_data');
    transactions = await loadTransactions();
    updateSummaryCards();
    applyFilters();
};

// --------------------------------------------------------------------------
// Export Transactions to CSV
// --------------------------------------------------------------------------

// Escape a single CSV field per RFC 4180 (quote fields containing commas,
// quotes, or newlines; double up any internal quotes).
function escapeCsvField(value) {
    const str = String(value === undefined || value === null ? '' : value);
    if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Build a CSV string from the full transactions list and trigger a download.
function exportTransactionsToCSV() {
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];

    const rows = transactions.map(item => [
        item.date,
        item.description,
        item.category,
        item.type,
        item.amount
    ].map(escapeCsvField).join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const today = new Date().toISOString().split('T')[0];
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${today}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

if (exportBtn) {
    exportBtn.addEventListener('click', exportTransactionsToCSV);
}

// Filter & Search Logic
function applyFilters() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = filterCategory.value;
    const selectedType = filterType.value;

    const filtered = transactions.filter(t => {
        const matchesSearch = !searchTerm ||
            t.description.toLowerCase().includes(searchTerm) ||
            t.category.toLowerCase().includes(searchTerm);

        const matchesCategory = (selectedCategory === 'all') || (t.category === selectedCategory);
        const matchesType = (selectedType === 'all') || (t.type === selectedType);

        return matchesSearch && matchesCategory && matchesType;
    });

    renderTransactions(filtered);
}

// Listeners
searchInput.addEventListener('input', applyFilters);
filterCategory.addEventListener('change', applyFilters);
filterType.addEventListener('change', applyFilters);

// Initial Load
async function init() {
    transactions = await loadTransactions();
    customCategories = await loadCustomCategories();
    populateCategoryOptions(typeSelect.value);
    hideCustomCategoryRow();
    updateSummaryCards();
    applyFilters();
}
init();
