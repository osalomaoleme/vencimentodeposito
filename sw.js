const CACHE_NAME = "validade-cache-v3";
const API_CACHE_NAME = "validade-api-cache-v1";
const urlsToCache = [
  // Páginas principais
  "./",
  "./index.html",
  "./login.html",
  
  // Scripts
  "./index.js",
  "./login.js",
  "./db.js",
  
  // Manifest e ícones
  "./manifest.json",
  
  // Bibliotecas externas (CDN)
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
  
  // Imagens (se tiver)
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
        return self.skipWaiting(); // Ativa imediatamente
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
      return self.clients.claim(); // Controla todas as abas abertas
    })
  );
});

// Interceptar requisições
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Estratégias diferentes por tipo de requisição
  if (url.origin === location.origin) {
    // Recursos locais: Cache first
    event.respondWith(
      caches.match(request).then(response => {
        if (response) {
          console.log("Servindo do cache:", request.url);
          return response;
        }
        console.log("Buscando na rede:", request.url);
        return fetch(request).then(fetchResponse => {
          // Cachear novos recursos automaticamente
          if (fetchResponse && fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        });
      }).catch(() => {
        // Se offline e não tem no cache, mostrar página offline
        if (request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
    );
  } else if (url.hostname === 'script.google.com') {
    // Google Apps Script: Network first com melhor estratégia de cache
    event.respondWith(
      fetch(request).then(response => {
        // Cachear responses do GAS com tempo de expiração mais longo
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(API_CACHE_NAME).then(cache => {
            // Adicionar timestamp ao cabeçalho para controle de expiração
            const headers = new Headers(responseClone.headers);
            headers.append('x-cache-timestamp', Date.now().toString());
            
            // Criar nova resposta com headers modificados
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
        // Se offline, tentar cache (dados desatualizados)
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            // Verificar se o cache não está muito antigo (24 horas)
            const timestamp = cachedResponse.headers.get('x-cache-timestamp');
            if (timestamp) {
              const cacheTime = parseInt(timestamp);
              const now = Date.now();
              const cacheAge = (now - cacheTime) / (1000 * 60 * 60); // em horas
              
              if (cacheAge < 24) {
                console.log("Offline: usando dados em cache para:", request.url);
                return cachedResponse;
              } else {
                console.log("Cache expirado para:", request.url);
              }
            } else {
              // Se não tem timestamp, usar cache de qualquer forma
              return cachedResponse;
            }
          }
          
          // Se não tem cache ou está expirado, retornar erro offline
          return new Response(JSON.stringify({
            status: "Erro",
            mensagem: "Sem conexão com a internet. Os dados serão salvos localmente e sincronizados quando estiver online."
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
  } else {
    // Outros recursos externos: Cache first
    event.respondWith(
      caches.match(request).then(response => {
        return response || fetch(request);
      })
    );
  }
});

// Sincronização em background (quando voltar online)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-registros') {
    console.log("Sincronização em background iniciada");
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        if (clients && clients.length) {
          // Enviar mensagem para o cliente ativo sincronizar os dados
          clients.forEach(client => {
            client.postMessage({
              type: 'sync-registros',
              message: 'Sincronizando registros pendentes...'
            });
          });
        }
      })
    );
  }
});

// Escutar mensagens dos clientes
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'register-sync') {
    // Registrar sincronização em background quando solicitado
    self.registration.sync.register('sync-registros')
      .then(() => {
        console.log('Sincronização em background registrada');
      })
      .catch(err => {
        console.error('Erro ao registrar sincronização:', err);
      });
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
