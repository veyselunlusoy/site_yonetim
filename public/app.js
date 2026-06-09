// ═══════════════════════════════════════════════════════════════
// STATE & CONSTANTS
// ═══════════════════════════════════════════════════════════════
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const KATEGORI_ICONS = { Elektrik: '⚡', Su: '💧', Doğalgaz: '🔥', Temizlik: '🧹', Asansör: '🛗', Bakım: '🔧', Bahçe: '🌿', Diğer: '📦' };
const BLOK_RENKLER = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

let db = {
  settings: {
    binaAdi: 'Apartmanım',
    binaAdres: '',
    yoneticiDaire: '',
    aidatDefault: 500,
    bloklar: []
  },
  daireler: [],
  aidatlar: {},
  giderler: [],
  activity: []
};

let selectedYear = new Date().getFullYear();
let selectedAidatYear = new Date().getFullYear();
let selectedUyelerYear = new Date().getFullYear();
let selectedGiderYear = new Date().getFullYear();
let selectedKasaYear = new Date().getFullYear();
let selectedBorcYear = new Date().getFullYear();
let currentRaporTab = 'ozet';
let tempAidatEdit = null;

// ═══════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════
async function loadDb() {
  try {
    const authRes = await fetch('/api/auth/check');
    const auth = await authRes.json();

    if (auth.role === 'admin') {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').classList.add('visible');
    } else if (auth.role === 'uye') {
      // If uye visits this page, redirect to /uye
      window.location.href = '/uye';
      return;
    } else {
      document.getElementById('app').classList.remove('visible');
      document.getElementById('loginScreen').style.display = 'flex';
      return;
    }

    const [daireler, aidatlar, giderler, activity, ayarlar, bloklar, uyeler] = await Promise.all([
      fetch('/api/daireler').then(r => r.json()),
      fetch('/api/aidatlar').then(r => r.json()),
      fetch('/api/giderler').then(r => r.json()),
      fetch('/api/activity').then(r => r.json()),
      fetch('/api/ayarlar').then(r => r.json()),
      fetch('/api/bloklar').then(r => r.json()),
      fetch('/api/uye/accounts').then(r => r.json())
    ]);

    db.daireler = daireler || [];
    db.aidatlar = {};
    (aidatlar || []).forEach(a => {
      db.aidatlar[`${a.daireId}-${a.yil}-${a.ay}`] = a;
    });
    db.giderler = giderler || [];
    db.activity = activity || [];
    db.settings = { ...db.settings, ...ayarlar };
    db.settings.bloklar = bloklar || [];
    db.uyeler = uyeler || [];

    initApp();
  } catch (err) {
    console.error('Error loading data:', err);
    showToast('Veriler yüklenirken hata oluştu.', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════
async function doLogin() {
  const pwd = document.getElementById('loginPassword').value;
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    const data = await res.json();

    if (data.success) {
      loadDb();
    } else {
      document.getElementById('loginError').style.display = 'block';
      document.getElementById('loginPassword').value = '';
    }
  } catch (err) {
    console.error(err);
  }
}

async function doLogout() {
  await fetch('/api/logout');
  document.getElementById('app').classList.remove('visible');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
// APP INIT
// ═══════════════════════════════════════════════════════════════
function initApp() {
  updateTopbar();
  renderDashboard();
  loadSettingsForm();
  initMonthFilter();
  populateBlokFilters();
  renderUyeler();
  document.getElementById('topDate').textContent = new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function updateTopbar() {
  document.getElementById('topBuildingName').textContent = db.settings.binaAdi || '—';
}

function initMonthFilter() {
  const sel = document.getElementById('aidatMonthFilter');
  sel.innerHTML = '<option value="">Tüm Aylar (Özet)</option>';
  MONTHS.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = m;
    sel.appendChild(opt);
  });
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (document.getElementById('app').classList.contains('sidebar-open')) {
    toggleSidebar();
  }
  // Render page
  if (name === 'dashboard') renderDashboard();
  else if (name === 'daireler') renderDaireler();
  else if (name === 'uyeler') renderUyeler();
  else if (name === 'aidat') renderAidat();
  else if (name === 'giderler') renderGiderler();
  else if (name === 'kasa') renderKasa();
  else if (name === 'borclar') renderBorclar();
  else if (name === 'raporlar') renderRapor(currentRaporTab);
  else if (name === 'ayarlar') loadSettingsForm();
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function changeYear(d) {
  selectedYear += d;
  document.getElementById('dashYear').textContent = selectedYear;
  renderDashboard();
}

function renderDashboard() {
  document.getElementById('dashYear').textContent = selectedYear;
  const year = selectedYear;
  const activeDaireler = db.daireler.filter(d => d.durum === 'aktif');

  let totalAidat = 0, collectedAidat = 0, totalGider = 0;
  let unpaidCount = 0, paidCount = 0;

  activeDaireler.forEach(d => {
    MONTHS.forEach((m, mi) => {
      const key = `${d.id}-${year}-${mi}`;
      const entry = db.aidatlar[key];
      const amt = d.aidat || db.settings.aidatDefault || 0;
      if (d.yoneticiMuaf) return;
      totalAidat += amt;
      if (entry && entry.status === 'paid') {
        collectedAidat += (entry.amount || amt);
        paidCount++;
      } else if (!entry || entry.status === 'unpaid') {
        unpaidCount++;
      }
    });
  });

  db.giderler.forEach(g => {
    if (new Date(g.tarih).getFullYear() === year) totalGider += parseFloat(g.tutar || 0);
  });

  const kasa = collectedAidat - totalGider;

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card green">
      <div class="stat-icon">💳</div>
      <div class="stat-label">Toplanan Aidat</div>
      <div class="stat-value green">${fmtMoney(collectedAidat)}</div>
      <div class="stat-sub">${year} yılı toplam</div>
    </div>
    <div class="stat-card red">
      <div class="stat-icon">💸</div>
      <div class="stat-label">Toplam Gider</div>
      <div class="stat-value red">${fmtMoney(totalGider)}</div>
      <div class="stat-sub">${year} yılı toplam</div>
    </div>
    <div class="stat-card ${kasa >= 0 ? 'green' : 'red'}">
      <div class="stat-icon">🏦</div>
      <div class="stat-label">Kasa Bakiyesi</div>
      <div class="stat-value ${kasa >= 0 ? 'green' : 'red'}">${fmtMoney(kasa)}</div>
      <div class="stat-sub">Gelir - Gider</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🏠</div>
      <div class="stat-label">Aktif Daire</div>
      <div class="stat-value">${activeDaireler.length}</div>
      <div class="stat-sub">${db.daireler.length} toplam kayıt</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon">✅</div>
      <div class="stat-label">Ödendi</div>
      <div class="stat-value green">${paidCount}</div>
      <div class="stat-sub">aidat kaydı</div>
    </div>
    <div class="stat-card red">
      <div class="stat-icon">⚠️</div>
      <div class="stat-label">Ödenmedi</div>
      <div class="stat-value red">${unpaidCount}</div>
      <div class="stat-sub">aidat kaydı</div>
    </div>
  `;

  const monthlyData = MONTHS.map((m, mi) => {
    let income = 0, expense = 0;
    activeDaireler.forEach(d => {
      const key = `${d.id}-${year}-${mi}`;
      const entry = db.aidatlar[key];
      if (entry && entry.status === 'paid') income += parseFloat(entry.amount || d.aidat || db.settings.aidatDefault || 0);
    });
    db.giderler.forEach(g => {
      const d = new Date(g.tarih);
      if (d.getFullYear() === year && d.getMonth() === mi) expense += parseFloat(g.tutar || 0);
    });
    return { m, income, expense };
  });
  const maxVal = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1);

  document.getElementById('dashCharts').innerHTML = `
    <div class="card">
      <div class="card-title">📈 Aylık Aidat Geliri</div>
      <div class="mini-chart" style="height:80px;align-items:flex-end;margin-top:8px;">
        ${monthlyData.map(d => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div class="chart-bar green" style="height:${Math.round((d.income / maxVal) * 70)}px;width:100%;"></div>
            <span style="font-size:9px;color:var(--text-muted)">${MONTHS_SHORT[monthlyData.indexOf(d)]}</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">📉 Aylık Gider</div>
      <div class="mini-chart" style="height:80px;align-items:flex-end;margin-top:8px;">
        ${monthlyData.map(d => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
            <div class="chart-bar red" style="height:${Math.round((d.expense / maxVal) * 70)}px;width:100%;"></div>
            <span style="font-size:9px;color:var(--text-muted)">${MONTHS_SHORT[monthlyData.indexOf(d)]}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  const actEl = document.getElementById('recentActivity');
  if (db.activity.length === 0) {
    actEl.innerHTML = '<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">📭</div><p>Henüz işlem yok</p></div>';
  } else {
    actEl.innerHTML = db.activity.slice(0, 10).map(a => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-light);">
        <span style="font-size:18px;">${a.icon}</span>
        <div style="flex:1;">
          <div style="font-size:13px;">${a.text}</div>
          <div style="font-size:11px;color:var(--text-muted);">${new Date(a.time).toLocaleString('tr-TR')}</div>
        </div>
      </div>
    `).join('');
  }
}

// ═══════════════════════════════════════════════════════════════
// DAİRELER
// ═══════════════════════════════════════════════════════════════
function openDaireModal(id = null) {
  const blokSel = document.getElementById('daireBlok');
  blokSel.innerHTML = '<option value="">— Blok Yok —</option>';
  (db.settings.bloklar || []).forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id; opt.textContent = b.ad;
    blokSel.appendChild(opt);
  });

  document.getElementById('daireId').value = '';
  document.getElementById('daireNo').value = '';
  document.getElementById('daireBlok').value = '';
  document.getElementById('daireTip').value = 'daire';
  document.getElementById('daireKat').value = '';
  document.getElementById('daireM2').value = '';
  document.getElementById('evSahibiAd').value = '';
  document.getElementById('evSahibiTel').value = '';
  document.getElementById('evSahibiTC').value = '';
  document.getElementById('kiraciAd').value = '';
  document.getElementById('kiraciTel').value = '';
  document.getElementById('daireAidat').value = db.settings.aidatDefault || '';
  document.getElementById('daireDurum').value = 'aktif';
  document.getElementById('devirBorc').value = '0';
  document.getElementById('yoneticiMuaf').checked = false;
  document.getElementById('daireNot').value = '';

  if (id) {
    const d = db.daireler.find(x => x.id === id);
    if (!d) return;
    document.getElementById('daireModalTitle').textContent = '✏️ Daire Düzenle';
    document.getElementById('daireId').value = d.id;
    document.getElementById('daireNo').value = d.no || '';
    document.getElementById('daireBlok').value = d.blokId || '';
    document.getElementById('daireTip').value = d.tip || 'daire';
    document.getElementById('daireKat').value = d.kat || '';
    document.getElementById('daireM2').value = d.m2 || '';
    document.getElementById('evSahibiAd').value = d.evSahibiAd || '';
    document.getElementById('evSahibiTel').value = d.evSahibiTel || '';
    document.getElementById('evSahibiTC').value = d.evSahibiTC || '';
    document.getElementById('kiraciAd').value = d.kiraciAd || '';
    document.getElementById('kiraciTel').value = d.kiraciTel || '';
    document.getElementById('daireAidat').value = d.aidat || '';
    document.getElementById('daireDurum').value = d.durum || 'aktif';
    document.getElementById('devirBorc').value = d.devirBorc || '0';
    document.getElementById('yoneticiMuaf').checked = d.yoneticiMuaf || false;
    document.getElementById('daireNot').value = d.not || '';
  } else {
    document.getElementById('daireModalTitle').textContent = '🏠 Yeni Daire Ekle';
  }
  openModal('daireModal');
}

async function saveDaire() {
  const no = document.getElementById('daireNo').value.trim();
  if (!no) { showToast('Daire no zorunludur!', 'error'); return; }

  const id = document.getElementById('daireId').value || genId();
  const isEdit = !!document.getElementById('daireId').value;

  const blokId = document.getElementById('daireBlok').value;
  const blok = (db.settings.bloklar || []).find(b => b.id === blokId);
  const daire = {
    id, no,
    blokId: blokId || '',
    blokAd: blok ? blok.ad : '',
    tip: document.getElementById('daireTip').value,
    kat: document.getElementById('daireKat').value,
    m2: document.getElementById('daireM2').value,
    evSahibiAd: document.getElementById('evSahibiAd').value,
    evSahibiTel: document.getElementById('evSahibiTel').value,
    evSahibiTC: document.getElementById('evSahibiTC').value,
    kiraciAd: document.getElementById('kiraciAd').value,
    kiraciTel: document.getElementById('kiraciTel').value,
    aidat: parseFloat(document.getElementById('daireAidat').value) || db.settings.aidatDefault || 0,
    durum: document.getElementById('daireDurum').value,
    devirBorc: parseFloat(document.getElementById('devirBorc').value) || 0,
    yoneticiMuaf: document.getElementById('yoneticiMuaf').checked,
    not: document.getElementById('daireNot').value,
    uyeSifre: ''
  };

  try {
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/daireler/${id}` : '/api/daireler';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(daire)
    });
    await loadDb();
    closeModal('daireModal');
    if (document.getElementById('page-daireler').classList.contains('active')) renderDaireler();
    showToast(isEdit ? 'Daire güncellendi!' : 'Daire eklendi!', 'success');
  } catch (e) {
    showToast('Hata oluştu', 'error');
  }
}

async function deleteDaire(id) {
  const d = db.daireler.find(x => x.id === id);
  confirmAction(`"${d.no}" numaralı daire silinecek. Emin misiniz?`, async () => {
    try {
      await fetch(`/api/daireler/${id}`, { method: 'DELETE' });
      await loadDb();
      if (document.getElementById('page-daireler').classList.contains('active')) renderDaireler();
      showToast('Daire silindi.', 'warning');
    } catch (e) {
      showToast('Silinirken hata oluştu', 'error');
    }
  });
}

function getUyeAccount(daireId) {
  return db.uyeler.find(u => u.daireId === daireId);
}

function openUyeKayitModal(daireId) {
  // Formu temizle
  document.getElementById('uyeKayitError').style.display = 'none';
  document.getElementById('uyeKayitTC').value = '';
  document.getElementById('uyeKayitEmail').value = '';
  document.getElementById('uyeKayitSifre').value = '';
  document.getElementById('uyeKayitSifreTekrar').value = '';
  document.getElementById('uyeKayitAktif').checked = true;

  // Daire listesini doldur
  const select = document.getElementById('uyeKayitDaire');
  select.innerHTML = '<option value="">— Daire seçin —</option>';
  db.daireler.filter(d => d.durum === 'aktif').forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `Daire ${d.no}${d.evSahibiAd ? ' — ' + d.evSahibiAd : ''}`;
    select.appendChild(opt);
  });

  if (daireId) {
    select.value = daireId;
    // Mevcut hesap varsa bilgileri doldur
    const account = getUyeAccount(daireId);
    if (account) {
      document.getElementById('uyeKayitTC').value = account.username || '';
      document.getElementById('uyeKayitEmail').value = account.email || '';
      document.getElementById('uyeKayitAktif').checked = account.aktif === 1 || account.aktif === '1';
      document.getElementById('uyeKayitModalTitle').textContent = '✏️ Üye Hesabı Düzenle';
    } else {
      document.getElementById('uyeKayitModalTitle').textContent = '👤 Yeni Üye Hesabı';
    }
  } else {
    document.getElementById('uyeKayitModalTitle').textContent = '👤 Yeni Üye Hesabı';
  }

  openModal('uyeKayitModal');
}

async function saveUyeKayit() {
  const errEl = document.getElementById('uyeKayitError');
  errEl.style.display = 'none';

  const daireId = document.getElementById('uyeKayitDaire').value;
  const tc = document.getElementById('uyeKayitTC').value.trim();
  const email = document.getElementById('uyeKayitEmail').value.trim();
  const sifre = document.getElementById('uyeKayitSifre').value;
  const sifreTekrar = document.getElementById('uyeKayitSifreTekrar').value;
  const aktif = document.getElementById('uyeKayitAktif').checked ? 1 : 0;

  if (!daireId) { errEl.textContent = 'Lütfen bir daire seçin.'; errEl.style.display = 'block'; return; }
  if (!tc || tc.replace(/\D/g,'').length !== 11) { errEl.textContent = 'TC Kimlik No 11 hane olmalıdır.'; errEl.style.display = 'block'; return; }

  const account = getUyeAccount(daireId);
  const isEdit = !!account;

  if (!isEdit && (!sifre || sifre.length < 4)) {
    errEl.textContent = 'Şifre en az 4 karakter olmalıdır.'; errEl.style.display = 'block'; return;
  }
  if (sifre && sifre !== sifreTekrar) {
    errEl.textContent = 'Şifreler eşleşmiyor.'; errEl.style.display = 'block'; return;
  }

  try {
    let res;
    if (isEdit) {
      // Güncelle
      const body = { username: tc.replace(/\D/g,''), email, aktif };
      if (sifre) body.password = sifre;
      res = await fetch(`/api/uye/account/${daireId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      // Yeni hesap oluştur
      res = await fetch(`/api/uye/account/${daireId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tc.replace(/\D/g,''), email, password: sifre, aktif })
      });
    }
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Hata oluştu.'; errEl.style.display = 'block'; return; }

    closeModal('uyeKayitModal');
    await loadDb();
    if (document.getElementById('page-uyeler').classList.contains('active')) renderUyeler();
    showToast(isEdit ? 'Üye hesabı güncellendi.' : 'Üye hesabı oluşturuldu.', 'success');
  } catch (e) {
    errEl.textContent = e.message || 'Hata oluştu.'; errEl.style.display = 'block';
  }
}

async function toggleUyeAktif(uyeId, aktif) {
  try {
    const res = await fetch(`/api/uye/activate/${uyeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktif })
    });
    if (!res.ok) throw new Error('Hata oluştu');
    await loadDb();
    if (document.getElementById('page-uyeler').classList.contains('active')) renderUyeler();
    showToast(aktif ? 'Üye hesabı onaylandı.' : 'Üye hesabı pasife alındı.', 'success');
  } catch (e) {
    showToast(e.message || 'Hata oluştu.', 'error');
  }
}

function openGecmis(id) {
  // SQLite version doesn't maintain history array yet, so just show info.
  const d = db.daireler.find(x => x.id === id);
  if (!d) return;
  let html = `<h3 style="margin-bottom:12px;">🏠 Daire ${d.no} - Geçmiş Kayıtlar</h3>`;
  html += '<div class="empty-state"><div class="empty-state-icon">📭</div><p>Geçmiş kayıtlar veritabanı sürümünde desteklenmemektedir.</p></div>';
  document.getElementById('gecmisContent').innerHTML = html;
  openModal('gecmisModal');
}

function renderDaireler() {
  const search = (document.getElementById('daireSearch')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('daireTypeFilter')?.value || '';
  const blokFilter = document.getElementById('daireBlokFilter')?.value || '';

  let list = db.daireler.filter(d => {
    const match = (d.no + ' ' + (d.evSahibiAd || '') + ' ' + (d.kiraciAd || '')).toLowerCase().includes(search);
    const typeMatch = !typeFilter || d.tip === typeFilter;
    const blokMatch = !blokFilter || d.blokId === blokFilter;
    return match && typeMatch && blokMatch;
  }).sort((a, b) => {
    const ba = a.blokAd || '';
    const bb = b.blokAd || '';
    if (ba !== bb) return ba > bb ? 1 : -1;
    const na = isNaN(a.no) ? a.no : +a.no;
    const nb = isNaN(b.no) ? b.no : +b.no;
    return na > nb ? 1 : -1;
  });

  const tbody = document.getElementById('dairelerBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🏚️</div><p>Kayıtlı daire bulunamadı.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(d => {
    const person = d.kiraciAd || d.evSahibiAd || '—';
    const tel = d.kiraciTel || d.evSahibiTel || '—';
    const durumBadge = d.durum === 'aktif' ? `<span class="badge badge-green">✅ Aktif</span>` :
      d.durum === 'bos' ? `<span class="badge badge-blue">🔵 Boş</span>` :
        `<span class="badge badge-gray">⛔ Pasif</span>`;
    const tipBadge = d.tip === 'isyeri' ? `<span class="badge badge-purple">🏪 İşyeri</span>` : `<span class="badge badge-blue">🏠 Daire</span>`;
    const muaf = d.yoneticiMuaf ? `<span class="badge badge-yellow" title="Yönetici muafiyeti">🛡️ Muaf</span>` : '';
    const blokObj = (db.settings.bloklar || []).find(b => b.id === d.blokId);
    const blokBadge = blokObj
      ? `<span class="badge" style="background:${blokObj.renk}22;color:${blokObj.renk};border:1px solid ${blokObj.renk}55;">🏗️ ${blokObj.ad}</span>`
      : `<span class="td-muted">—</span>`;

    return `<tr>
      <td><strong>${d.no}</strong>${d.kat ? `<div class="td-muted">${d.kat}. Kat</div>` : ''}</td>
      <td>${blokBadge}</td>
      <td>${tipBadge}</td>
      <td>
        <div>${person}</div>
        ${d.evSahibiAd && d.kiraciAd ? `<div class="td-muted">Ev Sahibi: ${d.evSahibiAd}</div>` : ''}
        ${muaf}
      </td>
      <td>${d.kiraciAd || '<span class="td-muted">—</span>'}</td>
      <td>${tel !== '—' ? `<a href="tel:${tel}" style="color:var(--accent);text-decoration:none;">${tel}</a>` : '<span class="td-muted">—</span>'}</td>
      <td><strong>${fmtMoney(d.aidat || db.settings.aidatDefault)}</strong>/ay</td>
      <td>${durumBadge}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-xs" onclick="openDaireModal('${d.id}')" title="Düzenle">✏️</button>
          <button class="btn btn-ghost btn-xs" onclick="openGecmis('${d.id}')" title="Geçmiş">📜</button>
          <button class="btn btn-danger btn-xs" onclick="deleteDaire('${d.id}')" title="Sil">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function toggleSidebar() {
  const appEl = document.getElementById('app');
  const overlay = document.getElementById('sidebarOverlay');
  const isOpen = appEl.classList.toggle('sidebar-open');
  overlay.classList.toggle('visible', isOpen);
}

function changeUyelerYear(d) {
  selectedUyelerYear += d;
  document.getElementById('uyelerYear').textContent = selectedUyelerYear;
  renderUyeler();
}

function renderUyeler() {
  const year = selectedUyelerYear;
  const search = (document.getElementById('uyelerSearch')?.value || '').toLowerCase();
  const blokFilter = document.getElementById('uyelerBlokFilter')?.value || '';

  const activeDaireler = db.daireler
    .filter(d => d.durum === 'aktif')
    .filter(d => (d.no + ' ' + (d.evSahibiAd || '') + ' ' + (d.kiraciAd || '')).toLowerCase().includes(search))
    .filter(d => !blokFilter || d.blokId === blokFilter)
    .sort((a, b) => {
      const ba = a.blokAd || '', bb = b.blokAd || '';
      if (ba !== bb) return ba > bb ? 1 : -1;
      return isNaN(a.no) ? a.no > b.no ? 1 : -1 : +a.no - +b.no;
    });

  const totalMembers = activeDaireler.length;
  const totalPaid = activeDaireler.filter(d => {
    return MONTHS.some((_, mi) => {
      const entry = db.aidatlar[`${d.id}-${year}-${mi}`];
      return entry && entry.status === 'paid';
    });
  }).length;
  const totalUnpaid = totalMembers - totalPaid;

  const accountCount = db.uyeler.filter(u => activeDaireler.some(d => d.id === u.daireId)).length;
  document.getElementById('uyelerStats').innerHTML = `
    <div class="stat-card green">
      <div class="stat-label">Aktif Üye</div>
      <div class="stat-value green">${totalMembers}</div>
      <div class="stat-sub">${year}</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">Hesap Oluşturuldu</div>
      <div class="stat-value green">${accountCount}</div>
      <div class="stat-sub">Aktif üyeler</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">Bu Ay Ödenmedi</div>
      <div class="stat-value red">${totalUnpaid}</div>
      <div class="stat-sub">Üyeler</div>
    </div>
  `;

  const tbody = document.getElementById('uyelerBody');
  if (activeDaireler.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🏚️</div><p>Üye bulunamadı.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = activeDaireler.map(d => {
    const paidCount = MONTHS.reduce((count, _, mi) => {
      const entry = db.aidatlar[`${d.id}-${year}-${mi}`];
      return count + ((entry && entry.status === 'paid') ? 1 : 0);
    }, 0);
    const anyPaid = paidCount > 0;
    const statusLabel = paidCount === 12
      ? `<span class="badge badge-green">✅ Tüm Yıl Ödendi</span>`
      : anyPaid
        ? `<span class="badge badge-yellow">⚠️ ${paidCount}/12 Ödendi</span>`
        : `<span class="badge badge-red">❌ Henüz ödeme yok</span>`;
    const blokObj = (db.settings.bloklar || []).find(b => b.id === d.blokId);
    const blokLabel = blokObj ? blokObj.ad : '—';
    const account = getUyeAccount(d.id);
    const tcDisplay = account ? account.username : '<span class="td-muted">—</span>';
    const accountStatus = account
      ? (account.aktif
          ? `<span class="badge badge-green">✅ Aktif</span>`
          : `<span class="badge badge-yellow">⏳ Onay Bekliyor</span>`)
      : `<span class="badge badge-red">❌ Hesap Yok</span>`;

    const activateBtn = account
      ? (account.aktif
          ? `<button class="btn btn-warning btn-xs" onclick="toggleUyeAktif('${account.id}', 0)">🔒 Pasif Et</button>`
          : `<button class="btn btn-success btn-xs" onclick="toggleUyeAktif('${account.id}', 1)">✅ Onayla</button>`)
      : `<button class="btn btn-primary btn-xs" onclick="openUyeKayitModal('${d.id}')">➕ Hesap Ekle</button>`;

    return `<tr>
      <td><strong>${d.no}</strong></td>
      <td>${blokLabel}</td>
      <td>${d.evSahibiAd || d.kiraciAd || '—'}</td>
      <td>${d.evSahibiTel || d.kiraciTel || '<span class="td-muted">—</span>'}</td>
      <td>${fmtMoney(d.aidat || db.settings.aidatDefault)}</td>
      <td>${year}</td>
      <td>${statusLabel}</td>
      <td>${tcDisplay}</td>
      <td>${accountStatus}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap;">
        ${account ? `<button class="btn btn-secondary btn-xs" onclick="openUyeKayitModal('${d.id}')">✏️ Düzenle</button>` : ''}
        ${activateBtn}
      </td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
// AİDAT
// ═══════════════════════════════════════════════════════════════
function changeAidatYear(d) {
  selectedAidatYear += d;
  document.getElementById('aidatYear').textContent = selectedAidatYear;
  renderAidat();
}

function getAidatStatus(daireId, year, month) {
  const key = `${daireId}-${year}-${month}`;
  return db.aidatlar[key] || { status: 'unpaid' };
}

function renderAidat() {
  const year = selectedAidatYear;
  const search = (document.getElementById('aidatSearch')?.value || '').toLowerCase();
  const monthFilter = document.getElementById('aidatMonthFilter')?.value;
  const blokFilter = document.getElementById('aidatBlokFilter')?.value || '';

  const activeDaireler = db.daireler
    .filter(d => d.durum === 'aktif')
    .filter(d => (d.no + ' ' + (d.evSahibiAd || '') + ' ' + (d.kiraciAd || '')).toLowerCase().includes(search))
    .filter(d => !blokFilter || d.blokId === blokFilter)
    .sort((a, b) => {
      const ba = a.blokAd || '', bb = b.blokAd || '';
      if (ba !== bb) return ba > bb ? 1 : -1;
      return isNaN(a.no) ? a.no > b.no ? 1 : -1 : +a.no - +b.no;
    });

  const container = document.getElementById('aidatContent');

  if (activeDaireler.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏚️</div><p>Aktif daire bulunamadı.</p></div>';
    return;
  }

  if (monthFilter === '') {
    let html = '<div class="table-wrap"><table><thead><tr><th>Daire</th>';
    MONTHS_SHORT.forEach(m => html += `<th style="min-width:50px;">${m}</th>`);
    html += '<th>Toplam</th><th>Bakiye</th></tr></thead><tbody>';

    activeDaireler.forEach(d => {
      let total = 0, collected = 0;
      let cells = '';
      MONTHS.forEach((m, mi) => {
        const entry = getAidatStatus(d.id, year, mi);
        const amt = d.aidat || db.settings.aidatDefault || 0;
        if (d.yoneticiMuaf) {
          cells += `<td><span class="badge badge-purple" style="cursor:pointer;" onclick="openAidatDetail('${d.id}',${year},${mi})" title="Muaf">🛡️</span></td>`;
        } else if (entry.status === 'paid') {
          collected += parseFloat(entry.amount || amt);
          total += amt;
          cells += `<td><span class="badge badge-green" style="cursor:pointer;" onclick="openAidatDetail('${d.id}',${year},${mi})">✅</span></td>`;
        } else if (entry.status === 'exempt') {
          cells += `<td><span class="badge badge-yellow" style="cursor:pointer;" onclick="openAidatDetail('${d.id}',${year},${mi})">🚫</span></td>`;
        } else {
          total += amt;
          cells += `<td><span class="badge badge-red" style="cursor:pointer;" onclick="openAidatDetail('${d.id}',${year},${mi})">❌</span></td>`;
        }
      });
      const balance = collected - total;
      html += `<tr>
        <td><strong>${d.no}</strong><div class="td-muted">${d.kiraciAd || d.evSahibiAd || '—'}</div></td>
        ${cells}
        <td><strong>${fmtMoney(total)}</strong></td>
        <td><strong style="color:${balance >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMoney(balance)}</strong></td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  } else {
    const mi = parseInt(monthFilter);
    let html = `<h3 style="margin-bottom:16px;">${MONTHS[mi]} ${year} — Aidat Detayı</h3>`;
    let paidCount = 0, unpaidCount = 0, exemptCount = 0;

    html += '<div class="table-wrap"><table><thead><tr><th>Daire</th><th>Kişi</th><th>Aidat</th><th>Durum</th><th>Ödeme Tarihi</th><th>Not</th><th>İşlem</th></tr></thead><tbody>';

    activeDaireler.forEach(d => {
      const entry = getAidatStatus(d.id, year, mi);
      const amt = d.aidat || db.settings.aidatDefault || 0;
      let badge;

      if (d.yoneticiMuaf) {
        badge = `<span class="badge badge-purple">🛡️ Yön.Muaf</span>`;
        exemptCount++;
      } else if (entry.status === 'paid') {
        badge = `<span class="badge badge-green">✅ Ödendi</span>`;
        paidCount++;
      } else if (entry.status === 'exempt') {
        badge = `<span class="badge badge-yellow">🚫 Muaf</span>`;
        exemptCount++;
      } else {
        badge = `<span class="badge badge-red">❌ Ödenmedi</span>`;
        unpaidCount++;
      }

      html += `<tr>
        <td><strong>${d.no}</strong></td>
        <td>${d.kiraciAd || d.evSahibiAd || '—'}</td>
        <td>${fmtMoney(entry.amount || amt)}</td>
        <td>${badge}</td>
        <td>${entry.date ? fmtDate(entry.date) : '<span class="td-muted">—</span>'}</td>
        <td>${entry.note ? `<span style="font-size:12px;">${entry.note}</span>` : '<span class="td-muted">—</span>'}</td>
        <td>
          <button class="btn btn-ghost btn-xs" onclick="openAidatDetail('${d.id}',${year},${mi})">✏️ Düzenle</button>
        </td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    html = `<div style="display:flex;gap:12px;margin-bottom:16px;">
      <div class="stat-card green" style="flex:1;padding:14px;">
        <div class="stat-label">Ödendi</div>
        <div class="stat-value green">${paidCount}</div>
      </div>
      <div class="stat-card red" style="flex:1;padding:14px;">
        <div class="stat-label">Ödenmedi</div>
        <div class="stat-value red">${unpaidCount}</div>
      </div>
      <div class="stat-card yellow" style="flex:1;padding:14px;">
        <div class="stat-label">Muaf</div>
        <div class="stat-value yellow">${exemptCount}</div>
      </div>
    </div>` + html;

    container.innerHTML = html;
  }
}

function openAidatDetail(daireId, year, month) {
  const d = db.daireler.find(x => x.id === daireId);
  if (!d) return;
  const key = `${daireId}-${year}-${month}`;
  const entry = db.aidatlar[key] || { status: 'unpaid', amount: d.aidat || db.settings.aidatDefault || 0 };
  tempAidatEdit = { daireId, year, month, key, aidatId: entry.id || genId() };

  document.getElementById('aidatDetailTitle').textContent = `💳 Daire ${d.no} — ${MONTHS[month]} ${year}`;
  document.getElementById('aidatDetailContent').innerHTML = `
    <div class="form-group">
      <label class="form-label">Durum</label>
      <select id="aidatDetailStatus" class="form-control">
        <option value="paid" ${entry.status === 'paid' ? 'selected' : ''}>✅ Ödendi</option>
        <option value="unpaid" ${entry.status === 'unpaid' || !entry.status ? 'selected' : ''}>❌ Ödenmedi</option>
        <option value="exempt" ${entry.status === 'exempt' ? 'selected' : ''}>🚫 Muaf</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Tutar (₺)</label>
        <input type="number" id="aidatDetailAmount" class="form-control" value="${entry.amount || d.aidat || db.settings.aidatDefault || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Ödeme Tarihi</label>
        <input type="date" id="aidatDetailDate" class="form-control" value="${entry.date || ''}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Ödeme Yöntemi</label>
      <select id="aidatDetailOdeme" class="form-control">
        <option value="Nakit" ${entry.odeme === 'Nakit' ? 'selected' : ''}>💵 Nakit</option>
        <option value="Havale" ${entry.odeme === 'Havale' ? 'selected' : ''}>🏦 Havale/EFT</option>
        <option value="Kredi Kartı" ${entry.odeme === 'Kredi Kartı' ? 'selected' : ''}>💳 Kredi Kartı</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Not</label>
      <input type="text" id="aidatDetailNote" class="form-control" value="${entry.note || ''}" placeholder="Opsiyonel not...">
    </div>
  `;
  openModal('aidatDetailModal');
}

async function saveAidatDetail() {
  if (!tempAidatEdit) return;
  const { daireId, year, month, aidatId } = tempAidatEdit;

  const payload = {
    id: aidatId,
    daireId: daireId,
    yil: year,
    ay: month,
    status: document.getElementById('aidatDetailStatus').value,
    amount: parseFloat(document.getElementById('aidatDetailAmount').value) || 0,
    date: document.getElementById('aidatDetailDate').value,
    odeme: document.getElementById('aidatDetailOdeme').value,
    note: document.getElementById('aidatDetailNote').value
  };

  try {
    await fetch('/api/aidatlar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await loadDb();
    closeModal('aidatDetailModal');
    if (document.getElementById('page-aidat').classList.contains('active')) renderAidat();
    showToast('Aidat kaydedildi!', 'success');
  } catch (e) {
    showToast('Hata oluştu', 'error');
  }
  tempAidatEdit = null;
}

function openBulkPayModal() {
  const yearSel = document.getElementById('bulkYear');
  const monthSel = document.getElementById('bulkMonth');
  const now = new Date();
  yearSel.innerHTML = '';
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    if (y === selectedAidatYear) opt.selected = true;
    yearSel.appendChild(opt);
  }
  monthSel.innerHTML = '';
  MONTHS.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = m;
    if (i === now.getMonth()) opt.selected = true;
    monthSel.appendChild(opt);
  });
  document.getElementById('bulkDate').value = now.toISOString().split('T')[0];
  openModal('bulkPayModal');
}

async function doBulkPay() {
  const year = parseInt(document.getElementById('bulkYear').value);
  const month = parseInt(document.getElementById('bulkMonth').value);
  const date = document.getElementById('bulkDate').value;

  const daireIds = db.daireler.filter(d => d.durum === 'aktif' && !d.yoneticiMuaf).map(d => d.id);

  try {
    await fetch('/api/aidatlar/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daireIds, yil: year, ay: month, date, odeme: 'Nakit' })
    });
    await loadDb();
    closeModal('bulkPayModal');
    if (document.getElementById('page-aidat').classList.contains('active')) renderAidat();
    showToast('Toplu ödeme kaydedildi!', 'success');
  } catch (e) {
    showToast('Hata oluştu', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// GİDERLER
// ═══════════════════════════════════════════════════════════════
function changeGiderYear(d) {
  selectedGiderYear += d;
  document.getElementById('giderYear').textContent = selectedGiderYear;
  renderGiderler();
}

function openGiderModal(id = null) {
  document.getElementById('giderId').value = '';
  document.getElementById('giderTarih').value = new Date().toISOString().split('T')[0];
  document.getElementById('giderKategori').value = 'Elektrik';
  document.getElementById('giderAciklama').value = '';
  document.getElementById('giderTutar').value = '';
  document.getElementById('giderOdeme').value = 'Nakit';
  document.getElementById('giderFis').value = '';
  document.getElementById('giderNot').value = '';

  if (id) {
    const g = db.giderler.find(x => x.id === id);
    if (!g) return;
    document.getElementById('giderModalTitle').textContent = '✏️ Gider Düzenle';
    document.getElementById('giderId').value = g.id;
    document.getElementById('giderTarih').value = g.tarih;
    document.getElementById('giderKategori').value = g.kategori;
    document.getElementById('giderAciklama').value = g.aciklama;
    document.getElementById('giderTutar').value = g.tutar;
    document.getElementById('giderOdeme').value = g.odeme || 'Nakit';
    document.getElementById('giderFis').value = g.fis || '';
    document.getElementById('giderNot').value = g.not || '';
  } else {
    document.getElementById('giderModalTitle').textContent = '💸 Gider Ekle';
  }
  openModal('giderModal');
}

async function saveGider() {
  const tarih = document.getElementById('giderTarih').value;
  const aciklama = document.getElementById('giderAciklama').value.trim();
  const tutar = parseFloat(document.getElementById('giderTutar').value);

  if (!tarih || !aciklama || !tutar) { showToast('Tarih, açıklama ve tutar zorunludur!', 'error'); return; }

  const id = document.getElementById('giderId').value || genId();
  const isEdit = !!document.getElementById('giderId').value;

  const gider = {
    id, tarih, aciklama, tutar,
    kategori: document.getElementById('giderKategori').value,
    odeme: document.getElementById('giderOdeme').value,
    fis: document.getElementById('giderFis').value,
    not: document.getElementById('giderNot').value
  };

  try {
    const method = isEdit ? 'PUT' : 'POST';
    const url = isEdit ? `/api/giderler/${id}` : '/api/giderler';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gider)
    });
    await loadDb();
    closeModal('giderModal');
    if (document.getElementById('page-giderler').classList.contains('active')) renderGiderler();
    showToast(isEdit ? 'Gider güncellendi!' : 'Gider eklendi!', 'success');
  } catch (e) {
    showToast('Hata oluştu', 'error');
  }
}

async function deleteGider(id) {
  const g = db.giderler.find(x => x.id === id);
  confirmAction(`"${g.aciklama}" gideri silinecek. Emin misiniz?`, async () => {
    try {
      await fetch(`/api/giderler/${id}`, { method: 'DELETE' });
      await loadDb();
      if (document.getElementById('page-giderler').classList.contains('active')) renderGiderler();
      showToast('Gider silindi.', 'warning');
    } catch (e) {
      showToast('Hata oluştu', 'error');
    }
  });
}

function renderGiderler() {
  const year = selectedGiderYear;
  const search = (document.getElementById('giderSearch')?.value || '').toLowerCase();
  const katFilter = document.getElementById('giderKategoriFilter')?.value || '';

  let list = db.giderler
    .filter(g => new Date(g.tarih).getFullYear() === year)
    .filter(g => (g.aciklama + ' ' + g.kategori).toLowerCase().includes(search))
    .filter(g => !katFilter || g.kategori === katFilter)
    .sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

  const byKat = {};
  list.forEach(g => { byKat[g.kategori] = (byKat[g.kategori] || 0) + parseFloat(g.tutar || 0); });
  const total = list.reduce((s, g) => s + parseFloat(g.tutar || 0), 0);

  const statsEl = document.getElementById('giderStats');
  const topKats = Object.entries(byKat).sort((a, b) => b[1] - a[1]).slice(0, 4);
  statsEl.innerHTML = `
    <div class="stat-card red">
      <div class="stat-icon">💸</div>
      <div class="stat-label">Toplam Gider</div>
      <div class="stat-value red">${fmtMoney(total)}</div>
      <div class="stat-sub">${list.length} kayıt</div>
    </div>
    ${topKats.map(([k, v]) => `
      <div class="stat-card">
        <div class="stat-icon">${KATEGORI_ICONS[k] || '📦'}</div>
        <div class="stat-label">${k}</div>
        <div class="stat-value">${fmtMoney(v)}</div>
        <div class="stat-sub">%${total ? Math.round(v / total * 100) : 0}</div>
      </div>
    `).join('')}
  `;

  const tbody = document.getElementById('giderlerBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">💸</div><p>Bu yıla ait gider kaydı bulunamadı.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(g => `<tr>
    <td>${fmtDate(g.tarih)}</td>
    <td><span class="badge badge-blue">${KATEGORI_ICONS[g.kategori] || '📦'} ${g.kategori}</span></td>
    <td>
      <div>${g.aciklama}</div>
      ${g.fis ? `<div class="td-muted">Fiş: ${g.fis}</div>` : ''}
      ${g.not ? `<div class="td-muted">${g.not}</div>` : ''}
    </td>
    <td><strong style="color:var(--red);">${fmtMoney(g.tutar)}</strong></td>
    <td><span class="badge badge-gray">${g.odeme || 'Nakit'}</span></td>
    <td>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-xs" onclick="openGiderModal('${g.id}')">✏️</button>
        <button class="btn btn-danger btn-xs" onclick="deleteGider('${g.id}')">🗑️</button>
      </div>
    </td>
  </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════════
// KASA
// ═══════════════════════════════════════════════════════════════
function changeKasaYear(d) {
  selectedKasaYear += d;
  document.getElementById('kasaYear').textContent = selectedKasaYear;
  renderKasa();
}

function renderKasa() {
  const year = selectedKasaYear;
  document.getElementById('kasaYear').textContent = year;

  let prevYearBalance = 0;
  const activeDaireler = db.daireler.filter(d => d.durum === 'aktif');

  for (let y = year - 1; y >= year - 5; y--) {
    let inc = 0, exp = 0;
    activeDaireler.forEach(d => {
      MONTHS.forEach((m, mi) => {
        const key = `${d.id}-${y}-${mi}`;
        const entry = db.aidatlar[key];
        if (entry && entry.status === 'paid') inc += parseFloat(entry.amount || d.aidat || db.settings.aidatDefault || 0);
      });
    });
    db.giderler.filter(g => new Date(g.tarih).getFullYear() === y).forEach(g => { exp += parseFloat(g.tutar || 0); });
    if (inc > 0 || exp > 0) { prevYearBalance = inc - exp; break; }
  }
  const totalDevirBorc = db.daireler.reduce((s, d) => s + (d.devirBorc || 0), 0);

  const monthlyRows = MONTHS.map((m, mi) => {
    let income = 0, expense = 0;
    activeDaireler.forEach(d => {
      const key = `${d.id}-${year}-${mi}`;
      const entry = db.aidatlar[key];
      if (entry && entry.status === 'paid') income += parseFloat(entry.amount || d.aidat || db.settings.aidatDefault || 0);
    });
    db.giderler.filter(g => {
      const d = new Date(g.tarih);
      return d.getFullYear() === year && d.getMonth() === mi;
    }).forEach(g => { expense += parseFloat(g.tutar || 0); });
    return { m, income, expense, net: income - expense };
  });

  const totalIncome = monthlyRows.reduce((s, r) => s + r.income, 0);
  const totalExpense = monthlyRows.reduce((s, r) => s + r.expense, 0);
  const netBalance = totalIncome - totalExpense;
  const kasaBalance = prevYearBalance + netBalance - totalDevirBorc;

  document.getElementById('kasaContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;">
      <div class="card" style="border-color:rgba(16,185,129,0.3);">
        <div class="kasa-row">
          <span class="kasa-row-label">Devir Bakiye (Önceki Yıl)</span>
          <span class="kasa-row-value" style="color:${prevYearBalance >= 0 ? 'var(--green)' : 'var(--red)'}">${fmtMoney(prevYearBalance)}</span>
        </div>
        <div class="kasa-row">
          <span class="kasa-row-label">Toplam Aidat Geliri</span>
          <span class="kasa-row-value" style="color:var(--green)">+ ${fmtMoney(totalIncome)}</span>
        </div>
        <div class="kasa-row">
          <span class="kasa-row-label">Toplam Gider</span>
          <span class="kasa-row-value" style="color:var(--red)">- ${fmtMoney(totalExpense)}</span>
        </div>
        ${totalDevirBorc > 0 ? `<div class="kasa-row">
          <span class="kasa-row-label">Toplam Devir Borç</span>
          <span class="kasa-row-value" style="color:var(--yellow)">- ${fmtMoney(totalDevirBorc)}</span>
        </div>` : ''}
        <div class="kasa-row" style="border-top:2px solid var(--border);margin-top:8px;padding-top:16px;">
          <span class="kasa-row-label" style="font-size:16px;font-weight:700;color:var(--text-primary);">💰 Kasa Bakiyesi</span>
          <span class="kasa-row-value" style="font-size:24px;color:${kasaBalance >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtMoney(kasaBalance)}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📊 Yıl Özeti ${year}</div>
        <div style="margin-top:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;color:var(--text-secondary);">Tahsilat Oranı</span>
            <span style="font-size:13px;font-weight:600;">${totalIncome > 0 ? Math.round(totalIncome / (totalIncome + totalExpense) * 100) : 0}%</span>
          </div>
          <div class="progress-bar" style="margin-bottom:16px;">
            <div class="progress-fill" style="width:${totalIncome > 0 ? Math.min(100, Math.round(totalIncome / (totalIncome + totalExpense) * 100)) : 0}%"></div>
          </div>
          <div class="kasa-row">
            <span class="kasa-row-label">Net (Bu Yıl)</span>
            <span class="kasa-row-value" style="color:${netBalance >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtMoney(netBalance)}</span>
          </div>
          <div class="kasa-row">
            <span class="kasa-row-label">Ortalama Aylık Gelir</span>
            <span class="kasa-row-value">${fmtMoney(totalIncome / 12)}</span>
          </div>
          <div class="kasa-row">
            <span class="kasa-row-label">Ortalama Aylık Gider</span>
            <span class="kasa-row-value">${fmtMoney(totalExpense / 12)}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ay</th>
            <th>Aidat Geliri</th>
            <th>Gider</th>
            <th>Net</th>
            <th>Kümülatif</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
      let cumulative = prevYearBalance;
      return monthlyRows.map(r => {
        cumulative += r.net;
        return `<tr>
                <td><strong>${r.m}</strong></td>
                <td style="color:var(--green);">+ ${fmtMoney(r.income)}</td>
                <td style="color:var(--red);">- ${fmtMoney(r.expense)}</td>
                <td style="color:${r.net >= 0 ? 'var(--green)' : 'var(--red)'};">${r.net >= 0 ? '+' : ''}${fmtMoney(r.net)}</td>
                <td style="color:${cumulative >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700;">${fmtMoney(cumulative)}</td>
              </tr>`;
      }).join('');
    })()}
          <tr style="background:var(--bg-card);font-weight:700;">
            <td>TOPLAM</td>
            <td style="color:var(--green);">+ ${fmtMoney(totalIncome)}</td>
            <td style="color:var(--red);">- ${fmtMoney(totalExpense)}</td>
            <td style="color:${netBalance >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtMoney(netBalance)}</td>
            <td style="color:${kasaBalance >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtMoney(kasaBalance)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// BORÇLAR
// ═══════════════════════════════════════════════════════════════
function changeBorcYear(d) {
  selectedBorcYear += d;
  document.getElementById('borcYear').textContent = selectedBorcYear;
  renderBorclar();
}

function renderBorclar() {
  const year = selectedBorcYear;
  document.getElementById('borcYear').textContent = year;

  const activeDaireler = db.daireler.filter(d => d.durum === 'aktif');

  const debtList = activeDaireler.map(d => {
    if (d.yoneticiMuaf) return null;
    let totalDebt = d.devirBorc || 0;
    let unpaidMonths = [];

    MONTHS.forEach((m, mi) => {
      const key = `${d.id}-${year}-${mi}`;
      const entry = db.aidatlar[key];
      const amt = d.aidat || db.settings.aidatDefault || 0;
      if (!entry || entry.status === 'unpaid') {
        totalDebt += amt;
        unpaidMonths.push(m);
      }
    });

    return { d, totalDebt, unpaidMonths };
  }).filter(x => x && x.totalDebt > 0);

  const totalDebt = debtList.reduce((s, x) => s + x.totalDebt, 0);

  let html = `
    <div class="stats-grid" style="margin-bottom:20px;">
      <div class="stat-card red">
        <div class="stat-icon">⚠️</div>
        <div class="stat-label">Borçlu Daire</div>
        <div class="stat-value red">${debtList.length}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-icon">💰</div>
        <div class="stat-label">Toplam Borç</div>
        <div class="stat-value red">${fmtMoney(totalDebt)}</div>
      </div>
    </div>
  `;

  if (debtList.length === 0) {
    html += '<div class="empty-state"><div class="empty-state-icon">🎉</div><p>Tüm daireler ödemelerini yapmış! Borçlu yok.</p></div>';
  } else {
    html += `<div class="table-wrap"><table>
      <thead><tr><th>Daire</th><th>Blok</th><th>Kişi</th><th>Telefon</th><th>Ödenmemiş Aylar</th><th>Devir Borç</th><th>Toplam Borç</th><th>WhatsApp</th></tr></thead>
      <tbody>
        ${debtList.sort((a, b) => b.totalDebt - a.totalDebt).map(({ d, totalDebt, unpaidMonths }) => {
      const person = d.kiraciAd || d.evSahibiAd || '—';
      const tel = d.kiraciTel || d.evSahibiTel || '';
      const blokObj = (db.settings.bloklar || []).find(b => b.id === d.blokId);
      const blokCell = blokObj ? `<span class="badge" style="background:${blokObj.renk}22;color:${blokObj.renk};border:1px solid ${blokObj.renk}55;">${blokObj.ad}</span>` : '<span class="td-muted">—</span>';
      return `<tr>
            <td><strong>${d.no}</strong></td>
            <td>${blokCell}</td>
            <td>${person}</td>
            <td>${tel ? `<a href="tel:${tel}" style="color:var(--accent);text-decoration:none;">${tel}</a>` : '<span class="td-muted">—</span>'}</td>
            <td>${unpaidMonths.map(m => `<span class="badge badge-red" style="margin:1px;">${m}</span>`).join('')}</td>
            <td>${d.devirBorc > 0 ? `<span style="color:var(--yellow);">${fmtMoney(d.devirBorc)}</span>` : '<span class="td-muted">—</span>'}</td>
            <td><strong style="color:var(--red);">${fmtMoney(totalDebt)}</strong></td>
            <td>${tel ? `<button class="wa-btn" onclick="openWaModal('${tel}','${person}','${d.no}',${totalDebt},'${unpaidMonths.join(',')}')">📱 Gönder</button>` : '<span class="td-muted">Tel yok</span>'}</td>
          </tr>`;
    }).join('')}
      </tbody>
    </table></div>`;
  }

  document.getElementById('borclarContent').innerHTML = html;
}

function openWaModal(tel, person, daireNo, amount, months) {
  const msg = generateWaMessage(person, daireNo, amount, months);
  document.getElementById('waTel').value = tel;
  document.getElementById('waMsg').value = msg;
  openModal('waModal');
}

function generateWaMessage(person, daireNo, amount, months) {
  const binaAdi = db.settings.binaAdi || 'Apartmanımız';
  return `Merhaba ${person} Hanım/Bey,\n\n${binaAdi} yönetiminden bilgilendirme mesajıdır.\n\nDaire No: ${daireNo}\nÖdenmemiş Aylar: ${months}\nToplam Borç: ${fmtMoney(amount)}\n\nLütfen en kısa sürede ödemenizi yapmanızı rica ederiz.\n\nSaygılarımızla,\n${binaAdi} Yönetimi`;
}

function sendWhatsApp() {
  let tel = document.getElementById('waTel').value.trim().replace(/\D/g, '');
  const msg = document.getElementById('waMsg').value.trim();
  if (!tel || !msg) { showToast('Telefon ve mesaj zorunludur!', 'error'); return; }
  if (tel.startsWith('0')) tel = '90' + tel.slice(1);
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  closeModal('waModal');
  showToast('WhatsApp açılıyor...', 'success');
}

function sendBulkWhatsApp() {
  const year = selectedBorcYear;
  const activeDaireler = db.daireler.filter(d => d.durum === 'aktif');

  const debtList = activeDaireler.filter(d => {
    if (d.yoneticiMuaf) return false;
    let hasDebt = (d.devirBorc || 0) > 0;
    MONTHS.forEach((m, mi) => {
      const key = `${d.id}-${year}-${mi}`;
      const entry = db.aidatlar[key];
      if (!entry || entry.status === 'unpaid') hasDebt = true;
    });
    return hasDebt && (d.kiraciTel || d.evSahibiTel);
  });

  if (debtList.length === 0) { showToast('Borçlu veya telefon numarası bulunan daire yok.', 'warning'); return; }

  showToast(`${debtList.length} kişiye sırayla WhatsApp açılacak. Popup engelleyiciyi kapatın!`, 'warning');

  debtList.forEach((d, i) => {
    setTimeout(() => {
      let totalDebt = d.devirBorc || 0;
      let unpaidMonths = [];
      MONTHS.forEach((m, mi) => {
        const key = `${d.id}-${year}-${mi}`;
        const entry = db.aidatlar[key];
        if (!entry || entry.status === 'unpaid') { totalDebt += d.aidat || db.settings.aidatDefault || 0; unpaidMonths.push(m); }
      });
      const person = d.kiraciAd || d.evSahibiAd || 'Daire Sahibi';
      let tel = (d.kiraciTel || d.evSahibiTel).replace(/\D/g, '');
      if (tel.startsWith('0')) tel = '90' + tel.slice(1);
      const msg = generateWaMessage(person, d.no, totalDebt, unpaidMonths.join(', '));
      window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    }, i * 1500);
  });
}

// ═══════════════════════════════════════════════════════════════
// RAPORLAR
// ═══════════════════════════════════════════════════════════════
function switchRaporTab(tab, el) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  currentRaporTab = tab;
  renderRapor(tab);
}

function renderRapor(tab) {
  const now = new Date();
  const year = now.getFullYear();
  const activeDaireler = db.daireler.filter(d => d.durum === 'aktif');
  const el = document.getElementById('raporContent');

  if (tab === 'ozet') {
    let totalAidat = 0, collectedAidat = 0, totalGider = 0;
    activeDaireler.forEach(d => {
      if (d.yoneticiMuaf) return;
      MONTHS.forEach((m, mi) => {
        const amt = d.aidat || db.settings.aidatDefault || 0;
        totalAidat += amt;
        const key = `${d.id}-${year}-${mi}`;
        const entry = db.aidatlar[key];
        if (entry && entry.status === 'paid') collectedAidat += parseFloat(entry.amount || amt);
      });
    });
    db.giderler.filter(g => new Date(g.tarih).getFullYear() === year).forEach(g => { totalGider += parseFloat(g.tutar || 0); });

    el.innerHTML = `
      <div style="max-width:700px;">
        <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid var(--border);">
          <h2 style="font-size:20px;font-weight:800;">${db.settings.binaAdi}</h2>
          <p style="color:var(--text-muted);">${db.settings.binaAdres || ''}</p>
          <p style="color:var(--text-muted);font-size:13px;">${year} Yılı Özet Rapor — ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        <div class="card" style="margin-bottom:16px;">
          <div class="kasa-row"><span class="kasa-row-label">Toplam Daire Sayısı</span><span class="kasa-row-value">${db.daireler.length}</span></div>
          <div class="kasa-row"><span class="kasa-row-label">Aktif Daire</span><span class="kasa-row-value">${activeDaireler.length}</span></div>
          <div class="kasa-row"><span class="kasa-row-label">Beklenen Aidat</span><span class="kasa-row-value">${fmtMoney(totalAidat)}</span></div>
          <div class="kasa-row"><span class="kasa-row-label" style="color:var(--green);">Toplanan Aidat</span><span class="kasa-row-value" style="color:var(--green);">${fmtMoney(collectedAidat)}</span></div>
          <div class="kasa-row"><span class="kasa-row-label" style="color:var(--red);">Toplam Gider</span><span class="kasa-row-value" style="color:var(--red);">- ${fmtMoney(totalGider)}</span></div>
          <div class="kasa-row" style="border-top:2px solid var(--border);padding-top:16px;margin-top:8px;">
            <span class="kasa-row-label" style="font-weight:700;font-size:16px;">Kasa Bakiyesi</span>
            <span class="kasa-row-value" style="font-size:22px;color:${(collectedAidat - totalGider) >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtMoney(collectedAidat - totalGider)}</span>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px;">📅 Aylık Özet</div>
          <div class="table-wrap" style="border:none;">
            <table>
              <thead><tr><th>Ay</th><th>Gelir</th><th>Gider</th><th>Net</th></tr></thead>
              <tbody>
                ${MONTHS.map((m, mi) => {
      let inc = 0, exp = 0;
      activeDaireler.forEach(d => {
        const key = `${d.id}-${year}-${mi}`;
        const entry = db.aidatlar[key];
        if (entry && entry.status === 'paid') inc += parseFloat(entry.amount || d.aidat || db.settings.aidatDefault || 0);
      });
      db.giderler.filter(g => { const d = new Date(g.tarih); return d.getFullYear() === year && d.getMonth() === mi; }).forEach(g => { exp += parseFloat(g.tutar || 0); });
      return `<tr><td>${m}</td><td style="color:var(--green);">${fmtMoney(inc)}</td><td style="color:var(--red);">${fmtMoney(exp)}</td><td style="color:${(inc - exp) >= 0 ? 'var(--green)' : 'var(--red)'};">${fmtMoney(inc - exp)}</td></tr>`;
    }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (tab === 'borclu') {
    const debtList = activeDaireler.map(d => {
      if (d.yoneticiMuaf) return null;
      let totalDebt = d.devirBorc || 0;
      let unpaidMonths = [];
      MONTHS.forEach((m, mi) => {
        const key = `${d.id}-${year}-${mi}`;
        const entry = db.aidatlar[key];
        if (!entry || entry.status === 'unpaid') { totalDebt += d.aidat || db.settings.aidatDefault || 0; unpaidMonths.push(m); }
      });
      return totalDebt > 0 ? { d, totalDebt, unpaidMonths } : null;
    }).filter(Boolean).sort((a, b) => b.totalDebt - a.totalDebt);

    el.innerHTML = `
      <div style="max-width:800px;">
        <div style="text-align:center;margin-bottom:20px;">
          <h2>${db.settings.binaAdi}</h2>
          <p style="color:var(--text-muted);">${year} Yılı Borçlu Raporu — ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        ${debtList.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🎉</div><p>Borçlu daire yok!</p></div>' : `
          <div class="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Daire</th><th>Kişi</th><th>Ödenmemiş Aylar</th><th>Toplam Borç</th></tr></thead>
              <tbody>
                ${debtList.map((x, i) => `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${x.d.no}</strong></td>
                  <td>${x.d.kiraciAd || x.d.evSahibiAd || '—'}</td>
                  <td>${x.unpaidMonths.join(', ')}</td>
                  <td style="color:var(--red);font-weight:700;">${fmtMoney(x.totalDebt)}</td>
                </tr>`).join('')}
                <tr style="font-weight:700;background:var(--bg-card);">
                  <td colspan="4">TOPLAM</td>
                  <td style="color:var(--red);">${fmtMoney(debtList.reduce((s, x) => s + x.totalDebt, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } else if (tab === 'gider') {
    const giders = db.giderler.filter(g => new Date(g.tarih).getFullYear() === year).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
    const total = giders.reduce((s, g) => s + parseFloat(g.tutar || 0), 0);
    const byKat = {};
    giders.forEach(g => { byKat[g.kategori] = (byKat[g.kategori] || 0) + parseFloat(g.tutar || 0); });

    el.innerHTML = `
      <div style="max-width:800px;">
        <div style="text-align:center;margin-bottom:20px;">
          <h2>${db.settings.binaAdi}</h2>
          <p style="color:var(--text-muted);">${year} Yılı Gider Raporu — ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:20px;">
          ${Object.entries(byKat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `
            <div class="stat-card" style="padding:14px;">
              <div class="stat-label">${KATEGORI_ICONS[k] || '📦'} ${k}</div>
              <div class="stat-value" style="font-size:18px;">${fmtMoney(v)}</div>
              <div class="stat-sub">%${total ? Math.round(v / total * 100) : 0}</div>
            </div>
          `).join('')}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Tarih</th><th>Kategori</th><th>Açıklama</th><th>Tutar</th><th>Ödeme</th></tr></thead>
            <tbody>
              ${giders.map(g => `<tr>
                <td>${fmtDate(g.tarih)}</td>
                <td>${KATEGORI_ICONS[g.kategori] || '📦'} ${g.kategori}</td>
                <td>${g.aciklama}${g.not ? `<div class="td-muted">${g.not}</div>` : ''}</td>
                <td style="color:var(--red);font-weight:600;">${fmtMoney(g.tutar)}</td>
                <td>${g.odeme || 'Nakit'}</td>
              </tr>`).join('')}
              <tr style="font-weight:700;background:var(--bg-card);">
                <td colspan="3">TOPLAM</td>
                <td style="color:var(--red);">${fmtMoney(total)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
}

// ═══════════════════════════════════════════════════════════════
// BLOK YÖNETİMİ
// ═══════════════════════════════════════════════════════════════
function renderBloklar() {
  const bloklar = db.settings.bloklar || [];
  const el = document.getElementById('blokListesi');
  if (!el) return;
  if (bloklar.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Henüz blok eklenmedi.<br>Sağ üstteki butona tıklayarak ekleyin.</div>';
    return;
  }
  el.innerHTML = bloklar.map(b => {
    const daireCount = db.daireler.filter(d => d.blokId === b.id).length;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-light);">
      <div style="width:14px;height:14px;border-radius:50%;background:${b.renk};flex-shrink:0;"></div>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:600;">${b.ad}</div>
        ${b.aciklama ? `<div style="font-size:12px;color:var(--text-muted);">${b.aciklama}</div>` : ''}
      </div>
      <span class="badge badge-blue">${daireCount} daire</span>
      <button class="btn btn-ghost btn-xs" onclick="openBlokModal('${b.id}')">✏️</button>
      <button class="btn btn-danger btn-xs" onclick="deleteBlok('${b.id}')">🗑️</button>
    </div>`;
  }).join('');
}

function openBlokModal(id = null) {
  const autoRenk = BLOK_RENKLER[(db.settings.bloklar || []).length % BLOK_RENKLER.length];
  document.getElementById('blokId').value = '';
  document.getElementById('blokAd').value = '';
  document.getElementById('blokRenk').value = autoRenk;
  document.getElementById('blokAciklama').value = '';
  document.getElementById('blokModalTitle').textContent = '🏗️ Yeni Blok Ekle';

  if (id) {
    const b = (db.settings.bloklar || []).find(x => x.id === id);
    if (!b) return;
    document.getElementById('blokModalTitle').textContent = '✏️ Blok Düzenle';
    document.getElementById('blokId').value = b.id;
    document.getElementById('blokAd').value = b.ad;
    document.getElementById('blokRenk').value = b.renk || autoRenk;
    document.getElementById('blokAciklama').value = b.aciklama || '';
  }
  openModal('blokModal');
}

async function saveBlok() {
  const ad = document.getElementById('blokAd').value.trim();
  if (!ad) { showToast('Blok adı zorunludur!', 'error'); return; }
  const id = document.getElementById('blokId').value || genId();
  const isEdit = !!document.getElementById('blokId').value;
  const blok = {
    id, ad,
    renk: document.getElementById('blokRenk').value || '#3b82f6',
    aciklama: document.getElementById('blokAciklama').value.trim()
  };

  try {
    const url = isEdit ? `/api/bloklar/${id}` : '/api/bloklar';
    await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blok)
    });
    await loadDb();
    renderBloklar();
    populateBlokFilters();
    closeModal('blokModal');
    showToast(isEdit ? 'Blok güncellendi!' : 'Blok eklendi!', 'success');
  } catch (e) {
    showToast('Hata', 'error');
  }
}

async function deleteBlok(id) {
  const b = (db.settings.bloklar || []).find(x => x.id === id);
  const daireCount = db.daireler.filter(d => d.blokId === id).length;
  const msg = daireCount > 0
    ? `"${b.ad}" bloğu ve ${daireCount} daire kaydındaki blok bilgisi silinecek. Emin misiniz?`
    : `"${b.ad}" bloğu silinecek. Emin misiniz?`;
  confirmAction(msg, async () => {
    try {
      await fetch(`/api/bloklar/${id}`, { method: 'DELETE' });
      await loadDb();
      renderBloklar();
      populateBlokFilters();
      showToast('Blok silindi.', 'warning');
    } catch (e) {
      showToast('Hata', 'error');
    }
  });
}

function populateBlokFilters() {
  const bloklar = db.settings.bloklar || [];
  const selectors = ['daireBlokFilter', 'aidatBlokFilter', 'uyelerBlokFilter'];
  selectors.forEach(selId => {
    const sel = document.getElementById(selId);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = `<option value="">Tüm Bloklar</option>`;
    bloklar.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id; opt.textContent = `🏗️ ${b.ad}`;
      sel.appendChild(opt);
    });
    sel.value = cur;
  });
}

// ═══════════════════════════════════════════════════════════════
// AYARLAR
// ═══════════════════════════════════════════════════════════════
function loadSettingsForm() {
  document.getElementById('setBinaAdi').value = db.settings.binaAdi || '';
  document.getElementById('setBinaAdres').value = db.settings.binaAdres || '';
  document.getElementById('setYoneticiDaire').value = db.settings.yoneticiDaire || '';
  document.getElementById('setAidatDefault').value = db.settings.aidatDefault || '';
  renderBloklar();
}

async function saveSettings() {
  const payload = {
    binaAdi: document.getElementById('setBinaAdi').value.trim() || 'Apartmanım',
    binaAdres: document.getElementById('setBinaAdres').value.trim(),
    yoneticiDaire: document.getElementById('setYoneticiDaire').value.trim(),
    aidatDefault: parseFloat(document.getElementById('setAidatDefault').value) || 500
  };

  try {
    await fetch('/api/ayarlar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await loadDb();
    updateTopbar();
    showToast('Ayarlar kaydedildi!', 'success');
  } catch (e) {
    showToast('Hata', 'error');
  }
}

async function changePassword() {
  // Not fully supported securely with this basic demo unless handled on backend specifically
  // We'll skip complex password checks and just send new one.
  const n1 = document.getElementById('setNewPwd').value;
  const n2 = document.getElementById('setNewPwd2').value;
  if (!n1) { showToast('Yeni şifre boş olamaz!', 'error'); return; }
  if (n1 !== n2) { showToast('Şifreler eşleşmiyor!', 'error'); return; }

  try {
    await fetch('/api/ayarlar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: n1 })
    });
    document.getElementById('setOldPwd').value = '';
    document.getElementById('setNewPwd').value = '';
    document.getElementById('setNewPwd2').value = '';
    showToast('Şifre değiştirildi!', 'success');
  } catch (e) {
    showToast('Hata', 'error');
  }
}

async function exportData() {
  try {
    showToast('Veriler hazırlanıyor...', 'info');
    const res = await fetch('/api/backup/export');
    if (!res.ok) {
      const err = await res.json();
      return showToast(err.error || 'Dışa aktarma başarısız.', 'error');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site_yedek_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Veriler başarıyla dışa aktarıldı.', 'success');
  } catch (e) {
    showToast('Dışa aktarma sırasında hata oluştu.', 'error');
  }
}

async function importData(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.daireler) return showToast('Geçersiz yedek dosyası.', 'error');

      confirmAction('Tüm mevcut veriler silinip yedekten geri yüklenecek. Emin misiniz?', async () => {
        try {
          showToast('Geri yükleniyor...', 'info');
          const res = await fetch('/api/backup/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          const result = await res.json();
          if (res.ok) {
            showToast(result.message || 'Veriler geri yüklendi.', 'success');
            await loadDb();
            renderDashboard();
          } else {
            showToast(result.error || 'Geri yükleme başarısız.', 'error');
          }
        } catch (err) {
          showToast('Geri yükleme sırasında hata oluştu.', 'error');
        }
      });
    } catch (err) {
      showToast('Dosya okunamadı veya JSON geçersiz.', 'error');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  showToast('Veri silmek için önce yedeğinizi alın, ardından boş bir JSON yükleyin.', 'warning');
}

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

function confirmAction(msg, callback) {
  document.getElementById('confirmMsg').textContent = msg;
  const btn = document.getElementById('confirmBtn');
  btn.onclick = () => { closeModal('confirmModal'); callback(); };
  openModal('confirmModal');
}

function showToast(msg, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(40px)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function fmtMoney(v) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(parseFloat(v) || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR');
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ═══════════════════════════════════════════════════════════════
// BOOTSTRAP
// ═══════════════════════════════════════════════════════════════
loadDb();

document.getElementById('loginPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});
