Kafe lumiere React::

paggrid may date
## Term test update - what was added

Product / service management
- Admin products as a datatable (MUI DataGrid): search, sort, pagination, checkbox selection and **bulk delete**.
- **Multiple photos** per product (up to 5, JPG/PNG/WEBP, 2 MB each), add and remove photos when editing.
- Filters on the menu and the home page: **price** (min/max), **category**, **rating** (minimum stars) and **reviews** (minimum number of reviews).
- Home page product list with **pagination** and **infinite scroll** (toggle).

Reviews
- Customers who completed an order for an item can **rate it and write a review**, and can **update their own review**.
- Bad words in reviews are **masked** (`bad-words` package).
- Admin can **delete any review** (Products page > Reviews).

Transactions
- Admin/staff update the order status; the customer is **emailed the updated transaction** (items, subtotal, grand total) with a **PDF receipt attached**. Customers and staff can also download the receipt from the order page.
- Requires SMTP settings in `backend/config/.env` (see `config/.env.example`).

Forms and UI
- Formik + Yup validation: product form, login, update profile, review form.
- MUI components (DataGrid, Pagination, Rating, Dialog, TextField) on top of the existing Bootstrap 4 styling.
- Redux (store, actions, reducers, constants) for the product catalogue, following the reference project's layout.
- Sales report with a date range (Reports page) - already in place.

Login
- "Continue with Google" through Firebase Authentication (`POST /api/v1/auth/firebase` verifies the Firebase ID token).

### Setup after downloading
```bash
cd backend  && npm install     # adds bad-words and nodemailer
cd frontend && npm install     # adds @mui/material, @mui/x-data-grid, formik, yup, redux, react-redux, redux-thunk, firebase, @emotion/*
```
New settings:
- `backend/config/.env`: `FIREBASE_WEB_API_KEY` and the SMTP_* values (copy from `config/.env.example`).
- `frontend/.env`: the `VITE_FIREBASE_*` values from your Firebase web app.
