import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import MetaData from '../Layout/MetaData'
import { API, errMsg, getErrorMessage, homePathForRole, successMsg } from '../Utils/helpers'

const Register = ({ user, onAuth }) => {
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' })
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    if (user) return <Navigate to={homePathForRole(user.role)} replace />

    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const submitHandler = async (e) => {
        e.preventDefault()
        // quick checks here; the server validates again
        if (!form.name || !form.email || !form.password) return errMsg('Please fill in name, email and password')
        if (form.password.length < 6) return errMsg('Password must be at least 6 characters')
        if (form.password !== form.confirmPassword) return errMsg('Passwords do not match')

        setLoading(true)
        try {
            const { data } = await axios.post(`${API}/register`, form)
            onAuth(data)
            successMsg('Account created. Welcome to Kafé Lumière!')
            navigate('/')
        } catch (error) {
            errMsg(getErrorMessage(error))
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <MetaData title="Register" />
            <div className="auth-wrap">
                <form className="auth-card" onSubmit={submitHandler}>
                    <h1>Create account</h1>

                    <div className="form-group">
                        <label htmlFor="name_field">Full name</label>
                        <input type="text" id="name_field" name="name" className="form-control" value={form.name} onChange={onChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email_field">Email</label>
                        <input type="email" id="email_field" name="email" className="form-control" value={form.email} onChange={onChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone_field">Mobile number <small className="text-muted">(optional)</small></label>
                        <input type="text" id="phone_field" name="phone" placeholder="09171234567" className="form-control" value={form.phone} onChange={onChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password_field">Password</label>
                        <input type="password" id="password_field" name="password" className="form-control" value={form.password} onChange={onChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirm_field">Confirm password</label>
                        <input type="password" id="confirm_field" name="confirmPassword" className="form-control" value={form.confirmPassword} onChange={onChange} />
                    </div>

                    <button type="submit" className="btn btn-lumiere btn-block py-2" disabled={loading}>
                        {loading ? 'Creating account...' : 'REGISTER'}
                    </button>

                    <div className="mt-3 text-center">
                        Already have an account? <Link to="/login">Login</Link>
                    </div>
                </form>
            </div>
        </>
    )
}

export default Register
