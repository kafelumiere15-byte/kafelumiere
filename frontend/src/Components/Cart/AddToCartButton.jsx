import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCart } from './cartContext'
import { infoMsg } from '../Utils/helpers'

// "Add to cart" for a product.
//   visitor  -> sent to the login page, then back here
//   customer -> adds to the cart
//   staff / admin -> no button (they don't order from the customer menu)
const AddToCartButton = ({ product, quantity = 1, large = false, block = true }) => {
    const { user, isCustomer, addToCart } = useCart()
    const navigate = useNavigate()
    const location = useLocation()
    const [busy, setBusy] = useState(false)

    if (user && !isCustomer) return null

    const size = large ? 'btn-lg' : 'btn-sm'
    const width = block ? 'btn-block' : ''

    if (!product.isAvailable) {
        return <button type="button" className={`btn ${size} ${width} btn-secondary`} disabled>Unavailable</button>
    }

    const clickHandler = async () => {
        if (!user) {
            infoMsg('Please log in to order')
            navigate('/login', { state: { from: location.pathname + location.search } })
            return
        }
        setBusy(true)
        await addToCart(product, quantity)
        setBusy(false)
    }

    return (
        <button type="button" className={`btn ${size} ${width} btn-lumiere`} onClick={clickHandler} disabled={busy}>
            {busy ? 'Adding...' : 'Add to cart'}
        </button>
    )
}

export default AddToCartButton