import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import axios from 'axios'

import './App.css'
import { Header } from './Components/Layout/Header'
import Footer from './Components/Layout/Footer'
import Home from './Components/Home'
import Menu from './Components/Menu/Menu'
import Cart from './Components/Cart/Cart'
import CartProvider from './Components/Cart/CartProvider'
import Checkout from './Components/Order/Checkout'
import OrderDetail from './Components/Order/OrderDetail'
import MyOrders from './Components/Order/MyOrders'
import ProductDetail from './Components/Menu/ProductDetail'
import NotFound from './Components/NotFound'
import ProtectedRoute from './Components/Route/ProtectedRoute'

import Login from './Components/User/Login'
import Register from './Components/User/Register'
import Profile from './Components/User/Profile'
import UpdateProfile from './Components/User/UpdateProfile'
import UpdatePassword from './Components/User/UpdatePassword'

import Dashboard from './Components/Admin/Dashboard'
import StaffHome from './Components/Staff/StaffHome'
import StaffOrderDetail from './Components/Staff/StaffOrderDetail'
import Pos from './Components/Staff/Pos'
import Categories from './Components/Admin/Categories'
import Products from './Components/Admin/Products'
import ProductForm from './Components/Admin/ProductForm'
import Users from './Components/Admin/Users'
import AllOrders from './Components/Admin/AllOrders'
import Reports from './Components/Admin/Reports'

import { API, authenticate, getUser, logout, saveUser } from './Components/Utils/helpers'

function App() {
  // one source of truth for "who is logged in" (so the header updates instantly)
  const [user, setUser] = useState(getUser() || null)

  const onAuth = (data) => authenticate(data, () => setUser(data.user))

  const onUserUpdate = (updated) => {
    saveUser(updated)
    setUser(updated)
  }

  const onLogout = async () => {
    try {
      await axios.post(`${API}/logout`)
    } catch {
      // even if the server is unreachable, we still clear the local session
    }
    logout(() => setUser(null))
  }

  return (
    <Router>
     <CartProvider user={user}>
      <div className="app-shell">
        <Header user={user} onLogout={onLogout} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home user={user} />} />

            {/* public: anyone can browse the menu */}
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/:id" element={<ProductDetail />} />

            {/* customers only */}
            <Route path="/cart" element={
              <ProtectedRoute user={user} roles={['customer']}><Cart /></ProtectedRoute>
            } />

            <Route path="/checkout" element={
              <ProtectedRoute user={user} roles={['customer']}><Checkout /></ProtectedRoute>
            } />

            <Route path="/orders" element={
              <ProtectedRoute user={user} roles={['customer']}><MyOrders /></ProtectedRoute>
            } />

            {/* the server only shows an order to its owner (or to staff / admin) */}
            <Route path="/orders/:id" element={
              <ProtectedRoute user={user}><OrderDetail /></ProtectedRoute>
            } />

            <Route path="/login" element={<Login user={user} onAuth={onAuth} />} />
            <Route path="/register" element={<Register user={user} onAuth={onAuth} />} />

            {/* any logged-in user */}
            <Route path="/me" element={
              <ProtectedRoute user={user}><Profile user={user} onUserUpdate={onUserUpdate} onLogout={onLogout} /></ProtectedRoute>
            } />
            <Route path="/me/update" element={
              <ProtectedRoute user={user}><UpdateProfile user={user} onUserUpdate={onUserUpdate} /></ProtectedRoute>
            } />
            <Route path="/password/update" element={
              <ProtectedRoute user={user}><UpdatePassword onAuth={onAuth} /></ProtectedRoute>
            } />

            {/* role-based */}
            <Route path="/dashboard" element={
              <ProtectedRoute user={user} roles={['admin']}><Dashboard user={user} /></ProtectedRoute>
            } />
            <Route path="/admin/categories" element={
              <ProtectedRoute user={user} roles={['admin']}><Categories /></ProtectedRoute>
            } />
            <Route path="/admin/products" element={
              <ProtectedRoute user={user} roles={['admin']}><Products /></ProtectedRoute>
            } />
            <Route path="/admin/product/new" element={
              <ProtectedRoute user={user} roles={['admin']}><ProductForm /></ProtectedRoute>
            } />
            <Route path="/admin/product/:id/edit" element={
              <ProtectedRoute user={user} roles={['admin']}><ProductForm /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute user={user} roles={['admin']}><Users me={user} /></ProtectedRoute>
            } />
            <Route path="/admin/orders" element={
              <ProtectedRoute user={user} roles={['admin']}><AllOrders /></ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute user={user} roles={['admin']}><Reports /></ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute user={user} roles={['staff', 'admin']}><StaffHome user={user} /></ProtectedRoute>
            } />

            <Route path="/staff/pos" element={
              <ProtectedRoute user={user} roles={['staff', 'admin']}><Pos /></ProtectedRoute>
            } />

            <Route path="/staff/orders/:id" element={
              <ProtectedRoute user={user} roles={['staff', 'admin']}><StaffOrderDetail /></ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <ToastContainer />
     </CartProvider>
    </Router>
  )
}

export default App