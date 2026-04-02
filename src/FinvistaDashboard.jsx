import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  formatMonthLabel,
  formatSignedCurrency,
  getCategoryOptions,
  getInsights,
  getLatestTransactionDate,
  getMonthKey,
  getMonthOptions,
  getSpendingBreakdown,
  getTrendData,
  getVisibleTransactions,
  toCsv,
} from "./utils.js";
import { BreakdownChart, TrendChart } from "./components/DashboardCharts.jsx";
import AppIcon from "./components/AppIcon.jsx";
import TransactionModal from "./components/TransactionModal.jsx";

const defaultFilters = {
  search: "",
  type: "all",
  category: "all",
  month: "all",
  sort: "date-desc",
  page: 1,
};

const closedEditor = {
  isOpen: false,
  mode: "create",
  transactionId: null,
};

const PAGE_SIZE = 6;
const DASHBOARD_DATA_VERSION = "2026-04-02";

const mainNavigationItems = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "transactions", label: "Transactions", icon: "transactions" },
  { key: "insights", label: "Insights", icon: "insight" },
  { key: "budgets", label: "Budgets", icon: "budgets" },
  { key: "goals", label: "Goals", icon: "goals" },
  { key: "reports", label: "Reports", icon: "reports" },
];

const toolNavigationItems = [
  { key: "export", label: "Export Data", icon: "download", action: "exportJson" },
  { key: "import", label: "Import Data", icon: "import", action: "importJson" },
];

function getPageCopy(activePage, currentMonth) {
  const activeMonthLabel = currentMonth?.label ?? "the latest month";

  const copy = {
    dashboard: {
      title: "Welcome back!",
      description: `Here's your financial overview for ${activeMonthLabel}.`,
    },
    transactions: {
      title: "Transactions",
      description: "Review, filter, and manage every income and expense entry in one place.",
    },
    insights: {
      title: "Insights",
      description: `Understand what changed in ${activeMonthLabel} and where your money is moving.`,
    },
    budgets: {
      title: "Budgets",
      description: "Track category budgets and keep monthly spending aligned with your plan.",
    },
    goals: {
      title: "Goals",
      description: "Measure savings momentum and compare income against expenses month by month.",
    },
    reports: {
      title: "Reports",
      description: "Review recent activity and export clean summaries for your records.",
    },
    settings: {
      title: "Settings",
      description: "Manage access, theme preferences, and your workspace data actions.",
    },
  };

  return copy[activePage] ?? copy.dashboard;
}

const categoryMeta = {
  Housing: { icon: "home", tone: "violet" },
  Food: { icon: "food", tone: "pink" },
  Transport: { icon: "transport", tone: "blue" },
  Shopping: { icon: "shopping", tone: "orange" },
  Bills: { icon: "bills", tone: "indigo" },
  Entertainment: { icon: "entertainment", tone: "magenta" },
  Salary: { icon: "income", tone: "green" },
  Freelance: { icon: "briefcase", tone: "teal" },
  Others: { icon: "spark", tone: "slate" },
};

const defaultBudgetTargets = {
  Housing: 24000,
  Food: 8000,
  Transport: 4500,
  Shopping: 7000,
  Bills: 5000,
  Entertainment: 5000,
  Others: 3000,
};

const defaultGoalPlans = [
  {
    id: "goal-emergency-fund",
    title: "Emergency Fund",
    target: 300000,
    type: "balance",
  },
  {
    id: "goal-april-savings",
    title: "April Savings Goal",
    target: 60000,
    type: "monthly-savings",
  },
];

const goalTrackingOptions = [
  { value: "balance", label: "Total Balance" },
  { value: "monthly-savings", label: "Monthly Savings" },
];

function sortTransactionsByDate(transactions) {
  return [...transactions].sort((left, right) => {
    if (left.date === right.date) {
      return left.id.localeCompare(right.id);
    }

    return right.date.localeCompare(left.date);
  });
}

function hasCurrentYearTransactions(transactions) {
  return (
    Array.isArray(transactions) &&
    transactions.every(
      (transaction) => typeof transaction?.date === "string" && transaction.date.startsWith("2026-")
    )
  );
}

function readPersistedDashboardState() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    if (!parsed || parsed.dataVersion !== DASHBOARD_DATA_VERSION) {
      return {};
    }

    if (parsed.transactions?.length && !hasCurrentYearTransactions(parsed.transactions)) {
      return {};
    }

    return parsed;
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

function getInitialThemeMode() {
  const persisted = readPersistedDashboardState();
  return persisted.themeMode === "night" ? "night" : "dawn";
}

function buildGoalId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `goal-${crypto.randomUUID()}`;
  }

  return `goal-${Date.now()}`;
}

function buildTransactionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `tx-${crypto.randomUUID()}`;
  }

  return `tx-${Date.now()}`;
}

function getComparison(currentValue, previousValue) {
  if (!Number.isFinite(previousValue) || previousValue === 0) {
    return { text: "0.0%", direction: "flat" };
  }

  const delta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;

  if (Math.abs(delta) < 0.05) {
    return { text: "0.0%", direction: "flat" };
  }

  return {
    text: `${delta > 0 ? "+" : "-"}${Math.abs(delta).toFixed(1)}%`,
    direction: delta > 0 ? "up" : "down",
  };
}

function getMonthSavingsRate(month) {
  if (!month || month.income <= 0) {
    return 0;
  }

  return ((month.income - month.expenses) / month.income) * 100;
}

function getRangeSubtext(monthKey) {
  if (!monthKey) {
    return "No active month selected";
  }

  const baseDate = new Date(`${monthKey}-01T12:00:00`);
  const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();

  return `01 - ${String(lastDay).padStart(2, "0")} ${baseDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })}`;
}

function buildMetricCards(summary, currentMonth, previousMonth) {
  const savingsRate = getMonthSavingsRate(currentMonth);
  const previousSavingsRate = getMonthSavingsRate(previousMonth);
  const comparisonLabel = previousMonth ? `vs ${previousMonth.label.split(" ")[0]}` : "vs previous";

  return [
    {
      key: "balance",
      label: "Total Balance",
      value: formatCurrency(summary.balance),
      icon: "balance",
      tone: "violet",
      comparison: getComparison(summary.balance, previousMonth ? previousMonth.balance : OPENING_BALANCE),
      comparisonLabel,
    },
    {
      key: "income",
      label: "Total Income",
      value: formatCurrency(currentMonth?.income ?? summary.income),
      icon: "briefcase",
      tone: "green",
      comparison: getComparison(
        currentMonth?.income ?? summary.income,
        previousMonth?.income ?? currentMonth?.income ?? summary.income
      ),
      comparisonLabel,
    },
    {
      key: "expenses",
      label: "Total Expenses",
      value: formatCurrency(currentMonth?.expenses ?? summary.expenses),
      icon: "expense",
      tone: "red",
      comparison: getComparison(
        currentMonth?.expenses ?? summary.expenses,
        previousMonth?.expenses ?? currentMonth?.expenses ?? summary.expenses
      ),
      comparisonLabel,
    },
    {
      key: "savings",
      label: "Savings Rate",
      value: `${savingsRate.toFixed(1)}%`,
      icon: "savings",
      tone: "purple",
      comparison: getComparison(savingsRate, previousSavingsRate || savingsRate),
      comparisonLabel,
    },
  ];
}

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("ellipsis-start");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis-end");
  }

  items.push(totalPages);

  return items;
}

function getCategoryMeta(category) {
  return categoryMeta[category] ?? { icon: "spark", tone: "slate" };
}

function buildBudgetItems(breakdown, budgetTargets) {
  const spendMap = new Map(breakdown.map((item) => [item.category, item]));
  const categories = [...new Set([...Object.keys(budgetTargets), ...breakdown.map((item) => item.category)])];

  return categories
    .map((category) => {
      const spend = spendMap.get(category);
      const amount = spend?.amount ?? 0;
      const target = budgetTargets[category] ?? Math.max(1, Math.ceil(Math.max(amount, 1) * 1.25));
      const progress = Math.min(100, Math.round((amount / target) * 100));

      return {
        category,
        amount,
        percent: spend?.percent ?? 0,
        target,
        progress,
        meta: getCategoryMeta(category),
      };
    })
    .sort((left, right) => {
      if (right.amount !== left.amount) {
        return right.amount - left.amount;
      }

      return right.target - left.target;
    })
    .slice(0, 6);
}

function getInitialBudgetTargets() {
  const persisted = readPersistedDashboardState();
  const rawTargets = persisted.budgetTargets;

  if (!rawTargets || typeof rawTargets !== "object") {
    return { ...defaultBudgetTargets };
  }

  const nextTargets = Object.fromEntries(
    Object.entries(rawTargets)
      .map(([category, target]) => [String(category).trim(), Number(target)])
      .filter(([category, target]) => category && Number.isFinite(target) && target > 0)
  );

  return Object.keys(nextTargets).length ? nextTargets : { ...defaultBudgetTargets };
}

function getInitialGoalPlans() {
  const persisted = readPersistedDashboardState();
  const hasPersistedGoals = Array.isArray(persisted.goalPlans);
  const sourcePlans = hasPersistedGoals ? persisted.goalPlans : defaultGoalPlans;

  const nextPlans = sourcePlans
    .map((plan) => ({
      id: String(plan.id || "").trim(),
      title: String(plan.title || "").trim(),
      target: Number(plan.target),
      type: plan.type === "monthly-savings" ? "monthly-savings" : "balance",
    }))
    .filter((plan) => plan.id && plan.title && Number.isFinite(plan.target) && plan.target > 0);

  return hasPersistedGoals ? nextPlans : nextPlans.length ? nextPlans : [...defaultGoalPlans];
}

function buildInsightCards({ topSpend, currentMonth, previousMonth, monthSavingsRate, insights }) {
  const previousLabel = previousMonth ? previousMonth.label.split(" ")[0] : "last month";
  const currentLabel = currentMonth ? currentMonth.label : "Latest month";
  const comparisonExpense = getComparison(currentMonth?.expenses ?? 0, previousMonth?.expenses ?? 0);

  return [
    {
      key: "highest-spend",
      icon: topSpend ? getCategoryMeta(topSpend.category).icon : "expense",
      tone: topSpend ? getCategoryMeta(topSpend.category).tone : "violet",
      title: "Highest Spending Category",
      headline: topSpend ? topSpend.category : "No expense data yet",
      badge: topSpend ? `${formatCurrency(topSpend.amount)} (${Math.round(topSpend.percent)}%)` : "Waiting on spend",
      detail: insights[0]?.detail ?? "Expense insights will appear here.",
    },
    {
      key: "monthly-comparison",
      icon: "analytics",
      tone: "blue",
      title: "Monthly Comparison",
      headline:
        currentMonth && previousMonth
          ? `Income held steady while expenses moved ${comparisonExpense.text}`
          : insights[1]?.headline ?? "Monthly comparison unavailable",
      badge: previousMonth ? `Compared to ${previousLabel}` : currentLabel,
      detail:
        insights[1]?.detail ??
        `Track the latest month against ${previousLabel} to see movement over time.`,
    },
    {
      key: "savings-insight",
      icon: "savings",
      tone: "purple",
      title: "Savings Insight",
      headline: monthSavingsRate >= 0 ? "Positive savings momentum" : "Spending is above income",
      badge: `${monthSavingsRate.toFixed(1)}% of income`,
      detail: insights[2]?.detail ?? "Savings insights will appear when monthly data exists.",
    },
  ];
}

function MetricCard({ item }) {
  const directionClass =
    item.comparison.direction === "flat"
      ? "metric-trend-flat"
      : item.comparison.direction === "up"
        ? "metric-trend-up"
        : "metric-trend-down";

  return (
    <article className={`metric-card metric-${item.tone}`}>
      <div className="metric-card-copy">
        <p>{item.label}</p>
        <strong>{item.value}</strong>
        <div className={`metric-card-trend ${directionClass}`}>
          <span>{item.comparison.text}</span>
          <small>{item.comparisonLabel}</small>
        </div>
      </div>
      <span className={`metric-card-icon tone-${item.tone}`}>
        <AppIcon name={item.icon} className="metric-icon" />
      </span>
    </article>
  );
}

export default function FinvistaDashboard() {
  const importInputRef = useRef(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(getInitialThemeMode);
  const [role, setRole] = useState(getInitialRole);
  const [transactions, setTransactions] = useState(getInitialTransactions);
  const [budgetTargets, setBudgetTargets] = useState(getInitialBudgetTargets);
  const [goalPlans, setGoalPlans] = useState(getInitialGoalPlans);
  const [filters, setFilters] = useState(defaultFilters);
  const [editor, setEditor] = useState(closedEditor);
  const [budgetDraft, setBudgetDraft] = useState({
    category: CATEGORY_OPTIONS[0] ?? "Housing",
    target: "",
  });
  const [goalDraft, setGoalDraft] = useState({
    title: "",
    target: "",
    type: "balance",
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          dataVersion: DASHBOARD_DATA_VERSION,
          themeMode,
          role,
          transactions,
          budgetTargets,
          goalPlans,
        })
      );
    } catch {
      return;
    }
  }, [budgetTargets, goalPlans, role, themeMode, transactions]);

  useLayoutEffect(() => {
    document.body.classList.remove("finvista-theme-dawn", "finvista-theme-night");
    document.body.classList.add(`finvista-theme-${themeMode}`);

    return () => {
      document.body.classList.remove("finvista-theme-dawn", "finvista-theme-night");
    };
  }, [themeMode]);

  useEffect(() => {
    document.body.classList.toggle("finvista-menu-open", isSidebarOpen);

    return () => {
      document.body.classList.remove("finvista-menu-open");
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 1080) {
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const summary = calculateSummary(transactions, OPENING_BALANCE);
  const trendData = getTrendData(transactions, OPENING_BALANCE);
  const visibleTransactions = getVisibleTransactions(transactions, filters);
  const totalPages = Math.max(1, Math.ceil(visibleTransactions.length / PAGE_SIZE));
  const currentPage = Math.min(
    Math.max(1, Number.parseInt(String(filters.page ?? 1), 10) || 1),
    totalPages
  );
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedTransactions = visibleTransactions.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const pageItems = buildPageItems(currentPage, totalPages);
  const categoryOptions = getCategoryOptions(transactions);
  const monthOptions = getMonthOptions(transactions);
  const latestMonth = trendData[trendData.length - 1];
  const latestMonthKey = latestMonth?.monthKey ?? monthOptions[0]?.value ?? null;
  const activeMonthKey = filters.month !== "all" ? filters.month : latestMonthKey;
  const activeMonthIndex = trendData.findIndex((item) => item.monthKey === activeMonthKey);
  const currentMonth = activeMonthIndex >= 0 ? trendData[activeMonthIndex] : latestMonth;
  const previousMonth =
    activeMonthIndex > 0 ? trendData[activeMonthIndex - 1] : trendData[trendData.length - 2];
  const activeMonthTransactions = activeMonthKey
    ? transactions.filter((transaction) => getMonthKey(transaction.date) === activeMonthKey)
    : transactions;
  const breakdown = getSpendingBreakdown(activeMonthTransactions);
  const insights = getInsights(transactions, OPENING_BALANCE);
  const budgetItems = buildBudgetItems(breakdown, budgetTargets);
  const topSpend = breakdown[0];
  const monthSavingsRate = getMonthSavingsRate(currentMonth);
  const metricCards = buildMetricCards(summary, currentMonth, previousMonth);
  const insightCards = buildInsightCards({
    topSpend,
    currentMonth,
    previousMonth,
    monthSavingsRate,
    insights,
  });
  const comparisonBars = [previousMonth, currentMonth].filter(Boolean);
  const comparisonMax = Math.max(
    1,
    ...comparisonBars.flatMap((item) => [item?.income ?? 0, item?.expenses ?? 0])
  );
  const recentActivity = transactions.slice(0, 3);
  const expenseBudgetCategories = transactions
    .filter((transaction) => transaction.type === "expense")
    .map((transaction) => transaction.category);
  const budgetCategoryOptions = [
    ...new Set([
      ...CATEGORY_OPTIONS.filter((category) => !["Salary", "Freelance"].includes(category)),
      ...expenseBudgetCategories,
      ...Object.keys(budgetTargets),
    ]),
  ].sort();
  const editingTransaction =
    editor.mode === "edit"
      ? transactions.find((transaction) => transaction.id === editor.transactionId) ?? null
      : null;
  const isAdmin = role === "admin";
  const hasActiveFilters =
    filters.search ||
    filters.type !== "all" ||
    filters.category !== "all" ||
    filters.month !== "all" ||
    filters.sort !== "date-desc";
  const showingFrom = paginatedTransactions.length ? pageStartIndex + 1 : 0;
  const showingTo = paginatedTransactions.length ? pageStartIndex + paginatedTransactions.length : 0;

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
      page: key === "page" ? value : 1,
    }));
  }

  function handleResetFilters() {
    setFilters(defaultFilters);
  }

  function handlePageChange(page) {
    handleFilterChange("page", Math.min(Math.max(page, 1), totalPages));
  }

  function handleNavigate(nextPage) {
    setActiveNav(nextPage);
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleToolAction(item) {
    setIsSidebarOpen(false);

    if (item.action === "exportJson") {
      handleExportJson();
      return;
    }

    if (item.action === "importJson") {
      importInputRef.current?.click();
    }
  }

  function handleOpenEditor(mode, transactionId = null) {
    if (!isAdmin) {
      return;
    }

    setEditor({ isOpen: true, mode, transactionId });
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

  function handleQuickDeleteTransaction(transactionId) {
    if (!isAdmin || !window.confirm("Remove this transaction?")) {
      return;
    }

    handleDeleteTransaction(transactionId);
  }

  function handleRestoreSampleData() {
    if (!isAdmin) {
      return;
    }

    setTransactions(sortTransactionsByDate(seedTransactions));
    setBudgetTargets({ ...defaultBudgetTargets });
    setGoalPlans([...defaultGoalPlans]);
    setBudgetDraft({
      category: CATEGORY_OPTIONS[0] ?? "Housing",
      target: "",
    });
    setGoalDraft({
      title: "",
      target: "",
      type: "balance",
    });
    setFilters(defaultFilters);
    setEditor(closedEditor);
  }

  function handleAddBudget(event) {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    const nextTarget = Number(budgetDraft.target);

    if (!budgetDraft.category || !Number.isFinite(nextTarget) || nextTarget <= 0) {
      window.alert("Enter a valid budget category and amount.");
      return;
    }

    setBudgetTargets((current) => ({
      ...current,
      [budgetDraft.category]: Math.round(nextTarget),
    }));
    setBudgetDraft((current) => ({
      ...current,
      target: "",
    }));
  }

  function handleAddGoal(event) {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    const nextTarget = Number(goalDraft.target);

    if (!goalDraft.title.trim() || !Number.isFinite(nextTarget) || nextTarget <= 0) {
      window.alert("Enter a valid goal title and target amount.");
      return;
    }

    setGoalPlans((current) => [
      {
        id: buildGoalId(),
        title: goalDraft.title.trim(),
        target: Math.round(nextTarget),
        type: goalDraft.type,
      },
      ...current,
    ]);
    setGoalDraft({
      title: "",
      target: "",
      type: goalDraft.type,
    });
  }

  function handleDeleteGoal(goalId) {
    if (!isAdmin) {
      return;
    }

    setGoalPlans((current) => current.filter((goal) => goal.id !== goalId));
  }

  function handleExportJson() {
    if (!isAdmin) {
      return;
    }

    downloadFile("finvista-transactions.json", JSON.stringify(transactions, null, 2), "application/json");
  }

  function handleExportCsv() {
    if (!isAdmin) {
      return;
    }

    downloadFile("finvista-report.csv", toCsv(transactions), "text/csv;charset=utf-8");
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !isAdmin) {
      return;
    }

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const importedTransactions = Array.isArray(parsed) ? parsed : parsed.transactions;

      if (!Array.isArray(importedTransactions)) {
        throw new Error("Invalid import payload");
      }

      const normalizedTransactions = importedTransactions.map((item, index) => ({
        id: item.id || `tx-import-${index}-${Date.now()}`,
        date: String(item.date || "").slice(0, 10),
        title: String(item.title || "").trim(),
        amount: Number(item.amount),
        category: String(item.category || "").trim(),
        type: item.type === "income" ? "income" : "expense",
        note: String(item.note || "").trim(),
      }));

      const invalidTransaction = normalizedTransactions.find(
        (item) => !item.date || !item.title || !item.category || !Number.isFinite(item.amount) || item.amount <= 0
      );

      if (invalidTransaction) {
        throw new Error("Imported file has missing transaction fields");
      }

      setTransactions(sortTransactionsByDate(normalizedTransactions));
      setFilters(defaultFilters);
      setEditor(closedEditor);
      setActiveNav("transactions");
      setIsSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.alert("Import failed. Use a JSON file with a transaction array.");
    }
  }

  const activePageCopy = getPageCopy(activeNav, currentMonth);
  const monthIncome = currentMonth?.income ?? 0;
  const monthExpenses = currentMonth?.expenses ?? 0;
  const savedThisMonth = Math.max(0, monthIncome - monthExpenses);
  const savingsGoalTarget =
    monthIncome > 0
      ? Math.max(1, Math.round(monthIncome * 0.3))
      : Math.max(1, Math.round(Math.max(summary.balance, 1) * 0.12));
  const savingsGoalProgress = Math.min(100, Math.round((savedThisMonth / savingsGoalTarget) * 100));
  const budgetCapacity = budgetItems.reduce((sum, item) => sum + item.target, 0);
  const budgetUsed = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const budgetUsageProgress = budgetCapacity ? Math.min(100, Math.round((budgetUsed / budgetCapacity) * 100)) : 0;
  const budgetRemaining = Math.max(0, budgetCapacity - budgetUsed);
  const overBudgetCount = budgetItems.filter((item) => item.amount > item.target).length;
  const budgetSummaryLabel = activeMonthKey ? formatMonthLabel(activeMonthKey) : "This Month";
  const goalPlanItems = goalPlans.map((goal) => {
    const currentValue = goal.type === "monthly-savings" ? savedThisMonth : Math.max(summary.balance, 0);
    const progress = Math.min(100, Math.round((currentValue / goal.target) * 100));

    return {
      ...goal,
      currentValue,
      progress,
      remaining: Math.max(0, goal.target - currentValue),
      label:
        goal.type === "monthly-savings"
          ? `${currentMonth?.label ?? "Active month"} savings`
          : "Tracked against total balance",
      tone: goal.type === "monthly-savings" ? "green" : "violet",
    };
  });
  const reportHighlights = [
    {
      label: "Tracked Transactions",
      value: `${visibleTransactions.length}`,
      detail: `${transactions.length} total entries in your workspace`,
    },
    {
      label: "Income This Month",
      value: formatCurrency(monthIncome),
      detail: currentMonth ? `Recorded in ${currentMonth.label}` : "Waiting on monthly data",
    },
    {
      label: "Expenses This Month",
      value: formatCurrency(monthExpenses),
      detail: breakdown.length ? `${breakdown.length} active spend categories` : "No expense categories yet",
    },
  ];
  const goalHighlights = [
    {
      label: "Savings Goal",
      value: formatCurrency(savingsGoalTarget),
      detail: `Target for ${currentMonth?.label ?? "the active month"}`,
      progress: savingsGoalProgress,
      tone: "violet",
    },
    {
      label: "Saved So Far",
      value: formatCurrency(savedThisMonth),
      detail:
        savingsGoalProgress >= 100
          ? "Goal reached for the current month"
          : `${Math.max(0, 100 - savingsGoalProgress)}% left to hit the target`,
      progress: savingsGoalProgress,
      tone: "green",
    },
    {
      label: "Budget Used",
      value: budgetCapacity ? `${budgetUsageProgress}%` : "0%",
      detail:
        budgetCapacity
          ? `${formatCurrency(budgetUsed)} of ${formatCurrency(budgetCapacity)} allocated`
          : "Budget targets appear when spending categories exist",
      progress: budgetUsageProgress,
      tone: budgetUsageProgress > 85 ? "red" : "blue",
    },
  ];

  function renderRoleSelector(className = "top-select top-select-role") {
    return (
      <label className={className}>
        <span>Role: {role === "admin" ? "Admin" : "Viewer"}</span>
        <select value={role} onChange={(event) => handleRoleChange(event.target.value)} aria-label="Select role">
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <AppIcon name="chevron" className="mini-icon" />
      </label>
    );
  }

  function renderThemeToggle(extraClass = "sidebar-theme-toggle") {
    return (
      <div className={`theme-toggle ${extraClass}`}>
        <button
          className={`theme-option ${themeMode === "dawn" ? "theme-option-active" : ""}`}
          onClick={() => setThemeMode("dawn")}
          type="button"
          aria-label="Switch accent theme"
        >
          <AppIcon name="sun" className="mini-icon" />
        </button>
        <button
          className={`theme-option ${themeMode === "night" ? "theme-option-active" : ""}`}
          onClick={() => setThemeMode("night")}
          type="button"
          aria-label="Switch dark theme"
        >
          <AppIcon name="moon" className="mini-icon" />
        </button>
      </div>
    );
  }

  function renderChartGrid() {
    return (
      <div className="chart-grid">
        <section className="dashboard-card chart-card">
          <TrendChart
            data={trendData}
            rangeLabel={trendData.length ? `Last ${trendData.length} Months` : "No data"}
            delta={currentMonth && previousMonth ? currentMonth.balance - previousMonth.balance : summary.balance}
            theme={themeMode}
          />
        </section>

        <section className="dashboard-card chart-card">
          <BreakdownChart
            breakdown={breakdown}
            rangeLabel={activeMonthKey ? formatMonthLabel(activeMonthKey) : "This Month"}
            theme={themeMode}
          />
        </section>
      </div>
    );
  }

  function renderMonthCard() {
    return (
      <section className="dashboard-card month-card">
        <label className="top-select month-range-select">
          <span>{activeMonthKey ? formatMonthLabel(activeMonthKey) : "This Month"}</span>
          <select
            value={filters.month}
            onChange={(event) => handleFilterChange("month", event.target.value)}
            aria-label="Select month"
          >
            <option value="all">This Month</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <AppIcon name="chevron" className="mini-icon" />
        </label>
        <p>{getRangeSubtext(activeMonthKey)}</p>
      </section>
    );
  }

  function renderQuickActionsCard() {
    return (
      <section className="dashboard-card quick-actions-card">
        <div className="section-title">
          <span className="section-icon">
            <AppIcon name="spark" className="mini-icon" />
          </span>
          <h3>Quick Actions</h3>
        </div>

        <div className="quick-actions-list">
          <button
            className="quick-action quick-action-primary"
            onClick={() => handleOpenEditor("create")}
            type="button"
            disabled={!isAdmin}
          >
            <AppIcon name="plus" className="mini-icon" />
            <span>Add Transaction</span>
          </button>
          <button
            className="quick-action quick-action-secondary"
            onClick={() => handleNavigate("transactions")}
            type="button"
          >
            <AppIcon name="swap" className="mini-icon" />
            <span>Open Transactions</span>
          </button>
          <button
            className="quick-action quick-action-success"
            onClick={handleExportCsv}
            type="button"
            disabled={!isAdmin}
          >
            <AppIcon name="download" className="mini-icon" />
            <span>Export Report</span>
          </button>
        </div>
      </section>
    );
  }

  function renderBudgetSummaryCard() {
    return (
      <section className="dashboard-card budget-summary-card">
        <div className="budget-summary-head">
          <div>
            <div className="section-title">
              <span className="section-icon">
                <AppIcon name="analytics" className="mini-icon" />
              </span>
              <h3>Budget Pulse</h3>
            </div>
            <p className="budget-summary-range">{getRangeSubtext(activeMonthKey)}</p>
          </div>

          <label className="top-select compact-select budget-summary-select">
            <span>{budgetSummaryLabel}</span>
            <select value={filters.month} onChange={(event) => handleFilterChange("month", event.target.value)}>
              <option value="all">Month</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <AppIcon name="chevron" className="mini-icon" />
          </label>
        </div>

        <div className="budget-summary-hero">
          <strong>{budgetCapacity ? `${budgetUsageProgress}% used` : "No budgets set"}</strong>
          <p>
            {budgetCapacity
              ? `${formatCurrency(budgetUsed)} spent out of ${formatCurrency(budgetCapacity)} planned for ${budgetSummaryLabel}.`
              : "Add a budget target to start tracking monthly category limits."}
          </p>
        </div>

        <div className="progress-track budget-summary-track">
          <span
            className="progress-value progress-value-violet"
            style={{ width: budgetCapacity ? `${Math.max(8, budgetUsageProgress)}%` : "0%" }}
          />
        </div>

        <div className="budget-summary-stats">
          <article className="budget-summary-stat">
            <span>Planned</span>
            <strong>{formatCurrency(budgetCapacity)}</strong>
          </article>
          <article className="budget-summary-stat">
            <span>Remaining</span>
            <strong>{formatCurrency(budgetRemaining)}</strong>
          </article>
          <article className="budget-summary-stat">
            <span>Attention</span>
            <strong>{overBudgetCount ? `${overBudgetCount} over` : `${budgetItems.length} tracked`}</strong>
          </article>
        </div>
      </section>
    );
  }

  function renderBudgetPlannerCard() {
    const isExistingBudget = Boolean(budgetTargets[budgetDraft.category]);

    return (
      <section className="dashboard-card planner-card budget-planner-card">
        <div className="section-header section-header-compact">
          <div className="section-title">
            <span className="section-icon">
              <AppIcon name="budgets" className="mini-icon" />
            </span>
            <h3>{isExistingBudget ? "Update Budget" : "Add Budget"}</h3>
          </div>

          <span className="planner-count">{Object.keys(budgetTargets).length} saved limits</span>
        </div>

        <p className="planner-copy">
          Set category caps once, then compare live spending against the limits for the selected month.
        </p>

        <form className="planner-grid budget-planner-grid" onSubmit={handleAddBudget}>
          <label className="planner-field">
            <span>Category</span>
            <select
              value={budgetDraft.category}
              onChange={(event) =>
                setBudgetDraft((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              disabled={!isAdmin}
            >
              {budgetCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="planner-field">
            <span>Monthly Limit</span>
            <input
              type="number"
              min="1"
              step="100"
              placeholder="Enter budget amount"
              value={budgetDraft.target}
              onChange={(event) =>
                setBudgetDraft((current) => ({
                  ...current,
                  target: event.target.value,
                }))
              }
              disabled={!isAdmin}
            />
          </label>

          <button className="primary-action planner-submit budget-planner-submit" type="submit" disabled={!isAdmin}>
            <AppIcon name="plus" className="mini-icon" />
            <span>{isExistingBudget ? "Save Budget" : "Add Budget"}</span>
          </button>
        </form>

        <div className="planner-pill-list">
          {Object.entries(budgetTargets).map(([category, target]) => (
            <div key={category} className="planner-pill">
              <strong>{category}</strong>
              <span>{formatCurrency(target)}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderBudgetSection() {
    return (
      <section className="dashboard-card budget-card budget-overview-card">
        <div className="section-header section-header-compact">
          <div className="section-title">
            <span className="section-icon">
              <AppIcon name="home" className="mini-icon" />
            </span>
            <h3>Budget Overview</h3>
          </div>

          <span className="budget-overview-badge">{budgetSummaryLabel}</span>
        </div>

        <div className="budget-list">
          {budgetItems.length ? (
            budgetItems.map((item) => (
              <article key={item.category} className="budget-row">
                <div className="budget-row-head">
                  <div className="budget-row-main">
                    <span className={`budget-icon budget-icon-${item.meta.tone}`}>
                      <AppIcon name={item.meta.icon} className="mini-icon" />
                    </span>
                    <strong>{item.category}</strong>
                  </div>
                  <span className="budget-row-amount">
                    {formatCurrency(item.amount)} / {formatCurrency(item.target)}
                  </span>
                  <span className="budget-percent">{item.progress}%</span>
                </div>
                <div className="budget-bar">
                  <span className={`budget-fill budget-fill-${item.meta.tone}`} style={{ width: `${item.progress}%` }} />
                </div>
              </article>
            ))
          ) : (
            <div className="empty-mini-state">Expense categories appear here once spending is recorded.</div>
          )}
        </div>
      </section>
    );
  }

  function renderGoalPlannerCard() {
    return (
      <section className="dashboard-card planner-card">
        <div className="section-title">
          <span className="section-icon">
            <AppIcon name="goals" className="mini-icon" />
          </span>
          <h3>Add Goal</h3>
        </div>

        <form className="planner-grid" onSubmit={handleAddGoal}>
          <label className="planner-field">
            <span>Goal Name</span>
            <input
              type="text"
              placeholder="Emergency fund, trip, savings..."
              value={goalDraft.title}
              onChange={(event) =>
                setGoalDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              disabled={!isAdmin}
            />
          </label>

          <label className="planner-field">
            <span>Target Amount</span>
            <input
              type="number"
              min="1"
              step="100"
              placeholder="Enter goal amount"
              value={goalDraft.target}
              onChange={(event) =>
                setGoalDraft((current) => ({
                  ...current,
                  target: event.target.value,
                }))
              }
              disabled={!isAdmin}
            />
          </label>

          <label className="planner-field">
            <span>Track Against</span>
            <select
              value={goalDraft.type}
              onChange={(event) =>
                setGoalDraft((current) => ({
                  ...current,
                  type: event.target.value,
                }))
              }
              disabled={!isAdmin}
            >
              {goalTrackingOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button className="primary-action planner-submit" type="submit" disabled={!isAdmin}>
            <AppIcon name="plus" className="mini-icon" />
            <span>Add Goal</span>
          </button>
        </form>

        <small className="settings-note">
          Balance goals follow total balance, and savings goals follow the current month's saved amount.
        </small>
      </section>
    );
  }

  function renderGoalPlansSection() {
    return (
      <section className="dashboard-card goal-plan-card">
        <div className="section-header section-header-compact">
          <div className="section-title">
            <span className="section-icon">
              <AppIcon name="goals" className="mini-icon" />
            </span>
            <h3>Active Goals</h3>
          </div>

          <span className="planner-count">{goalPlanItems.length} goals</span>
        </div>

        <div className="goal-plan-list">
          {goalPlanItems.length ? (
            goalPlanItems.map((goal) => (
              <article key={goal.id} className="goal-plan-item">
                <div className="goal-plan-head">
                  <div className="goal-plan-copy">
                    <strong>{goal.title}</strong>
                    <p>{goal.label}</p>
                  </div>

                  <button
                    className="icon-button icon-button-danger"
                    onClick={() => handleDeleteGoal(goal.id)}
                    type="button"
                    disabled={!isAdmin}
                    aria-label={`Remove ${goal.title}`}
                  >
                    <AppIcon name="trash" className="mini-icon" />
                  </button>
                </div>

                <div className="goal-plan-values">
                  <span>
                    {formatCurrency(goal.currentValue)} / {formatCurrency(goal.target)}
                  </span>
                  <span className="budget-percent">{goal.progress}%</span>
                </div>

                <div className="progress-track">
                  <span
                    className={`progress-value progress-value-${goal.tone}`}
                    style={{ width: `${Math.max(8, goal.progress)}%` }}
                  />
                </div>

                <small className="goal-plan-note">
                  {goal.progress >= 100
                    ? "Goal completed. Nice work."
                    : `${formatCurrency(goal.remaining)} left to reach this goal.`}
                </small>
              </article>
            ))
          ) : (
            <div className="empty-mini-state">Add a goal to start tracking your progress here.</div>
          )}
        </div>
      </section>
    );
  }

  function renderComparisonSection() {
    return (
      <section className="dashboard-card comparison-card">
        <div className="section-header section-header-compact">
          <div className="section-title">
            <span className="section-icon">
              <AppIcon name="analytics" className="mini-icon" />
            </span>
            <h3>Monthly Comparison</h3>
          </div>

          <label className="top-select compact-select">
            <span>Income vs Expenses</span>
            <select value="income-expense" disabled aria-label="Comparison mode">
              <option value="income-expense">Income vs Expenses</option>
            </select>
            <AppIcon name="chevron" className="mini-icon" />
          </label>
        </div>

        <div className="mini-bar-chart">
          {comparisonBars.map((item) => (
            <div key={item.monthKey} className="mini-bar-group">
              <div className="mini-bar-stack">
                <div className="mini-bar-column">
                  <span
                    className="mini-bar mini-bar-income"
                    style={{ height: `${Math.max(10, Math.round((item.income / comparisonMax) * 116))}px` }}
                  />
                </div>
                <div className="mini-bar-column">
                  <span
                    className="mini-bar mini-bar-expense"
                    style={{ height: `${Math.max(10, Math.round((item.expenses / comparisonMax) * 116))}px` }}
                  />
                </div>
              </div>
              <span>{item.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>

        <div className="mini-bar-legend">
          <span>
            <i className="legend-dot legend-dot-income" />
            Income
          </span>
          <span>
            <i className="legend-dot legend-dot-expense" />
            Expenses
          </span>
        </div>
      </section>
    );
  }

  function renderRecentActivitySection() {
    return (
      <section className="dashboard-card recent-activity-card">
        <div className="section-header section-header-compact">
          <div className="section-title">
            <span className="section-icon">
              <AppIcon name="activity" className="mini-icon" />
            </span>
            <h3>Recent Activity</h3>
          </div>

          <button className="text-button" onClick={() => handleNavigate("transactions")} type="button">
            View All
          </button>
        </div>

        <div className="activity-list">
          {recentActivity.map((transaction) => {
            const meta = getCategoryMeta(transaction.category);

            return (
              <article key={transaction.id} className="activity-item">
                <span className={`activity-icon activity-icon-${meta.tone}`}>
                  <AppIcon name={meta.icon} className="mini-icon" />
                </span>
                <div className="activity-copy">
                  <strong>{transaction.title}</strong>
                  <p>{formatDate(transaction.date)}</p>
                </div>
                <span
                  className={`activity-amount ${transaction.type === "income" ? "amount-positive" : "amount-negative"}`}
                >
                  {transaction.type === "income"
                    ? formatSignedCurrency(transaction.amount)
                    : formatSignedCurrency(-transaction.amount)}
                </span>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function renderTransactionsSection() {
    return (
      <section className="dashboard-card transactions-card">
        <div className="section-header">
          <div className="section-title">
            <span className="section-icon">
              <AppIcon name="spark" className="mini-icon" />
            </span>
            <h3>Transactions</h3>
          </div>

          <div className="toolbar-row">
            <label className="toolbar-input toolbar-search">
              <AppIcon name="search" className="mini-icon" />
              <input
                type="search"
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(event) => handleFilterChange("search", event.target.value)}
              />
            </label>

            <label className="toolbar-input toolbar-select">
              <select
                value={filters.category}
                onChange={(event) => handleFilterChange("category", event.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <AppIcon name="chevron" className="mini-icon" />
            </label>

            <label className="toolbar-input toolbar-select">
              <select
                value={filters.type}
                onChange={(event) => handleFilterChange("type", event.target.value)}
                aria-label="Filter by type"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
              <AppIcon name="chevron" className="mini-icon" />
            </label>

            <label className="toolbar-input toolbar-select toolbar-sort">
              <span>Sort:</span>
              <select
                value={filters.sort}
                onChange={(event) => handleFilterChange("sort", event.target.value)}
                aria-label="Sort transactions"
              >
                <option value="date-desc">Date</option>
                <option value="date-asc">Oldest</option>
                <option value="amount-desc">Highest</option>
                <option value="amount-asc">Lowest</option>
              </select>
              <AppIcon name="chevron" className="mini-icon" />
            </label>

          </div>
        </div>

        {!paginatedTransactions.length ? (
          <div className="empty-state empty-state-dark">
            <h3>No transactions match the current filters</h3>
            <p>Try resetting filters, changing the month, or restoring the demo dataset.</p>
            <div className="empty-actions">
              <button className="secondary-action" onClick={handleResetFilters} type="button">
                Clear Filters
              </button>
              <button className="primary-action" onClick={handleRestoreSampleData} type="button" disabled={!isAdmin}>
                Restore Demo
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="table-shell">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((transaction) => {
                    const meta = getCategoryMeta(transaction.category);

                    return (
                      <tr key={transaction.id}>
                        <td className="table-date">{formatDate(transaction.date)}</td>
                        <td>
                          <div className="transaction-title">{transaction.title}</div>
                          <div className="transaction-note">{transaction.note || "No note added"}</div>
                        </td>
                        <td>
                          <span className={`category-pill category-pill-${meta.tone}`}>
                            <AppIcon name={meta.icon} className="mini-icon" />
                            <span>{transaction.category}</span>
                          </span>
                        </td>
                        <td>
                          <span
                            className={`type-pill ${
                              transaction.type === "income" ? "type-pill-income" : "type-pill-expense"
                            }`}
                          >
                            {transaction.type === "income" ? "Income" : "Expense"}
                          </span>
                        </td>
                        <td
                          className={`table-amount ${
                            transaction.type === "income" ? "amount-positive" : "amount-negative"
                          }`}
                        >
                          {transaction.type === "income"
                            ? formatSignedCurrency(transaction.amount)
                            : formatSignedCurrency(-transaction.amount)}
                        </td>
                        <td>
                          <div className="table-actions">
                            <button
                              className="icon-button"
                              onClick={() => handleOpenEditor("edit", transaction.id)}
                              type="button"
                              disabled={!isAdmin}
                              aria-label={`Edit ${transaction.title}`}
                            >
                              <AppIcon name="edit" className="mini-icon" />
                            </button>
                            <button
                              className="icon-button icon-button-danger"
                              onClick={() => handleQuickDeleteTransaction(transaction.id)}
                              type="button"
                              disabled={!isAdmin}
                              aria-label={`Remove ${transaction.title}`}
                            >
                              <AppIcon name="trash" className="mini-icon" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                Showing {showingFrom}-{showingTo} of {visibleTransactions.length} transactions
              </span>

              <div className="footer-actions">
                {hasActiveFilters ? (
                  <button className="text-button" onClick={handleResetFilters} type="button">
                    Clear Filters
                  </button>
                ) : (
                  <button className="text-button" onClick={handleRestoreSampleData} type="button" disabled={!isAdmin}>
                    Restore Demo
                  </button>
                )}

                <div className="pagination">
                  <button
                    className="pager-button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    type="button"
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <AppIcon name="chevron" className="mini-icon pager-left" />
                  </button>

                  {pageItems.map((item) =>
                    typeof item === "number" ? (
                      <button
                        key={item}
                        className={`pager-button ${currentPage === item ? "pager-button-active" : ""}`}
                        onClick={() => handlePageChange(item)}
                        type="button"
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={item} className="pager-ellipsis">
                        ...
                      </span>
                    )
                  )}

                  <button
                    className="pager-button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    type="button"
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <AppIcon name="chevron" className="mini-icon pager-right" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    );
  }

  function renderInsightsSection() {
    return (
      <section className="dashboard-card insights-band">
        <div className="section-header section-header-compact">
          <div className="section-title">
            <span className="section-icon">
              <AppIcon name="insight" className="mini-icon" />
            </span>
            <h3>Insights</h3>
          </div>

          <label className="top-select top-select-month">
            <span>{activeMonthKey ? formatMonthLabel(activeMonthKey) : "This Month"}</span>
            <select
              value={filters.month}
              onChange={(event) => handleFilterChange("month", event.target.value)}
              aria-label="Select month range"
            >
              <option value="all">This Month</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <AppIcon name="chevron" className="mini-icon" />
          </label>
        </div>

        <div className="insight-grid">
          {insightCards.map((item) => (
            <article key={item.key} className={`insight-card insight-card-${item.tone}`}>
              <span className={`insight-icon insight-icon-${item.tone}`}>
                <AppIcon name={item.icon} className="mini-icon" />
              </span>
              <div className="insight-card-copy">
                <p>{item.title}</p>
                <strong>{item.headline}</strong>
                <span className="insight-chip">{item.badge}</span>
                <small>{item.detail}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderHighlightCards(items) {
    return (
      <div className="page-highlight-grid">
        {items.map((item) => (
          <article key={item.label} className="page-highlight-card">
            <p className="page-highlight-label">{item.label}</p>
            <strong className="page-highlight-value">{item.value}</strong>
            <small className="page-highlight-detail">{item.detail}</small>
            {typeof item.progress === "number" ? (
              <div className="progress-track">
                <span
                  className={`progress-value progress-value-${item.tone ?? "violet"}`}
                  style={{ width: `${Math.max(8, item.progress)}%` }}
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    );
  }

  let pageContent;

  switch (activeNav) {
    case "transactions":
      pageContent = (
        <div className="page-stack">
          <div className="page-top-grid">
            {renderMonthCard()}
            {renderQuickActionsCard()}
          </div>
          {renderTransactionsSection()}
        </div>
      );
      break;
    case "insights":
      pageContent = (
        <div className="page-stack">
          {renderChartGrid()}
          {renderInsightsSection()}
        </div>
      );
      break;
    case "budgets":
      pageContent = (
        <div className="page-stack">
          <div className="budget-page-top-grid">
            {renderBudgetSummaryCard()}
            {renderBudgetPlannerCard()}
          </div>
          {renderBudgetSection()}
        </div>
      );
      break;
    case "goals":
      pageContent = (
        <div className="page-stack">
          <div className="page-top-grid">
            <section className="dashboard-card">
              <div className="section-title">
                <span className="section-icon">
                  <AppIcon name="goals" className="mini-icon" />
                </span>
                <h3>Goal Snapshot</h3>
              </div>
              {renderHighlightCards(goalHighlights)}
            </section>

            {renderGoalPlannerCard()}
          </div>

          {renderGoalPlansSection()}
          {renderComparisonSection()}
        </div>
      );
      break;
    case "reports":
      pageContent = (
        <div className="page-stack">
          <section className="dashboard-card">
            <div className="section-header section-header-compact">
              <div className="section-title">
                <span className="section-icon">
                  <AppIcon name="reports" className="mini-icon" />
                </span>
                <h3>Report Snapshot</h3>
              </div>

              <div className="settings-actions">
                <button className="primary-action" onClick={handleExportCsv} type="button" disabled={!isAdmin}>
                  <AppIcon name="download" className="mini-icon" />
                  <span>Export CSV</span>
                </button>
                <button className="secondary-action" onClick={handleExportJson} type="button" disabled={!isAdmin}>
                  Export JSON
                </button>
              </div>
            </div>
            {renderHighlightCards(reportHighlights)}
          </section>
          {renderRecentActivitySection()}
        </div>
      );
      break;
    case "settings":
      pageContent = (
        <div className="page-stack">
          <section className="dashboard-card settings-page-card">
            <div className="section-title">
              <span className="section-icon">
                <AppIcon name="settings" className="mini-icon" />
              </span>
              <h3>Access & Appearance</h3>
            </div>

            <div className="settings-grid">
              <div className="settings-panel">
                <p className="page-highlight-label">Workspace Role</p>
                {renderRoleSelector("top-select top-select-role settings-role-select")}
                <small className="settings-note">
                  Admin can add, edit, delete, import, and export dashboard data.
                </small>
              </div>

              <div className="settings-panel">
                <p className="page-highlight-label">Theme Mode</p>
                {renderThemeToggle("settings-theme-toggle")}
                <small className="settings-note">Theme changes update the full dashboard instantly.</small>
              </div>
            </div>
          </section>

          <section className="dashboard-card settings-page-card">
            <div className="section-title">
              <span className="section-icon">
                <AppIcon name="spark" className="mini-icon" />
              </span>
              <h3>Data Actions</h3>
            </div>

            <div className="settings-actions">
              <button className="primary-action" onClick={handleExportCsv} type="button" disabled={!isAdmin}>
                <AppIcon name="download" className="mini-icon" />
                <span>Export CSV</span>
              </button>
              <button className="secondary-action" onClick={handleExportJson} type="button" disabled={!isAdmin}>
                Export JSON
              </button>
              <button
                className="secondary-action"
                onClick={() => importInputRef.current?.click()}
                type="button"
                disabled={!isAdmin}
              >
                Import JSON
              </button>
              <button className="text-button" onClick={handleRestoreSampleData} type="button" disabled={!isAdmin}>
                Restore Demo Data
              </button>
            </div>
          </section>
        </div>
      );
      break;
    case "dashboard":
    default:
      pageContent = (
        <div className="page-stack">
          <section className="metric-grid">
            {metricCards.map((item) => (
              <MetricCard key={item.key} item={item} />
            ))}
          </section>

          {renderQuickActionsCard()}

          {renderChartGrid()}
        </div>
      );
      break;
  }

  return (
    <div className={`finvista-shell theme-${themeMode} ${isSidebarOpen ? "sidebar-open" : ""}`}>
      <div className="finvista-backdrop" />
      <div className="finvista-glow finvista-glow-left" />
      <div className="finvista-glow finvista-glow-right" />
      <button
        className={`sidebar-overlay ${isSidebarOpen ? "sidebar-overlay-visible" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        type="button"
        aria-label="Close navigation menu"
        tabIndex={isSidebarOpen ? 0 : -1}
      />

      <aside className="finvista-sidebar" id="finvista-sidebar">
        <div className="brand-lockup">
          <div className="brand-mark-shell">
            <AppIcon name="logo" className="brand-mark" />
          </div>
          <div>
            <h1>Finance</h1>
            <p>TRACK . ANALYZE . GROW</p>
          </div>
        </div>

        <div className="sidebar-group">
          <nav className="sidebar-nav">
            {mainNavigationItems.map((item) => (
              <button
                key={item.key}
                className={`sidebar-button ${activeNav === item.key ? "sidebar-button-active" : ""}`}
                onClick={() => handleNavigate(item.key)}
                type="button"
              >
                <AppIcon name={item.icon} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-divider" />

          <div className="sidebar-tools">
            <p className="sidebar-label">TOOLS</p>
            {toolNavigationItems.map((item) => (
              <button
                key={item.key}
                className="sidebar-button sidebar-button-tool"
                onClick={() => handleToolAction(item)}
                type="button"
                disabled={!isAdmin && item.action !== undefined}
              >
                <AppIcon name={item.icon} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            ))}

            <div className="sidebar-settings-row">
              <button
                className={`sidebar-button sidebar-button-tool sidebar-button-settings ${
                  activeNav === "settings" ? "sidebar-button-active" : ""
                }`}
                onClick={() => handleNavigate("settings")}
                type="button"
              >
                <AppIcon name="settings" className="nav-icon" />
                <span>Settings</span>
              </button>

              {renderThemeToggle("sidebar-theme-toggle")}
            </div>
          </div>
        </div>

        <input
          ref={importInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json"
          onChange={handleImportFile}
        />
      </aside>

      <main className="finvista-main">
        <header className="finvista-header">
          <div className="header-intro">
            <button
              className="sidebar-toggle-button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              type="button"
              aria-controls="finvista-sidebar"
              aria-expanded={isSidebarOpen}
              aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              <AppIcon name={isSidebarOpen ? "close" : "menu"} className="mini-icon" />
            </button>

            <div className="hero-copy">
              <h2>{activePageCopy.title}</h2>
              <p>{activePageCopy.description}</p>
            </div>
          </div>

          <div className="header-controls">
            {renderRoleSelector()}

            <button className="circle-button avatar-button" type="button" aria-label="Profile">
              <AppIcon name="avatar" className="avatar-icon" />
            </button>
          </div>
        </header>

        {pageContent}
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
