const tv = {
    displayName(a) {
        const name = a.name || '';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        // First name + Last name initial: "Alex P."
        const firstName = parts[0];
        const lastInitial = parts[parts.length - 1][0].toUpperCase() + '.';
        return firstName + ' ' + lastInitial;
    },

    currentIndex: 0,
    interval: null,
    athletes: [],
    currentAgeGroup: 'all',
    currentAgeIndex: 0,

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
        let sorted = this.getSorted(this.currentIndex);
        const top50 = sorted.slice(0, 50);
        const totalPages = Math.max(1, Math.ceil(top50.length / 10));

        this.currentPage++;
        if (this.currentPage >= totalPages) {
            // Move to next category
            this.currentPage = 0;
            this.currentIndex++;
            if (this.currentIndex >= this.categories.length) {
                // All categories done → next age group (skip empty ones)
                this.currentIndex = 0;
                this.advanceToNextAgeGroup();
            }
        }
        this.showCategory(this.currentIndex, this.currentPage);
    },

    advanceToNextAgeGroup() {
        const startIndex = this.currentAgeIndex;
        for (let i = 0; i < this.ageGroups.length; i++) {
            this.currentAgeIndex = (startIndex + 1 + i) % this.ageGroups.length;
            this.currentAgeGroup = this.ageGroups[this.currentAgeIndex].key;
            // Check if this age group has any athletes
            const filtered = this.getFilteredAthletes();
            if (filtered.length > 0 || this.currentAgeGroup === 'all') {
                this.renderAgeFilter();
                return;
            }
        }
        // Fallback to 'all'
        this.currentAgeIndex = 0;
        this.currentAgeGroup = 'all';
        this.renderAgeFilter();
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
        this.currentAgeIndex = this.ageGroups.findIndex(g => g.key === key);
        this.currentPage = 0;
        this.currentIndex = 0;
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

        // Update title with page info and age group
        const pageInfo = totalPages > 1 ? ` (${page + 1}/${totalPages})` : '';
        const ageGroup = this.ageGroups.find(g => g.key === this.currentAgeGroup);
        const ageLabel = this.currentAgeGroup !== 'all' ? ` — ${ageGroup.label}` : '';
        title.innerHTML = `<i class="fas ${cat.icon}" style="color: ${cat.color}; margin-right: 0.75rem;"></i>${cat.title}${ageLabel}${pageInfo}`;

        // Fade effect
        tbody.style.opacity = '0';
        tbody.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
            if (pageItems.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="padding: 3rem; text-align: center; color: var(--text-muted); font-size: 1.3rem;">Niciun sportiv momentan.</td></tr>';
            } else {
                // Calculate row height to fill table
                const card = tbody.closest('.card');
                const table = tbody.closest('table');
                const thead = table.querySelector('thead');
                const availableH = card.clientHeight - (thead ? thead.offsetHeight : 0) - 32;
                const rowH = Math.max(30, Math.floor(availableH / pageItems.length));
                const vPad = Math.max(2, Math.floor((rowH - 24) / 2));

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
                    return `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05); background: ${rankBg}; transition: all 0.3s; height: ${rowH}px;">
                        <td style="padding: ${vPad}px 1rem; font-weight: 900; font-size: 1.2rem; color: ${rankColor}; width: 60px;">${rank + 1}</td>
                        <td style="padding: ${vPad}px 1rem; font-size: 1.05rem; font-weight: 600;">${this.displayName(a)}${ageStr}</td>
                        <td style="padding: ${vPad}px 1rem; font-size: 1rem; text-align: right; color: var(--text-muted);">${value}</td>
                        <td style="padding: ${vPad}px 1rem; font-size: 1.1rem; font-weight: 700; text-align: right; color: ${cat.color};">${points}p</td>
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

    getNextStep(currentIndex) {
        // Always show the NEXT CATEGORY (not next page), with correct age group
        let nextCatIndex;
        let nextAgeGroup = this.currentAgeGroup;
        let nextAgeLabel = this.ageGroups.find(g => g.key === this.currentAgeGroup).label;

        if (currentIndex + 1 < this.categories.length) {
            // Next category, same age group
            nextCatIndex = currentIndex + 1;
        } else {
            // All categories done → next age group
            nextCatIndex = 0;
            const startIdx = this.currentAgeIndex;
            for (let i = 0; i < this.ageGroups.length; i++) {
                const tryIdx = (startIdx + 1 + i) % this.ageGroups.length;
                const tryGroup = this.ageGroups[tryIdx];
                const oldGroup = this.currentAgeGroup;
                this.currentAgeGroup = tryGroup.key;
                const filtered = this.getFilteredAthletes();
                this.currentAgeGroup = oldGroup;
                if (filtered.length > 0 || tryGroup.key === 'all') {
                    nextAgeGroup = tryGroup.key;
                    nextAgeLabel = tryGroup.label;
                    break;
                }
            }
        }

        return { nextCatIndex, nextAgeGroup, nextAgeLabel };
    },

    updateNextSidebar(currentIndex, currentPage) {
        const { nextCatIndex, nextAgeGroup, nextAgeLabel } = this.getNextStep(currentIndex);
        const next = this.categories[nextCatIndex];

        // Current age group label
        const currentAgeLabel = this.ageGroups.find(g => g.key === this.currentAgeGroup).label;

        // Next icon & title with age group
        const iconEl = document.getElementById('tv-next-icon');
        const titleEl = document.getElementById('tv-next-title');
        if (iconEl) iconEl.innerHTML = `<i class="fas ${next.icon}" style="color: ${next.color};"></i>`;
        if (titleEl) {
            const ageInfo = `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${nextAgeLabel}</div>`;
            titleEl.innerHTML = `<span style="color: ${next.color};">${next.title}</span>${ageInfo}`;
        }


        // Full list of all categories with current age group label
        const listEl = document.getElementById('tv-next-list');
        if (listEl) {
            const ageHeader = `<div style="font-size: 0.7rem; color: var(--primary); font-weight: 600; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05rem;">${currentAgeLabel}</div>`;
            listEl.innerHTML = ageHeader + this.categories.map((cat, i) => {
                const isActive = i === currentIndex;
                const isNext = i === nextCatIndex && nextCatIndex !== currentIndex;
                const bg = isActive ? 'rgba(255,255,255,0.12)' : isNext ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)';
                const opacity = isActive ? '1' : '0.7';
                const border = isActive ? `border-left: 3px solid ${cat.color};` : 'border-left: 3px solid transparent;';
                return `<div onclick="tv.goTo(${i})" style="display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.65rem; margin-bottom: 0.3rem; border-radius: 0.4rem; cursor: pointer; background: ${bg}; opacity: ${opacity}; transition: all 0.2s; ${border}">
                    <i class="fas ${cat.icon}" style="color: ${cat.color}; font-size: 0.85rem; width: 1.1rem; text-align: center;"></i>
                    <span style="font-size: 0.85rem; flex: 1; font-weight: ${isActive ? '600' : '400'};">${cat.title.replace('Top 50 - ', '')}</span>
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

    _personalAthlete: null,
    _selectedPersonalAgeGroup: null,

    renderPersonalRanking(athlete, selectedKey) {
        const container = document.getElementById('tv-personal-ranking');
        if (!container) return;

        const myAge = this.calculateAge(athlete.dob);
        const myGroup = this.ageGroups.find(g => g.key !== 'all' && myAge >= g.min && myAge <= g.max);
        if (!selectedKey) selectedKey = this._selectedPersonalAgeGroup || (myGroup ? myGroup.key : '6-12');
        this._selectedPersonalAgeGroup = selectedKey;

        const selectedGroup = this.ageGroups.find(g => g.key === selectedKey);
        if (!selectedGroup || selectedKey === 'all') return;

        // Filter athletes in selected age group
        const groupAthletes = this.athletes.filter(a => {
            const age = this.calculateAge(a.dob);
            return age !== null && age >= selectedGroup.min && age <= selectedGroup.max;
        });

        // Sort by total points descending
        groupAthletes.sort((a, b) => this.calcTotal(b) - this.calcTotal(a));

        const isInGroup = groupAthletes.some(a => a.id === athlete.id);
        const myPoints = this.calcTotal(athlete);

        // Calculate rank: insert athlete virtually if not in group
        let rankList = [...groupAthletes];
        if (!isInGroup) {
            rankList.push(athlete);
            rankList.sort((a, b) => this.calcTotal(b) - this.calcTotal(a));
        }
        const myRank = rankList.findIndex(a => a.id === athlete.id);

        // Age group buttons (exclude 'all')
        const buttons = this.ageGroups.filter(g => g.key !== 'all').map(g => {
            const isActive = g.key === selectedKey;
            const isMyGroup = myGroup && g.key === myGroup.key;
            return `<button onclick="tv.renderPersonalRanking(tv._personalAthlete,'${g.key}')" style="
                padding: 0.4rem 0.75rem; border-radius: 0.5rem; font-size: 0.8rem; cursor: pointer;
                border: 1px solid ${isActive ? 'var(--primary)' : 'var(--border)'};
                background: ${isActive ? 'var(--primary)' : 'transparent'};
                color: ${isActive ? 'white' : 'var(--text-muted)'};
                font-weight: ${isActive ? '700' : '400'};
            ">${g.label}${isMyGroup ? ' ★' : ''}</button>`;
        }).join('');

        // Top 5 from group + always show athlete
        const top5 = groupAthletes.slice(0, 5).map((a, i) => {
            const isMe = a.id === athlete.id;
            const medals = ['🥇', '🥈', '🥉'];
            const prefix = i < 3 ? medals[i] : `${i + 1}.`;
            const name = a.name.split(' ')[0] + (a.name.split(' ').length > 1 ? ' ' + a.name.split(' ').slice(-1)[0][0] + '.' : '');
            return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.75rem; border-radius: 0.5rem; ${isMe ? 'background: rgba(14,165,233,0.15); border: 1px solid var(--primary);' : ''}">
                <span style="font-weight: ${isMe ? '700' : '400'}; ${isMe ? 'color: var(--primary);' : ''}">${prefix} ${name}</span>
                <span style="font-weight: 600; color: var(--accent);">${this.calcTotal(a)} p</span>
            </div>`;
        }).join('');

        const notInGroupLabel = !isInGroup ? ` (vârsta ta: ${myAge} ani)` : '';

        container.innerHTML = `
            <div style="background: rgba(255,255,255,0.03); border-radius: 0.75rem; padding: 1rem;">
                <h3 style="margin: 0 0 0.75rem 0; font-size: 1.1rem;"><i class="fas fa-trophy" style="color: var(--accent); margin-right: 0.5rem;"></i>Clasament pe Vârstă</h3>
                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem;">${buttons}</div>
                <div style="text-align: center; padding: 0.75rem; background: rgba(14,165,233,0.1); border-radius: 0.75rem; margin-bottom: 0.75rem; border: 2px solid var(--primary);">
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Locul tău în ${selectedGroup.label}${notInGroupLabel}</div>
                    <div style="font-size: 2.2rem; font-weight: 900; color: var(--primary);">${myRank + 1}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">din ${isInGroup ? groupAthletes.length : groupAthletes.length + 1} sportivi • ${myPoints} puncte</div>
                </div>
                ${groupAthletes.length > 0 ? `
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem; font-weight: 600;">Top 5 — ${selectedGroup.label}</div>
                    <div style="display: flex; flex-direction: column; gap: 0.2rem;">${top5}</div>
                ` : '<div style="text-align: center; color: var(--text-muted); padding: 0.5rem;">Niciun sportiv în această grupă.</div>'}
            </div>
        `;
    },

    showPersonal(athlete) {
        if (this.interval) clearInterval(this.interval);
        this._personalAthlete = athlete;
        this._selectedPersonalAgeGroup = null;
        document.getElementById('tv-personal').classList.remove('hidden');

        document.getElementById('tv-personal-name').textContent = `Istoric: ${athlete.name}`;

        // Render age group ranking
        this.renderPersonalRanking(athlete);

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
            // Reset canvas to avoid stale Chart.js state
            const oldCanvas = document.getElementById(canvasId);
            const parent = oldCanvas.parentNode;
            const newCanvas = document.createElement('canvas');
            newCanvas.id = canvasId;
            parent.replaceChild(newCanvas, oldCanvas);

            const ctx = newCanvas.getContext('2d');
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartLabels,
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
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
                    }
                }
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
