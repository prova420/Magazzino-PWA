// Gestione dello storico delle modifiche
const HistoryManager = {
    init() {
        this.loadHistory();
    },

    loadHistory() {
        this.history = Database.history;
    },

    addEntry(action, warehouseName) {
        const entry = {
            action,
            timestamp: new Date().toLocaleString(),
            warehouse: warehouseName
        };

        this.history.unshift(entry);
        
        // Mantieni solo le ultime 10 voci
        if (this.history.length > 10) {
            this.history = this.history.slice(0, 10);
        }

        Database.history = this.history;
        Database.save();
        this.renderHistory();
    },

    renderHistory() {
        const list = document.getElementById('history-list');
        if (!list) return;

        list.innerHTML = this.history.map(entry => `
            <li class="history-entry">
                <div class="history-timestamp">${entry.timestamp} | ${entry.warehouse}</div>
                ${entry.action}
            </li>
        `).join('');
    },

    setupEventListeners() {
        const historyHeader = document.getElementById('history-header');
        if (historyHeader) {
            historyHeader.addEventListener('click', () => this.toggleHistory());
        }
    },

    toggleHistory() {
        const content = document.getElementById('history-content');
        const chevron = document.getElementById('history-chevron');

        if (content && chevron) {
            if (content.style.display === 'none') {
                content.style.display = 'block';
                chevron.classList.remove('fa-chevron-down');
                chevron.classList.add('fa-chevron-up');
            } else {
                content.style.display = 'none';
                chevron.classList.remove('fa-chevron-up');
                chevron.classList.add('fa-chevron-down');
            }
        }
    }
};
// AGGIUNGI QUESTA RIGA ALLA FINE DI OGNI FILE MODULO
if (typeof window !== 'undefined') {
    window.HistoryManager = HistoryManager; // Sostituisci con il nome corretto del modulo
}