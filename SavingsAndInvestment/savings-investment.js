// Color map matching CSS segment classes
const CLASS_COLORS = {
    'Mutual Funds': { class: 'seg-mf', color: '#2b593f' },
    'Equities / Stocks': { class: 'seg-eq', color: '#4b8063' },
    'Fixed Deposit': { class: 'seg-fd', color: '#ba8c53' },
    'Gold': { class: 'seg-gold', color: '#d1b46a' },
    'Emergency Fund': { class: 'seg-ef', color: '#557571' }
};

// Default sample data matching your dashboard design
const defaultHoldings = [
    { id: 1, name: "Nifty 50 Index Fund", assetClass: "Mutual Funds", invested: 50000, current: 62400 },
    { id: 2, name: "Parag Parikh Flexi Cap", assetClass: "Mutual Funds", invested: 40000, current: 48600 },
    { id: 3, name: "Bluechip Equities Basket", assetClass: "Equities / Stocks", invested: 55000, current: 42000 },
    { id: 4, name: "HDFC Bank Fixed Deposit", assetClass: "Fixed Deposit", invested: 30000, current: 31800 },
    { id: 5, name: "Sovereign Gold Bonds (SGB)", assetClass: "Gold", invested: 20000, current: 24200 },
    { id: 6, name: "Liquid Savings Reserve", assetClass: "Emergency Fund", invested: 36000, current: 36000 }
];

// Persistent state via localStorage
let holdings = JSON.parse(localStorage.getItem('holdingsData')) || defaultHoldings;
let currentFilter = 'All';

// Format numbers into Indian Rupee strings (₹xx,xxx.xx)
function formatRupee(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Master Render Function
function renderUI() {
    let totalInvested = 0;
    let totalCurrent = 0;
    let emergencyFundTotal = 0;
    let categoryTotals = {};

    // 1. Calculate overall portfolio metrics
    for (let i = 0; i < holdings.length; i++) {
        const item = holdings[i];
        totalInvested += item.invested;
        totalCurrent += item.current;

        if (item.assetClass === 'Emergency Fund') {
            emergencyFundTotal += item.current;
        }

        if (!categoryTotals[item.assetClass]) {
            categoryTotals[item.assetClass] = 0;
        }
        categoryTotals[item.assetClass] += item.current;
    }

    const totalGain = totalCurrent - totalInvested;
    const returnPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100).toFixed(1) : 0;

    // 2. Update Header Valuation & Stat Boxes
    document.getElementById('total-portfolio-val').innerText = formatRupee(totalCurrent);
    document.getElementById('emergency-fund-val').innerText = formatRupee(emergencyFundTotal);

    const gainSign = totalGain >= 0 ? '+' : '-';
    const gainClass = totalGain >= 0 ? 'income-val' : 'expense-val';

    const gainEl = document.getElementById('total-gain-val');
    gainEl.innerText = `${gainSign}${formatRupee(Math.abs(totalGain))}`;
    gainEl.className = `stat-value ${gainClass}`;

    const returnPctEl = document.getElementById('total-gain-pct');
    returnPctEl.innerText = `${gainSign}${Math.abs(returnPct)}%`;
    returnPctEl.className = `stat-value ${gainClass}`;

    // Emergency Fund Progress Fill (Target: ₹1,00,000)
    const emergencyTarget = 100000;
    const efPct = Math.min(100, (emergencyFundTotal / emergencyTarget) * 100);
    const efBar = document.getElementById('ef-progress-fill');
    if (efBar) {
        efBar.style.width = efPct + '%';
    }

    // 3. Update Allocation Track & Legend
    const trackEl = document.getElementById('allocation-track');
    const legendEl = document.getElementById('allocation-legend');
    trackEl.innerHTML = '';
    legendEl.innerHTML = '';

    const categories = Object.keys(categoryTotals);
    const countEl = document.getElementById('allocation-stats');
    if (countEl) {
        countEl.innerText = `${categories.length} Asset Classes`;
    }

    for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const val = categoryTotals[cat];
        const pct = totalCurrent > 0 ? (val / totalCurrent) * 100 : 0;
        const colorConfig = CLASS_COLORS[cat] || { class: 'seg-eq', color: '#4b8063' };

        // Allocation track segment
        const seg = document.createElement('div');
        seg.className = `allocation-seg ${colorConfig.class}`;
        seg.style.width = pct + '%';
        trackEl.appendChild(seg);

        // Legend item
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <span class="legend-dot" style="background-color: ${colorConfig.color};"></span>
            <span>${cat} (${pct.toFixed(0)}% • ${formatRupee(val)})</span>
        `;
        legendEl.appendChild(legendItem);
    }

    // 4. Update Holdings Table with Filtering Support
    const tbody = document.getElementById('holdings-tbody');
    tbody.innerHTML = '';

    const filteredHoldings = currentFilter === 'All' 
        ? holdings 
        : holdings.filter(item => item.assetClass === currentFilter);

    if (filteredHoldings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px 0; color: var(--text-muted);">No holdings found under this category.</td></tr>`;
        return;
    }

    for (let i = 0; i < filteredHoldings.length; i++) {
        const item = filteredHoldings[i];
        const itemGain = item.current - item.invested;
        const itemPct = item.invested > 0 ? ((itemGain / item.invested) * 100).toFixed(1) : 0;
        const isProfit = itemGain >= 0;
        const rowSign = isProfit ? '+' : '-';
        const rowClass = isProfit ? 'income-val' : 'expense-val';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="col-name">${item.name}</td>
            <td class="col-class"><span class="category-badge">${item.assetClass}</span></td>
            <td class="col-invested">${formatRupee(item.invested)}</td>
            <td class="col-current">${formatRupee(item.current)}</td>
            <td class="col-return ${rowClass}">${rowSign}${formatRupee(Math.abs(itemGain))} (${rowSign}${Math.abs(itemPct)}%)</td>
            <td class="col-action">
                <button type="button" class="delete-btn" title="Delete holding" onclick="deleteHolding(${item.id})">✕</button>
            </td>
        `;
        tbody.appendChild(row);
    }
}

// Filter holdings by category
window.filterCategory = function(category) {
    currentFilter = category;
    
    // Update active class on filter buttons
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        const text = chip.innerText.trim();
        if (text === category || 
           (category === 'Equities / Stocks' && text === 'Stocks') || 
           (category === 'Fixed Deposit' && text === 'FD')) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    renderUI();
};

// Safe Delete with confirmation
window.deleteHolding = function(id) {
    const target = holdings.find(item => item.id === id);
    const assetName = target ? target.name : 'this holding';

    if (confirm(`Are you sure you want to remove "${assetName}" from your portfolio?`)) {
        holdings = holdings.filter(item => item.id !== id);
        localStorage.setItem('holdingsData', JSON.stringify(holdings));
        renderUI();
    }
};

// Initialize event listeners when DOM loads
document.addEventListener('DOMContentLoaded', function () {
    const addBtn = document.getElementById('add-asset-btn');
    const closeBtn = document.getElementById('close-asset-form-btn');
    const formSection = document.getElementById('asset-form-section');
    const form = document.getElementById('add-asset-form');

    // Toggle form drawer
    if (addBtn) {
        addBtn.addEventListener('click', function () {
            formSection.classList.remove('hidden');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            formSection.classList.add('hidden');
        });
    }

    // Handle new asset submission
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();

            const name = document.getElementById('asset-name').value.trim();
            const assetClass = document.getElementById('asset-class').value;
            const invested = parseFloat(document.getElementById('asset-invested').value);
            const current = parseFloat(document.getElementById('asset-current').value);

            if (!name || isNaN(invested) || isNaN(current)) {
                return;
            }

            const newHolding = {
                id: Date.now(),
                name: name,
                assetClass: assetClass,
                invested: invested,
                current: current
            };

            holdings.unshift(newHolding);
            localStorage.setItem('holdingsData', JSON.stringify(holdings));

            renderUI();
            form.reset();
            formSection.classList.add('hidden');
        });
    }

    // Initial render call
    renderUI();
});