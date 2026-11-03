import { Link } from 'react-router-dom'

const NotFound = () => (
    <div className="container py-5 text-center">
        <h1>404</h1>
        <p className="text-muted">This page doesn't exist.</p>
        <Link to="/" className="btn btn-lumiere">Back to home</Link>
    </div>
)

export default NotFound
