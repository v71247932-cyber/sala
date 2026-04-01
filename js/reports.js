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
        const totalPts = dashboard.calculateTotalPoints(athlete);

        // Build history line chart
        let history = athlete.evaluation_history || [];
        if (history.length === 0 && m) {
            const now = new Date();
            const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            history = [{ month: monthKey, ...m }];
        }
        history.sort((a, b) => a.month.localeCompare(b.month));

        const monthNames = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartHeight = 140;

        // Calculate overall scores per month
        const scores = history.map(h => {
            let total = 0;
            total += (h.push_ups || 0) * 2;
            total += (h.plank || 0) * 1;
            total += (h.long_jump || 0) * 0.5;
            total += (h.hang_time || 0) * 2;
            total += (h.grip_strength || 0) * 2;
            total += (h.punch_force || 0) * 0.5;
            return Math.round(total);
        });
        const maxScore = Math.max(...scores, 1);

        // Build vertical bar columns that simulate a line chart
        const colWidth = Math.floor(100 / Math.max(history.length, 1));
        let columnsHtml = history.map((h, i) => {
            const [year, month] = h.month.split('-');
            const label = `${monthNames[parseInt(month) - 1]}`;
            const score = scores[i];
            const barH = Math.round((score / maxScore) * chartHeight);
            const topPad = chartHeight - barH;

            return `<td style="vertical-align:bottom;text-align:center;padding:0 2px;width:${colWidth}%;">
                <div style="font-size:11px;font-weight:bold;color:#0284c7;margin-bottom:2px;">${score}p</div>
                <div style="background:linear-gradient(180deg,#0ea5e9,#0284c7);height:${barH}px;border-radius:4px 4px 0 0;min-height:4px;"></div>
                <div style="font-size:10px;color:#64748b;margin-top:4px;">${label}</div>
            </td>`;
        }).join('');

        // Per-metric mini charts
        const metricDefs = [
            { key: 'push_ups', label: 'Flotări', unit: 'nr', color: '#eab308', mult: 2 },
            { key: 'plank', label: 'Plank', unit: 's', color: '#10b981', mult: 1 },
            { key: 'long_jump', label: 'Săritură', unit: 'cm', color: '#3b82f6', mult: 0.5 },
            { key: 'hang_time', label: 'Agățat', unit: 's', color: '#ef4444', mult: 2 },
            { key: 'grip_strength', label: 'Strângere', unit: 'kg', color: '#8b5cf6', mult: 2 },
            { key: 'punch_force', label: 'Lovitură', unit: 'kgf', color: '#f97316', mult: 0.5 },
        ];

        const miniChartHeight = 60;
        const metricCells = metricDefs.map(md => {
            const vals = history.map(h => h[md.key] || 0);
            const maxVal = Math.max(...vals, 1);
            const miniCols = history.map(h => {
                const val = h[md.key] || 0;
                const barH = Math.round((val / maxVal) * miniChartHeight);
                return `<td style="vertical-align:bottom;text-align:center;padding:0 1px;">
                    <div style="font-size:9px;color:#64748b;margin-bottom:1px;">${val}</div>
                    <div style="background:${md.color};height:${barH}px;border-radius:3px 3px 0 0;min-height:2px;"></div>
                </td>`;
            }).join('');
            const pts = Math.round((m[md.key] || 0) * md.mult);
            return `<td style="padding:4px;vertical-align:top;width:33%;">
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px;">
                    <div style="font-size:11px;font-weight:bold;color:${md.color};margin-bottom:4px;">${md.label} <span style="float:right;color:#64748b;font-weight:normal;">${pts}p</span></div>
                    <table style="width:100%;border-collapse:collapse;height:${miniChartHeight + 15}px;"><tr>${miniCols}</tr></table>
                </div>
            </td>`;
        });

        const metricGridHtml = `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
            <tr>${metricCells[0]}${metricCells[1]}${metricCells[2]}</tr>
            <tr>${metricCells[3]}${metricCells[4]}${metricCells[5]}</tr>
        </table>`;

        return `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:12px;">
                <div style="font-size:13px;color:#64748b;margin-bottom:8px;text-align:center;">Evoluție scor general</div>
                <table style="width:100%;border-collapse:collapse;height:${chartHeight + 40}px;">
                    <tr>${columnsHtml}</tr>
                </table>
            </div>
            ${metricGridHtml}
            <div style="margin-bottom:12px;">
                <span style="display:inline-block;background:#f0f9ff;border:1px solid #bae6fd;padding:4px 10px;border-radius:6px;font-size:12px;margin:2px;">Evenimente: <strong style="color:#0ea5e9;">${athlete.points || 0}p</strong></span>
            </div>
            <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);color:white;padding:12px 16px;border-radius:8px;font-family:Arial,sans-serif;">
                <table style="width:100%;"><tr>
                    <td style="font-weight:bold;font-size:14px;color:white;">TOTAL</td>
                    <td style="font-weight:bold;font-size:18px;color:white;text-align:right;">${totalPts} p</td>
                </tr></table>
            </div>`;
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

        // Mark as notified — hide from inactive list for 7 days
        storage.updateAthlete(athleteId, { inactivity_email_sent: new Date().toISOString() });
        this.renderTodo();
        app.showToast(`Email de inactivitate trimis către ${athlete.name}`);
    },

    renderTodo() {
        const athletes = storage.getAthletes();
        const now = new Date();

        // Inactive: no login for 7+ days (or never logged in via /start)
        // Exclude athletes who received inactivity email in the last 7 days
        const inactive = athletes.filter(a => {
            if (a.inactivity_email_sent) {
                const daysSinceEmail = (now - new Date(a.inactivity_email_sent)) / (1000 * 60 * 60 * 24);
                if (daysSinceEmail < 7) return false;
            }
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
                    <td style="padding: 0.75rem 1rem;">
                        <div style="font-weight: 600;">${a.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
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
                    <td style="padding: 0.75rem 1rem; font-weight: 600;">${a.name}</td>
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
                <td style="padding: 1rem;">
                    <div style="font-weight: 600;">${a.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${a.email}</div>
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
