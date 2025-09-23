// Gestione dati e localStorage
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
            this.warehouses = JSON.parse(savedData);
        } else {
            // Dati di default
            this.warehouses = {
                "Magazzino 1": {
                    "cibo": [
                        { "nome": "Pasta", "quantita": 15, "alertThreshold": 5 },
                        { "nome": "Riso", "quantita": 12, "alertThreshold": 3 },
                        { "nome": "Olio", "quantita": 8, "alertThreshold": 2 }
                    ],
                    "pulizie": [
                        { "nome": "Detersivo", "quantita": 10, "alertThreshold": 4 },
                        { "nome": "Sapone per piatti", "quantita": 7, "alertThreshold": 3 }
                    ]
                }
            };
        }

        // Carica storico
        const savedHistory = localStorage.getItem(Constants.STORAGE_KEYS.WAREHOUSE_HISTORY);
        this.history = savedHistory ? JSON.parse(savedHistory) : [];

        // Carica stato ordinamento
        const savedSortState = localStorage.getItem(Constants.STORAGE_KEYS.SORT_STATE);
        this.sortState = savedSortState ? JSON.parse(savedSortState) : {};
    },

    save() {
        localStorage.setItem(Constants.STORAGE_KEYS.WAREHOUSE_DATA, JSON.stringify(this.warehouses));
        localStorage.setItem(Constants.STORAGE_KEYS.WAREHOUSE_HISTORY, JSON.stringify(this.history));
        localStorage.setItem(Constants.STORAGE_KEYS.SORT_STATE, JSON.stringify(this.sortState));
    },

    // Metodi per gestire i magazzini
    addWarehouse(name) {
        if (name && name.trim() !== "") {
            this.warehouses[name] = {
                "cibo": [],
                "pulizie": []
            };
            return true;
        }
        return false;
    },

    removeWarehouse(name) {
        if (this.warehouses[name]) {
            delete this.warehouses[name];
            return true;
        }
        return false;
    },

    // METODO RINOMINA MIGLIORATO
    renameWarehouse(oldName, newName) {
        try {
            // Validazione completa
            if (!oldName || !newName || newName.trim() === "") {
                console.error('Nomi non validi per la rinomina');
                return false;
            }

            if (!this.warehouses[oldName]) {
                console.error(`Magazzino "${oldName}" non trovato`);
                return false;
            }

            if (this.warehouses[newName]) {
                console.error(`Magazzino "${newName}" già esistente`);
                return false;
            }

            // Esegui la rinomina
            this.warehouses[newName] = this.warehouses[oldName];
            delete this.warehouses[oldName];
            
            console.log(`Magazzino rinominato: "${oldName}" → "${newName}"`);
            return true;
            
        } catch (error) {
            console.error('Errore durante la rinomina del magazzino:', error);
            return false;
        }
    },

    // Metodi per gestire le categorie
    addCategory(warehouseName, categoryName) {
        if (this.warehouses[warehouseName] && categoryName && categoryName.trim() !== "") {
            this.warehouses[warehouseName][categoryName] = [];
            return true;
        }
        return false;
    },

    removeCategory(warehouseName, categoryName) {
        if (this.warehouses[warehouseName] && this.warehouses[warehouseName][categoryName]) {
            delete this.warehouses[warehouseName][categoryName];
            return true;
        }
        return false;
    },

    // Metodi per gestire gli articoli
    addItem(warehouseName, categoryName, item) {
        if (this.warehouses[warehouseName] && this.warehouses[warehouseName][categoryName]) {
            this.warehouses[warehouseName][categoryName].push({
                nome: item.nome || "",
                quantita: item.quantita || 0,
                alertThreshold: item.alertThreshold || Constants.DEFAULT_VALUES.ALERT_THRESHOLD
            });
            return true;
        }
        return false;
    },

    updateItem(warehouseName, categoryName, itemIndex, field, value) {
        if (this.warehouses[warehouseName] && 
            this.warehouses[warehouseName][categoryName] && 
            this.warehouses[warehouseName][categoryName][itemIndex]) {
            
            const oldValue = this.warehouses[warehouseName][categoryName][itemIndex][field];
            
            if (field === 'quantita' || field === 'alertThreshold') {
                value = parseInt(value) || 0;
            }
            
            this.warehouses[warehouseName][categoryName][itemIndex][field] = value;
            return { success: true, oldValue };
        }
        return { success: false };
    },

    removeItem(warehouseName, categoryName, itemIndex) {
        if (this.warehouses[warehouseName] && 
            this.warehouses[warehouseName][categoryName] && 
            this.warehouses[warehouseName][categoryName][itemIndex]) {
            
            this.warehouses[warehouseName][categoryName].splice(itemIndex, 1);
            return true;
        }
        return false;
    }
};