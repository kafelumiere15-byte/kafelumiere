import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import OrderItemReview from '../Review/OrderItemReview'
import { API, authConfig, errMsg, formatDateTime, formatPrice, getErrorMessage, paymentStateLabel, statusSlug } from '../Utils/helpers'

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'past', label: 'Past' },
]

const EMPTY_TEXT = {
    all: "You haven't placed any orders yet.",
    active: 'You have no active orders right now.',
    past: 'You have no past orders yet.',
}

// Customer only: every order the customer has placed, newest first
const MyOrders = () => {
    const [filter, setFilter] = useState('all')
    const [orders, setOrders] = useState([])
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)

    const query = (pageNumber) => ({
        ...authConfig(),
        params: { status: filter === 'all' ? undefined : filter, page: pageNumber },
    })

    // first page - again whenever the filter changes
    useEffect(() => {
        let ignore = false
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/orders/mine`, {
                    ...authConfig(),
                    params: { status: filter === 'all' ? undefined : filter, page: 1 },
                })
                if (!ignore) {
                    setOrders(data.orders)
                    setPage(data.page)
                    setPages(data.pages)
                    setTotal(data.total)
                }
            } catch (error) {
                if (!ignore) errMsg(getErrorMessage(error))
            } finally {
                if (!ignore) setLoading(false)
            }
        }
        load()
        return () => { ignore = true }
    }, [filter])

    const chooseFilter = (id) => {
        if (id === filter) return
        setLoading(true)
        setFilter(id)
    }

    const loadMore = async () => {
        setLoadingMore(true)
        try {
            const { data } = await axios.get(`${API}/orders/mine`, query(page + 1))
            // new orders may have arrived meanwhile and shifted the pages, so skip any we already show
            setOrders(current => {
                const seen = new Set(current.map(o => o._id))
                return [...current, ...data.orders.filter(o => !seen.has(o._id))]
            })
            setPage(data.page)
            setPages(data.pages)
            setTotal(data.total)
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setLoadingMore(false)
        }
    }

    return (
        <>
            <MetaData title="My Orders" />
            <div className="container py-5" style={{ maxWidth: 860 }}>
                <h1>My Orders</h1>
                <p className="text-muted">Track your current orders and look back at your past ones.</p>

                <div className="cat-pills mb-4" role="group" aria-label="Filter orders">
                    {FILTERS.map(f => (
                        <button key={f.id} type="button" className={`cat-pill ${filter === f.id ? 'active' : ''}`}
                            onClick={() => chooseFilter(f.id)}>{f.label}</button>
                    ))}
                </div>

                {loading ? <Loader /> : orders.length === 0 ? (
                    <div className="text-center py-5">
                        <div className="empty-cart-icon">🧾</div>
                        <p className="text-muted">{EMPTY_TEXT[filter]}</p>
                        <Link to="/menu" className="btn btn-lumiere">Browse the menu</Link>
                    </div>
                ) : (
                    <>
                        <div className="small text-muted mb-2" data-testid="orders-count">
                            Showing {orders.length} of {total} order{total === 1 ? '' : 's'}
                        </div>

                        {orders.map(o => (
                            <div className="order-card" key={o._id} data-testid="order-card">
                                <div className="d-flex justify-content-between align-items-center flex-wrap">
                                    <Link to={`/orders/${o._id}`} className="order-card-number">{o.orderNumber}</Link>
                                    <span className={`order-status ${statusSlug(o.status)}`}>{o.status}</span>
                                </div>
                                <div className="text-muted small mb-2">{formatDateTime(o.createdAt)}</div>

                                <ul className="order-card-items">
                                    {o.items.map((item, i) => (
                                        <li key={i}>
                                            {item.quantity} × {item.name}
                                            {o.status === 'Completed' && (
                                                <OrderItemReview productId={item.product} productName={item.name} />
                                            )}
                                        </li>
                                    ))}
                                </ul>

                                <div className="d-flex justify-content-between align-items-center flex-wrap">
                                    <div>
                                        <strong>{formatPrice(o.total)}</strong>{' '}
                                        <small className="text-muted">· {o.paymentMethodLabel} · {paymentStateLabel(o.paymentStatus)}</small>
                                    </div>
                                    <Link to={`/orders/${o._id}`} className="btn btn-sm btn-outline-lumiere">View details</Link>
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
        </>
    )
}

export default MyOrders