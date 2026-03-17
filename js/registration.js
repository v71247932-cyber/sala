const registration = {
    init() {
        const form = document.getElementById('registration-form');
        const dobInput = document.getElementById('reg-dob');
        const guardianSection = document.getElementById('guardian-info');

        dobInput.addEventListener('change', () => {
            const birthDate = new Date(dobInput.value);
            const age = this.calculateAge(birthDate);
            if (age < 18) {
                guardianSection.classList.remove('hidden');
            } else {
                guardianSection.classList.add('hidden');
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Public signup listener
        const pubForm = document.getElementById('public-signup-form');
        if (pubForm) {
            pubForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePublicSignup();
            });
        }
    },

    calculateAge(birthday) {
        const ageDifMs = Date.now() - birthday.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    },

    generateUniqueCode() {
        const athletes = storage.getAthletes();
        let code;
        let isUnique = false;

        while (!isUnique) {
            code = Math.floor(1000 + Math.random() * 9000).toString();
            isUnique = !athletes.some(a => a.unique_code === code);
        }
        return code;
    },

    handleRegister() {
        const password = document.getElementById('reg-password').value;
        if (password.length < 6) {
            alert('Parola trebuie să aibă minim 6 caractere!');
            return;
        }

        const uniqueCode = this.generateUniqueCode();

        const athleteData = {
            unique_code: uniqueCode,
            password: password,
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            phone: document.getElementById('reg-phone').value,
            dob: document.getElementById('reg-dob').value,
            gender: document.getElementById('reg-gender').value,
            goal: document.getElementById('reg-goal').value,
            height: document.getElementById('reg-height').value,
            weight: document.getElementById('reg-weight').value,
            guardian: {
                name: document.getElementById('reg-guardian-name').value,
                phone: document.getElementById('reg-guardian-phone').value
            }
        };

        storage.addAthlete(athleteData);

        // Success flow
        document.getElementById('display-unique-code').innerText = uniqueCode;
        document.getElementById('success-modal').classList.remove('hidden');

        document.getElementById('registration-form').reset();
        document.getElementById('guardian-info').classList.add('hidden');
    },

    closeSuccess() {
        document.getElementById('success-modal').classList.add('hidden');
        app.showSection('dashboard');
    },

    handlePublicSignup() {
        const uniqueCode = this.generateUniqueCode();
        const password = document.getElementById('pub-password').value;

        const athleteData = {
            id: Date.now(),
            unique_code: uniqueCode,
            password: password,
            name: document.getElementById('pub-name').value,
            email: document.getElementById('pub-email').value,
            phone: document.getElementById('pub-phone').value,
            dob: document.getElementById('pub-dob').value,
            goal: document.getElementById('pub-goal').value,
            metrics: { punch_force: 0, long_jump: 0, hang_time: 0, plank: 0, grip_strength: 0, sprint: 0 },
            active: true
        };

        storage.addAthlete(athleteData);

        // Success flow
        document.getElementById('display-unique-code').innerText = uniqueCode;
        document.getElementById('success-modal').classList.remove('hidden');

        // Auto-login
        app.isAdmin = false;
        app.autoLogin(athleteData);

        document.getElementById('public-signup-form').reset();
    }
};

document.addEventListener('DOMContentLoaded', () => registration.init());
