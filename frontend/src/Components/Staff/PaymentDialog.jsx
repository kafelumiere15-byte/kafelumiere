import { useState } from 'react'
import { CASH_QUICK, formatPrice } from '../Utils/helpers'

// Cash only - GCash and Maya were removed.
const FALLBACK_METHODS = [
    { id: 'cash', label: 'Cash' },
]

// The cashier takes the customer's payment.
//   order        - { orderNumber, total, paymentMethod }
//   onConfirm    - async (payment) => result | null   (the parent calls the server; null = it failed)
//   onDone       - called when the cashier presses "Done" after seeing the change
//   completeAfter / confirmLabel - only change the wording of the button
const PaymentDialog = ({ order, completeAfter = false, confirmLabel, onConfirm, onDone, onClose }) => {
    // the shop takes cash only now
    const method = FALLBACK_METHODS[0].id
    const [received, setReceived] = useState('')
    const [reference, setReference] = useState('')
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState(null)

    const isCash = method === 'cash'
    const totalCents = Math.round(order.total * 100)
    const receivedNumber = Number(received)
    const receivedCents = received.trim() !== '' && Number.isFinite(receivedNumber) ? Math.round(receivedNumber * 100) : null
    const enough = receivedCents !== null && receivedCents >= totalCents
    const canSubmit = !busy && (!isCash || enough)

    const submit = async () => {
        setBusy(true)
        const payment = isCash
            ? { paymentMethod: method, amountTendered: receivedNumber }
            : { paymentMethod: method, reference }
        const outcome = await onConfirm(payment)
        setBusy(false)
        if (outcome) setResult(outcome)
    }

    if (result) {
        return (
            <div className="dialog-backdrop" role="presentation">
                <div className="dialog-box text-center" role="dialog" aria-modal="true" aria-label={`Payment recorded for ${order.orderNumber}`}>
                    <h5>Payment recorded ✓</h5>
                    <p className="text-muted small">{order.orderNumber}</p>
                    <div className="text-muted">Change to give</div>
                    <div className="change-due" data-testid="change-due">{formatPrice(result.change)}</div>
                    {result.completed && <p className="small text-muted">The order was marked as completed.</p>}
                    <button type="button" className="btn btn-lumiere btn-block mt-3" onClick={() => onDone(result)}>Done</button>
                </div>
            </div>
        )
    }

    const quick = CASH_QUICK.filter(v => v * 100 >= totalCents).slice(0, 4)
    const submitText = busy ? 'Saving...' : confirmLabel || (completeAfter ? 'Record payment & complete' : 'Record payment')

    return (
        <div className="dialog-backdrop" role="presentation">
            <div className="dialog-box" role="dialog" aria-modal="true" aria-label={`Payment for ${order.orderNumber}`}>
                <h5>Take payment</h5>
                <p className="text-muted small mb-2">{order.orderNumber}</p>
                <div className="summary-row summary-total mb-3"><span>Total to pay</span><strong data-testid="amount-due">{formatPrice(order.total)}</strong></div>

                <div className="pay-method-badge mb-3">
                    <span className="status-pill on">💵 Cash</span>
                </div>

                <div className="form-group">
                    <label htmlFor="pay_received">Amount received</label>
                    <input id="pay_received" type="number" min="0" step="0.01" className="form-control" autoFocus
                        value={received} onChange={(e) => setReceived(e.target.value)} />
                    <div className="quick-cash mt-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setReceived(String(order.total))}>Exact</button>
                        {quick.map(v => (
                            <button key={v} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setReceived(String(v))}>₱{v}</button>
                        ))}
                    </div>
                    <div className="mt-2" data-testid="change-preview" aria-live="polite">
                        {receivedCents === null ? <span className="text-muted">Enter the amount the customer handed over.</span>
                            : enough ? <strong className="text-success">Change: {formatPrice((receivedCents - totalCents) / 100)}</strong>
                                : <strong className="text-danger">Short by {formatPrice((totalCents - receivedCents) / 100)}</strong>}
                    </div>
                </div>

                <div className="d-flex justify-content-end mt-3">
                    <button type="button" className="btn btn-outline-secondary mr-2" disabled={busy} onClick={onClose}>Cancel</button>
                    <button type="button" className="btn btn-lumiere" disabled={!canSubmit} onClick={submit}>{submitText}</button>
                </div>
            </div>
        </div>
    )
}

export default PaymentDialog