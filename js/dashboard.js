const dashboard = {
    render() {
        const listContainer = document.getElementById('athletes-list');
        let athletes = storage.getAthletes();
        
        // Filter based on user role
        if (app.isLoggedIn && !app.isAdmin) {
            athletes = athletes.filter(a => a.email === app.currentUser.email);
        }

        if (athletes.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-muted);">Niciun sportiv înregistrat încă.</td></tr>';
            return;
        }

        listContainer.innerHTML = athletes.map(a => `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <img src="${a.photo || 'https://via.placeholder.com/40'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);">
                    <div>
                        <div style="font-weight: 600;">${a.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${new Date(a.dob).toLocaleDateString('ro-RO')}</div>
                    </div>
                </td>
                <td style="padding: 1rem;">${a.goal || '-'}</td>
                <td style="padding: 1rem;">
                    <div style="font-size: 0.9rem;">${a.phone}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
                </td>
                <td style="padding: 1rem;">
                    <span style="font-weight: bold; color: var(--primary);">${this.calculateScore(a.metrics)}</span>
                </td>
                <td style="padding: 1rem;">
                    <span class="badge" style="background: ${a.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${a.active ? '#10b981' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.8rem;">
                        ${a.active ? 'Activ' : 'Inactiv'}
                    </span>
                </td>
                <td style="padding: 1rem; font-weight: 600;">${a.points || 0} p</td>
                <td style="padding: 1rem;">
                    ${app.isAdmin ? `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="dashboard.openEvaluation(${a.id})">Evaluare</button>` : ''}
                </td>
            </tr>
        `).join('');
    },

    openEvaluation(id) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === id);
        if (!athlete) return;

        document.getElementById('eval-athlete-id').value = id;
        document.getElementById('eval-athlete-name').innerText = `Evaluare: ${athlete.name}`;
        
        // Fill existing values
        const m = athlete.metrics || {};
        document.getElementById('eval-punch').value = m.punch_force || '';
        document.getElementById('eval-jump').value = m.long_jump || '';
        document.getElementById('eval-hang').value = m.hang_time || '';
        document.getElementById('eval-plank').value = m.plank || '';
        document.getElementById('eval-grip').value = m.grip_strength || '';
        document.getElementById('eval-sprint').value = m.sprint || '';
        document.getElementById('eval-trainings').value = athlete.trainings || '';
        document.getElementById('eval-matches').value = athlete.matches || '';

        document.getElementById('evaluation-modal').classList.remove('hidden');

        // Mock history data for chart
        const history = {
            dates: ['Feb', 'Mar', 'Apr', 'May', 'Jun'],
            scores: [45, 52, 48, 60, this.calculateScore(athlete.metrics)]
        };
        setTimeout(() => reports.renderEvolutionChart('evolution-chart', history), 100);
    },

    closeEvaluation() {
        document.getElementById('evaluation-modal').classList.add('hidden');
    },

    handleEvaluationSubmit(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('eval-athlete-id').value);
        const data = {
            trainings: parseInt(document.getElementById('eval-trainings').value) || 0,
            matches: parseInt(document.getElementById('eval-matches').value) || 0,
            metrics: {
                punch_force: parseFloat(document.getElementById('eval-punch').value) || 0,
                long_jump: parseFloat(document.getElementById('eval-jump').value) || 0,
                hang_time: parseFloat(document.getElementById('eval-hang').value) || 0,
                plank: parseFloat(document.getElementById('eval-plank').value) || 0,
                grip_strength: parseFloat(document.getElementById('eval-grip').value) || 0,
                sprint: parseFloat(document.getElementById('eval-sprint').value) || 0
            }
        };

        storage.updateAthlete(id, data);
        this.closeEvaluation();
        this.render();
        alert('Evaluare salvată!');
    },

    calculateScore(metrics) {
        if (!metrics) return 0;
        // Simple normalization for demo: (Value / MaxExpected) * 100
        // Weighting: All equal for now
        const values = [
            (metrics.punch_force / 1000) * 100,
            (metrics.long_jump / 300) * 100,
            (metrics.hang_time / 120) * 100,
            (metrics.plank / 300) * 100,
            (metrics.grip_strength / 100) * 100,
            (metrics.sprint / 10) * 100 // Inverse or handled differently usually
        ];
        
        const validValues = values.filter(v => !isNaN(v) && v > 0);
        if (validValues.length === 0) return 0;
        
        const average = validValues.reduce((a, b) => a + b, 0) / validValues.length;
        return Math.min(100, Math.round(average));
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Search functionality
    document.getElementById('athlete-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#athletes-list tr');
        rows.forEach(row => {
            const name = row.querySelector('div')?.innerText.toLowerCase() || '';
            row.style.display = name.includes(term) ? '' : 'none';
        });
    });

    document.getElementById('evaluation-form').addEventListener('submit', (e) => dashboard.handleEvaluationSubmit(e));
});
