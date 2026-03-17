const storage = {
    ATHLETES_KEY: 'athlete_data',
    CREDENTIALS_KEY: 'athlete_credentials',

    getAthletes() {
        const data = localStorage.getItem(this.ATHLETES_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveAthletes(athletes) {
        localStorage.setItem(this.ATHLETES_KEY, JSON.stringify(athletes));
        this.syncToServer();
    },

    async syncFromServer() {
        try {
            const response = await fetch('/api/athletes');
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    localStorage.setItem(this.ATHLETES_KEY, JSON.stringify(data));
                    return data;
                }
            }
        } catch (err) {
            console.error('Sync from server failed:', err);
        }
        return this.getAthletes();
    },

    async syncToServer() {
        try {
            const athletes = this.getAthletes();
            await fetch('/api/athletes', {
                method: 'POST',
                body: JSON.stringify(athletes),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (err) {
            console.error('Sync to server failed:', err);
        }
    },

    saveCredentials(email, password, isAdmin) {
        localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify({ email, password, isAdmin }));
    },

    getCredentials() {
        const data = localStorage.getItem(this.CREDENTIALS_KEY);
        return data ? JSON.parse(data) : null;
    },

    clearCredentials() {
        localStorage.removeItem(this.CREDENTIALS_KEY);
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
            return athletes[index]; // Return updated athlete
        }
        return null;
    },

    recordStartLogin(id) {
        const athletes = this.getAthletes();
        const index = athletes.findIndex(a => a.id === id);
        if (index !== -1) {
            athletes[index].last_start_login = new Date().toISOString();
            this.saveAthletes(athletes);
        }
    },

    canLoginToStart(id) {
        const athletes = this.getAthletes();
        const athlete = athletes.find(a => a.id === id);
        if (!athlete || !athlete.last_start_login) return true;

        const lastLogin = new Date(athlete.last_start_login);
        const now = new Date();
        const diffInHours = (now - lastLogin) / (1000 * 60 * 60);
        
        return diffInHours >= 1; // 1 hour cooldown
    }
};
