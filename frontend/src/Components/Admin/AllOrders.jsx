import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import {
    API, POLL_MS, STAFF_TABS, authConfig, errMsg, formatDateTime, formatPrice, getErrorMessage,
    paymentPillClass, paymentStateLabel, statusSlug,
} from '../Utils/helpers'

const TABS = [STAFF_TABS.find(t => t.id === 'all'), ...STAFF_TABS.filter(t => t.id !== 'all')]   // "All" first

// Admin: watch every order in the shop. Filter by status, online / walk-in, payment and date; search; open the details.
const AllOrders = () => {
    const [tab, setTab] = useState('all')
    const [source, setSource] = useState('')
    const [payment, setPayment] = useState('')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [text, setText] = useState('')
    const [q, setQ] = useState('')
    const [orders, setOrders] = useState([])
    const [counts, setCounts] = useState(null)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const pageRef = useRef(1)

    const badRange = Boolean(from && to && from > to)
    const filtering = Boolean(source || payment || from || to || q)
    const params = (pageNumber) => ({
        status: tab, source: source || undefined, payment: payment || undefined,
        from: from || undefined, to: to || undefined, q: q || undefined, page: pageNumber,
    })

    // load page 1 now and keep it fresh (the admin is "monitoring")
    useEffect(() => {
        if (badRange) return
        let ignore = false
        const load = async (silent) => {
            try {
                const { data } = await axios.get(`${API}/orders`, {
                    ...authConfig(),
                    params: {
                        status: tab, source: source || undefined, payment: payment || undefined,
                        from: from || undefined, to: to || undefined, q: q || undefined, page: 1,
                    },
                })
                if (ignore) return
                setCounts(data.counts)
                if (!silent || pageRef.current === 1) {   // keep the pages the admin already opened
                    pageRef.current = 1
                    setOrders(data.orders)
                    setPage(data.page)
                    setPages(data.pages)
                    setTotal(data.total)
                }
            } catch (error) {
                if (!ignore && !silent) errMsg(getErrorMessage(error))
            } finally {
                if (!ignore) setLoading(false)
            }
        }
        load(false)
        const timer = setInterval(() => load(true), POLL_MS)
        return () => {
            ignore = true
            clearInterval(timer)
        }
    }, [tab, source, payment, from, to, q, badRange])

    // typing -> wait 300ms, then search
    useEffect(() => {
        if (text.trim() === q) return
        const timer = setTimeout(() => {
            setLoading(true)
            pageRef.current = 1
            setQ(text.trim())
        }, 300)
        return () => clearTimeout(timer)
    }, [text, q])

    // any filter changed by the admin
    const change = (setter) => (value) => {
        setLoading(true)
        pageRef.current = 1
        setter(value)
    }
    const chooseTab = change(setTab), chooseSource = change(setSource), choosePayment = change(setPayment)
    const chooseFrom = change(setFrom), chooseTo = change(setTo)

    const clearFilters = () => {
        setLoading(true)
        pageRef.current = 1
        setSource(''); setPayment(''); setFrom(''); setTo(''); setText(''); setQ('')
    }

    const loadMore = async () => {
        setLoadingMore(true)
        try {
            const { data } = await axios.get(`${API}/orders`, { ...authConfig(), params: params(page + 1) })
            setOrders(current => {
                const seen = new Set(current.map(o => o._id))
                return [...current, ...data.orders.filter(o => !seen.has(o._id))]
            })
            pageRef.current = data.page
            setPage(data.page)
            setPages(data.pages)
            setTotal(data.total)
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setLoadingMore(false)
        }
    }

    const shown = badRange ? [] : orders

    return (
        <>
            <MetaData title="All Orders" />
            <div className="container py-5" style={{ maxWidth: 1100 }}>
                <h1>All Orders</h1>
                <p className="text-muted">Every order in the shop: online and walk-in, in progress, completed and cancelled.</p>

                <div className="cat-pills mb-3" role="group" aria-label="Order status">
                    {TABS.map(t => (
                        <button key={t.id} type="button" className={`cat-pill ${tab === t.id ? 'active' : ''}`} onClick={() => chooseTab(t.id)}>
                            {t.label}<span className="tab-count">{counts ? counts[t.countKey] : '…'}</span>
                        </button>
                    ))}
                </div>

                <div className="form-row mb-3 filters-row">
                    <div className="col-lg-4 mb-2">
                        <input type="search" className="form-control" placeholder="Search order number, name, email or phone..." aria-label="Search orders"
                            value={text} onChange={(e) => setText(e.target.value)} />
                    </div>
                    <div className="col-6 col-lg-2 mb-2">
                        <select className="form-control" aria-label="Order source" value={source} onChange={(e) => chooseSource(e.target.value)}>
                            <option value="">All sources</option>
                            <option value="online">Online</option>
                            <option value="walk-in">Walk-in</option>
                        </select>
                    </div>
                    <div className="col-6 col-lg-2 mb-2">
                        <select className="form-control" aria-label="Payment status" value={payment} onChange={(e) => choosePayment(e.target.value)}>
                            <option value="">Any payment</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                    <div className="col-6 col-lg-2 mb-2">
                        <input type="date" className="form-control" aria-label="From date" value={from} onChange={(e) => chooseFrom(e.target.value)} />
                    </div>
                    <div className="col-6 col-lg-2 mb-2">
                        <input type="date" className="form-control" aria-label="To date" value={to} onChange={(e) => chooseTo(e.target.value)} />
                    </div>
                </div>

                {badRange && <div className="alert alert-warning py-2" role="alert">The start date is after the end date.</div>}
                {filtering && <button type="button" className="btn btn-link px-0 mb-2" onClick={clearFilters}>Clear filters</button>}

                {loading && !badRange ? <Loader /> : (
                    <div className="panel-card table-responsive">
                        <table className="table table-lumiere mb-0">
                            <thead>
                                <tr><th>Order</th><th>Placed</th><th>Customer</th><th>Items</th><th className="text-right">Total</th><th>Payment</th><th>Status</th><th></th></tr>
                            </thead>
                            <tbody>
                                {shown.length === 0 && (
                                    <tr><td colSpan="8" className="text-center text-muted py-4">No orders match these filters.</td></tr>
                                )}
                                {shown.map(o => (
                                    <tr key={o._id} data-testid="admin-order">
                                        <td><Link to={`/staff/orders/${o._id}`} state={{ from: '/admin/orders' }} className="order-card-number">{o.orderNumber}</Link></td>
                                        <td className="text-nowrap small">{formatDateTime(o.createdAt)}</td>
                                        <td>
                                            {o.customer && o.customer.name}
                                            {o.source === 'walk-in' && <span className="walkin-tag">Walk-in</span>}
                                        </td>
                                        <td className="small">{o.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
                                        <td className="text-right">{formatPrice(o.total)}</td>
                                        <td className="small">
                                            {o.paymentMethodLabel}<br />
                                            <span className={`status-pill ${paymentPillClass(o.paymentStatus)}`}>{paymentStateLabel(o.paymentStatus)}</span>
                                        </td>
                                        <td><span className={`order-status ${statusSlug(o.status)}`}>{o.status}</span></td>
                                        <td className="text-right">
                                            <Link to={`/staff/orders/${o._id}`} state={{ from: '/admin/orders' }} className="btn btn-sm btn-outline-lumiere">View</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !badRange && shown.length > 0 && (
                    <div className="small text-muted mt-2" data-testid="orders-count">Showing {shown.length} of {total} order{total === 1 ? '' : 's'}</div>
                )}
                {!loading && !badRange && page < pages && (
                    <div className="text-center mt-3">
                        <button type="button" className="btn btn-outline-lumiere" disabled={loadingMore} onClick={loadMore}>
                            {loadingMore ? 'Loading...' : 'Load more'}
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

export default AllOrders