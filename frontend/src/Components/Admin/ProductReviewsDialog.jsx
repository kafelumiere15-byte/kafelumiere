import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Typography } from '@mui/material'
import { deleteProductReview, getAdminProducts, getProductReviews } from '../../actions/productActions'
import { errMsg, formatDate, getErrorMessage, successMsg } from '../Utils/helpers'

// 4 -> "★★★★☆"
const stars = (n) => {
    const count = Math.max(0, Math.min(5, Math.round(Number(n) || 0)))
    return '★'.repeat(count) + '☆'.repeat(5 - count)
}

// Admin: read every review of one product and delete any of them
const ProductReviewsDialog = ({ open, productId, productName, onClose }) => {
    const dispatch = useDispatch()
    const { reviews, ratings, numOfReviews, loading } = useSelector(state => state.reviews)
    const [deletingId, setDeletingId] = useState(null)

    useEffect(() => {
        if (open && productId) dispatch(getProductReviews(productId))
    }, [open, productId, dispatch])

    const removeReview = async (review) => {
        if (!window.confirm(`Delete the review by ${review.name}? This cannot be undone.`)) return
        setDeletingId(review._id)
        try {
            await dispatch(deleteProductReview(productId, review._id))
            successMsg('Review deleted')
            dispatch(getAdminProducts())   // the rating and review count in the table change too
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Reviews{productName ? `: ${productName}` : ''}</DialogTitle>
            <DialogContent dividers>
                {loading ? (
                    <Typography color="text.secondary">Loading reviews...</Typography>
                ) : (
                    <>
                        <Typography variant="body2" color="text.secondary" className="mb-3">
                            {numOfReviews
                                ? `Average ${Number(ratings).toFixed(1)} from ${numOfReviews} review${numOfReviews === 1 ? '' : 's'}`
                                : 'No ratings yet'}
                        </Typography>

                        {reviews.length === 0 && <Typography>No reviews yet.</Typography>}

                        {reviews.map((review, index) => (
                            <div key={review._id}>
                                {index > 0 && <Divider className="my-3" />}
                                <div className="d-flex justify-content-between align-items-start flex-wrap">
                                    <div className="pr-3">
                                        <div>
                                            <span className="text-warning" aria-label={`${review.rating} out of 5 stars`}>{stars(review.rating)}</span>
                                            {' '}<strong>{review.name}</strong>
                                            {' '}<small className="text-muted">{formatDate(review.createdAt)}</small>
                                        </div>
                                        {review.comment && <p className="mb-0 mt-1">{review.comment}</p>}
                                    </div>
                                    <Button size="small" color="error" disabled={deletingId === review._id}
                                        onClick={() => removeReview(review)}>
                                        {deletingId === review._id ? 'Deleting...' : 'Delete'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}

export default ProductReviewsDialog
