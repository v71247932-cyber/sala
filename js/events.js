const events = {
    handleAddPoints() {
        const athleteId = document.getElementById('event-athlete-select').value;
        const points = document.getElementById('event-type').value;
        
        if (!athleteId) {
            app.showToast('Selectați un sportiv!', 'error');
            return;
        }

        storage.updateAthletePoints(parseInt(athleteId), points);
        app.showToast(`S-au adăugat ${points} puncte!`);
        app.showSection('dashboard');
    }
};
