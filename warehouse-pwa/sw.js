// sw.js - Service Worker Ottimizzato per Gestione Magazzino - VERSIONE MIGLIORATA

const CACHE_NAME = 'magazzino-pwa-v5';
const APP_VERSION = '5.0.0';
const DATA_CACHE_NAME = 'magazzino-data-v2';

// Risorse essenziali da cacheare all'installazione
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/manifest.json',
    // CSS
    '/assets/styles/main.css',
    // JavaScript - Solo i file critici
    '/src/app.js',
    '/src/utils/constants.js',
    '/src/utils/helpers.js',
    '/src/utils/notifications.js',
    '/src/modules/database.js',
    '/src/modules/theme-manager.js',
    '/src/modules/history-manager.js',
    '/src/modules/sync-manager.js',
    '/src/modules/airtable-sync.js',
    '/src/modules/inventory-manager.js',
    '/src/modules/ui-manager.js',
    // Icone
    '/icon-192.png',
    '/icon-512.png'
];

// Risorse esterne da cacheare
const EXTERNAL_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Tipi di file da cacheare dinamicamente
const DYNAMIC_CACHE_PATTERNS = [
    /\.css$/,
    /\.js$/,
    /\.json$/,
    /\.png$/,
    /\.jpg$/,
    /\.svg$/
];

// URL da non cacheare (API dinamiche)
const NO_CACHE_URLS = [
    'airtable.com',
    '/api/'
];

console.log(`🚀 Service Worker v${APP_VERSION} caricato`);

// ===== INSTALLAZIONE =====
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installazione in corso...');
    
    event.waitUntil(
        (async () => {
            try {
                // Apri la cache per le risorse statiche
                const staticCache = await caches.open(CACHE_NAME);
                console.log('✅ Cache statica aperta');

                // Cachea le risorse statiche essenziali
                await staticCache.addAll(STATIC_RESOURCES);
                console.log(`✅ ${STATIC_RESOURCES.length} risorse statiche cacheate`);

                // Cachea le risorse esterne
                const externalCache = await caches.open('external-resources');
                await externalCache.addAll(EXTERNAL_RESOURCES);
                console.log(`✅ ${EXTERNAL_RESOURCES.length} risorse esterne cacheate`);

                // Attiva immediatamente il nuovo service worker
                await self.skipWaiting();
                console.log('✅ Service Worker attivato');

            } catch (error) {
                console.error('❌ Errore durante l\'installazione:', error);
            }
        })()
    );
});

// ===== ATTIVAZIONE =====
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: Attivazione in corso...');
    
    event.waitUntil(
        (async () => {
            try {
                // Elimina le cache vecchie
                const cacheKeys = await caches.keys();
                const deletePromises = cacheKeys.map(cacheName => {
                    if (cacheName !== CACHE_NAME && 
                        cacheName !== DATA_CACHE_NAME && 
                        cacheName !== 'external-resources') {
                        console.log(`🗑️ Eliminando cache vecchia: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                });
                
                await Promise.all(deletePromises);
                console.log('✅ Pulizia cache completata');

                // Prendi il controllo di tutte le pagine
                await self.clients.claim();
                console.log('✅ Service Worker ora controlla tutte le pagine');

                // Invia messaggio a tutte le pagine controllate
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        version: APP_VERSION,
                        timestamp: new Date().toISOString()
                    });
                });

            } catch (error) {
                console.error('❌ Errore durante l\'attivazione:', error);
            }
        })()
    );
});

// ===== GESTIONE RICHIESTE NETWORK =====
self.addEventListener('fetch', (event) => {
    // Salta le richieste non GET e le richieste estranee
    if (event.request.method !== 'GET') return;
    if (event.request.url.startsWith('chrome-extension://')) return;
    if (event.request.url.includes('chrome-extension')) return;

    // NUOVO: Gestione specifica per Airtable e API (Network Only)
    if (shouldBypassCache(event.request)) {
        event.respondWith(handleNoCacheRequest(event));
        return;
    }

    // Gestisce le richieste in modo diverso in base al tipo
    event.respondWith(
        (async () => {
            try {
                // Per le richieste di navigazione (pagine HTML)
                if (event.request.mode === 'navigate') {
                    return await handleNavigationRequest(event);
                }

                // Per le API e dati dinamici
                if (event.request.url.includes('/api/')) {
                    return await handleApiRequest(event);
                }

                // Per le risorse statiche (CSS, JS, immagini, etc.)
                return await handleStaticRequest(event);

            } catch (error) {
                console.error('❌ Errore nel fetch handler:', error);
                return createErrorResponse(error);
            }
        })()
    );
});

// ===== NUOVE FUNZIONI DI GESTIONE CACHE =====

// Determina se una richiesta dovrebbe bypassare la cache
function shouldBypassCache(request) {
    return NO_CACHE_URLS.some(url => request.url.includes(url));
}

// Gestione richieste che non devono essere cacheate (Airtable, API dinamiche)
async function handleNoCacheRequest(event) {
    try {
        // Solo richiesta di rete, nessuna cache
        const networkResponse = await fetch(event.request);
        
        if (!networkResponse.ok) {
            throw new Error(`HTTP error! status: ${networkResponse.status}`);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('❌ Errore richiesta no-cache:', error);
        
        // Per Airtable, ritorna una risposta di errore specifica
        if (event.request.url.includes('airtable.com')) {
            return new Response(
                JSON.stringify({
                    error: 'NetworkError',
                    message: 'Impossibile connettersi ad Airtable. Verifica la connessione.',
                    timestamp: new Date().toISOString(),
                    offline: true
                }),
                {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
        
        // Per altre API, ritorna errore generico
        return createErrorResponse(error);
    }
}

// ===== STRATEGIE DI CACHING =====

// Gestione richieste di navigazione (Network First)
async function handleNavigationRequest(event) {
    try {
        // Prima prova la rete
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
            // Se la rete funziona, aggiorna la cache
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
        }
    } catch (error) {
        console.log('🌐 Rete non disponibile per navigazione, uso cache');
    }

    // Fallback alla cache
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
        return cachedResponse;
    }

    // Fallback alla homepage
    return caches.match('/index.html');
}

// Gestione richieste API (Network First con cache di fallback)
async function handleApiRequest(event) {
    try {
        // Prima prova la rete per le API
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
            // Cachea la risposta API per uso offline
            const cache = await caches.open(DATA_CACHE_NAME);
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
        }
    } catch (error) {
        console.log('🌐 Rete non disponibile per API, uso cache dati');
    }

    // Fallback alla cache dei dati
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
        return cachedResponse;
    }

    // Ritorna una risposta di errore offline per le API
    return new Response(
        JSON.stringify({
            error: 'Offline',
            message: 'Connessione non disponibile',
            timestamp: new Date().toISOString(),
            offline: true
        }),
        {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}

// Gestione risorse statiche (Cache First)
async function handleStaticRequest(event) {
    // Prima controlla nella cache
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
        // Aggiorna la cache in background
        updateCacheInBackground(event.request);
        return cachedResponse;
    }

    // Se non in cache, prova la rete
    try {
        const networkResponse = await fetch(event.request);
        if (networkResponse.ok) {
            // Cachea la risposta per le prossime volte
            const shouldCache = DYNAMIC_CACHE_PATTERNS.some(pattern =>
                pattern.test(event.request.url)
            );

            if (shouldCache) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
        }
    } catch (error) {
        console.log('❌ Errore nel fetch risorsa statica:', error);
    }

    // Fallback per immagini
    if (event.request.destination === 'image') {
        return createImagePlaceholder();
    }

    // Fallback generico
    return new Response('Risorsa non disponibile offline', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
    });
}

// ===== FUNZIONI AUSILIARIE =====

// Aggiorna la cache in background
async function updateCacheInBackground(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse);
        }
    } catch (error) {
        // Silenzioso - non è critico se fallisce
    }
}

// Crea un placeholder per le immagini
function createImagePlaceholder() {
    const svg = `
        <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="#f0f0f0"/>
            <text x="50" y="50" font-family="Arial" font-size="10" text-anchor="middle"
                  dominant-baseline="middle" fill="#666">Immagine non disponibile offline</text>
        </svg>
    `;
    return new Response(svg, {
        headers: { 'Content-Type': 'image/svg+xml' }
    });
}

// Crea una risposta di errore
function createErrorResponse(error) {
    return new Response(
        JSON.stringify({
            error: 'Service Worker Error',
            message: error.message,
            timestamp: new Date().toISOString(),
            version: APP_VERSION
        }),
        {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}

// ===== GESTIONE MESSAGGI =====
self.addEventListener('message', (event) => {
    console.log('📨 Messaggio ricevuto:', event.data);
    
    switch (event.data.type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                version: APP_VERSION,
                cacheName: CACHE_NAME
            });
            break;
            
        case 'CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;
            
        case 'CLEAR_CACHE':
            clearCache().then(() => {
                event.ports[0].postMessage({ cleared: true });
            });
            break;
            
        case 'CHECK_SYNC':
            checkOnlineStatus().then(online => {
                event.ports[0].postMessage({ online });
            });
            break;
            
        default:
            console.log('ℹ️ Messaggio non riconosciuto:', event.data);
    }
});

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
    console.log('🔄 Background Sync attivato per:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Sincronizzazione in background
async function doBackgroundSync() {
    try {
        console.log('🔄 Inizio sincronizzazione background...');
        
        // Controlla se siamo online
        const online = await checkOnlineStatus();
        if (!online) {
            console.log('🌐 Offline - sincronizzazione rimandata');
            return;
        }
        
        // Qui puoi implementare la logica di sync
        // Esempio: sincronizzazione con Airtable quando la connessione ritorna
        const cache = await caches.open(DATA_CACHE_NAME);
        const pendingRequests = await cache.keys();
        console.log(`📦 ${pendingRequests.length} richieste in sospeso`);
        
        // Notifica tutte le pagine della sincronizzazione
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_STARTED',
                timestamp: new Date().toISOString()
            });
        });
        
        // Simula una sincronizzazione
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('✅ Sincronizzazione background completata');
        
        // Notifica completamento
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETED',
                timestamp: new Date().toISOString()
            });
        });
        
    } catch (error) {
        console.error('❌ Errore sincronizzazione background:', error);
    }
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        const options = {
            body: data.body || 'Nuova notifica dal sistema di magazzino',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/',
                timestamp: new Date().toISOString()
            },
            actions: [
                {
                    action: 'open',
                    title: 'Apri App',
                    icon: '/icon-192.png'
                },
                {
                    action: 'close',
                    title: 'Chiudi',
                    icon: '/icon-192.png'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(
                data.title || 'Gestione Magazzino',
                options
            )
        );
    } catch (error) {
        console.error('❌ Errore nella push notification:', error);
        
        // Notifica di fallback
        event.waitUntil(
            self.registration.showNotification('Gestione Magazzino', {
                body: 'Nuova notifica disponibile',
                icon: '/icon-192.png'
            })
        );
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open' || event.action === '') {
        event.waitUntil(
            self.clients.matchAll({ type: 'window' }).then((clientList) => {
                // Cerca un client già aperto
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Se non trovato, apri una nuova finestra
                if (self.clients.openWindow) {
                    return self.clients.openWindow(event.notification.data.url || '/');
                }
            })
        );
    }
});

// ===== UTILITY FUNCTIONS =====

// Ottieni lo stato della cache
async function getCacheStatus() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        const dataCache = await caches.open(DATA_CACHE_NAME);
        const dataKeys = await dataCache.keys();
        const externalCache = await caches.open('external-resources');
        const externalKeys = await externalCache.keys();

        return {
            version: APP_VERSION,
            staticCache: {
                name: CACHE_NAME,
                size: keys.length,
                resources: keys.map(req => req.url)
            },
            dataCache: {
                name: DATA_CACHE_NAME,
                size: dataKeys.length
            },
            externalCache: {
                name: 'external-resources',
                size: externalKeys.length
            },
            noCacheUrls: NO_CACHE_URLS,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { error: error.message };
    }
}

// Pulisci la cache
async function clearCache() {
    try {
        await caches.delete(CACHE_NAME);
        await caches.delete(DATA_CACHE_NAME);
        await caches.delete('external-resources');
        console.log('✅ Cache pulita completamente');
        return true;
    } catch (error) {
        console.error('❌ Errore nella pulizia cache:', error);
        return false;
    }
}

// Controlla lo stato della connessione
async function checkOnlineStatus() {
    try {
        // Prova a fare una richiesta HEAD a un endpoint affidabile
        const response = await fetch('/', { 
            method: 'HEAD', 
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// ===== GESTIONE OFFLINE =====
self.addEventListener('fetch', (event) => {
    // Intercetta le richieste di navigazione per fornire una pagina offline personalizzata
    if (event.request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    // Prima prova la rete
                    return await fetch(event.request);
                } catch (error) {
                    // Se siamo offline, ritorna la pagina cacheata
                    const cachedResponse = await caches.match('/index.html');
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // Fallback a una pagina offline generica
                    return new Response(
                        `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>App Magazzino - Offline</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                h1 { color: #666; }
                            </style>
                        </head>
                        <body>
                            <h1>📡 Sei offline</h1>
                            <p>L'applicazione Gestione Magazzino non è al momento disponibile senza connessione.</p>
                            <p>Verifica la tua connessione internet e riprova.</p>
                        </body>
                        </html>
                        `,
                        { 
                            headers: { 'Content-Type': 'text/html' } 
                        }
                    );
                }
            })()
        );
    }
});

console.log(`✅ Service Worker v${APP_VERSION} pronto e attivo`);