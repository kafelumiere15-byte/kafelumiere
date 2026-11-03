// A small dependency-free PDF writer for the order receipt (Helvetica, one page sized to fit
// the order - a 1-item order gets a short receipt, a big order gets a taller one, capped at A4).
// The standard PDF fonts have no peso sign, so amounts are written as "PHP 120.00".
const { paymentLabel } = require('./payment');

const MANILA = { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' };
const MAX_ROWS = 25;
const PAGE_W = 595;          // A4 width, in points
const A4_H = 842;            // A4 height - the tallest a receipt can be
const MIN_H = 460;           // the shortest a receipt can be, so a 1-item order still looks balanced
const BOTTOM_MARGIN = 26;

const money = (n) => `PHP ${Number(n || 0).toFixed(2)}`;

// keep only characters the PDF's WinAnsi encoding can show (é, ñ, … are fine)
const latin = (value) => String(value === undefined || value === null ? '' : value)
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');

// escape the characters that have a meaning inside a PDF string
const pdfString = (value) => latin(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const truncate = (value, max) => {
    const text = latin(value);
    return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

// brand colors (coffee brown header, warm cream accent, soft grey rules)
const BROWN = [0.29, 0.18, 0.09];
const CREAM = [0.96, 0.92, 0.85];
const GREY = [0.55, 0.55, 0.55];
const LIGHT_GREY = [0.88, 0.88, 0.88];
const WHITE = [1, 1, 1];
const DARK = [0.15, 0.15, 0.15];

// Helvetica's official per-character widths (units per 1000 em), for the small set of
// characters the numeric columns ever use ("PHP 120.00", "3", ...) - just enough to
// right-align those columns like a real receipt, without a PDF/font library.
const HELV_WIDTH = { ' ': 278, '.': 278, 'P': 667, 'H': 722, '-': 333 };
for (let d = 0; d <= 9; d += 1) HELV_WIDTH[String(d)] = 556;
const textWidth = (value, size) => {
    let units = 0;
    for (const ch of String(value)) units += HELV_WIDTH[ch] !== undefined ? HELV_WIDTH[ch] : 556;
    return (units * size) / 1000;
};

// Every drawing command is recorded as "draw this at this y, measured down from the top of
// a reference A4 page" rather than an absolute y. Once we know how tall the content actually
// is, we pick the real page height and shift everything down by the difference - so a short
// receipt doesn't leave a big empty gap between the items and the footer.
const pageContent = (order) => {
    const ops = [];                                   // array of (shift) => "pdf op string"
    const fillColor = ([r, g, b]) => ops.push(() => `${r} ${g} ${b} rg`);
    const strokeColor = ([r, g, b]) => ops.push(() => `${r} ${g} ${b} RG`);
    const lineWidth = (w) => ops.push(() => `${w} w`);
    const rect = (x, y, w, h, mode = 'f') => ops.push((shift) => `${x} ${y + shift} ${w} ${h} re ${mode}`);
    const box = (x, y, w, h, fill, stroke = LIGHT_GREY) => {
        fillColor(fill);
        rect(x, y, w, h);
        strokeColor(stroke);
        lineWidth(0.75);
        rect(x, y, w, h, 'S');
    };
    const text = (x, y, size, value, bold = false, color = DARK) => {
        fillColor(color);
        ops.push((shift) => `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y + shift} Td (${pdfString(value)}) Tj ET`);
    };
    // right-aligned at xEnd - used for the Qty/Price/Amount/totals columns, like a ledger
    const textR = (xEnd, y, size, value, bold = false, color = DARK) => {
        text(xEnd - textWidth(value, size), y, size, value, bold, color);
    };
    const rule = (y, from = 50, to = 545, color = LIGHT_GREY, width = 0.75) => {
        strokeColor(color);
        lineWidth(width);
        ops.push((shift) => `${from} ${y + shift} m ${to} ${y + shift} l S`);
    };

    const paid = order.paymentStatus === 'paid';
    const cancelled = order.status === 'Cancelled';
    const when = new Intl.DateTimeFormat('en-PH', MANILA).format(new Date(order.createdAt || Date.now()));

    // header band (y measured down from the reference A4 top, 842)
    fillColor(BROWN);
    rect(0, 760, PAGE_W, 82);
    text(50, 805, 22, 'Kafe Lumiere', true, WHITE);
    text(50, 786, 10, 'Coffee and Milk Tea Shop', false, CREAM);
    textR(545, 805, 14, 'RECEIPT', true, WHITE);

    // order info card - the number of lines is known up front, so the card's height can be
    // worked out before drawing it, and the card is drawn (and so painted) before its text
    const info = [
        ['Order number', order.orderNumber],
        ['Date', when],
        ['Customer', order.customer && order.customer.name],
        ['Email', order.customer && order.customer.email],
        ['Status', cancelled ? 'Cancelled' : order.status],
        ['Payment', `${paymentLabel(order.paymentMethod)} - ${paid ? 'Paid' : 'Not yet paid'}`],
    ];
    const hasReason = cancelled && Boolean(order.cancelReason);
    const infoTop = 724;
    const infoBottom = infoTop - 18 - info.length * 16 - (hasReason ? 18 : 2);
    box(50, infoBottom, 495, infoTop - infoBottom + 8, CREAM);

    let y = infoTop - 18;
    info.forEach(([label, value]) => {
        text(66, y, 10, `${label}:`, true, BROWN);
        text(166, y, 10, truncate(value || '-', 55), false, DARK);
        y -= 16;
    });
    if (hasReason) {
        y -= 2;
        text(66, y, 10, `Reason: ${truncate(order.cancelReason, 90)}`, false, DARK);
        y -= 16;
    }

    // items table
    y = infoBottom - 20;
    fillColor(BROWN);
    rect(50, y - 4, 495, 22);
    text(60, y + 2, 10, 'Item', true, WHITE);
    textR(360, y + 2, 10, 'Qty', true, WHITE);
    textR(430, y + 2, 10, 'Price', true, WHITE);
    textR(545, y + 2, 10, 'Amount', true, WHITE);
    y -= 22;

    const items = order.items || [];
    const rows = items.slice(0, MAX_ROWS);
    rows.forEach((item, i) => {
        y -= 20;
        if (i % 2 === 1) {
            fillColor(CREAM);
            rect(50, y - 5, 495, 20);
        }
        text(60, y, 10, truncate(item.name, 42));
        textR(360, y, 10, String(item.quantity));
        textR(430, y, 10, money(item.price));
        textR(545, y, 10, money(item.lineTotal));
    });
    if (items.length > MAX_ROWS) {
        y -= 20;
        text(60, y, 10, `... and ${items.length - MAX_ROWS} more item(s)`, false, GREY);
    }
    y -= 10;
    rule(y, 50, 545, LIGHT_GREY, 1);

    // totals box - like the info card, its height is known up front (whether a cash tender
    // line is needed is known already), so it's drawn before its text, not after
    const hasTender = paid && order.amountTendered !== undefined && order.amountTendered !== null;
    const totalsTop = y - 10;
    const totalsBottom = totalsTop - 10 - 20 - 10 - (hasTender ? 12 + 16 + 10 : 0);
    box(330, totalsBottom, 215, totalsTop - totalsBottom, CREAM);

    y = totalsTop - 10;
    text(345, y, 10, 'Subtotal', true, BROWN);
    textR(545, y, 10, money(order.subtotal));
    y -= 20;
    text(345, y, 12, 'Grand total', true, BROWN);
    textR(545, y, 12, money(order.total), true, BROWN);
    y -= 10;

    if (hasTender) {
        y -= 12;
        text(345, y, 10, 'Received', false, DARK);
        textR(545, y, 10, money(order.amountTendered));
        y -= 16;
        text(345, y, 10, 'Change', false, DARK);
        textR(545, y, 10, money(order.change));
        y -= 10;
    }

    // footer band sits right under the content, not pinned to a fixed spot on the page
    const footerTop = totalsBottom - 24;
    const footerH = 40;
    const footerBottom = footerTop - footerH;
    fillColor(BROWN);
    rect(0, footerBottom, PAGE_W, footerH);
    text(50, footerBottom + 22, 11, 'Thank you for ordering with Kafe Lumiere!', true, WHITE);
    text(50, footerBottom + 8, 9, 'Keep this receipt for your records.', false, CREAM);

    // pick the real page height from how much content there actually was, then shift
    // every recorded op down so the content lines up against the new top of the page
    const naturalHeight = (A4_H - footerBottom) + BOTTOM_MARGIN;
    const pageHeight = Math.max(MIN_H, Math.min(A4_H, naturalHeight));
    const shift = pageHeight - A4_H;

    return { content: ops.map((draw) => draw(shift)).join('\n'), pageHeight };
};

// wraps the page content in the PDF file structure (objects, cross-reference table, trailer)
const writePdf = (content, pageHeight) => {
    const stream = Buffer.from(content, 'latin1');
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${pageHeight}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
        `<< /Length ${stream.length} >>\nstream\n${content}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ];

    const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1');
    const parts = [header];
    const offsets = [];
    let offset = header.length;
    objects.forEach((body, i) => {
        const chunk = Buffer.from(`${i + 1} 0 obj\n${body}\nendobj\n`, 'latin1');
        offsets.push(offset);
        parts.push(chunk);
        offset += chunk.length;
    });

    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((o) => { xref += `${String(o).padStart(10, '0')} 00000 n \n`; });
    xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
    parts.push(Buffer.from(xref, 'latin1'));

    return Buffer.concat(parts);
};

// order: a plain object (order.toObject()) with items, subtotal, total, customer, status, ...
const buildReceiptPdf = (order) => {
    const { content, pageHeight } = pageContent(order);
    return writePdf(content, pageHeight);
};

module.exports = { buildReceiptPdf };