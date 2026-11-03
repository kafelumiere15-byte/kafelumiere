import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import { API, authConfig, errMsg, getErrorMessage, successMsg } from '../Utils/helpers'

const UpdatePassword = ({ onAuth }) => {
    const [oldPassword, setOldPassword] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const submitHandler = async (e) => {
        e.preventDefault()
        if (!oldPassword || !password) return errMsg('Please fill in all fields')
        if (password.length < 6) return errMsg('New password must be at least 6 characters')
        if (password !== confirmPassword) return errMsg('New passwords do not match')

        setLoading(true)
        try {
            const { data } = await axios.put(`${API}/password/update`, { oldPassword, password }, authConfig())
            onAuth(data) // server issues a fresh token
            successMsg('Password updated')
            navigate('/me')
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <MetaData title="Change Password" />
            <div className="auth-wrap">
                <form className="auth-card" onSubmit={submitHandler}>
                    <h1>Change password</h1>

                    <div className="form-group">
                        <label htmlFor="old_field">Old password</label>
                        <input type="password" id="old_field" className="form-control" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="new_field">New password</label>
                        <input type="password" id="new_field" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirm_field">Confirm new password</label>
                        <input type="password" id="confirm_field" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>

                    <button type="submit" className="btn btn-lumiere btn-block py-2" disabled={loading}>
                        {loading ? 'Updating...' : 'UPDATE PASSWORD'}
                    </button>
                </form>
            </div>
        </>
    )
}

export default UpdatePassword
