// Gestione dati e localStorage - VERSIONE MIGLIORATA CON SUPPORTO AIRTABLE

const Database = {
    warehouses: {},
    history: [],
    sortState: {},

    init() {
        this.loadData();
    },

    loadData() {
        // Carica dati magazzini
        const savedData = localStorage.getItem(Constants.STORAGE_KEYS.WAREHOUSE_DATA);
        if (savedData) {
            try {
                this.warehouses = JSON.parse(savedData);
                console.log('✅ Dati caricati correttamente dal localStorage');
            } catch (error) {
                console.error('❌ Errore caricamento dati, uso default:', error);
                this.warehouses = this.getDefaultData();
                this.save();
            }
        } else {
            console.log('ℹ️ Nessun dato salvato trovato, uso dati default');
            this.warehouses = this.getDefaultData();
            this.save();
        }

        // Carica storico
        const savedHistory = localStorage.getItem(Constants.STORAGE_KEYS.WAREHOUSE_HISTORY);
        this.history = savedHistory ? JSON.parse(savedHistory) : [];

        // Carica stato ordinamento
        const savedSortState = localStorage.getItem(Constants.STORAGE_KEYS.SORT_STATE);
        this.sortState = savedSortState ? JSON.parse(savedSortState) : {};

        console.log(`📊 Dati caricati: ${Object.keys(this.warehouses).length} magazzini, ${this.history.length} voci storico`);
    },

    getDefaultData() {
        return {
            "Magazzino 1": {
                "cibo": [
                    { 
                        "nome": "Pasta", 
                        "quantita": 15, 
                        "alertThreshold": 5,
                        "airtableId": null
                    },
                    { 
                        "nome": "Riso", 
                        "quantita": 12, 
                        "alertThreshold": 3,
                        "airtableId": null
                    },
                    { 
                        "nome": "Olio", 
                        "quantita": 8, 
                        "alertThreshold": 2,
                        "airtableId": null
                    }
                ],
                "pulizie": [
                    { 
                        "nome": "Detersivo", 
                        "quantita": 10, 
                        "alertThreshold": 4,
                        "airtableId": null
                    },
                    { 
                        "nome": "Sapone per piatti", 
                        "quantita": 7, 
                        "alertThreshold": 3,
                        "airtableId": null
                    }
                ]
            }
        };
    },

    save() {
        try {
            localStorage.setItem(Constants.STORAGE_KEYS.WAREHOUSE_DATA, JSON.stringify(this.warehouses));
            localStorage.setItem(Constants.STORAGE_KEYS.WAREHOUSE_HISTORY, JSON.stringify(this.history));
            localStorage.setItem(Constants.STORAGE_KEYS.SORT_STATE, JSON.stringify(this.sortState));
            console.log('💾 Dati salvati correttamente');
        } catch (error) {
            console.error('❌ Errore salvataggio dati:', error);
            if (typeof Notifications !== 'undefined') {
                Notifications.show('Errore salvataggio dati! I cambiamenti potrebbero andare persi.', true);
            }
        }
    },

    // NUOVO: Metodo per gestire ID Airtable
    updateAirtableId(warehouseName, categoryName, itemIndex, airtableId) {
        if (this.warehouses[warehouseName] &&
            this.warehouses[warehouseName][categoryName] &&
            this.warehouses[warehouseName][categoryName][itemIndex]) {
            
            this.warehouses[warehouseName][categoryName][itemIndex].airtableId = airtableId;
            console.log(`✅ Airtable ID aggiornato per ${warehouseName} > ${categoryName} > item ${itemIndex}`);
            return true;
        }
        console.error('❌ Impossibile aggiornare Airtable ID: elemento non trovato');
        return false;
    },

    // NUOVO: Trova item per ID Airtable
    findItemByAirtableId(airtableId) {
        if (!airtableId) return null;
        
        for (const warehouseName in this.warehouses) {
            for (const categoryName in this.warehouses[warehouseName]) {
                const itemIndex = this.warehouses[warehouseName][categoryName].findIndex(
                    item => item.airtableId === airtableId
                );
                if (itemIndex !== -1) {
                    return { 
                        warehouseName, 
                        categoryName, 
                        itemIndex,
                        item: this.warehouses[warehouseName][categoryName][itemIndex]
                    };
                }
            }
        }
        return null;
    },

    // NUOVO: Pulisci ID Airtable duplicati
    cleanupAirtableIds() {
        let cleanedCount = 0;
        const seenIds = new Set();
        
        for (const warehouseName in this.warehouses) {
            for (const categoryName in this.warehouses[warehouseName]) {
                this.warehouses[warehouseName][categoryName].forEach(item => {
                    if (item.airtableId) {
                        if (seenIds.has(item.airtableId)) {
                            console.warn(`⚠️ Trovato ID duplicato: ${item.airtableId}, pulizia...`);
                            item.airtableId = null;
                            cleanedCount++;
                        } else {
                            seenIds.add(item.airtableId);
                        }
                    }
                });
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`✅ Puliti ${cleanedCount} ID Airtable duplicati`);
            this.save();
        }
        
        return cleanedCount;
    },

    // NUOVO: Verifica integrità dati
    validateData() {
        const errors = [];
        
        if (!this.warehouses || typeof this.warehouses !== 'object') {
            errors.push('Struttura warehouses non valida');
            return errors;
        }
        
        for (const warehouseName in this.warehouses) {
            if (!this.warehouses[warehouseName] || typeof this.warehouses[warehouseName] !== 'object') {
                errors.push(`Magazzino "${warehouseName}" non valido`);
                continue;
            }
            
            for (const categoryName in this.warehouses[warehouseName]) {
                const items = this.warehouses[warehouseName][categoryName];
                if (!Array.isArray(items)) {
                    errors.push(`Categoria "${categoryName}" in magazzino "${warehouseName}" non è un array`);
                    continue;
                }
                
                items.forEach((item, index) => {
                    if (!item.nome || item.nome.trim() === '') {
                        errors.push(`Item senza nome in ${warehouseName} > ${categoryName} > index ${index}`);
                    }
                    if (typeof item.quantita !== 'number' || item.quantita < 0) {
                        errors.push(`Quantità non valida in ${warehouseName} > ${categoryName} > ${item.nome}`);
                    }
                });
            }
        }
        
        if (errors.length === 0) {
            console.log('✅ Dati validati correttamente');
        } else {
            console.warn('⚠️ Trovati errori nei dati:', errors);
        }
        
        return errors;
    },

    // METODI ESISTENTI MIGLIORATI
    addWarehouse(name) {
        if (name && name.trim() !== "") {
            const trimmedName = name.trim();
            
            if (this.warehouses[trimmedName]) {
                console.error(`❌ Magazzino "${trimmedName}" già esistente`);
                if (typeof Notifications !== 'undefined') {
                    Notifications.show(`Il magazzino "${trimmedName}" esiste già!`, true);
                }
                return false;
            }
            
            this.warehouses[trimmedName] = {
                "cibo": [],
                "pulizie": []
            };
            
            console.log(`✅ Magazzino "${trimmedName}" creato`);
            this.save();
            return true;
        }
        
        console.error('❌ Nome magazzino non valido');
        return false;
    },

    removeWarehouse(name) {
        if (this.warehouses[name]) {
            const itemCount = this.countItemsInWarehouse(name);
            delete this.warehouses[name];
            console.log(`✅ Magazzino "${name}" rimosso (contieneva ${itemCount} articoli)`);
            this.save();
            return true;
        }
        
        console.error(`❌ Magazzino "${name}" non trovato`);
        return false;
    },

    countItemsInWarehouse(warehouseName) {
        if (!this.warehouses[warehouseName]) return 0;
        
        let count = 0;
        for (const categoryName in this.warehouses[warehouseName]) {
            count += this.warehouses[warehouseName][categoryName].length;
        }
        return count;
    },

    renameWarehouse(oldName, newName) {
        try {
            if (!oldName || !newName || newName.trim() === "") {
                console.error('Nomi non validi per la rinomina');
                return false;
            }

            if (!this.warehouses[oldName]) {
                console.error(`Magazzino "${oldName}" non trovato`);
                return false;
            }

            const trimmedNewName = newName.trim();
            
            if (this.warehouses[trimmedNewName]) {
                console.error(`Magazzino "${trimmedNewName}" già esistente`);
                return false;
            }

            this.warehouses[trimmedNewName] = this.warehouses[oldName];
            delete this.warehouses[oldName];
            
            console.log(`✅ Magazzino rinominato: "${oldName}" → "${trimmedNewName}"`);
            this.save();
            return true;
        } catch (error) {
            console.error('Errore durante la rinomina del magazzino:', error);
            return false;
        }
    },

    addCategory(warehouseName, categoryName) {
        if (this.warehouses[warehouseName] && categoryName && categoryName.trim() !== "") {
            const trimmedCategoryName = categoryName.trim();
            
            if (this.warehouses[warehouseName][trimmedCategoryName]) {
                console.error(`❌ Categoria "${trimmedCategoryName}" già esistente in magazzino "${warehouseName}"`);
                return false;
            }
            
            this.warehouses[warehouseName][trimmedCategoryName] = [];
            console.log(`✅ Categoria "${trimmedCategoryName}" aggiunta a magazzino "${warehouseName}"`);
            this.save();
            return true;
        }
        
        console.error('❌ Parametri non validi per aggiunta categoria');
        return false;
    },

    removeCategory(warehouseName, categoryName) {
        if (this.warehouses[warehouseName] && this.warehouses[warehouseName][categoryName]) {
            const itemCount = this.warehouses[warehouseName][categoryName].length;
            delete this.warehouses[warehouseName][categoryName];
            console.log(`✅ Categoria "${categoryName}" rimossa da magazzino "${warehouseName}" (contieneva ${itemCount} articoli)`);
            this.save();
            return true;
        }
        
        console.error(`❌ Categoria "${categoryName}" non trovata in magazzino "${warehouseName}"`);
        return false;
    },

    addItem(warehouseName, categoryName, item) {
        if (this.warehouses[warehouseName] && this.warehouses[warehouseName][categoryName]) {
            const newItem = {
                nome: item.nome || "",
                quantita: parseInt(item.quantita) || 0,
                alertThreshold: parseInt(item.alertThreshold) || Constants.DEFAULT_VALUES.ALERT_THRESHOLD,
                airtableId: item.airtableId || null
            };
            
            // Verifica duplicati per nome
            const existingIndex = this.warehouses[warehouseName][categoryName].findIndex(
                existingItem => existingItem.nome.toLowerCase() === newItem.nome.toLowerCase()
            );
            
            if (existingIndex !== -1) {
                console.warn(`⚠️ Articolo "${newItem.nome}" già esistente, aggiorno invece di aggiungere`);
                return this.updateItem(warehouseName, categoryName, existingIndex, 'quantita', newItem.quantita);
            }
            
            this.warehouses[warehouseName][categoryName].push(newItem);
            console.log(`✅ Articolo "${newItem.nome}" aggiunto a ${warehouseName} > ${categoryName}`);
            this.save();
            return true;
        }
        
        console.error(`❌ Impossibile aggiungere articolo: magazzino o categoria non validi`);
        return false;
    },

    updateItem(warehouseName, categoryName, itemIndex, field, value) {
        if (this.warehouses[warehouseName] &&
            this.warehouses[warehouseName][categoryName] &&
            this.warehouses[warehouseName][categoryName][itemIndex]) {

            const oldValue = this.warehouses[warehouseName][categoryName][itemIndex][field];

            if (field === 'quantita' || field === 'alertThreshold') {
                value = parseInt(value) || 0;
                if (value < 0) value = 0;
            }

            this.warehouses[warehouseName][categoryName][itemIndex][field] = value;
            
            console.log(`✅ Articolo aggiornato: ${warehouseName} > ${categoryName} > ${field} = ${value}`);
            this.save();
            return { success: true, oldValue };
        }
        
        console.error(`❌ Impossibile aggiornare articolo: elemento non trovato`);
        return { success: false };
    },

    removeItem(warehouseName, categoryName, itemIndex) {
        if (this.warehouses[warehouseName] &&
            this.warehouses[warehouseName][categoryName] &&
            this.warehouses[warehouseName][categoryName][itemIndex]) {

            const itemName = this.warehouses[warehouseName][categoryName][itemIndex].nome;
            this.warehouses[warehouseName][categoryName].splice(itemIndex, 1);
            
            console.log(`✅ Articolo "${itemName}" rimosso da ${warehouseName} > ${categoryName}`);
            this.save();
            return true;
        }
        
        console.error(`❌ Impossibile rimuovere articolo: elemento non trovato`);
        return false;
    },

    // NUOVO: Metodo per ottenere statistiche
    getStats() {
        let totalWarehouses = 0;
        let totalCategories = 0;
        let totalItems = 0;
        let lowStockItems = 0;

        for (const warehouseName in this.warehouses) {
            totalWarehouses++;
            for (const categoryName in this.warehouses[warehouseName]) {
                totalCategories++;
                this.warehouses[warehouseName][categoryName].forEach(item => {
                    totalItems++;
                    const threshold = item.alertThreshold || Constants.DEFAULT_VALUES.ALERT_THRESHOLD;
                    if (item.quantita <= threshold) {
                        lowStockItems++;
                    }
                });
            }
        }

        return {
            totalWarehouses,
            totalCategories,
            totalItems,
            lowStockItems,
            itemsWithAirtableId: this.countItemsWithAirtableId()
        };
    },

    // NUOVO: Conta articoli con ID Airtable
    countItemsWithAirtableId() {
        let count = 0;
        for (const warehouseName in this.warehouses) {
            for (const categoryName in this.warehouses[warehouseName]) {
                count += this.warehouses[warehouseName][categoryName].filter(
                    item => item.airtableId !== null && item.airtableId !== undefined
                ).length;
            }
        }
        return count;
    },

    // NUOVO: Backup dati
    createBackup() {
        return {
            warehouses: JSON.parse(JSON.stringify(this.warehouses)),
            history: JSON.parse(JSON.stringify(this.history)),
            sortState: JSON.parse(JSON.stringify(this.sortState)),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
    },

    // NUOVO: Ripristino da backup
    restoreFromBackup(backupData) {
        try {
            if (!backupData.warehouses || !backupData.history || !backupData.sortState) {
                throw new Error('Dati backup non validi');
            }

            this.warehouses = JSON.parse(JSON.stringify(backupData.warehouses));
            this.history = JSON.parse(JSON.stringify(backupData.history));
            this.sortState = JSON.parse(JSON.stringify(backupData.sortState));
            
            this.save();
            console.log('✅ Backup ripristinato correttamente');
            return true;
        } catch (error) {
            console.error('❌ Errore ripristino backup:', error);
            return false;
        }
    }
};

// Rendiamo il database disponibile globalmente
if (typeof window !== 'undefined') {
    window.Database = Database;
}

console.log('✅ Modulo Database caricato correttamente');