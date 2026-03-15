const events = {
    handleAddPoints() {
        const athleteId = document.getElementById('event-athlete-select').value;
        const points = document.getElementById('event-type').value;
        
        if (!athleteId) {
            alert('Selectați un sportiv!');
            return;
        }

        storage.updateAthletePoints(parseInt(athleteId), points);
        alert(`S-au adăugat ${points} puncte!`);
        app.showSection('dashboard');
    }
};
