const CACHE_NAME = 'ai-detective-v1.5.0';
const urlsToCache = [
  '/mobile.html',
  '/index.html',
  '/static/css/style.css',
  '/static/js/app.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 安装 Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存已打开');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.log('缓存失败:', error);
      })
  );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有响应，直接返回
        if (response) {
          return response;
        }

        // 否则尝试从网络获取
        return fetch(event.request)
          .then(response => {
            // 检查是否是有效响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 克隆响应
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // 网络请求失败时，返回离线页面
            if (event.request.destination === 'document') {
              return caches.match('/mobile.html');
            }
          });
      })
  );
});

// 推送通知处理
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : '您有一个新的推理案件等待解决！',
    icon: '/manifest.json',
    badge: '/manifest.json',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '立即游戏',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: '稍后再说',
        icon: '/images/xmark.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('AI侦探推理游戏', options)
  );
});

// 通知点击处理
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    // 打开游戏页面
    event.waitUntil(
      clients.openWindow('/mobile.html')
    );
  } else if (event.action === 'close') {
    // 关闭通知
    event.notification.close();
  } else {
    // 默认行为
    event.waitUntil(
      clients.openWindow('/mobile.html')
    );
  }
});

// 后台同步
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  return new Promise((resolve, reject) => {
    // 这里可以添加后台同步逻辑
    // 比如同步游戏进度、更新案件数据等
    console.log('执行后台同步');
    resolve();
  });
}

// 更新提示
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 