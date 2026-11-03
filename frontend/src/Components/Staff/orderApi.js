import axios from 'axios'
import { API, authConfig } from '../Utils/helpers'

// move an order to another status (the server checks that the move is allowed)
export const changeOrderStatus = (orderId, status, reason = '') =>
    axios.put(`${API}/orders/${orderId}/status`, { status, reason }, authConfig())

// record how the customer paid (the server works out the change and checks the amount)
export const recordPayment = (orderId, payment) =>
    axios.put(`${API}/orders/${orderId}/payment`, payment, authConfig())