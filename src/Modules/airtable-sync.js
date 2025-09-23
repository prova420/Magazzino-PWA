// src/modules/airtable-sync.js - VERSIONE DEFINITIVAMENTE CORRETTA
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

    initialized: false,

    // ===== API INTEGRATA =====
    api: {
        baseUrl: 'https://api.airtable.com/v0/',

        async makeRequest(endpoint, method = 'GET', data = null) {
            if (!AirtableSync.config.apiKey || !AirtableSync.config.baseId) {
                throw new Error('Configurazione Airtable incompleta');
            }

            const url = `${this.baseUrl}${AirtableSync.config.baseId}/${endpoint}`;
            const headers = {
                'Authorization': `Bearer ${AirtableSync.config.apiKey}`,
                'Content-Type': 'application/json'
            };

            const config = { method, headers };
            if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
                config.body = JSON.stringify(data);
            }

            const response = await fetch(url, config);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Errore Airtable (${response.status}): ${errorText}`);
            }
            return await response.json();
        },

        convertToAirtableFormat(warehousesData) {
            const records = [];
            Object.keys(warehousesData).forEach(warehouse => {
                Object.keys(warehousesData[warehouse]).forEach(category => {
                    warehousesData[warehouse][category].forEach(item => {
                        records.push({
                            fields: {
                                Magazzino: warehouse,
                                Categoria: category,
                                Articolo: item.nome || 'Senza nome',
                                Quantita: item.quantita || 0,
                                SogliaAllerta: item.alertThreshold || 5
                            }
                        });
                    });
                });
            });
            return records;
        },

        convertFromAirtableFormat(airtableRecords) {
            const warehouses = {};
            airtableRecords.forEach(record => {
                const fields = record.fields;
                const warehouseName = fields['Magazzino'] || 'Magazzino Default';
                const categoryName = fields['Categoria'] || 'Generale';
                const itemName = fields['Articolo'];
                const quantity = fields['Quantita'] || 0;
                const threshold = fields['SogliaAllerta'] || 5;

                if (!itemName || itemName === 'Senza nome') return;

                if (!warehouses[warehouseName]) warehouses[warehouseName] = {};
                if (!warehouses[warehouseName][categoryName]) warehouses[warehouseName][categoryName] = [];

                const existing = warehouses[warehouseName][categoryName].find(i => i.nome === itemName);
                if (!existing) {
                    warehouses[warehouseName][categoryName].push({
                        nome: itemName,
                        quantita: parseInt(quantity),
                        alertThreshold: parseInt(threshold)
                    });
                }
            });
            return warehouses;
        },

        async getAllRecords() {
            const tableName = encodeURIComponent(AirtableSync.config.tableName);
            let allRecords = [];
            let offset = null;
            
            do {
                let url = `${tableName}?pageSize=100`;
                if (offset) url += `&offset=${offset}`;
                
                const data = await this.makeRequest(url);
                allRecords = allRecords.concat(data.records);
                offset = data.offset || null;
            } while (offset);
            
            return allRecords;
        },

        async replaceAllRecords(records) {
            const tableName = encodeURIComponent(AirtableSync.config.tableName);
            if (!records.length) return 0;

            let uploadedCount = 0;

            try {
                // CORREZIONE DEFINITIVA: Elimina record uno per uno per evitare errori 422
                const existingRecords = await this.getAllRecords();
                if (existingRecords.length > 0) {
                    console.log(`🗑️ Tentativo di eliminare ${existingRecords.length} record esistenti...`);
                    
                    // Elimina i record in piccoli batch per evitare timeout
                    const batchSize = 5; // Ridotto per maggiore sicurezza
                    for (let i = 0; i < existingRecords.length; i += batchSize) {
                        const batch = existingRecords.slice(i, i + batchSize);
                        
                        // CORREZIONE CRITICA: Elimina ogni record individualmente
                        for (const record of batch) {
                            try {
                                await this.makeRequest(`${tableName}?records[]=${record.id}`, 'DELETE');
                                console.log(`✅ Eliminato record: ${record.id}`);
                            } catch (error) {
                                console.warn(`⚠️ Impossibile eliminare record ${record.id}:`, error.message);
                                // Continua con gli altri record
                            }
                        }
                        
                        // Piccola pausa tra i batch per evitare rate limiting
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    console.log(`✅ Eliminazione record completata`);
                }
            } catch (error) {
                console.warn('⚠️ Errore durante eliminazione record, continuo con upload:', error.message);
            }

            // Carica i nuovi record
            const batchSize = 10;
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const batchData = { records: batch };
                
                try {
                    await this.makeRequest(tableName, 'POST', batchData);
                    uploadedCount += batch.length;
                    console.log(`✅ Caricati ${batch.length} record (totale: ${uploadedCount})`);
                } catch (error) {
                    console.error('❌ Errore upload batch:', error);
                    // Continua con i batch successivi
                }
            }
            
            return uploadedCount;
        }
    },

    // ===== FUNZIONI PRINCIPALI (RIMANGONO INVARIATE) =====
    init() {
        if (this.initialized) {
            console.log('⚠️ AirtableSync già inizializzato');
            return;
        }
        
        this.initialized = true;
        this.loadConfig();
        this.setupEventListeners();
        this.updateStatus();
        this.updateStats();
        
        console.log('✅ AirtableSync inizializzato correttamente');
    },

    loadConfig() {
        try {
            const saved = localStorage.getItem('airtableConfig');
            if (saved) {
                const parsedConfig = JSON.parse(saved);
                this.config = { ...this.config, ...parsedConfig };
            }
            this.populateForm();
        } catch (error) {
            console.error('❌ Errore caricamento configurazione:', error);
        }
    },

    saveConfig() {
        try {
            const apiKey = document.getElementById('airtable-api-key')?.value.trim();
            const baseId = document.getElementById('airtable-base-id')?.value.trim();
            const tableName = document.getElementById('airtable-table-name')?.value.trim() || 'Magazzino';
            
            this.config.apiKey = apiKey;
            this.config.baseId = baseId;
            this.config.tableName = tableName;
            
            localStorage.setItem('airtableConfig', JSON.stringify(this.config));
            this.updateStatus();
            this.showNotification('Configurazione salvata!', 'success');
        } catch (error) {
            this.showNotification('Errore salvataggio configurazione: ' + error.message, 'error');
        }
    },

    populateForm() {
        const apiKeyInput = document.getElementById('airtable-api-key');
        const baseIdInput = document.getElementById('airtable-base-id');
        const tableNameInput = document.getElementById('airtable-table-name');
        
        if (apiKeyInput) apiKeyInput.value = this.config.apiKey || '';
        if (baseIdInput) baseIdInput.value = this.config.baseId || '';
        if (tableNameInput) tableNameInput.value = this.config.tableName || 'Magazzino';
    },

    setupEventListeners() {
        this.setupButtonListener('#save-airtable-config', () => this.saveConfig());
        this.setupButtonListener('#test-airtable-connection', () => this.testConnection());
        this.setupButtonListener('#upload-to-airtable', () => this.uploadToAirtable());
        this.setupButtonListener('#download-from-airtable', () => this.downloadFromAirtable());
        this.setupButtonListener('#full-sync-airtable', () => this.fullSync());
    },

    setupButtonListener(selector, callback) {
        const btn = document.querySelector(selector);
        if (btn) {
            btn.replaceWith(btn.cloneNode(true));
            document.querySelector(selector).addEventListener('click', callback);
        }
    },

    isConfigValid() {
        return !!(this.config.apiKey && this.config.baseId);
    },

    async testConnection() {
        if (!this.isConfigValid()) {
            this.showNotification('Inserisci API Key e Base ID', 'error');
            return;
        }
        
        try {
            const table = encodeURIComponent(this.config.tableName);
            await this.api.makeRequest(table + '?maxRecords=1');
            this.config.isConnected = true;
            this.updateStatus();
            this.showNotification('Connessione Airtable riuscita', 'success');
        } catch (error) {
            this.config.isConnected = false;
            this.updateStatus();
            this.showNotification('Errore connessione: ' + error.message, 'error');
        }
    },

    async uploadToAirtable() {
        if (!this.isConfigValid()) {
            this.showNotification('Configura Airtable prima di sincronizzare', 'error');
            return;
        }
        
        try {
            const records = this.api.convertToAirtableFormat(Database.warehouses);
            if (!records.length) {
                throw new Error('Nessun dato da caricare');
            }
            
            console.log(`📤 Inizio upload di ${records.length} record...`);
            const uploaded = await this.api.replaceAllRecords(records);
            
            this.config.stats.uploaded += uploaded;
            this.config.lastSync = new Date().toLocaleString();
            this.config.stats.lastSuccess = this.config.lastSync;
            
            Database.save();
            this.updateStats();
            this.showNotification(`Upload completato: ${uploaded} record`, 'success');
        } catch (error) {
            console.error('❌ Errore upload:', error);
            this.showNotification('Errore upload: ' + error.message, 'error');
        }
    },

    async downloadFromAirtable() {
        if (!this.isConfigValid()) {
            this.showNotification('Configura Airtable prima di sincronizzare', 'error');
            return;
        }
        
        try {
            const records = await this.api.getAllRecords();
            const warehouses = this.api.convertFromAirtableFormat(records);
            
            Database.warehouses = warehouses;
            Database.save();
            
            this.config.stats.downloaded += records.length;
            this.config.lastSync = new Date().toLocaleString();
            this.config.stats.lastSuccess = this.config.lastSync;
            
            this.updateStats();
            this.showNotification(`Download completato: ${records.length} record`, 'success');
        } catch (error) {
            this.showNotification('Errore download: ' + error.message, 'error');
        }
    },

    async fullSync() {
        if (!this.isConfigValid()) {
            this.showNotification('Configura Airtable prima di sincronizzare', 'error');
            return;
        }
        
        try {
            // Download
            const downloaded = await this.api.getAllRecords();
            const warehouses = this.api.convertFromAirtableFormat(downloaded);
            Database.warehouses = warehouses;
            
            // Upload
            const toUpload = this.api.convertToAirtableFormat(Database.warehouses);
            const uploaded = await this.api.replaceAllRecords(toUpload);
            
            Database.save();
            
            this.config.stats.uploaded += uploaded;
            this.config.stats.downloaded += downloaded.length;
            this.config.lastSync = new Date().toLocaleString();
            this.config.stats.lastSuccess = this.config.lastSync;
            
            this.updateStats();
            this.showNotification(`Sincronizzazione completata (↑${uploaded} ↓${downloaded.length})`, 'success');
        } catch (error) {
            this.showNotification('Errore sincronizzazione: ' + error.message, 'error');
        }
    },

    setStatus(message, type = '') {
        const el = document.getElementById('airtable-status');
        if (el) {
            el.textContent = message;
            el.className = `airtable-status ${type}`;
        }
    },

    updateStatus() {
        if (!this.isConfigValid()) {
            this.setStatus('❌ Configurazione incompleta', 'disconnected');
        } else if (this.config.isConnected) {
            this.setStatus('✅ Configurato e connesso', 'connected');
        } else {
            this.setStatus('⚙️ Configurato - Testa la connessione', 'disconnected');
        }
    },

    updateStats() {
        const uploadedEl = document.getElementById('uploaded-records');
        const downloadedEl = document.getElementById('downloaded-records');
        const lastSuccessEl = document.getElementById('last-success');
        const lastSyncEl = document.getElementById('last-sync-info');

        if (uploadedEl) uploadedEl.textContent = this.config.stats.uploaded;
        if (downloadedEl) downloadedEl.textContent = this.config.stats.downloaded;
        if (lastSuccessEl) lastSuccessEl.textContent = this.config.stats.lastSuccess || '-';
        if (lastSyncEl) lastSyncEl.textContent = this.config.lastSync || 'Mai sincronizzato';

        localStorage.setItem('airtableConfig', JSON.stringify(this.config));
    },

    showNotification(message, isError = false) {
        if (window.Notifications) {
            Notifications.show(message, isError);
        } else {
            console.log(isError ? '❌ ' : '✅ ', message);
        }
    }
};

// ===== INIZIALIZZAZIONE AUTOMATICA =====
if (typeof window !== 'undefined') {
    window.AirtableSync = AirtableSync;
}

console.log('📦 Modulo AirtableSync caricato correttamente');