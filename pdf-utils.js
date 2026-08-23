/**
 * pdf-utils.js — Shared helpers for SmartPitch PDF generation
 */

// ─── Colours ───────────────────────────────────────────────────────────────
const PDF_COLORS = {
    primary: [16, 185, 129],      // Emerald 500
    primaryDark: [6, 78, 59],     // Emerald 900
    primaryLight: [209, 250, 229],// Emerald 100
    white: [255, 255, 255],
    black: [15, 23, 42],          // Slate 900
    textMuted: [100, 116, 139],   // Slate 500
    border: [226, 232, 240],      // Slate 200
    bgLight: [248, 250, 252],     // Slate 50
    rowAlt: [236, 253, 245],      // Emerald 50
    labelBg: [16, 185, 129],      // Emerald 500 — label column
};

// Page dimensions (A4 portrait)
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Utility ────────────────────────────────────────────────────────────────

/** Format a YYYY-MM-DD date string to DD/MM/YYYY */
function formatDate(str) {
    if (!str) return '—';
    try {
        const [y, m, d] = str.split('-');
        return `${d}/${m}/${y}`;
    } catch { return str; }
}

/** Truncate / sanitize a string value */
function val(v) {
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
}

/** Read file as base64 data URL */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ─── PDF Header / Footer ────────────────────────────────────────────────────

/**
 * Draw a page header on the current page.
 * @param {jsPDF} doc
 * @param {string} reportTitle  — small label on right
 * @param {string|null} logoDataUrl — base64 logo
 * @param {number} pageNum
 * @param {number} totalPages
 */
function drawHeader(doc, reportTitle, logoDataUrl, pageNum, totalPages) {
    const headerH = 16;
    const y = 0;

    // Clean green top bar
    doc.setFillColor(...PDF_COLORS.primary);
    doc.rect(0, y, PAGE_W, headerH, 'F');

    // Club logo centred (if uploaded)
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'PNG', PAGE_W / 2 - 6, y + 2, 12, 12, undefined, 'FAST');
        } catch (e) { /* skip */ }
    }

    // Thin separator line below header
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, headerH, PAGE_W - MARGIN, headerH);
}

/**
 * Draw a footer on the current page.
 * @param {jsPDF} doc
 */
function drawFooter(doc, pageNum, totalPages) {
    const y = PAGE_H - 8;

    // Separator line
    doc.setDrawColor(...PDF_COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);

    doc.setFontSize(7.5);

    // Left: SmartPitch Report Generator
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_COLORS.textMuted);
    doc.text('SmartPitch Report Generator', MARGIN, y + 4);

    // Right: Page X of Y  |  DD/MM/YYYY
    const today = new Date().toLocaleDateString('en-GB');
    doc.text(`Page ${pageNum} of ${totalPages}  |  ${today}`, PAGE_W - MARGIN, y + 4, { align: 'right' });
}

/**
 * Apply header/footer to all pages in the doc.
 * Call AFTER doc.save() is about to be called.
 */
function applyHeadersFooters(doc, reportTitle, logoDataUrl) {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        drawHeader(doc, reportTitle, logoDataUrl, i, total);
        drawFooter(doc, i, total);
    }
}

// ─── Section Title ───────────────────────────────────────────────────────────

/**
 * Draw a bold section heading bar and return new Y position.
 */
function drawSectionTitle(doc, title, y) {
    doc.setFillColor(...PDF_COLORS.primaryDark);
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...PDF_COLORS.white);
    doc.text(title.toUpperCase(), MARGIN + 4, y + 5.5);
    return y + 12;
}

// ─── Table Builders ─────────────────────────────────────────────────────────

/**
 * Build a 2-column label/value autoTable.
 * @param {jsPDF} doc
 * @param {Array<[string, string]>} rows — [ [label, value], ... ]
 * @param {number} startY
 * @returns {number} finalY after table
 */
function drawLabelValueTable(doc, rows, startY) {
    doc.autoTable({
        startY,
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: CONTENT_W,
        columnStyles: {
            0: { cellWidth: CONTENT_W * 0.32, fontStyle: 'bold', fillColor: PDF_COLORS.labelBg, textColor: PDF_COLORS.white, fontSize: 8.5 },
            1: { cellWidth: CONTENT_W * 0.68, textColor: PDF_COLORS.black, fontSize: 8.5 },
        },
        body: rows,
        theme: 'plain',
        styles: {
            lineColor: PDF_COLORS.border,
            lineWidth: 0.25,
            cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
            valign: 'top',
            overflow: 'linebreak',
        },
        alternateRowStyles: { fillColor: PDF_COLORS.bgLight },
        didParseCell: (data) => {
            if (data.column.index === 0) {
                data.cell.styles.fillColor = PDF_COLORS.labelBg;
                data.cell.styles.textColor = PDF_COLORS.white;
            }
        },
    });
    return doc.lastAutoTable.finalY + 4;
}

/**
 * Build a multi-column vitals/stats grid table.
 * @param {jsPDF} doc
 * @param {Array<[string, string, string, string]>} rows — pairs: [label, value, label, value]
 * @param {number} startY
 */
function drawVitalsTable(doc, rows, startY) {
    const cw = CONTENT_W / 4;
    doc.autoTable({
        startY,
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: CONTENT_W,
        columnStyles: {
            0: { cellWidth: cw * 0.9, fontStyle: 'bold', fillColor: PDF_COLORS.labelBg, textColor: PDF_COLORS.white, fontSize: 8 },
            1: { cellWidth: cw * 1.1, textColor: PDF_COLORS.black, fontSize: 8.5 },
            2: { cellWidth: cw * 0.9, fontStyle: 'bold', fillColor: PDF_COLORS.labelBg, textColor: PDF_COLORS.white, fontSize: 8 },
            3: { cellWidth: cw * 1.1, textColor: PDF_COLORS.black, fontSize: 8.5 },
        },
        body: rows,
        theme: 'plain',
        styles: {
            lineColor: PDF_COLORS.border,
            lineWidth: 0.25,
            cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
            valign: 'middle',
            overflow: 'linebreak',
        },
        alternateRowStyles: { fillColor: PDF_COLORS.bgLight },
        didParseCell: (data) => {
            if (data.column.index === 0 || data.column.index === 2) {
                data.cell.styles.fillColor = PDF_COLORS.labelBg;
                data.cell.styles.textColor = PDF_COLORS.white;
            }
        },
    });
    return doc.lastAutoTable.finalY + 4;
}

// ─── Logo preview utility ─────────────────────────────────────────────────────

/** Wire up logo file input to show preview image */
function setupLogoPreview(inputId, previewImgId, wrapId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewImgId);
    const wrap = document.getElementById(wrapId);
    if (!input) return;
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            preview.src = url;
            wrap.style.display = 'flex';
        } else {
            wrap.style.display = 'none';
        }
    });
}

// ─── Overlay helpers ──────────────────────────────────────────────────────────
function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}
function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}
