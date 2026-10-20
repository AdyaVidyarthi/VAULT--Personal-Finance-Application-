const CLASS_COLORS = {
  "Mutual Funds": { class: "seg-mf", color: "#2b593f" },
  "Equities / Stocks": { class: "seg-eq", color: "#4b8063" },
  "Fixed Deposit": { class: "seg-fd", color: "#ba8c53" },
  Gold: { class: "seg-gold", color: "#d1b46a" },
  "Emergency Fund": { class: "seg-ef", color: "#557571" },
};

function formatRupee(amount) {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

document.addEventListener("DOMContentLoaded", async () => {
  let holdings = window.FinanceAPI ? await FinanceAPI.investments.getAll() : [];

  const addBtn = document.getElementById("add-asset-btn");
  const formSection = document.getElementById("asset-form-section");
  const closeBtn = document.getElementById("close-asset-form-btn");
  const form = document.getElementById("add-asset-form");

  const totalValEl = document.getElementById("total-portfolio-val");
  const totalGainEl = document.getElementById("total-gain-val");
  const totalGainPctEl = document.getElementById("total-gain-pct");
  const emergencyFundEl = document.getElementById("emergency-fund-val");

  const trackEl = document.getElementById("allocation-track");
  const legendEl = document.getElementById("allocation-legend");
  const tbody = document.getElementById("holdings-tbody");

  addBtn.addEventListener("click", () => {
    formSection.classList.toggle("hidden");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      formSection.classList.add("hidden");
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("asset-name").value.trim();
    const assetClass = document.getElementById("asset-class").value;
    const invested = parseFloat(
      document.getElementById("asset-invested").value,
    );
    const current = parseFloat(document.getElementById("asset-current").value);

    if (!name || isNaN(invested) || isNaN(current) || invested <= 0) return;

    const newHolding = {
      id: Date.now(),
      name,
      assetClass,
      invested,
      current,
    };

    holdings.unshift(newHolding);
    if (window.FinanceAPI) {
      holdings = await FinanceAPI.investments.saveAll(holdings);
    }
    renderHoldingsUI();
    form.reset();
    formSection.classList.add("hidden");
  });

  window.deleteHolding = async function (id) {
    holdings = holdings.filter((h) => h.id !== id);
    if (window.FinanceAPI) {
      holdings = await FinanceAPI.investments.saveAll(holdings);
    }
    renderHoldingsUI();
  };

  function renderHoldingsUI() {
    let totalInvested = 0;
    let totalCurrent = 0;
    let emergencyTotal = 0;
    const classValues = {};

    holdings.forEach((h) => {
      totalInvested += h.invested;
      totalCurrent += h.current;
      if (h.assetClass === "Emergency Fund") {
        emergencyTotal += h.current;
      }
      classValues[h.assetClass] = (classValues[h.assetClass] || 0) + h.current;
    });

    const totalGain = totalCurrent - totalInvested;
    const totalGainPct =
      totalInvested > 0
        ? ((totalGain / totalInvested) * 100).toFixed(1)
        : "0.0";

    // Headers
    totalValEl.innerText = formatRupee(totalCurrent);
    const gainSign = totalGain >= 0 ? "+" : "-";
    totalGainEl.innerText = `${gainSign}${formatRupee(Math.abs(totalGain))}`;
    totalGainEl.className = `stat-value ${totalGain >= 0 ? "income-val" : "expense-val"}`;

    totalGainPctEl.innerText = `${gainSign}${Math.abs(totalGainPct)}%`;
    totalGainPctEl.className = `stat-value ${totalGain >= 0 ? "income-val" : "expense-val"}`;
    emergencyFundEl.innerText = formatRupee(emergencyTotal);

    // Allocation Track & Legend
    trackEl.innerHTML = "";
    legendEl.innerHTML = "";

    Object.entries(classValues).forEach(([cls, val]) => {
      const pct = totalCurrent > 0 ? (val / totalCurrent) * 100 : 0;
      const meta = CLASS_COLORS[cls] || { class: "seg-eq", color: "#4b8063" };

      // Segment in track
      const seg = document.createElement("div");
      seg.className = `allocation-seg ${meta.class}`;
      seg.style.width = `${pct.toFixed(1)}%`;
      seg.title = `${cls}: ${pct.toFixed(1)}% (${formatRupee(val)})`;
      trackEl.appendChild(seg);

      // Legend item
      const legendItem = document.createElement("div");
      legendItem.className = "legend-item";
      legendItem.innerHTML = `
                <span class="legend-dot" style="background-color: ${meta.color};"></span>
                <span>${escapeHtml(cls)} (${pct.toFixed(0)}% • ${formatRupee(val)})</span>
            `;
      legendEl.appendChild(legendItem);
    });

    // Holdings Table
    tbody.innerHTML = "";
    if (holdings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px 0; color: var(--text-muted);">No holdings added yet.</td></tr>`;
      return;
    }

    holdings.forEach((item) => {
      const gain = item.current - item.invested;
      const pct =
        item.invested > 0 ? ((gain / item.invested) * 100).toFixed(1) : "0.0";
      const isProfit = gain >= 0;
      const sign = isProfit ? "+" : "-";
      const gainClass = isProfit ? "income-val" : "expense-val";

      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td class="col-name">${escapeHtml(item.name)}</td>
                <td class="col-class"><span class="category-badge">${escapeHtml(item.assetClass)}</span></td>
                <td class="col-invested">${formatRupee(item.invested)}</td>
                <td class="col-current">${formatRupee(item.current)}</td>
                <td class="col-return ${gainClass}">${sign}${formatRupee(Math.abs(gain))} (${sign}${Math.abs(pct)}%)</td>
                <td class="col-action">
                    <button class="delete-btn" type="button" title="Delete holding" onclick="deleteHolding(${item.id})">✕</button>
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

  renderHoldingsUI();
});
