import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { TextField } from '@mui/material'
import { GoogleLogin } from '@react-oauth/google'
import MetaData from '../Layout/MetaData'
import { signInWithGoogleCredential } from '../../firebase'
import { API, authenticate, errMsg, getErrorMessage, homePathForRole, successMsg } from '../Utils/helpers'

const Login = ({ user, onAuth }) => {
    const [googleBusy, setGoogleBusy] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    // after a successful login: back where they came from (e.g. the menu), or to their own home
    const goNext = (role) => navigate(location.state?.from || homePathForRole(role), { replace: true })

    const formik = useFormik({
        initialValues: { email: '', password: '' },
        validationSchema: Yup.object({
            email: Yup.string().trim().email('Please enter a valid email address').required('Please enter your email'),
            password: Yup.string().required('Please enter your password'),
        }),
        onSubmit: async (values) => {
            try {
                const { data } = await axios.post(`${API}/login`, { email: values.email.trim(), password: values.password })
                onAuth(data)
                successMsg(`Welcome, ${data.user.name}!`)
                goNext(data.user.role)
            } catch (error) {
                errMsg(getErrorMessage(error))
            }
        }
    })

    // "Continue with Google": the @react-oauth/google button gets a Google ID token,
    // Firebase turns that into a Firebase sign-in (same as before), then the server
    // issues our normal token from that.
    const handleGoogleSuccess = async (credentialResponse) => {
        setGoogleBusy(true)
        try {
            const googleIdToken = credentialResponse.credential
            const result = await signInWithGoogleCredential(googleIdToken)
            const idToken = await result.user.getIdToken()
            const { data } = await axios.post(`${API}/auth/firebase`, { idToken })
            authenticate(data, () => onAuth(data))
            successMsg(`Welcome, ${data.user.name}!`)
            goNext(data.user.role)
        } catch (error) {
            if (error?.code === 'auth/not-configured') return errMsg(error.message)
            if (error?.code === 'auth/account-exists-with-different-credential') {
                return errMsg('An account already exists with this email using a different sign-in method.')
            }
            errMsg(error?.code?.startsWith('auth/') ? 'Google sign-in failed. Please try again.' : getErrorMessage(error))
        } finally {
            setGoogleBusy(false)
        }
    }

    const handleGoogleError = () => {
        errMsg('Google sign-in failed. Please try again.')
    }

    // already logged in -> go back where they came from, or to their own home
    if (user) return <Navigate to={location.state?.from || homePathForRole(user.role)} replace />

    const anyBusy = formik.isSubmitting || googleBusy

    return (
        <>
            <MetaData title="Login" />
            <div className="auth-wrap">
                <form className="auth-card" onSubmit={formik.handleSubmit} noValidate>
                    <h1>Login</h1>

                    <TextField
                        id="email_field" name="email" type="email" label="Email" fullWidth margin="normal"
                        value={formik.values.email}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.email && Boolean(formik.errors.email)}
                        helperText={formik.touched.email && formik.errors.email}
                    />

                    <TextField
                        id="password_field" name="password" type="password" label="Password" fullWidth margin="normal"
                        value={formik.values.password}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.password && Boolean(formik.errors.password)}
                        helperText={formik.touched.password && formik.errors.password}
                    />

                    <button type="submit" className="btn btn-lumiere btn-block py-2 mt-2" disabled={anyBusy}>
                        {formik.isSubmitting ? 'Signing in...' : 'LOGIN'}
                    </button>

                    <div className="text-center text-muted my-3">or</div>

                    <div className="d-flex justify-content-center" style={{ opacity: anyBusy ? 0.6 : 1, pointerEvents: anyBusy ? 'none' : 'auto' }}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            useOneTap={false}
                            text="continue_with"
                            width="320"
                        />
                    </div>

                    <div className="mt-3 text-center">
                        New here? <Link to="/register">Create an account</Link>
                    </div>
                </form>
            </div>
        </>
    )
}

export default Login