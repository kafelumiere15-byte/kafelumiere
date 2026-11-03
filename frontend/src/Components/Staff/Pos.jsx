import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import PaymentDialog from './PaymentDialog'
import {
    API, MAX_PER_ITEM, authConfig, errMsg, formatPrice, getErrorMessage, paymentPillClass, paymentStateLabel, successMsg,
} from '../Utils/helpers'

// Point of sale: the cashier enters an order for a customer standing at the counter.
const Pos = () => {
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [version, setVersion] = useState(0)           // bump to reload the menu
    const [keyword, setKeyword] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [ticket, setTicket] = useState([])            // [{ product, quantity }]
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [note, setNote] = useState('')
    const [paying, setPaying] = useState(false)
    const [saving, setSaving] = useState(false)
    const [lastOrder, setLastOrder] = useState(null)

    // the menu the cashier can pick from (shows price and whether it is sold out)
    useEffect(() => {
        const load = async () => {
            try {
                const [p, c] = await Promise.all([axios.get(`${API}/products`), axios.get(`${API}/categories`)])
                setProducts(p.data.products)
                setCategories(c.data.categories)
            } catch (error) {
                errMsg(getErrorMessage(error))
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [version])

    const totalCents = ticket.reduce((sum, l) => sum + Math.round(l.product.price * 100) * l.quantity, 0)
    const total = totalCents / 100

    const add = (product) => {
        const line = ticket.find(l => l.product._id === product._id)
        if (line && line.quantity >= MAX_PER_ITEM) return errMsg(`You can order up to ${MAX_PER_ITEM} of the same item`)
        setTicket(line
            ? ticket.map(l => (l.product._id === product._id ? { ...l, quantity: l.quantity + 1 } : l))
            : [...ticket, { product, quantity: 1 }])
    }
    const changeQty = (id, delta) => {
        setTicket(ticket
            .map(l => (l.product._id === id ? { ...l, quantity: Math.min(MAX_PER_ITEM, l.quantity + delta) } : l))
            .filter(l => l.quantity > 0))
    }
    const remove = (id) => setTicket(ticket.filter(l => l.product._id !== id))
    const clearTicket = () => {
        setTicket([])
        setCustomerName('')
        setCustomerPhone('')
        setNote('')
    }

    // send the ticket to the server (with the payment when the customer pays right away)
    const send = async (payment) => {
        const body = {
            items: ticket.map(l => ({ productId: l.product._id, quantity: l.quantity })),
            customerName, customerPhone, note,
            ...(payment ? { payment } : {}),
        }
        const { data } = await axios.post(`${API}/pos/orders`, body, authConfig())
        return data.order
    }

    // the payment dialog calls this; it returns what the dialog shows afterwards (the change)
    const charge = async (payment) => {
        try {
            const order = await send(payment)
            return { change: order.change || 0, order }
        } catch (error) {
            errMsg(getErrorMessage(error))
            if (error?.response?.status === 409) setVersion(v => v + 1)   // something sold out: refresh the menu
            return null
        }
    }

    const finishPaid = (result) => {
        setPaying(false)
        setLastOrder(result.order)
        clearTicket()
    }

    const payLater = async () => {
        setSaving(true)
        try {
            const order = await send()
            setLastOrder(order)
            clearTicket()
            successMsg(`${order.orderNumber} placed`)
        } catch (error) {
            errMsg(getErrorMessage(error))
            if (error?.response?.status === 409) setVersion(v => v + 1)
        } finally {
            setSaving(false)
        }
    }

    const shown = products.filter(p => {
        const text = keyword.trim().toLowerCase()
        const matchesText = !text || p.name.toLowerCase().includes(text)
        const matchesCategory = !categoryId || (p.category && p.category._id === categoryId)
        return matchesText && matchesCategory
    })

    return (
        <>
            <MetaData title="Walk-in order" />
            <div className="container-fluid py-4 px-lg-5">
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <h1 className="mb-0">New walk-in order</h1>
                    <Link to="/staff" className="btn btn-outline-lumiere">Back to the orders</Link>
                </div>

                {lastOrder && (
                    <div className="alert alert-success d-flex justify-content-between align-items-center flex-wrap" data-testid="last-order">
                        <div>
                            <strong>{lastOrder.orderNumber}</strong> placed · {formatPrice(lastOrder.total)} ·{' '}
                            <span className={`status-pill ${paymentPillClass(lastOrder.paymentStatus)}`}>{paymentStateLabel(lastOrder.paymentStatus)}</span>
                            {lastOrder.paymentStatus === 'paid' && lastOrder.change > 0 && <> · Change given: {formatPrice(lastOrder.change)}</>}
                        </div>
                        <div>
                            <Link to={`/staff/orders/${lastOrder._id}`} className="btn btn-sm btn-outline-success mr-2">View order</Link>
                            <button type="button" className="btn btn-sm btn-link" onClick={() => setLastOrder(null)}>Dismiss</button>
                        </div>
                    </div>
                )}

                <div className="row">
                    <div className="col-lg-7 mb-4">
                        <div className="form-row mb-3">
                            <div className="col-md-6 mb-2">
                                <input type="search" className="form-control" placeholder="Search products..." aria-label="Search products"
                                    value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                            </div>
                            <div className="col-md-6 mb-2">
                                <select className="form-control" aria-label="Filter by category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                                    <option value="">All categories</option>
                                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {loading ? <Loader /> : shown.length === 0 ? (
                            <div className="text-muted text-center py-4">No products to show.</div>
                        ) : (
                            <div className="pos-grid">
                                {shown.map(p => (
                                    <button key={p._id} type="button" className={`pos-tile ${p.isAvailable ? '' : 'off'}`}
                                        aria-label={`Add ${p.name}`} disabled={!p.isAvailable} onClick={() => add(p)}>
                                        <span className="pos-tile-name">{p.name}</span>
                                        <span className="pos-tile-price">{formatPrice(p.price)}</span>
                                        {!p.isAvailable && <span className="pos-tile-off">Sold out</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="col-lg-5">
                        <div className="panel-card pos-ticket">
                            <h5 className="mb-3">Order</h5>

                            {ticket.length === 0 ? (
                                <p className="text-muted">Tap a product to add it.</p>
                            ) : ticket.map(l => (
                                <div key={l.product._id} className="pos-line" data-testid="pos-line">
                                    <div className="pos-line-name">{l.product.name}<small className="d-block text-muted">{formatPrice(l.product.price)} each</small></div>
                                    <div className="qty-stepper">
                                        <button type="button" aria-label={`Decrease ${l.product.name}`} onClick={() => changeQty(l.product._id, -1)}>−</button>
                                        <span className="qty-value" aria-label={`Quantity of ${l.product.name}`}>{l.quantity}</span>
                                        <button type="button" aria-label={`Increase ${l.product.name}`} disabled={l.quantity >= MAX_PER_ITEM} onClick={() => changeQty(l.product._id, 1)}>+</button>
                                    </div>
                                    <div className="pos-line-total">{formatPrice(l.product.price * l.quantity)}</div>
                                    <button type="button" className="btn btn-sm btn-outline-danger" aria-label={`Remove ${l.product.name}`} onClick={() => remove(l.product._id)}>×</button>
                                </div>
                            ))}

                            <div className="summary-row summary-total mt-3"><span>Total</span><strong data-testid="pos-total">{formatPrice(total)}</strong></div>

                            <hr />
                            <div className="form-group mb-2">
                                <input className="form-control" placeholder="Customer name (optional)" aria-label="Customer name" maxLength={40}
                                    value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                            </div>
                            <div className="form-group mb-2">
                                <input className="form-control" placeholder="Phone (optional)" aria-label="Customer phone"
                                    value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <input className="form-control" placeholder="Note (optional)" aria-label="Order note" maxLength={200}
                                    value={note} onChange={(e) => setNote(e.target.value)} />
                            </div>

                            <button type="button" className="btn btn-lumiere btn-lg btn-block" disabled={ticket.length === 0 || saving} onClick={() => setPaying(true)}>
                                Charge {formatPrice(total)}
                            </button>
                            <button type="button" className="btn btn-outline-lumiere btn-block mt-2" disabled={ticket.length === 0 || saving} onClick={payLater}>
                                {saving ? 'Placing...' : 'Place order (pay later)'}
                            </button>
                            <button type="button" className="btn btn-link btn-block text-danger" disabled={ticket.length === 0 || saving} onClick={clearTicket}>Clear order</button>
                        </div>
                    </div>
                </div>
            </div>

            {paying && (
                <PaymentDialog order={{ orderNumber: 'New walk-in order', total, paymentMethod: 'cash' }}
                    confirmLabel="Charge and place order"
                    onConfirm={charge} onDone={finishPaid} onClose={() => setPaying(false)} />
            )}
        </>
    )
}

export default Pos