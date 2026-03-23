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
