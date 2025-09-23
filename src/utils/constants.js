// src/utils/constants.js - VERSIONE COMPLETA CON COSTANTI STOCK
const Constants = {
    STORAGE_KEYS: {
        WAREHOUSE_DATA: 'warehouseData',
        WAREHOUSE_HISTORY: 'warehouseHistory',
        SORT_STATE: 'sortState',
        THEME: 'theme',
        AIRTABLE_CONFIG: 'airtableConfig'
    },
    
    DEFAULT_VALUES: {
        ALERT_THRESHOLD: 5,
        WAREHOUSE_NAME: 'Magazzino 1',
        CATEGORIES: ['cibo', 'pulizie'],
        LOW_STOCK_RATIO: 0.5 // 50% per stock critico
    },
    
    MESSAGES: {
        SUCCESS: 'Operazione completata con successo!',
        ERROR: 'Si è verificato un errore',
        CONFIRM_DELETE: 'Sei sicuro di voler eliminare questo elemento?',
        LOW_STOCK_WARNING: 'ATTENZIONE: {itemName} sotto il livello minimo ({threshold})!',
        FILTER_LOW_STOCK: 'Trovati {count} articoli in esaurimento',
        NO_LOW_STOCK: 'Nessun articolo in esaurimento trovato'
    },
    
    INTERVALS: {
        AUTO_SAVE: 5 * 60 * 1000, // 5 minuti
        FILTER_ANIMATION: 3000, // 3 secondi per animazione filtro
        HIGHLIGHT_DELAY: 100 // Ritardo tra evidenziazioni
    },

    // ===== NUOVE COSTANTI PER GESTIONE STOCK =====
    STOCK_LEVELS: {
        NORMAL: 'normal', // Sopra la soglia
        LOW: 'low', // Sotto la soglia
        CRITICAL: 'critical' // Sotto il 50% della soglia
    },
    
    // Soglie per determinare il livello di stock
    THRESHOLDS: {
        LOW_STOCK: 1.0, // 100% della soglia minima
        CRITICAL_STOCK: 0.5 // 50% della soglia minima
    },
    
    // Colori per ogni livello di stock (in formato HEX e RGB)
    COLORS: {
        NORMAL: {
            background: '#ffffff',
            border: '#3498db',
            text: '#333333'
        },
        LOW_STOCK: {
            background: '#ffebee',
            backgroundGradient: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
            border: '#f44336',
            text: '#c62828',
            rgb: 'rgb(255, 235, 238)'
        },
        CRITICAL_STOCK: {
            background: '#ffcdd2',
            backgroundGradient: 'linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%)',
            border: '#d32f2f',
            text: '#b71c1c',
            rgb: 'rgb(255, 205, 210)'
        }
    },
    
    // Animazioni per ogni livello di stock
    ANIMATIONS: {
        LOW_STOCK: {
            name: 'pulse-low-stock',
            duration: '2s',
            timing: 'infinite'
        },
        CRITICAL_STOCK: {
            name: 'pulse-critical',
            duration: '1.5s',
            timing: 'infinite'
        },
        FILTER_HIGHLIGHT: {
            name: 'pulse-critical',
            duration: '0.8s',
            timing: 'infinite'
        }
    },
    
    // Configurazione per i badge di avviso
    BADGES: {
        LOW_STOCK: {
            icon: 'fas fa-exclamation-triangle',
            color: '#ffffff',
            background: '#f44336',
            size: 24
        },
        CRITICAL_STOCK: {
            icon: 'fas fa-exclamation-circle',
            color: '#ffffff',
            background: '#d32f2f',
            size: 24
        }
    },
    
    // Messaggi tooltip per ogni livello
    TOOLTIPS: {
        LOW_STOCK: '⚠️ Articolo in esaurimento',
        CRITICAL_STOCK: '🚨 Articolo in esaurimento critico!'
    },

    // ===== FUNZIONI UTILITY =====
    
    // Determina il livello di stock in base alla quantità e soglia
    getStockLevel(quantity, threshold) {
        if (quantity <= threshold * this.THRESHOLDS.CRITICAL_STOCK) {
            return this.STOCK_LEVELS.CRITICAL;
        } else if (quantity <= threshold) {
            return this.STOCK_LEVELS.LOW;
        } else {
            return this.STOCK_LEVELS.NORMAL;
        }
    },
    
    // Ottieni la configurazione colore per un livello di stock
    getStockColors(level) {
        switch (level) {
            case this.STOCK_LEVELS.CRITICAL:
                return this.COLORS.CRITICAL_STOCK;
            case this.STOCK_LEVELS.LOW:
                return this.COLORS.LOW_STOCK;
            default:
                return this.COLORS.NORMAL;
        }
    },
    
    // Ottieni la configurazione animazione per un livello di stock
    getStockAnimation(level) {
        switch (level) {
            case this.STOCK_LEVELS.CRITICAL:
                return this.ANIMATIONS.CRITICAL_STOCK;
            case this.STOCK_LEVELS.LOW:
                return this.ANIMATIONS.LOW_STOCK;
            default:
                return null;
        }
    },
    
    // Ottieni la configurazione badge per un livello di stock
    getStockBadge(level) {
        switch (level) {
            case this.STOCK_LEVELS.CRITICAL:
                return this.BADGES.CRITICAL_STOCK;
            case this.STOCK_LEVELS.LOW:
                return this.BADGES.LOW_STOCK;
            default:
                return null;
        }
    },
    
    // Ottieni il tooltip per un livello di stock
    getStockTooltip(level) {
        switch (level) {
            case this.STOCK_LEVELS.CRITICAL:
                return this.TOOLTIPS.CRITICAL_STOCK;
            case this.STOCK_LEVELS.LOW:
                return this.TOOLTIPS.LOW_STOCK;
            default:
                return '';
        }
    },
    
    // Formatta il messaggio per il filtro
    formatFilterMessage(count) {
        if (count === 0) {
            return this.MESSAGES.NO_LOW_STOCK;
        }
        return this.MESSAGES.FILTER_LOW_STOCK.replace('{count}', count);
    }
};

// Rendiamo le costanti disponibili globalmente
if (typeof window !== 'undefined') {
    window.Constants = Constants;
}

console.log('✅ Costanti applicazione caricate');