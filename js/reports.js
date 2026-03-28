const reports = {
    // Helper: copy HTML to clipboard and open Gmail compose
    async _openEmail(to, subject, html) {
        try {
            const htmlBlob = new Blob([html], { type: 'text/html' });
            const textBlob = new Blob([' '], { type: 'text/plain' });
            await navigator.clipboard.write([
                new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
            ]);
        } catch (e) {
            // fallback
        }
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${encodeURIComponent(subject)}`;
        window.open(gmailUrl, '_blank');
        app.showToast('Email copiat! Dă paste (Cmd+V) în Gmail.', 'info');
    },

    // Generate medal emoji for rank
    _medal(rank) {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    },

    // Build HTML top 10 table
    _buildTop10TableHtml(top10) {
        let rows = '';
        top10.forEach((a, i) => {
            const bgColor = i === 0 ? '#fff8e1' : i === 1 ? '#f5f5f5' : i === 2 ? '#fff3e0' : (i % 2 === 0 ? '#ffffff' : '#f9fafb');
            const fontWeight = i < 3 ? 'bold' : 'normal';
            rows += `<tr style="background:${bgColor};">
                <td style="padding:10px 14px;text-align:center;font-weight:${fontWeight};font-size:16px;">${this._medal(i + 1)}</td>
                <td style="padding:10px 14px;font-weight:${fontWeight};">${a.name}</td>
                <td style="padding:10px 14px;text-align:center;font-weight:bold;color:#0ea5e9;">${dashboard.calculateTotalPoints(a)} p</td>
            </tr>`;
        });

        return `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-family:Arial,sans-serif;">
            <thead>
                <tr style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;">
                    <th style="padding:12px 14px;text-align:center;width:60px;">Loc</th>
                    <th style="padding:12px 14px;text-align:left;">Sportiv</th>
                    <th style="padding:12px 14px;text-align:center;width:100px;">Puncte</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
    },

    // Build HTML points breakdown table for an athlete
    _buildBreakdownTableHtml(athlete) {
        const m = athlete.metrics || {};
        const rows = [
            ['Flotări', `${m.push_ups || 0} nr`, '× 2p', `${Math.round((m.push_ups || 0) * 2)}p`],
            ['Plank', `${m.plank || 0} sec`, '× 1p', `${Math.round((m.plank || 0) * 1)}p`],
            ['Săritura în lungime', `${m.long_jump || 0} cm`, '× 0.5p', `${Math.round((m.long_jump || 0) * 0.5)}p`],
            ['Timp agățat', `${m.hang_time || 0} sec`, '× 2p', `${Math.round((m.hang_time || 0) * 2)}p`],
            ['Forța strângerii', `${m.grip_strength || 0} kg`, '× 2p', `${Math.round((m.grip_strength || 0) * 2)}p`],
            ['Forța loviturii', `${m.punch_force || 0} kgf`, '× 0.5p', `${Math.round((m.punch_force || 0) * 0.5)}p`],
            ['Evenimente (prezențe, etc.)', '', '', `${athlete.points || 0}p`],
        ];

        let rowsHtml = '';
        rows.forEach(([label, val, mult, pts], i) => {
            const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            rowsHtml += `<tr style="background:${bg};">
                <td style="padding:8px 14px;">${label}</td>
                <td style="padding:8px 14px;text-align:center;color:#64748b;">${val}</td>
                <td style="padding:8px 14px;text-align:center;color:#64748b;">${mult}</td>
                <td style="padding:8px 14px;text-align:center;font-weight:bold;color:#0ea5e9;">${pts}</td>
            </tr>`;
        });

        return `<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;font-family:Arial,sans-serif;font-size:14px;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th style="padding:10px 14px;text-align:left;">Probă</th>
                    <th style="padding:10px 14px;text-align:center;">Valoare</th>
                    <th style="padding:10px 14px;text-align:center;">Multiplicator</th>
                    <th style="padding:10px 14px;text-align:center;">Puncte</th>
                </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
                <tr style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;">
                    <td colspan="3" style="padding:10px 14px;font-weight:bold;">TOTAL</td>
                    <td style="padding:10px 14px;text-align:center;font-weight:bold;font-size:16px;">${dashboard.calculateTotalPoints(athlete)} p</td>
                </tr>
            </tfoot>
        </table>`;
    },

    sendMonthlyReport(athleteId) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;

        const score = dashboard.calculateScore(athlete.metrics);
        const rank = this.calculateRank(athleteId);
        const totalPts = dashboard.calculateTotalPoints(athlete);

        const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
            <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                <h1 style="color:white;margin:0;font-size:28px;">FitGo</h1>
                <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Raport Lunar</p>
            </div>
            <div style="padding:24px;background:#ffffff;border:1px solid #e2e8f0;">
                <p style="font-size:16px;margin:0 0 20px;">Salut, <strong>${athlete.name}</strong>!</p>
                <div style="display:flex;gap:12px;margin-bottom:24px;">
                    <div style="flex:1;background:#f0f9ff;border-radius:10px;padding:16px;text-align:center;">
                        <div style="font-size:12px;color:#64748b;">Scor</div>
                        <div style="font-size:28px;font-weight:bold;color:#0ea5e9;">${score}/100</div>
                    </div>
                    <div style="flex:1;background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;">
                        <div style="font-size:12px;color:#64748b;">Puncte</div>
                        <div style="font-size:28px;font-weight:bold;color:#10b981;">${totalPts}p</div>
                    </div>
                    <div style="flex:1;background:#fff7ed;border-radius:10px;padding:16px;text-align:center;">
                        <div style="font-size:12px;color:#64748b;">Clasament</div>
                        <div style="font-size:28px;font-weight:bold;color:#f59e0b;">${this._medal(rank)}</div>
                    </div>
                </div>
                <h3 style="margin:0 0 12px;color:#334155;">Detalii puncte</h3>
                ${this._buildBreakdownTableHtml(athlete)}
            </div>
            <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">Continuă să te antrenezi din greu! 💪</p>
            </div>
        </div>`;

        this._openEmail(athlete.email, `Raport Lunar de Performanță - ${athlete.name}`, html);
    },

    sendInactivityEmail(athleteId) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;

        const daysAbsent = athlete.last_start_login
            ? Math.floor((new Date() - new Date(athlete.last_start_login)) / (1000 * 60 * 60 * 24))
            : '...';

        const html = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7,#0369a1);padding:40px 30px;text-align:center;">
                <div style="font-size:60px;margin-bottom:12px;">😢</div>
                <h1 style="color:white;margin:0 0 8px 0;font-size:26px;font-weight:700;">Ne e dor de tine!</h1>
                <p style="color:rgba(255,255,255,0.85);margin:0;font-size:15px;">Sala nu e la fel fără tine</p>
            </div>

            <div style="padding:32px 28px;background:#ffffff;">
                <p style="font-size:18px;margin:0 0 16px 0;">Salut, <strong>${athlete.name}</strong>! 👋</p>

                <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
                    <p style="margin:0 0 4px 0;color:#92400e;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Zile de când nu te-am văzut</p>
                    <p style="margin:0;color:#78350f;font-size:42px;font-weight:800;">${daysAbsent}</p>
                </div>

                <p style="color:#475569;font-size:15px;line-height:1.7;margin:20px 0;">
                    Am observat că nu ai mai trecut pe la antrenament de ceva vreme.
                    Colegii tăi te așteaptă, iar progresul nu se face singur! 💪
                </p>

                <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;">
                    <p style="margin:0;color:#0c4a6e;font-size:14px;font-weight:600;">Nu uita!</p>
                    <p style="margin:6px 0 0 0;color:#0369a1;font-size:14px;">Fiecare prezență la sală = <strong>50 puncte</strong> 🏆</p>
                </div>

                <div style="text-align:center;margin:28px 0 8px 0;">
                    <div style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;padding:14px 40px;border-radius:50px;font-weight:700;font-size:16px;letter-spacing:0.5px;">
                        Te așteptăm la sală! 🏋️
                    </div>
                </div>
            </div>

            <div style="background:#f1f5f9;padding:20px 28px;text-align:center;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 4px 0;color:#64748b;font-size:13px;font-weight:600;">Echipa FitGo</p>
                <p style="margin:0;color:#94a3b8;font-size:11px;">Hai la antrenament! Succesul vine din constanță.</p>
            </div>
        </div>`;

        this._openEmail(athlete.email, `Ne e dor de tine, ${athlete.name}! 😢`, html);
    },

    renderTodo() {
        const athletes = storage.getAthletes();
        const now = new Date();

        // Inactive: no login for 7+ days (or never logged in via /start)
        const inactive = athletes.filter(a => {
            if (!a.last_start_login) return true;
            const days = (now - new Date(a.last_start_login)) / (1000 * 60 * 60 * 24);
            return days >= 7;
        });

        // Needs evaluation: all metrics are 0 or missing
        const needsEval = athletes.filter(a => {
            const m = a.metrics || {};
            return !m.punch_force && !m.long_jump && !m.hang_time && !m.plank && !m.grip_strength && !m.push_ups;
        });

        // Render inactive list
        const inactiveList = document.getElementById('todo-inactive-list');
        if (inactive.length === 0) {
            inactiveList.innerHTML = '<tr><td colspan="4" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Toți sportivii sunt activi! 🎉</td></tr>';
        } else {
            inactiveList.innerHTML = inactive.map(a => {
                let lastLoginText = 'Niciodată';
                let daysAbsent = '∞';
                if (a.last_start_login) {
                    const lastDate = new Date(a.last_start_login);
                    lastLoginText = lastDate.toLocaleDateString('ro-RO');
                    daysAbsent = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
                }
                return `
                <tr style="border-bottom: 1px solid var(--border);" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${a.photo || 'https://via.placeholder.com/36'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #ef4444;">
                        <div>
                            <div style="font-weight: 600;">${a.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
                        </div>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${lastLoginText}</td>
                    <td style="padding: 0.75rem 1rem;"><span style="color: #ef4444; font-weight: bold;">${daysAbsent} zile</span></td>
                    <td style="padding: 0.75rem 1rem;">
                        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-color: #ef4444; color: #ef4444;" onclick="reports.sendInactivityEmail(${a.id})">
                            <i class="fas fa-envelope"></i> Trimite Email
                        </button>
                    </td>
                </tr>`;
            }).join('');
        }

        // Render needs eval list
        const evalList = document.getElementById('todo-eval-list');
        if (needsEval.length === 0) {
            evalList.innerHTML = '<tr><td colspan="3" style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Toți sportivii au fost evaluați! ✅</td></tr>';
        } else {
            evalList.innerHTML = needsEval.map(a => `
                <tr style="border-bottom: 1px solid var(--border);" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${a.photo || 'https://via.placeholder.com/36'}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid #f59e0b;">
                        <div style="font-weight: 600;">${a.name}</div>
                    </td>
                    <td style="padding: 0.75rem 1rem; color: var(--text-muted);">${a.email}</td>
                    <td style="padding: 0.75rem 1rem;">
                        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="dashboard.openEvaluation(${a.id})">
                            <i class="fas fa-clipboard-check"></i> Evaluează
                        </button>
                    </td>
                </tr>
            `).join('');
        }
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

        const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
            <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                <h1 style="color:white;margin:0;font-size:28px;">FitGo</h1>
                <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Raport Lunar de Performanță</p>
            </div>
            <div style="padding:24px;background:#ffffff;border:1px solid #e2e8f0;">
                <p style="font-size:16px;margin:0 0 6px;">Salut, <strong>${athlete.name}</strong>!</p>
                <p style="color:#64748b;margin:0 0 20px;">Iată rezultatele tale pe luna aceasta:</p>
                <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
                    <div style="font-size:14px;color:#64748b;margin-bottom:4px;">Locul tău în clasament</div>
                    <div style="font-size:48px;font-weight:bold;color:#0ea5e9;">${this._medal(rank)}</div>
                    <div style="font-size:24px;font-weight:bold;color:#0284c7;margin-top:4px;">${totalPts} puncte</div>
                </div>
                <h3 style="margin:0 0 12px;color:#334155;">Detalii puncte</h3>
                ${this._buildBreakdownTableHtml(athlete)}
                <h3 style="margin:24px 0 12px;color:#334155;">Clasament Top 10</h3>
                ${this._buildTop10TableHtml(top10)}
            </div>
            <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">Continuă să te antrenezi din greu! 💪</p>
            </div>
        </div>`;

        this._openEmail(athlete.email, `Clasament Lunar FitGo & Rezultate - ${athlete.name}`, html);
    },

    sendTop10ToAll() {
        const athletes = storage.getAthletes();
        const sorted = [...athletes].sort((a, b) => dashboard.calculateTotalPoints(b) - dashboard.calculateTotalPoints(a));
        const top10 = sorted.slice(0, 10);

        if (top10.length === 0) {
            app.showToast('Nu există sportivi în clasament.', 'error');
            return;
        }

        const emails = top10.map(a => a.email).join(',');

        const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
            <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
                <h1 style="color:white;margin:0;font-size:28px;">FitGo</h1>
                <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;font-size:14px;">Clasament Lunar Top 10</p>
            </div>
            <div style="padding:24px;background:#ffffff;border:1px solid #e2e8f0;">
                <p style="font-size:16px;margin:0 0 20px;">Salut campionilor! 🏆</p>
                <p style="color:#64748b;margin:0 0 20px;">Iată clasamentul Top 10 pe luna aceasta:</p>
                ${this._buildTop10TableHtml(top10)}
                <div style="margin-top:24px;padding:16px;background:#f0f9ff;border-radius:8px;border:1px solid #bae6fd;">
                    <h4 style="margin:0 0 8px;color:#0284c7;">Sistem de puncte</h4>
                    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.8;">
                        1 flotare = <strong>2p</strong> &nbsp;|&nbsp; 1 sec plank = <strong>1p</strong> &nbsp;|&nbsp; 1 cm săritură = <strong>0.5p</strong><br>
                        1 sec agățat = <strong>2p</strong> &nbsp;|&nbsp; 1 kg strângere = <strong>2p</strong> &nbsp;|&nbsp; 1 kgf lovitură = <strong>0.5p</strong><br>
                        1 prezență sală = <strong>50p</strong>
                    </p>
                </div>
            </div>
            <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;">
                <p style="margin:0;color:#94a3b8;font-size:12px;">Felicitări tuturor! Continuați să vă antrenați din greu! 💪</p>
            </div>
        </div>`;

        this._openEmail(emails, 'Clasament Lunar Top 10 FitGo', html);
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
