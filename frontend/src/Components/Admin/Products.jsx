import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'
import { DataGrid } from '@mui/x-data-grid'
import { Button, Chip, TextField } from '@mui/material'
import MetaData from '../Layout/MetaData'
import ProductReviewsDialog from './ProductReviewsDialog'
import { bulkDeleteProducts, getAdminProducts } from '../../actions/productActions'
import { API, authConfig, errMsg, formatPrice, getErrorMessage, imageUrl, successMsg } from '../Utils/helpers'

const EMPTY_SELECTION = { type: 'include', ids: new Set() }

// the selected product ids, whatever shape the DataGrid selection comes in
// (v7 array, or v8/v9 { type: 'include' | 'exclude', ids })
const selectedIdsOf = (model, rows) => {
    if (!model) return []
    if (Array.isArray(model)) return model.map(String)
    const ids = [...(model.ids || [])].map(String)
    if (model.type === 'exclude') return rows.map(r => r._id).filter(id => !ids.includes(id))
    return ids
}

const Products = () => {
    const dispatch = useDispatch()
    const { products, loading, deleting } = useSelector(state => state.adminProducts)

    const [keyword, setKeyword] = useState('')
    const [selection, setSelection] = useState(EMPTY_SELECTION)
    const [reviewTarget, setReviewTarget] = useState(null)   // { _id, name } while the reviews dialog is open

    useEffect(() => {
        dispatch(getAdminProducts())
    }, [dispatch])

    // search is done in the browser - the product list is small
    const visible = useMemo(() => {
        const text = keyword.trim().toLowerCase()
        return products.filter(p => !text || p.name.toLowerCase().includes(text))
    }, [products, keyword])

    const selectedIds = selectedIdsOf(selection, visible)

    const removeOne = async (product) => {
        if (!window.confirm(`Delete "${product.name}"? This cannot be undone. (You can hide it from the menu instead.)`)) return
        try {
            await axios.delete(`${API}/admin/product/${product._id}`, authConfig())
            successMsg('Product deleted')
            setSelection({ type: 'include', ids: new Set(selectedIds.filter(id => id !== product._id)) })
            dispatch(getAdminProducts())
        } catch (error) {
            errMsg(getErrorMessage(error))
        }
    }

    const removeSelected = async () => {
        if (selectedIds.length === 0) return
        if (!window.confirm(`Delete ${selectedIds.length} selected product${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return
        try {
            const data = await dispatch(bulkDeleteProducts(selectedIds))
            setSelection(EMPTY_SELECTION)
            successMsg(`${data?.deleted ?? selectedIds.length} product${selectedIds.length === 1 ? '' : 's'} deleted`)
        } catch (error) {
            errMsg(getErrorMessage(error))
        }
    }

    const columns = [
        {
            field: 'photo', headerName: 'Photo', width: 90, sortable: false, filterable: false,
            renderCell: ({ row }) => {
                const src = imageUrl(row.images?.[0])
                return src
                    ? <img src={src} alt={row.name} className="thumb" />
                    : <div className="thumb thumb-empty">No photo</div>
            },
        },
        { field: 'name', headerName: 'Name', flex: 1.5, minWidth: 160 },
        {
            field: 'category', headerName: 'Category', flex: 1, minWidth: 120,
            valueGetter: (_, row) => row.category?.name || '',
            renderCell: ({ row }) => row.category?.name || '—',
        },
        {
            field: 'price', headerName: 'Price', width: 120, type: 'number',
            renderCell: ({ row }) => formatPrice(row.price),
        },
        {
            field: 'ratings', headerName: 'Rating', width: 100, type: 'number',
            renderCell: ({ row }) => Number(row.ratings || 0).toFixed(1),
        },
        { field: 'numOfReviews', headerName: 'Reviews', width: 100, type: 'number' },
        {
            field: 'isActive', headerName: 'Status', width: 120,
            valueGetter: (_, row) => (row.isActive ? 'Active' : 'Hidden'),
            renderCell: ({ row }) => (
                <Chip size="small" label={row.isActive ? 'Active' : 'Hidden'} color={row.isActive ? 'success' : 'default'} />
            ),
        },
        {
            field: 'isAvailable', headerName: 'Availability', width: 130,
            valueGetter: (_, row) => (row.isAvailable ? 'Available' : 'Sold out'),
            renderCell: ({ row }) => (
                <Chip size="small" label={row.isAvailable ? 'Available' : 'Sold out'} color={row.isAvailable ? 'success' : 'warning'} />
            ),
        },
        {
            field: 'actions', headerName: 'Actions', width: 260, sortable: false, filterable: false,
            renderCell: ({ row }) => (
                <div className="d-flex flex-wrap py-1">
                    <Button size="small" component={Link} to={`/admin/product/${row._id}/edit`}>Edit</Button>
                    <Button size="small" onClick={() => setReviewTarget({ _id: row._id, name: row.name })}>Reviews</Button>
                    <Button size="small" color="error" onClick={() => removeOne(row)}>Delete</Button>
                </div>
            ),
        },
    ]

    return (
        <>
            <MetaData title="Products" />
            <div className="container py-5">
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <h1 className="mb-0">Products</h1>
                    <Link to="/admin/product/new" className="btn btn-lumiere">+ New product</Link>
                </div>

                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <div style={{ minWidth: 260, flex: '0 1 360px' }}>
                        <TextField size="small" fullWidth placeholder="Search products by name"
                            slotProps={{ htmlInput: { 'aria-label': 'Search products' } }}
                            value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                    </div>
                    <Button variant="outlined" color="error" className="mt-2 mt-md-0"
                        disabled={selectedIds.length === 0 || deleting}
                        onClick={removeSelected}>
                        {deleting ? 'Deleting...' : `Delete selected (${selectedIds.length})`}
                    </Button>
                </div>

                <div className="panel-card p-0" style={{ overflow: 'hidden' }}>
                    <DataGrid
                        rows={visible}
                        columns={columns}
                        getRowId={(row) => row._id}
                        loading={loading}
                        checkboxSelection
                        disableRowSelectionOnClick
                        rowSelectionModel={selection}
                        onRowSelectionModelChange={(model) => setSelection(model)}
                        pageSizeOptions={[10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { page: 0, pageSize: 10 } },
                            sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
                        }}
                        autoHeight
                        disableColumnMenu
                    />
                </div>
            </div>

            <ProductReviewsDialog
                open={Boolean(reviewTarget)}
                productId={reviewTarget?._id}
                productName={reviewTarget?.name}
                onClose={() => setReviewTarget(null)}
            />
        </>
    )
}

export default Products