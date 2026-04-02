const tv = {
    currentIndex: 0,
    interval: null,
    athletes: [],
    currentAgeGroup: 'all',

    ageGroups: [
        { key: 'all', label: 'Toate vârstele', min: 0, max: 999 },
        { key: '6-12', label: '6-12 ani', min: 6, max: 12 },
        { key: '13-17', label: '13-17 ani', min: 13, max: 17 },
        { key: '18-30', label: '18-30 ani', min: 18, max: 30 },
        { key: '31-45', label: '31-45 ani', min: 31, max: 45 },
        { key: '46+', label: '46+ ani', min: 46, max: 999 }
    ],

    calculateAge(dob) {
        if (!dob) return null;
        const birth = new Date(dob);
        const now = new Date();
        let age = now.getFullYear() - birth.getFullYear();
        const m = now.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
        return age;
    },

    getFilteredAthletes() {
        if (this.currentAgeGroup === 'all') return this.athletes;
        const group = this.ageGroups.find(g => g.key === this.currentAgeGroup);
        if (!group) return this.athletes;
        return this.athletes.filter(a => {
            const age = this.calculateAge(a.dob);
            return age !== null && age >= group.min && age <= group.max;
        });
    },

    categories: [
        { key: 'overall', title: 'Top 50 - General', color: '#0ea5e9', icon: 'fa-trophy' },
        { key: 'push_ups', title: 'Top 50 - Flotări', color: '#eab308', icon: 'fa-dumbbell', unit: 'flotări', multiplier: 2 },
        { key: 'plank', title: 'Top 50 - Plank', color: '#10b981', icon: 'fa-stopwatch', unit: 'secunde', multiplier: 1 },
        { key: 'long_jump', title: 'Top 50 - Săritură', color: '#3b82f6', icon: 'fa-ruler', unit: 'cm', multiplier: 0.5 },
        { key: 'hang_time', title: 'Top 50 - Timp Agățat', color: '#ef4444', icon: 'fa-hand-rock', unit: 'secunde', multiplier: 2 },
        { key: 'grip_strength', title: 'Top 50 - Forța Strângerii', color: '#8b5cf6', icon: 'fa-hand-fist', unit: 'kg', multiplier: 2 },
        { key: 'punch_force', title: 'Top 50 - Forța Loviturii', color: '#f97316', icon: 'fa-hand-back-fist', unit: 'kgf', multiplier: 0.5 }
    ],
    currentPage: 0,

    async init() {
        await this.loadData();
        this.renderDots();
        this.renderAgeFilter();
        this.currentPage = 0;
        this.showCategory(0, 0);
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
            this.nextPage();
        }, 3000);
    },

    nextPage() {
        const cat = this.categories[this.currentIndex];
        // Get total pages for current category
        let sorted = this.getSorted(this.currentIndex);
        const top50 = sorted.slice(0, 50);
        const totalPages = Math.max(1, Math.ceil(top50.length / 10));

        this.currentPage++;
        if (this.currentPage >= totalPages) {
            // Move to next category
            this.currentPage = 0;
            this.currentIndex = (this.currentIndex + 1) % this.categories.length;
        }
        this.showCategory(this.currentIndex, this.currentPage);
    },

    getSorted(index) {
        const cat = this.categories[index];
        const filtered = this.getFilteredAthletes();
        if (cat.key === 'overall') {
            return [...filtered].sort((a, b) => this.calcTotal(b) - this.calcTotal(a));
        } else {
            return [...filtered].sort((a, b) => ((b.metrics || {})[cat.key] || 0) - ((a.metrics || {})[cat.key] || 0));
        }
    },

    renderDots() {
        const container = document.getElementById('tv-dots');
        container.innerHTML = this.categories.map((cat, i) =>
            `<div class="tv-dot" data-index="${i}" style="width: 12px; height: 12px; border-radius: 50%; background: ${i === 0 ? cat.color : 'rgba(255,255,255,0.2)'}; transition: all 0.3s ease; cursor: pointer;" onclick="tv.goTo(${i})"></div>`
        ).join('');
    },

    renderAgeFilter() {
        const container = document.getElementById('tv-age-filter');
        if (!container) return;
        container.innerHTML = this.ageGroups.map(g => {
            const isActive = g.key === this.currentAgeGroup;
            return `<button onclick="tv.setAgeGroup('${g.key}')" style="
                padding: 0.4rem 0.9rem;
                border-radius: 2rem;
                border: 1px solid ${isActive ? '#0ea5e9' : 'rgba(255,255,255,0.15)'};
                background: ${isActive ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'rgba(255,255,255,0.05)'};
                color: ${isActive ? 'white' : 'rgba(255,255,255,0.6)'};
                font-size: 0.85rem;
                font-weight: ${isActive ? '700' : '500'};
                cursor: pointer;
                transition: all 0.3s ease;
                white-space: nowrap;
            ">${g.label}</button>`;
        }).join('');
    },

    setAgeGroup(key) {
        this.currentAgeGroup = key;
        this.currentPage = 0;
        this.renderAgeFilter();
        this.showCategory(this.currentIndex, 0);
        this.startRotation();
    },

    goTo(index) {
        this.currentIndex = index;
        this.currentPage = 0;
        this.showCategory(index, 0);
        this.startRotation();
    },

    showCategory(index, page = 0) {
        const cat = this.categories[index];
        const title = document.getElementById('tv-category-title');
        const tbody = document.getElementById('tv-table-body');

        const sorted = this.getSorted(index);
        const top50 = sorted.slice(0, 50);
        const totalPages = Math.max(1, Math.ceil(top50.length / 10));
        const pageItems = top50.slice(page * 10, (page + 1) * 10);
        const startRank = page * 10;

        // Update title with page info
        const pageInfo = totalPages > 1 ? ` (${page + 1}/${totalPages})` : '';
        title.innerHTML = `<i class="fas ${cat.icon}" style="color: ${cat.color}; margin-right: 0.75rem;"></i>${cat.title}${pageInfo}`;

        // Fade effect
        tbody.style.opacity = '0';
        tbody.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            if (pageItems.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding: 3rem; text-align: center; color: var(--text-muted); font-size: 1.3rem;">Niciun sportiv momentan.</td></tr>';
            } else {
                tbody.innerHTML = pageItems.map((a, i) => {
                    const rank = startRank + i;
                    let value, points;
                    if (cat.key === 'overall') {
                        value = '';
                        points = this.calcTotal(a);
                    } else {
                        const raw = (a.metrics || {})[cat.key] || 0;
                        value = `${raw} ${cat.unit}`;
                        points = Math.round(raw * cat.multiplier);
                    }

                    const rankColor = rank === 0 ? '#ffd700' : rank === 1 ? '#c0c0c0' : rank === 2 ? '#cd7f32' : 'var(--text-muted)';
                    const rankBg = rank < 3 ? `rgba(${rank === 0 ? '255,215,0' : rank === 1 ? '192,192,192' : '205,127,50'}, 0.1)` : 'transparent';

                    const age = this.calculateAge(a.dob);
                    const ageStr = age !== null ? `<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 400; margin-left: 0.5rem;">${age} ani</span>` : '';
                    return `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: ${rankBg}; transition: all 0.3s;">
                        <td style="padding: 1rem 1rem; font-weight: 900; font-size: 1.5rem; color: ${rankColor}; width: 80px;">${rank + 1}</td>
                        <td style="padding: 1rem; font-size: 1.2rem; font-weight: 600;">${a.name}${ageStr}</td>
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

        // Update next-up sidebar
        this.updateNextSidebar(index, page);
    },

    updateNextSidebar(currentIndex, currentPage) {
        const sorted = this.getSorted(currentIndex);
        const top50 = sorted.slice(0, 50);
        const totalPages = Math.max(1, Math.ceil(top50.length / 10));

        // Determine next category
        let nextIndex;
        if (currentPage + 1 < totalPages) {
            nextIndex = currentIndex; // same category, next page
        } else {
            nextIndex = (currentIndex + 1) % this.categories.length;
        }
        const next = this.categories[nextIndex];

        // Next icon & title
        const iconEl = document.getElementById('tv-next-icon');
        const titleEl = document.getElementById('tv-next-title');
        if (iconEl) iconEl.innerHTML = `<i class="fas ${next.icon}" style="color: ${next.color};"></i>`;
        if (titleEl) {
            titleEl.textContent = next.title;
            titleEl.style.color = next.color;
        }

        // Top 3 preview for next category
        const previewEl = document.getElementById('tv-next-preview');
        if (previewEl) {
            const nextSorted = this.getSorted(nextIndex);
            const top3 = nextSorted.slice(0, 3);
            previewEl.innerHTML = top3.map((a, i) => {
                const medal = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32';
                let val = '';
                if (next.key === 'overall') {
                    val = this.calcTotal(a) + 'p';
                } else {
                    const raw = (a.metrics || {})[next.key] || 0;
                    val = raw + ' ' + next.unit;
                }
                return `<div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0; ${i < 2 ? 'border-bottom: 1px solid rgba(255,255,255,0.05);' : ''}">
                    <span style="font-weight: 800; color: ${medal}; width: 1.2rem; font-size: 0.9rem;">${i + 1}</span>
                    <span style="flex: 1; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${a.name}</span>
                    <span style="font-size: 0.8rem; color: ${next.color}; font-weight: 600;">${val}</span>
                </div>`;
            }).join('');
        }

        // Full list of all categories
        const listEl = document.getElementById('tv-next-list');
        if (listEl) {
            listEl.innerHTML = this.categories.map((cat, i) => {
                const isActive = i === currentIndex;
                const isNext = i === nextIndex && nextIndex !== currentIndex;
                const bg = isActive ? 'rgba(255,255,255,0.08)' : isNext ? 'rgba(255,255,255,0.04)' : 'transparent';
                const opacity = isActive ? '1' : '0.6';
                const label = isActive ? ' ◄' : isNext ? ' ►' : '';
                return `<div onclick="tv.goTo(${i})" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem; border-radius: 0.4rem; cursor: pointer; background: ${bg}; opacity: ${opacity}; transition: all 0.2s;">
                    <i class="fas ${cat.icon}" style="color: ${cat.color}; font-size: 0.75rem; width: 1rem; text-align: center;"></i>
                    <span style="font-size: 0.8rem; flex: 1;">${cat.title.replace('Top 50 - ', '')}</span>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">${label}</span>
                </div>`;
            }).join('');
        }
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
