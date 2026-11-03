import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Button, Checkbox, FormControlLabel, MenuItem, Switch, TextField, Typography } from '@mui/material'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import { API, authConfig, authOnly, errMsg, getErrorMessage, imageUrl, successMsg } from '../Utils/helpers'

// no cap on how many photos a product can have
const MAX_IMAGE = 2 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

const EMPTY_VALUES = {
    name: '', description: '', price: '', category: '', isAvailable: true, isActive: true,
    newImages: [],      // File objects chosen now
    removeImages: [],   // urls of existing photos to delete on save
}

// one form for both "Add product" (/admin/product/new) and "Edit product" (/admin/product/:id/edit)
const ProductForm = () => {
    const { id } = useParams()
    const isEdit = Boolean(id)
    const navigate = useNavigate()

    const [categories, setCategories] = useState([])
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [previews, setPreviews] = useState([])        // object urls of newImages

    useEffect(() => {
        const load = async () => {
            try {
                const cats = await axios.get(`${API}/admin/categories`, authConfig())
                setCategories(cats.data.categories)
                if (id) {
                    const { data } = await axios.get(`${API}/admin/product/${id}`, authConfig())
                    setProduct(data.product)
                }
            } catch (error) {
                errMsg(getErrorMessage(error))
                navigate('/admin/products')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id, navigate])

    const existingImages = useMemo(() => (product && product.images) || [], [product])

    const initialValues = useMemo(() => (product ? {
        name: product.name,
        description: product.description || '',
        price: String(product.price),
        category: product.category ? product.category._id : '',
        isAvailable: product.isAvailable,
        isActive: product.isActive,
        newImages: [],
        removeImages: [],
    } : EMPTY_VALUES), [product])

    const schema = useMemo(() => Yup.object({
        name: Yup.string().trim().required('Please enter the product name').max(80, 'Use 80 characters or fewer'),
        price: Yup.number()
            .transform((value, original) => (original === '' ? undefined : value))
            .typeError('Enter the price as a number')
            .required('Please enter the price')
            .min(0, 'The price cannot be negative')
            .max(100000, 'The price must be 100,000 or less'),
        category: Yup.string().required('Please choose a category'),
        description: Yup.string().max(500, 'Use 500 characters or fewer'),
        isAvailable: Yup.boolean(),
        isActive: Yup.boolean(),
    }), [])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues,
        validationSchema: schema,
        onSubmit: async (values) => {
            const body = new FormData()
            body.append('name', values.name.trim())
            body.append('description', values.description.trim())
            body.append('price', values.price)
            body.append('category', values.category)
            body.append('isAvailable', String(values.isAvailable))
            body.append('isActive', String(values.isActive))
            values.newImages.forEach(file => body.append('images', file))
            if (values.removeImages.length > 0) body.append('removeImages', JSON.stringify(values.removeImages))

            try {
                if (isEdit) {
                    await axios.put(`${API}/admin/product/${id}`, body, authOnly())
                    successMsg('Product updated')
                } else {
                    await axios.post(`${API}/admin/product`, body, authOnly())
                    successMsg('Product added')
                }
                navigate('/admin/products')
            } catch (error) {
                errMsg(getErrorMessage(error))
            }
        },
    })

    // object urls for the newly chosen files; revoked when the files change or the page closes
    useEffect(() => {
        const urls = formik.values.newImages.map(file => URL.createObjectURL(file))
        setPreviews(urls)
        return () => urls.forEach(url => URL.revokeObjectURL(url))
    }, [formik.values.newImages])

    const keptCount = existingImages.length - formik.values.removeImages.length
    const totalPhotos = keptCount + formik.values.newImages.length

    // checkbox selection for BULK delete, across both the saved photos and the not-yet-saved ones.
    // key = "existing:<url>" or "new:<index>"
    const [selected, setSelected] = useState(new Set())

    const onFiles = (e) => {
        const chosen = Array.from(e.target.files || [])
        e.target.value = ''                       // so the same file can be picked again later
        const valid = []
        chosen.forEach(file => {
            if (!TYPES.includes(file.type)) {
                errMsg(`${file.name} is not a JPG, PNG or WEBP image`)
            } else if (file.size > MAX_IMAGE) {
                errMsg(`${file.name} is larger than 2MB`)
            } else {
                valid.push(file)
            }
        })
        if (valid.length > 0) formik.setFieldValue('newImages', [...formik.values.newImages, ...valid])
    }

    const toggleSelected = (key) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    // bulk delete: existing (saved) photos are queued for removal on Save; not-yet-saved photos
    // are simply dropped right away
    const removeSelected = () => {
        const existingUrls = [...selected].filter(k => k.startsWith('existing:')).map(k => k.slice('existing:'.length))
        const newIndexes = new Set([...selected].filter(k => k.startsWith('new:')).map(k => Number(k.slice('new:'.length))))

        if (existingUrls.length > 0) {
            formik.setFieldValue('removeImages', [...new Set([...formik.values.removeImages, ...existingUrls])])
        }
        if (newIndexes.size > 0) {
            formik.setFieldValue('newImages', formik.values.newImages.filter((_, i) => !newIndexes.has(i)))
        }
        setSelected(new Set())
    }

    const fieldError = (name) => (formik.touched[name] && formik.errors[name]) || undefined

    if (loading) return <Loader />

    const categoryHelp = fieldError('category')

    return (
        <>
            <MetaData title={isEdit ? 'Edit Product' : 'Add Product'} />
            <div className="container py-5" style={{ maxWidth: 760 }}>
                <h1>{isEdit ? 'Edit product' : 'Add product'}</h1>

                <form className="panel-card" onSubmit={formik.handleSubmit} noValidate>
                    <TextField
                        id="p_name" name="name" label="Name" fullWidth margin="normal"
                        value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur}
                        error={Boolean(fieldError('name'))} helperText={fieldError('name')}
                    />

                    <div className="form-row">
                        <div className="col-md-6">
                            <TextField
                                id="p_price" name="price" label="Price (₱)" type="number" fullWidth margin="normal"
                                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                                value={formik.values.price} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={Boolean(fieldError('price'))} helperText={fieldError('price')}
                            />
                        </div>
                        <div className="col-md-6">
                            <TextField
                                id="p_category" name="category" label="Category" select fullWidth margin="normal"
                                value={formik.values.category} onChange={formik.handleChange} onBlur={formik.handleBlur}
                                error={Boolean(categoryHelp)}
                                helperText={categoryHelp || (categories.length === 0 ? <span>No categories yet. <Link to="/admin/categories">Create one first</Link>.</span> : undefined)}
                            >
                                <MenuItem value="">Choose a category...</MenuItem>
                                {categories.map(c => (
                                    <MenuItem key={c._id} value={c._id}>{c.name}{c.isActive ? '' : ' (inactive)'}</MenuItem>
                                ))}
                            </TextField>
                        </div>
                    </div>

                    <TextField
                        id="p_desc" name="description" label="Description" fullWidth multiline minRows={3} margin="normal"
                        value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur}
                        error={Boolean(fieldError('description'))} helperText={fieldError('description')}
                    />

                    <div className="mt-3">
                        <div className="d-flex justify-content-between align-items-center flex-wrap mb-2">
                            <div>
                                <strong>Photos</strong>{' '}
                                <small className="text-muted">({totalPhotos} added; JPG, PNG or WEBP, up to 2MB each - as many as you like)</small>
                            </div>
                            {selected.size > 0 && (
                                <Button size="small" color="error" variant="outlined" onClick={removeSelected}>
                                    Delete selected ({selected.size})
                                </Button>
                            )}
                        </div>

                        {formik.values.removeImages.length > 0 && (
                            <div className="mb-2">
                                <small className="text-muted">
                                    {formik.values.removeImages.length} photo(s) will be deleted when you save.{' '}
                                    <Button size="small" onClick={() => formik.setFieldValue('removeImages', [])}>Undo all</Button>
                                </small>
                            </div>
                        )}

                        <div className="d-flex flex-wrap" style={{ gap: 12 }}>
                            {existingImages.map(img => {
                                const key = `existing:${img.url}`
                                const queuedForRemoval = formik.values.removeImages.includes(img.url)
                                return (
                                    <label key={img.url} className="text-center" style={{ width: 120, opacity: queuedForRemoval ? 0.35 : 1, cursor: 'pointer' }}>
                                        <img src={imageUrl(img)} alt="Current product" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                                        <div>
                                            <Checkbox size="small" checked={selected.has(key)} onChange={() => toggleSelected(key)} />
                                            {queuedForRemoval && <div className="small text-danger">Queued for deletion</div>}
                                        </div>
                                    </label>
                                )
                            })}
                            {previews.map((url, index) => {
                                const key = `new:${index}`
                                return (
                                    <label key={url} className="text-center" style={{ width: 120, cursor: 'pointer' }}>
                                        <img src={url} alt="New photo" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6 }} />
                                        <div>
                                            <Checkbox size="small" checked={selected.has(key)} onChange={() => toggleSelected(key)} />
                                            <div className="small text-muted">New</div>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>

                        <Button component="label" variant="outlined" className="mt-3">
                            Add photos
                            <input type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={onFiles} />
                        </Button>
                    </div>

                    <div className="mt-4">
                        <FormControlLabel
                            control={<Switch name="isAvailable" checked={formik.values.isAvailable} onChange={formik.handleChange} />}
                            label="Available (turn off when sold out)"
                        />
                    </div>
                    <div className="mb-4">
                        <FormControlLabel
                            control={<Switch name="isActive" checked={formik.values.isActive} onChange={formik.handleChange} />}
                            label="Show on the menu (turn off to hide it from customers)"
                        />
                    </div>

                    <Typography component="div" className="d-flex flex-wrap" style={{ gap: 8 }}>
                        <button type="submit" className="btn btn-lumiere" disabled={formik.isSubmitting}>
                            {formik.isSubmitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add product'}
                        </button>
                        <Link to="/admin/products" className="btn btn-outline-secondary">Cancel</Link>
                    </Typography>
                </form>
            </div>
        </>
    )
}

export default ProductForm