const app = {
    currentSection: 'dashboard',
    isLoggedIn: false,
    isAdmin: false,
    currentUser: null,

    init() {
        this.bindEvents();
        
        // Check for persistent session
        const session = storage.getSession();
        if (session) {
            this.isLoggedIn = true;
            this.isAdmin = session.isAdmin;
            this.currentUser = session.user;
        }

        this.updateView();
        console.log('App initialized');
    },

    updateView() {
        const authScreen = document.getElementById('auth-screen');
        const mainApp = document.getElementById('main-app');
        const navReg = document.getElementById('nav-registration-link');
        const navEvents = document.getElementById('nav-events-link');

        if (this.isLoggedIn) {
            authScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
            
            // Role based navigation
            if (this.isAdmin) {
                navReg.classList.remove('hidden');
                navEvents.classList.remove('hidden');
            } else {
                navReg.classList.add('hidden');
                navEvents.classList.add('hidden');
            }
            
            this.showSection('dashboard');
        } else {
            authScreen.classList.remove('hidden');
            mainApp.classList.add('hidden');
        }
    },

    bindEvents() {
        // Scroll event for header shrinking with hysteresis to prevent flickering
        let isHeaderScrolled = false;
        window.addEventListener('scroll', () => {
            const nav = document.getElementById('main-nav');
            if (window.scrollY > 50 && !isHeaderScrolled) {
                nav.classList.add('scrolled');
                isHeaderScrolled = true;
            } else if (window.scrollY < 10 && isHeaderScrolled) {
                nav.classList.remove('scrolled');
                isHeaderScrolled = false;
            }
        });
    },

    toggleAuth(type) {
        if (type === 'signup') {
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('signup-prompt').classList.remove('hidden');
        } else {
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('signup-prompt').classList.add('hidden');
        }
    },

    handleLogin() {
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;

        if (email === 'admin@admin.ro' && pass === 'oijoij') {
            this.isLoggedIn = true;
            this.isAdmin = true;
            this.currentUser = { name: 'Administrator' };
            storage.saveSession(this.currentUser, this.isAdmin);
            this.updateView();
            return;
        }

        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.email === email && a.password === pass);

        if (athlete) {
            this.isLoggedIn = true;
            this.isAdmin = false;
            this.currentUser = athlete;
            storage.saveSession(this.currentUser, this.isAdmin);
            this.updateView();
        } else {
            alert('Email sau parolă incorectă!');
        }
    },

    logout() {
        this.isLoggedIn = false;
        this.isAdmin = false;
        this.currentUser = null;
        storage.clearSession();
        this.updateView();
    },

    showSection(sectionId) {
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        document.getElementById(sectionId).classList.remove('hidden');
        
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.remove('active');
            if (l.getAttribute('onclick')?.includes(sectionId)) {
                l.classList.add('active');
            }
        });

        this.currentSection = sectionId;
        
        // Trigger specific section updates
        if (sectionId === 'dashboard') {
            dashboard.render();
        } else if (sectionId === 'events') {
            this.updateEventAthleteList();
        }
    },

    updateEventAthleteList() {
        const select = document.getElementById('event-athlete-select');
        const athletes = storage.getAthletes();
        select.innerHTML = athletes.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
