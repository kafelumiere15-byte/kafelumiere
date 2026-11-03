// Sends the standard auth response: { success, token, user }
const sendToken = (user, statusCode, res) => {
    const token = user.getJwtToken();
    // never send the password hash back
    const safeUser = user.toObject();
    delete safeUser.password;
    delete safeUser.__v;

    return res.status(statusCode).json({ success: true, token, user: safeUser })
}

module.exports = sendToken
