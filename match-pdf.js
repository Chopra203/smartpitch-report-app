/**
 * match-pdf.js — Match Analysis Report PDF Generator
 */

// Wire up logo preview
setupLogoPreview('club_logo', 'logo-preview', 'logo-preview-wrap');

// Form submit handler
document.getElementById('matchForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic validation
    const matchDate = document.getElementById('match_date').value;
    const homeTeam = document.getElementById('home_team').value.trim();
    const awayTeam = document.getElementById('away_team').value.trim();

    if (!matchDate) {
        alert('Match Date is required before generating the report.');
        document.getElementById('match_date').focus();
        return;
    }
    if (!homeTeam || !awayTeam) {
        alert('Both Home Team and Away Team names are required.');
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
            competition: document.getElementById('competition').value,
            season: document.getElementById('season').value.trim(),
            match_date: matchDate,
            venue: document.getElementById('venue').value.trim(),
            weather_pitch_conditions: document.getElementById('weather_pitch_conditions').value.trim(),
            home_team: homeTeam,
            away_team: awayTeam,
            final_score_home: document.getElementById('final_score_home').value.trim(),
            final_score_away: document.getElementById('final_score_away').value.trim(),
            home_formation_initial: document.getElementById('home_formation_initial').value,
            away_formation_initial: document.getElementById('away_formation_initial').value,
            home_lineup_notes: document.getElementById('home_lineup_notes').value.trim(),
            away_lineup_notes: document.getElementById('away_lineup_notes').value.trim(),
            home_attacking_phase: document.getElementById('home_attacking_phase').value.trim(),
            home_defensive_phase: document.getElementById('home_defensive_phase').value.trim(),
            home_key_transitions: document.getElementById('home_key_transitions').value.trim(),
            away_attacking_phase: document.getElementById('away_attacking_phase').value.trim(),
            away_defensive_phase: document.getElementById('away_defensive_phase').value.trim(),
            away_key_transitions: document.getElementById('away_key_transitions').value.trim(),
            overall_match_summary: document.getElementById('overall_match_summary').value.trim(),
            key_turning_points: document.getElementById('key_turning_points').value.trim(),
            man_of_the_match: document.getElementById('man_of_the_match').value.trim(),
            final_analyst_notes: document.getElementById('final_analyst_notes').value.trim(),
        };

        await generateMatchPDF(data, logoDataUrl);
    } catch (err) {
        console.error('PDF generation failed:', err);
        alert('Something went wrong while generating the PDF. Please try again.');
    } finally {
        hideLoading();
    }
});

async function generateMatchPDF(d, logoDataUrl) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const HEADER_H = 16;
    const START_Y = HEADER_H + 6;
    let y = START_Y;

    // Score string
    const scoreHome = d.final_score_home !== '' ? d.final_score_home : '–';
    const scoreAway = d.final_score_away !== '' ? d.final_score_away : '–';
    const scoreStr = `${scoreHome}  :  ${scoreAway}`;

    // ── Report Title ───────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...PDF_COLORS.black);
    doc.text('Match Analysis Report', PAGE_W / 2, y + 6, { align: 'center' });
    y += 12;

    // Match subtitle: Home vs Away
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.primary);
    doc.text(`${d.home_team}  vs  ${d.away_team}`, PAGE_W / 2, y + 2, { align: 'center' });
    y += 7;

    // Score
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text(scoreStr, PAGE_W / 2, y + 5, { align: 'center' });
    y += 12;

    // ── Section 1: Match Information ──────────────────────────────────────
    y = drawSectionTitle(doc, '1. Match Information', y);

    y = drawVitalsTable(doc, [
        ['Competition', val(d.competition), 'Season', val(d.season)],
        ['Match Date', formatDate(d.match_date), 'Venue', val(d.venue)],
        ['Home Team', val(d.home_team), 'Away Team', val(d.away_team)],
        ['Final Score', d.final_score_home !== '' ? `${d.final_score_home} – ${d.final_score_away}` : '—',
         'Weather / Pitch', val(d.weather_pitch_conditions)],
    ], y);

    // ── Section 2: Team & Player Setup ───────────────────────────────────
    y = checkPageBreak(doc, y, 50, HEADER_H);
    y = drawSectionTitle(doc, '2. Team & Player Setup', y);

    y = drawVitalsTable(doc, [
        ['Home Formation', val(d.home_formation_initial), 'Away Formation', val(d.away_formation_initial)],
    ], y);

    const setupRows = [];
    if (d.home_lineup_notes) setupRows.push(['Home Lineup Notes', val(d.home_lineup_notes)]);
    if (d.away_lineup_notes) setupRows.push(['Away Lineup Notes', val(d.away_lineup_notes)]);
    if (setupRows.length) y = drawLabelValueTable(doc, setupRows, y);

    // ── Section 3: Tactical Analysis ─────────────────────────────────────
    y = checkPageBreak(doc, y, 50, HEADER_H);
    y = drawSectionTitle(doc, '3. Tactical Analysis', y);

    // Home Team sub-header
    doc.setFillColor(...PDF_COLORS.primaryLight);
    doc.roundedRect(MARGIN, y, CONTENT_W, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text('HOME TEAM', MARGIN + 3, y + 4.3);
    y += 9;

    const homeTacticRows = [
        ['Attacking Phase (In Possession)', val(d.home_attacking_phase)],
        ['Defensive Phase (Out of Possession)', val(d.home_defensive_phase)],
        ['Key Transitions', val(d.home_key_transitions)],
    ];
    y = drawLabelValueTable(doc, homeTacticRows, y);

    y = checkPageBreak(doc, y, 20, HEADER_H);
    // Away Team sub-header
    doc.setFillColor(...PDF_COLORS.primaryLight);
    doc.roundedRect(MARGIN, y, CONTENT_W, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.primaryDark);
    doc.text('AWAY TEAM', MARGIN + 3, y + 4.3);
    y += 9;

    const awayTacticRows = [
        ['Attacking Phase (In Possession)', val(d.away_attacking_phase)],
        ['Defensive Phase (Out of Possession)', val(d.away_defensive_phase)],
        ['Key Transitions', val(d.away_key_transitions)],
    ];
    y = drawLabelValueTable(doc, awayTacticRows, y);

    // ── Section 4: Match Summary & Insights ───────────────────────────────
    y = checkPageBreak(doc, y, 50, HEADER_H);
    y = drawSectionTitle(doc, '4. Match Summary & Insights', y);

    const summaryRows = [
        ['Overall Match Summary', val(d.overall_match_summary)],
        ['Key Turning Point(s)', val(d.key_turning_points)],
        ['Man of the Match', val(d.man_of_the_match)],
        ['Final Analyst Notes', val(d.final_analyst_notes)],
    ];
    y = drawLabelValueTable(doc, summaryRows, y);

    // ── Apply headers/footers then save ────────────────────────────────────
    applyHeadersFooters(doc, 'Match Analysis Report', logoDataUrl);

    const safeHome = d.home_team.replace(/\s+/g, '_');
    const safeAway = d.away_team.replace(/\s+/g, '_');
    const dateStr = d.match_date || new Date().toISOString().slice(0, 10);
    doc.save(`Match_Report_${safeHome}_vs_${safeAway}_${dateStr}.pdf`);
}

/** Check if we need to add a new page */
function checkPageBreak(doc, y, minSpace, headerH) {
    if (y + minSpace > PAGE_H - 14) {
        doc.addPage();
        return headerH + 6;
    }
    return y;
}
