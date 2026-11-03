import { useState } from 'react'
import { formatPrice } from '../Utils/helpers'

// Asks the staff member WHY an order is being rejected / cancelled. The customer can read the reason.
const CancelOrderDialog = ({ order, busy, onClose, onConfirm }) => {
    const [reason, setReason] = useState('')
    const tooShort = reason.trim().length < 3

    return (
        <div className="dialog-backdrop" role="presentation">
            <div className="dialog-box" role="dialog" aria-modal="true" aria-label={`Cancel order ${order.orderNumber}`}>
                <h5>Cancel order {order.orderNumber}?</h5>
                <p className="text-muted small">The customer will be able to read this reason on their order page.</p>
                {order.paymentStatus === 'paid' && (
                    <div className="alert alert-warning small" data-testid="refund-warning">
                        This order is already paid. After cancelling, please give <strong>{formatPrice(order.total)}</strong> back to the customer.
                    </div>
                )}

                <label htmlFor="cancel_reason">Reason for cancelling</label>
                <textarea id="cancel_reason" className="form-control" rows="3" maxLength={200} autoFocus
                    placeholder="e.g. Sorry, we ran out of taro today"
                    value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="small text-muted text-right mt-1">{reason.length}/200</div>

                <div className="d-flex justify-content-end mt-3">
                    <button type="button" className="btn btn-outline-secondary mr-2" disabled={busy} onClick={onClose}>Keep order</button>
                    <button type="button" className="btn btn-danger" disabled={busy || tooShort} onClick={() => onConfirm(reason.trim())}>
                        {busy ? 'Cancelling...' : 'Yes, cancel this order'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CancelOrderDialog