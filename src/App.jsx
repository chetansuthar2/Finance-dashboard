import { useEffect, useState } from "react";
import {
  CATEGORY_OPTIONS,
  LOCAL_STORAGE_KEY,
  OPENING_BALANCE,
  ROLE_OPTIONS,
  seedTransactions,
} from "./data.js";
import {
  calculateSummary,
  formatCurrency,
  formatDate,
  formatSignedCurrency,
  getCategoryOptions,
  getInsights,
  getLatestTransactionDate,
  getMonthOptions,
  getSpendingBreakdown,
  getTrendData,
  getVisibleTransactions,
  toCsv,
} from "./utils.js";
import { BreakdownChart, TrendChart } from "./components/Charts.jsx";
import TransactionModal from "./components/TransactionModal.jsx";

const defaultFilters = {
  search: "",
  type: "all",
  category: "all",
  month: "all",
  sort: "date-desc",
};

const closedEditor = {
  isOpen: false,
  mode: "create",
  transactionId: null,
};

function clampPercent(value, minimum = 12) {
  if (!Number.isFinite(value)) {
    return minimum;
  }
  return Math.max(minimum, Math.min(Math.round(value), 100));
}

function sortTransactionsByDate(transactions) {
  return [...transactions].sort((left, right) => {
    if (left.date === right.date) {
      return left.id.localeCompare(right.id);
    }
    return right.date.localeCompare(left.date);
  });
}

function readPersistedDashboardState() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getInitialTransactions() {
  const persisted = readPersistedDashboardState();
  return persisted.transactions?.length
    ? sortTransactionsByDate(persisted.transactions)
    : sortTransactionsByDate(seedTransactions);
}

function getInitialRole() {
  const persisted = readPersistedDashboardState();
  return persisted.role ?? "admin";
}

function buildTransactionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `tx-${crypto.randomUUID()}`;
  }
  return `tx-${Date.now()}`;
}

export default function App() {
  const [role, setRole] = useState(getInitialRole);
  const [transactions, setTransactions] = useState(getInitialTransactions);
  const [filters, setFilters] = useState(defaultFilters);
  const [editor, setEditor] = useState(closedEditor);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          role,
          transactions,
        })
      );
    } catch {
      return;
    }
  }, [role, transactions]);

  const summary = calculateSummary(transactions, OPENING_BALANCE);
  const trendData = getTrendData(transactions, OPENING_BALANCE);
  const breakdown = getSpendingBreakdown(transactions);
  const insights = getInsights(transactions, OPENING_BALANCE);
  const visibleTransactions = getVisibleTransactions(transactions, filters);
  const categoryOptions = getCategoryOptions(transactions);
  const monthOptions = getMonthOptions(transactions);
  const latestMonth = trendData[trendData.length - 1];
  const previousMonth = trendData[trendData.length - 2];
  const balanceDelta = latestMonth && previousMonth ? latestMonth.balance - previousMonth.balance : 0;
  const latestNet = latestMonth ? latestMonth.income - latestMonth.expenses : summary.income - summary.expenses;
  const topSpend = breakdown[0];
  const expenseEntries = transactions.filter((transaction) => transaction.type === "expense");
  const averageExpense = expenseEntries.length ? summary.expenses / expenseEntries.length : 0;
  const editingTransaction =
    editor.mode === "edit"
      ? transactions.find((transaction) => transaction.id === editor.transactionId) ?? null
      : null;
  const isAdmin = role === "admin";
  const heroHighlights = [
    {
      label: "Active cycle",
      value: latestMonth?.label ?? "Awaiting data",
      tone: "hero-highlight-accent",
    },
    {
      label: "Net cash flow",
      value: formatSignedCurrency(latestNet),
      tone: latestNet >= 0 ? "hero-highlight-positive" : "hero-highlight-negative",
    },
    {
      label: "Top spend",
      value: topSpend?.category ?? "No category yet",
      tone: "hero-highlight-warm",
    },
  ];
  const heroMetrics = [
    {
      label: "Average expense",
      value: averageExpense ? formatCurrency(averageExpense) : formatCurrency(0),
      detail: expenseEntries.length ? "Per expense entry" : "Waiting on expense data",
    },
    {
      label: "Savings rate",
      value: `${Math.round(summary.savingsRate)}%`,
      detail: latestMonth ? `${latestMonth.label} snapshot` : "Overall ratio",
    },
    {
      label: "Role access",
      value: isAdmin ? "Full control" : "Viewer view",
      detail: isAdmin ? "Add, edit, export enabled" : "Insights and filters only",
    },
  ];
  const summaryCards = [
    {
      key: "balance",
      title: "Total balance",
      eyebrow: "Portfolio",
      value: formatCurrency(summary.balance),
      detail: latestMonth
        ? `${formatSignedCurrency(balanceDelta)} vs last month`
        : "Running balance snapshot",
      meter: clampPercent(
        summary.income > 0 ? ((summary.balance - OPENING_BALANCE) / summary.income) * 100 + 48 : 48,
        20
      ),
      tone: "summary-balance",
    },
    {
      key: "income",
      title: "Total income",
      eyebrow: "Cash in",
      value: formatCurrency(summary.income),
      detail: `${transactions.filter((transaction) => transaction.type === "income").length} income entries`,
      meter: clampPercent(
        summary.income + summary.expenses > 0
          ? (summary.income / (summary.income + summary.expenses)) * 100
          : 0,
        18
      ),
      tone: "summary-income",
    },
    {
      key: "expenses",
      title: "Total expenses",
      eyebrow: "Cash out",
      value: formatCurrency(summary.expenses),
      detail: `${expenseEntries.length} expense entries`,
      meter: clampPercent(
        summary.income > 0 ? (summary.expenses / summary.income) * 100 : 0,
        16
      ),
      tone: "summary-expense",
    },
    {
      key: "savings",
      title: "Savings rate",
      eyebrow: "Efficiency",
      value: `${Math.round(summary.savingsRate)}%`,
      detail: latestMonth
        ? `${latestMonth.label} net ${formatCurrency(latestMonth.income - latestMonth.expenses)}`
        : "Income vs spend ratio",
      meter: clampPercent(Math.abs(summary.savingsRate), 14),
      tone: "summary-savings",
    },
  ];
  const insightStrengths = [
    clampPercent(topSpend?.percent ?? 0, 16),
    clampPercent(
      previousMonth && latestMonth && previousMonth.expenses > 0
        ? (Math.abs(latestMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100
        : 42,
      20
    ),
    clampPercent(Math.abs(summary.savingsRate), 24),
  ];

  function handleRoleChange(nextRole) {
    setRole(nextRole);
    if (nextRole !== "admin") {
      setEditor(closedEditor);
    }
  }

  function handleFilterChange(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleResetFilters() {
    setFilters(defaultFilters);
  }

  function handleOpenEditor(mode, transactionId = null) {
    if (!isAdmin) {
      return;
    }

    setEditor({
      isOpen: true,
      mode,
      transactionId,
    });
  }

  function handleCloseEditor() {
    setEditor(closedEditor);
  }

  function handleSaveTransaction(transaction) {
    if (!isAdmin) {
      return;
    }

    setTransactions((current) => {
      const nextTransactions =
        transaction.id && current.some((item) => item.id === transaction.id)
          ? current.map((item) => (item.id === transaction.id ? transaction : item))
          : [{ ...transaction, id: buildTransactionId() }, ...current];

      return sortTransactionsByDate(nextTransactions);
    });
    setEditor(closedEditor);
  }

  function handleDeleteTransaction(transactionId) {
    if (!isAdmin) {
      return;
    }

    setTransactions((current) =>
      sortTransactionsByDate(current.filter((transaction) => transaction.id !== transactionId))
    );
    setEditor(closedEditor);
  }

  function handleRestoreSampleData() {
    if (!isAdmin) {
      return;
    }

    setTransactions(sortTransactionsByDate(seedTransactions));
    setFilters(defaultFilters);
    setEditor(closedEditor);
  }

  function handleExportJson() {
    if (!isAdmin) {
      return;
    }
    downloadFile(
      "ledger-lens-transactions.json",
      JSON.stringify(transactions, null, 2),
      "application/json"
    );
  }

  function handleExportCsv() {
    if (!isAdmin) {
      return;
    }
    downloadFile("ledger-lens-transactions.csv", toCsv(transactions), "text/csv;charset=utf-8");
  }

  return (
    <div className="app-shell">
      <div className="page-noise" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Finance Dashboard UI</p>
          <h1>Ledger Lens</h1>
          <p className="hero-text">
            A compact React finance dashboard built with mock data, role-based interactions,
            responsive layouts, and clear frontend state flow.
          </p>
          <div className="hero-badge-row">
            <span className="hero-badge">Responsive Finance UI</span>
            <span className="hero-badge hero-badge-accent">Local persistence enabled</span>
          </div>
          <div className="hero-spotlight">
            {heroHighlights.map((item) => (
              <article key={item.label} className={`hero-highlight ${item.tone}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </div>

        <div className="hero-actions">
          <label className="control-card">
            <span>Role</span>
            <select value={role} onChange={(event) => handleRoleChange(event.target.value)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="button-row">
            <button
              className="secondary-button"
              onClick={handleExportJson}
              type="button"
              disabled={!isAdmin}
            >
              Export JSON
            </button>
            <button
              className="secondary-button"
              onClick={handleExportCsv}
              type="button"
              disabled={!isAdmin}
            >
              Export CSV
            </button>
            <button
              className="primary-button"
              onClick={() => handleOpenEditor("create")}
              type="button"
              disabled={!isAdmin}
            >
              Add transaction
            </button>
          </div>

          <div className="role-note">
            {isAdmin ? (
              <>
                <span className="status-pill status-admin">Admin mode</span>
                <p>You can add, edit, delete, restore, and export transactions.</p>
              </>
            ) : (
              <>
                <span className="status-pill status-viewer">Viewer mode</span>
                <p>The dashboard stays fully explorable, but all mutation controls are read only.</p>
              </>
            )}
          </div>

          <div className="hero-metrics">
            {heroMetrics.map((metric) => (
              <article key={metric.label} className="hero-metric-card">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </article>
            ))}
          </div>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="section-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Overview</p>
              <h2>Financial summary at a glance</h2>
            </div>
            <span className="subtle-chip">Opening balance {formatCurrency(OPENING_BALANCE)}</span>
          </div>

          <div className="summary-grid">
            {summaryCards.map((card) => (
              <article key={card.key} className={`summary-card ${card.tone}`}>
                <div className="summary-card-top">
                  <p>{card.eyebrow}</p>
                  <span className="summary-chip">{card.title}</span>
                </div>
                <strong>{card.value}</strong>
                <span>{card.detail}</span>
                <div className="summary-meter">
                  <span style={{ width: `${card.meter}%` }} />
                </div>
              </article>
            ))}
          </div>

          <div className="charts-grid">
            <article className="chart-card">
              <TrendChart data={trendData} />
            </article>
            <article className="chart-card">
              <BreakdownChart breakdown={breakdown} />
            </article>
          </div>
        </section>

        <section className="section-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Insights</p>
              <h2>Small observations pulled from the data</h2>
            </div>
            <span className="subtle-chip">{transactions.length} transactions loaded</span>
          </div>

          <div className="insights-grid">
            {insights.map((insight, index) => (
              <article key={insight.label} className="insight-card">
                <p className="insight-label">{insight.label}</p>
                <h3>{insight.headline}</h3>
                <p>{insight.detail}</p>
                <div className="insight-meter">
                  <span style={{ width: `${insightStrengths[index] ?? 28}%` }} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="transactions-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Transactions</p>
              <h2>Search, filter, and sort financial activity</h2>
            </div>
            <button
              className="ghost-button"
              onClick={handleRestoreSampleData}
              type="button"
              disabled={!isAdmin}
            >
              Restore sample data
            </button>
          </div>

          <div className="filters-grid">
            <label className="control-card search-card">
              <span>Search</span>
              <input
                type="search"
                placeholder="Search title, category, or note"
                value={filters.search}
                onChange={(event) => handleFilterChange("search", event.target.value)}
              />
            </label>
            <label className="control-card">
              <span>Type</span>
              <select
                value={filters.type}
                onChange={(event) => handleFilterChange("type", event.target.value)}
              >
                <option value="all">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <label className="control-card">
              <span>Category</span>
              <select
                value={filters.category}
                onChange={(event) => handleFilterChange("category", event.target.value)}
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="control-card">
              <span>Month</span>
              <select
                value={filters.month}
                onChange={(event) => handleFilterChange("month", event.target.value)}
              >
                <option value="all">All months</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="control-card">
              <span>Sort</span>
              <select
                value={filters.sort}
                onChange={(event) => handleFilterChange("sort", event.target.value)}
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Highest amount</option>
                <option value="amount-asc">Lowest amount</option>
              </select>
            </label>
            <button className="ghost-button reset-button" onClick={handleResetFilters} type="button">
              Reset filters
            </button>
          </div>

          {transactions.length ? (
            <div className="transactions-summary">
              <span>
                {visibleTransactions.length} of {transactions.length} transactions
              </span>
              <span>Latest activity {formatDate(getLatestTransactionDate(transactions))}</span>
            </div>
          ) : (
            <div className="transactions-summary">
              <span>0 transactions loaded</span>
              <span>
                {isAdmin
                  ? "Add a transaction or restore the sample dataset."
                  : "Switch to Admin to repopulate the dashboard."}
              </span>
            </div>
          )}

          {!transactions.length ? (
            <div className="empty-state">
              <h3>The dataset is currently empty</h3>
              <p>
                The dashboard gracefully handles a blank state, including charts and insights. You
                can repopulate it any time.
              </p>
              {isAdmin ? (
                <div className="button-row">
                  <button
                    className="primary-button"
                    onClick={() => handleOpenEditor("create")}
                    type="button"
                  >
                    Add transaction
                  </button>
                </div>
              ) : (
                <span className="read-only-label">Viewer mode is read only</span>
              )}
            </div>
          ) : !visibleTransactions.length ? (
            <div className="empty-state">
              <h3>No transactions match the current filters</h3>
              <p>Try resetting the filters, switching months, or restoring the sample dataset.</p>
              <button className="primary-button" onClick={handleResetFilters} type="button">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="table-shell">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>{isAdmin ? "Actions" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTransactions.map((transaction, index) => (
                    <tr
                      key={transaction.id}
                      className="transaction-row"
                      style={{ "--row-index": String(index) }}
                    >
                      <td>
                        <div className="transaction-title">{transaction.title}</div>
                        <div className="transaction-note">{transaction.note || "No note added"}</div>
                      </td>
                      <td>{formatDate(transaction.date)}</td>
                      <td>
                        <span className="category-pill">{transaction.category}</span>
                      </td>
                      <td>
                        <span className={`type-pill type-${transaction.type}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td
                        className={`amount-cell ${
                          transaction.type === "income" ? "amount-positive" : "amount-negative"
                        }`}
                      >
                        {transaction.type === "income"
                          ? formatSignedCurrency(transaction.amount)
                          : formatSignedCurrency(-transaction.amount)}
                      </td>
                      <td>
                        {isAdmin ? (
                          <button
                            className="ghost-button inline-button"
                            onClick={() => handleOpenEditor("edit", transaction.id)}
                            type="button"
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="read-only-label">Read only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <TransactionModal
        isOpen={editor.isOpen}
        mode={editor.mode}
        transaction={editingTransaction}
        categoryOptions={categoryOptions.length ? categoryOptions : CATEGORY_OPTIONS}
        defaultDate={getLatestTransactionDate(transactions)}
        onClose={handleCloseEditor}
        onDelete={handleDeleteTransaction}
        onSave={handleSaveTransaction}
      />
    </div>
  );
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
