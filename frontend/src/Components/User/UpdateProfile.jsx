import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { TextField } from '@mui/material'
import MetaData from '../Layout/MetaData'
import { API, authConfig, errMsg, getErrorMessage, successMsg } from '../Utils/helpers'

const UpdateProfile = ({ user, onUserUpdate }) => {
    const navigate = useNavigate()

    const formik = useFormik({
        initialValues: { name: user.name || '', phone: user.phone || '' },
        validationSchema: Yup.object({
            name: Yup.string().trim().max(30, 'Name cannot be longer than 30 characters').required('Please enter your name'),
            phone: Yup.string().trim().matches(/^(09|\+639)\d{9}$/, {
                message: 'Please enter a valid PH mobile number (e.g. 09171234567)',
                excludeEmptyString: true,
            }),
        }),
        onSubmit: async (values) => {
            try {
                const { data } = await axios.put(`${API}/me/update`, { name: values.name.trim(), phone: values.phone.trim() }, authConfig())
                onUserUpdate(data.user)
                successMsg('Profile updated')
                navigate('/me')
            } catch (error) {
                errMsg(getErrorMessage(error))
            }
        }
    })

    return (
        <>
            <MetaData title="Update Profile" />
            <div className="auth-wrap">
                <form className="auth-card" onSubmit={formik.handleSubmit} noValidate>
                    <h1>Edit profile</h1>

                    <TextField
                        id="name_field" name="name" label="Full name" fullWidth margin="normal"
                        value={formik.values.name}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.name && Boolean(formik.errors.name)}
                        helperText={formik.touched.name && formik.errors.name}
                    />

                    <TextField
                        id="email_field" label="Email (cannot be changed)" fullWidth margin="normal"
                        value={user.email} disabled
                    />

                    <TextField
                        id="phone_field" name="phone" label="Mobile number" placeholder="09171234567" fullWidth margin="normal"
                        value={formik.values.phone}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.phone && Boolean(formik.errors.phone)}
                        helperText={formik.touched.phone && formik.errors.phone}
                    />

                    <button type="submit" className="btn btn-lumiere btn-block py-2 mt-2" disabled={formik.isSubmitting}>
                        {formik.isSubmitting ? 'Saving...' : 'SAVE CHANGES'}
                    </button>
                </form>
            </div>
        </>
    )
}

export default UpdateProfile
