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

        // Public signup listener (auth-screen form)
        const pubForm = document.getElementById('public-signup-form');
        if (pubForm) {
            pubForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePublicSignup();
            });
        }
        // Public signup listener (nou-screen form)
        const nouForm = document.getElementById('public-signup-form-nou');
        if (nouForm) {
            nouForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePublicSignup('nou');
            });
        }
    },

    calculateAge(birthday) {
        const now = new Date();
        let age = now.getFullYear() - birthday.getFullYear();
        const m = now.getMonth() - birthday.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birthday.getDate())) age--;
        return age;
    },

    generateUniqueCode() {
        const athletes = storage.getAthletes();
        let code;
        let isUnique = false;

        while (!isUnique) {
            const arr = new Uint16Array(1);
            crypto.getRandomValues(arr);
            code = (1000 + (arr[0] % 9000)).toString();
            isUnique = !athletes.some(a => a.unique_code === code);
        }
        return code;
    },

    handleRegister() {
        const password = document.getElementById('reg-password').value;
        if (password.length < 6) {
            app.showToast('Parola trebuie să aibă minim 6 caractere!', 'error');
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
        // If came from public signup (/nou), redirect to TV leaderboard
        const path = window.location.pathname;
        if (path === '/nou' || path === '/start' || path.endsWith('/nou') || path.endsWith('/start')) {
            window.location.href = '/';
        } else {
            app.showSection('dashboard');
        }
    },

    handlePublicSignup(source) {
        const suffix = source === 'nou' ? '-nou' : '';
        const password = document.getElementById('pub-password' + suffix).value;
        if (password.length < 6) {
            app.showToast('Parola trebuie să aibă minim 6 caractere!', 'error');
            return;
        }
        const uniqueCode = this.generateUniqueCode();

        const firstName = document.getElementById('pub-firstname' + suffix).value.trim();
        const lastName = document.getElementById('pub-lastname' + suffix).value.trim();
        const fullName = lastName ? firstName + ' ' + lastName : firstName;

        const athleteData = {
            id: Date.now(),
            unique_code: uniqueCode,
            password: password,
            name: fullName,
            first_name: firstName,
            last_name: lastName,
            email: document.getElementById('pub-email' + suffix).value,
            dob: document.getElementById('pub-dob' + suffix).value,
            goal: document.getElementById('pub-goal' + suffix).value,
            metrics: { punch_force: 0, long_jump: 0, hang_time: 0, plank: 0, grip_strength: 0, push_ups: 0 },
            active: true
        };

        storage.addAthlete(athleteData);

        // Success flow
        document.getElementById('display-unique-code').innerText = uniqueCode;
        document.getElementById('success-modal').classList.remove('hidden');

        // Auto-login
        app.isAdmin = false;
        app.autoLogin(athleteData);

        document.getElementById('public-signup-form' + suffix).reset();
    }
};

document.addEventListener('DOMContentLoaded', () => registration.init());
