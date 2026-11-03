import { createContext, useContext } from 'react'

// Shared by the menu, the product page, the header and the cart page:
//   user, isCustomer - who is logged in
//   count            - number shown on the header cart badge
//   setCount         - the cart page updates the badge after every change
//   addToCart        - adds a product (shows a message, returns true/false)
export const CartContext = createContext({
    user: null,
    isCustomer: false,
    count: 0,
    setCount: () => {},
    addToCart: async () => false,
})

export const useCart = () => useContext(CartContext)