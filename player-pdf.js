/**
 * player-pdf.js — Player Performance Report PDF Generator
 */

// Wire up logo preview
setupLogoPreview('club_logo', 'logo-preview', 'logo-preview-wrap');

// Form submit handler
document.getElementById('playerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic validation
    const playerName = document.getElementById('player_name').value.trim();
    if (!playerName) {
        alert('Player Name is required before generating the report.');
        document.getElementById('player_name').focus();
        return;
    }

    showLoading();

    try {
        // Read logo if uploaded
        let logoDataUrl = null;
        const logoFile = document.getElementById('club_logo').files[0];
        if (logoFile) {
            logoDataUrl = await readFileAsDataURL(logoFile);
        }

        // Gather all form values
        const data = {
            player_name: playerName,
            coach_name: document.getElementById('coach_name').value.trim(),
            player_team: document.getElementById('player_team').value.trim(),
            sub_team: document.getElementById('sub_team').value.trim(),
            jersey_number: document.getElementById('jersey_number').value.trim(),
            position: document.getElementById('position').value.trim(),
            height: document.getElementById('height').value.trim(),
            weight: document.getElementById('weight').value.trim(),
            dob: document.getElementById('dob').value,
            preferred_foot: document.getElementById('preferred_foot').value,
            primary_positions: document.getElementById('primary_positions').value.trim(),
            report_period_start: document.getElementById('report_period_start').value,
            report_period_end: document.getElementById('report_period_end').value,
            matches_covered: document.getElementById('matches_covered').value.trim(),
            matches_played: document.getElementById('matches_played').value.trim(),
            total_minutes_played: document.getElementById('total_minutes_played').value.trim(),
            goals: document.getElementById('goals').value.trim(),
            assists: document.getElementById('assists').value.trim(),
            technical_tactical_notes: document.getElementById('technical_tactical_notes').value.trim(),
            physical_notes: document.getElementById('physical_notes').value.trim(),
            psychological_notes: document.getElementById('psychological_notes').value.trim(),
            social_notes: document.getElementById('social_notes').value.trim(),
            overall_performance_summary: document.getElementById('overall_performance_summary').value.trim(),
            key_strengths_exhibited: document.getElementById('key_strengths_exhibited').value.trim(),
            primary_areas_development: document.getElementById('primary_areas_development').value.trim(),
            recommended_action_plan: document.getElementById('recommended_action_plan').value.trim(),
        };

        await generatePlayerPDF(data, logoDataUrl);
    } catch (err) {
        console.error('PDF generation failed:', err);
        alert('Something went wrong while generating the PDF. Please try again.');
    } finally {
        hideLoading();
    }
});

async function generatePlayerPDF(d, logoDataUrl) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const HEADER_H = 16;
    const START_Y = HEADER_H + 6;
    let y = START_Y;

    // ── Report Title ───────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...PDF_COLORS.black);
    doc.text('Player Performance Report', PAGE_W / 2, y + 6, { align: 'center' });
    y += 12;

    // Player name sub-title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(d.player_name, PAGE_W / 2, y + 2, { align: 'center' });
    y += 9;

    // ── Section 1: Player Profile ──────────────────────────────────────────
    y = drawSectionTitle(doc, '1. Player Profile', y);

    y = drawVitalsTable(doc, [
        ['Player Name', val(d.player_name), 'Jersey Number', val(d.jersey_number)],
        ["Coach's Name", val(d.coach_name), 'Current Team', val(d.player_team)],
        ['Position', val(d.position), 'Other Positions', val(d.primary_positions)],
        ['Sub-Team', val(d.sub_team), 'Date of Birth', formatDate(d.dob)],
        ['Height (cm)', val(d.height), 'Weight (kg)', val(d.weight)],
        ['Preferred Foot', val(d.preferred_foot), 'Reporting Period',
            d.report_period_start ? `${formatDate(d.report_period_start)} – ${formatDate(d.report_period_end)}` : '—'],
    ], y);

    if (d.matches_covered) {
        y = drawLabelValueTable(doc, [['Matches Covered', val(d.matches_covered)]], y);
    }

    // ── Section 2: Performance Overview ───────────────────────────────────
    y = checkPageBreak(doc, y, 40, HEADER_H);
    y = drawSectionTitle(doc, '2. Performance Overview (Objective Metrics)', y);

    y = drawVitalsTable(doc, [
        ['Matches Played', val(d.matches_played), 'Total Minutes', val(d.total_minutes_played)],
        ['Goals', val(d.goals), 'Assists', val(d.assists)],
    ], y);

    // ── Section 3: 4-Corner Assessment ────────────────────────────────────
    y = checkPageBreak(doc, y, 50, HEADER_H);
    y = drawSectionTitle(doc, '3. 4-Corner Player Assessment', y);

    const cornerRows = [
        ['Technical / Tactical', val(d.technical_tactical_notes)],
        ['Physical Attributes', val(d.physical_notes)],
        ['Psychological', val(d.psychological_notes)],
        ['Social', val(d.social_notes)],
    ];
    y = drawLabelValueTable(doc, cornerRows, y);

    // ── Section 4: Development & Action Plan ─────────────────────────────
    y = checkPageBreak(doc, y, 50, HEADER_H);
    y = drawSectionTitle(doc, '4. Development Summary & Action Plan', y);

    const devRows = [
        ['Performance Summary', val(d.overall_performance_summary)],
        ['Key Strengths', val(d.key_strengths_exhibited)],
        ['Areas for Improvement', val(d.primary_areas_development)],
        ['Recommended Plan', val(d.recommended_action_plan)],
    ];
    y = drawLabelValueTable(doc, devRows, y);

    // ── Apply headers/footers then save ────────────────────────────────────
    applyHeadersFooters(doc, 'Player Performance Report', logoDataUrl);

    const safeName = d.player_name.replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`Player_Report_${safeName}_${dateStr}.pdf`);
}

/** Check if we need to add a new page */
function checkPageBreak(doc, y, minSpace, headerH) {
    if (y + minSpace > PAGE_H - 14) {
        doc.addPage();
        return headerH + 6;
    }
    return y;
}
