// Gestione dell'inventario (articoli, categorie, ordinamento)
const InventoryManager = {
    currentWarehouse: Constants.DEFAULT_VALUES.WAREHOUSE_NAME,

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Ricerca
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce(() => {
                this.filterItems('all');
            }, 300));
        }

        // Filtri
        document.getElementById('filter-all')?.addEventListener('click', () => this.filterItems('all'));
        document.getElementById('filter-low')?.addEventListener('click', () => this.filterItems('low'));

        // Aggiunta categoria
        document.getElementById('add-category-btn')?.addEventListener('click', () => this.showAddCategoryModal());
    },

    setCurrentWarehouse(warehouseName) {
        this.currentWarehouse = warehouseName;
    },

    // Gestione articoli
    addItem(categoryName) {
        const success = Database.addItem(this.currentWarehouse, categoryName, {
            nome: "",
            quantita: 0,
            alertThreshold: Constants.DEFAULT_VALUES.ALERT_THRESHOLD
        });

        if (success) {
            Database.save();
            HistoryManager.addEntry(`Aggiunto nuovo articolo in ${categoryName}`, this.currentWarehouse);
            UIManager.renderCategories();
            UIManager.updateSummary();
            Notifications.show('Articolo aggiunto!');
        }
    },

   updateItem(categoryName, itemIndex, field, value) {
    const result = Database.updateItem(this.currentWarehouse, categoryName, itemIndex, field, value);

    if (result.success) {
        Database.save();
        
        // Aggiorna il riepilogo
        UIManager.updateSummary();
        
        // Controlla allerta per quantità e aggiorna l'evidenziazione
        if (field === 'quantita' || field === 'alertThreshold') {
            const item = Database.warehouses[this.currentWarehouse][categoryName][itemIndex];
            const threshold = item.alertThreshold || Constants.DEFAULT_VALUES.ALERT_THRESHOLD;
            
            // Mostra notifica se la quantità scende sotto la soglia
            if (field === 'quantita' && value !== result.oldValue && value <= threshold) {
                const itemName = item.nome || "Articolo senza nome";
                Notifications.showLowStockAlert(itemName, threshold);
            }
            
            // Aggiorna l'evidenziazione visiva in tempo reale
            this.updateItemHighlight(categoryName, itemIndex);
        }
        
        // Aggiungi storico se il valore è cambiato
        if (result.oldValue !== value) {
            const itemName = Database.warehouses[this.currentWarehouse][categoryName][itemIndex].nome || "Articolo senza nome";
            HistoryManager.addEntry(`Modificato ${field} di ${itemName} da ${result.oldValue} a ${value} in ${categoryName}`, this.currentWarehouse);
        }
    }
},

// Nuova funzione per aggiornare l'evidenziazione in tempo reale
updateItemHighlight(categoryName, itemIndex) {
    const item = Database.warehouses[this.currentWarehouse][categoryName][itemIndex];
    if (!item) return;
    
    const threshold = item.alertThreshold || Constants.DEFAULT_VALUES.ALERT_THRESHOLD;
    const isLowStock = item.quantita <= threshold;
    const isCriticalStock = item.quantita <= Math.floor(threshold / 2);
    
    // Trova l'elemento DOM corrispondente
    const itemRows = document.querySelectorAll(`#${categoryName}-items .item-row`);
    if (itemIndex < itemRows.length) {
        const itemElement = itemRows[itemIndex];
        
        // Rimuovi tutte le classi di evidenziazione
        itemElement.classList.remove('low-stock', 'critical-stock');
        
        // Aggiungi la classe appropriata
        if (isCriticalStock) {
            itemElement.classList.add('critical-stock');
        } else if (isLowStock) {
            itemElement.classList.add('low-stock');
        }
        
        // Aggiorna il badge di avviso
        const existingBadge = itemElement.querySelector('.low-stock-badge');
        if (isLowStock && !existingBadge) {
            const badge = document.createElement('div');
            badge.className = 'low-stock-badge';
            badge.title = 'Articolo in esaurimento';
            badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
            itemElement.appendChild(badge);
        } else if (!isLowStock && existingBadge) {
            existingBadge.remove();
        }
    }
},

    removeItem(categoryName, itemIndex) {
        const itemName = Database.warehouses[this.currentWarehouse][categoryName][itemIndex]?.nome || "Articolo senza nome";
        const success = Database.removeItem(this.currentWarehouse, categoryName, itemIndex);

        if (success) {
            Database.save();
            HistoryManager.addEntry(`Rimosso articolo ${itemName} da ${categoryName}`, this.currentWarehouse);
            UIManager.renderCategories();
            UIManager.updateSummary();
            Notifications.show('Articolo rimosso!');
        }
    },

    // Gestione categorie
    showAddCategoryModal() {
        const name = prompt("Inserisci il nome della nuova categoria:");
        if (name && name.trim() !== "") {
            const success = Database.addCategory(this.currentWarehouse, name.trim());

            if (success) {
                Database.save();
                HistoryManager.addEntry(`Aggiunta nuova categoria: ${name}`, this.currentWarehouse);
                UIManager.renderCategories();
                Notifications.show('Categoria aggiunta!');
            }
        }
    },

    removeCategory(categoryName) {
        if (confirm(`Eliminare la categoria ${categoryName} e tutti i suoi articoli?`)) {
            const success = Database.removeCategory(this.currentWarehouse, categoryName);

            if (success) {
                Database.save();
                HistoryManager.addEntry(`Rimossa categoria: ${categoryName}`, this.currentWarehouse);
                UIManager.renderCategories();
                UIManager.updateSummary();
                Notifications.show('Categoria rimossa!');
            }
        }
    },

    // Ordinamento
    sortItems(categoryName, field, direction) {
        const sortKey = `${this.currentWarehouse}:${categoryName}`;

        // Se stiamo ordinando già per lo stesso campo, inverti la direzione
        if (Database.sortState[sortKey] && Database.sortState[sortKey].field === field) {
            Database.sortState[sortKey].direction = direction;
        } else {
            // Altrimenti, imposta il nuovo ordinamento
            Database.sortState[sortKey] = { field, direction };
        }

        Database.save();
        UIManager.renderCategoryItems(categoryName);
    },

    getSortClass(categoryName, field, direction) {
        const sortKey = `${this.currentWarehouse}:${categoryName}`;
        if (Database.sortState[sortKey] && 
            Database.sortState[sortKey].field === field && 
            Database.sortState[sortKey].direction === direction) {
            return 'active';
        }
        return '';
    },

    getSortedItems(categoryName) {
        const items = [...Database.warehouses[this.currentWarehouse][categoryName]];
        const sortKey = `${this.currentWarehouse}:${categoryName}`;

        if (Database.sortState[sortKey]) {
            const { field, direction } = Database.sortState[sortKey];

            items.sort((a, b) => {
                if (field === 'quantita') {
                    return direction === 'asc' ? a.quantita - b.quantita : b.quantita - a.quantita;
                } else {
                    const aVal = a.nome.toLowerCase();
                    const bVal = b.nome.toLowerCase();
                    return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
            });
        }

        return items;
    },

    // Filtri e ricerca
    filterItems(type) {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();

        Object.keys(Database.warehouses[this.currentWarehouse]).forEach(categoryName => {
            const items = document.querySelectorAll(`#${categoryName}-items .item-row`);

            items.forEach(item => {
                const name = item.querySelector('input[type="text"]').value.toLowerCase();
                const quantity = parseInt(item.querySelector('input[type="number"]').value);
                const thresholdInput = item.querySelector('.alert-threshold input');
                const threshold = thresholdInput ? parseInt(thresholdInput.value) : Constants.DEFAULT_VALUES.ALERT_THRESHOLD;
                const isLowStock = quantity <= threshold;

                const matchesSearch = name.includes(searchTerm);
                const matchesFilter = type === 'all' || (type === 'low' && isLowStock);

                item.style.display = (matchesSearch && matchesFilter) ? 'flex' : 'none';
            });
        });
    }
};