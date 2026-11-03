import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import CancelOrderDialog from './CancelOrderDialog'
import PaymentDialog from './PaymentDialog'
import { changeOrderStatus, recordPayment } from './orderApi'
import {
    API, NEXT_ACTION, POLL_MS, STAFF_TABS, authConfig, errMsg, formatDateTime, formatPrice,
    getErrorMessage, infoMsg, paymentPillClass, paymentStateLabel, statusSlug, successMsg,
} from '../Utils/helpers'

// Staff / cashier: the order queue. New orders appear by themselves.
const StaffHome = ({ user }) => {
    const [tab, setTab] = useState('active')
    const [text, setText] = useState('')          // what is typed in the search box
    const [q, setQ] = useState('')                // the search that is actually used
    const [orders, setOrders] = useState([])
    const [counts, setCounts] = useState(null)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [busyId, setBusyId] = useState(null)
    const [cancelTarget, setCancelTarget] = useState(null)
    const [payTarget, setPayTarget] = useState(null)   // { order, completeAfter }
    const [version, setVersion] = useState(0)     // bump to reload the list
    const pageRef = useRef(1)                     // how many pages the staff member has opened
    const pendingRef = useRef(null)               // last number of Pending orders (to spot new ones)

    const reload = () => setVersion(v => v + 1)

    // load page 1 now, and again every few seconds so new orders show up without refreshing
    useEffect(() => {
        let ignore = false
        const load = async (silent) => {
            try {
                const { data } = await axios.get(`${API}/orders`, {
                    ...authConfig(),
                    params: { status: tab, q: q || undefined, page: 1 },
                })
                if (ignore) return

                if (silent && pendingRef.current !== null && data.counts.Pending > pendingRef.current) {
                    infoMsg('New order received!')
                }
                // The automatic refreshes keep this number up to date. A manual reload (changing the tab or the
                // search) only sets it the first time - so an order that arrives while the staff member is
                // switching tabs still gets its "New order" message on the next automatic refresh.
                if (silent || pendingRef.current === null) pendingRef.current = data.counts.Pending
                setCounts(data.counts)

                // do not throw away pages the staff member already opened with "Load more"
                if (!silent || pageRef.current === 1) {
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
    }, [tab, q, version])

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

    const chooseTab = (id) => {
        if (id === tab) return
        setLoading(true)
        pageRef.current = 1
        setTab(id)
    }

    const loadMore = async () => {
        setLoadingMore(true)
        try {
            const { data } = await axios.get(`${API}/orders`, {
                ...authConfig(),
                params: { status: tab, q: q || undefined, page: page + 1 },
            })
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

    // the big button on each order: move it to its next step
    const advance = async (order) => {
        setBusyId(order._id)
        try {
            await changeOrderStatus(order._id, order.nextStatus)
            successMsg(`${order.orderNumber} is now ${order.nextStatus}`)
        } catch (error) {
            errMsg(getErrorMessage(error))   // e.g. someone else already moved it
        } finally {
            setBusyId(null)
            reload()
        }
    }

    const confirmCancel = async (reason) => {
        const order = cancelTarget
        setBusyId(order._id)
        try {
            await changeOrderStatus(order._id, 'Cancelled', reason)
            successMsg(`${order.orderNumber} was cancelled`)
            setCancelTarget(null)
            reload()
        } catch (error) {
            errMsg(getErrorMessage(error))
            if (error?.response?.status === 409) {   // already changed by someone else
                setCancelTarget(null)
                reload()
            }
        } finally {
            setBusyId(null)
        }
    }

    // the payment dialog calls this; what it returns is shown to the cashier (the change)
    const takePayment = async (payment) => {
        const { order, completeAfter } = payTarget
        try {
            const { data } = await recordPayment(order._id, payment)
            let completed = false
            if (completeAfter) {
                try {
                    await changeOrderStatus(order._id, 'Completed')
                    completed = true
                } catch (error) {
                    errMsg(getErrorMessage(error))   // the money is recorded; only the last step failed
                }
            }
            return { change: data.order.change || 0, completed }
        } catch (error) {
            errMsg(getErrorMessage(error))
            return null
        }
    }

    const emptyText = q
        ? `No orders match “${q}”.`
        : tab === 'active'
            ? 'No active orders right now. New orders will appear here by themselves.'
            : 'No orders to show here.'

    return (
        <>
            <MetaData title="Staff Panel" />
            <div className="container py-5" style={{ maxWidth: 980 }}>
                <h1>Staff / Cashier Panel</h1>
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                    <p className="text-muted mb-2">Welcome, {user.name}. These are the orders from your customers.</p>
                    <Link to="/staff/pos" className="btn btn-lumiere mb-2">+ New walk-in order</Link>
                </div>

                <div className="cat-pills mb-3" role="group" aria-label="Order tabs">
                    {STAFF_TABS.map(t => (
                        <button key={t.id} type="button" className={`cat-pill ${tab === t.id ? 'active' : ''}`} onClick={() => chooseTab(t.id)}>
                            {t.label}<span className="tab-count">{counts ? counts[t.countKey] : '…'}</span>
                        </button>
                    ))}
                </div>

                <input type="search" className="form-control mb-4" style={{ maxWidth: 420, borderRadius: 24 }}
                    placeholder="Search by order number, name, email or phone..." aria-label="Search orders"
                    value={text} onChange={(e) => setText(e.target.value)} />

                {loading ? <Loader /> : orders.length === 0 ? (
                    <div className="text-center text-muted py-5">{emptyText}</div>
                ) : (
                    <>
                        <div className="small text-muted mb-2" data-testid="orders-count">
                            Showing {orders.length} of {total} order{total === 1 ? '' : 's'}
                        </div>

                        {orders.map(o => (
                            <div className="order-card" key={o._id} data-testid="staff-order">
                                <div className="d-flex justify-content-between align-items-center flex-wrap">
                                    <span>
                                        <Link to={`/staff/orders/${o._id}`} className="order-card-number">{o.orderNumber}</Link>
                                        {o.source === 'walk-in' && <span className="walkin-tag">Walk-in</span>}
                                    </span>
                                    <span className={`order-status ${statusSlug(o.status)}`}>{o.status}</span>
                                </div>
                                <div className="small text-muted mb-2">
                                    {formatDateTime(o.createdAt)} · <strong>{o.customer && o.customer.name}</strong>
                                    {o.customer && o.customer.phone ? ` · ${o.customer.phone}` : ''}
                                </div>

                                <ul className="order-card-items mb-2">
                                    {o.items.map((item, i) => <li key={i}>{item.quantity} × {item.name}</li>)}
                                </ul>
                                {o.note && <div className="small mb-2"><em>Customer note: {o.note}</em></div>}
                                {o.status === 'Cancelled' && o.cancelReason && <div className="small text-danger mb-2">Reason: {o.cancelReason}</div>}

                                <div className="d-flex justify-content-between align-items-center flex-wrap">
                                    <div>
                                        <strong>{formatPrice(o.total)}</strong>{' '}
                                        <small className="text-muted">· {o.paymentMethodLabel} ·</small>{' '}
                                        <span className={`status-pill ${paymentPillClass(o.paymentStatus)}`}>{paymentStateLabel(o.paymentStatus)}</span>
                                    </div>
                                    <div className="mt-2 mt-sm-0">
                                        {o.paymentStatus === 'unpaid' && o.status !== 'Cancelled' && o.nextStatus !== 'Completed' && (
                                            <button type="button" className="btn btn-sm btn-outline-success mr-2" onClick={() => setPayTarget({ order: o, completeAfter: false })}>
                                                Take payment
                                            </button>
                                        )}
                                        {o.nextStatus && (
                                            <>
                                                {o.nextStatus === 'Completed' && o.paymentStatus !== 'paid' ? (
                                                    <button type="button" className="btn btn-sm btn-lumiere mr-2" disabled={busyId === o._id} onClick={() => setPayTarget({ order: o, completeAfter: true })}>
                                                        Take payment &amp; complete
                                                    </button>
                                                ) : (
                                                    <button type="button" className="btn btn-sm btn-lumiere mr-2" disabled={busyId === o._id} onClick={() => advance(o)}>
                                                        {NEXT_ACTION[o.status]}
                                                    </button>
                                                )}
                                                <button type="button" className="btn btn-sm btn-outline-danger mr-2" disabled={busyId === o._id} onClick={() => setCancelTarget(o)}>
                                                    {o.status === 'Pending' ? 'Reject order' : 'Cancel order'}
                                                </button>
                                            </>
                                        )}
                                        <Link to={`/staff/orders/${o._id}`} className="btn btn-sm btn-outline-lumiere">Details</Link>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {page < pages && (
                            <div className="text-center mt-3">
                                <button type="button" className="btn btn-outline-lumiere" disabled={loadingMore} onClick={loadMore}>
                                    {loadingMore ? 'Loading...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {payTarget && (
                <PaymentDialog order={payTarget.order} completeAfter={payTarget.completeAfter}
                    onConfirm={takePayment}
                    onDone={() => { setPayTarget(null); reload() }}
                    onClose={() => setPayTarget(null)} />
            )}

            {cancelTarget && (
                <CancelOrderDialog order={cancelTarget} busy={busyId === cancelTarget._id}
                    onClose={() => setCancelTarget(null)} onConfirm={confirmCancel} />
            )}
        </>
    )
}

export default StaffHome