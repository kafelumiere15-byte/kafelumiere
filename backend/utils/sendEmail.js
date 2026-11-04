// Sends email via Brevo's HTTPS API (https://developers.brevo.com) instead of raw SMTP.
// Switched from nodemailer+SMTP because Render's free tier blocks/times out outbound SMTP
// connections (both port 587 and 465 timed out), while plain HTTPS - which this uses - works
// fine. Needs BREVO_API_KEY in config/.env: sign up free at brevo.com, verify a sender email
// under Senders, Domains & Dedicated IPs -> Senders, then create an API key under
// Settings -> SMTP & API -> API Keys.

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const toBase64 = (content) => (Buffer.isBuffer(content) ? content : Buffer.from(String(content))).toString('base64');

const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL;
    const fromName = process.env.SMTP_FROM_NAME || 'Kafé Lumière';

    if (!apiKey || !fromEmail) {
        throw new Error('Email is not configured (BREVO_API_KEY / SMTP_FROM_EMAIL are missing in config/.env)');
    }

    const body = {
        sender: { email: fromEmail, name: fromName },
        to: [{ email: to }],
        subject,
    };

    // Brevo requires htmlContent (or textContent); prefer html, fall back to plain text wrapped in <pre>
    if (html) {
        body.htmlContent = html;
    } else if (text) {
        body.textContent = text;
    } else {
        body.textContent = ' ';
    }
    if (text) body.textContent = text;

    if (attachments.length > 0) {
        body.attachment = attachments.map((a) => ({
            name: a.filename,
            content: toBase64(a.content),
        }));
    }

    const res = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Brevo error ${res.status}: ${detail.slice(0, 300)}`);
    }
};

module.exports = sendEmail;
