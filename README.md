# Ledger Lens Finance Dashboard

A frontend-only finance dashboard built in React for the assignment brief. It uses static mock data, component-based UI, and browser `localStorage` to demonstrate dashboard design, transaction management, role-based UI behavior, and responsive presentation without a backend.

## How to run

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`
3. Create a production build:
   `npm run build`

## What is included

- Dashboard overview with summary cards for total balance, income, expenses, and savings rate
- Time-based visualization showing the monthly closing balance trend
- Categorical visualization showing spending breakdown by top expense categories
- Transactions table with search, filtering, and sorting
- Frontend-only role switcher:
  - `Viewer` can explore data but cannot mutate it
  - `Admin` can add, edit, delete, and export transactions
- Insights section highlighting top spending category, monthly comparison, and a simple observation
- Responsive layout across desktop and mobile sizes
- Empty states for missing transaction results or missing chart data
- Local persistence with `localStorage`
- Export actions for `JSON` and `CSV`

## State management approach

The app uses React state in [src/App.jsx](./src/App.jsx). It manages:

- transactions
- current role
- filter state
- modal editor state

Persisted state is intentionally limited to `role` and `transactions`, while transient UI state like filters and modal visibility stays in memory. Derived dashboard data such as insights, chart inputs, and visible transactions are computed from current React state.

## Project structure

- [index.html](./index.html): app entry point
- [src/main.jsx](./src/main.jsx): React entry point
- [src/App.jsx](./src/App.jsx): main dashboard component and state flow
- [src/components/Charts.jsx](./src/components/Charts.jsx): trend and breakdown visualizations
- [src/components/TransactionModal.jsx](./src/components/TransactionModal.jsx): add/edit transaction modal
- [src/data.js](./src/data.js): seed data and constants
- [src/utils.js](./src/utils.js): derived data, formatting, and export helpers
- [src/styles.css](./src/styles.css): responsive styling and visual system
- [vite.config.js](./vite.config.js): Vite + React configuration

## Assumptions

- Mock data is acceptable, so the dashboard starts with a seeded transaction set.
- Full RBAC is not required, so role behavior is demonstrated through UI controls only.
- A lightweight React solution is enough for review, provided the code stays structured and clearly documented.

## Notes for evaluation

- The visual design intentionally uses soft editorial styling, glass panels, and subtle motion instead of a default admin template.
- The interface is intentionally scoped to show UI thinking, React component structure, and state organization rather than backend complexity.
