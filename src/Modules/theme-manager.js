// Gestione del tema light/dark mode
const ThemeManager = {
    currentTheme: 'light',

    init() {
        this.loadTheme();
        this.setupEventListeners();
    },

    loadTheme() {
        this.currentTheme = localStorage.getItem(Constants.STORAGE_KEYS.THEME) || 'light';
        this.applyTheme(this.currentTheme);
    },

    setupEventListeners() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
    },

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.currentTheme);
        localStorage.setItem(Constants.STORAGE_KEYS.THEME, this.currentTheme);
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('theme-toggle');

        if (themeToggle) {
            if (theme === 'dark') {
                themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
            } else {
                themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
            }
        }
    }
};