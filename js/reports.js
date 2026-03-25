const reports = {
    // Helper: open email with body pre-filled via mailto (works with any mail app)
    _openEmail(to, subject, body) {
        const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_self');
    },

    // Generate medal for rank
    _medal(rank) {
        if (rank === 1) return '\u{1F947}';  // 🥇
        if (rank === 2) return '\u{1F948}';  // 🥈
        if (rank === 3) return '\u{1F949}';  // 🥉
        return `#${rank}`;
    },

    // Build formatted top 10 text
    _buildTop10Text(top10) {
        const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
        let text = line + '\n';
        text += '  🏆  CLASAMENT TOP 10  🏆\n';
        text += line + '\n\n';

        top10.forEach((a, i) => {
            const medal = this._medal(i + 1);
            const pts = dashboard.calculateTotalPoints(a);
            const pad = i < 9 ? ' ' : '';
            text += `  ${medal} ${pad}${a.name}  ─  ${pts} puncte\n`;
        });

        text += '\n' + line;
        return text;
    },

    // Build formatted breakdown text for an athlete
    _buildBreakdownText(athlete) {
        const m = athlete.metrics || {};
        const line = '──────────────────────────────────────';
        const items = [
            ['💪 Flotări', m.push_ups || 0, 'nr', 2],
            ['🧱 Plank', m.plank || 0, 'sec', 1],
            ['🦘 Săritura', m.long_jump || 0, 'cm', 0.5],
            ['🔗 Timp agățat', m.hang_time || 0, 'sec', 2],
            ['✊ Forța strângerii', m.grip_strength || 0, 'kg', 2],
            ['👊 Forța loviturii', m.punch_force || 0, 'kgf', 0.5],
        ];

        let text = line + '\n';
        text += '  📊  DETALII PUNCTE\n';
        text += line + '\n\n';

        items.forEach(([label, val, unit, mult]) => {
            const pts = Math.round(val * mult);
            text += `  ${label}: ${val} ${unit} × ${mult}p = ${pts}p\n`;
        });

        const evtPts = athlete.points || 0;
        if (evtPts > 0) {
            text += `  🏃 Evenimente/Prezențe: ${evtPts}p\n`;
        }

        text += '\n' + line + '\n';
        text += `  ⭐ TOTAL: ${dashboard.calculateTotalPoints(athlete)} PUNCTE\n`;
        text += line;
        return text;
    },

    sendMonthlyReport(athleteId) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;

        const score = dashboard.calculateScore(athlete.metrics);
        const rank = this.calculateRank(athleteId);
        const totalPts = dashboard.calculateTotalPoints(athlete);

        const body = `Salut, ${athlete.name}! 👋

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📈  RAPORT LUNAR FitGo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🎯 Scor Performanță:  ${score}/100
  🏅 Poziția în clasament:  ${this._medal(rank)}
  ⭐ Puncte Totale:  ${totalPts}p

${this._buildBreakdownText(athlete)}

Continuă să te antrenezi din greu! 💪
Echipa FitGo`;

        this._openEmail(athlete.email, `📈 Raport Lunar de Performanță - ${athlete.name}`, body);
    },

    sendInactivityEmail(athleteId) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;

        const body = `Salut, ${athlete.name}! 👋

Am observat că nu ai mai trecut pe la sală de peste o săptămână.
Te așteptăm cu drag la următorul antrenament! 💪

Nu uita: fiecare prezență la sală = 50 de puncte! 🏆

Echipa FitGo`;

        this._openEmail(athlete.email, `Ne e dor de tine, ${athlete.name}! 💪`, body);
    },

    renderTop10() {
        const listContainer = document.getElementById('top10-list');
        const athletes = storage.getAthletes();
        const sorted = [...athletes].sort((a, b) => dashboard.calculateTotalPoints(b) - dashboard.calculateTotalPoints(a));
        const top10 = sorted.slice(0, 10);

        if (top10.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">Niciun sportiv momentan.</td></tr>';
            return;
        }

        listContainer.innerHTML = top10.map((a, index) => {
            const bd = dashboard.getPointsBreakdown(a);
            const breakdownHtml = Object.entries(bd)
                .filter(([, v]) => v > 0)
                .map(([label, val]) => `<span style="display:inline-block; background:rgba(0,210,255,0.08); padding:2px 8px; border-radius:4px; margin:2px; font-size:0.75rem;">${label}: <b>${val}p</b></span>`)
                .join('');

            return `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 1rem; font-weight: bold; font-size: 1.2rem; color: ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-muted)'}">#${index + 1}</td>
                <td style="padding: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <img src="${a.photo || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                    <div>
                        <div style="font-weight: 600;">${a.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
                    </div>
                </td>
                <td style="padding: 1rem;">${breakdownHtml || '<span style="color:var(--text-muted); font-size:0.8rem;">-</span>'}</td>
                <td style="padding: 1rem; font-weight: 600; color: var(--primary); font-size: 1.1rem;">${dashboard.calculateTotalPoints(a)} p</td>
                <td style="padding: 1rem;">
                    ${app.isAdmin ? `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="reports.sendTop10Report(${a.id})">Trimite Email</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    },

    sendTop10Report(athleteId) {
        const athletes = storage.getAthletes();
        const sorted = [...athletes].sort((a, b) => dashboard.calculateTotalPoints(b) - dashboard.calculateTotalPoints(a));
        const top10 = sorted.slice(0, 10);

        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;

        const rank = sorted.findIndex(a => a.id === athleteId) + 1;
        const totalPts = dashboard.calculateTotalPoints(athlete);

        const body = `Salut, ${athlete.name}! 👋

Felicitări, ai luat locul ${this._medal(rank)} în clasament!

${this._buildTop10Text(top10)}

${this._buildBreakdownText(athlete)}

Continuă să te antrenezi din greu! 💪
Echipa FitGo`;

        this._openEmail(athlete.email, `🏆 Clasament Lunar FitGo - Locul ${rank} - ${athlete.name}`, body);
    },

    sendTop10ToAll() {
        const athletes = storage.getAthletes();
        const sorted = [...athletes].sort((a, b) => dashboard.calculateTotalPoints(b) - dashboard.calculateTotalPoints(a));
        const top10 = sorted.slice(0, 10);

        if (top10.length === 0) {
            alert('Nu există sportivi în clasament.');
            return;
        }

        const emails = top10.map(a => a.email).join(',');

        const body = `Salut campionilor! 🏆👋

Iată clasamentul Top 10 pe luna aceasta:

${this._buildTop10Text(top10)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📋  SISTEM DE PUNCTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  💪 1 flotare = 2p
  🧱 1 sec plank = 1p
  🦘 1 cm săritură = 0.5p
  🔗 1 sec agățat = 2p
  ✊ 1 kg strângere = 2p
  👊 1 kgf lovitură = 0.5p
  🏃 1 prezență sală = 50p

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Felicitări tuturor! Continuați să vă antrenați din greu! 💪
Echipa FitGo`;

        this._openEmail(emails, '🏆 Clasament Lunar Top 10 FitGo', body);
    },

    calculateRank(athleteId) {
        const athletes = storage.getAthletes();
        const sorted = [...athletes].sort((a, b) => {
            return dashboard.calculateTotalPoints(b) - dashboard.calculateTotalPoints(a);
        });
        return sorted.findIndex(a => a.id === athleteId) + 1;
    },

    renderEvolutionChart(canvasId, historyData) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: historyData.dates,
                datasets: [{
                    label: 'Evoluție Scor',
                    data: historyData.scores,
                    borderColor: '#00d2ff',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(0, 210, 255, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    }
};
