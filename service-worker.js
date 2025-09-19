const CACHE_VERSION = "troop-tools-v6";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Static assets to precache
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./styles.css",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-192-maskable.png",
  "./icon-256.png",
  "./icon-384.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./screenshot-desktop.png",
  "./screenshot-mobile.png",
  "./troop_swap_calculator.html",
  "./battle_results.html",
  "./control_point.html",
  "./known_enemies.html",
  "./404.html"
];

// Cache strategies
const CACHE_STRATEGIES = {
  // HTML pages - Network First with fallback
  HTML: {
    strategy: 'networkFirst',
    cacheName: DYNAMIC_CACHE,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 50
  },
  // Static assets - Cache First
  STATIC: {
    strategy: 'cacheFirst',
    cacheName: STATIC_CACHE,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxEntries: 100
  },
  // Images - Cache First with size limit
  IMAGES: {
    strategy: 'cacheFirst',
    cacheName: IMAGE_CACHE,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    maxEntries: 50
  },
  // API calls - Network First
  API: {
    strategy: 'networkFirst',
    cacheName: DYNAMIC_CACHE,
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 20
  }
};

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Precaching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets precached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Failed to precache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('troop-tools-') && 
              !cacheName.includes(CACHE_VERSION)
            )
            .map(cacheName => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Only handle same-origin requests for security
  if (url.origin !== location.origin) {
    return;
  }

  // Skip opaque requests (CORS, etc.)
  if (request.mode === 'no-cors') {
    return;
  }

  // Determine cache strategy based on request type
  const strategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
      .catch(error => {
        console.error('Fetch failed:', error);
        return handleOfflineFallback(request);
      })
  );
});

// Determine cache strategy for request
function getCacheStrategy(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // HTML pages
  if (request.mode === 'navigate' || pathname.endsWith('.html')) {
    return CACHE_STRATEGIES.HTML;
  }

  // Images
  if (pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    return CACHE_STRATEGIES.IMAGES;
  }

  // Static assets (JS, CSS, manifest, etc.)
  if (pathname.match(/\.(js|css|json|webmanifest|woff|woff2|ttf|eot)$/i)) {
    return CACHE_STRATEGIES.STATIC;
  }

  // API calls
  if (pathname.includes('/api/') || url.searchParams.has('api')) {
    return CACHE_STRATEGIES.API;
  }

  // Default to network first
  return CACHE_STRATEGIES.HTML;
}

// Handle request based on strategy
async function handleRequest(request, strategy) {
  const cacheName = strategy.cacheName;
  const cache = await caches.open(cacheName);

  switch (strategy.strategy) {
    case 'cacheFirst':
      return cacheFirst(request, cache, strategy);
    case 'networkFirst':
      return networkFirst(request, cache, strategy);
    default:
      return fetch(request);
  }
}

// Cache First strategy
async function cacheFirst(request, cache, strategy) {
  const cached = await cache.match(request);
  
  if (cached) {
    // Check if cache is still valid
    const cacheTime = cached.headers.get('sw-cache-time');
    if (cacheTime && Date.now() - parseInt(cacheTime) < strategy.maxAge) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Clone response and add cache timestamp
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(request, cachedResponse);
      await cleanupCache(cache, strategy);
    }
    
    return response;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Network First strategy
async function networkFirst(request, cache, strategy) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Clone response and add cache timestamp
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(request, cachedResponse);
      await cleanupCache(cache, strategy);
    }
    
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Clean up old cache entries
async function cleanupCache(cache, strategy) {
  const keys = await cache.keys();
  
  if (keys.length > strategy.maxEntries) {
    // Sort by cache time and remove oldest entries
    const entries = await Promise.all(
      keys.map(async key => {
        const response = await cache.match(key);
        const cacheTime = response.headers.get('sw-cache-time') || '0';
        return { key, cacheTime: parseInt(cacheTime) };
      })
    );
    
    entries.sort((a, b) => a.cacheTime - b.cacheTime);
    
    const toDelete = entries.slice(0, entries.length - strategy.maxEntries);
    await Promise.all(toDelete.map(entry => cache.delete(entry.key)));
  }
}

// Handle offline fallback
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // For navigation requests, return offline page
  if (request.mode === 'navigate') {
    const offlinePage = await caches.match('./404.html');
    if (offlinePage) {
      return offlinePage;
    }
  }
  
  // For other requests, return a generic offline response
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'This resource is not available offline',
      url: request.url
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('Performing background sync...');
  // Implement background sync logic here
  // For example, sync offline data when connection is restored
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Open App',
          icon: './icon-192.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: './icon-192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
