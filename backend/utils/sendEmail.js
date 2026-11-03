// Sends email through the SMTP account in config/.env (SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD, ...)
const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT) || 587;
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465,
            auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
        });
    }
    return transporter;
};

const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        throw new Error('Email is not configured (SMTP settings are missing in config/.env)');
    }
    const fromName = process.env.SMTP_FROM_NAME || 'Kafé Lumière';
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL;
    return getTransporter().sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
        attachments,
    });
};

module.exports = sendEmail;
