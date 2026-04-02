import { useEffect, useState } from "react";
import { CATEGORY_OPTIONS } from "../data.js";

function buildInitialForm(transaction, defaultDate) {
  return {
    id: transaction?.id ?? "",
    date: transaction?.date ?? defaultDate,
    title: transaction?.title ?? "",
    amount: transaction?.amount ?? "",
    category: transaction?.category ?? CATEGORY_OPTIONS[0],
    type: transaction?.type ?? "expense",
    note: transaction?.note ?? "",
  };
}

export default function TransactionModal({
  isOpen,
  mode,
  transaction,
  categoryOptions,
  defaultDate,
  onClose,
  onDelete,
  onSave,
}) {
  const [form, setForm] = useState(buildInitialForm(transaction, defaultDate));

  useEffect(() => {
    setForm(buildInitialForm(transaction, defaultDate));
  }, [transaction, defaultDate, mode, isOpen]);

  if (!isOpen) {
    return null;
  }

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      ...form,
      title: form.title.trim(),
      note: form.note.trim(),
      amount: Number(form.amount),
    };

    if (!payload.title || !payload.date || !payload.category || !payload.type || payload.amount <= 0) {
      return;
    }

    onSave(payload);
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Transaction editor">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{mode === "edit" ? "Edit transaction" : "New transaction"}</p>
            <h3>{mode === "edit" ? form.title || "Edit transaction" : "Add a transaction entry"}</h3>
            <p className="modal-subtext">
              {mode === "edit"
                ? "Refine the selected record and keep the dashboard story clean."
                : "Add a fresh transaction to see charts, insights, and totals react instantly."}
            </p>
          </div>
          <button className="ghost-button inline-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Title</span>
            <input
              name="title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              required
            />
          </label>

          <div className="modal-two-up">
            <label className="form-field">
              <span>Date</span>
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
                required
              />
            </label>
            <label className="form-field">
              <span>Amount</span>
              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                value={form.amount}
                onChange={(event) => updateField("amount", event.target.value)}
                required
              />
            </label>
          </div>

          <div className="modal-two-up">
            <label className="form-field">
              <span>Category</span>
              <select
                name="category"
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                required
              >
                {(categoryOptions.length ? categoryOptions : CATEGORY_OPTIONS).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Type</span>
              <select
                name="type"
                value={form.type}
                onChange={(event) => updateField("type", event.target.value)}
                required
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Note</span>
            <textarea
              name="note"
              rows="3"
              placeholder="Optional context"
              value={form.note}
              onChange={(event) => updateField("note", event.target.value)}
            />
          </label>

          <div className="modal-actions">
            {mode === "edit" && transaction ? (
              <button
                className="ghost-button"
                onClick={() => onDelete(transaction.id)}
                type="button"
              >
                Delete
              </button>
            ) : (
              <span className="helper-text">Changes save locally in the browser.</span>
            )}

            <div className="button-row">
              <button className="ghost-button" onClick={onClose} type="button">
                Cancel
              </button>
              <button className="primary-button" type="submit">
                Save transaction
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
