const storage = {
    ATHLETES_KEY: 'athlete_data',
    SESSION_KEY: 'athlete_session',

    getAthletes() {
        const data = localStorage.getItem(this.ATHLETES_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveAthletes(athletes) {
        localStorage.setItem(this.ATHLETES_KEY, JSON.stringify(athletes));
    },

    saveSession(user, isAdmin) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify({ user, isAdmin }));
    },

    getSession() {
        const data = localStorage.getItem(this.SESSION_KEY);
        return data ? JSON.parse(data) : null;
    },

    clearSession() {
        localStorage.removeItem(this.SESSION_KEY);
    },

    addAthlete(athlete) {
        const athletes = this.getAthletes();
        athletes.push({
            id: Date.now(),
            created_at: new Date().toISOString(),
            points: 0,
            trainings: 0,
            matches: 0,
            metrics: {
                punch_force: 0,
                long_jump: 0,
                hang_time: 0,
                plank: 0,
                grip_strength: 0,
                sprint: 0
            },
            ...athlete
        });
        this.saveAthletes(athletes);
        return athletes;
    },

    updateAthletePoints(id, pointsToAdd) {
        const athletes = this.getAthletes();
        const index = athletes.findIndex(a => a.id === id);
        if (index !== -1) {
            athletes[index].points = (athletes[index].points || 0) + parseInt(pointsToAdd);
            this.saveAthletes(athletes);
        }
    }
};
