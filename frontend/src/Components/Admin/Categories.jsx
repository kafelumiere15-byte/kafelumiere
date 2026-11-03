import { useEffect, useState } from 'react'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import { API, authConfig, errMsg, getErrorMessage, successMsg } from '../Utils/helpers'

const emptyForm = { name: '', description: '' }

const Categories = () => {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState(emptyForm)
    const [editingId, setEditingId] = useState(null)
    const [saving, setSaving] = useState(false)

    const [version, setVersion] = useState(0)          // bump to reload the list
    const reload = () => setVersion(v => v + 1)

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/admin/categories`, authConfig())
                setCategories(data.categories)
            } catch (error) {
                errMsg(getErrorMessage(error))
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [version])

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const resetForm = () => {
        setForm(emptyForm)
        setEditingId(null)
    }

    const submitHandler = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) return errMsg('Please enter the category name')

        setSaving(true)
        try {
            if (editingId) {
                await axios.put(`${API}/admin/category/${editingId}`, form, authConfig())
                successMsg('Category updated')
            } else {
                await axios.post(`${API}/admin/category`, form, authConfig())
                successMsg('Category added')
            }
            resetForm()
            reload()
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setSaving(false)
        }
    }

    const startEdit = (c) => {
        setEditingId(c._id)
        setForm({ name: c.name, description: c.description || '' })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const toggleActive = async (c) => {
        try {
            await axios.put(`${API}/admin/category/${c._id}`, { isActive: !c.isActive }, authConfig())
            successMsg(c.isActive ? 'Category deactivated' : 'Category activated')
            reload()
        } catch (error) {
            errMsg(getErrorMessage(error))
        }
    }

    const remove = async (c) => {
        if (!window.confirm(`Delete the category "${c.name}"? This cannot be undone.`)) return
        try {
            await axios.delete(`${API}/admin/category/${c._id}`, authConfig())
            successMsg('Category deleted')
            if (editingId === c._id) resetForm()
            reload()
        } catch (error) {
            errMsg(getErrorMessage(error))
        }
    }

    return (
        <>
            <MetaData title="Categories" />
            <div className="container py-5">
                <h1>Categories</h1>
                <p className="text-muted">Group your products (Coffee, Milk Tea, Pastries...). Deactivating a category hides all of its products from customers.</p>

                <form className="panel-card mb-4" onSubmit={submitHandler}>
                    <h5 className="mb-3">{editingId ? 'Edit category' : 'Add a category'}</h5>
                    <div className="form-row">
                        <div className="form-group col-md-4">
                            <label htmlFor="cat_name">Name</label>
                            <input id="cat_name" name="name" className="form-control" value={form.name} onChange={onChange} />
                        </div>
                        <div className="form-group col-md-6">
                            <label htmlFor="cat_desc">Description <small className="text-muted">(optional)</small></label>
                            <input id="cat_desc" name="description" className="form-control" value={form.description} onChange={onChange} />
                        </div>
                        <div className="form-group col-md-2 d-flex align-items-end">
                            <button type="submit" className="btn btn-lumiere btn-block" disabled={saving}>
                                {saving ? 'Saving...' : editingId ? 'Save' : 'Add'}
                            </button>
                        </div>
                    </div>
                    {editingId && <button type="button" className="btn btn-link p-0" onClick={resetForm}>Cancel editing</button>}
                </form>

                {loading ? <Loader /> : (
                    <div className="panel-card table-responsive">
                        <table className="table table-lumiere mb-0">
                            <thead>
                                <tr><th>Name</th><th>Description</th><th>Products</th><th>Status</th><th className="text-right">Actions</th></tr>
                            </thead>
                            <tbody>
                                {categories.length === 0 && (
                                    <tr><td colSpan="5" className="text-center text-muted py-4">No categories yet. Add your first one above.</td></tr>
                                )}
                                {categories.map(c => (
                                    <tr key={c._id}>
                                        <td><strong>{c.name}</strong></td>
                                        <td>{c.description || <span className="text-muted">—</span>}</td>
                                        <td>{c.productCount}</td>
                                        <td><span className={`status-pill ${c.isActive ? 'on' : 'off'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                                        <td className="text-right text-nowrap">
                                            <button className="btn btn-sm btn-outline-lumiere mr-1" onClick={() => startEdit(c)}>Edit</button>
                                            <button className="btn btn-sm btn-outline-secondary mr-1" onClick={() => toggleActive(c)}>{c.isActive ? 'Deactivate' : 'Activate'}</button>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => remove(c)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}

export default Categories