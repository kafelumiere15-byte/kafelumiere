import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Rating, TextField } from '@mui/material'
import { errMsg, getErrorMessage, successMsg } from '../Utils/helpers'
import { saveProductReview } from '../../actions/productActions'

// the customer's own review: a new one, or an update when `review` already exists
const ReviewForm = ({ productId, review, onSaved }) => {
    const formik = useFormik({
        enableReinitialize: true,
        initialValues: { rating: review?.rating || 0, comment: review?.comment || '' },
        validationSchema: Yup.object({
            rating: Yup.number()
                .required('Please choose a star rating')
                .min(1, 'Please choose a star rating')
                .max(5, 'Please choose a star rating'),
            comment: Yup.string()
                .trim()
                .required('Please write a comment')
                .min(3, 'Your comment must be at least 3 characters')
                .max(500, 'Your comment cannot be longer than 500 characters'),
        }),
        onSubmit: async (values) => {
            try {
                const data = await saveProductReview(productId, { rating: values.rating, comment: values.comment.trim() })
                successMsg(data.updated ? 'Your review was updated' : 'Thanks for your review!')
                onSaved()
            } catch (error) {
                errMsg(getErrorMessage(error))
            }
        }
    })

    const ratingError = formik.submitCount > 0 && formik.errors.rating

    return (
        <form className="card card-body mb-4" onSubmit={formik.handleSubmit} noValidate>
            <h3 className="h5">{review ? 'Update your review' : 'Write a review'}</h3>

            <div>
                <Rating
                    name="rating"
                    value={formik.values.rating}
                    onChange={(e, value) => formik.setFieldValue('rating', value || 0)}
                />
            </div>
            {ratingError && <div className="text-danger small">{formik.errors.rating}</div>}

            <TextField
                fullWidth multiline minRows={3} name="comment" label="Your comment" margin="normal"
                value={formik.values.comment}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.comment && Boolean(formik.errors.comment)}
                helperText={(formik.touched.comment && formik.errors.comment) || `${formik.values.comment.length}/500`}
            />

            <div>
                <button type="submit" className="btn btn-lumiere mt-2" disabled={formik.isSubmitting}>
                    {formik.isSubmitting ? 'Saving...' : review ? 'Update my review' : 'Post review'}
                </button>
            </div>
        </form>
    )
}

export default ReviewForm
