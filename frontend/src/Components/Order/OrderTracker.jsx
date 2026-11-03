import { ORDER_STEPS, formatDateTime } from '../Utils/helpers'

// what the customer is told at each status
const MESSAGES = {
    'Pending': "We've received your order. Waiting for the shop to confirm it.",
    'Confirmed': 'The shop has confirmed your order.',
    'Preparing': 'Your order is being prepared.',
    'Ready for Pickup': 'Your order is ready! Please come to the counter and show your order number.',
    'Completed': 'Thank you! Enjoy your order.',
    'Cancelled': 'This order was cancelled.',
}

// the time an order entered a status (the latest time, if it was ever there twice)
const timeOf = (order, status) => {
    const entry = [...(order.statusHistory || [])].reverse().find(h => h.status === status);
    return entry ? entry.at : null;
};

// Pending -> Confirmed -> Preparing -> Ready for Pickup -> Completed
const OrderTracker = ({ order, showMessage = true }) => {
    const cancelled = order.status === 'Cancelled'
    const completed = order.status === 'Completed'

    // how far the order got (a cancelled order stops wherever it was)
    const reached = cancelled
        ? Math.max(-1, ...(order.statusHistory || []).map(h => ORDER_STEPS.indexOf(h.status)))
        : ORDER_STEPS.indexOf(order.status)

    const stateOf = (i) => {
        if (cancelled || completed) return i <= reached ? 'done' : 'upcoming'
        if (i < reached) return 'done'
        if (i === reached) return 'current'
        return 'upcoming'
    }

    const cancelledAt = timeOf(order, 'Cancelled')

    return (
        <div className="panel-card mt-4">
            <h5 className="mb-2">Order progress</h5>
            <ol className={`tracker ${cancelled ? 'is-cancelled' : ''}`} aria-label="Order progress">
                {ORDER_STEPS.map((step, i) => {
                    const state = stateOf(i)
                    const at = timeOf(order, step)
                    return (
                        <li key={step} className={`track-step ${state}`} data-state={state}
                            aria-current={state === 'current' ? 'step' : undefined}>
                            <span className="track-dot">{state === 'done' ? '✓' : i + 1}</span>
                            <strong className="track-label">{step}</strong>
                            {at && <small className="track-time">{formatDateTime(at)}</small>}
                        </li>
                    )
                })}
                {cancelled && (
                    <li className="track-step cancelled" data-state="cancelled">
                        <span className="track-dot">✕</span>
                        <strong className="track-label">Cancelled</strong>
                        {cancelledAt && <small className="track-time">{formatDateTime(cancelledAt)}</small>}
                    </li>
                )}
            </ol>
            {showMessage && (
                <p className={`track-message ${cancelled ? 'text-danger' : ''}`} data-testid="status-message">{MESSAGES[order.status]}</p>
            )}
            {cancelled && order.cancelReason && (
                <p className="text-danger text-center mt-2 mb-0" data-testid="cancel-reason">Reason: {order.cancelReason}</p>
            )}
        </div>
    )
}

export default OrderTracker