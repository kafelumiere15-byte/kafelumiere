import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Rating } from '@mui/material'
import ReviewForm from './ReviewForm'
import { API, authConfig } from '../Utils/helpers'

// A compact "rate & review" widget for one item of a Completed order, shown in My Orders.
// It shows the customer's own review if they already wrote one (with an Edit option), or
// a "Write a review" prompt otherwise. productId may be missing if the product was later deleted.
const OrderItemReview = ({ productId, productName }) => {
    const [mine, setMine] = useState(null)   // { canReview, review }
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)  // the review form is showing

    const load = useCallback(async () => {
        if (!productId) return
        try {
            const { data } = await axios.get(`${API}/products/${productId}/review/mine`, authConfig())
            setMine({ canReview: data.canReview, review: data.review })
        } catch {
            setMine(null)
        } finally {
            setLoading(false)
        }
    }, [productId])

    useEffect(() => {
        load()
    }, [load])

    if (!productId) {
        return <div className="order-item-review text-muted small">{productName} is no longer available to review.</div>
    }
    if (loading) return null
    if (!mine || !mine.canReview) return null   // the order isn't Completed yet, or something else is off

    const onSaved = () => {
        setOpen(false)
        load()
    }

    return (
        <div className="order-item-review mt-2">
            {open ? (
                <ReviewForm productId={productId} review={mine.review} onSaved={onSaved} />
            ) : mine.review ? (
                <div className="d-flex align-items-center flex-wrap" style={{ gap: 8 }}>
                    <Rating value={mine.review.rating} readOnly size="small" />
                    <span className="small text-muted">Your review: “{mine.review.comment}”</span>
                    <button type="button" className="btn btn-sm btn-outline-lumiere" onClick={() => setOpen(true)}>Edit review</button>
                </div>
            ) : (
                <button type="button" className="btn btn-sm btn-outline-lumiere" onClick={() => setOpen(true)}>
                    Rate &amp; review {productName}
                </button>
            )}
        </div>
    )
}

export default OrderItemReview