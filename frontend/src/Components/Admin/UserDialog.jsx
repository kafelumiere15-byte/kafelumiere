import { useState } from 'react'
import axios from 'axios'
import { API, ROLE_LABEL, authConfig, errMsg, getErrorMessage, successMsg } from '../Utils/helpers'

// Admin: add a staff account (user = null) or edit an existing account.
// The e-mail is the account's identity, so it can only be typed when adding.
// You cannot change your own role (the server refuses it too).
const UserDialog = ({ user, isSelf, onClose, onSaved }) => {
    const creating = !user
    const [name, setName] = useState(user ? user.name : '')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState(user ? user.phone || '' : '')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState(user ? user.role : 'staff')
    const [busy, setBusy] = useState(false)

    const submit = async (e) => {
        e.preventDefault()
        if (!name.trim()) return errMsg('Please enter the name')
        if (creating && !email.trim()) return errMsg('Please enter the e-mail address')
        if (creating && password.length < 6) return errMsg('The password must be at least 6 characters')

        setBusy(true)
        try {
            if (creating) {
                await axios.post(`${API}/admin/users`, { name, email, phone, password }, authConfig())
                successMsg(`${name} was added as a staff member`)
            } else {
                await axios.put(`${API}/admin/users/${user._id}`, { name, phone, role }, authConfig())
                successMsg('Account updated')
            }
            onSaved()
        } catch (error) {
            errMsg(getErrorMessage(error))
            setBusy(false)
        }
    }

    return (
        <div className="dialog-backdrop" role="presentation">
            <form className="dialog-box" role="dialog" aria-modal="true" aria-label={creating ? 'Add staff account' : `Edit ${user.name}`} onSubmit={submit}>
                <h5>{creating ? 'Add a staff account' : 'Edit account'}</h5>

                <div className="form-group">
                    <label htmlFor="ud_name">Name</label>
                    <input id="ud_name" className="form-control" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                </div>

                <div className="form-group">
                    <label htmlFor="ud_email">E-mail</label>
                    {creating
                        ? <input id="ud_email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                        : <input id="ud_email" type="email" className="form-control" value={user.email} disabled />}
                </div>

                <div className="form-group">
                    <label htmlFor="ud_phone">Mobile number <small className="text-muted">(optional)</small></label>
                    <input id="ud_phone" className="form-control" placeholder="09171234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>

                {creating ? (
                    <div className="form-group">
                        <label htmlFor="ud_password">Temporary password</label>
                        <input id="ud_password" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <small className="text-muted">Tell the staff member to change it after the first login (My Profile → Change password).</small>
                    </div>
                ) : (
                    <div className="form-group">
                        <label htmlFor="ud_role">Role</label>
                        <select id="ud_role" className="form-control" value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value)}>
                            {Object.entries(ROLE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        {isSelf && <small className="text-muted">You cannot change your own role.</small>}
                    </div>
                )}

                <div className="d-flex justify-content-end mt-3">
                    <button type="button" className="btn btn-outline-secondary mr-2" disabled={busy} onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-lumiere" disabled={busy}>
                        {busy ? 'Saving...' : creating ? 'Add staff member' : 'Save changes'}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default UserDialog