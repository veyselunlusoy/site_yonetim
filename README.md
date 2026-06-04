# site_yonetim

Bu proje Node.js, Express ve SQLite kullanarak apartman/aidat yönetimi sağlar.

## Local çalıştırma

1. Proje dizinine git:
   ```bash
   cd c:\Users\162339\OneDrive\VsCode\site_yonetim
   ```
2. Bağımlılıkları yükle:
   ```bash
   npm install
   ```
3. Sunucuyu başlat:
   ```bash
   npm start
   ```

## Geliştirme

Canlı yeniden yükleme istersen `nodemon` kurabilir veya `npm run dev` komutunu kullanabilirsiniz.

## Ortam değişkenleri

Aşağıdaki değişkenler desteklenir:

- `PORT` — sunucu portu (varsayılan `3000` değil; bunu `server.js` içinde ayarlayabilirsiniz)
- `DB_PATH` — SQLite veritabanı dosyası yolu, varsayılan `./binayonet.db`
- `SESSION_DB` — oturum veritabanı adı, varsayılan `sessions.sqlite`
- `SESSION_DIR` — oturum dosyalarının saklanacağı dizin, varsayılan proje kökü
- `SESSION_SECRET` — oturum gizli anahtarı
