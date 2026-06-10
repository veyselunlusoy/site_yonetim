// ── Tema ──────────────────────────────────────────────────────
function applyUyeTheme(mode) {
  const html = document.documentElement;
  const btn = document.getElementById('uyeThemeBtn');
  if (mode === 'light') {
    html.classList.add('light');
    if (btn) btn.innerHTML = '☀️ Aydınlık';
  } else {
    html.classList.remove('light');
    if (btn) btn.innerHTML = '🌙 Karanlık';
  }
  localStorage.setItem('theme', mode);
}

function toggleUyeTheme() {
  const current = localStorage.getItem('theme') || 'dark';
  applyUyeTheme(current === 'dark' ? 'light' : 'dark');
}

(function() {
  const saved = localStorage.getItem('theme') || 'dark';
  applyUyeTheme(saved);
})();
// ─────────────────────────────────────────────────────────────

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
let selectedUyeYear = new Date().getFullYear();

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const auth = await res.json();
    if (auth.role === 'uye') {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').classList.add('visible');
      loadData();
    } else {
      document.getElementById('app').classList.remove('visible');
      document.getElementById('loginScreen').style.display = 'flex';
    }
  } catch (err) {
    console.error(err);
  }
}

async function doLogin() {
  const tc = document.getElementById('loginTC').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!tc || !password) return;

  try {
    const res = await fetch('/api/uye/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tc, password })
    });
    const data = await res.json();

    if (data.success) {
      document.getElementById('loginError').style.display = 'none';
      checkAuth();
    } else {
      const errEl = document.getElementById('loginError');
      errEl.style.display = 'block';
      errEl.textContent = data.error || 'Hatalı giriş!';
    }
  } catch (err) {
    console.error(err);
  }
}

function toggleUyeMode(mode) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginTab = document.getElementById('tabLogin');
  const registerTab = document.getElementById('tabRegister');
  const title = document.getElementById('formTitle');
  const subtitle = document.getElementById('formSubtitle');

  const errorEl = document.getElementById('loginError');
  errorEl.style.display = 'none';

  if (mode === 'register') {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    loginTab.classList.remove('active');
    registerTab.classList.add('active');
    title.textContent = 'Yeni Üyelik Oluştur';
    subtitle.textContent = 'Daire numaranız ve TC Kimlik No ile kayıt olun.';
  } else {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    loginTab.classList.add('active');
    registerTab.classList.remove('active');
    title.textContent = 'Üye Girişi';
    subtitle.textContent = 'TC Kimlik No ve şifrenizle giriş yapın.';
  }
}

async function doRegister() {
  const no = document.getElementById('registerNo').value.trim();
  const tc = document.getElementById('registerTC').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const confirm = document.getElementById('registerPasswordConfirm').value.trim();

  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  if (!no || !tc || !password || password.length < 4 || password !== confirm) {
    errEl.style.display = 'block';
    errEl.textContent = 'Daire no, TC Kimlik No, şifre (en az 4 karakter) ve parola eşleşmesi gerekli.';
    return;
  }
  if (tc.replace(/\D/g,'').length !== 11) {
    errEl.style.display = 'block';
    errEl.textContent = 'TC Kimlik No 11 hane olmalıdır.';
    return;
  }

  try {
    const res = await fetch('/api/uye/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no, tc, email, password })
    });
    const data = await res.json();

    if (res.ok) {
      errEl.style.display = 'none';
      toggleUyeMode('login');
      const successEl = document.getElementById('loginSuccess');
      if (successEl) {
        successEl.style.display = 'block';
        successEl.textContent = data.message || 'Kaydınız alındı. Yönetici onayından sonra giriş yapabilirsiniz.';
      }
    } else {
      errEl.style.display = 'block';
      errEl.textContent = data.error || 'Kayıt sırasında hata oluştu.';
    }
  } catch (err) {
    console.error(err);
  }
}

async function doLogout() {
  await fetch('/api/logout');
  checkAuth();
}

function showToast(message, type = 'success') {
  const container = document.createElement('div');
  container.className = `toast ${type}`;
  container.textContent = message;
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3200);
}

async function loadData() {
  try {
    const res = await fetch(`/api/uye/bilgiler?yil=${selectedUyeYear}`);
    if (res.status === 401 || res.status === 403) {
      checkAuth();
      return;
    }
    const data = await res.json();
    render(data);
  } catch (err) {
    console.error(err);
  }
}

function render(data) {
  const { daire, aidatlar, settings, giderler } = data;
  const year = selectedUyeYear;

  // Yıl seçici
  const yearSel = document.getElementById('uyeYear');
  if (yearSel) {
    const current = new Date().getFullYear();
    yearSel.innerHTML = '';
    for (let y = current + 1; y >= current - 3; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === year) opt.selected = true;
      yearSel.appendChild(opt);
    }
  }

  document.getElementById('topBuildingName').textContent = settings.binaAdi || 'Bina Yönetim';
  const daireNoEl = document.getElementById('topDaireNo');
  if (daireNoEl) daireNoEl.textContent = `Daire ${daire.no}`;
  const uyeAdiEl = document.getElementById('topUyeAdi');
  if (uyeAdiEl && data.uyeAdi) uyeAdiEl.textContent = `👤 ${data.uyeAdi}`;

  const aidatTutari = parseFloat(daire.aidat || settings.aidatDefault || 0);
  document.getElementById('statAidat').textContent = fmtMoney(aidatTutari);

  // Aidat tablosu
  let totalDebt = parseFloat(daire.devirBorc || 0);
  const entriesByMonth = {};
  aidatlar.forEach(a => {
    if (parseInt(a.yil) === year) {
      entriesByMonth[parseInt(a.ay)] = a;
    }
  });

  const aidatBody = document.getElementById('aidatBody');
  let aidatHtml = '';

  if (daire.yoneticiMuaf) {
    totalDebt = 0;
    aidatHtml = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Yönetici muafiyetiniz bulunmaktadır.</td></tr>`;
  } else {
    for (let mi = 0; mi < 12; mi++) {
      const entry = entriesByMonth[mi];
      let badge, tutar;

      if (!entry || entry.status === 'unpaid') {
        badge = `<span class="badge badge-red">❌ Ödenmedi</span>`;
        tutar = aidatTutari;
        totalDebt += aidatTutari;
      } else if (entry.status === 'paid') {
        badge = `<span class="badge badge-green">✅ Ödendi</span>`;
        tutar = parseFloat(entry.amount) || aidatTutari;
      } else if (entry.status === 'exempt') {
        badge = `<span class="badge" style="background:#f59e0b22;color:#f59e0b;">🚫 Muaf</span>`;
        tutar = 0;
      } else {
        badge = `<span class="badge badge-red">❌ Ödenmedi</span>`;
        tutar = aidatTutari;
        totalDebt += aidatTutari;
      }

      const tarihStr = entry && entry.date ? new Date(entry.date).toLocaleDateString('tr-TR') : '—';
      aidatHtml += `<tr>
        <td><strong>${MONTHS[mi]}</strong></td>
        <td>${fmtMoney(tutar)}</td>
        <td>${badge}</td>
        <td>${tarihStr}</td>
      </tr>`;
    }
  }

  aidatBody.innerHTML = aidatHtml;

  const borcEl = document.getElementById('statBorc');
  borcEl.textContent = fmtMoney(totalDebt);
  if (totalDebt <= 0) {
    borcEl.classList.remove('red');
    borcEl.classList.add('green');
  } else {
    borcEl.classList.add('red');
    borcEl.classList.remove('green');
  }

  // Gider tablosu
  const giderBody = document.getElementById('giderBody');
  if (!giderler || giderler.length === 0) {
    giderBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Bu yıla ait gider kaydı yok.</td></tr>`;
  } else {
    giderBody.innerHTML = giderler.map(g => `
      <tr>
        <td>${g.tarih ? new Date(g.tarih).toLocaleDateString('tr-TR') : '—'}</td>
        <td>${g.aciklama || '—'}</td>
        <td>${g.kategori || '—'}</td>
        <td style="color:var(--red);font-weight:600;">${fmtMoney(g.tutar)}</td>
      </tr>
    `).join('');
  }
}

function changeUyeYear(d) {
  selectedUyeYear += d;
  if (selectedUyeYear < new Date().getFullYear() - 5) selectedUyeYear = new Date().getFullYear() - 5;
  if (selectedUyeYear > new Date().getFullYear() + 1) selectedUyeYear = new Date().getFullYear() + 1;
  loadData();
}

function fmtMoney(v) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(parseFloat(v) || 0);
}

document.getElementById('loginPassword').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin();
});

checkAuth();
