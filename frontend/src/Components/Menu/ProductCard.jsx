import { Link } from 'react-router-dom'
import AddToCartButton from '../Cart/AddToCartButton'
import { formatPrice, imageUrl } from '../Utils/helpers'

// one product on the menu grid
const ProductCard = ({ product }) => {
    const photo = imageUrl(product.images?.[0])
    const link = `/menu/${product._id}`

    return (
        <div className={`product-card ${product.isAvailable ? '' : 'soldout'}`}>
            <Link to={link} className="product-media">
                {photo
                    ? <img src={photo} alt={product.name} />
                    : <div className="product-placeholder">☕</div>}
                {!product.isAvailable && <span className="badge-soldout">Sold out</span>}
            </Link>
            <div className="product-body">
                <Link to={link} className="product-name">{product.name}</Link>
                <p className="product-desc">{product.description}</p>
                <div className="d-flex justify-content-between align-items-center">
                    <span className="product-price">{formatPrice(product.price)}</span>
                    {product.isAvailable && <span className="status-pill on">Available</span>}
                </div>
                <div className="small text-muted mt-1">
                    {product.numOfReviews > 0 ? `★ ${product.ratings.toFixed(1)} (${product.numOfReviews} ${product.numOfReviews === 1 ? 'review' : 'reviews'})` : 'No reviews yet'}
                </div>
                <div className="mt-3">
                    <AddToCartButton product={product} />
                </div>
            </div>
        </div>
    )
}

export default ProductCard
