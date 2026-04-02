import { CATEGORY_OPTIONS, OPENING_BALANCE, ROLE_OPTIONS } from "./data.js";
import { createStore } from "./store.js";
import { renderBreakdownChart, renderTrendChart } from "./charts.js";
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

const store = createStore();
const root = document.querySelector("#app");

root.innerHTML = `
  <div class="app-shell">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <header class="hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">Finance Dashboard UI</p>
        <h1>Ledger Lens</h1>
        <p class="hero-text">
          A compact finance dashboard built with mock data, role-based interactions, responsive
          layouts, and a few thoughtful details for exploration.
        </p>
      </div>
      <div class="hero-actions">
        <label class="control-card">
          <span>Role</span>
          <select id="roleSelect"></select>
        </label>
        <div class="button-row">
          <button class="secondary-button" id="exportJsonButton" type="button">Export JSON</button>
          <button class="secondary-button" id="exportCsvButton" type="button">Export CSV</button>
          <button class="primary-button" id="addTransactionButton" type="button">Add transaction</button>
        </div>
        <div class="role-note" id="roleNote"></div>
      </div>
    </header>

    <main class="dashboard-grid">
      <section id="overviewSection"></section>
      <section id="insightsSection"></section>
      <section class="transactions-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Transactions</p>
            <h2>Search, filter, and sort financial activity</h2>
          </div>
          <button class="ghost-button" id="restoreSampleButton" type="button">Restore sample data</button>
        </div>
        <div class="filters-grid">
          <label class="control-card search-card">
            <span>Search</span>
            <input id="searchInput" type="search" placeholder="Search title, category, or note" />
          </label>
          <label class="control-card">
            <span>Type</span>
            <select id="typeFilter">
              <option value="all">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>
          <label class="control-card">
            <span>Category</span>
            <select id="categoryFilter"></select>
          </label>
          <label class="control-card">
            <span>Month</span>
            <select id="monthFilter"></select>
          </label>
          <label class="control-card">
            <span>Sort</span>
            <select id="sortFilter">
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
            </select>
          </label>
          <button class="ghost-button reset-button" id="resetFiltersButton" type="button">Reset filters</button>
        </div>
        <div id="transactionsSummary" class="transactions-summary"></div>
        <div id="transactionsTableMount"></div>
      </section>
    </main>

    <div id="modalMount"></div>
  </div>
`;

const refs = {
  roleSelect: document.querySelector("#roleSelect"),
  roleNote: document.querySelector("#roleNote"),
  addTransactionButton: document.querySelector("#addTransactionButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  restoreSampleButton: document.querySelector("#restoreSampleButton"),
  overviewSection: document.querySelector("#overviewSection"),
  insightsSection: document.querySelector("#insightsSection"),
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  monthFilter: document.querySelector("#monthFilter"),
  sortFilter: document.querySelector("#sortFilter"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  transactionsSummary: document.querySelector("#transactionsSummary"),
  transactionsTableMount: document.querySelector("#transactionsTableMount"),
  modalMount: document.querySelector("#modalMount"),
};

bindEvents();
store.subscribe(render);
render(store.getState());

function bindEvents() {
  refs.roleSelect.addEventListener("change", (event) => {
    store.setRole(event.target.value);
  });

  refs.searchInput.addEventListener("input", (event) => {
    store.setFilters({ search: event.target.value });
  });

  refs.typeFilter.addEventListener("change", (event) => {
    store.setFilters({ type: event.target.value });
  });

  refs.categoryFilter.addEventListener("change", (event) => {
    store.setFilters({ category: event.target.value });
  });

  refs.monthFilter.addEventListener("change", (event) => {
    store.setFilters({ month: event.target.value });
  });

  refs.sortFilter.addEventListener("change", (event) => {
    store.setFilters({ sort: event.target.value });
  });

  refs.resetFiltersButton.addEventListener("click", () => {
    store.resetFilters();
  });

  refs.addTransactionButton.addEventListener("click", () => {
    if (store.getState().role !== "admin") {
      return;
    }

    store.openEditor("create");
  });

  refs.restoreSampleButton.addEventListener("click", () => {
    if (store.getState().role !== "admin") {
      return;
    }
    store.restoreSampleData();
  });

  refs.exportJsonButton.addEventListener("click", () => {
    if (store.getState().role !== "admin") {
      return;
    }
    const { transactions } = store.getState();
    downloadFile("ledger-lens-transactions.json", JSON.stringify(transactions, null, 2), "application/json");
  });

  refs.exportCsvButton.addEventListener("click", () => {
    if (store.getState().role !== "admin") {
      return;
    }
    const { transactions } = store.getState();
    downloadFile("ledger-lens-transactions.csv", toCsv(transactions), "text/csv;charset=utf-8");
  });

  refs.transactionsTableMount.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-open-editor]");
    if (addButton && store.getState().role === "admin") {
      store.openEditor("create");
      return;
    }

    const resetButton = event.target.closest("[data-reset-filters]");
    if (resetButton) {
      store.resetFilters();
      return;
    }

    const editButton = event.target.closest("[data-edit-transaction]");

    if (editButton) {
      const { role } = store.getState();
      if (role !== "admin") {
        return;
      }
      store.openEditor("edit", editButton.dataset.editTransaction);
    }
  });

  refs.modalMount.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-editor]") || event.target.matches(".modal-backdrop")) {
      store.closeEditor();
    }

    const deleteButton = event.target.closest("[data-delete-transaction]");
    if (deleteButton) {
      store.deleteTransaction(deleteButton.dataset.deleteTransaction);
    }
  });

  refs.modalMount.addEventListener("submit", (event) => {
    if (!event.target.matches("#transactionForm")) {
      return;
    }

    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = {
      id: formData.get("id") || null,
      date: String(formData.get("date")),
      title: String(formData.get("title")).trim(),
      amount: Number(formData.get("amount")),
      category: String(formData.get("category")),
      type: String(formData.get("type")),
      note: String(formData.get("note")).trim(),
    };

    if (!payload.title || !payload.date || !payload.category || !payload.type || payload.amount <= 0) {
      event.target.reportValidity();
      return;
    }

    store.saveTransaction(payload);
  });
}

function render(state) {
  syncRoleControls(state);
  syncFilterControls(state);
  renderOverview(state);
  renderInsights(state);
  renderTransactions(state);
  renderModal(state);
}

function syncRoleControls(state) {
  refs.roleSelect.innerHTML = ROLE_OPTIONS.map(
    (option) => `<option value="${option.value}">${option.label}</option>`
  ).join("");
  refs.roleSelect.value = state.role;

  refs.roleNote.innerHTML =
    state.role === "admin"
      ? `
        <span class="status-pill status-admin">Admin mode</span>
        <p>You can add, edit, or delete transactions to demonstrate frontend-only RBAC behavior.</p>
      `
      : `
        <span class="status-pill status-viewer">Viewer mode</span>
        <p>The dashboard remains fully explorable, but add, edit, delete, restore, and export controls are disabled.</p>
      `;

  refs.addTransactionButton.disabled = state.role !== "admin";
  refs.exportJsonButton.disabled = state.role !== "admin";
  refs.exportCsvButton.disabled = state.role !== "admin";
  refs.restoreSampleButton.disabled = state.role !== "admin";
}

function syncFilterControls(state) {
  const { transactions, filters } = state;

  refs.categoryFilter.innerHTML = [
    `<option value="all">All categories</option>`,
    ...getCategoryOptions(transactions).map(
      (category) => `<option value="${category}">${category}</option>`
    ),
  ].join("");

  refs.monthFilter.innerHTML = [
    `<option value="all">All months</option>`,
    ...getMonthOptions(transactions).map(
      (month) => `<option value="${month.value}">${month.label}</option>`
    ),
  ].join("");

  refs.searchInput.value = filters.search;
  refs.typeFilter.value = filters.type;
  refs.categoryFilter.value = filters.category;
  refs.monthFilter.value = filters.month;
  refs.sortFilter.value = filters.sort;
}

function renderOverview(state) {
  const summary = calculateSummary(state.transactions, OPENING_BALANCE);
  const trend = getTrendData(state.transactions, OPENING_BALANCE);
  const breakdown = getSpendingBreakdown(state.transactions);
  const latestMonth = trend.at(-1);
  const previousMonth = trend.at(-2);
  const balanceDelta = latestMonth && previousMonth ? latestMonth.balance - previousMonth.balance : 0;

  refs.overviewSection.innerHTML = `
    <section class="section-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Overview</p>
          <h2>Financial summary at a glance</h2>
        </div>
        <span class="subtle-chip">Opening balance ${formatCurrency(OPENING_BALANCE)}</span>
      </div>

      <div class="summary-grid">
        <article class="summary-card summary-balance">
          <p>Total balance</p>
          <strong>${formatCurrency(summary.balance)}</strong>
          <span>${latestMonth ? `${formatSignedCurrency(balanceDelta)} vs last month` : "Running balance snapshot"}</span>
        </article>
        <article class="summary-card">
          <p>Total income</p>
          <strong>${formatCurrency(summary.income)}</strong>
          <span>${state.transactions.filter((item) => item.type === "income").length} income entries</span>
        </article>
        <article class="summary-card">
          <p>Total expenses</p>
          <strong>${formatCurrency(summary.expenses)}</strong>
          <span>${state.transactions.filter((item) => item.type === "expense").length} expense entries</span>
        </article>
        <article class="summary-card">
          <p>Savings rate</p>
          <strong>${Math.round(summary.savingsRate)}%</strong>
          <span>${latestMonth ? `${latestMonth.label} net ${formatCurrency(latestMonth.income - latestMonth.expenses)}` : "Income vs spend ratio"}</span>
        </article>
      </div>

      <div class="charts-grid">
        <article class="chart-card">
          ${renderTrendChart(trend)}
        </article>
        <article class="chart-card">
          ${renderBreakdownChart(breakdown)}
        </article>
      </div>
    </section>
  `;
}

function renderInsights(state) {
  const insights = getInsights(state.transactions, OPENING_BALANCE);

  refs.insightsSection.innerHTML = `
    <section class="section-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Insights</p>
          <h2>Small observations pulled from the data</h2>
        </div>
        <span class="subtle-chip">${state.transactions.length} transactions loaded</span>
      </div>
      <div class="insights-grid">
        ${insights
          .map(
            (insight) => `
              <article class="insight-card">
                <p class="insight-label">${insight.label}</p>
                <h3>${insight.headline}</h3>
                <p>${insight.detail}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTransactions(state) {
  const filteredTransactions = getVisibleTransactions(state.transactions, state.filters);

  if (!state.transactions.length) {
    refs.transactionsSummary.innerHTML = `
      <span>0 transactions loaded</span>
      <span>${state.role === "admin" ? "Add a new entry or restore the sample dataset." : "Switch to Admin to repopulate the dashboard."}</span>
    `;

    refs.transactionsTableMount.innerHTML = `
      <div class="empty-state">
        <h3>The dataset is currently empty</h3>
        <p>The dashboard gracefully handles a blank state, including charts and insights. You can repopulate it any time.</p>
        ${
          state.role === "admin"
            ? `
              <div class="button-row">
                <button class="primary-button" type="button" data-open-editor>Add transaction</button>
              </div>
            `
            : `<span class="read-only-label">Viewer mode is read only</span>`
        }
      </div>
    `;
    return;
  }

  refs.transactionsSummary.innerHTML = `
    <span>${filteredTransactions.length} of ${state.transactions.length} transactions</span>
    <span>Latest activity ${formatDate(getLatestTransactionDate(state.transactions))}</span>
  `;

  if (!filteredTransactions.length) {
    refs.transactionsTableMount.innerHTML = `
      <div class="empty-state">
        <h3>No transactions match the current filters</h3>
        <p>Try resetting the filters, switching months, or restoring the sample dataset.</p>
        <button class="primary-button" type="button" data-reset-filters>Clear filters</button>
      </div>
    `;
    return;
  }

  refs.transactionsTableMount.innerHTML = `
    <div class="table-shell">
      <table class="transactions-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Date</th>
            <th>Category</th>
            <th>Type</th>
            <th>Amount</th>
            <th>${state.role === "admin" ? "Actions" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTransactions
            .map(
              (transaction) => `
                <tr>
                  <td>
                    <div class="transaction-title">${escapeHtml(transaction.title)}</div>
                    <div class="transaction-note">${escapeHtml(transaction.note || "No note added")}</div>
                  </td>
                  <td>${formatDate(transaction.date)}</td>
                  <td><span class="category-pill">${escapeHtml(transaction.category)}</span></td>
                  <td><span class="type-pill type-${transaction.type}">${transaction.type}</span></td>
                  <td class="amount-cell ${transaction.type === "income" ? "amount-positive" : "amount-negative"}">
                    ${transaction.type === "income"
                      ? formatSignedCurrency(transaction.amount)
                      : formatSignedCurrency(-transaction.amount)}
                  </td>
                  <td>
                    ${
                      state.role === "admin"
                        ? `<button class="ghost-button inline-button" type="button" data-edit-transaction="${transaction.id}">Edit</button>`
                        : `<span class="read-only-label">Read only</span>`
                    }
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderModal(state) {
  if (!state.editor.isOpen) {
    refs.modalMount.innerHTML = "";
    return;
  }

  const transaction =
    state.editor.mode === "edit"
      ? state.transactions.find((item) => item.id === state.editor.transactionId)
      : null;

  const defaultDate = getLatestTransactionDate(state.transactions);
  const formValues = transaction ?? {
    id: "",
    date: defaultDate,
    title: "",
    amount: "",
    category: CATEGORY_OPTIONS[0],
    type: "expense",
    note: "",
  };

  refs.modalMount.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Transaction editor">
      <div class="modal-header">
        <div>
          <p class="eyebrow">${state.editor.mode === "edit" ? "Edit transaction" : "New transaction"}</p>
          <h3>${state.editor.mode === "edit" ? escapeHtml(formValues.title) : "Add a transaction entry"}</h3>
        </div>
        <button class="ghost-button inline-button" data-close-editor type="button">Close</button>
      </div>
      <form id="transactionForm" class="modal-form">
        <input type="hidden" name="id" value="${formValues.id}" />
        <label class="form-field">
          <span>Title</span>
          <input name="title" value="${escapeHtml(formValues.title)}" required />
        </label>
        <div class="modal-two-up">
          <label class="form-field">
            <span>Date</span>
            <input name="date" type="date" value="${formValues.date}" required />
          </label>
          <label class="form-field">
            <span>Amount</span>
            <input name="amount" type="number" min="1" step="1" value="${formValues.amount}" required />
          </label>
        </div>
        <div class="modal-two-up">
          <label class="form-field">
            <span>Category</span>
            <select name="category" required>
              ${getCategoryOptions(state.transactions)
                .map(
                  (category) => `
                    <option value="${category}" ${category === formValues.category ? "selected" : ""}>${category}</option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label class="form-field">
            <span>Type</span>
            <select name="type" required>
              <option value="income" ${formValues.type === "income" ? "selected" : ""}>Income</option>
              <option value="expense" ${formValues.type === "expense" ? "selected" : ""}>Expense</option>
            </select>
          </label>
        </div>
        <label class="form-field">
          <span>Note</span>
          <textarea name="note" rows="3" placeholder="Optional context">${escapeHtml(formValues.note)}</textarea>
        </label>
        <div class="modal-actions">
          ${
            state.editor.mode === "edit"
              ? `<button class="ghost-button" type="button" data-delete-transaction="${formValues.id}">Delete</button>`
              : `<span class="helper-text">Changes save locally in the browser.</span>`
          }
          <div class="button-row">
            <button class="ghost-button" data-close-editor type="button">Cancel</button>
            <button class="primary-button" type="submit">Save transaction</button>
          </div>
        </div>
      </form>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
