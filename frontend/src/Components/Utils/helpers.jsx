import axios from 'axios';
import { toast } from 'react-toastify';

export const API = import.meta.env.VITE_API || 'http://localhost:4001/api/v1';

export const getUser = () => {
    const raw = sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : false;
};

export const getToken = () => {
    const raw = sessionStorage.getItem('token');
    return raw ? JSON.parse(raw) : false;
};

// save token + user after login / register / password change
export const authenticate = (data, next) => {
    sessionStorage.setItem('token', JSON.stringify(data.token));
    sessionStorage.setItem('user', JSON.stringify(data.user));
    next();
};

// keep the stored user in sync after a profile update
export const saveUser = (user) => {
    sessionStorage.setItem('user', JSON.stringify(user));
};

export const logout = next => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    next();
};

// axios config that sends the JWT
export const authConfig = () => ({
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
    }
});

// where each role lands after login
export const homePathForRole = (role) => {
    if (role === 'admin') return '/dashboard';
    if (role === 'staff') return '/staff';
    return '/';
};

// pull the server's message out of an axios error
export const getErrorMessage = (error) =>
    error?.response?.data?.message || 'Cannot reach the server. Is the backend running?';

export const errMsg = (message = '') => toast.error(message, { position: 'bottom-center' });
export const successMsg = (message = '') => toast.success(message, { position: 'bottom-center' });

// ---- added in Part 2 ----

// server address without /api/v1  (uploaded images live at <origin>/uploads/...)
export const API_ORIGIN = API.replace(/\/api\/v1\/?$/, '');

export const imageUrl = (image) => (image && image.url ? `${API_ORIGIN}${image.url}` : null);

export const formatPrice = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);

// auth header only (use this for FormData / file uploads - the browser sets the content type)
export const authOnly = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
});

// ---- added in Part 4 ----

// same limit as the server: most of one item in a cart
export const MAX_PER_ITEM = 20;

export const infoMsg = (message = '') => toast.info(message, { position: 'bottom-center' });

// ---- added in Part 5 ----

// e.g. "Oct 14, 2026, 3:05 PM" in Philippine time
export const formatDateTime = (date) =>
    new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(date));

// ---- added in Part 6 ----

// the steps of an order, in order (Cancelled is shown separately)
export const ORDER_STEPS = ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Completed'];

// once an order reaches one of these, its status will not change any more
export const FINAL_STATUSES = ['Completed', 'Cancelled'];

// how often (milliseconds) an open order page asks the server for a new status
export const POLL_MS = Number(import.meta.env.VITE_ORDER_POLL_MS) || 10000;

// "Ready for Pickup" -> "ready-for-pickup" (used for the colour of the status badge)
export const statusSlug = (status) => String(status).toLowerCase().replace(/\s+/g, '-');

// ---- added in Part 7 ----

// the button text for moving an order to its next step (the server decides what the next step is)
export const NEXT_ACTION = {
    'Pending': 'Confirm order',
    'Confirmed': 'Start preparing',
    'Preparing': 'Mark ready for pickup',
    'Ready for Pickup': 'Mark as completed',
};

// tabs on the staff order board (countKey = the number the server sends for that tab)
export const STAFF_TABS = [
    { id: 'active', label: 'Active', countKey: 'active' },
    { id: 'Pending', label: 'Pending', countKey: 'Pending' },
    { id: 'Confirmed', label: 'Confirmed', countKey: 'Confirmed' },
    { id: 'Preparing', label: 'Preparing', countKey: 'Preparing' },
    { id: 'Ready for Pickup', label: 'Ready', countKey: 'Ready for Pickup' },
    { id: 'Completed', label: 'Completed', countKey: 'Completed' },
    { id: 'Cancelled', label: 'Cancelled', countKey: 'Cancelled' },
    { id: 'all', label: 'All', countKey: 'all' },
];

// ---- added in Part 8 ----

export const PAYMENT_STATE = { unpaid: 'Unpaid', paid: 'Paid', refunded: 'Refunded' };
export const paymentStateLabel = (status) => PAYMENT_STATE[status] || status;
export const paymentPillClass = (status) => (status === 'paid' ? 'on' : 'off');

// quick "amount received" buttons on the payment dialog (pesos)
export const CASH_QUICK = [50, 100, 200, 500, 1000];

// ---- added in Part 9 ----

// e.g. "Oct 14, 2026" in Philippine time
export const formatDate = (date) =>
    new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(date));

// tabs on the admin "Users" page ('query' is what is sent to the server)
export const USER_TABS = [
    { id: 'all', label: 'All', countKey: 'all', query: {} },
    { id: 'customer', label: 'Customers', countKey: 'customer', query: { role: 'customer' } },
    { id: 'staff', label: 'Staff', countKey: 'staff', query: { role: 'staff' } },
    { id: 'admin', label: 'Admins', countKey: 'admin', query: { role: 'admin' } },
    { id: 'inactive', label: 'Inactive', countKey: 'inactive', query: { status: 'inactive' } },
];

export const ROLE_LABEL = { customer: 'Customer', staff: 'Staff', admin: 'Admin' };

// ---- added in Part 10 ----

// days of the SHOP (Philippine time): "2026-10-14"
const manilaDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' });
export const todayInManila = () => manilaDay.format(new Date());

export const shiftDay = (key, n) => {
    const d = new Date(`${key}T12:00:00+08:00`);
    d.setUTCDate(d.getUTCDate() + n);
    return manilaDay.format(d);
};

// the first day of the month that is `n` months before / after the month of `key`  (2026-10-14, -5 -> 2026-05-01)
export const shiftMonthStart = (key, n) => {
    const [y, m] = key.split('-').map(Number);
    const total = y * 12 + (m - 1) + n;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
};

// "Oct 14, 2026"  (group = 'day')   or   "October 2026"  (group = 'month')
export const formatPeriod = (period, group = 'day') =>
    group === 'month'
        ? new Intl.DateTimeFormat('en-PH', { month: 'long', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date(`${period}-01T12:00:00+08:00`))
        : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' }).format(new Date(`${period}T12:00:00+08:00`));

// A CSV file that opens correctly in Excel. Cells with a comma, quote or new line are wrapped in quotes.
export const buildCsv = (header, rows) =>
    [header, ...rows]
        .map(row => row.map(cell => {
            const text = cell === undefined || cell === null ? '' : String(cell);
            return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        }).join(','))
        .join('\r\n');

export const downloadCsv = (filename, text) => {
    const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' });   // \uFEFF: Excel reads it as UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

// ---- added for the frontend upgrade (receipt PDF) ----

// downloads the PDF receipt of one order (the server needs the Bearer token, so axios sends it)
export const downloadReceipt = async (orderNumber, orderId) => {
    let res;
    try {
        res = await axios.get(`${API}/orders/${orderId}/receipt`, { ...authOnly(), responseType: 'blob' });
    } catch (error) {
        // errors come back as a blob too - turn the JSON text back into the server's message
        if (error?.response?.data instanceof Blob) {
            try {
                error.response.data = JSON.parse(await error.response.data.text());
            } catch {
                // not JSON - the generic message is shown instead
            }
        }
        throw error;
    }
    const url = URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${orderNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
