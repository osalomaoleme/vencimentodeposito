const CACHE_NAME = "validade-cache-v3";
const API_CACHE_NAME = "validade-api-cache-v1";

const urlsToCache = [
  "./",
  "./index.html",
  "./login.html",
  "./index.js",
  "./login.js",

  "./manifest.json",
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
  "./logodeltap.png"
];

// Instalar Service Worker e cachear recursos
self.addEventListener("install", event => {
  console.log("Service Worker instalando...");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("Cacheando recursos...");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("Todos os recursos foram cacheados!");
        return self.skipWaiting();
      })
      .catch(error => {
        console.error("Erro ao cachear recursos:", error);
      })
  );
});

// Ativar Service Worker e limpar caches antigos
self.addEventListener("activate", event => {
  console.log("Service Worker ativando...");
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log("Removendo cache antigo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log("Service Worker ativado!");
      return self.clients.claim();
    })
  );
});

// Interceptar requisições
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          console.log("Servindo do cache:", request.url);
          return response;
        }
        console.log("Buscando na rede:", request.url);
        return fetch(request).then(fetchResponse => {
          if (fetchResponse && fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      }).catch(() => {
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
    );
  } else if (url.hostname === 'script.google.com') {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(API_CACHE_NAME).then(cache => {
            const headers = new Headers(responseClone.headers);
            headers.append('x-cache-timestamp', Date.now().toString());

            return responseClone.blob().then(body => {
              return cache.put(request, new Response(body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: headers
              }));
            });
          });
        }
        return response;
      }).catch(() => {
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            const timestamp = cachedResponse.headers.get('x-cache-timestamp');
            if (timestamp) {
              const cacheTime = parseInt(timestamp);
              const now = Date.now();
              const cacheAge = (now - cacheTime) / (1000 * 60 * 60);
              if (cacheAge < 24) {
                console.log("Offline: usando dados em cache para:", request.url);
                return cachedResponse;
              } else {
                console.log("Cache expirado para:", request.url);
              }
            } else {
              return cachedResponse;
            }
          }

          return new Response(JSON.stringify({
            status: "Erro",
            mensagem: "Sem conexão com a internet. Verifique sua conexão e tente novamente."
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
  } else {
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request);
      })
    );
  }
});

// Notificações push (se implementar no futuro)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: './icon-192x192.png',
      badge: './icon-72x72.png'
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});
