# esm-patient-orders-fast-app

Fast drug order entry microfrontend for the OpenMRS patient chart. Provides a streamlined prescription builder with:

- **Order Basket**: NLP-style free-text input, quick templates, inline order rows, batch submit
- **Single Order Form**: Drug search, dose/frequency/route/duration chips, advanced options

## Where the app appears

- **Full-page view**: **Orders (Fast)** appears in the patient chart sidebar. Click it to open the fast prescription builder in the **main content area** (full width), with Order Basket tab, Single Order Form tab, and cart on the right. You can also open it from **Orders** → order basket → **Fast orders** tile → **Open** (same full-page view).
- **Cart**: Add drugs via **Add to cart** (Single Order Form) or from NLP/templates (Order Basket tab). The cart is shown on the right; click an item to edit, or **Submit all** to place all orders together.

## Features

- Drug search via OpenMRS REST API (`/drug?q=...`)
- Order config (routes, dose units, frequencies, duration units) from `/orderentryconfig`
- Order submission via `POST /order` or encounter creation with orders
- Patient orders display from `usePatientDrugOrders`

## Running Locally

From the monorepo root:

```bash
# Install dependencies (if needed)
yarn install

# Run with Fast Orders app
yarn start:fast-orders
```

Or with the default start plus the fast app:

```bash
yarn start --sources packages/esm-patient-chart-app/ --sources packages/esm-patient-orders-fast-app/
```

## Configuration

- `orderEncounterType`: UUID for the encounter type (default: Order encounter)
- `drugOrderTypeUUID`: UUID for drug order type (default: 131168f4-15f5-102d-96e4-000c29c2a5d7)

## Dependencies

- Requires `orderentryconfig` module on the backend for routes, dose units, frequencies, duration units
- Active visit required for order submission
