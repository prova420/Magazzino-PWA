// Gestione sincronizzazione e import/export dati - VERSIONE CON CSV
const SyncManager = {
    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Apertura modale
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.openSyncModal());
        }

        // Chiusura modale
        const closeModal = document.querySelector('.close-modal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeSyncModal());
        }

        // Pulsanti all'interno della modale
        document.getElementById('copy-btn')?.addEventListener('click', () => this.copyToClipboard());
        document.getElementById('download-btn')?.addEventListener('click', () => this.downloadData());
        document.getElementById('download-csv-btn')?.addEventListener('click', () => this.downloadCSV());
        document.getElementById('upload-btn')?.addEventListener('click', () => this.triggerFileUpload());
        document.getElementById('import-btn')?.addEventListener('click', () => this.importFromText());

        // Gestione caricamento file
        const importFile = document.getElementById('import-file');
        if (importFile) {
            importFile.addEventListener('change', (e) => this.importFromFile(e));
        }
    },

    openSyncModal() {
        const modal = document.getElementById('sync-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('export-data').value = JSON.stringify(Database.warehouses, null, 2);
            
            // Aggiorna statistiche
            this.updateExportStats();
        }
    },

    closeSyncModal() {
        const modal = document.getElementById('sync-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    updateExportStats() {
        const stats = Database.getStats();
        document.getElementById('export-stats').innerHTML = `
            <strong>Statistiche esportazione:</strong><br>
            - Magazzini: ${stats.totalWarehouses}<br>
            - Categorie: ${stats.totalCategories}<br>
            - Articoli totali: ${stats.totalItems}<br>
            - In esaurimento: ${stats.lowStockItems}
        `;
    },

    copyToClipboard() {
        const textarea = document.getElementById('export-data');
        if (textarea) {
            Helpers.copyToClipboard(textarea.value)
                .then(() => Notifications.show('Dati copiati negli appunti!'))
                .catch(() => Notifications.show('Errore nella copia!', true));
        }
    },

    downloadData() {
        const dataStr = JSON.stringify(Database.warehouses, null, 2);
        Helpers.downloadFile(dataStr, `dati_magazzino_${this.getTimestamp()}.json`, 'application/json');
        Notifications.show('File JSON scaricato con successo!');
    },

    downloadCSV() {
        try {
            const csvData = Helpers.convertToCSV(Database.warehouses);
            
            if (!csvData) {
                throw new Error('Nessun dato da esportare');
            }
            
            Helpers.downloadCSV(csvData, `dati_magazzino_${this.getTimestamp()}.csv`);
            Notifications.show('File CSV scaricato con successo!');
            
            // Mostra anteprima
            this.showCSVPreview(csvData);
        } catch (error) {
            console.error('Errore esportazione CSV:', error);
            Notifications.show('Errore durante l\'esportazione CSV!', true);
        }
    },

    showCSVPreview(csvData) {
        const preview = document.getElementById('csv-preview');
        if (preview) {
            const lines = csvData.split('\n').slice(0, 6); // Prime 5 righe
            preview.innerHTML = '<strong>Anteprima CSV:</strong><br>' + 
                               lines.map(line => line.replace(/;/g, ' | ')).join('<br>');
        }
    },

    getTimestamp() {
        return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    },

    triggerFileUpload() {
        const fileInput = document.getElementById('import-file');
        if (fileInput) {
            fileInput.click();
        }
    },

    importFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // Determina se è JSON o CSV
                const content = e.target.result;
                if (file.name.endsWith('.csv')) {
                    this.importFromCSV(content);
                } else {
                    const newData = JSON.parse(content);
                    this.processImportedData(newData);
                }
            } catch (error) {
                Notifications.show('Errore: formato file non valido', true);
            }
        };
        reader.readAsText(file);
    },

    importFromCSV(csvContent) {
        try {
            const lines = csvContent.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(';').map(h => h.replace(/"/g, '').trim());
            
            const newData = {};
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(';').map(v => v.replace(/"/g, '').trim());
                const warehouse = values[0];
                const category = values[1];
                const itemName = values[2];
                const quantity = parseInt(values[3]) || 0;
                const threshold = parseInt(values[4]) || Constants.DEFAULT_VALUES.ALERT_THRESHOLD;
                
                if (!newData[warehouse]) newData[warehouse] = {};
                if (!newData[warehouse][category]) newData[warehouse][category] = [];
                
                // Evita duplicati
                const existingItem = newData[warehouse][category].find(item => item.nome === itemName);
                if (!existingItem) {
                    newData[warehouse][category].push({
                        nome: itemName,
                        quantita: quantity,
                        alertThreshold: threshold
                    });
                }
            }
            
            this.processImportedData(newData);
        } catch (error) {
            Notifications.show('Errore nell\'importazione CSV: ' + error.message, true);
        }
    },

    importFromText() {
        const textarea = document.getElementById('import-data');
        if (!textarea) return;

        try {
            const newData = JSON.parse(textarea.value);
            this.processImportedData(newData);
        } catch (error) {
            // Prova come CSV se JSON fallisce
            this.importFromCSV(textarea.value);
        }
    },

    processImportedData(newData) {
        if (typeof newData === 'object' && newData !== null) {
            Database.warehouses = newData;
            Database.save();
            HistoryManager.addEntry('Importati dati da sincronizzazione', 'Sistema');
            Notifications.show('Dati importati con successo!');
            this.closeSyncModal();

            // Ricarica l'interfaccia
            UIManager.renderWarehouseTabs();
            UIManager.switchWarehouse(Object.keys(Database.warehouses)[0]);
        } else {
            Notifications.show('Errore: formato dati non valido', true);
        }
    }
};

if (typeof window !== 'undefined') {
    window.SyncManager = SyncManager;
}