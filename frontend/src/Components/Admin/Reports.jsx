import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import {
    API, authConfig, buildCsv, downloadCsv, errMsg, formatDateTime, formatPeriod, formatPrice, getErrorMessage,
    paymentPillClass, paymentStateLabel, shiftDay, shiftMonthStart, todayInManila,
} from '../Utils/helpers'

const PRESETS = {
    day: [
        { id: '7', label: 'Last 7 days', range: (t) => [shiftDay(t, -6), t] },
        { id: '30', label: 'Last 30 days', range: (t) => [shiftDay(t, -29), t] },
        { id: 'month', label: 'This month', range: (t) => [`${t.slice(0, 7)}-01`, t] },
    ],
    month: [
        { id: '6', label: 'Last 6 months', range: (t) => [shiftMonthStart(t, -5), t] },
        { id: '12', label: 'Last 12 months', range: (t) => [shiftMonthStart(t, -11), t] },
        { id: 'year', label: 'This year', range: (t) => [`${t.slice(0, 4)}-01-01`, t] },
    ],
}
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Admin: how much the shop sold. Sales = completed AND paid orders, counted on the day they were completed.
const Reports = () => {
    const [group, setGroup] = useState('day')
    const [from, setFrom] = useState('')            // '' = the default range
    const [to, setTo] = useState('')
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(true)

    const [txType, setTxType] = useState('completed')
    const [text, setText] = useState('')
    const [q, setQ] = useState('')
    const [tx, setTx] = useState([])
    const [txPage, setTxPage] = useState(1)
    const [txPages, setTxPages] = useState(1)
    const [txTotal, setTxTotal] = useState(0)
    const [txAmount, setTxAmount] = useState(0)
    const [txLoading, setTxLoading] = useState(true)
    const [txMore, setTxMore] = useState(false)

    const badRange = Boolean(from && to && from > to)

    // the sales report
    useEffect(() => {
        if (badRange) return
        let ignore = false
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/admin/reports/sales`, {
                    ...authConfig(), params: { group, from: from || undefined, to: to || undefined },
                })
                if (!ignore) setReport(data)
            } catch (error) {
                if (!ignore) errMsg(getErrorMessage(error))
            } finally {
                if (!ignore) setLoading(false)
            }
        }
        load()
        return () => { ignore = true }
    }, [group, from, to, badRange])

    // the list of transactions (same dates)
    useEffect(() => {
        if (badRange) return
        let ignore = false
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/admin/reports/transactions`, {
                    ...authConfig(), params: { type: txType, from: from || undefined, to: to || undefined, q: q || undefined, page: 1 },
                })
                if (!ignore) {
                    setTx(data.transactions)
                    setTxPage(data.page)
                    setTxPages(data.pages)
                    setTxTotal(data.total)
                    setTxAmount(data.amount)
                }
            } catch (error) {
                if (!ignore) errMsg(getErrorMessage(error))
            } finally {
                if (!ignore) setTxLoading(false)
            }
        }
        load()
        return () => { ignore = true }
    }, [txType, from, to, q, badRange])

    // typing -> wait 300ms, then search
    useEffect(() => {
        if (text.trim() === q) return
        const timer = setTimeout(() => {
            setTxLoading(true)
            setQ(text.trim())
        }, 300)
        return () => clearTimeout(timer)
    }, [text, q])

    const changeDates = (newFrom, newTo) => {
        setLoading(true)
        setTxLoading(true)
        setFrom(newFrom)
        setTo(newTo)
    }
    const chooseGroup = (g) => {
        if (g === group) return
        setLoading(true)
        setGroup(g)
        setFrom('')
        setTo('')
        setTxLoading(true)
    }
    const chooseTxType = (t) => {
        if (t === txType) return
        setTxLoading(true)
        setTxType(t)
    }
    const preset = (p) => {
        const [f, t] = p.range(todayInManila())
        changeDates(f, t)
    }

    const loadMoreTx = async () => {
        setTxMore(true)
        try {
            const { data } = await axios.get(`${API}/admin/reports/transactions`, {
                ...authConfig(), params: { type: txType, from: from || undefined, to: to || undefined, q: q || undefined, page: txPage + 1 },
            })
            setTx(current => {
                const seen = new Set(current.map(t => t._id))
                return [...current, ...data.transactions.filter(t => !seen.has(t._id))]
            })
            setTxPage(data.page)
            setTxPages(data.pages)
            setTxTotal(data.total)
            setTxAmount(data.amount)
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setTxMore(false)
        }
    }

    const exportCsv = () => {
        const header = ['Period', 'Completed orders', 'Sales (PHP)', 'Cancelled orders', 'Cancelled amount (PHP)']
        const rows = report.rows.map(r => [r.period, r.completedCount, r.sales.toFixed(2), r.cancelledCount, r.cancelledAmount.toFixed(2)])
        rows.push(['TOTAL', report.totals.completedCount, report.totals.sales.toFixed(2), report.totals.cancelledCount, report.totals.cancelledAmount.toFixed(2)])
        downloadCsv(`sales-${report.group}-${report.range.from}_to_${report.range.to}.csv`, buildCsv(header, rows))
    }

    const label = (period) => (group === 'month' ? MONTH_SHORT[Number(period.slice(5, 7)) - 1] : period.slice(8))
    const maxSales = report ? Math.max(0, ...report.rows.map(r => r.sales)) : 0
    const t = report && report.totals

    return (
        <>
            <MetaData title="Sales Reports" />
            <div className="container py-5" style={{ maxWidth: 1100 }}>
                <h1>Sales Reports</h1>
                <p className="text-muted">Sales are the orders that were <strong>completed and paid</strong>, counted on the day they were completed.</p>

                <div className="cat-pills mb-3" role="group" aria-label="Group sales by">
                    <button type="button" className={`cat-pill ${group === 'day' ? 'active' : ''}`} onClick={() => chooseGroup('day')}>Daily</button>
                    <button type="button" className={`cat-pill ${group === 'month' ? 'active' : ''}`} onClick={() => chooseGroup('month')}>Monthly</button>
                </div>

                <div className="form-row mb-2 filters-row">
                    <div className="col-6 col-md-3 mb-2"><input type="date" className="form-control" aria-label="From date" value={from} onChange={(e) => changeDates(e.target.value, to)} /></div>
                    <div className="col-6 col-md-3 mb-2"><input type="date" className="form-control" aria-label="To date" value={to} onChange={(e) => changeDates(from, e.target.value)} /></div>
                    <div className="col-md-6 mb-2 d-flex flex-wrap align-items-center">
                        {PRESETS[group].map(p => (
                            <button key={p.id} type="button" className="btn btn-sm btn-outline-secondary mr-2 mb-1" onClick={() => preset(p)}>{p.label}</button>
                        ))}
                        {(from || to) && <button type="button" className="btn btn-sm btn-link mb-1" onClick={() => changeDates('', '')}>Reset dates</button>}
                    </div>
                </div>

                {badRange && <div className="alert alert-warning py-2" role="alert">The start date is after the end date.</div>}

                {loading && !badRange ? <Loader /> : report && !badRange && (
                    <>
                        <div className="small text-muted mb-3" data-testid="range-text">
                            Showing {formatPeriod(report.range.from)} to {formatPeriod(report.range.to)}
                        </div>

                        {t.completedUnpaid > 0 && (
                            <div className="alert alert-warning" role="status" data-testid="unpaid-warning">
                                {t.completedUnpaid} completed order{t.completedUnpaid === 1 ? ' has' : 's have'} no payment recorded, so {t.completedUnpaid === 1 ? 'it is' : 'they are'} not counted in the sales below.
                                Open {t.completedUnpaid === 1 ? 'it' : 'them'} in All Orders and take the payment.
                            </div>
                        )}

                        <div className="row mb-4">
                            <div className="col-6 col-lg mb-3"><div className="panel-card text-center"><div className="stat-number" data-testid="sales-total">{formatPrice(t.sales)}</div><div>Total sales</div></div></div>
                            <div className="col-6 col-lg mb-3"><div className="panel-card text-center"><div className="stat-number" data-testid="completed-count">{t.completedCount}</div><div>Completed orders</div></div></div>
                            <div className="col-6 col-lg mb-3"><div className="panel-card text-center"><div className="stat-number" data-testid="average-order">{formatPrice(t.averageOrder)}</div><div>Average order</div></div></div>
                            <div className="col-6 col-lg mb-3"><div className="panel-card text-center"><div className="stat-number" data-testid="cancelled-count">{t.cancelledCount}</div><div>Cancelled orders</div></div></div>
                            <div className="col-6 col-lg mb-3"><div className="panel-card text-center"><div className="stat-number" data-testid="refunded-amount">{formatPrice(t.refundedAmount)}</div><div>Refunded</div></div></div>
                        </div>

                        <div className="panel-card mb-4">
                            <div className="d-flex justify-content-between align-items-center flex-wrap mb-2">
                                <h5 className="mb-0">{group === 'day' ? 'Daily' : 'Monthly'} sales</h5>
                                <button type="button" className="btn btn-sm btn-outline-lumiere" onClick={exportCsv}>Download CSV</button>
                            </div>

                            {t.completedCount === 0 && <p className="text-muted mb-2">No completed orders in this period.</p>}

                            <div className="bar-chart" role="img" aria-label="Sales chart">
                                {report.rows.map(r => (
                                    <div key={r.period} className="bar-col" title={`${formatPeriod(r.period, group)}: ${formatPrice(r.sales)}`}>
                                        <div className="bar" data-testid="bar" style={{ height: `${maxSales ? Math.round((r.sales / maxSales) * 100) : 0}%` }} />
                                        <span className="bar-label">{label(r.period)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="table-responsive mt-3" style={{ maxHeight: 360 }}>
                                <table className="table table-lumiere mb-0">
                                    <thead>
                                        <tr><th>{group === 'day' ? 'Day' : 'Month'}</th><th className="text-right">Completed</th><th className="text-right">Sales</th><th className="text-right">Cancelled</th><th className="text-right">Cancelled amount</th></tr>
                                    </thead>
                                    <tbody>
                                        {report.rows.map(r => (
                                            <tr key={r.period} data-testid="period-row">
                                                <td>{formatPeriod(r.period, group)}</td>
                                                <td className="text-right">{r.completedCount}</td>
                                                <td className="text-right">{formatPrice(r.sales)}</td>
                                                <td className="text-right">{r.cancelledCount}</td>
                                                <td className="text-right">{formatPrice(r.cancelledAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-weight-bold" data-testid="totals-row">
                                            <td>Total</td>
                                            <td className="text-right">{t.completedCount}</td>
                                            <td className="text-right">{formatPrice(t.sales)}</td>
                                            <td className="text-right">{t.cancelledCount}</td>
                                            <td className="text-right">{formatPrice(t.cancelledAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="row mb-4">
                            <div className="col-md-4 mb-3">
                                <div className="panel-card h-100">
                                    <h5>By payment method</h5>
                                    <table className="table table-sm mb-0" aria-label="Sales by payment method">
                                        <tbody>
                                            {report.byPayment.map(p => (
                                                <tr key={p.method}><td>{p.label}</td><td className="text-right text-muted">{p.orders}</td><td className="text-right">{formatPrice(p.amount)}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="col-md-4 mb-3">
                                <div className="panel-card h-100">
                                    <h5>Online and walk-in</h5>
                                    <table className="table table-sm mb-0" aria-label="Sales by source">
                                        <tbody>
                                            {report.bySource.map(s => (
                                                <tr key={s.source}><td>{s.source === 'walk-in' ? 'Walk-in' : 'Online'}</td><td className="text-right text-muted">{s.orders}</td><td className="text-right">{formatPrice(s.amount)}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="col-md-4 mb-3">
                                <div className="panel-card h-100">
                                    <h5>Best sellers</h5>
                                    {report.topProducts.length === 0 ? <p className="text-muted mb-0">Nothing sold in this period.</p> : (
                                        <table className="table table-sm mb-0" aria-label="Best selling items">
                                            <tbody>
                                                {report.topProducts.map(p => (
                                                    <tr key={p.name}><td>{p.name}</td><td className="text-right text-muted">× {p.quantity}</td><td className="text-right">{formatPrice(p.amount)}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="panel-card">
                    <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                        <h5 className="mb-0">Transactions</h5>
                        <div className="cat-pills" role="group" aria-label="Transaction type">
                            <button type="button" className={`cat-pill ${txType === 'completed' ? 'active' : ''}`} onClick={() => chooseTxType('completed')}>Completed</button>
                            <button type="button" className={`cat-pill ${txType === 'cancelled' ? 'active' : ''}`} onClick={() => chooseTxType('cancelled')}>Cancelled</button>
                        </div>
                    </div>

                    <input type="search" className="form-control mb-3" style={{ maxWidth: 380, borderRadius: 24 }}
                        placeholder="Search order number, name, email or phone..." aria-label="Search transactions"
                        value={text} onChange={(e) => setText(e.target.value)} />

                    {txLoading && !badRange ? <Loader /> : (
                        <div className="table-responsive">
                            <table className="table table-lumiere mb-0">
                                <thead>
                                    <tr><th>Order</th><th>{txType === 'completed' ? 'Completed' : 'Cancelled'}</th><th>Customer</th><th>Items</th><th>Payment</th><th className="text-right">Total</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {(badRange ? [] : tx).length === 0 && (
                                        <tr><td colSpan="7" className="text-center text-muted py-4">No {txType} transactions found.</td></tr>
                                    )}
                                    {(badRange ? [] : tx).map(o => (
                                        <tr key={o._id} data-testid="tx-row">
                                            <td><Link to={`/staff/orders/${o._id}`} state={{ from: '/admin/reports' }} className="order-card-number">{o.orderNumber}</Link></td>
                                            <td className="text-nowrap small">{o.at ? formatDateTime(o.at) : '—'}</td>
                                            <td>{o.customer.name}{o.source === 'walk-in' && <span className="walkin-tag">Walk-in</span>}
                                                {txType === 'cancelled' && o.cancelReason && <div className="small text-danger">{o.cancelReason}</div>}</td>
                                            <td className="small">{o.itemsCount}</td>
                                            <td className="small">{o.paymentMethodLabel}<br /><span className={`status-pill ${paymentPillClass(o.paymentStatus)}`}>{paymentStateLabel(o.paymentStatus)}</span></td>
                                            <td className="text-right">{formatPrice(o.total)}</td>
                                            <td className="text-right"><Link to={`/staff/orders/${o._id}`} state={{ from: '/admin/reports' }} className="btn btn-sm btn-outline-lumiere">View</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!txLoading && !badRange && tx.length > 0 && (
                        <div className="small text-muted mt-2" data-testid="tx-count">Showing {tx.length} of {txTotal} · {formatPrice(txAmount)} in all</div>
                    )}
                    {!txLoading && !badRange && txPage < txPages && (
                        <div className="text-center mt-3">
                            <button type="button" className="btn btn-outline-lumiere" disabled={txMore} onClick={loadMoreTx}>{txMore ? 'Loading...' : 'Load more'}</button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default Reports