function formatRupee(amount) {
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

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
  return `${months[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const [transactions, budgets, investments] = await Promise.all([
    FinanceAPI.transactions.getAll(),
    FinanceAPI.budgets.getAll(),
    FinanceAPI.investments.getAll(),
  ]);

  let totalAllIncome = 0;
  let totalAllExpense = 0;
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  const now = new Date();
  const targetYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
  }).format(now);

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

  const investmentValue = investments.reduce(
    (total, item) => total + Number(item.current),
    0,
  );
  const netBalance =
    FinanceAPI.BASE_CAPITAL +
    totalAllIncome -
    totalAllExpense +
    investmentValue;
  let savingsRate = 0;
  const monthlySaved = Math.max(0, monthlyIncome - monthlyExpense);
  if (monthlyIncome > 0) {
    savingsRate = Math.round((monthlySaved / monthlyIncome) * 100);
  }

  // Populate Headers
  document.getElementById("home-net-balance").innerText =
    formatRupee(netBalance);
  document.getElementById("home-income").innerText = formatRupee(monthlyIncome);
  document.getElementById("home-expenses").innerText =
    formatRupee(monthlyExpense);
  document.getElementById("home-savings-rate").innerText = `${savingsRate}%`;
  document.getElementById("cashflow-period").innerText = monthLabel;
  document.getElementById("flow-expense-label").innerText =
    `Spent (${formatRupee(monthlyExpense)})`;
  document.getElementById("flow-savings-label").innerText =
    `Retained / Saved (${formatRupee(monthlyIncome - monthlyExpense)})`;

  // Cash flow bar calculation
  const expensePercent =
    monthlyIncome > 0
      ? Math.min(100, (monthlyExpense / monthlyIncome) * 100)
      : 0;
  const savedPercent = Math.max(0, 100 - expensePercent);
  const expenseBar = document.getElementById("flow-expense-bar");
  const savingsBar = document.getElementById("flow-savings-bar");
  if (expenseBar && savingsBar) {
    expenseBar.style.width = `${expensePercent.toFixed(1)}%`;
    savingsBar.style.width = `${savedPercent.toFixed(1)}%`;
    expenseBar.title = `Expenses (${expensePercent.toFixed(1)}%)`;
    savingsBar.title = `Saved (${savedPercent.toFixed(1)}%)`;
  }

  const budgetCount = Object.keys(budgets).length;
  const spentByCategory = {};
  transactions.forEach((item) => {
    if (item.type === "expense" && item.date?.startsWith(targetYearMonth)) {
      spentByCategory[item.category] =
        (spentByCategory[item.category] || 0) + item.amount;
    }
  });
  const overBudget = Object.entries(budgets).some(
    ([category, limit]) => (spentByCategory[category] || 0) > limit,
  );
  document.getElementById("home-budget-count").innerText =
    `${budgetCount} ${budgetCount === 1 ? "category" : "categories"} tracked`;
  document.getElementById("home-budget-state").innerText = budgetCount
    ? overBudget
      ? "Review limits"
      : "On track"
    : "Set a target";
  const invested = investments.reduce(
    (total, item) => total + Number(item.invested),
    0,
  );
  const gain = investmentValue - invested;
  document.getElementById("home-investment-value").innerText =
    `${formatRupee(investmentValue)} portfolio`;
  document.getElementById("home-investment-return").innerText = invested
    ? `${gain >= 0 ? "+" : "-"}${formatRupee(Math.abs(gain))} return`
    : "No holdings yet";

  // Populate Recent Transactions (Top 5)
  const recentTbody = document.getElementById("home-recent-tbody");
  if (recentTbody) {
    recentTbody.innerHTML = "";
    const top5 = transactions.slice(0, 5);

    if (top5.length === 0) {
      recentTbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--text-muted); padding: 20px 0;">No recent transactions.</td></tr>`;
      return;
    }

    top5.forEach((item) => {
      const tr = document.createElement("tr");
      const isIncome = item.type === "income";
      const amountClass = isIncome ? "income-val" : "expense-val";
      const sign = isIncome ? "+" : "-";

      tr.innerHTML = `
                <td class="preview-date">${formatDate(item.date)}</td>
                <td class="preview-desc">${escapeHtml(item.description)}</td>
                <td class="preview-amount ${amountClass}">${sign}${formatRupee(item.amount)}</td>
            `;
      recentTbody.appendChild(tr);
    });
  }
});

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
