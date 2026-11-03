import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import { API, authConfig, errMsg, formatPrice, getErrorMessage, successMsg } from '../Utils/helpers'

// The shop at a glance: sales, products and orders.
const Dashboard = ({ user }) => {
    const [stats, setStats] = useState(null)
    const [sales, setSales] = useState(null)

    useEffect(() => {
        const load = async () => {
            try {
                const [a, b] = await Promise.all([
                    axios.get(`${API}/admin/stats`, authConfig()),
                    axios.get(`${API}/admin/reports/summary`, authConfig()),
                ])
                setStats(a.data.stats)
                setSales(b.data.summary)
            } catch (error) {
                errMsg(getErrorMessage(error))
            }
        }
        load()
    }, [])

    const checkAccess = async () => {
        try {
            const { data } = await axios.get(`${API}/admin/ping`, authConfig())
            successMsg(`Server says: ${data.message}`)
        } catch (error) {
            errMsg(getErrorMessage(error))
        }
    }

    const money = (value) => (sales ? formatPrice(value) : '…')
    const salesCards = [
        { label: "Today's sales", value: money(sales && sales.sales.today.amount) },
        { label: "This month's sales", value: money(sales && sales.sales.month.amount) },
        { label: 'Total sales', value: money(sales && sales.sales.total.amount) },
    ]
    const cards = [
        { label: 'Total products', value: stats ? stats.totalProducts : '…' },
        { label: 'Pending orders', value: stats ? stats.pendingOrders : '…' },
        { label: 'Completed orders', value: stats ? stats.completedOrders : '…' },
        { label: 'Cancelled orders', value: sales ? sales.cancelledCount : '…' },
    ]

    return (
        <>
            <MetaData title="Admin Dashboard" />
            <div className="container py-5">
                <h1>Admin Dashboard</h1>
                <p className="text-muted">Welcome, {user.name}. Here is how the shop is doing.</p>

                {sales && sales.completedUnpaid > 0 && (
                    <div className="alert alert-warning" role="status">
                        {sales.completedUnpaid} completed order{sales.completedUnpaid === 1 ? ' has' : 's have'} no payment recorded and {sales.completedUnpaid === 1 ? 'is' : 'are'} not counted in the sales.{' '}
                        <Link to="/admin/orders">See all orders</Link>
                    </div>
                )}

                <div className="row">
                    {salesCards.map(card => (
                        <div className="col-md-4 mb-3" key={card.label}>
                            <div className="panel-card text-center">
                                <div className="stat-number">{card.value}</div>
                                <div>{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="row mb-4">
                    {cards.map(card => (
                        <div className="col-6 col-md-3 mb-3" key={card.label}>
                            <div className="panel-card text-center">
                                <div className="stat-number">{card.value}</div>
                                <div>{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mb-4">
                    <Link to="/admin/products" className="btn btn-lumiere mr-2 mb-2">Manage products</Link>
                    <Link to="/admin/categories" className="btn btn-lumiere mr-2 mb-2">Manage categories</Link>
                    <Link to="/admin/reports" className="btn btn-lumiere mr-2 mb-2">Sales reports</Link>
                    <Link to="/admin/users" className="btn btn-lumiere mr-2 mb-2">Manage users</Link>
                    <Link to="/admin/orders" className="btn btn-lumiere mr-2 mb-2">Monitor orders</Link>
                    <Link to="/staff" className="btn btn-outline-lumiere mr-2 mb-2">Order board</Link>
                </div>

                <button className="btn btn-outline-lumiere" onClick={checkAccess}>Test admin API access</button>
            </div>
        </>
    )
}

export default Dashboard