const storage = {
    ATHLETES_KEY: 'athlete_data',
    CREDENTIALS_KEY: 'athlete_credentials',
    COOLDOWN_KEY: 'local_start_cooldowns',

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

            metrics: {
                punch_force: 0,
                long_jump: 0,
                hang_time: 0,
                plank: 0,
                grip_strength: 0
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
        const now = new Date().toISOString();
        
        if (index !== -1) {
            athletes[index].last_start_login = now;
            this.saveAthletes(athletes);
        }

        // Also save to a local-only key that won't be overwritten by server sync
        const cooldowns = JSON.parse(localStorage.getItem(this.COOLDOWN_KEY) || '{}');
        cooldowns[id] = now;
        localStorage.setItem(this.COOLDOWN_KEY, JSON.stringify(cooldowns));
    },

    canLoginToStart(id) {
        const athletes = this.getAthletes();
        const athlete = athletes.find(a => a.id === id);
        
        // 1. Check synced athlete data
        let lastLoginStr = athlete?.last_start_login;

        // 2. Check local-only cooldowns (secondary protection against refresh/sync race)
        const cooldowns = JSON.parse(localStorage.getItem(this.COOLDOWN_KEY) || '{}');
        const localLastLogin = cooldowns[id];

        // Use the most recent of the two
        if (localLastLogin && (!lastLoginStr || new Date(localLastLogin) > new Date(lastLoginStr))) {
            lastLoginStr = localLastLogin;
        }

        if (!lastLoginStr) return true;

        const lastLogin = new Date(lastLoginStr);
        const now = new Date();
        const diffInHours = (now - lastLogin) / (1000 * 60 * 60);
        
        return diffInHours >= 24; // 24 hour cooldown (once per day)
    },

    updateAthlete(id, data) {
        const athletes = this.getAthletes();
        const index = athletes.findIndex(a => a.id === id);
        if (index !== -1) {
            athletes[index] = { ...athletes[index], ...data };
            this.saveAthletes(athletes);
            return athletes[index];
        }
        return null;
    }
};
