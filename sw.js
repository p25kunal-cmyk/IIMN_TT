const CACHE = 'timetable-v3';
const SHELL = ['/index.html', '/manifest.json'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(SHELL); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;

  // NEVER intercept Google/Apps Script requests — let them go directly
  // through the browser so Google's auth cookies work properly
  if(url.indexOf('google.com') !== -1 ||
     url.indexOf('googleapis.com') !== -1 ||
     url.indexOf('script.google') !== -1){
    return; // don't call e.respondWith() — browser handles it natively
  }

  // App shell — cache first
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        if(resp && resp.status === 200){
          var clone = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});
