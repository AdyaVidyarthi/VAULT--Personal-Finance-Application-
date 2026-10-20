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
  let budgets = window.FinanceAPI ? await FinanceAPI.budgets.getAll() : {};
  const transactions = window.FinanceAPI
    ? await FinanceAPI.transactions.getAll()
    : [];

  const addBtn = document.getElementById("add-budget-btn");
  const formSection = document.getElementById("budget-form-section");
  const closeBtn = document.getElementById("close-budget-form-btn");
  const form = document.getElementById("add-budget-form");
  const container = document.getElementById("budget-categories-container");

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
    const cat = document.getElementById("budget-category").value;
    const limit = parseFloat(document.getElementById("budget-limit").value);
    if (cat && !isNaN(limit) && limit > 0) {
      budgets[cat] = limit;
      if (window.FinanceAPI) {
        await FinanceAPI.budgets.saveAll(budgets);
      }
      renderBudgetUI();
      form.reset();
      formSection.classList.add("hidden");
    }
  });

  function renderBudgetUI() {
    const spentMap = {};
    Object.keys(budgets).forEach((c) => (spentMap[c] = 0));

    let totalSpent = 0;
    let totalBudget = 0;
    const now = new Date();
    const targetYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    document.getElementById("budget-period").innerText =
      `Budget allocation for ${new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(now)}`;

    transactions.forEach((t) => {
      if (
        t.type === "expense" &&
        t.date &&
        t.date.startsWith(targetYearMonth)
      ) {
        const cat = t.category;
        if (spentMap[cat] !== undefined) {
          spentMap[cat] += t.amount;
        } else {
          spentMap[cat] = t.amount;
        }
        totalSpent += t.amount;
      }
    });

    Object.values(budgets).forEach((val) => (totalBudget += val));

    const remaining = Math.max(0, totalBudget - totalSpent);
    const usageRate =
      totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    document.getElementById("total-budget-amount").innerText =
      formatRupee(totalBudget);
    document.getElementById("budget-total-spent").innerText =
      formatRupee(totalSpent);
    document.getElementById("budget-remaining").innerText =
      formatRupee(remaining);
    document.getElementById("budget-usage-rate").innerText = `${usageRate}%`;

    container.innerHTML = "";
    Object.entries(budgets).forEach(([category, limit]) => {
      const spent = spentMap[category] || 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      const card = document.createElement("div");
      card.className = "category-card";

      let fillClass = "";
      if (pct >= 100) fillClass = "over-budget";
      else if (pct >= 75) fillClass = "near-budget";

      const remainingInCat = limit - spent;
      const remainingText =
        remainingInCat >= 0
          ? `${formatRupee(remainingInCat)} left`
          : `${formatRupee(Math.abs(remainingInCat))} over limit`;

      card.innerHTML = `
                <div class="card-top">
                    <span class="cat-name-badge">${escapeHtml(category)}</span>
                    <span class="cat-figures">
                        <span class="spent-highlight">${formatRupee(spent)}</span> / ${formatRupee(limit)}
                    </span>
                </div>
                <div class="cat-progress-track">
                    <div class="cat-progress-fill ${fillClass}" style="width: ${Math.min(pct, 100)}%;"></div>
                </div>
                <div class="card-bottom">
                    <span>${remainingText}</span>
                    <span class="pct-badge">${pct.toFixed(0)}%</span>
                </div>
            `;
      container.appendChild(card);
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

  renderBudgetUI();
});
