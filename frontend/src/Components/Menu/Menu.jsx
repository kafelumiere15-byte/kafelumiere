import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useDispatch, useSelector } from 'react-redux'
import { MenuItem, TextField } from '@mui/material'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import ProductCard from './ProductCard'
import { getProducts } from '../../actions/productActions'
import { API, errMsg, getErrorMessage } from '../Utils/helpers'

const RATING_OPTIONS = [
    { value: '', label: 'Any rating' },
    { value: '1', label: '1+ stars' },
    { value: '2', label: '2+ stars' },
    { value: '3', label: '3+ stars' },
    { value: '4', label: '4+ stars' },
]

const REVIEW_OPTIONS = [
    { value: '', label: 'Any number of reviews' },
    { value: '1', label: '1+ reviews' },
    { value: '3', label: '3+ reviews' },
    { value: '5', label: '5+ reviews' },
]

// set a URL parameter, or remove it when the value is empty
const putParam = (params, key, value) => {
    if (value) params.set(key, value)
    else params.delete(key)
}

// Public page: anyone can browse the menu (no login needed).
// Every filter lives in the URL (?q=latte&category=<id>&minPrice=50&minRating=4 ...) so links can be shared.
const Menu = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const category = searchParams.get('category') || ''
    const q = searchParams.get('q') || ''
    const minPrice = searchParams.get('minPrice') || ''
    const maxPrice = searchParams.get('maxPrice') || ''
    const minRating = searchParams.get('minRating') || ''
    const minReviews = searchParams.get('minReviews') || ''

    const dispatch = useDispatch()
    const { products, loading, error } = useSelector(state => state.products)

    const [categories, setCategories] = useState([])
    const [text, setText] = useState(q)                 // what is typed in the search box
    const [minDraft, setMinDraft] = useState(minPrice)  // typed minimum price
    const [maxDraft, setMaxDraft] = useState(maxPrice)  // typed maximum price

    // categories (for the filter buttons) - loaded once
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/categories`)
                setCategories(data.categories)
            } catch (error) {
                errMsg(getErrorMessage(error))
            }
        }
        load()
    }, [])

    // typing -> wait 300ms, then put the search text and prices in the URL
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchParams(prev => {
                const next = new URLSearchParams(prev)
                putParam(next, 'q', text.trim())
                putParam(next, 'minPrice', minDraft.trim())
                putParam(next, 'maxPrice', maxDraft.trim())
                return next
            }, { replace: true })
        }, 300)
        return () => clearTimeout(timer)
    }, [text, minDraft, maxDraft, setSearchParams])

    // products - reloaded whenever a filter in the URL changes (only the filters that are set are sent)
    useEffect(() => {
        dispatch(getProducts({
            keyword: q || undefined,
            category: category || undefined,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            minRating: minRating || undefined,
            minReviews: minReviews || undefined,
        }))
    }, [q, category, minPrice, maxPrice, minRating, minReviews, dispatch])

    const setParam = (key, value) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            putParam(next, key, value)
            return next
        }, { replace: true })
    }

    const clearFilters = () => {
        setText('')
        setMinDraft('')
        setMaxDraft('')
        setSearchParams({}, { replace: true })
    }

    // organise the results by category, in the same order as the filter buttons
    const groups = categories
        .map(c => ({ category: c, items: products.filter(p => p.category && p.category._id === c._id) }))
        .filter(g => g.items.length > 0)

    const filtering = Boolean(q || category || minPrice || maxPrice || minRating || minReviews)

    return (
        <>
            <MetaData title="Menu" />
            <div className="container py-5">
                <h1>Our Menu</h1>
                <p className="text-muted">Freshly brewed coffee, handcrafted milk tea and more.</p>

                <div className="menu-toolbar">
                    <input
                        type="search"
                        className="form-control"
                        placeholder="Search the menu..."
                        aria-label="Search the menu"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <div className="cat-pills" role="group" aria-label="Filter by category">
                        <button type="button" className={`cat-pill ${category === '' ? 'active' : ''}`} onClick={() => setParam('category', '')}>All</button>
                        {categories.map(c => (
                            <button type="button" key={c._id}
                                className={`cat-pill ${category === c._id ? 'active' : ''}`}
                                onClick={() => setParam('category', c._id)}>
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="row align-items-start mb-4">
                    <div className="col-6 col-md-3 mb-3">
                        <TextField
                            fullWidth size="small" type="number" label="Min price (₱)" value={minDraft}
                            onChange={(e) => setMinDraft(e.target.value)} slotProps={{ htmlInput: { min: 0 } }}
                        />
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                        <TextField
                            fullWidth size="small" type="number" label="Max price (₱)" value={maxDraft}
                            onChange={(e) => setMaxDraft(e.target.value)} slotProps={{ htmlInput: { min: 0 } }}
                        />
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                        <TextField select fullWidth size="small" label="Rating" value={minRating}
                            onChange={(e) => setParam('minRating', e.target.value)}>
                            {RATING_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </TextField>
                    </div>
                    <div className="col-6 col-md-3 mb-3">
                        <TextField select fullWidth size="small" label="Reviews" value={minReviews}
                            onChange={(e) => setParam('minReviews', e.target.value)}>
                            {REVIEW_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                        </TextField>
                    </div>
                </div>

                {filtering && (
                    <div className="mb-4">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearFilters}>
                            ✕ Clear all filters
                        </button>
                    </div>
                )}

                {loading ? <Loader /> : error ? (
                    <div className="text-center text-muted py-5">We couldn't load the menu. Please check your connection and try again.</div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-5">
                        {filtering ? (
                            <>
                                <p className="text-muted">No items match your search and filters{q ? <> for “{q}”</> : ''}.</p>
                                <button className="btn btn-outline-lumiere" onClick={clearFilters}>Clear filters</button>
                            </>
                        ) : (
                            <p className="text-muted">The menu is empty right now. Please check back soon!</p>
                        )}
                    </div>
                ) : (
                    groups.map(g => (
                        <section key={g.category._id} className="menu-group">
                            <h2>{g.category.name}</h2>
                            {g.category.description && <p className="text-muted">{g.category.description}</p>}
                            <div className="product-grid">
                                {g.items.map(p => <ProductCard key={p._id} product={p} />)}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </>
    )
}

export default Menu