const app = {
    currentSection: 'dashboard',
    isLoggedIn: false,
    isAdmin: false,
    currentUser: null,

    init() {
        this.bindEvents();

        // Detect routes (support both path and hash routing)
        const path = window.location.pathname.toLowerCase();
        const hash = window.location.hash.toLowerCase();
        const params = new URLSearchParams(window.location.search);

        console.log('--- ROUTE DETECTION ---');
        console.log('Path:', path);
        console.log('Hash:', hash);
        console.log('Search:', window.location.search);

        if (path === '/start' || path.endsWith('/start') || path.endsWith('/start/') || hash === '#/start' || hash === '#start' || params.get('page') === 'start') {
            this.currentRoute = 'start';
        } else if (path === '/nou' || path.endsWith('/nou') || path.endsWith('/nou/') || hash === '#/nou' || hash === '#nou' || params.get('page') === 'nou') {
            this.currentRoute = 'nou';
        } else if (path === '/admin' || path.endsWith('/admin') || path.endsWith('/admin/') || hash === '#/admin' || hash === '#admin' || params.get('page') === 'admin') {
            this.currentRoute = 'main';
        } else if (path === '/' || path === '' || path === '/index.html') {
            this.currentRoute = 'tv';
        } else {
            this.currentRoute = 'main';
        }

        console.log('Detected Route:', this.currentRoute);

        // Sync data from server, then try to restore session from credentials
        storage.syncFromServer().then(() => {
            const creds = storage.getCredentials();
            if (creds) {
                if (creds.isAdmin) {
                    this.isLoggedIn = true;
                    this.isAdmin = true;
                    this.currentUser = { name: 'Administrator' };
                } else {
                    const athletes = storage.getAthletes();
                    const athlete = athletes.find(a => a.email === creds.email && a.password === creds.password);
                    if (athlete) {
                        this.isLoggedIn = true;
                        this.isAdmin = false;
                        this.currentUser = athlete;
                    } else {
                        // Credentials no longer valid (e.g. account deleted)
                        storage.clearCredentials();
                    }
                }
            }
        }).catch(err => {
            console.error('App init sync failed:', err);
        }).finally(() => {
            this.seedDefaultEvents();
            this.updateView();
            const loader = document.getElementById('loading-screen');
            if (loader) loader.style.display = 'none';
            console.log('App initialized and view updated');
        });

        // For start/nou/tv routes, don't block on server sync — show immediately
        if (this.currentRoute !== 'main') {
            this.updateView();
            const loader = document.getElementById('loading-screen');
            if (loader) loader.style.display = 'none';
        }
        console.log('App initialized on route:', this.currentRoute);
    },

    updateView() {
        const authScreen = document.getElementById('auth-screen');
        const startScreen = document.getElementById('start-screen');
        const mainApp = document.getElementById('main-app');
        const tvScreen = document.getElementById('tv-screen');
        const navReg = document.getElementById('nav-registration-link');
        const navEvents = document.getElementById('nav-events-link');
        const navTop10 = document.getElementById('nav-top10-link');
        const navTodo = document.getElementById('nav-todo-link');

        // Reset visibility
        [authScreen, startScreen, mainApp, tvScreen].forEach(s => s?.classList.add('hidden'));

        if (this.currentRoute === 'tv') {
            tvScreen?.classList.remove('hidden');
            tv.init();
            return;
        }

        if (this.currentRoute === 'start') {
            startScreen?.classList.remove('hidden');
            return;
        }

        if (this.currentRoute === 'nou') {
            mainApp?.classList.remove('hidden');
            // Hide nav and show only registration
            document.getElementById('main-nav')?.classList.add('hidden');
            this.showSection('registration');
            return;
        }

        if (this.isLoggedIn) {
            mainApp?.classList.remove('hidden');

            // Role based navigation
            if (navReg) navReg.classList.add('hidden'); // Always hide "Sportiv Nou" from nav as per request
            if (navEvents) {
                if (this.isAdmin) {
                    navEvents.classList.remove('hidden');
                } else {
                    navEvents.classList.add('hidden');
                }
            }
            if (navTop10) {
                if (this.isAdmin) {
                    navTop10.style.display = '';
                    navTop10.classList.remove('hidden');
                } else {
                    navTop10.style.display = 'none';
                }
            }
            if (navTodo) {
                if (this.isAdmin) {
                    navTodo.style.display = '';
                    navTodo.classList.remove('hidden');
                } else {
                    navTodo.style.display = 'none';
                }
            }

            this.showSection('dashboard');
            this.updateHeaderUserInfo();
        } else {
            authScreen?.classList.remove('hidden');
        }
    },

    updateHeaderUserInfo() {
        const userInfo = document.getElementById('user-info-display');
        if (userInfo && this.currentUser) {
            if (this.isAdmin) {
                userInfo.innerHTML = `<span style="color: var(--accent); font-weight: bold;">ADMIN</span>`;
            } else {
                userInfo.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: flex-end; line-height: 1;">
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Cod Acces</span>
                        <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${this.currentUser.unique_code}</span>
                    </div>
                `;
            }
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
            this.isAdmin = true;
            storage.saveCredentials(email, pass, true);
            this.autoLogin({ name: 'Administrator' });
            return;
        }

        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.email === email && a.password === pass);

        if (athlete) {
            this.isAdmin = false;
            storage.saveCredentials(email, pass, false);
            this.autoLogin(athlete);
        } else {
            app.showToast('Email sau parolă incorectă!', 'error');
        }
    },

    handleStartLogin() {
        const input = document.getElementById('start-id');
        const code = input.value;
        const athletes = storage.getAthletes();
        const athlete = athletes.find(a => a.unique_code === code);

        if (athlete) {
            if (!storage.canLoginToStart(athlete.id)) {
                app.showToast('Poți folosi codul doar o dată pe zi!', 'error');
                input.value = '';
                return;
            }

            // Award points and record login
            storage.updateAthletePoints(athlete.id, 50);
            storage.recordStartLogin(athlete.id);

            // Show welcome popup
            const firstName = athlete.name.split(' ')[0];
            this.showWelcomePopup(firstName);

            // Clear input after 2 seconds for next child
            setTimeout(() => {
                input.value = '';
                // Optional: hide popup if it's still there
                const popup = document.getElementById('welcome-popup');
                if (popup) popup.classList.add('hidden');
            }, 2000);

        } else {
            app.showToast('Cod incorect! Verifică codul primit la înregistrare.', 'error');
            input.value = '';
        }
    },

    showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed;top:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
            document.body.appendChild(container);
        }
        const colors = { success: '#10b981', error: '#ef4444', info: '#0ea5e9' };
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        const toast = document.createElement('div');
        toast.style.cssText = `background:var(--card-bg,#1e293b);border:1px solid ${colors[type]};border-left:4px solid ${colors[type]};color:white;padding:0.75rem 1.25rem;border-radius:0.75rem;display:flex;align-items:center;gap:0.75rem;animation:slideIn 0.3s ease;box-shadow:0 4px 20px rgba(0,0,0,0.3);min-width:250px;`;
        toast.innerHTML = `<i class="fas ${icons[type]}" style="color:${colors[type]};font-size:1.1rem;"></i><span style="font-size:0.9rem;">${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 2500);
    },

    showWelcomePopup(name) {
        let popup = document.getElementById('welcome-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'welcome-popup';
            popup.className = 'welcome-overlay';
            document.body.appendChild(popup);
        }

        popup.innerHTML = `
            <div class="welcome-card">
                <div class="welcome-icon"><i class="fas fa-check-circle"></i></div>
                <h2>Bun venit, ${name}!</h2>
                <p>Ai primit <strong>+50 puncte</strong></p>
            </div>
        `;
        popup.classList.remove('hidden');
    },

    autoLogin(user) {
        this.isLoggedIn = true;
        this.currentUser = user;
        this.updateView();
    },

    logout() {
        this.isLoggedIn = false;
        this.isAdmin = false;
        this.currentUser = null;
        storage.clearCredentials();
        // Return to the route they were on
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
            events.render();
        } else if (sectionId === 'top10') {
            reports.renderTop10();
        } else if (sectionId === 'todo') {
            reports.renderTodo();
        }
    },

    // Seed default events if none exist
    seedDefaultEvents() {
        if (storage.getEvents().length === 0) {
            const defaults = [
                { name: 'Alergare Duminică', points: 100, description: 'Alergare de grup duminica dimineața' },
                { name: 'Susținere la Meci', points: 50, description: 'Prezență la meciul echipei' },
                { name: 'Seminar', points: 200, description: 'Participare la seminar sportiv' },
                { name: 'Cantonament Rusca', points: 300, description: 'Cantonament de weekend la Rusca' }
            ];
            defaults.forEach(e => storage.addEvent(e));
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
