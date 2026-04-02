import { LOCAL_STORAGE_KEY, seedTransactions } from "./data.js";

function buildInitialState() {
  const persisted = readPersistedState();

  return {
    role: persisted.role ?? "admin",
    transactions: persisted.transactions?.length
      ? sortTransactionsByDate(persisted.transactions)
      : sortTransactionsByDate(seedTransactions),
    filters: {
      search: "",
      type: "all",
      category: "all",
      month: "all",
      sort: "date-desc",
    },
    editor: {
      isOpen: false,
      mode: "create",
      transactionId: null,
    },
  };
}

function readPersistedState() {
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistState(state) {
  const payload = {
    role: state.role,
    transactions: state.transactions,
  };

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

function sortTransactionsByDate(transactions) {
  return [...transactions].sort((a, b) => {
    if (a.date === b.date) {
      return a.id.localeCompare(b.id);
    }
    return b.date.localeCompare(a.date);
  });
}

export function createStore() {
  let state = buildInitialState();
  const listeners = new Set();

  function notify() {
    persistState(state);
    listeners.forEach((listener) => listener(state));
  }

  function setState(updater) {
    state =
      typeof updater === "function"
        ? updater(state)
        : {
            ...state,
            ...updater,
          };
    notify();
  }

  return {
    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setRole(role) {
      setState((current) => ({ ...current, role }));
    },

    setFilters(patch) {
      setState((current) => ({
        ...current,
        filters: {
          ...current.filters,
          ...patch,
        },
      }));
    },

    resetFilters() {
      setState((current) => ({
        ...current,
        filters: {
          search: "",
          type: "all",
          category: "all",
          month: "all",
          sort: "date-desc",
        },
      }));
    },

    openEditor(mode, transactionId = null) {
      setState((current) => ({
        ...current,
        editor: {
          isOpen: true,
          mode,
          transactionId,
        },
      }));
    },

    closeEditor() {
      setState((current) => ({
        ...current,
        editor: {
          isOpen: false,
          mode: "create",
          transactionId: null,
        },
      }));
    },

    saveTransaction(transaction) {
      setState((current) => {
        const nextTransactions =
          transaction.id && current.transactions.some((item) => item.id === transaction.id)
            ? current.transactions.map((item) =>
                item.id === transaction.id ? { ...transaction } : item
              )
            : [
                {
                  ...transaction,
                  id: `tx-${Date.now()}`,
                },
                ...current.transactions,
              ];

        return {
          ...current,
          transactions: sortTransactionsByDate(nextTransactions),
          editor: {
            isOpen: false,
            mode: "create",
            transactionId: null,
          },
        };
      });
    },

    deleteTransaction(transactionId) {
      setState((current) => ({
        ...current,
        transactions: sortTransactionsByDate(
          current.transactions.filter((item) => item.id !== transactionId)
        ),
        editor: {
          isOpen: false,
          mode: "create",
          transactionId: null,
        },
      }));
    },

    restoreSampleData() {
      setState((current) => ({
        ...current,
        transactions: sortTransactionsByDate(seedTransactions),
        filters: {
          search: "",
          type: "all",
          category: "all",
          month: "all",
          sort: "date-desc",
        },
        editor: {
          isOpen: false,
          mode: "create",
          transactionId: null,
        },
      }));
    },
  };
}
