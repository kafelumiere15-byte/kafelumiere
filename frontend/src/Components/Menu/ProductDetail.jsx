import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Rating } from '@mui/material'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import AddToCartButton from '../Cart/AddToCartButton'
import ProductReviews from '../Review/ProductReviews'
import { useCart } from '../Cart/cartContext'
import { getProductDetails } from '../../actions/productActions'
import { MAX_PER_ITEM, formatPrice, imageUrl } from '../Utils/helpers'

// Public page: one product (photos, name, price, rating, description, availability) and its reviews
const ProductDetail = () => {
    const { id } = useParams()
    const dispatch = useDispatch()
    const { user, isCustomer } = useCart()
    const { product, loading, error } = useSelector(state => state.productDetails)
    const [qty, setQty] = useState(1)
    const [active, setActive] = useState(0)   // which photo is shown big

    useEffect(() => {
        dispatch(getProductDetails(id))
        setActive(0)
    }, [id, dispatch])

    // only trust the stored product if it is the one in the address bar
    const current = product && product._id === id ? product : null

    if (!current) {
        // still loading: show the spinner; failed (deleted, hidden, bad link...): the friendly message
        if (!error) return <Loader />
        return (
            <div className="container py-5 text-center">
                <MetaData title="Item not available" />
                <h1>This item isn't available</h1>
                <p className="text-muted">It may have been removed from the menu.</p>
                <Link to="/menu" className="btn btn-lumiere">Back to the menu</Link>
            </div>
        )
    }

    const images = current.images || []
    const shown = images[active] || images[0]
    const photo = imageUrl(shown)
    const canOrder = (!user || isCustomer) && current.isAvailable

    return (
        <>
            <MetaData title={current.name} />
            <div className="container py-5">
                <Link to="/menu" className="back-link">&larr; Back to the menu</Link>

                <div className="row mt-3">
                    <div className="col-md-5 mb-4">
                        <div className={`detail-media ${current.isAvailable ? '' : 'soldout'}`}>
                            {photo ? <img src={photo} alt={current.name} /> : <div className="product-placeholder">☕</div>}
                            {!current.isAvailable && <span className="badge-soldout">Sold out</span>}
                        </div>

                        {images.length > 1 && (
                            <div className="d-flex flex-wrap mt-2">
                                {images.map((img, i) => (
                                    <button type="button" key={img.url || i} className="p-0 border-0 bg-transparent mr-2 mb-2"
                                        aria-label={`Show photo ${i + 1}`} onClick={() => setActive(i)}>
                                        <img src={imageUrl(img)} alt="" width="72" height="72"
                                            style={{ objectFit: 'cover', borderRadius: 8, opacity: i === active ? 1 : 0.6, outline: i === active ? '3px solid var(--caramel)' : 'none' }} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="col-md-7">
                        {current.category && (
                            <Link to={`/menu?category=${current.category._id}`} className="role-badge">{current.category.name}</Link>
                        )}
                        <h1 className="mt-2">{current.name}</h1>
                        <div className="product-price detail-price">{formatPrice(current.price)}</div>

                        <div className="d-flex align-items-center mt-2">
                            <Rating value={current.ratings || 0} precision={0.1} readOnly />
                            <span className="ml-2 text-muted small">
                                {current.numOfReviews > 0
                                    ? `${current.ratings.toFixed(1)} (${current.numOfReviews} ${current.numOfReviews === 1 ? 'review' : 'reviews'})`
                                    : 'No reviews yet'}
                            </span>
                        </div>

                        <p className="mt-3">{current.description || 'No description yet.'}</p>
                        <p>
                            {current.isAvailable
                                ? <span className="status-pill on">Available</span>
                                : <span className="status-pill off">Currently unavailable</span>}
                        </p>

                        {canOrder && (
                            <div className="d-flex align-items-center flex-wrap mt-4">
                                <div className="qty-stepper mr-3 mb-2">
                                    <button type="button" aria-label="Decrease quantity"
                                        disabled={qty <= 1} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                                    <span className="qty-value" aria-label="Quantity">{qty}</span>
                                    <button type="button" aria-label="Increase quantity"
                                        disabled={qty >= MAX_PER_ITEM} onClick={() => setQty(q => Math.min(MAX_PER_ITEM, q + 1))}>+</button>
                                </div>
                                <div className="mb-2">
                                    <AddToCartButton product={current} quantity={qty} large block={false} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <ProductReviews productId={current._id} />
            </div>
        </>
    )
}

export default ProductDetail
