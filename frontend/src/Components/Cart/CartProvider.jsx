import { useEffect, useState } from 'react'
import axios from 'axios'
import { CartContext } from './cartContext'
import { API, authConfig, errMsg, getErrorMessage, successMsg } from '../Utils/helpers'

// Keeps the cart badge number for logged-in customers and offers addToCart() to every page.
const CartProvider = ({ user, children }) => {
    const [count, setCount] = useState(0)
    const isCustomer = Boolean(user) && user.role === 'customer'
    const userId = user ? user._id : null

    // when a customer logs in (or the page is refreshed) ask the server how many items are in the cart
    useEffect(() => {
        if (!isCustomer) return
        let ignore = false
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/cart`, authConfig())
                if (!ignore) setCount(data.cart.itemCount)
            } catch {
                // the badge just stays at 0
            }
        }
        load()
        return () => { ignore = true }
    }, [isCustomer, userId])

    const addToCart = async (product, quantity = 1) => {
        try {
            const { data } = await axios.post(`${API}/cart/items`, { productId: product._id, quantity }, authConfig())
            setCount(data.cart.itemCount)
            successMsg(`${product.name} added to your cart`)
            return true
        } catch (error) {
            errMsg(getErrorMessage(error))
            return false
        }
    }

    const value = { user, isCustomer, count: isCustomer ? count : 0, setCount, addToCart }
    return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartProvider