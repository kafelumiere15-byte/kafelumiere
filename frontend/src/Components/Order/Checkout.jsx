import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import { useCart } from '../Cart/cartContext'
import { API, authConfig, errMsg, formatPrice, getErrorMessage } from '../Utils/helpers'

const MAX_NOTE = 200

// Customer only. Step 1: review the order. Step 2: choose how you will pay. Step 3: place it.
// The server checks prices and availability again and makes the order.
const Checkout = () => {
    const { setCount } = useCart()
    const navigate = useNavigate()
    const [cart, setCart] = useState(null)
    const [methods, setMethods] = useState([])
    const [method, setMethod] = useState('')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(true)
    const [placing, setPlacing] = useState(false)
    const [version, setVersion] = useState(0)   // bump to look at the cart again

    useEffect(() => {
        const load = async () => {
            try {
                const [c, m] = await Promise.all([
                    axios.get(`${API}/cart`, authConfig()),
                    axios.get(`${API}/payment-methods`),
                ])
                setCart(c.data.cart)
                setCount(c.data.cart.itemCount)
                setMethods(m.data.paymentMethods)
                setMethod(current => current || (m.data.paymentMethods[0] ? m.data.paymentMethods[0].id : ''))
            } catch (error) {
                errMsg(getErrorMessage(error))
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [version, setCount])

    const placeOrder = async (e) => {
        e.preventDefault()
        if (!method) return errMsg('Please choose a payment method')

        setPlacing(true)   // the button stays disabled, so a double click cannot send two orders
        try {
            const { data } = await axios.post(`${API}/orders`, { paymentMethod: method, note }, authConfig())
            setCount(0)
            navigate(`/orders/${data.order._id}`, { replace: true, state: { placed: true } })
        } catch (error) {
            errMsg(getErrorMessage(error))
            setVersion(v => v + 1)   // show the cart as it is now (something may have sold out)
            setPlacing(false)
        }
    }

    if (loading) return <Loader />

    if (!cart || cart.items.length === 0) {
        return (
            <div className="container py-5 text-center">
                <MetaData title="Checkout" />
                <div className="empty-cart-icon">🛒</div>
                <h1>Your cart is empty</h1>
                <p className="text-muted">Add something from the menu before checking out.</p>
                <Link to="/menu" className="btn btn-lumiere">Browse the menu</Link>
            </div>
        )
    }

    return (
        <>
            <MetaData title="Checkout" />
            <form className="container py-5" onSubmit={placeOrder}>
                <h1>Checkout</h1>
                <p className="text-muted">Please check your order, choose how you will pay, then place it.</p>

                <div className="row">
                    <div className="col-lg-7 mb-4">
                        <div className="panel-card mb-4">
                            <h5 className="mb-3">Payment method</h5>
                            {methods.map(m => (
                                <label key={m.id} className={`pay-option ${method === m.id ? 'selected' : ''}`}>
                                    <input type="radio" name="paymentMethod" value={m.id}
                                        checked={method === m.id} onChange={() => setMethod(m.id)} />
                                    <span>
                                        <strong>{m.label}</strong>
                                        <small>{m.description}</small>
                                    </span>
                                </label>
                            ))}
                        </div>

                        <div className="panel-card">
                            <h5 className="mb-3">Note for the shop <small className="text-muted">(optional)</small></h5>
                            <textarea className="form-control" rows="3" maxLength={MAX_NOTE} aria-label="Note for the shop"
                                placeholder="e.g. less ice, no sugar"
                                value={note} onChange={(e) => setNote(e.target.value)} />
                            <div className="small text-muted text-right mt-1">{note.length}/{MAX_NOTE}</div>
                        </div>
                    </div>

                    <div className="col-lg-5">
                        <div className="panel-card summary-card">
                            <h5 className="mb-3">Your order</h5>

                            {cart.hasUnavailable && (
                                <div className="alert alert-warning">
                                    Some items are no longer available. <Link to="/cart">Go back to your cart</Link> and remove them.
                                </div>
                            )}

                            {cart.items.map(line => (
                                <div key={line.product._id} className="summary-row review-line">
                                    <span>
                                        {line.quantity} × {line.product.name}
                                        {!line.orderable && <span className="cart-issue d-block">{line.issue}</span>}
                                    </span>
                                    <span>{formatPrice(line.lineTotal)}</span>
                                </div>
                            ))}

                            <hr />
                            <div className="summary-row summary-total"><span>Total</span><strong data-testid="total">{formatPrice(cart.total)}</strong></div>

                            <button type="submit" className="btn btn-lumiere btn-block btn-lg mt-3" disabled={placing || cart.hasUnavailable}>
                                {placing ? 'Placing your order...' : 'Place order'}
                            </button>
                            <p className="small text-muted mt-2 mb-0">You pay at the counter when you pick up your order.</p>
                            <Link to="/cart" className="btn btn-link btn-block">Back to cart</Link>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

export default Checkout