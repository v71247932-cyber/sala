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
            - Nr. Antrenamente: ${athlete.trainings || 0}
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
        // Top 10 by points
        const sorted = [...athletes].sort((a, b) => (b.points || 0) - (a.points || 0));
        const top10 = sorted.slice(0, 10);

        if (top10.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted);">Niciun sportiv momentan.</td></tr>';
            return;
        }

        listContainer.innerHTML = top10.map((a, index) => `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 1rem; font-weight: bold; font-size: 1.2rem; color: ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'var(--text-muted)'}">#${index + 1}</td>
                <td style="padding: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <img src="${a.photo || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                    <div>
                        <div style="font-weight: 600;">${a.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
                    </div>
                </td>
                <td style="padding: 1rem; font-weight: 600; color: var(--primary);">${dashboard.calculateTotalPoints(a)} p</td>
                <td style="padding: 1rem;">
                    ${app.isAdmin ? `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="reports.sendTop10Report(${a.id})">Trimite Email</button>` : ''}
                </td>
            </tr>
        `).join('');
    },

    sendTop10Report(athleteId) {
        const athletes = storage.getAthletes();
        const sorted = [...athletes].sort((a, b) => (b.points || 0) - (a.points || 0));
        const top10 = sorted.slice(0, 10);
        
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;
        
        const rank = sorted.findIndex(a => a.id === athleteId) + 1;
        
        let top10Text = '';
        top10.forEach((a, i) => {
            top10Text += `${i + 1}. ${a.name} - ${dashboard.calculateTotalPoints(a)} p\n`;
        });

        const m = athlete.metrics || {};
        const emailContent = `Salut *${athlete.name}* ai luat locul *${rank}* ,
        
Clasament Top 10 (Puncte):
${top10Text}
Forța loviturii (kgf): ${m.punch_force || 0}
Săritura în lungime (cm): ${m.long_jump || 0}
Timp agățat (sec): ${m.hang_time || 0}
Plank (sec): ${m.plank || 0}
Forța strângerii (kg): ${m.grip_strength || 0}
Flotări (nr): ${m.push_ups || 0}
Nr. Antrenamente: ${athlete.trainings || 0}
Nr. Meciuri: ${athlete.matches || 0}

Felicitări și continuă să te antrenezi din greu!`;
        
        const subject = encodeURIComponent(`Clasament Lunar FitGo & Rezultate - ${athlete.name}`);
        const body = encodeURIComponent(emailContent);
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${athlete.email}&su=${subject}&body=${body}`;
        window.open(gmailUrl, '_blank');
        
        alert(`Se deschide Gmail pentru trimiterea raportului către ${athlete.email}`);
    },

    calculateRank(athleteId) {
        const athletes = storage.getAthletes();
        const sorted = [...athletes].sort((a, b) => {
            return dashboard.calculateScore(b.metrics) - dashboard.calculateScore(a.metrics);
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
