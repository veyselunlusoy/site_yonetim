const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const cors = require('cors');
const path = require('path');
const { getDb } = require('./database');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore({
    db: process.env.SESSION_DB || 'sessions.sqlite',
    dir: process.env.SESSION_DIR || __dirname,
    table: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'binayonet-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware
const isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

const isUye = (req, res, next) => {
  if (req.session && req.session.role === 'uye') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// API: Auth
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  const db = await getDb();
  const setting = await db.get('SELECT value FROM settings WHERE key = ?', 'password');

  if (password === setting.value) {
    req.session.role = 'admin';
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Hatalı şifre' });
  }
});

app.post('/api/uye/login', async (req, res) => {
  const { no, password } = req.body;
  const db = await getDb();

  const daire = await db.get('SELECT id, no FROM daireler WHERE no = ? AND uyeSifre = ? AND durum = "aktif"', [no, password]);

  if (daire) {
    req.session.role = 'uye';
    req.session.daireId = daire.id;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Hatalı daire no veya şifre' });
  }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ role: req.session.role || null });
});

// API: Daireler
app.get('/api/daireler', isAdmin, async (req, res) => {
  const db = await getDb();
  const daireler = await db.all('SELECT * FROM daireler ORDER BY blokAd, no');
  res.json(daireler);
});

app.post('/api/daireler', isAdmin, async (req, res) => {
  const db = await getDb();
  const d = req.body;

  await db.run(`
    INSERT INTO daireler (id, no, blokId, blokAd, tip, kat, m2, evSahibiAd, evSahibiTel, kiraciAd, kiraciTel, aidat, durum, devirBorc, yoneticiMuaf, notlar, uyeSifre, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [d.id, d.no, d.blokId, d.blokAd, d.tip, d.kat, d.m2, d.evSahibiAd, d.evSahibiTel, d.kiraciAd, d.kiraciTel, d.aidat, d.durum, d.devirBorc, d.yoneticiMuaf ? 1 : 0, d.not, d.uyeSifre, new Date().toISOString(), new Date().toISOString()]);

  await logActivity(db, `Daire ${d.no} eklendi`, '🏠');
  res.json({ success: true });
});

app.put('/api/daireler/:id', isAdmin, async (req, res) => {
  const db = await getDb();
  const d = req.body;
  const id = req.params.id;

  await db.run(`
    UPDATE daireler SET 
      no=?, blokId=?, blokAd=?, tip=?, kat=?, m2=?, evSahibiAd=?, evSahibiTel=?, kiraciAd=?, kiraciTel=?, aidat=?, durum=?, devirBorc=?, yoneticiMuaf=?, notlar=?, uyeSifre=?, updatedAt=?
    WHERE id=?
  `, [d.no, d.blokId, d.blokAd, d.tip, d.kat, d.m2, d.evSahibiAd, d.evSahibiTel, d.kiraciAd, d.kiraciTel, d.aidat, d.durum, d.devirBorc, d.yoneticiMuaf ? 1 : 0, d.not, d.uyeSifre, new Date().toISOString(), id]);

  await logActivity(db, `Daire ${d.no} güncellendi`, '✏️');
  res.json({ success: true });
});

app.delete('/api/daireler/:id', isAdmin, async (req, res) => {
  const db = await getDb();
  const id = req.params.id;
  const daire = await db.get('SELECT no FROM daireler WHERE id = ?', id);
  if (daire) {
    await db.run('DELETE FROM daireler WHERE id = ?', id);
    await db.run('DELETE FROM aidatlar WHERE daireId = ?', id);
    await logActivity(db, `Daire ${daire.no} silindi`, '🗑️');
  }
  res.json({ success: true });
});

// API: Aidatlar
app.get('/api/aidatlar', isAdmin, async (req, res) => {
  const db = await getDb();
  const aidatlar = await db.all('SELECT * FROM aidatlar');
  res.json(aidatlar);
});

app.post('/api/aidatlar', isAdmin, async (req, res) => {
  const db = await getDb();
  const a = req.body; // { id, daireId, yil, ay, status, amount, date, odeme, note }

  const existing = await db.get('SELECT id FROM aidatlar WHERE daireId = ? AND yil = ? AND ay = ?', [a.daireId, a.yil, a.ay]);

  if (existing) {
    await db.run(`UPDATE aidatlar SET status=?, amount=?, date=?, odeme=?, note=? WHERE id=?`,
      [a.status, a.amount, a.date, a.odeme, a.note, existing.id]);
  } else {
    await db.run(`INSERT INTO aidatlar (id, daireId, yil, ay, status, amount, date, odeme, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.daireId, a.yil, a.ay, a.status, a.amount, a.date, a.odeme, a.note]);
  }

  await logActivity(db, `Aidat güncellendi: Daire ${a.daireId} - ${a.yil}/${a.ay}`, '💳');
  res.json({ success: true });
});

app.post('/api/aidatlar/bulk', isAdmin, async (req, res) => {
  const db = await getDb();
  const { daireIds, yil, ay, date, odeme } = req.body;

  for (const daireId of daireIds) {
    const daire = await db.get('SELECT aidat FROM daireler WHERE id = ?', daireId);
    if (!daire) continue;

    const existing = await db.get('SELECT id FROM aidatlar WHERE daireId = ? AND yil = ? AND ay = ?', [daireId, yil, ay]);
    if (!existing) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await db.run(`INSERT INTO aidatlar (id, daireId, yil, ay, status, amount, date, odeme, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, daireId, yil, ay, 'paid', daire.aidat, date, odeme, 'Toplu ödeme']);
    } else if (existing.status !== 'paid') {
      await db.run(`UPDATE aidatlar SET status=?, amount=?, date=?, odeme=?, note=? WHERE id=?`,
        ['paid', daire.aidat, date, odeme, 'Toplu ödeme', existing.id]);
    }
  }

  await logActivity(db, `Toplu aidat ödemesi: ${yil}/${ay}`, '⚡');
  res.json({ success: true });
});

// API: Giderler
app.get('/api/giderler', isAdmin, async (req, res) => {
  const db = await getDb();
  const giderler = await db.all('SELECT * FROM giderler ORDER BY tarih DESC');
  res.json(giderler);
});

app.post('/api/giderler', isAdmin, async (req, res) => {
  const db = await getDb();
  const g = req.body;
  await db.run(`INSERT INTO giderler (id, tarih, kategori, aciklama, tutar, odeme, fis, notlar, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [g.id, g.tarih, g.kategori, g.aciklama, g.tutar, g.odeme, g.fis, g.not, new Date().toISOString()]);
  await logActivity(db, `Gider eklendi: ${g.aciklama} - ${g.tutar}`, '💸');
  res.json({ success: true });
});

app.put('/api/giderler/:id', isAdmin, async (req, res) => {
  const db = await getDb();
  const g = req.body;
  const id = req.params.id;
  await db.run(`UPDATE giderler SET tarih=?, kategori=?, aciklama=?, tutar=?, odeme=?, fis=?, notlar=? WHERE id=?`,
    [g.tarih, g.kategori, g.aciklama, g.tutar, g.odeme, g.fis, g.not, id]);
  await logActivity(db, `Gider güncellendi: ${g.aciklama} - ${g.tutar}`, '✏️');
  res.json({ success: true });
});

app.delete('/api/giderler/:id', isAdmin, async (req, res) => {
  const db = await getDb();
  const id = req.params.id;
  await db.run('DELETE FROM giderler WHERE id = ?', id);
  await logActivity(db, `Gider silindi`, '🗑️');
  res.json({ success: true });
});

// API: Bloklar
app.get('/api/bloklar', isAdmin, async (req, res) => {
  const db = await getDb();
  const bloklar = await db.all('SELECT * FROM bloklar');
  res.json(bloklar);
});

app.post('/api/bloklar', isAdmin, async (req, res) => {
  const db = await getDb();
  const b = req.body;
  await db.run('INSERT INTO bloklar (id, ad, renk, aciklama) VALUES (?, ?, ?, ?)', [b.id, b.ad, b.renk, b.aciklama]);
  res.json({ success: true });
});

app.put('/api/bloklar/:id', isAdmin, async (req, res) => {
  const db = await getDb();
  const b = req.body;
  await db.run('UPDATE bloklar SET ad=?, renk=?, aciklama=? WHERE id=?', [b.ad, b.renk, b.aciklama, req.params.id]);
  await db.run('UPDATE daireler SET blokAd=? WHERE blokId=?', [b.ad, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/bloklar/:id', isAdmin, async (req, res) => {
  const db = await getDb();
  const id = req.params.id;
  await db.run('DELETE FROM bloklar WHERE id = ?', id);
  await db.run('UPDATE daireler SET blokId="", blokAd="" WHERE blokId=?', [id]);
  res.json({ success: true });
});

// API: Ayarlar
app.get('/api/ayarlar', async (req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT * FROM settings');
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  // Hide password from frontend
  delete settings.password;
  res.json(settings);
});

app.put('/api/ayarlar', isAdmin, async (req, res) => {
  const db = await getDb();
  const s = req.body;
  if (s.binaAdi !== undefined) await db.run('UPDATE settings SET value=? WHERE key=?', [s.binaAdi, 'binaAdi']);
  if (s.binaAdres !== undefined) await db.run('UPDATE settings SET value=? WHERE key=?', [s.binaAdres, 'binaAdres']);
  if (s.yoneticiDaire !== undefined) await db.run('UPDATE settings SET value=? WHERE key=?', [s.yoneticiDaire, 'yoneticiDaire']);
  if (s.aidatDefault !== undefined) await db.run('UPDATE settings SET value=? WHERE key=?', [s.aidatDefault, 'aidatDefault']);
  if (s.password !== undefined) await db.run('UPDATE settings SET value=? WHERE key=?', [s.password, 'password']);
  res.json({ success: true });
});

// API: Activity
app.get('/api/activity', isAdmin, async (req, res) => {
  const db = await getDb();
  const activity = await db.all('SELECT * FROM activity ORDER BY id DESC LIMIT 50');
  res.json(activity);
});

// API: UYE (Member Dashboard)
app.get('/api/uye/bilgiler', isUye, async (req, res) => {
  const db = await getDb();
  const daireId = req.session.daireId;

  const daire = await db.get('SELECT * FROM daireler WHERE id = ?', daireId);
  const aidatlar = await db.all('SELECT * FROM aidatlar WHERE daireId = ?', daireId);

  const settingRows = await db.all('SELECT * FROM settings');
  const settings = {};
  settingRows.forEach(r => settings[r.key] = r.value);

  const giderler = await db.all('SELECT * FROM giderler ORDER BY tarih DESC LIMIT 50');

  res.json({
    daire,
    aidatlar,
    settings: {
      binaAdi: settings.binaAdi,
      aidatDefault: settings.aidatDefault
    },
    giderler
  });
});

async function logActivity(db, text, icon) {
  await db.run('INSERT INTO activity (text, icon, time) VALUES (?, ?, ?)', [text, icon, new Date().toISOString()]);
  const count = await db.get('SELECT COUNT(*) as count FROM activity');
  if (count.count > 100) {
    await db.run('DELETE FROM activity WHERE id IN (SELECT id FROM activity ORDER BY id ASC LIMIT 50)');
  }
}

// Serves specific HTML
app.get('/uye', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'uye', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
