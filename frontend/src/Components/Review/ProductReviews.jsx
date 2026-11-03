import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Rating } from '@mui/material'
import { getProductReviews } from '../../actions/productActions'
import { useCart } from '../Cart/cartContext'
import { formatDate } from '../Utils/helpers'

// the reviews section under a product: a read-only list that everyone sees.
// Writing or updating your own review happens from My Orders (after that order is Completed), not here.
const ProductReviews = ({ productId }) => {
    const dispatch = useDispatch()
    const location = useLocation()
    const { user, isCustomer } = useCart()
    const { reviews, ratings, numOfReviews, loading, error } = useSelector(state => state.reviews)

    useEffect(() => {
        dispatch(getProductReviews(productId))
    }, [productId, dispatch])

    return (
        <section className="mt-5">
            <h2>Reviews</h2>
            <div className="d-flex align-items-center flex-wrap mb-4">
                <Rating value={ratings} precision={0.1} readOnly />
                <span className="ml-2">
                    {Number(ratings).toFixed(1)} · {numOfReviews} {numOfReviews === 1 ? 'review' : 'reviews'}
                </span>
            </div>

            {isCustomer && (
                <p className="text-muted">
                    Bought this item? Go to <Link to="/orders">My Orders</Link> once your order is marked Completed to write or update your review.
                </p>
            )}

            {!user && (
                <p>
                    <Link to="/login" state={{ from: location.pathname }}>Login</Link> and order this item to review it.
                </p>
            )}

            {loading ? (
                <p className="text-muted">Loading reviews...</p>
            ) : error ? (
                <p className="text-muted">We couldn't load the reviews right now.</p>
            ) : reviews.length === 0 ? (
                <p className="text-muted">No reviews yet.</p>
            ) : (
                reviews.map(r => (
                    <div key={r._id} className="border-bottom py-3">
                        <div className="d-flex justify-content-between flex-wrap">
                            <strong>{r.name}</strong>
                            <span className="text-muted small">{formatDate(r.createdAt)}</span>
                        </div>
                        <Rating value={r.rating} readOnly size="small" />
                        <p className="mb-0 mt-1">{r.comment}</p>
                    </div>
                ))
            )}
        </section>
    )
}

export default ProductReviews