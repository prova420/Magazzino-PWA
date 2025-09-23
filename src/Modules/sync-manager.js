// Gestione sincronizzazione e import/export dati
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
        }
    },

    closeSyncModal() {
        const modal = document.getElementById('sync-modal');
        if (modal) {
            modal.style.display = 'none';
        }
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
        Helpers.downloadFile(dataStr, 'dati_magazzino.json', 'application/json');
        Notifications.show('File scaricato con successo!');
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
                const newData = JSON.parse(e.target.result);
                this.processImportedData(newData);
            } catch (error) {
                Notifications.show('Errore: formato file non valido', true);
            }
        };
        reader.readAsText(file);
    },

    importFromText() {
        const textarea = document.getElementById('import-data');
        if (!textarea) return;

        try {
            const newData = JSON.parse(textarea.value);
            this.processImportedData(newData);
        } catch (error) {
            Notifications.show('Errore: dati JSON non validi', true);
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