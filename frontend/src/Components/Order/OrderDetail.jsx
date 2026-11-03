import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import OrderTracker from './OrderTracker'
import { useCart } from '../Cart/cartContext'
import { API, FINAL_STATUSES, POLL_MS, authConfig, downloadReceipt, errMsg, formatDateTime, formatPrice, getErrorMessage, infoMsg, paymentPillClass, paymentStateLabel, statusSlug } from '../Utils/helpers'

// One order: shown right after checkout (with the order number) and any time later.
// While the order is still in progress the page asks the server for a new status every few seconds.
const OrderDetail = () => {
    const { id } = useParams()
    const location = useLocation()
    const { isCustomer } = useCart()
    const justPlaced = Boolean(location.state && location.state.placed)

    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [downloading, setDownloading] = useState(false)

    useEffect(() => {
        let ignore = false
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/orders/${id}`, authConfig())
                if (!ignore) {
                    setOrder(data.order)
                    setNotFound(false)
                }
            } catch {
                // not your order, bad link, or server problem - the same friendly message for all
                if (!ignore) setNotFound(true)
            } finally {
                if (!ignore) setLoading(false)
            }
        }
        load()
        return () => { ignore = true }
    }, [id])

    // keep the status fresh until the order is Completed or Cancelled
    const status = order ? order.status : null
    useEffect(() => {
        if (!status || FINAL_STATUSES.includes(status)) return
        let ignore = false
        const timer = setInterval(async () => {
            try {
                const { data } = await axios.get(`${API}/orders/${id}`, authConfig())
                if (ignore) return
                if (data.order.status !== status) infoMsg(`Your order is now: ${data.order.status}`)
                setOrder(data.order)
            } catch {
                // a hiccup (e.g. no signal): just try again next time
            }
        }, POLL_MS)
        return () => {
            ignore = true
            clearInterval(timer)
        }
    }, [status, id])

    if (loading) return <Loader />

    const saveReceipt = async () => {
        setDownloading(true)
        try {
            await downloadReceipt(order.orderNumber, id)
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setDownloading(false)
        }
    }

    if (notFound || !order) {
        return (
            <div className="container py-5 text-center">
                <MetaData title="Order not found" />
                <h1>We couldn't find that order</h1>
                <p className="text-muted">Please check the link, or make sure you are logged in to the right account.</p>
                <Link to="/menu" className="btn btn-lumiere">Back to the menu</Link>
            </div>
        )
    }

    return (
        <>
            <MetaData title={`Order ${order.orderNumber}`} />
            <div className="container py-5" style={{ maxWidth: 820 }}>
                {justPlaced ? (
                    <div className="order-banner">
                        <h1>Thank you! Your order has been placed</h1>
                        <p className="mb-1">Your order number</p>
                        <div className="order-number" data-testid="order-number">{order.orderNumber}</div>
                        <p className="mb-0">Show this number at the counter when you pick up your order.</p>
                    </div>
                ) : (
                    <>
                        <h1>Order details</h1>
                        <div className="order-number order-number-small" data-testid="order-number">{order.orderNumber}</div>
                    </>
                )}

                <OrderTracker order={order} />

                <div className="panel-card mt-4">
                    <div className="row">
                        <div className="col-sm-6 mb-3">
                            <div className="text-muted small">Status</div>
                            <span className={`order-status ${statusSlug(order.status)}`} data-testid="order-status">{order.status}</span>
                        </div>
                        <div className="col-sm-6 mb-3">
                            <div className="text-muted small">Placed on</div>
                            <div>{formatDateTime(order.createdAt)}</div>
                        </div>
                        <div className="col-sm-6 mb-3">
                            <div className="text-muted small">Payment</div>
                            <div>
                                {order.paymentMethodLabel}{' '}
                                <span className={`status-pill ${paymentPillClass(order.paymentStatus)}`}>
                                    {order.paymentStatus === 'unpaid' ? 'Unpaid (pay at the counter)' : paymentStateLabel(order.paymentStatus)}
                                </span>
                            </div>
                        </div>
                        {order.note && (
                            <div className="col-sm-6 mb-3">
                                <div className="text-muted small">Your note</div>
                                <div>{order.note}</div>
                            </div>
                        )}
                    </div>

                    <div className="table-responsive">
                        <table className="table table-lumiere mb-0">
                            <thead>
                                <tr><th>Item</th><th className="text-center">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, i) => (
                                    <tr key={`${item.product || item.name}-${i}`}>
                                        <td>{item.name}</td>
                                        <td className="text-center">{item.quantity}</td>
                                        <td className="text-right">{formatPrice(item.price)}</td>
                                        <td className="text-right">{formatPrice(item.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="summary-row summary-total mt-3"><span>Total</span><strong data-testid="order-total">{formatPrice(order.total)}</strong></div>
                </div>

                <div className="mt-4">
                    <button type="button" className="btn btn-outline-lumiere mr-2 mb-2" onClick={saveReceipt} disabled={downloading}>
                        {downloading ? 'Preparing PDF...' : 'Download receipt (PDF)'}
                    </button>
                    {isCustomer && <Link to="/orders" className="btn btn-lumiere mr-2">My orders</Link>}
                    <Link to="/menu" className="btn btn-outline-lumiere mr-2">{isCustomer ? 'Order something else' : 'View the menu'}</Link>
                    <Link to="/" className="btn btn-outline-lumiere">Back to home</Link>
                </div>
            </div>
        </>
    )
}

export default OrderDetail