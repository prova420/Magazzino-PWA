// src/modules/ui-manager.js - VERSIONE COMPLETA CON CORREZIONI APPLICATE
const UIManager = {
    currentWarehouse: 'Magazzino 1',

    init() {
        this.setupEventListeners();
        this.renderWarehouseTabs();
        this.renderCategories();
        this.updateSummary();
        
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.renderHistory();
        }

        if (Object.keys(Database.warehouses).length > 0) {
            this.switchWarehouse(Object.keys(Database.warehouses)[0]);
        }
    },

    setupEventListeners() {
        // Pulsante aggiungi magazzino
        document.getElementById('add-warehouse-btn')?.addEventListener('click', () => this.addWarehouse());

        // Pulsante rinomina magazzino
        document.getElementById('rename-btn')?.addEventListener('click', () => this.showRenamePrompt());

        // Header storico (per toggle)
        document.getElementById('history-header')?.addEventListener('click', () => {
            if (typeof HistoryManager !== 'undefined' && HistoryManager.toggleHistory) {
                HistoryManager.toggleHistory();
            }
        });

        // Pulsante scroll to top
        document.getElementById('scroll-top-btn')?.addEventListener('click', () => this.scrollToTop());

        // Chiudi modale cliccando fuori
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('sync-modal');
            if (event.target === modal) {
                if (typeof SyncManager !== 'undefined' && SyncManager.closeSyncModal) {
                    SyncManager.closeSyncModal();
                }
            }
        });

        // Setup per ricerca, filtri e ordinamento
        this.setupSearchAndFilters();
    },

    // NUOVA FUNZIONE: Setup per ricerca, filtri e ordinamento
    setupSearchAndFilters() {
        // Delegazione eventi per i filtri
        document.addEventListener('click', (event) => {
            if (event.target.matches('#filter-all, #filter-all *')) {
                this.handleFilterClick('all');
            } else if (event.target.matches('#filter-low, #filter-low *')) {
                this.handleFilterClick('low');
            }
        });

        // Ricerca in tempo reale con debounce
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Helpers.debounce(() => {
                if (typeof InventoryManager !== 'undefined' && InventoryManager.filterItems) {
                    const currentFilter = InventoryManager.currentFilter || 'all';
                    InventoryManager.filterItems(currentFilter);
                }
            }, 300));
        }

        // Pulsante aggiungi categoria
        document.getElementById('add-category-btn')?.addEventListener('click', () => {
            if (typeof InventoryManager !== 'undefined' && InventoryManager.showAddCategoryModal) {
                InventoryManager.showAddCategoryModal();
            }
        });

        // Delegazione eventi per pulsanti dinamici
        this.setupDynamicEventListeners();
    },

    // NUOVA FUNZIONE: Gestione click filtri
    handleFilterClick(filterType) {
        this.removeFilterHighlights();
        
        if (filterType === 'low') {
            this.highlightLowStockItems();
        }
        
        if (typeof InventoryManager !== 'undefined' && InventoryManager.filterItems) {
            InventoryManager.filterItems(filterType);
        }
    },

    // NUOVA FUNZIONE: Setup eventi per elementi dinamici
    setupDynamicEventListeners() {
        // Delegazione eventi per pulsanti dinamici
        document.addEventListener('click', (event) => {
            // Pulsanti aggiungi articolo
            if (event.target.closest('.add-item-btn')) {
                const button = event.target.closest('.add-item-btn');
                const categoryName = button.dataset.category;
                if (categoryName && typeof InventoryManager !== 'undefined') {
                    InventoryManager.addItem(categoryName);
                }
            }
            
            // Pulsanti rimuovi categoria
            if (event.target.closest('.remove-category-btn')) {
                const button = event.target.closest('.remove-category-btn');
                const categoryName = button.dataset.category;
                if (categoryName && confirm(`Eliminare la categoria "${categoryName}" e tutti i suoi articoli?`)) {
                    InventoryManager.removeCategory(categoryName);
                }
            }
            
            // Pulsanti ordinamento
            if (event.target.closest('.sort-btn')) {
                const button = event.target.closest('.sort-btn');
                const categoryName = button.dataset.category;
                const field = button.dataset.field;
                const direction = button.dataset.direction;
                
                if (categoryName && field && direction && typeof InventoryManager !== 'undefined') {
                    InventoryManager.sortItems(categoryName, field, direction);
                }
            }
            
            // Pulsanti elimina articolo
            if (event.target.closest('.delete-item-btn')) {
                const button = event.target.closest('.delete-item-btn');
                const categoryName = button.dataset.category;
                const itemIndex = parseInt(button.dataset.index);
                
                if (categoryName !== undefined && !isNaN(itemIndex) && 
                    confirm('Sei sicuro di voler eliminare questo articolo?')) {
                    InventoryManager.removeItem(categoryName, itemIndex);
                }
            }
        });

        // Delegazione eventi per input modifica articoli
        document.addEventListener('input', Helpers.debounce((event) => {
            if (event.target.matches('.item-name-input, .item-quantity-input, .item-threshold-input')) {
                const input = event.target;
                const categoryName = input.dataset.category;
                const itemIndex = parseInt(input.dataset.index);
                const field = input.dataset.field;
                
                if (categoryName !== undefined && !isNaN(itemIndex) && field) {
                    InventoryManager.updateItem(categoryName, itemIndex, field, input.value);
                }
            }
        }, 500));

        // Delegazione eventi per cambiamento immediato su campi numerici
        document.addEventListener('change', (event) => {
            if (event.target.matches('.item-quantity-input, .item-threshold-input')) {
                const input = event.target;
                const categoryName = input.dataset.category;
                const itemIndex = parseInt(input.dataset.index);
                const field = input.dataset.field;
                
                if (categoryName !== undefined && !isNaN(itemIndex) && field) {
                    // Validazione base per valori numerici
                    let value = parseInt(input.value) || 0;
                    if (value < 0) value = 0;
                    input.value = value;
                    
                    InventoryManager.updateItem(categoryName, itemIndex, field, value);
                }
            }
        });
    },

    // METODO RINOMINA MIGLIORATO
    showRenamePrompt() {
        const currentName = this.currentWarehouse;
        
        const newName = prompt(
            `Rinomina magazzino "${currentName}"\n\nInserisci il nuovo nome:`,
            currentName
        );

        // Validazione robusta
        if (!newName || newName.trim() === '') {
            if (newName !== null) {
                this.showNotification('Il nome non può essere vuoto', true);
            }
            return;
        }

        const trimmedName = newName.trim();
        
        if (trimmedName === currentName) {
            this.showNotification('Il nome è identico a quello corrente', true);
            return;
        }

        if (Database.warehouses[trimmedName]) {
            this.showNotification(`Il magazzino "${trimmedName}" esiste già`, true);
            return;
        }

        if (trimmedName.length > 50) {
            this.showNotification('Il nome non può superare 50 caratteri', true);
            return;
        }

        this.renameWarehouse(currentName, trimmedName);
    },

    renameWarehouse(oldName, newName) {
        try {
            const success = Database.renameWarehouse(oldName, newName);

            if (success) {
                Database.save();
                this.currentWarehouse = newName;
                this.renderWarehouseTabs();
                this.switchWarehouse(newName);
                
                if (typeof HistoryManager !== 'undefined') {
                    HistoryManager.addEntry(`Rinominato magazzino da "${oldName}" a "${newName}"`, newName);
                }
                
                this.showNotification(`Magazzino rinominato in "${newName}"`);
            } else {
                throw new Error('Errore nel database');
            }
        } catch (error) {
            console.error('Errore durante la rinomina:', error);
            this.showNotification('Errore durante la rinomina del magazzino', true);
            this.switchWarehouse(oldName);
        }
    },

    switchWarehouse(name) {
        if (!Database.warehouses[name]) {
            console.warn(`Magazzino "${name}" non trovato, uso il primo disponibile`);
            const availableWarehouses = Object.keys(Database.warehouses);
            if (availableWarehouses.length > 0) {
                name = availableWarehouses[0];
            } else {
                console.error('Nessun magazzino disponibile');
                return;
            }
        }

        this.currentWarehouse = name;
        
        if (typeof InventoryManager !== 'undefined') {
            InventoryManager.setCurrentWarehouse(name);
        }

        this.updateWarehouseUI(name);
        this.renderCategories();
        this.updateSummary();
        
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.renderHistory();
        }
    },

    updateWarehouseUI(warehouseName) {
        try {
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.warehouse === warehouseName) {
                    tab.classList.add('active');
                }
            });

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            const warehouseContent = document.getElementById('warehouse-content');
            if (warehouseContent) {
                warehouseContent.classList.add('active');
            }

            const currentWarehouseName = document.getElementById('current-warehouse-name');
            if (currentWarehouseName) {
                currentWarehouseName.textContent = warehouseName;
            }
        } catch (error) {
            console.error('Errore nell\'aggiornamento UI:', error);
        }
    },

    // FUNZIONI PER FILTRI CON EVIDENZIAZIONE
    highlightLowStockItems() {
        const lowStockItems = document.querySelectorAll('.item-row.low-stock, .item-row.critical-stock');
        
        lowStockItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.transform = 'scale(1.02)';
                item.style.boxShadow = '0 4px 20px rgba(244, 67, 54, 0.4)';
                item.style.zIndex = '10';
                item.style.animation = 'pulse-critical 0.6s infinite';
                item.style.border = '2px solid #ff5252';
                item.style.transition = 'all 0.3s ease';
            }, index * 100);
        });

        this.showFilterMessage(`Trovati ${lowStockItems.length} articoli in esaurimento`);
    },

    removeFilterHighlights() {
        const allItems = document.querySelectorAll('.item-row');
        allItems.forEach(item => {
            item.style.transform = '';
            item.style.boxShadow = '';
            item.style.zIndex = '';
            item.style.animation = '';
            item.style.border = '';
            item.style.transition = '';
        });
        this.removeFilterMessage();
    },

    showFilterMessage(message) {
        this.removeFilterMessage();
        const messageElement = document.createElement('div');
        messageElement.id = 'filter-message';
        messageElement.style.cssText = `
            background: linear-gradient(135deg, #ff5252, #d32f2f);
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            margin: 10px 0;
            text-align: center;
            font-weight: bold;
            animation: slideDown 0.3s ease-out;
        `;
        messageElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        const searchBar = document.querySelector('.search-bar');
        if (searchBar) {
            searchBar.parentNode.insertBefore(messageElement, searchBar.nextSibling);
        }
    },

    removeFilterMessage() {
        const existingMessage = document.getElementById('filter-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    },

    // GESTIONE MAGAZZINI
    addWarehouse() {
        const newName = prompt("Inserisci il nome del nuovo magazzino:", `Magazzino ${Object.keys(Database.warehouses).length + 1}`);
        if (newName && newName.trim() !== "") {
            const success = Database.addWarehouse(newName.trim());

            if (success) {
                Database.save();
                if (typeof HistoryManager !== 'undefined') {
                    HistoryManager.addEntry(`Creato nuovo magazzino: ${newName}`, newName);
                }
                this.renderWarehouseTabs();
                this.switchWarehouse(newName);
                if (typeof Notifications !== 'undefined') {
                    Notifications.show('Magazzino creato!');
                }
            }
        }
    },

    // RENDER UI
    renderWarehouseTabs() {
        const tabsContainer = document.getElementById('warehouse-tabs');
        if (!tabsContainer) {
            console.error('Container tabs non trovato');
            return;
        }

        tabsContainer.innerHTML = '';

        Object.keys(Database.warehouses).forEach((name) => {
            const tab = document.createElement('button');
            tab.className = `tab ${name === this.currentWarehouse ? 'active' : ''}`;
            tab.setAttribute('data-warehouse', name);
            tab.innerHTML = `<i class="fas fa-warehouse"></i> ${this.escapeHTML(name)}`;
            tab.addEventListener('click', () => this.switchWarehouse(name));
            tabsContainer.appendChild(tab);
        });

        const summaryTab = document.createElement('button');
        summaryTab.className = 'tab';
        summaryTab.setAttribute('data-tab', 'summary');
        summaryTab.innerHTML = '<i class="fas fa-clipboard-list"></i> Panoramica';
        summaryTab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            summaryTab.classList.add('active');
            
            const summaryContent = document.getElementById('summary-content');
            if (summaryContent) {
                summaryContent.classList.add('active');
            }
            
            this.renderWarehouseSummary();
        });
        tabsContainer.appendChild(summaryTab);
    },

    renderWarehouseSummary() {
        const summaryContainer = document.getElementById('warehouse-summary');
        if (!summaryContainer) return;

        summaryContainer.innerHTML = '';

        Object.keys(Database.warehouses).forEach(name => {
            let totalItems = 0;
            let lowStock = 0;

            Object.keys(Database.warehouses[name]).forEach(categoryName => {
                totalItems += Database.warehouses[name][categoryName].length;
                Database.warehouses[name][categoryName].forEach(item => {
                    const threshold = item.alertThreshold || 5;
                    if (item.quantita <= threshold) lowStock++;
                });
            });

            const summaryCard = document.createElement('div');
            summaryCard.className = 'summary-card';
            summaryCard.innerHTML = `
                <h3><i class="fas fa-warehouse"></i> ${this.escapeHTML(name)}</h3>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label"><i class="fas fa-boxes"></i> Totale:</span>
                        <span class="stat-value">${totalItems}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label"><i class="fas fa-exclamation-triangle"></i> Esaurimento:</span>
                        <span class="stat-value ${lowStock > 0 ? 'negative' : ''}">${lowStock}</span>
                    </div>
                </div>
                <button class="btn btn-primary manage-btn" onclick="UIManager.switchWarehouse('${this.escapeHTML(name)}')">
                    <i class="fas fa-edit"></i> Gestisci
                </button>
            `;
            summaryContainer.appendChild(summaryCard);
        });
    },

    renderCategories() {
        const container = document.getElementById('category-sections');
        if (!container) return;

        container.innerHTML = '';

        const currentWarehouseData = Database.warehouses[this.currentWarehouse];
        if (!currentWarehouseData) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-warehouse"></i>
                    <p>Nessun magazzino trovato. Crea un nuovo magazzino per iniziare.</p>
                </div>
            `;
            return;
        }

        const categoryNames = Object.keys(currentWarehouseData);
        
        if (categoryNames.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>Nessuna categoria trovata. Aggiungi una categoria per iniziare.</p>
                </div>
            `;
            return;
        }

        categoryNames.forEach(categoryName => {
            const section = document.createElement('div');
            section.className = 'category-section';
            
            section.innerHTML = `
                <div class="category-header">
                    <h3><i class="fas fa-folder"></i> ${this.escapeHTML(categoryName)}</h3>
                    <div>
                        <button class="btn btn-success btn-sm add-item-btn" data-category="${this.escapeHTML(categoryName)}">
                            <i class="fas fa-plus"></i> Aggiungi Articolo
                        </button>
                        ${categoryName !== 'cibo' && categoryName !== 'pulizie' ? 
                            `<button class="btn btn-danger btn-sm remove-category-btn" data-category="${this.escapeHTML(categoryName)}">
                                <i class="fas fa-trash"></i>
                            </button>` : ''
                        }
                    </div>
                </div>
                <div class="sort-buttons">
                    <button class="sort-btn ${this.getSortClass(categoryName, 'nome', 'asc')}" 
                            data-category="${this.escapeHTML(categoryName)}" data-field="nome" data-direction="asc">
                        <i class="fas fa-sort-alpha-down"></i> Nome (A-Z)
                    </button>
                    <button class="sort-btn ${this.getSortClass(categoryName, 'nome', 'desc')}" 
                            data-category="${this.escapeHTML(categoryName)}" data-field="nome" data-direction="desc">
                        <i class="fas fa-sort-alpha-up"></i> Nome (Z-A)
                    </button>
                    <button class="sort-btn ${this.getSortClass(categoryName, 'quantita', 'asc')}" 
                            data-category="${this.escapeHTML(categoryName)}" data-field="quantita" data-direction="asc">
                        <i class="fas fa-sort-amount-down"></i> Quantità (Crescente)
                    </button>
                    <button class="sort-btn ${this.getSortClass(categoryName, 'quantita', 'desc')}" 
                            data-category="${this.escapeHTML(categoryName)}" data-field="quantita" data-direction="desc">
                        <i class="fas fa-sort-amount-up"></i> Quantità (Decrescente)
                    </button>
                </div>
                <div id="${this.escapeHTML(categoryName)}-items" class="items-container"></div>
            `;
            container.appendChild(section);
            this.renderCategoryItems(categoryName);
        });
    },

    renderCategoryItems(categoryName) {
        const container = document.getElementById(`${categoryName}-items`);
        if (!container) return;

        container.innerHTML = '';

        const currentWarehouseData = Database.warehouses[this.currentWarehouse];
        if (!currentWarehouseData || !currentWarehouseData[categoryName]) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Nessun articolo in questa categoria</p>
                </div>
            `;
            return;
        }

        const items = currentWarehouseData[categoryName];
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>Nessun articolo in questa categoria</p>
                </div>
            `;
        } else {
            items.forEach((item, index) => {
                const threshold = item.alertThreshold || 5;
                const isLowStock = item.quantita <= threshold;
                const isCriticalStock = item.quantita <= Math.floor(threshold / 2);
                
                const itemElement = document.createElement('div');
                itemElement.className = 'item-row';
                
                if (isCriticalStock) {
                    itemElement.classList.add('critical-stock');
                } else if (isLowStock) {
                    itemElement.classList.add('low-stock');
                }
                
                itemElement.innerHTML = `
                    ${isLowStock ? '<div class="low-stock-badge" title="Articolo in esaurimento"><i class="fas fa-exclamation-triangle"></i></div>' : ''}
                    
                    <div class="item-field">
                        <label><i class="fas fa-tag"></i> Nome Articolo</label>
                        <input type="text" 
                               class="item-name-input"
                               data-category="${this.escapeHTML(categoryName)}" 
                               data-index="${index}" 
                               data-field="nome"
                               value="${this.escapeHTML(item.nome || '')}" 
                               placeholder="Nome articolo">
                    </div>
                    
                    <div class="item-field">
                        <label><i class="fas fa-box"></i> Quantità</label>
                        <input type="number" 
                               min="0" 
                               class="item-quantity-input"
                               data-category="${this.escapeHTML(categoryName)}" 
                               data-index="${index}" 
                               data-field="quantita"
                               value="${item.quantita || 0}" 
                               placeholder="Quantità">
                        
                        <div class="alert-threshold">
                            <label><i class="fas fa-bell"></i> Allerta sotto:</label>
                            <input type="number" 
                                   min="1" 
                                   class="item-threshold-input"
                                   data-category="${this.escapeHTML(categoryName)}" 
                                   data-index="${index}" 
                                   data-field="alertThreshold"
                                   value="${threshold}">
                        </div>
                    </div>
                    
                    <div class="actions">
                        <button class="btn btn-danger delete-item-btn" 
                                data-category="${this.escapeHTML(categoryName)}" 
                                data-index="${index}">
                            <i class="fas fa-trash"></i> Elimina
                        </button>
                    </div>
                `;
                container.appendChild(itemElement);
            });
        }
    },

    getSortClass(categoryName, field, direction) {
        if (typeof InventoryManager !== 'undefined' && InventoryManager.getSortClass) {
            return InventoryManager.getSortClass(categoryName, field, direction);
        }
        return '';
    },

    updateSummary() {
        let totalItems = 0;
        let lowStock = 0;

        const currentWarehouseData = Database.warehouses[this.currentWarehouse];
        if (!currentWarehouseData) {
            totalItems = 0;
            lowStock = 0;
        } else {
            Object.keys(currentWarehouseData).forEach(categoryName => {
                totalItems += currentWarehouseData[categoryName].length;
                currentWarehouseData[categoryName].forEach(item => {
                    const threshold = item.alertThreshold || 5;
                    if (item.quantita <= threshold) lowStock++;
                });
            });
        }

        const totalItemsEl = document.getElementById('total-items');
        const lowStockEl = document.getElementById('low-stock');

        if (totalItemsEl) totalItemsEl.textContent = totalItems;
        if (lowStockEl) lowStockEl.textContent = lowStock;
    },

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // NUOVO METODO: Escape HTML per sicurezza
    escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // NUOVO METODO: Notifiche locali
    showNotification(message, isError = false) {
        if (typeof Notifications !== 'undefined') {
            Notifications.show(message, isError);
        } else {
            console.log(isError ? '❌' : '✅', message);
        }
    },

    // NUOVO METODO: Aggiorna l'interfaccia dopo modifiche
    refreshUI() {
        this.renderCategories();
        this.updateSummary();
        this.renderWarehouseTabs();
        
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.renderHistory();
        }
        
        // Riapplica il filtro corrente
        if (typeof InventoryManager !== 'undefined' && InventoryManager.filterItems) {
            setTimeout(() => {
                InventoryManager.filterItems(InventoryManager.currentFilter || 'all');
            }, 100);
        }
    }
};

// ESPORTAZIONE CORRETTA
if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}

console.log('✅ UIManager caricato correttamente con tutte le correzioni');