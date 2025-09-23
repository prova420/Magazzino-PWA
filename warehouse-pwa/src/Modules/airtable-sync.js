// src/modules/airtable-sync.js - VERSIONE DEFINITIVAMENTE CORRETTA E ROBUSTA

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

    // ===== API INTEGRATA MIGLIORATA =====
    api: {
        baseUrl: 'https://api.airtable.com/v0/',
        
        async makeRequest(endpoint, method = 'GET', data = null, maxRetries = 3) {
            if (!AirtableSync.config.apiKey || !AirtableSync.config.baseId) {
                throw new Error('Configurazione Airtable incompleta');
            }

            const url = `${this.baseUrl}${AirtableSync.config.baseId}/${endpoint}`;
            const headers = {
                'Authorization': `Bearer ${AirtableSync.config.apiKey}`,
                'Content-Type': 'application/json'
            };

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const config = { method, headers };
                    if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
                        config.body = JSON.stringify(data);
                    }

                    const response = await fetch(url, config);
                    
                    if (response.status === 429) {
                        const waitTime = Math.pow(2, attempt) * 1000;
                        console.log(`⚠️ Rate limit hit, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Errore Airtable (${response.status}): ${errorText}`);
                    }

                    return await response.json();
                } catch (error) {
                    if (attempt === maxRetries) throw error;
                    console.log(`⚠️ Tentativo ${attempt}/${maxRetries} fallito, ritento...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        },

        convertToAirtableFormat(warehousesData) {
            const records = [];
            Object.keys(warehousesData).forEach(warehouse => {
                Object.keys(warehousesData[warehouse]).forEach(category => {
                    warehousesData[warehouse][category].forEach(item => {
                        const record = {
                            fields: {
                                Magazzino: warehouse,
                                Categoria: category,
                                Articolo: item.nome || 'Senza nome',
                                Quantita: item.quantita || 0,
                                SogliaAllerta: item.alertThreshold || 5,
                                UltimaModifica: new Date().toISOString()
                            }
                        };
                        
                        if (item.airtableId) {
                            record.id = item.airtableId;
                        }
                        
                        records.push(record);
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

                const existingIndex = warehouses[warehouseName][categoryName].findIndex(i => 
                    i.airtableId === record.id || i.nome === itemName
                );

                if (existingIndex >= 0) {
                    warehouses[warehouseName][categoryName][existingIndex] = {
                        nome: itemName,
                        quantita: parseInt(quantity),
                        alertThreshold: parseInt(threshold),
                        airtableId: record.id,
                        ultimaModifica: fields['UltimaModifica']
                    };
                } else {
                    warehouses[warehouseName][categoryName].push({
                        nome: itemName,
                        quantita: parseInt(quantity),
                        alertThreshold: parseInt(threshold),
                        airtableId: record.id,
                        ultimaModifica: fields['UltimaModifica']
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

        async deleteRecords(recordIds) {
            if (recordIds.length === 0) return;
            
            const tableName = encodeURIComponent(AirtableSync.config.tableName);
            const batchSize = 10;
            
            for (let i = 0; i < recordIds.length; i += batchSize) {
                const batch = recordIds.slice(i, i + batchSize);
                const queryString = batch.map(id => `records[]=${id}`).join('&');
                
                try {
                    await this.makeRequest(`${tableName}?${queryString}`, 'DELETE');
                    console.log(`✅ Cancellati ${batch.length} record`);
                } catch (error) {
                    console.error('❌ Errore cancellazione batch:', error);
                }
            }
        },

        async smartSync(localData) {
            try {
                console.log('🔄 Inizio sincronizzazione intelligente...');
                
                const remoteRecords = await this.getAllRecords();
                console.log(`📥 Scaricati ${remoteRecords.length} record remoti`);
                
                const localRecords = this.convertToAirtableFormat(localData);
                console.log(`📤 Pronti ${localRecords.length} record locali per sincronizzazione`);
                
                const remoteMap = new Map(remoteRecords.map(r => [r.id, r]));
                const localMap = new Map(localRecords.map(r => [r.id || `local-${Math.random()}`, r]));
                
                const toCreate = [];
                const toUpdate = [];
                const toDelete = [];
                
                localRecords.forEach(record => {
                    if (record.id) {
                        const remoteRecord = remoteMap.get(record.id);
                        if (remoteRecord) {
                            const localTime = new Date(record.fields.UltimaModifica || 0);
                            const remoteTime = new Date(remoteRecord.fields.UltimaModifica || 0);
                            
                            if (localTime > remoteTime) {
                                toUpdate.push(record);
                            }
                            remoteMap.delete(record.id);
                        } else {
                            delete record.id;
                            toCreate.push(record);
                        }
                    } else {
                        toCreate.push(record);
                    }
                });
                
                remoteMap.forEach(record => {
                    toDelete.push(record.id);
                });
                
                console.log(`📊 Operazioni: ${toCreate.length} creazioni, ${toUpdate.length} aggiornamenti, ${toDelete.length} cancellazioni`);
                
                let created = 0, updated = 0, deleted = 0;
                
                if (toCreate.length > 0) {
                    created = await this.uploadBatch(toCreate, 'CREATE');
                }
                
                if (toUpdate.length > 0) {
                    updated = await this.uploadBatch(toUpdate, 'UPDATE');
                }
                
                if (toDelete.length > 0) {
                    await this.deleteRecords(toDelete);
                    deleted = toDelete.length;
                }
                
                return { created, updated, deleted };
                
            } catch (error) {
                console.error('❌ Errore sincronizzazione intelligente:', error);
                throw error;
            }
        },

        async uploadBatch(records, operation) {
            const tableName = encodeURIComponent(AirtableSync.config.tableName);
            const batchSize = 10;
            let processed = 0;
            
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const batchData = { records: batch };
                
                try {
                    const method = operation === 'CREATE' ? 'POST' : 'PATCH';
                    await this.makeRequest(tableName, method, batchData);
                    processed += batch.length;
                    console.log(`✅ ${operation}: Processati ${batch.length} record (totale: ${processed})`);
                } catch (error) {
                    console.error(`❌ Errore batch ${operation}:`, error);
                    throw error;
                }
            }
            
            return processed;
        }
    },

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
            console.log('📤 Inizio upload intelligente...');
            const result = await this.api.smartSync(Database.warehouses);
            
            this.config.stats.uploaded += result.created + result.updated;
            this.config.lastSync = new Date().toLocaleString();
            this.config.stats.lastSuccess = this.config.lastSync;
            
            Database.save();
            this.updateStats();
            this.showNotification(
                `Upload completato: ${result.created} creati, ${result.updated} aggiornati, ${result.deleted} cancellati`,
                'success'
            );
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
            const records = await this.api.getAllRecords();
            const warehouses = this.api.convertFromAirtableFormat(records);
            
            const result = await this.api.smartSync(warehouses);
            
            Database.save();
            this.config.stats.uploaded += result.created + result.updated;
            this.config.stats.downloaded += records.length;
            this.config.lastSync = new Date().toLocaleString();
            this.config.stats.lastSuccess = this.config.lastSync;
            this.updateStats();
            this.showNotification(
                `Sincronizzazione completata: ↑${result.created + result.updated} ↓${records.length}`,
                'success'
            );
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

if (typeof window !== 'undefined') {
    window.AirtableSync = AirtableSync;
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (typeof AirtableSync !== 'undefined' && !AirtableSync.initialized) {
                    AirtableSync.init();
                }
            }, 1000);
        });
    } else {
        setTimeout(() => {
            if (typeof AirtableSync !== 'undefined' && !AirtableSync.initialized) {
                AirtableSync.init();
            }
        }, 1000);
    }
}

console.log('📦 Modulo AirtableSync caricato correttamente');