const tv = {
    currentIndex: 0,
    interval: null,
    athletes: [],

    categories: [
        { key: 'overall', title: 'Top 10 - General', color: '#0ea5e9', icon: 'fa-trophy' },
        { key: 'push_ups', title: 'Top 10 - Flotări', color: '#eab308', icon: 'fa-dumbbell', unit: 'flotări', multiplier: 2 },
        { key: 'plank', title: 'Top 10 - Plank', color: '#10b981', icon: 'fa-stopwatch', unit: 'secunde', multiplier: 1 },
        { key: 'long_jump', title: 'Top 10 - Săritură', color: '#3b82f6', icon: 'fa-ruler', unit: 'cm', multiplier: 0.5 },
        { key: 'hang_time', title: 'Top 10 - Timp Agățat', color: '#ef4444', icon: 'fa-hand-rock', unit: 'secunde', multiplier: 2 },
        { key: 'grip_strength', title: 'Top 10 - Forța Strângerii', color: '#8b5cf6', icon: 'fa-hand-fist', unit: 'kg', multiplier: 2 },
        { key: 'punch_force', title: 'Top 10 - Forța Loviturii', color: '#f97316', icon: 'fa-hand-back-fist', unit: 'kgf', multiplier: 0.5 }
    ],

    async init() {
        await this.loadData();
        this.renderDots();
        this.showCategory(0);
        this.startRotation();

        // Refresh data every 60 seconds
        setInterval(() => this.loadData(), 60000);
    },

    async loadData() {
        try {
            const res = await fetch('/api/athletes');
            if (res.ok) {
                const data = await res.json();
                this.athletes = data || [];
            }
        } catch (e) {
            // Use localStorage fallback
            this.athletes = storage.getAthletes();
        }
    },

    startRotation() {
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            this.currentIndex = (this.currentIndex + 1) % this.categories.length;
            this.showCategory(this.currentIndex);
        }, 10000);
    },

    renderDots() {
        const container = document.getElementById('tv-dots');
        container.innerHTML = this.categories.map((cat, i) =>
            `<div class="tv-dot" data-index="${i}" style="width: 12px; height: 12px; border-radius: 50%; background: ${i === 0 ? cat.color : 'rgba(255,255,255,0.2)'}; transition: all 0.3s ease; cursor: pointer;" onclick="tv.goTo(${i})"></div>`
        ).join('');
    },

    goTo(index) {
        this.currentIndex = index;
        this.showCategory(index);
        this.startRotation(); // Reset timer
    },

    showCategory(index) {
        const cat = this.categories[index];
        const title = document.getElementById('tv-category-title');
        const tbody = document.getElementById('tv-table-body');

        // Update title with color
        title.innerHTML = `<i class="fas ${cat.icon}" style="color: ${cat.color}; margin-right: 0.75rem;"></i>${cat.title}`;

        // Sort athletes
        let sorted;
        if (cat.key === 'overall') {
            sorted = [...this.athletes].sort((a, b) => this.calcTotal(b) - this.calcTotal(a));
        } else {
            sorted = [...this.athletes].sort((a, b) => ((b.metrics || {})[cat.key] || 0) - ((a.metrics || {})[cat.key] || 0));
        }

        const top10 = sorted.slice(0, 10);

        // Fade effect
        tbody.style.opacity = '0';
        tbody.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            if (top10.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding: 3rem; text-align: center; color: var(--text-muted); font-size: 1.3rem;">Niciun sportiv momentan.</td></tr>';
            } else {
                tbody.innerHTML = top10.map((a, i) => {
                    let value, points;
                    if (cat.key === 'overall') {
                        value = '';
                        points = this.calcTotal(a);
                    } else {
                        const raw = (a.metrics || {})[cat.key] || 0;
                        value = `${raw} ${cat.unit}`;
                        points = Math.round(raw * cat.multiplier);
                    }

                    const rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text-muted)';
                    const rankBg = i < 3 ? `rgba(${i === 0 ? '255,215,0' : i === 1 ? '192,192,192' : '205,127,50'}, 0.1)` : 'transparent';

                    return `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: ${rankBg}; transition: all 0.3s;">
                        <td style="padding: 1rem 1rem; font-weight: 900; font-size: 1.5rem; color: ${rankColor}; width: 80px;">${i + 1}</td>
                        <td style="padding: 1rem; font-size: 1.2rem; font-weight: 600;">${a.name}</td>
                        <td style="padding: 1rem; font-size: 1.1rem; text-align: right; color: var(--text-muted);">${value}</td>
                        <td style="padding: 1rem; font-size: 1.3rem; font-weight: 700; text-align: right; color: ${cat.color};">${points}p</td>
                    </tr>`;
                }).join('');
            }

            tbody.style.opacity = '1';
        }, 300);

        // Update dots
        document.querySelectorAll('.tv-dot').forEach((dot, i) => {
            dot.style.background = i === index ? this.categories[i].color : 'rgba(255,255,255,0.2)';
            dot.style.transform = i === index ? 'scale(1.3)' : 'scale(1)';
        });
    },

    // Personal score
    personalCharts: [],
    failedAttempts: 0,
    lockedUntil: null,

    showCodeInput() {
        if (this.interval) clearInterval(this.interval);

        // Check if locked
        if (this.lockedUntil && new Date() < this.lockedUntil) {
            const remaining = Math.ceil((this.lockedUntil - new Date()) / 60000);
            app.showToast(`Prea multe încercări! Așteaptă ${remaining} min.`, 'error');
            return;
        }

        document.getElementById('tv-code-modal').classList.remove('hidden');
        const input = document.getElementById('tv-code-input');
        input.value = '';
        input.focus();
    },

    closeCodeInput() {
        document.getElementById('tv-code-modal').classList.add('hidden');
        this.startRotation();
    },

    handleCodeInput() {
        const input = document.getElementById('tv-code-input');
        const code = input.value;
        if (code.length === 4) {
            this.lookupCode();
        }
    },

    shakeModal() {
        const card = document.querySelector('#tv-code-modal .card');
        card.style.animation = 'none';
        card.offsetHeight; // trigger reflow
        card.style.animation = 'shake 0.5s ease';
    },

    lookupCode() {
        // Check if locked
        if (this.lockedUntil && new Date() < this.lockedUntil) {
            const remaining = Math.ceil((this.lockedUntil - new Date()) / 60000);
            app.showToast(`Prea multe încercări! Așteaptă ${remaining} min.`, 'error');
            return;
        }

        const input = document.getElementById('tv-code-input');
        const code = input.value;
        const athlete = this.athletes.find(a => a.unique_code === code);

        if (!athlete) {
            this.failedAttempts++;
            this.shakeModal();

            if (this.failedAttempts >= 5) {
                this.lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
                app.showToast('Prea multe încercări! Blocat 5 minute.', 'error');
                this.closeCodeInput();
                return;
            }

            app.showToast(`Cod incorect! (${this.failedAttempts}/5)`, 'error');
            input.value = '';
            input.focus();
            return;
        }

        this.failedAttempts = 0;
        document.getElementById('tv-code-modal').classList.add('hidden');
        this.showPersonal(athlete);
    },

    showPersonal(athlete) {
        if (this.interval) clearInterval(this.interval);
        document.getElementById('tv-leaderboard').classList.add('hidden');
        document.getElementById('tv-personal').classList.remove('hidden');

        document.getElementById('tv-personal-name').textContent = `Istoric: ${athlete.name}`;

        // Charts
        this.personalCharts.forEach(c => c.destroy());
        this.personalCharts = [];

        let history = athlete.evaluation_history || [];
        if (history.length === 0 && athlete.metrics) {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            history = [{ month: monthKey, date: now.toISOString(), ...athlete.metrics }];
        }
        history.sort((a, b) => a.month.localeCompare(b.month));

        const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Render history table
        const tbody = document.getElementById('tv-history-table-body');
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

        const chartLabels = history.map(h => {
            const [year, month] = h.month.split('-');
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        });

        const makeChart = (canvasId, data, color, bgColor) => {
            const ctx = document.getElementById(canvasId).getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: { labels: chartLabels, datasets: [{ data, borderColor: color, backgroundColor: bgColor, tension: 0.45, fill: true, borderWidth: 3, pointRadius: 5, pointBackgroundColor: color }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true } } }
            });
            this.personalCharts.push(chart);
        };

        setTimeout(() => {
            makeChart('tv-chart-pushups', history.map(h => h.push_ups || 0), '#eab308', 'rgba(234,179,8,0.15)');
            makeChart('tv-chart-plank', history.map(h => h.plank || 0), '#10b981', 'rgba(16,185,129,0.15)');
            makeChart('tv-chart-jump', history.map(h => h.long_jump || 0), '#3b82f6', 'rgba(59,130,246,0.15)');
            makeChart('tv-chart-hang', history.map(h => h.hang_time || 0), '#ef4444', 'rgba(239,68,68,0.15)');
            makeChart('tv-chart-grip', history.map(h => h.grip_strength || 0), '#8b5cf6', 'rgba(139,92,246,0.15)');
            makeChart('tv-chart-punch', history.map(h => h.punch_force || 0), '#f97316', 'rgba(249,115,22,0.15)');

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
            makeChart('tv-chart-overall', overallScores, '#0ea5e9', 'rgba(14,165,233,0.15)');
        }, 50);
    },

    closePersonal() {
        document.getElementById('tv-personal').classList.add('hidden');
        document.getElementById('tv-leaderboard').classList.remove('hidden');
        this.personalCharts.forEach(c => c.destroy());
        this.personalCharts = [];
        this.startRotation();
    },

    calcTotal(athlete) {
        if (!athlete) return 0;
        const m = athlete.metrics || {};
        const eventPoints = athlete.points || 0;
        let metricPoints = 0;
        const mp = {
            push_ups: 2, plank: 1, long_jump: 0.5,
            hang_time: 2, grip_strength: 2, punch_force: 0.5
        };
        for (const [key, mult] of Object.entries(mp)) {
            metricPoints += Math.round((m[key] || 0) * mult);
        }
        return eventPoints + metricPoints;
    }
};
