// src/app.js - VERSIONE OTTIMIZZATA CON GESTIONE ERRORI MIGLIORATA

const App = {
    init() {
        console.log('🚀 Inizializzazione applicazione...');
        
        // Verifica che tutti i moduli necessari siano caricati
        this.verifyModules();
        
        // Inizializza i moduli nell'ordine corretto
        this.initializeModules();
        
        // Setup PWA con gestione migliorata
        this.setupPWA();
        
        // Backup automatico
        this.setupAutoSave();
        
        console.log('🎉 App inizializzata correttamente');
    },

    verifyModules() {
        const requiredModules = ['Database', 'Notifications', 'ThemeManager', 'HistoryManager', 'SyncManager', 'InventoryManager', 'UIManager'];
        const missingModules = [];

        requiredModules.forEach(module => {
            if (typeof window[module] === 'undefined') {
                missingModules.push(module);
                console.error(`❌ Modulo mancante: ${module}`);
            }
        });

        if (missingModules.length > 0) {
            console.warn('⚠️ Moduli mancanti:', missingModules);
            this.showModuleError(missingModules);
            return false;
        }

        console.log('✅ Tutti i moduli richiesti sono presenti');
        return true;
    },

    showModuleError(missingModules) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div style="color: #e74c3c; text-align: center; padding: 40px; max-width: 500px; margin: 0 auto;">
                    <h2><i class="fas fa-exclamation-triangle"></i> Errore di Caricamento</h2>
                    <p>Alcuni moduli necessari non sono stati caricati correttamente:</p>
                    <ul style="text-align: left; margin: 20px 0;">
                        ${missingModules.map(mod => `<li><strong>${mod}</strong></li>`).join('')}
                    </ul>
                    <p>Controlla la console del browser per maggiori dettagli.</p>
                    <div style="margin-top: 30px;">
                        <button onclick="location.reload()" class="btn btn-primary" style="margin: 5px;">
                            <i class="fas fa-redo"></i> Ricarica la Pagina
                        </button>
                        <button onclick="App.retryInitialization()" class="btn btn-warning" style="margin: 5px;">
                            <i class="fas fa-sync-alt"></i> Riprova Inizializzazione
                        </button>
                    </div>
                </div>
            `;
        }
    },

    retryInitialization() {
        console.log('🔄 Tentativo di reinizializzazione...');
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h2><i class="fas fa-spinner fa-spin"></i> Reinizializzazione in corso...</h2>
                    <p>Verifica dei moduli...</p>
                </div>
            `;
        }
        
        setTimeout(() => {
            this.init();
        }, 2000);
    },

    initializeModules() {
        console.group('🔧 Inizializzazione Moduli');
        
        // 1. Database prima di tutto
        if (typeof Database !== 'undefined') {
            try {
                Database.init();
                console.log('✅ Database inizializzato');
            } catch (error) {
                console.error('❌ Errore inizializzazione Database:', error);
                this.showError('Errore critico: impossibile inizializzare il database');
                return;
            }
        } else {
            console.error('❌ Database non trovato');
            this.showError('Errore critico: modulo Database non caricato');
            return;
        }

        // 2. Notifiche
        if (typeof Notifications !== 'undefined') {
            try {
                Notifications.init();
                console.log('✅ Notifiche inizializzate');
            } catch (error) {
                console.error('❌ Errore inizializzazione Notifiche:', error);
            }
        }

        // 3. Tema
        if (typeof ThemeManager !== 'undefined') {
            try {
                ThemeManager.init();
                console.log('✅ Tema inizializzato');
            } catch (error) {
                console.error('❌ Errore inizializzazione Tema:', error);
            }
        }

        // 4. Storico
        if (typeof HistoryManager !== 'undefined') {
            try {
                HistoryManager.init();
                console.log('✅ Storico inizializzato');
            } catch (error) {
                console.error('❌ Errore inizializzazione Storico:', error);
            }
        }

        // 5. Sincronizzazione generale
        if (typeof SyncManager !== 'undefined') {
            try {
                SyncManager.init();
                console.log('✅ SyncManager inizializzato');
            } catch (error) {
                console.error('❌ Errore inizializzazione SyncManager:', error);
            }
        }

        // 6. Gestione inventario
        if (typeof InventoryManager !== 'undefined') {
            try {
                InventoryManager.init();
                console.log('✅ InventoryManager inizializzato');
            } catch (error) {
                console.error('❌ Errore inizializzazione InventoryManager:', error);
            }
        }

        // 7. UI Manager (dipende da tutti gli altri)
        if (typeof UIManager !== 'undefined') {
            // Delay per assicurarsi che tutto sia pronto
            setTimeout(() => {
                try {
                    UIManager.init();
                    console.log('✅ UI Manager inizializzato');
                    
                    // Nascondi loading e mostra app
                    this.hideLoading();
                    
                    // Esegui validazione finale
                    this.finalValidation();
                } catch (error) {
                    console.error('❌ Errore inizializzazione UI Manager:', error);
                    this.hideLoading();
                }
            }, 500);
        } else {
            console.error('❌ UI Manager non trovato');
            this.hideLoading();
        }

        console.groupEnd();
    },

    hideLoading() {
        setTimeout(() => {
            const loading = document.getElementById('loading');
            const appContent = document.getElementById('app-content');
            
            if (loading && appContent) {
                loading.style.display = 'none';
                appContent.style.display = 'block';
                console.log('✅ Interfaccia utente caricata');
                
                // Aggiungi classe per transizione smooth
                appContent.style.opacity = '0';
                appContent.style.transition = 'opacity 0.5s ease-in-out';
                
                setTimeout(() => {
                    appContent.style.opacity = '1';
                }, 100);
            }
        }, 1000);
    },

    finalValidation() {
        console.group('🔍 Validazione Finale');
        
        // Verifica integrità dati
        if (typeof Database !== 'undefined' && Database.validateData) {
            const errors = Database.validateData();
            if (errors.length > 0) {
                console.warn('⚠️ Trovati errori nei dati:', errors);
            }
        }
        
        // Mostra statistiche
        if (typeof Database !== 'undefined' && Database.getStats) {
            const stats = Database.getStats();
            console.log('📊 Statistiche applicazione:', stats);
        }
        
        console.groupEnd();
        
        // Notifica utente
        if (typeof Notifications !== 'undefined') {
            setTimeout(() => {
                Notifications.show('Applicazione caricata correttamente!');
            }, 1500);
        }
    },

    showError(message) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.innerHTML = `
                <div style="color: #e74c3c; text-align: center; padding: 40px;">
                    <h2><i class="fas fa-exclamation-triangle"></i> Errore Critico</h2>
                    <p style="margin: 20px 0; font-size: 16px;">${message}</p>
                    <div style="margin-top: 30px;">
                        <button onclick="location.reload()" class="btn btn-primary" style="margin: 5px;">
                            <i class="fas fa-redo"></i> Ricarica Applicazione
                        </button>
                        <button onclick="App.showDebugInfo()" class="btn btn-warning" style="margin: 5px;">
                            <i class="fas fa-bug"></i> Informazioni Debug
                        </button>
                    </div>
                    <div id="debug-info" style="display: none; margin-top: 20px; text-align: left; background: #f8f9fa; padding: 15px; border-radius: 5px;"></div>
                </div>
            `;
        }
    },

    showDebugInfo() {
        const debugInfo = document.getElementById('debug-info');
        if (debugInfo) {
            const modules = ['Database', 'Notifications', 'ThemeManager', 'HistoryManager', 'SyncManager', 'InventoryManager', 'UIManager'];
            let debugHTML = '<h4>Stato Moduli:</h4><ul>';
            
            modules.forEach(module => {
                const isLoaded = typeof window[module] !== 'undefined';
                debugHTML += `<li><strong>${module}:</strong> ${isLoaded ? '✅ Caricato' : '❌ Mancante'}</li>`;
            });
            
            debugHTML += '</ul>';
            debugHTML += `<p><strong>User Agent:</strong> ${navigator.userAgent}</p>`;
            debugHTML += `<p><strong>LocalStorage:</strong> ${typeof localStorage !== 'undefined' ? '✅ Disponibile' : '❌ Non disponibile'}</p>`;
            debugHTML += `<p><strong>Service Worker:</strong> ${'serviceWorker' in navigator ? '✅ Supportato' : '❌ Non supportato'}</p>`;
            
            debugInfo.innerHTML = debugHTML;
            debugInfo.style.display = 'block';
        }
    },

    setupPWA() {
        console.log('🔧 Configurazione PWA...');
        let deferredPrompt = null;
        let installButton = null;

        // Registra Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('✅ Service Worker registrato con scope:', registration.scope);
                        
                        // Controlla aggiornamenti
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            console.log('🔄 Nuova versione del Service Worker trovata');
                            
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('✅ Nuova versione pronta per l\'attivazione');
                                    if (typeof Notifications !== 'undefined') {
                                        Notifications.show('Nuova versione disponibile! Ricarica l\'app per aggiornare.');
                                    }
                                }
                            });
                        });
                    })
                    .catch(error => {
                        console.warn('⚠️ Service Worker non registrato:', error);
                    });
            });
        }

        // Gestione installazione PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📱 Evento beforeinstallprompt catturato');
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallButton();
        });

        this.showInstallButton = () => {
            if (document.getElementById('install-pwa-btn') || !deferredPrompt) {
                return;
            }

            installButton = document.createElement('button');
            installButton.id = 'install-pwa-btn';
            installButton.innerHTML = '<i class="fas fa-download"></i> Installa App';
            installButton.className = 'btn btn-success';
            installButton.style.margin = '10px auto';
            installButton.style.display = 'block';
            installButton.style.animation = 'pulse 2s infinite';

            installButton.addEventListener('click', async () => {
                if (!deferredPrompt) {
                    console.log('⚠️ Nessun prompt di installazione disponibile');
                    return;
                }

                console.log('📱 Mostrando prompt di installazione...');
                deferredPrompt.prompt();
                const choiceResult = await deferredPrompt.userChoice;
                console.log('✅ Scelta utente:', choiceResult.outcome);

                if (choiceResult.outcome === 'accepted') {
                    console.log('🎉 Utente ha accettato l\'installazione');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('App installata con successo!');
                    }
                    installButton.style.display = 'none';
                } else {
                    console.log('❌ Utente ha rifiutato l\'installazione');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('Installazione annullata', true);
                    }
                }

                deferredPrompt = null;
            });

            const header = document.querySelector('header');
            if (header) {
                header.appendChild(installButton);
            }

            console.log('✅ Pulsante installazione PWA aggiunto');
        };

        window.addEventListener('appinstalled', (evt) => {
            console.log('🎉 App installata con successo!');
            if (installButton) {
                installButton.style.display = 'none';
            }
            deferredPrompt = null;
            if (typeof Notifications !== 'undefined') {
                Notifications.show('App installata correttamente!');
            }
        });

        this.checkIfAppIsInstalled();
    },

    checkIfAppIsInstalled() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('📱 App già installata (display-mode: standalone)');
            return true;
        }

        if (window.navigator.standalone === true) {
            console.log('📱 App già installata (navigator.standalone)');
            return true;
        }

        return false;
    },

    setupAutoSave() {
        // Backup automatico ogni 5 minuti
        setInterval(() => {
            if (typeof Database !== 'undefined' && typeof Database.save === 'function') {
                try {
                    Database.save();
                    console.log('💾 Backup automatico eseguito');
                } catch (error) {
                    console.error('❌ Errore backup automatico:', error);
                }
            }
        }, 5 * 60 * 1000);

        // Salva anche quando la pagina viene chiusa
        window.addEventListener('beforeunload', () => {
            if (typeof Database !== 'undefined' && typeof Database.save === 'function') {
                try {
                    Database.save();
                    console.log('💾 Salvataggio prima della chiusura');
                } catch (error) {
                    console.error('❌ Errore salvataggio pre-chiusura:', error);
                }
            }
        });
    },

    // NUOVO: Metodo per il debug dell'applicazione
    debug() {
        console.group('🐛 Debug Applicazione');
        console.log('🕒 Tempo di caricamento:', performance.now().toFixed(2) + 'ms');
        console.log('📦 Moduli caricati:');
        
        const modules = ['Database', 'Notifications', 'ThemeManager', 'HistoryManager', 'SyncManager', 'InventoryManager', 'UIManager'];
        modules.forEach(module => {
            console.log(`  ${module}:`, typeof window[module] !== 'undefined' ? '✅' : '❌');
        });
        
        if (typeof Database !== 'undefined' && Database.getStats) {
            console.log('📊 Dati:', Database.getStats());
        }
        
        console.log('🌐 Connessione:', navigator.onLine ? 'Online' : 'Offline');
        console.log('💾 Storage:', typeof localStorage !== 'undefined' ? 'Disponibile' : 'Non disponibile');
        console.groupEnd();
    }
};

// Gestione errori globale migliorata
window.addEventListener('error', function(e) {
    console.error('❌ Errore globale catturato:', e.error);
    
    if (typeof Notifications !== 'undefined') {
        Notifications.show('Errore nell\'applicazione: ' + e.message, true);
    }
});

// Gestione promise non catturate
window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Promise non gestita:', e.reason);
    e.preventDefault();
});

// Inizializza l'app quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM caricato, inizializzazione app...');
        setTimeout(() => App.init(), 100);
    });
} else {
    console.log('⚡ DOM già pronto, inizializzazione immediata...');
    setTimeout(() => App.init(), 100);
}

// Rendiamo App disponibile globalmente per debug
window.App = App;

// Aggiungi comando debug alla console
console.log('🔧 Comando debug disponibile: digita "App.debug()" nella console per informazioni dettagliate');

console.log('📦 App.js caricato - in attesa di inizializzazione');