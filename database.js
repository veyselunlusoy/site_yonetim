const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function getDb() {
  const dbPath = process.env.DB_PATH || './binayonet.db';
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS bloklar (
      id TEXT PRIMARY KEY,
      ad TEXT,
      renk TEXT,
      aciklama TEXT
    );

    CREATE TABLE IF NOT EXISTS daireler (
      id TEXT PRIMARY KEY,
      no TEXT,
      blokId TEXT,
      blokAd TEXT,
      tip TEXT,
      kat TEXT,
      m2 TEXT,
      evSahibiAd TEXT,
      evSahibiTel TEXT,
      evSahibiTC TEXT,
      kiraciAd TEXT,
      kiraciTel TEXT,
      aidat REAL,
      durum TEXT,
      devirBorc REAL,
      yoneticiMuaf INTEGER,
      notlar TEXT,
      uyeSifre TEXT,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS aidatlar (
      id TEXT PRIMARY KEY,
      daireId TEXT,
      yil INTEGER,
      ay INTEGER,
      status TEXT,
      amount REAL,
      date TEXT,
      odeme TEXT,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS giderler (
      id TEXT PRIMARY KEY,
      tarih TEXT,
      kategori TEXT,
      aciklama TEXT,
      tutar REAL,
      odeme TEXT,
      fis TEXT,
      notlar TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS uyeler (
      id TEXT PRIMARY KEY,
      daireId TEXT,
      username TEXT,
      email TEXT,
      passwordHash TEXT,
      aktif INTEGER DEFAULT 0,
      createdAt TEXT,
      updatedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT,
      icon TEXT,
      time TEXT
    );
  `);

  // Run migrations for new columns
  try { await db.exec(`ALTER TABLE daireler ADD COLUMN evSahibiTC TEXT`); } catch(e) {}
  try { await db.exec(`ALTER TABLE uyeler ADD COLUMN aktif INTEGER DEFAULT 0`); } catch(e) {}

  // Initialize default settings if not exists
  const hasSettings = await db.get('SELECT * FROM settings WHERE key = ?', 'binaAdi');
  if (!hasSettings) {
    const defaultSettings = {
      binaAdi: 'Apartmanım',
      binaAdres: '',
      yoneticiDaire: '',
      aidatDefault: 500,
      password: '1234'
    };
    for (const [key, value] of Object.entries(defaultSettings)) {
      await db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value.toString()]);
    }
  }

  return db;
}

module.exports = { getDb };
