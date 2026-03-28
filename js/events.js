const events = {
    render() {
        const tbody = document.getElementById('events-list');
        const evts = storage.getEvents();

        if (evts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: var(--text-muted);">Niciun eveniment creat. Apasă "Eveniment Nou" pentru a adăuga.</td></tr>';
            return;
        }

        tbody.innerHTML = evts.map(e => {
            const dateStr = e.date ? new Date(e.date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            return `<tr style="border-bottom: 1px solid var(--border);" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 1rem;">
                    <div style="font-weight: 600;">${e.name}</div>
                    ${e.description ? `<div style="font-size: 0.8rem; color: var(--text-muted);">${e.description}</div>` : ''}
                </td>
                <td style="padding: 1rem;">
                    <span style="background: rgba(14,165,233,0.1); color: var(--primary); padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-weight: 700; font-size: 0.9rem;">+${e.points}p</span>
                </td>
                <td style="padding: 1rem; color: var(--text-muted);">${dateStr}</td>
                <td style="padding: 1rem;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;" onclick="events.openModal(${e.id})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: #ef4444;" onclick="events.handleDelete(${e.id})"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    },

    openModal(editId) {
        const modal = document.getElementById('event-modal');
        const title = document.getElementById('event-modal-title');
        document.getElementById('event-form').reset();
        document.getElementById('event-edit-id').value = '';

        if (editId) {
            const evt = storage.getEvents().find(e => e.id === editId);
            if (!evt) return;
            title.textContent = 'Editează Eveniment';
            document.getElementById('event-edit-id').value = editId;
            document.getElementById('event-name').value = evt.name;
            document.getElementById('event-points').value = evt.points;
            document.getElementById('event-date').value = evt.date || '';
            document.getElementById('event-description').value = evt.description || '';
        } else {
            title.textContent = 'Eveniment Nou';
        }

        modal.classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('event-modal').classList.add('hidden');
    },

    handleSave(e) {
        e.preventDefault();
        const editId = document.getElementById('event-edit-id').value;
        const data = {
            name: document.getElementById('event-name').value,
            points: parseInt(document.getElementById('event-points').value),
            date: document.getElementById('event-date').value || null,
            description: document.getElementById('event-description').value || ''
        };

        if (editId) {
            storage.updateEvent(parseInt(editId), data);
            app.showToast('Eveniment actualizat!');
        } else {
            storage.addEvent(data);
            app.showToast('Eveniment creat!');
        }

        this.closeModal();
        this.render();
    },

    handleDelete(id) {
        if (!confirm('Ștergi acest eveniment?')) return;
        storage.deleteEvent(id);
        app.showToast('Eveniment șters!');
        this.render();
    },

    // Assign points modal (called from dashboard)
    openAssign(athleteId) {
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return;

        document.getElementById('assign-athlete-id').value = athleteId;
        document.getElementById('assign-points-title').textContent = `Puncte: ${athlete.name}`;

        const evts = storage.getEvents();
        const list = document.getElementById('assign-events-list');
        const noEvts = document.getElementById('assign-no-events');

        if (evts.length === 0) {
            list.innerHTML = '';
            noEvts.classList.remove('hidden');
        } else {
            noEvts.classList.add('hidden');
            list.innerHTML = evts.map(e => `
                <button class="btn btn-secondary" style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; text-align: left;" onclick="events.assignPoints(${athleteId}, ${e.points}, '${e.name.replace(/'/g, "\\'")}')">
                    <span style="font-weight: 600;">${e.name}</span>
                    <span style="color: var(--primary); font-weight: 700;">+${e.points}p</span>
                </button>
            `).join('');
        }

        document.getElementById('assign-points-modal').classList.remove('hidden');
    },

    closeAssign() {
        document.getElementById('assign-points-modal').classList.add('hidden');
    },

    assignPoints(athleteId, points, eventName) {
        storage.updateAthletePoints(athleteId, points);
        app.showToast(`+${points}p pentru ${eventName}!`);
        this.closeAssign();
        dashboard.render();
    }
};
