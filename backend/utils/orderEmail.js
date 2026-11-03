// Emails the customer the updated transaction: the items, the subtotal, the grand total, and a PDF receipt attached.
const sendEmail = require('./sendEmail');
const { buildReceiptPdf } = require('./receiptPdf');
const { paymentLabel } = require('./payment');

const esc = (value) => String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const peso = (n) => `₱${Number(n || 0).toFixed(2)}`;

// returns true when an email was sent, false when the order has no email address (walk-in orders)
const notifyCustomerOfOrder = async (order) => {
    const to = order.customer && order.customer.email;
    if (!to) return false;

    const items = order.items || [];
    const cancelled = order.status === 'Cancelled';
    const subject = `Kafé Lumière: order ${order.orderNumber} is now ${order.status}`;

    const textLines = [
        `Hi ${order.customer.name || 'there'},`,
        '',
        `Your order ${order.orderNumber} has been updated.`,
        `Status: ${order.status}`,
        `Payment: ${paymentLabel(order.paymentMethod)} (${order.paymentStatus})`,
        '',
        'Items:',
        ...items.map(i => `  ${i.quantity} x ${i.name} @ ${peso(i.price)} = ${peso(i.lineTotal)}`),
        '',
        `Subtotal: ${peso(order.subtotal)}`,
        `Grand total: ${peso(order.total)}`,
    ];
    if (cancelled && order.cancelReason) textLines.push('', `Reason: ${order.cancelReason}`);
    textLines.push('', 'The receipt is attached as a PDF. Thank you for ordering with us!');

    const rows = items.map(i => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${esc(i.name)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${esc(i.quantity)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${peso(i.price)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${peso(i.lineTotal)}</td>
        </tr>`).join('');

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#333">
        <h2 style="margin:0 0 8px">Kafé Lumière</h2>
        <p>Hi ${esc(order.customer.name || 'there')},</p>
        <p>Your order <strong>${esc(order.orderNumber)}</strong> has been updated.
           Status: <strong>${esc(order.status)}</strong><br>
           Payment: ${esc(paymentLabel(order.paymentMethod))} (${esc(order.paymentStatus)})</p>
        ${cancelled && order.cancelReason ? `<p><strong>Reason:</strong> ${esc(order.cancelReason)}</p>` : ''}
        <table style="border-collapse:collapse;width:100%;max-width:560px">
          <thead>
            <tr style="background:#f5efe6">
              <th style="padding:6px 8px;text-align:left">Item</th>
              <th style="padding:6px 8px">Qty</th>
              <th style="padding:6px 8px;text-align:right">Price</th>
              <th style="padding:6px 8px;text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3" style="padding:6px 8px;text-align:right">Subtotal</td><td style="padding:6px 8px;text-align:right">${peso(order.subtotal)}</td></tr>
            <tr><td colspan="3" style="padding:6px 8px;text-align:right"><strong>Grand total</strong></td><td style="padding:6px 8px;text-align:right"><strong>${peso(order.total)}</strong></td></tr>
          </tfoot>
        </table>
        <p>The receipt is attached as a PDF. Thank you for ordering with us!</p>
      </div>`;

    await sendEmail({
        to,
        subject,
        text: textLines.join('\n'),
        html,
        attachments: [{
            filename: `receipt-${order.orderNumber}.pdf`,
            content: buildReceiptPdf(order),
            contentType: 'application/pdf',
        }],
    });
    return true;
};

module.exports = { notifyCustomerOfOrder };
