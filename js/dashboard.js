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
                    <span class="badge" style="background: ${a.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${a.active ? '#10b981' : '#ef4444'}; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.8rem;">
                        ${a.active ? 'Activ' : 'Inactiv'}
                    </span>
                </td>
                <td style="padding: 1rem; font-weight: 600;">${this.calculateTotalPoints(a)} p</td>
                <td style="padding: 1rem;">
                    ${app.isAdmin ? `
                        <div style="display: flex; gap: 0.5rem;">
                            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="dashboard.openEvaluation(${a.id})">Evaluare</button>
                            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: rgba(14, 165, 233, 0.1); color: var(--primary);" onclick="dashboard.openHistory(${a.id})">Vezi Istoric</button>
                        </div>
                    ` : ''}
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
        document.getElementById('eval-pushups').value = m.push_ups || '';
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
        const metrics = {
            punch_force: parseFloat(document.getElementById('eval-punch').value) || 0,
            long_jump: parseFloat(document.getElementById('eval-jump').value) || 0,
            hang_time: parseFloat(document.getElementById('eval-hang').value) || 0,
            plank: parseFloat(document.getElementById('eval-plank').value) || 0,
            grip_strength: parseFloat(document.getElementById('eval-grip').value) || 0,
            push_ups: parseFloat(document.getElementById('eval-pushups').value) || 0
        };

        // Save current metrics
        storage.updateAthlete(id, { metrics });

        // Save to evaluation history
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === id);
        if (athlete) {
            const history = athlete.evaluation_history || [];
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

            // Replace if same month exists, otherwise add
            const existingIdx = history.findIndex(h => h.month === monthKey);
            const entry = { month: monthKey, date: now.toISOString(), ...metrics };
            if (existingIdx >= 0) {
                history[existingIdx] = entry;
            } else {
                history.push(entry);
            }
            storage.updateAthlete(id, { evaluation_history: history });
        }

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
            (metrics.push_ups / 50) * 100
        ];
        
        const validValues = values.filter(v => !isNaN(v) && v > 0);
        if (validValues.length === 0) return 0;
        
        const average = validValues.reduce((a, b) => a + b, 0) / validValues.length;
        return Math.min(100, Math.round(average));
    },

    // Sistem de puncte per metric evaluare
    METRIC_POINTS: {
        push_ups: { multiplier: 2, unit: 'nr', label: 'Flotări' },           // 1 flotare = 2p
        plank: { multiplier: 1, unit: 'sec', label: 'Plank' },               // 1 sec = 1p
        long_jump: { multiplier: 0.5, unit: 'cm', label: 'Săritura' },       // 1 cm = 0.5p
        hang_time: { multiplier: 2, unit: 'sec', label: 'Timp agățat' },     // 1 sec = 2p
        grip_strength: { multiplier: 2, unit: 'kg', label: 'Forța strângerii' }, // 1 kg = 2p
        punch_force: { multiplier: 0.5, unit: 'kgf', label: 'Forța loviturii' } // 1 kgf = 0.5p
    },

    calculateTotalPoints(athlete) {
        if (!athlete) return 0;
        const m = athlete.metrics || {};
        const eventPoints = athlete.points || 0;

        // Puncte din evaluări (metrici)
        let metricPoints = 0;
        for (const [key, config] of Object.entries(this.METRIC_POINTS)) {
            metricPoints += Math.round((m[key] || 0) * config.multiplier);
        }

        return eventPoints + metricPoints;
    },

    // History modal
    historyCharts: [],

    openHistory(id) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === id);
        if (!athlete) return;

        document.getElementById('history-athlete-name').textContent = `Istoric: ${athlete.name}`;

        let history = athlete.evaluation_history || [];

        // If no history, use current metrics as the only entry
        if (history.length === 0 && athlete.metrics) {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            history = [{ month: monthKey, date: now.toISOString(), ...athlete.metrics }];
        }

        // Sort by month
        history.sort((a, b) => a.month.localeCompare(b.month));

        const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Render table
        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = history.map((h, i) => {
            const evalDate = h.date ? new Date(h.date) : null;
            const dateStr = evalDate ? evalDate.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : h.month;
            const timeStr = evalDate ? evalDate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '';
            return `<tr style="border-bottom: 1px solid var(--border);">
                <td style="padding: 0.75rem; font-weight: 600; color: var(--primary);"><div>${dateStr}</div><div style="font-size: 0.75rem; color: var(--text-muted);">${timeStr}</div></td>
                <td style="padding: 0.75rem;">${h.push_ups || 0}</td>
                <td style="padding: 0.75rem;">${h.plank || 0}</td>
                <td style="padding: 0.75rem;">${h.long_jump || 0}</td>
                <td style="padding: 0.75rem;">${h.hang_time || 0}</td>
                <td style="padding: 0.75rem;">${h.grip_strength || 0}</td>
                <td style="padding: 0.75rem;">${h.punch_force || 0}</td>
            </tr>`;
        }).join('');

        // Destroy old charts
        this.historyCharts.forEach(c => c.destroy());
        this.historyCharts = [];

        const labels = history.map((h, i) => {
            const [year, month] = h.month.split('-');
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        });

        // Metrics chart
        const metricsCtx = document.getElementById('history-metrics-chart').getContext('2d');
        const metricsChart = new Chart(metricsCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Flotări', data: history.map(h => h.push_ups || 0), borderColor: '#eab308', backgroundColor: 'rgba(234,179,8,0.1)', tension: 0.45, fill: false, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#eab308' },
                    { label: 'Plank (s)', data: history.map(h => h.plank || 0), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.45, fill: false, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#10b981' },
                    { label: 'Săritură (cm)', data: history.map(h => h.long_jump || 0), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.45, fill: false, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#3b82f6' },
                    { label: 'Agățat (s)', data: history.map(h => h.hang_time || 0), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.45, fill: false, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#ef4444' },
                    { label: 'Strângere (kg)', data: history.map(h => h.grip_strength || 0), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', tension: 0.45, fill: false, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#8b5cf6' },
                    { label: 'Lovitură (kgf)', data: history.map(h => h.punch_force || 0), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', tension: 0.45, fill: false, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#f97316' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });
        this.historyCharts.push(metricsChart);

        // Overall score chart
        const overallCtx = document.getElementById('history-overall-chart').getContext('2d');
        const overallScores = history.map(h => {
            let total = 0;
            total += (h.push_ups || 0) * 2;
            total += (h.plank || 0) * 1;
            total += (h.long_jump || 0) * 0.5;
            total += (h.hang_time || 0) * 2;
            total += (h.grip_strength || 0) * 2;
            total += (h.punch_force || 0) * 0.5;
            return Math.round(total);
        });

        const overallChart = new Chart(overallCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Scor Total Evaluare',
                    data: overallScores,
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14,165,233,0.15)',
                    tension: 0.45,
                    fill: true,
                    pointRadius: 6,
                    pointBackgroundColor: '#0ea5e9',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8' } } },
                scales: {
                    x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                }
            }
        });
        this.historyCharts.push(overallChart);

        document.getElementById('history-modal').classList.remove('hidden');
    },

    closeHistory() {
        document.getElementById('history-modal').classList.add('hidden');
        this.historyCharts.forEach(c => c.destroy());
        this.historyCharts = [];
    },

    getPointsBreakdown(athlete) {
        if (!athlete) return {};
        const m = athlete.metrics || {};
        const breakdown = {};
        for (const [key, config] of Object.entries(this.METRIC_POINTS)) {
            breakdown[config.label] = Math.round((m[key] || 0) * config.multiplier);
        }
        breakdown['Evenimente'] = athlete.points || 0;
        return breakdown;
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
