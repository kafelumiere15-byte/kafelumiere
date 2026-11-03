import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import Loader from '../Layout/Loader'
import { API, authConfig, errMsg, getErrorMessage, saveUser } from '../Utils/helpers'

const Profile = ({ user, onUserUpdate, onLogout }) => {
    const [profile, setProfile] = useState(user)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get(`${API}/me`, authConfig())
                setProfile(data.user)
                saveUser(data.user)
                onUserUpdate(data.user)
            } catch (error) {
                errMsg(getErrorMessage(error))
                // expired / invalid token -> back to login
                if (error?.response?.status === 401 || error?.response?.status === 403) {
                    await onLogout()
                    navigate('/login')
                }
            } finally {
                setLoading(false)
            }
        }
        load()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    if (loading) return <Loader />

    return (
        <>
            <MetaData title="My Profile" />
            <div className="auth-wrap">
                <div className="auth-card">
                    <h1>My Profile</h1>
                    <p className="mb-1 text-muted">Full name</p>
                    <h5>{profile.name}</h5>
                    <p className="mb-1 mt-3 text-muted">Email</p>
                    <h5>{profile.email}</h5>
                    <p className="mb-1 mt-3 text-muted">Mobile number</p>
                    <h5>{profile.phone || '—'}</h5>
                    <p className="mb-1 mt-3 text-muted">Account type</p>
                    <span className={`role-badge ${profile.role}`}>{profile.role}</span>
                    <p className="mb-1 mt-3 text-muted">Member since</p>
                    <h5>{new Date(profile.createdAt).toLocaleDateString()}</h5>

                    <Link to="/me/update" className="btn btn-lumiere btn-block mt-4">Edit profile</Link>
                    <Link to="/password/update" className="btn btn-outline-lumiere btn-block mt-2">Change password</Link>
                </div>
            </div>
        </>
    )
}

export default Profile
