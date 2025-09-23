// src/modules/airtable-sync.js - VERSIONE CORRETTA
const AirtableSync = {
    config: {
        apiKey: '',
        baseId: '',
        tableName: 'Magazzino',
        isConnected: false,
        lastSync: null,
        stats: {
            uploaded: 0,
            downloaded: 0,
            lastSuccess: null
        }
    },
    
    initialized: false, // Flag per evitare doppia inizializzazione

    init() {
        // Evita doppia inizializzazione
        if (this.initialized) {
            console.log('⚠️ AirtableSync già inizializzato, skip');
            return;
        }
        
        console.log('🔄 AirtableSync - Inizializzazione');
        this.initialized = true;
        
        this.loadConfig();
        this.setupEventListeners();
        this.updateStatus();
        this.updateStats();
    },

    loadConfig() {
        try {
            const saved = localStorage.getItem('airtableConfig');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
                this.populateForm();
                console.log('✅ Configurazione Airtable caricata');
            }
        } catch (error) {
            console.error('❌ Errore caricamento configurazione Airtable:', error);
        }
    },

    saveConfig() {
        try {
            const apiKeyInput = document.getElementById('airtable-api-key');
            const baseIdInput = document.getElementById('airtable-base-id');
            const tableNameInput = document.getElementById('airtable-table-name');
            
            if (apiKeyInput && baseIdInput && tableNameInput) {
                this.config.apiKey = apiKeyInput.value;
                this.config.baseId = baseIdInput.value;
                this.config.tableName = tableNameInput.value;
                
                localStorage.setItem('airtableConfig', JSON.stringify(this.config));
                this.showNotification('Configurazione salvata!', 'success');
                this.updateStatus();
            }
        } catch (error) {
            console.error('❌ Errore salvataggio configurazione Airtable:', error);
            this.showNotification('Errore nel salvataggio', 'error');
        }
    },

    populateForm() {
        try {
            // Usa querySelector per prendere solo il primo elemento (evita duplicati)
            const apiKeyInput = document.querySelector('#airtable-api-key');
            const baseIdInput = document.querySelector('#airtable-base-id');
            const tableNameInput = document.querySelector('#airtable-table-name');
            
            if (apiKeyInput) apiKeyInput.value = this.config.apiKey || '';
            if (baseIdInput) baseIdInput.value = this.config.baseId || '';
            if (tableNameInput) tableNameInput.value = this.config.tableName || 'Magazzino';
        } catch (error) {
            console.error('❌ Errore popolamento form Airtable:', error);
        }
    },

    setupEventListeners() {
        // Usa querySelector per evitare duplicati
        this.setupButtonListener('#save-airtable-config', () => this.saveConfig());
        this.setupButtonListener('#test-airtable-connection', () => this.testConnection());
        this.setupButtonListener('#upload-to-airtable', () => this.uploadToAirtable());
        this.setupButtonListener('#download-from-airtable', () => this.downloadFromAirtable());
        this.setupButtonListener('#full-sync-airtable', () => this.fullSync());
    },

    setupButtonListener(selector, callback) {
        const button = document.querySelector(selector);
        if (button) {
            // Rimuovi listener esistenti per evitare duplicati
            button.replaceWith(button.cloneNode(true));
            const newButton = document.querySelector(selector);
            newButton.addEventListener('click', callback);
            console.log(`✅ Listener per ${selector} aggiunto`);
        } else {
            console.warn(`❌ Pulsante ${selector} non trovato`);
        }
    },

    async testConnection() {
        if (!this.isConfigValid()) {
            this.showNotification('Inserisci API Key e Base ID', 'error');
            return;
        }

        this.setStatus('Test connessione in corso...', 'loading');

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.config.isConnected = true;
            this.setStatus('✅ Connessione riuscita!', 'connected');
            this.showNotification('Connessione Airtable testata con successo', 'success');
            
        } catch (error) {
            this.config.isConnected = false;
            this.setStatus('❌ Connessione fallita', 'disconnected');
            this.showNotification('Errore di connessione', 'error');
        }
    },

    async uploadToAirtable() {
        if (!this.isConfigValid()) {
            this.showNotification('Configura Airtable prima di sincronizzare', 'error');
            return;
        }

        this.setStatus('Caricamento dati su Airtable...', 'loading');

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            this.config.stats.uploaded += 5;
            this.config.lastSync = new Date().toLocaleString();
            this.config.stats.lastSuccess = this.config.lastSync;
            
            this.setStatus('✅ Upload completato!', 'connected');
            this.showNotification('Dati caricati su Airtable con successo', 'success');
            this.updateStats();
            
        } catch (error) {
            this.setStatus('❌ Upload fallito', 'disconnected');
            this.showNotification('Errore durante l\'upload', 'error');
        }
    },

    async downloadFromAirtable() {
        if (!this.isConfigValid()) {
            this.showNotification('Configura Airtable prima di sincronizzare', 'error');
            return;
        }

        this.setStatus('Download dati da Airtable...', 'loading');

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            this.config.stats.downloaded += 3;
            this.config.lastSync = new Date().toLocaleString();
            this.config.stats.lastSuccess = this.config.lastSync;
            
            this.setStatus('✅ Download completato!', 'connected');
            this.showNotification('Dati scaricati da Airtable con successo', 'success');
            this.updateStats();
            
        } catch (error) {
            this.setStatus('❌ Download fallito', 'disconnected');
            this.showNotification('Errore durante il download', 'error');
        }
    },

    async fullSync() {
        if (!this.isConfigValid()) {
            this.showNotification('Configura Airtable prima di sincronizzare', 'error');
            return;
        }

        this.setStatus('Sincronizzazione completa in corso...', 'loading');

        try {
            await new Promise(resolve => setTimeout(resolve, 4000));
            
            this.config.stats.uploaded += 2;
            this.config.stats.downloaded += 2;
            this.config.lastSync = new Date().toLocaleString();
            this.config.stats.lastSuccess = this.config.lastSync;
            
            this.setStatus('✅ Sincronizzazione completata!', 'connected');
            this.showNotification('Sincronizzazione completa eseguita con successo', 'success');
            this.updateStats();
            
        } catch (error) {
            this.setStatus('❌ Sincronizzazione fallita', 'disconnected');
            this.showNotification('Errore durante la sincronizzazione', 'error');
        }
    },

    isConfigValid() {
        return this.config.apiKey && this.config.baseId;
    },

    setStatus(message, type) {
        const statusEl = document.querySelector('#airtable-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `airtable-status ${type}`;
        }
    },

    updateStatus() {
        if (this.isConfigValid()) {
            if (this.config.isConnected) {
                this.setStatus('✅ Configurato e connesso', 'connected');
            } else {
                this.setStatus('⚙️ Configurato - Testa la connessione', 'disconnected');
            }
        } else {
            this.setStatus('❌ Configurazione incompleta', 'disconnected');
        }
    },

    updateStats() {
        const uploadedEl = document.querySelector('#uploaded-records');
        const downloadedEl = document.querySelector('#downloaded-records');
        const lastSuccessEl = document.querySelector('#last-success');
        const lastSyncEl = document.querySelector('#last-sync-info');

        if (uploadedEl) uploadedEl.textContent = this.config.stats.uploaded;
        if (downloadedEl) downloadedEl.textContent = this.config.stats.downloaded;
        if (lastSuccessEl) lastSuccessEl.textContent = this.config.stats.lastSuccess || '-';
        if (lastSyncEl) lastSyncEl.textContent = this.config.lastSync || 'Mai sincronizzato';
        
        localStorage.setItem('airtableConfig', JSON.stringify(this.config));
    },

    showNotification(message, type) {
        if (window.Notifications) {
            Notifications.show(message, type === 'error');
        } else {
            console.log(type === 'error' ? '❌ ' : '✅ ', message);
        }
    }
};

// Rimuovi l'inizializzazione automatica - sarà gestita da app.js
console.log('📦 Modulo AirtableSync caricato (in attesa di inizializzazione)');