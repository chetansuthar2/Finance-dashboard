import { CATEGORY_OPTIONS } from "./data.js";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const longDateFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "numeric",
});

export function formatCurrency(value) {
  return currencyFormatter.format(value);
}

export function formatSignedCurrency(value) {
  const absolute = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${absolute}` : `-${absolute}`;
}

export function formatDate(date) {
  return longDateFormatter.format(parseDate(date));
}

export function formatMonthLabel(monthKey) {
  return monthFormatter.format(parseDate(`${monthKey}-01`));
}

export function parseDate(dateString) {
  return new Date(`${dateString}T12:00:00`);
}

export function getMonthKey(dateString) {
  return dateString.slice(0, 7);
}

export function getCategoryOptions(transactions) {
  return [...new Set([...CATEGORY_OPTIONS, ...transactions.map((item) => item.category)])].sort();
}

export function getMonthOptions(transactions) {
  return [...new Set(transactions.map((item) => getMonthKey(item.date)))]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      value: key,
      label: formatMonthLabel(key),
    }));
}

export function calculateSummary(transactions, openingBalance) {
  const income = sumByType(transactions, "income");
  const expenses = sumByType(transactions, "expense");
  const balance = openingBalance + income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  return {
    income,
    expenses,
    balance,
    savingsRate,
  };
}

export function getTrendData(transactions, openingBalance) {
  if (!transactions.length) {
    return [];
  }

  const monthMap = new Map();

  transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((transaction) => {
      const monthKey = getMonthKey(transaction.date);
      const current = monthMap.get(monthKey) ?? {
        monthKey,
        income: 0,
        expenses: 0,
      };

      if (transaction.type === "income") {
        current.income += transaction.amount;
      } else {
        current.expenses += transaction.amount;
      }

      monthMap.set(monthKey, current);
    });

  let runningBalance = openingBalance;
  const rows = [...monthMap.values()].map((item) => {
    runningBalance += item.income - item.expenses;
    return {
      ...item,
      balance: runningBalance,
      label: formatMonthLabel(item.monthKey),
    };
  });

  return rows.slice(-6);
}

export function getSpendingBreakdown(transactions) {
  const expenses = transactions.filter((item) => item.type === "expense");
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  if (!total) {
    return [];
  }

  const grouped = expenses.reduce((map, item) => {
    map.set(item.category, (map.get(item.category) ?? 0) + item.amount);
    return map;
  }, new Map());

  return [...grouped.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      percent: (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

export function getVisibleTransactions(transactions, filters) {
  const searchValue = filters.search.trim().toLowerCase();

  const filtered = transactions.filter((transaction) => {
    const matchesSearch =
      !searchValue ||
      [transaction.title, transaction.category, transaction.note]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(searchValue));
    const matchesType = filters.type === "all" || transaction.type === filters.type;
    const matchesCategory =
      filters.category === "all" || transaction.category === filters.category;
    const matchesMonth =
      filters.month === "all" || getMonthKey(transaction.date) === filters.month;

    return matchesSearch && matchesType && matchesCategory && matchesMonth;
  });

  return filtered.sort((left, right) => compareTransactions(left, right, filters.sort));
}

function compareTransactions(left, right, sort) {
  switch (sort) {
    case "date-asc":
      return left.date.localeCompare(right.date);
    case "amount-desc":
      return right.amount - left.amount;
    case "amount-asc":
      return left.amount - right.amount;
    case "date-desc":
    default:
      return right.date.localeCompare(left.date);
  }
}

function sumByType(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function getLatestTransactionDate(transactions) {
  return transactions.length
    ? transactions.reduce((latest, item) => (item.date > latest ? item.date : latest), transactions[0].date)
    : new Date().toISOString().slice(0, 10);
}

export function getInsights(transactions, openingBalance) {
  if (!transactions.length) {
    return [
      {
        label: "Top spend",
        headline: "No expense data yet",
        detail: "Add a few transactions to unlock spending insights.",
      },
      {
        label: "Monthly comparison",
        headline: "No monthly trend yet",
        detail: "Income and expense changes will appear here once data exists.",
      },
      {
        label: "Observation",
        headline: "Waiting on activity",
        detail: "Seed data can be restored at any time for a full demo.",
      },
    ];
  }

  const breakdown = getSpendingBreakdown(transactions);
  const topSpend = breakdown[0];
  const trend = getTrendData(transactions, openingBalance);
  const latestMonth = trend[trend.length - 1];
  const previousMonth = trend[trend.length - 2];
  const latestNet = latestMonth ? latestMonth.income - latestMonth.expenses : 0;
  const savingsRate =
    latestMonth && latestMonth.income > 0
      ? Math.round(((latestMonth.income - latestMonth.expenses) / latestMonth.income) * 100)
      : 0;

  let monthlyComparison = {
    headline: "No previous month to compare",
    detail: latestMonth
      ? `${latestMonth.label} is the first month available in the dataset.`
      : "Add more data to compare monthly movement.",
  };

  if (latestMonth && previousMonth) {
    const delta = latestMonth.expenses - previousMonth.expenses;
    const direction = delta === 0 ? "flat" : delta > 0 ? "up" : "down";
    const percent =
      previousMonth.expenses > 0 ? Math.round((Math.abs(delta) / previousMonth.expenses) * 100) : 0;

    monthlyComparison = {
      headline:
        direction === "flat"
          ? "Expenses are flat month over month"
          : `Expenses ${direction} ${percent}% vs ${previousMonth.label}`,
      detail: `${latestMonth.label} closed with ${formatCurrency(
        latestMonth.expenses
      )} in spend and ${formatCurrency(latestNet)} net cash flow.`,
    };
  }

  return [
    {
      label: "Top spend",
      headline: topSpend
        ? `${topSpend.category} leads at ${formatCurrency(topSpend.amount)}`
        : "No expense data yet",
      detail: topSpend
        ? `${Math.round(topSpend.percent)}% of total spending sits in this category.`
        : "Expenses will group into categories automatically.",
    },
    {
      label: "Monthly comparison",
      headline: monthlyComparison.headline,
      detail: monthlyComparison.detail,
    },
    {
      label: "Observation",
      headline:
        latestMonth && latestNet >= 0
          ? `${latestMonth.label} savings rate is ${savingsRate}%`
          : `${latestMonth?.label ?? "Latest month"} is running above income`,
      detail:
        latestMonth && latestNet >= 0
          ? `Closing balance reached ${formatCurrency(latestMonth.balance)} after income outpaced spend.`
          : "A tighter month usually points to travel, shopping, or one-off bills.",
    },
  ];
}

export function toCsv(transactions) {
  const header = ["Date", "Title", "Category", "Type", "Amount", "Note"];
  const lines = transactions.map((transaction) =>
    [
      transaction.date,
      escapeCsv(transaction.title),
      escapeCsv(transaction.category),
      transaction.type,
      transaction.amount,
      escapeCsv(transaction.note ?? ""),
    ].join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

function escapeCsv(value) {
  const safe = String(value ?? "");
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
