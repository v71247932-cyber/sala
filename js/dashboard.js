const dashboard = {
    currentPage: 1,
    perPage: 10,

    calculateAge(dob) {
        if (!dob) return null;
        const birth = new Date(dob);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        return age;
    },

    render() {
        // Auto-fix sportivi fără DOB valid (vârstă 5-90)
        this.fixInvalidDobs();

        const listContainer = document.getElementById('athletes-list');
        let athletes = storage.getAthletes();
        
        // Filter based on user role
        if (app.isLoggedIn && !app.isAdmin) {
            athletes = athletes.filter(a => a.email === app.currentUser.email);
        }

        if (athletes.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-muted);">Niciun sportiv înregistrat încă.</td></tr>';
            this.renderPagination(0);
            return;
        }

        const totalPages = Math.ceil(athletes.length / this.perPage);
        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;
        const start = (this.currentPage - 1) * this.perPage;
        const pageAthletes = athletes.slice(start, start + this.perPage);

        listContainer.innerHTML = pageAthletes.map(a => `
            <tr style="border-bottom: 1px solid var(--border); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 1rem; display: flex; align-items: center; gap: 1rem;">
                    <div>
                        <div style="font-weight: 600;">${a.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.dob ? this.calculateAge(a.dob) + ' ani' : '-'} <span style="opacity: 0.5;">• ${a.dob ? new Date(a.dob).toLocaleDateString('ro-RO') : '-'}</span></div>
                    </div>
                </td>
                <td style="padding: 1rem;">${a.goal || '-'}</td>
                <td style="padding: 1rem;">
                    <div style="font-size: 0.9rem;">${a.phone}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
                </td>
                <td style="padding: 1rem; font-weight: 600;">${this.calculateTotalPoints(a)} p</td>
                <td style="padding: 1rem;">
                    ${app.isAdmin ? `
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="dashboard.openEvaluation(${a.id})">Evaluare</button>
                            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: rgba(14, 165, 233, 0.1); color: var(--primary);" onclick="dashboard.openHistory(${a.id})">Istoric</button>
                            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background: rgba(16, 185, 129, 0.1); color: #10b981;" onclick="events.openAssign(${a.id})"><i class="fas fa-star" style="margin-right: 0.3rem;"></i>Puncte</button>
                        </div>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        this.renderPagination(totalPages);
    },

    renderPagination(totalPages) {
        let paginationEl = document.getElementById('athletes-pagination');
        if (!paginationEl) {
            const table = document.getElementById('athletes-list')?.closest('table');
            if (table) {
                paginationEl = document.createElement('div');
                paginationEl.id = 'athletes-pagination';
                table.parentNode.insertBefore(paginationEl, table.nextSibling);
            } else return;
        }

        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let buttons = '';
        buttons += `<button onclick="dashboard.goToPage(${this.currentPage - 1})" style="padding: 0.5rem 0.85rem; border: 1px solid var(--border); background: transparent; color: var(--text-muted); border-radius: 0.4rem; cursor: pointer; font-size: 0.85rem;" ${this.currentPage === 1 ? 'disabled style="padding: 0.5rem 0.85rem; border: 1px solid var(--border); background: transparent; color: var(--border); border-radius: 0.4rem; cursor: default; font-size: 0.85rem; opacity: 0.4;"' : ''}>‹</button>`;

        for (let p = 1; p <= totalPages; p++) {
            const isActive = p === this.currentPage;
            buttons += `<button onclick="dashboard.goToPage(${p})" style="padding: 0.5rem 0.85rem; border: 1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}; background: ${isActive ? 'var(--primary)' : 'transparent'}; color: ${isActive ? 'white' : 'var(--text-muted)'}; border-radius: 0.4rem; cursor: pointer; font-size: 0.85rem; font-weight: ${isActive ? '700' : '400'};">${p}</button>`;
        }

        buttons += `<button onclick="dashboard.goToPage(${this.currentPage + 1})" style="padding: 0.5rem 0.85rem; border: 1px solid var(--border); background: transparent; color: var(--text-muted); border-radius: 0.4rem; cursor: pointer; font-size: 0.85rem;" ${this.currentPage === totalPages ? 'disabled style="padding: 0.5rem 0.85rem; border: 1px solid var(--border); background: transparent; color: var(--border); border-radius: 0.4rem; cursor: default; font-size: 0.85rem; opacity: 0.4;"' : ''}>›</button>`;

        paginationEl.innerHTML = `<div style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; padding: 1rem 0;">${buttons}</div>`;
    },

    goToPage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.render();
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
        app.showToast('Evaluare salvată!');
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

        // Render history table
        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = history.map(h => {
            const evalDate = h.date ? new Date(h.date) : null;
            const dateStr = evalDate ? evalDate.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }) : h.month;
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

        const chartOpts = (color) => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
            }
        });

        const makeChart = (canvasId, data, color, bgColor) => {
            const ctx = document.getElementById(canvasId).getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        data,
                        borderColor: color,
                        backgroundColor: bgColor,
                        tension: 0.45,
                        fill: true,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointBackgroundColor: color
                    }]
                },
                options: chartOpts(color)
            });
            this.historyCharts.push(chart);
        };

        // Show modal FIRST so Chart.js can measure canvas dimensions
        document.getElementById('history-modal').classList.remove('hidden');

        // Create charts after modal is visible
        setTimeout(() => {
            makeChart('chart-pushups', history.map(h => h.push_ups || 0), '#eab308', 'rgba(234,179,8,0.15)');
            makeChart('chart-plank', history.map(h => h.plank || 0), '#10b981', 'rgba(16,185,129,0.15)');
            makeChart('chart-jump', history.map(h => h.long_jump || 0), '#3b82f6', 'rgba(59,130,246,0.15)');
            makeChart('chart-hang', history.map(h => h.hang_time || 0), '#ef4444', 'rgba(239,68,68,0.15)');
            makeChart('chart-grip', history.map(h => h.grip_strength || 0), '#8b5cf6', 'rgba(139,92,246,0.15)');
            makeChart('chart-punch', history.map(h => h.punch_force || 0), '#f97316', 'rgba(249,115,22,0.15)');

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
            makeChart('chart-overall', overallScores, '#0ea5e9', 'rgba(14,165,233,0.15)');
        }, 50);
    },

    closeHistory() {
        document.getElementById('history-modal').classList.add('hidden');
        this.historyCharts.forEach(c => c.destroy());
        this.historyCharts = [];
    },

    hasValidDob(athlete) {
        if (!athlete.dob) return false;
        const age = this.calculateAge(athlete.dob);
        return age !== null && age >= 5 && age <= 90;
    },

    generateRandomDob() {
        const now = new Date();
        const age = Math.floor(Math.random() * (90 - 5 + 1)) + 5;
        const year = now.getFullYear() - age;
        const month = Math.floor(Math.random() * 12);
        const day = Math.floor(Math.random() * 28) + 1;
        return new Date(year, month, day).toISOString().split('T')[0];
    },

    fixInvalidDobs() {
        const athletes = storage.getAthletes();
        let fixed = 0;
        athletes.forEach(a => {
            if (!this.hasValidDob(a)) {
                a.dob = this.generateRandomDob();
                fixed++;
            }
        });
        if (fixed > 0) {
            storage.saveAthletes(athletes);
        }
        return fixed;
    },

    addTestKids() {
        const now = new Date();
        const kidNames = [
            'Alex Popescu', 'Maria Ionescu', 'Andrei Stan', 'Elena Radu',
            'Mihai Popa', 'Sofia Dumitru', 'Luca Marin', 'Ana Stoica',
            'Darius Gheorghe', 'Ioana Constantin', 'Stefan Nita', 'Daria Florea'
        ];
        const athletes = storage.getAthletes();
        const existingNames = athletes.map(a => a.name);
        let added = 0;

        kidNames.forEach((name, i) => {
            if (existingNames.includes(name)) return;
            const age = 6 + Math.floor(Math.random() * 12); // 6-17 ani
            const year = now.getFullYear() - age;
            const month = Math.floor(Math.random() * 12);
            const day = Math.floor(Math.random() * 28) + 1;
            const dob = new Date(year, month, day).toISOString().split('T')[0];
            const code = String(1000 + Math.floor(Math.random() * 9000));

            athletes.push({
                id: Date.now() + i,
                created_at: new Date().toISOString(),
                name,
                dob,
                email: name.toLowerCase().replace(/ /g, '.') + '@test.ro',
                phone: '07' + String(20000000 + Math.floor(Math.random() * 80000000)).slice(0, 8),
                gender: i % 2 === 0 ? 'M' : 'F',
                unique_code: code,
                password: '123456',
                active: true,
                goal: 'Sport',
                trainings: 0,
                matches: 0,
                points: Math.floor(Math.random() * 500),
                metrics: {
                    push_ups: Math.floor(Math.random() * 25),
                    plank: Math.floor(Math.random() * 60),
                    long_jump: Math.floor(Math.random() * 150),
                    hang_time: Math.floor(Math.random() * 30),
                    grip_strength: Math.floor(Math.random() * 25),
                    punch_force: Math.floor(Math.random() * 200)
                },
                guardian: { name: 'Părinte ' + name.split(' ')[1], phone: '07' + String(20000000 + Math.floor(Math.random() * 80000000)).slice(0, 8) }
            });
            added++;
        });

        // Save all at once (single sync to server)
        storage.saveAthletes(athletes);
        this.render();
        reports.renderTop10();
        app.showToast(`${added} copii (6-17 ani) adăugați!`);
    },

    resetAllCodes() {
        const athletes = storage.getAthletes();
        const usedCodes = new Set();

        athletes.forEach(a => {
            let code;
            do {
                const arr = new Uint16Array(1);
                crypto.getRandomValues(arr);
                code = (1000 + (arr[0] % 9000)).toString();
            } while (usedCodes.has(code));
            usedCodes.add(code);
            a.unique_code = code;
        });

        storage.saveAthletes(athletes);
        this.render();
        app.showToast(`Codurile a ${athletes.length} sportivi au fost resetate!`);
    },

    randomizeAges() {
        const athletes = storage.getAthletes();
        athletes.forEach(a => {
            a.dob = this.generateRandomDob();
        });
        storage.saveAthletes(athletes);
        this.render();
        reports.renderTop10();
        app.showToast(`Vârste random (5-90 ani) atribuite la ${athletes.length} sportivi!`);
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
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    });

    document.getElementById('evaluation-form').addEventListener('submit', (e) => dashboard.handleEvaluationSubmit(e));

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!document.getElementById('assign-points-modal').classList.contains('hidden')) {
                events.closeAssign();
            } else if (!document.getElementById('event-modal').classList.contains('hidden')) {
                events.closeModal();
            } else if (!document.getElementById('history-modal').classList.contains('hidden')) {
                dashboard.closeHistory();
            } else if (!document.getElementById('evaluation-modal').classList.contains('hidden')) {
                dashboard.closeEvaluation();
            } else if (!document.getElementById('success-modal').classList.contains('hidden')) {
                registration.closeSuccess();
            }
        }
    });
});
