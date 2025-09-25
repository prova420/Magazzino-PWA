// Funzioni di utilità - VERSIONE CORRETTA CON CSV
const Helpers = {
    // Formatta i numeri
    formatNumber: (num) => {
        return new Intl.NumberFormat('it-IT').format(num);
    },

    // Genera ID univoco
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Valida email
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Download file
    downloadFile: (content, fileName, contentType) => {
        const a = document.createElement('a');
        const file = new Blob([content], { type: contentType });
        a.href = URL.createObjectURL(file);
        a.download = fileName;
        a.click();
    },

    // Copia testo negli appunti
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback per browser più vecchi
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    },

    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // NUOVA FUNZIONE: Converti dati in CSV
    convertToCSV: (data) => {
        if (!data || typeof data !== 'object') return '';
        
        try {
            const headers = ['Magazzino', 'Categoria', 'Articolo', 'Quantità', 'Soglia Allerta', 'Stato'];
            let csvContent = headers.join(';') + '\n';
            
            for (const warehouseName in data) {
                for (const categoryName in data[warehouseName]) {
                    data[warehouseName][categoryName].forEach(item => {
                        const threshold = item.alertThreshold || 5; // Default se non specificato
                        const status = item.quantita <= threshold ? 'ESURIMENTO' : 'NORMALE';
                        
                        const row = [
                            `"${warehouseName}"`,
                            `"${categoryName}"`,
                            `"${item.nome || ''}"`,
                            item.quantita || 0,
                            threshold,
                            `"${status}"`
                        ];
                        
                        csvContent += row.join(';') + '\n';
                    });
                }
            }
            
            return csvContent;
        } catch (error) {
            console.error('Errore conversione CSV:', error);
            return '';
        }
    },

    // NUOVA FUNZIONE: Download CSV
    downloadCSV: (content, fileName) => {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};

// ESPORTAZIONE CORRETTA - QUESTA RIGA È FONDAMENTALE!
if (typeof window !== 'undefined') {
    window.Helpers = Helpers;
}

console.log('✅ Helpers caricato correttamente con funzioni CSV');