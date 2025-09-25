// Gestione dell'inventario (articoli, categorie, ordinamento) - VERSIONE COMPLETA CORRETTA
const InventoryManager = {
    currentWarehouse: Constants.DEFAULT_VALUES.WAREHOUSE_NAME,
    currentFilter: 'all', // Filtro corrente

    init() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Ricerca in tempo reale con debounce
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce(() => {
                this.filterItems(this.currentFilter);
            }, 300));
        }

        // Setup delegazione eventi per filtri e ordinamento
        this.setupEventDelegation();
    },

    setupEventDelegation() {
        // Delegazione eventi per i filtri
        document.addEventListener('click', (event) => {
            // Gestione filtri
            if (event.target.matches('#filter-all, #filter-all *')) {
                this.handleFilterClick('all');
            } else if (event.target.matches('#filter-low, #filter-low *')) {
                this.handleFilterClick('low');
            }
            
            // Gestione ordinamento
            if (event.target.closest('.sort-btn')) {
                const button = event.target.closest('.sort-btn');
                const categoryName = button.dataset.category;
                const field = button.dataset.field;
                const direction = button.dataset.direction;
                
                if (categoryName && field && direction) {
                    this.sortItems(categoryName, field, direction);
                }
            }
            
            // Gestione aggiungi articolo
            if (event.target.closest('.add-item-btn')) {
                const button = event.target.closest('.add-item-btn');
                const categoryName = button.dataset.category;
                if (categoryName) {
                    this.addItem(categoryName);
                }
            }
            
            // Gestione rimuovi categoria
            if (event.target.closest('.remove-category-btn')) {
                const button = event.target.closest('.remove-category-btn');
                const categoryName = button.dataset.category;
                if (categoryName && confirm(`Eliminare la categoria ${categoryName} e tutti i suoi articoli?`)) {
                    this.removeCategory(categoryName);
                }
            }
        });
    },

    handleFilterClick(filterType) {
        this.currentFilter = filterType;
        
        // Rimuovi evidenziazioni precedenti
        if (typeof UIManager !== 'undefined' && UIManager.removeFilterHighlights) {
            UIManager.removeFilterHighlights();
        }
        
        // Applica evidenziazione per filtro esaurimento
        if (filterType === 'low' && typeof UIManager !== 'undefined' && UIManager.highlightLowStockItems) {
            UIManager.highlightLowStockItems();
        }
        
        // Applica il filtro
        this.filterItems(filterType);
        
        // Aggiorna stato pulsanti
        this.updateFilterButtons(filterType);
    },

    setCurrentWarehouse(warehouseName) {
        this.currentWarehouse = warehouseName;
        // Reimposta il filtro quando cambi magazzino
        this.currentFilter = 'all';
        this.updateFilterButtons('all');
    },

    // Gestione articoli
    addItem(categoryName) {
        const success = Database.addItem(this.currentWarehouse, categoryName, {
            nome: "Nuovo Articolo",
            quantita: 1,
            alertThreshold: Constants.DEFAULT_VALUES.ALERT_THRESHOLD
        });

        if (success) {
            Database.save();
            HistoryManager.addEntry(`Aggiunto nuovo articolo in ${categoryName}`, this.currentWarehouse);
            
            // Ricarica l'interfaccia
            if (typeof UIManager !== 'undefined') {
                UIManager.renderCategories();
                UIManager.updateSummary();
            }
            
            // Riapplica il filtro corrente
            setTimeout(() => {
                this.filterItems(this.currentFilter);
            }, 100);
            
            if (typeof Notifications !== 'undefined') {
                Notifications.show('Articolo aggiunto!');
            }
        }
    },

    updateItem(categoryName, itemIndex, field, value) {
        const result = Database.updateItem(this.currentWarehouse, categoryName, itemIndex, field, value);

        if (result.success) {
            Database.save();
            
            // Aggiorna il riepilogo
            if (typeof UIManager !== 'undefined') {
                UIManager.updateSummary();
            }
            
            // Controlla allerta per quantità e aggiorna l'evidenziazione
            if (field === 'quantita' || field === 'alertThreshold') {
                const item = Database.warehouses[this.currentWarehouse][categoryName][itemIndex];
                const threshold = item.alertThreshold || Constants.DEFAULT_VALUES.ALERT_THRESHOLD;
                
                // Mostra notifica se la quantità scende sotto la soglia
                if (field === 'quantita' && value !== result.oldValue && value <= threshold) {
                    const itemName = item.nome || "Articolo senza nome";
                    if (typeof Notifications !== 'undefined') {
                        Notifications.showLowStockAlert(itemName, threshold);
                    }
                }
                
                // Aggiorna l'evidenziazione visiva in tempo reale
                this.updateItemHighlight(categoryName, itemIndex);
                
                // Riapplica il filtro se necessario
                if (this.currentFilter === 'low') {
                    this.filterItems('low');
                }
            }
            
            // Aggiungi storico se il valore è cambiato
            if (result.oldValue !== value) {
                const itemName = Database.warehouses[this.currentWarehouse][categoryName][itemIndex].nome || "Articolo senza nome";
                HistoryManager.addEntry(`Modificato ${field} di ${itemName} da ${result.oldValue} a ${value} in ${categoryName}`, this.currentWarehouse);
            }
        }
        
        return result;
    },

    // Aggiorna l'evidenziazione in tempo reale
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
                itemElement.insertBefore(badge, itemElement.firstChild);
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
            
            if (typeof UIManager !== 'undefined') {
                UIManager.renderCategories();
                UIManager.updateSummary();
            }
            
            if (typeof Notifications !== 'undefined') {
                Notifications.show('Articolo rimosso!');
            }
        }
        
        return success;
    },

    // Gestione categorie
    showAddCategoryModal() {
        const name = prompt("Inserisci il nome della nuova categoria:");
        if (name && name.trim() !== "") {
            const success = Database.addCategory(this.currentWarehouse, name.trim());

            if (success) {
                Database.save();
                HistoryManager.addEntry(`Aggiunta nuova categoria: ${name}`, this.currentWarehouse);
                
                if (typeof UIManager !== 'undefined') {
                    UIManager.renderCategories();
                }
                
                if (typeof Notifications !== 'undefined') {
                    Notifications.show('Categoria aggiunta!');
                }
            }
        }
    },

    removeCategory(categoryName) {
        const success = Database.removeCategory(this.currentWarehouse, categoryName);

        if (success) {
            Database.save();
            HistoryManager.addEntry(`Rimossa categoria: ${categoryName}`, this.currentWarehouse);
            
            if (typeof UIManager !== 'undefined') {
                UIManager.renderCategories();
                UIManager.updateSummary();
            }
            
            if (typeof Notifications !== 'undefined') {
                Notifications.show('Categoria rimossa!');
            }
        }
        
        return success;
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
        
        // Ricarica gli elementi della categoria
        if (typeof UIManager !== 'undefined' && UIManager.renderCategoryItems) {
            UIManager.renderCategoryItems(categoryName);
            
            // Riapplica il filtro corrente dopo l'ordinamento
            setTimeout(() => {
                this.filterItems(this.currentFilter);
                this.updateSortButtons(categoryName, field, direction);
            }, 100);
        }
    },

    // Filtri e ricerca
    filterItems(type) {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        this.currentFilter = type;

        Object.keys(Database.warehouses[this.currentWarehouse]).forEach(categoryName => {
            const container = document.getElementById(`${categoryName}-items`);
            if (!container) return;

            const items = container.querySelectorAll('.item-row');
            
            if (items.length === 0) return;

            let visibleItems = 0;
            
            items.forEach(item => {
                const nameInput = item.querySelector('input[type="text"]');
                const quantityInput = item.querySelector('input[type="number"]');
                const thresholdInput = item.querySelector('.alert-threshold input');
                
                if (!nameInput || !quantityInput) return;
                
                const name = nameInput.value.toLowerCase();
                const quantity = parseInt(quantityInput.value) || 0;
                const threshold = thresholdInput ? parseInt(thresholdInput.value) : Constants.DEFAULT_VALUES.ALERT_THRESHOLD;
                const isLowStock = quantity <= threshold;

                const matchesSearch = name.includes(searchTerm);
                const matchesFilter = type === 'all' || (type === 'low' && isLowStock);

                if (matchesSearch && matchesFilter) {
                    item.style.display = 'flex';
                    visibleItems++;
                } else {
                    item.style.display = 'none';
                }
            });

            // Mostra messaggio se non ci sono articoli visibili
            const emptyState = container.querySelector('.empty-state');
            if (visibleItems === 0) {
                if (!emptyState) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.className = 'empty-state';
                    emptyMsg.innerHTML = `
                        <i class="fas fa-search"></i>
                        <p>Nessun articolo trovato con i filtri attuali</p>
                    `;
                    container.appendChild(emptyMsg);
                }
            } else if (emptyState) {
                emptyState.remove();
            }
        });

        // Aggiorna lo stato visivo dei pulsanti filtro
        this.updateFilterButtons(type);
    },

    updateFilterButtons(activeFilter) {
        const filterAll = document.getElementById('filter-all');
        const filterLow = document.getElementById('filter-low');
        
        if (filterAll && filterLow) {
            // Rimuovi tutte le classi attive
            filterAll.classList.remove('active');
            filterLow.classList.remove('active');
            
            // Aggiungi la classe attiva al filtro corrente
            if (activeFilter === 'all') {
                filterAll.classList.add('active');
            } else if (activeFilter === 'low') {
                filterLow.classList.add('active');
                filterLow.classList.add('btn-warning');
            }
        }
    },

    updateSortButtons(categoryName, field, direction) {
        // Rimuovi la classe active da tutti i pulsanti di questa categoria
        const sortButtons = document.querySelectorAll(`.sort-btn[data-category="${categoryName}"]`);
        sortButtons.forEach(btn => {
            btn.classList.remove('active');
            btn.classList.remove('asc', 'desc');
        });
        
        // Aggiungi la classe active al pulsante cliccato
        const activeButton = document.querySelector(
            `.sort-btn[data-category="${categoryName}"][data-field="${field}"][data-direction="${direction}"]`
        );
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.classList.add(direction);
        }
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
                    const aVal = (a.nome || '').toLowerCase();
                    const bVal = (b.nome || '').toLowerCase();
                    return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
            });
        }

        return items;
    },

    // Funzione per ottenere statistiche del filtro corrente
    getFilterStats() {
        let totalItems = 0;
        let visibleItems = 0;
        let lowStockItems = 0;

        const currentWarehouseData = Database.warehouses[this.currentWarehouse];
        if (!currentWarehouseData) return { totalItems: 0, visibleItems: 0, lowStockItems: 0 };

        Object.keys(currentWarehouseData).forEach(categoryName => {
            currentWarehouseData[categoryName].forEach(item => {
                totalItems++;
                const threshold = item.alertThreshold || Constants.DEFAULT_VALUES.ALERT_THRESHOLD;
                
                if (item.quantita <= threshold) {
                    lowStockItems++;
                }
                
                // Qui potresti aggiungere la logica per contare gli elementi visibili
                // basandoti sul filtro corrente e la ricerca
            });
        });

        return {
            totalItems,
            visibleItems,
            lowStockItems
        };
    }
};

// ESPORTAZIONE CORRETTA
if (typeof window !== 'undefined') {
    window.InventoryManager = InventoryManager;
}

console.log('✅ InventoryManager caricato correttamente con filtri funzionanti');