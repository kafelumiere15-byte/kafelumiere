import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import { useCart } from './cartContext'
import { API, authConfig, errMsg, formatPrice, getErrorMessage, imageUrl, infoMsg, successMsg } from '../Utils/helpers'

// Customer only. The server does all the math (current prices, subtotal, total).
const Cart = () => {
    const { setCount } = useCart()
    const [cart, setCart] = useState(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/cart`, authConfig())
                setCart(data.cart)
                setCount(data.cart.itemCount)
                if (data.removedCount > 0) {
                    infoMsg(`${data.removedCount} item(s) are no longer sold and were removed from your cart`)
                }
            } catch (error) {
                errMsg(getErrorMessage(error))
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [setCount])

    // run one cart request, then show whatever the server says the cart looks like now
    const run = async (request) => {
        setBusy(true)
        try {
            const { data } = await request()
            setCart(data.cart)
            setCount(data.cart.itemCount)
            return true
        } catch (error) {
            errMsg(getErrorMessage(error))
            return false
        } finally {
            setBusy(false)
        }
    }

    const changeQty = (line, quantity) =>
        run(() => axios.put(`${API}/cart/items/${line.product._id}`, { quantity }, authConfig()))

    const remove = async (line) => {
        if (await run(() => axios.delete(`${API}/cart/items/${line.product._id}`, authConfig()))) {
            successMsg(`${line.product.name} removed`)
        }
    }

    const clear = async () => {
        if (!window.confirm('Remove everything from your cart?')) return
        await run(() => axios.delete(`${API}/cart`, authConfig()))
    }

    if (loading) return <Loader />

    return (
        <>
            <MetaData title="My Cart" />
            <div className="container py-5">
                <h1>Your Cart</h1>

                {!cart || cart.items.length === 0 ? (
                    <div className="text-center py-5">
                        <div className="empty-cart-icon">🛒</div>
                        <h4>Your cart is empty</h4>
                        <p className="text-muted">Add a drink or a treat from the menu to get started.</p>
                        <Link to="/menu" className="btn btn-lumiere">Browse the menu</Link>
                    </div>
                ) : (
                    <div className="row">
                        <div className="col-lg-8 mb-4">
                            {cart.hasUnavailable && (
                                <div className="alert alert-warning">
                                    Some items are no longer available. They are not counted in your total. Please remove them.
                                </div>
                            )}

                            {cart.items.map(line => (
                                <div key={line.product._id} className={`cart-line ${line.orderable ? '' : 'cart-line-off'}`}>
                                    <Link to={`/menu/${line.product._id}`} className="cart-thumb">
                                        {imageUrl(line.product.image)
                                            ? <img src={imageUrl(line.product.image)} alt="" />
                                            : <span>☕</span>}
                                    </Link>

                                    <div className="cart-info">
                                        <Link to={`/menu/${line.product._id}`} className="product-name">{line.product.name}</Link>
                                        <div className="text-muted small">{line.product.category ? line.product.category.name : ''}</div>
                                        <div className="small">{formatPrice(line.unitPrice)} each</div>
                                        {!line.orderable && <div className="cart-issue">{line.issue}</div>}
                                    </div>

                                    <div className="qty-stepper">
                                        <button type="button" aria-label={`Decrease quantity of ${line.product.name}`}
                                            disabled={busy || !line.orderable || line.quantity <= 1}
                                            onClick={() => changeQty(line, line.quantity - 1)}>−</button>
                                        <span className="qty-value" aria-label={`Quantity of ${line.product.name}`}>{line.quantity}</span>
                                        <button type="button" aria-label={`Increase quantity of ${line.product.name}`}
                                            disabled={busy || !line.orderable || line.quantity >= cart.maxPerItem}
                                            onClick={() => changeQty(line, line.quantity + 1)}>+</button>
                                    </div>

                                    <div className="cart-line-total">{formatPrice(line.lineTotal)}</div>

                                    <button type="button" className="btn btn-sm btn-outline-danger"
                                        aria-label={`Remove ${line.product.name}`} disabled={busy}
                                        onClick={() => remove(line)}>Remove</button>
                                </div>
                            ))}

                            <button type="button" className="btn btn-link text-danger px-0" disabled={busy} onClick={clear}>Clear cart</button>
                        </div>

                        <div className="col-lg-4">
                            <div className="panel-card summary-card">
                                <h5 className="mb-3">Order summary</h5>
                                <div className="summary-row"><span>Items</span><span data-testid="items-count">{cart.itemCount}</span></div>
                                <div className="summary-row"><span>Subtotal</span><span data-testid="subtotal">{formatPrice(cart.subtotal)}</span></div>
                                <hr />
                                <div className="summary-row summary-total"><span>Total</span><strong data-testid="total">{formatPrice(cart.total)}</strong></div>

                                {cart.hasUnavailable ? (
                                    <>
                                        <button type="button" className="btn btn-lumiere btn-block mt-3" disabled>Proceed to checkout</button>
                                        <div className="small text-danger mt-2">Remove the unavailable items to continue.</div>
                                    </>
                                ) : (
                                    <Link to="/checkout" className="btn btn-lumiere btn-block mt-3">Proceed to checkout</Link>
                                )}
                                <Link to="/menu" className="btn btn-outline-lumiere btn-block mt-2">Continue shopping</Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default Cart