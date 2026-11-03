import { useEffect, useState } from 'react'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import UserDialog from './UserDialog'
import { API, ROLE_LABEL, USER_TABS, authConfig, errMsg, formatDate, getErrorMessage, successMsg } from '../Utils/helpers'

// Admin: everybody who has an account. Add staff, edit, change roles, activate / deactivate.
const Users = ({ me }) => {
    const [tab, setTab] = useState('all')
    const [text, setText] = useState('')       // what is typed in the search box
    const [q, setQ] = useState('')             // the search that is actually used
    const [users, setUsers] = useState([])
    const [counts, setCounts] = useState(null)
    const [page, setPage] = useState(1)
    const [pages, setPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [dialog, setDialog] = useState(null)   // { user } - user = null means "add staff"
    const [version, setVersion] = useState(0)

    const query = USER_TABS.find(t => t.id === tab).query
    const params = (pageNumber) => ({ ...query, q: q || undefined, page: pageNumber })

    useEffect(() => {
        let ignore = false
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/admin/users`, { ...authConfig(), params: params(1) })
                if (!ignore) {
                    setUsers(data.users)
                    setCounts(data.counts)
                    setPage(data.page)
                    setPages(data.pages)
                    setTotal(data.total)
                }
            } catch (error) {
                if (!ignore) errMsg(getErrorMessage(error))
            } finally {
                if (!ignore) setLoading(false)
            }
        }
        load()
        return () => { ignore = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, q, version])

    // typing -> wait 300ms, then search
    useEffect(() => {
        if (text.trim() === q) return
        const timer = setTimeout(() => {
            setLoading(true)
            setQ(text.trim())
        }, 300)
        return () => clearTimeout(timer)
    }, [text, q])

    const chooseTab = (id) => {
        if (id === tab) return
        setLoading(true)
        setTab(id)
    }

    const loadMore = async () => {
        setLoadingMore(true)
        try {
            const { data } = await axios.get(`${API}/admin/users`, { ...authConfig(), params: params(page + 1) })
            setUsers(current => {
                const seen = new Set(current.map(u => u._id))
                return [...current, ...data.users.filter(u => !seen.has(u._id))]
            })
            setPage(data.page)
            setPages(data.pages)
            setTotal(data.total)
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setLoadingMore(false)
        }
    }

    const toggleActive = async (user) => {
        if (user.isActive && !window.confirm(`Deactivate ${user.name}? They will be logged out at once and cannot log in until you activate the account again.`)) return
        try {
            await axios.put(`${API}/admin/users/${user._id}`, { isActive: !user.isActive }, authConfig())
            successMsg(user.isActive ? `${user.name} was deactivated` : `${user.name} was activated`)
            setVersion(v => v + 1)
        } catch (error) {
            errMsg(getErrorMessage(error))
        }
    }

    return (
        <>
            <MetaData title="Users" />
            <div className="container py-5" style={{ maxWidth: 1080 }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <h1 className="mb-0">Users</h1>
                    <button type="button" className="btn btn-lumiere" onClick={() => setDialog({ user: null })}>+ Add staff account</button>
                </div>

                <div className="cat-pills mb-3" role="group" aria-label="User tabs">
                    {USER_TABS.map(t => (
                        <button key={t.id} type="button" className={`cat-pill ${tab === t.id ? 'active' : ''}`} onClick={() => chooseTab(t.id)}>
                            {t.label}<span className="tab-count">{counts ? counts[t.countKey] : '…'}</span>
                        </button>
                    ))}
                </div>

                <input type="search" className="form-control mb-4" style={{ maxWidth: 420, borderRadius: 24 }}
                    placeholder="Search by name, email or phone..." aria-label="Search users"
                    value={text} onChange={(e) => setText(e.target.value)} />

                {loading ? <Loader /> : (
                    <div className="panel-card table-responsive">
                        <table className="table table-lumiere mb-0">
                            <thead>
                                <tr><th>Name</th><th>E-mail</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th className="text-right">Actions</th></tr>
                            </thead>
                            <tbody>
                                {users.length === 0 && (
                                    <tr><td colSpan="7" className="text-center text-muted py-4">{q ? `No users match “${q}”.` : 'No users to show here.'}</td></tr>
                                )}
                                {users.map(u => {
                                    const isSelf = me && u._id === me._id
                                    return (
                                        <tr key={u._id} data-testid="user-row" className={u.isActive ? '' : 'row-muted'}>
                                            <td><strong>{u.name}</strong>{isSelf && <span className="you-tag">you</span>}</td>
                                            <td>{u.email}</td>
                                            <td>{u.phone || <span className="text-muted">—</span>}</td>
                                            <td><span className={`role-badge ${u.role}`}>{ROLE_LABEL[u.role]}</span></td>
                                            <td><span className={`status-pill ${u.isActive ? 'on' : 'off'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                                            <td className="text-nowrap">{formatDate(u.createdAt)}</td>
                                            <td className="text-right text-nowrap">
                                                <button type="button" className="btn btn-sm btn-outline-lumiere mr-1" aria-label={`Edit ${u.name}`} onClick={() => setDialog({ user: u })}>Edit</button>
                                                {!isSelf && (
                                                    <button type="button" className="btn btn-sm btn-outline-secondary" aria-label={`${u.isActive ? 'Deactivate' : 'Activate'} ${u.name}`} onClick={() => toggleActive(u)}>
                                                        {u.isActive ? 'Deactivate' : 'Activate'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && users.length > 0 && (
                    <div className="small text-muted mt-2" data-testid="users-count">Showing {users.length} of {total} user{total === 1 ? '' : 's'}</div>
                )}
                {!loading && page < pages && (
                    <div className="text-center mt-3">
                        <button type="button" className="btn btn-outline-lumiere" disabled={loadingMore} onClick={loadMore}>
                            {loadingMore ? 'Loading...' : 'Load more'}
                        </button>
                    </div>
                )}
            </div>

            {dialog && (
                <UserDialog user={dialog.user} isSelf={Boolean(dialog.user && me && dialog.user._id === me._id)}
                    onClose={() => setDialog(null)}
                    onSaved={() => { setDialog(null); setVersion(v => v + 1) }} />
            )}
        </>
    )
}

export default Users