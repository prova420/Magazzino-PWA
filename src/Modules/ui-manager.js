// src/modules/ui-manager.js - VERSIONE COMPLETA CON RINOMINA ROBUSTA
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

        // Pulsante rinomina magazzino - MODIFICATO
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

        // Ricerca in tempo reale
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (typeof InventoryManager !== 'undefined' && InventoryManager.filterItems) {
                    InventoryManager.filterItems('all');
                }
            });
        }

        // FILTRI MIGLIORATI CON EVIDENZIAZIONE
        document.getElementById('filter-all')?.addEventListener('click', () => {
            this.removeFilterHighlights();
            if (typeof InventoryManager !== 'undefined' && InventoryManager.filterItems) {
                InventoryManager.filterItems('all');
            }
        });

        document.getElementById('filter-low')?.addEventListener('click', () => {
            this.removeFilterHighlights();
            this.highlightLowStockItems();
            if (typeof InventoryManager !== 'undefined' && InventoryManager.filterItems) {
                InventoryManager.filterItems('low');
            }
        });

        // Aggiungi categoria
        document.getElementById('add-category-btn')?.addEventListener('click', () => {
            if (typeof InventoryManager !== 'undefined' && InventoryManager.showAddCategoryModal) {
                InventoryManager.showAddCategoryModal();
            }
        });
    },

    // NUOVO METODO: Gestione rinomina robusta
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

    // METODO RINOMINA MIGLIORATO
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

    // MODIFICA AL METODO switchWarehouse
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

    // NUOVO METODO: Aggiornamento UI sicuro
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

    // FUNZIONI ESISTENTI PER FILTRI (invariate)
    highlightLowStockItems() {
        const lowStockItems = document.querySelectorAll('.item-row.low-stock, .item-row.critical-stock');
        
        lowStockItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.transform = 'scale(1.02)';
                item.style.boxShadow = '0 4px 20px rgba(244, 67, 54, 0.4)';
                item.style.zIndex = '10';
                item.style.animation = 'pulse-critical 0.6s infinite';
                item.style.border = '2px solid #ff5252';
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

        const airtableTab = document.createElement('button');
        airtableTab.className = 'tab';
        airtableTab.setAttribute('data-tab', 'airtable');
        airtableTab.innerHTML = '<i class="fas fa-database"></i> Airtable';
        airtableTab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            airtableTab.classList.add('active');
            
            const airtableContent = document.getElementById('airtable-content');
            if (airtableContent) {
                airtableContent.classList.add('active');
            }
            
            if (typeof AirtableSync !== 'undefined') {
                if (AirtableSync.updateStatus) AirtableSync.updateStatus();
                if (AirtableSync.updateStats) AirtableSync.updateStats();
            }
        });
        tabsContainer.appendChild(airtableTab);
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
        if (!currentWarehouseData) return;

        Object.keys(currentWarehouseData).forEach(categoryName => {
            const section = document.createElement('div');
            section.innerHTML = `
                <div class="category-header">
                    <h3><i class="fas fa-folder"></i> ${this.escapeHTML(categoryName)}</h3>
                    <div>
                        <button class="btn btn-success btn-sm" onclick="InventoryManager.addItem('${this.escapeHTML(categoryName)}')">
                            <i class="fas fa-plus"></i> Aggiungi Articolo
                        </button>
                        ${categoryName !== 'cibo' && categoryName !== 'pulizie' ? 
                            `<button class="btn btn-danger btn-sm" onclick="InventoryManager.removeCategory('${this.escapeHTML(categoryName)}')">
                                <i class="fas fa-trash"></i>
                            </button>` : ''
                        }
                    </div>
                </div>
                <div class="sort-buttons">
                    <button class="sort-btn ${this.getSortClass(categoryName, 'nome', 'asc')}" 
                            onclick="InventoryManager.sortItems('${this.escapeHTML(categoryName)}', 'nome', 'asc')">
                        <i class="fas fa-sort-alpha-down"></i> Nome (A-Z)
                    </button>
                    <button class="sort-btn ${this.getSortClass(categoryName, 'nome', 'desc')}" 
                            onclick="InventoryManager.sortItems('${this.escapeHTML(categoryName)}', 'nome', 'desc')">
                        <i class="fas fa-sort-alpha-up"></i> Nome (Z-A)
                    </button>
                    <button class="sort-btn ${this.getSortClass(categoryName, 'quantita', 'asc')}" 
                            onclick="InventoryManager.sortItems('${this.escapeHTML(categoryName)}', 'quantita', 'asc')">
                        <i class="fas fa-sort-amount-down"></i> Quantità (Crescente)
                    </button>
                    <button class="sort-btn ${this.getSortClass(categoryName, 'quantita', 'desc')}" 
                            onclick="InventoryManager.sortItems('${this.escapeHTML(categoryName)}', 'quantita', 'desc')">
                        <i class="fas fa-sort-amount-up"></i> Quantità (Decrescente)
                    </button>
                </div>
                <div id="${this.escapeHTML(categoryName)}-items"></div>
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
                    
                    <div class="low-stock-tooltip">
                        <div>
                            <label><i class="fas fa-tag"></i> Nome Articolo</label>
                            <input type="text" value="${this.escapeHTML(item.nome || '')}" 
                                onchange="InventoryManager.updateItem('${this.escapeHTML(categoryName)}', ${index}, 'nome', this.value)"
                                placeholder="Nome articolo">
                        </div>
                    </div>
                    
                    <div>
                        <label><i class="fas fa-box"></i> Quantità</label>
                        <input type="number" min="0" value="${item.quantita || 0}" 
                            onchange="InventoryManager.updateItem('${this.escapeHTML(categoryName)}', ${index}, 'quantita', this.value)"
                            placeholder="Quantità">
                        
                        <div class="alert-threshold">
                            <label><i class="fas fa-bell"></i> Allerta sotto:</label>
                            <input type="number" min="1" value="${threshold}" 
                                onchange="InventoryManager.updateItem('${this.escapeHTML(categoryName)}', ${index}, 'alertThreshold', this.value)">
                        </div>
                    </div>
                    
                    <div class="actions">
                        <button class="btn btn-danger" onclick="InventoryManager.removeItem('${this.escapeHTML(categoryName)}', ${index})">
                            <i class="fas fa-trash"></i>
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
        if (!currentWarehouseData) return;

        Object.keys(currentWarehouseData).forEach(categoryName => {
            totalItems += currentWarehouseData[categoryName].length;
            currentWarehouseData[categoryName].forEach(item => {
                const threshold = item.alertThreshold || 5;
                if (item.quantita <= threshold) lowStock++;
            });
        });

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
    }
};

if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}