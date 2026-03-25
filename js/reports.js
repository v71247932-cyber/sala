const reports = {
    sendMonthlyReport(athleteId) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;

        const score = dashboard.calculateScore(athlete.metrics);
        const rank = this.calculateRank(athleteId);

        const emailContent = `Salut, ${athlete.name}!
            
            Iată rezultatele tale pentru luna aceasta:
            - Scor Performanță: ${score}/100
            - Puncte Totale: ${dashboard.calculateTotalPoints(athlete)} p
            - Flotări (nr): ${athlete.metrics?.push_ups || 0}
            - Poziția în clasament: #${rank}
            
            Continuă să te antrenezi din greu!`;
        
        const subject = encodeURIComponent(`Raport Lunar de Performanță - ${athlete.name}`);
        const body = encodeURIComponent(emailContent);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${athlete.email}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
        
        alert(`Se deschide Gmail pentru trimiterea raportului către ${athlete.email}`);
    },

    sendInactivityEmail(athleteId) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;

        const emailContent = `Salut, ${athlete.name},
            
            Am observat că nu ai mai trecut pe la sală de peste o săptămână. 
            Te așteptăm cu drag la următorul antrenament!`;
        
        const subject = encodeURIComponent(`Ne e dor de tine, ${athlete.name}!`);
        const body = encodeURIComponent(emailContent);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${athlete.email}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
        
        alert(`Se deschide Gmail pentru a trimite mesajul către ${athlete.email}`);
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

        let top10Text = '';
        top10.forEach((a, i) => {
            top10Text += `${i + 1}. ${a.name} - ${dashboard.calculateTotalPoints(a)} p\n`;
        });

        const m = athlete.metrics || {};
        const bd = dashboard.getPointsBreakdown(athlete);
        let breakdownText = '\nDetalii puncte:\n';
        for (const [label, val] of Object.entries(bd)) {
            if (val > 0) breakdownText += `  ${label}: ${val}p\n`;
        }

        const emailContent = `Salut ${athlete.name}, ai luat locul #${rank}!

Clasament Top 10 (Puncte):
${top10Text}
Rezultatele tale:
Forța loviturii (kgf): ${m.punch_force || 0}
Săritura în lungime (cm): ${m.long_jump || 0}
Timp agățat (sec): ${m.hang_time || 0}
Plank (sec): ${m.plank || 0}
Forța strângerii (kg): ${m.grip_strength || 0}
Flotări (nr): ${m.push_ups || 0}
${breakdownText}
Total: ${dashboard.calculateTotalPoints(athlete)} puncte

Felicitări și continuă să te antrenezi din greu!`;

        const subject = encodeURIComponent(`Clasament Lunar FitGo & Rezultate - ${athlete.name}`);
        const body = encodeURIComponent(emailContent);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${athlete.email}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');

        alert(`Se deschide Gmail pentru trimiterea raportului către ${athlete.email}`);
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

        let top10Text = '';
        top10.forEach((a, i) => {
            top10Text += `${i + 1}. ${a.name} - ${dashboard.calculateTotalPoints(a)} p\n`;
        });

        const emailContent = `Salut campionilor!\n\nIată clasamentul Top 10 pe luna aceasta:\n\n${top10Text}\nFelicitări tuturor! Continuați să vă antrenați din greu!\n\nSistem de puncte:\n1 flotare = 2p | 1 sec plank = 1p | 1 cm săritură = 0.5p\n1 sec agățat = 2p | 1 kg strângere = 2p | 1 kgf lovitură = 0.5p\n1 prezență sală = 50p`;

        const subject = encodeURIComponent('Clasament Lunar Top 10 FitGo');
        const body = encodeURIComponent(emailContent);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${emails}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');

        alert(`Se deschide Gmail pentru trimiterea clasamentului către ${top10.length} sportivi.`);
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
