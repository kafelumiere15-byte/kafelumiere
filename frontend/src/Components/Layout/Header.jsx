import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useCart } from '../Cart/cartContext'

// so the person always knows which section they're in
const navLinkClass = ({ isActive }) => `nav-link-lite${isActive ? ' active' : ''}`

export const Header = ({ user, onLogout }) => {
    const [open, setOpen] = useState(false)       // the account dropdown
    const [menuOpen, setMenuOpen] = useState(false) // the mobile nav sheet
    const navigate = useNavigate()
    const { isCustomer, count } = useCart()

    const logoutHandler = async () => {
        setOpen(false)
        setMenuOpen(false)
        await onLogout()
        navigate('/login')
    }

    const closeMenu = () => setMenuOpen(false)

    return (
        <nav className="lumiere-nav">
            <div className="lumiere-nav-row">
                <Link to="/" className="brand" onClick={closeMenu}>Kafé <span>Lumière</span></Link>

                <button
                    type="button"
                    className={`nav-toggle ${menuOpen ? 'is-open' : ''}`}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <span /><span /><span />
                </button>

                <div className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
                    <div className="nav-links-main">
                        <NavLink to="/" end className={navLinkClass} onClick={closeMenu}>Home</NavLink>
                        <NavLink to="/menu" className={navLinkClass} onClick={closeMenu}>Menu</NavLink>
                        {user && (user.role === 'staff' || user.role === 'admin') && <NavLink to="/staff" end className={navLinkClass} onClick={closeMenu}>Orders</NavLink>}
                        {user && (user.role === 'staff' || user.role === 'admin') && <NavLink to="/staff/pos" className={navLinkClass} onClick={closeMenu}>POS</NavLink>}
                        {isCustomer && <NavLink to="/orders" className={navLinkClass} onClick={closeMenu}>My Orders</NavLink>}
                        {isCustomer && (
                            <NavLink to="/cart" className={navLinkClass} onClick={closeMenu}>
                                Cart{count > 0 && <span className="cart-badge">{count}</span>}
                            </NavLink>
                        )}
                    </div>

                    <div className="nav-links-account">
                        {user ? (
                            <div className="user-menu">
                                <button className="user-menu-btn" onClick={() => setOpen(!open)}>
                                    {user.name} &#9662;
                                </button>
                                {open && (
                                    <div className="user-menu-list" onClick={() => { setOpen(false); closeMenu() }}>
                                        {user.role === 'admin' && (
                                            <>
                                                <Link to="/dashboard">Admin Dashboard</Link>
                                                <Link to="/admin/products">Products</Link>
                                                <Link to="/admin/categories">Categories</Link>
                                                <Link to="/admin/users">Users</Link>
                                                <Link to="/admin/orders">All Orders</Link>
                                                <Link to="/admin/reports">Sales Reports</Link>
                                            </>
                                        )}
                                        {(user.role === 'staff' || user.role === 'admin') && <Link to="/staff">Staff Panel</Link>}
                                        <Link to="/me">My Profile</Link>
                                        <button className="text-danger" onClick={logoutHandler}>Logout</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="nav-auth-btns">
                                <Link to="/login" className="btn btn-outline-lumiere btn-sm" onClick={closeMenu}>Login</Link>
                                <Link to="/register" className="btn btn-lumiere btn-sm" onClick={closeMenu}>Sign up</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    )
}