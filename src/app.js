// src/app.js - VERSIONE CORRETTA E OTTIMIZZATA
const App = {
    init() {
        console.log('🚀 Inizializzazione applicazione...');
        
        // Inizializza i moduli nell'ordine corretto
        this.initializeModules();
        
        // Setup PWA con gestione migliorata
        this.setupPWA();
        
        // Backup automatico
        this.setupAutoSave();

        console.log('🎉 App inizializzata correttamente');
    },

    initializeModules() {
        // 1. Database prima di tutto
        if (typeof Database !== 'undefined') {
            Database.init();
            console.log('✅ Database inizializzato');
        } else {
            console.error('❌ Database non trovato');
        }

        // 2. Notifiche
        if (typeof Notifications !== 'undefined') {
            Notifications.init();
            console.log('✅ Notifiche inizializzate');
        }

        // 3. Tema
        if (typeof ThemeManager !== 'undefined') {
            ThemeManager.init();
            console.log('✅ Tema inizializzato');
        }

        // 4. Storico
        if (typeof HistoryManager !== 'undefined') {
            HistoryManager.init();
            console.log('✅ Storico inizializzato');
        }

        // 5. Sincronizzazione generale
        if (typeof SyncManager !== 'undefined') {
            SyncManager.init();
            console.log('✅ SyncManager inizializzato');
        }

        // 6. Airtable Sync - INIZIALIZZAZIONE DIRETTA E SICURA
        this.initializeAirtableSync();

        // 7. Gestione inventario
        if (typeof InventoryManager !== 'undefined') {
            InventoryManager.init();
            console.log('✅ InventoryManager inizializzato');
        }

        // 8. UI Manager (dipende da tutti gli altri)
        if (typeof UIManager !== 'undefined') {
            UIManager.init();
            console.log('✅ UI Manager inizializzato');
        }
    },

    initializeAirtableSync() {
        // INIZIALIZZAZIONE DIRETTA E SICURA
        if (typeof AirtableSync !== 'undefined') {
            try {
                AirtableSync.init();
                console.log('✅ AirtableSync inizializzato con successo');
            } catch (error) {
                console.error('❌ Errore inizializzazione AirtableSync:', error);
            }
        } else {
            console.warn('⚠️ AirtableSync non disponibile - caricamento ritardato');
            // Tentativo di recupero dopo 1 secondo
            setTimeout(() => {
                if (typeof AirtableSync !== 'undefined') {
                    AirtableSync.init();
                    console.log('✅ AirtableSync inizializzato con ritardo');
                }
            }, 1000);
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
                    })
                    .catch(error => {
                        console.warn('⚠️ Service Worker non registrato:', error);
                    });
            });
        }

        // Gestione installazione PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('📱 Evento beforeinstallprompt catturato');
            
            // Previeni la visualizzazione automatica del banner
            e.preventDefault();
            
            // Salva l'evento per usarlo dopo
            deferredPrompt = e;
            
            // Mostra il pulsante di installazione personalizzato
            this.showInstallButton();
        });

        // Mostra il pulsante di installazione
        this.showInstallButton = () => {
            // Se il pulsante esiste già, non crearlo di nuovo
            if (document.getElementById('install-pwa-btn') || !deferredPrompt) {
                return;
            }

            // Crea pulsante installazione
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
                
                // Mostra il prompt di installazione
                deferredPrompt.prompt();
                
                // Aspetta che l'utente risponda
                const choiceResult = await deferredPrompt.userChoice;
                
                console.log('✅ Scelta utente:', choiceResult.outcome);
                
                if (choiceResult.outcome === 'accepted') {
                    console.log('🎉 Utente ha accettato l\'installazione');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('App installata con successo!');
                    }
                    
                    // Nascondi il pulsante dopo l'installazione
                    installButton.style.display = 'none';
                } else {
                    console.log('❌ Utente ha rifiutato l\'installazione');
                    if (typeof Notifications !== 'undefined') {
                        Notifications.show('Installazione annullata', true);
                    }
                }
                
                // Pulisci la variabile
                deferredPrompt = null;
            });

            // Aggiungi il pulsante all'header
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(installButton);
            }
            
            console.log('✅ Pulsante installazione PWA aggiunto');
        };

        // Nascondi il pulsante se l'app è già installata
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

        // Controlla se l'app è già installata
        this.checkIfAppIsInstalled();
    },

    checkIfAppIsInstalled() {
        // Metodo 1: Controlla se è in modalità standalone
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('📱 App già installata (display-mode: standalone)');
            return true;
        }
        
        // Metodo 2: Controlla se è in fullscreen (iOS)
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
                Database.save();
                console.log('💾 Backup automatico eseguito');
            }
        }, 5 * 60 * 1000);
    }
};

// Gestione errori globale
window.addEventListener('error', function(e) {
    console.error('❌ Errore globale catturato:', e.error);
});

// Inizializza l'app quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => App.init(), 100);
    });
} else {
    setTimeout(() => App.init(), 100);
}

// Rendiamo App disponibile globalmente per debug
window.App = App;

console.log('📦 App.js caricato - in attesa di inizializzazione');