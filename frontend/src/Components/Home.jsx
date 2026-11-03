import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { Box, Card, CardActionArea, CardContent, CardMedia, Pagination, ToggleButton, ToggleButtonGroup } from '@mui/material'
import MetaData from './Layout/MetaData'
import Loader from './Layout/Loader'
import { getProducts } from '../actions/productActions'
import { API, formatPrice, homePathForRole, imageUrl } from './Utils/helpers'

const PER_PAGE = 6

// one product in the home page list
const HomeProductCard = ({ product }) => {
    const photo = imageUrl(product.images?.[0])

    return (
        <Card variant="outlined" sx={{ height: '100%' }}>
            <CardActionArea component={Link} to={`/menu/${product._id}`} sx={{ height: '100%', alignItems: 'stretch' }}>
                {photo ? (
                    <CardMedia component="img" height="160" image={photo} alt={product.name} />
                ) : (
                    <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f3e6d8', fontSize: '3rem' }}>☕</Box>
                )}
                <CardContent>
                    <div className="text-muted small">{product.category?.name}</div>
                    <strong>{product.name}</strong>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="product-price">{formatPrice(product.price)}</span>
                        <span className="small text-muted">
                            {product.numOfReviews > 0 ? `★ ${product.ratings.toFixed(1)} (${product.numOfReviews})` : 'No reviews yet'}
                        </span>
                    </div>
                </CardContent>
            </CardActionArea>
        </Card>
    )
}

const Home = ({ user }) => {
    const [categories, setCategories] = useState([])
    const [mode, setMode] = useState('pages')   // 'pages' or 'scroll'
    const [page, setPage] = useState(1)         // the page shown in pagination mode
    const sentinel = useRef(null)

    const dispatch = useDispatch()
    const { products, page: loadedPage, pages, loading, error } = useSelector(state => state.products)

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/categories`)
                setCategories(data.categories)
            } catch {
                // the home page still works without the category cards
            }
        }
        load()
    }, [])

    // pagination mode: load the page the person picked
    useEffect(() => {
        if (mode === 'pages') dispatch(getProducts({ limit: PER_PAGE, page }))
    }, [mode, page, dispatch])

    // infinite scroll mode: start again from the first page
    useEffect(() => {
        if (mode === 'scroll') dispatch(getProducts({ limit: PER_PAGE, page: 1 }))
    }, [mode, dispatch])

    // infinite scroll mode: when the sentinel at the bottom is visible, add the next page
    useEffect(() => {
        if (mode !== 'scroll' || !sentinel.current || typeof IntersectionObserver === 'undefined') return
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && !loading && loadedPage < pages) {
                dispatch(getProducts({ limit: PER_PAGE, page: loadedPage + 1 }, true))
            }
        }, { rootMargin: '200px' })
        observer.observe(sentinel.current)
        return () => observer.disconnect()
    }, [mode, loading, loadedPage, pages, dispatch])

    const chooseMode = (e, value) => {
        if (!value) return
        setMode(value)
    }

    const scrollEnd = loadedPage >= pages

    return (
        <>
            <MetaData title="Home" />
            <section className="hero">
                <h1>Kafé <span>Lumière</span></h1>
                <p>Freshly brewed coffee and handcrafted milk tea, ordered the easy way.</p>

                {user ? (
                    <>
                        <p className="mb-3">Welcome back, <strong>{user.name}</strong>! <span className={`role-badge ${user.role}`}>{user.role}</span></p>
                        <Link to="/menu" className="btn btn-lumiere btn-lg mr-2">View the menu</Link>
                        {user.role !== 'customer' && (
                            <Link to={homePathForRole(user.role)} className="btn btn-outline-lumiere btn-lg mr-2">Go to my panel</Link>
                        )}
                        <Link to="/me" className="btn btn-outline-lumiere btn-lg">My profile</Link>
                    </>
                ) : (
                    <>
                        <Link to="/menu" className="btn btn-lumiere btn-lg mr-2">View the menu</Link>
                        <Link to="/register" className="btn btn-outline-lumiere btn-lg mr-2">Create an account</Link>
                        <Link to="/login" className="btn btn-outline-lumiere btn-lg">Login</Link>
                    </>
                )}
            </section>

            <div className="container py-5 text-center">
                <h2>Explore our menu</h2>
                {categories.length === 0 ? (
                    <p className="text-muted">Our menu is being prepared. Please check back soon!</p>
                ) : (
                    <div className="home-cats">
                        {categories.map(c => (
                            <Link key={c._id} to={`/menu?category=${c._id}`} className="home-cat">
                                <strong>{c.name}</strong>
                                {c.description && <span>{c.description}</span>}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="container pb-5">
                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
                    <h2 className="mb-2">Our products</h2>
                    <ToggleButtonGroup size="small" exclusive value={mode} onChange={chooseMode} aria-label="How to browse products">
                        <ToggleButton value="pages">Pages</ToggleButton>
                        <ToggleButton value="scroll">Infinite scroll</ToggleButton>
                    </ToggleButtonGroup>
                </div>

                {loading && products.length === 0 ? (
                    <Loader />
                ) : error ? (
                    <p className="text-center text-muted">We couldn't load the products. Please try again later.</p>
                ) : products.length === 0 ? (
                    <p className="text-center text-muted">No products to show yet.</p>
                ) : (
                    <div className="row">
                        {products.map(p => (
                            <div key={p._id} className="col-sm-6 col-lg-4 mb-4">
                                <HomeProductCard product={p} />
                            </div>
                        ))}
                    </div>
                )}

                {mode === 'pages' && pages > 1 && (
                    <div className="d-flex justify-content-center mt-2">
                        <Pagination count={pages} page={page} onChange={(e, value) => setPage(value)} color="primary" />
                    </div>
                )}

                {mode === 'scroll' && (
                    <div ref={sentinel} className="text-center text-muted py-3">
                        {loading && products.length > 0 ? 'Loading more...' : scrollEnd && products.length > 0 ? "You've reached the end of the menu" : ''}
                    </div>
                )}
            </div>
        </>
    )
}

export default Home