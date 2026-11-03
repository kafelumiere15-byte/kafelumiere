import { Navigate, useLocation } from 'react-router-dom'

// <ProtectedRoute user={user}>                    -> any logged-in user
// <ProtectedRoute user={user} roles={['admin']}>  -> only those roles
const ProtectedRoute = ({ user, roles, children }) => {
    const location = useLocation()

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />
    }
    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />
    }
    return children
}

export default ProtectedRoute
