import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import OrderTracker from '../Order/OrderTracker'
import CancelOrderDialog from './CancelOrderDialog'
import PaymentDialog from './PaymentDialog'
import { changeOrderStatus, recordPayment } from './orderApi'
import {
    API, NEXT_ACTION, authConfig, errMsg, formatDateTime, formatPrice, getErrorMessage, paymentPillClass,
    paymentStateLabel, statusSlug, successMsg,
} from '../Utils/helpers'

// Staff / admin: everything about one order, with the buttons to move it along
const StaffOrderDetail = () => {
    const { id } = useParams()
    const location = useLocation()
    const backTo = (location.state && location.state.from) || '/staff'   // e.g. /admin/orders
    const backText = { '/staff': 'Back to the orders', '/admin/orders': 'Back to all orders', '/admin/reports': 'Back to sales reports' }[backTo] || 'Back'
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [notFound, setNotFound] = useState(false)
    const [busy, setBusy] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [paying, setPaying] = useState(false)
    const [version, setVersion] = useState(0)

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
                if (!ignore) setNotFound(true)
            } finally {
                if (!ignore) setLoading(false)
            }
        }
        load()
        return () => { ignore = true }
    }, [id, version])

    const advance = async () => {
        setBusy(true)
        try {
            await changeOrderStatus(order._id, order.nextStatus)
            successMsg(`${order.orderNumber} is now ${order.nextStatus}`)
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setBusy(false)
            setVersion(v => v + 1)
        }
    }

    const confirmCancel = async (reason) => {
        setBusy(true)
        try {
            await changeOrderStatus(order._id, 'Cancelled', reason)
            successMsg(`${order.orderNumber} was cancelled`)
            setCancelling(false)
            setVersion(v => v + 1)
        } catch (error) {
            errMsg(getErrorMessage(error))
            if (error?.response?.status === 409) {
                setCancelling(false)
                setVersion(v => v + 1)
            }
        } finally {
            setBusy(false)
        }
    }

    // the payment dialog calls this; what it returns is shown to the cashier (the change)
    const takePayment = async (payment) => {
        const completeAfter = order.nextStatus === 'Completed'
        try {
            const { data } = await recordPayment(order._id, payment)
            let completed = false
            if (completeAfter) {
                try {
                    await changeOrderStatus(order._id, 'Completed')
                    completed = true
                } catch (error) {
                    errMsg(getErrorMessage(error))
                }
            }
            return { change: data.order.change || 0, completed }
        } catch (error) {
            errMsg(getErrorMessage(error))
            return null
        }
    }

    if (loading) return <Loader />

    if (notFound || !order) {
        return (
            <div className="container py-5 text-center">
                <MetaData title="Order not found" />
                <h1>We couldn't find that order</h1>
                <Link to={backTo} className="btn btn-lumiere">{backText}</Link>
            </div>
        )
    }

    return (
        <>
            <MetaData title={`Order ${order.orderNumber}`} />
            <div className="container py-5" style={{ maxWidth: 900 }}>
                <Link to={backTo} className="back-link">&larr; {backText}</Link>

                <div className="d-flex justify-content-between align-items-center flex-wrap mt-3">
                    <h1 className="mb-0">Order details</h1>
                    <span className={`order-status ${statusSlug(order.status)}`} data-testid="order-status">{order.status}</span>
                </div>
                <div className="order-number order-number-small mt-2" data-testid="order-number">{order.orderNumber}</div>

                {(order.nextStatus || (order.paymentStatus === 'unpaid' && order.status !== 'Cancelled')) && (
                    <div className="mt-3">
                        {order.paymentStatus === 'unpaid' && order.status !== 'Cancelled' && order.nextStatus !== 'Completed' && (
                            <button type="button" className="btn btn-outline-success mr-2" disabled={busy} onClick={() => setPaying(true)}>Take payment</button>
                        )}
                        {order.nextStatus && (
                            <>
                                {order.nextStatus === 'Completed' && order.paymentStatus !== 'paid' ? (
                                    <button type="button" className="btn btn-lumiere mr-2" disabled={busy} onClick={() => setPaying(true)}>Take payment &amp; complete</button>
                                ) : (
                                    <button type="button" className="btn btn-lumiere mr-2" disabled={busy} onClick={advance}>{NEXT_ACTION[order.status]}</button>
                                )}
                                <button type="button" className="btn btn-outline-danger" disabled={busy} onClick={() => setCancelling(true)}>
                                    {order.status === 'Pending' ? 'Reject order' : 'Cancel order'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                <OrderTracker order={order} showMessage={false} />

                <div className="row">
                    <div className="col-md-6 mb-4">
                        <div className="panel-card">
                            <h5 className="mb-3">Customer</h5>
                            <div data-testid="customer-name"><strong>{order.customer && order.customer.name}</strong></div>
                            <div className="small">{order.customer && order.customer.email}</div>
                            <div className="small">{(order.customer && order.customer.phone) || 'No phone number'}</div>
                            <div className="small text-muted mt-2">Placed {formatDateTime(order.createdAt)} · {order.source === 'walk-in' ? 'Walk-in' : 'Online order'}</div>
                        </div>
                    </div>
                    <div className="col-md-6 mb-4">
                        <div className="panel-card">
                            <h5 className="mb-3">Payment</h5>
                            <div>{order.paymentMethodLabel}</div>
                            <span className={`status-pill ${paymentPillClass(order.paymentStatus)}`} data-testid="payment-status">{paymentStateLabel(order.paymentStatus)}</span>
                            {(order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') && order.paidAt && (
                                <div className="mt-2 small" data-testid="payment-details">
                                    <div>Received {formatPrice(order.amountTendered)} · Change {formatPrice(order.change)}</div>
                                    {order.paymentReference && <div>Reference: {order.paymentReference}</div>}
                                    <div className="text-muted">Paid {formatDateTime(order.paidAt)}</div>
                                </div>
                            )}
                            {order.paymentStatus === 'refunded' && (
                                <div className="mt-2 small text-danger"><strong>Refund {formatPrice(order.total)} to the customer.</strong></div>
                            )}
                            {order.note && <div className="mt-3 small"><strong>Customer note:</strong> {order.note}</div>}
                            {order.status === 'Cancelled' && order.cancelReason && <div className="mt-3 small text-danger"><strong>Cancel reason:</strong> {order.cancelReason}</div>}
                        </div>
                    </div>
                </div>

                <div className="panel-card mb-4">
                    <h5 className="mb-3">Items</h5>
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

                <div className="panel-card">
                    <h5 className="mb-3">History</h5>
                    <ul className="history-list" aria-label="Order history">
                        {order.statusHistory.map((h, i) => (
                            <li key={i}><span>{h.status}</span><span className="text-muted">{formatDateTime(h.at)}</span></li>
                        ))}
                    </ul>
                </div>
            </div>

            {paying && (
                <PaymentDialog order={order} completeAfter={order.nextStatus === 'Completed'}
                    onConfirm={takePayment}
                    onDone={() => { setPaying(false); setVersion(v => v + 1) }}
                    onClose={() => setPaying(false)} />
            )}
            {cancelling && <CancelOrderDialog order={order} busy={busy} onClose={() => setCancelling(false)} onConfirm={confirmCancel} />}
        </>
    )
}

export default StaffOrderDetail