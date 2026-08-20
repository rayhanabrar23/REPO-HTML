/* ============================================================
   CONFIG
   ============================================================ */

// Tambahkan dokumen di sini setelah file PDF di-upload ke assets/documents/
// Setiap entri: { name: "Nama tampil", file: "nama-file.pdf" }
const DOCUMENTS = [
  { name: "FAQ Transaksi REPO", file: "faq-transaksi-repo.pdf" },
  { name: "Mekanisme REPO", file: "mekanisme-repo.pdf" },
  { name: "Peraturan OJK", file: "peraturan-ojk.pdf" },
  { name: "Peraturan KPEI", file: "peraturan-kpei.pdf" },
  { name: "Penjelasan Transaksi REPO", file: "penjelasan-transaksi-repo.pdf" },  
];

// Kode efek dummy untuk pita ticker (dekoratif saja, tidak real-time)
const TICKER_SAMPLE = [
  { code: "BBCA", dir: "up" }, { code: "BBRI", dir: "down" }, { code: "TLKM", dir: "up" },
  { code: "ASII", dir: "up" }, { code: "BMRI", dir: "down" }, { code: "UNVR", dir: "up" },
  { code: "ANTM", dir: "down" }, { code: "MNCN", dir: "up" }, { code: "ICBP", dir: "up" },
  { code: "OBLIGASI-A", dir: "up" }, { code: "OBLIGASI-B", dir: "down" }, { code: "GOTO", dir: "up" },
];

/* ============================================================
   HEADER SCROLL STATE
   ============================================================ */
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 12);
}, { passive: true });

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => io.observe(el));
} else {
  revealEls.forEach(el => el.classList.add('is-visible'));
}

/* ============================================================
   TICKER BAND
   ============================================================ */
(function buildTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const renderItems = (list) => list.map(t => `
    <span class="ticker-item">
      <span class="ticker-code">${t.code}</span>
      <span class="${t.dir === 'up' ? 'ticker-up' : 'ticker-down'}">${t.dir === 'up' ? '▲' : '▼'}</span>
    </span>
  `).join('');
  // Duplikasi list supaya animasi scroll looping mulus (translateX -50%)
  track.innerHTML = renderItems(TICKER_SAMPLE) + renderItems(TICKER_SAMPLE);
})();

/* ============================================================
   DOCUMENTS GRID
   ============================================================ */
(function buildDocuments() {
  const grid = document.getElementById('docGrid');
  if (!grid) return;

  if (DOCUMENTS.length === 0) {
    grid.innerHTML = `
      <div class="doc-empty">
        Dokumen pendukung (PDF) belum tersedia — akan tampil otomatis di sini setelah
        file ditambahkan ke folder <code>assets/documents/</code> dan didaftarkan di
        <code>script.js</code> (variabel <code>DOCUMENTS</code>).
      </div>`;
    return;
  }

  grid.innerHTML = DOCUMENTS.map(doc => `
    <a class="doc-card" href="assets/documents/${doc.file}" download>
      <span class="doc-icon">PDF</span>
      <span class="doc-name">${doc.name}</span>
    </a>
  `).join('');
})();

/* ============================================================
   SIMULATOR (placeholder logic — engine perhitungan resmi menyusul)
   ============================================================ */
(function simulator() {
  const btn = document.getElementById('btnHitung');
  if (!btn) return;

  const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

  btn.addEventListener('click', () => {
    const jenis = document.getElementById('jenisEfek').value;
    const lembar = parseFloat(document.getElementById('jumlahLembar').value) || 0;
    const harga = parseFloat(document.getElementById('hargaEfek').value) || 0;

    const resultBox = document.getElementById('resultBox');
    const warnMsg = document.getElementById('warnMsg');

    if (lembar <= 0 || harga <= 0) {
      warnMsg.hidden = false;
      resultBox.hidden = true;
      return;
    }
    warnMsg.hidden = true;

    const nilaiPasar = lembar * harga;
    // Haircut dummy — hanya untuk tampilan, formula resmi menyusul
    const haircutFactor = jenis === 'saham' ? 0.50 : 0.70;
    const estimasi = nilaiPasar * haircutFactor;

    document.getElementById('resultValue').textContent = rupiah(estimasi);
    document.getElementById('resultMeta').textContent =
      `Nilai Pasar: ${rupiah(nilaiPasar)} • Haircut Estimasi: ${Math.round((1 - haircutFactor) * 100)}%`;
    resultBox.hidden = false;
  });
})();

/* ============================================================
   FORM SUBMISSION — via Web3Forms (gratis, tanpa backend)
   Daftar & ambil access key gratis di https://web3forms.com
   lalu ganti value pada <input name="access_key"> di index.html
   ============================================================ */
(function formHandler() {
  const form = document.getElementById('pengajuanForm');
  if (!form) return;

  const statusEl = document.getElementById('formStatus');
  const btnSubmit = document.getElementById('btnSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const accessKey = form.querySelector('input[name="access_key"]').value;
    if (!accessKey || accessKey.includes('GANTI_DENGAN')) {
      statusEl.hidden = false;
      statusEl.className = 'form-status err';
      statusEl.textContent = 'Form belum terhubung ke layanan email — access_key belum diisi. Hubungi admin portal.';
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Mengirim...';

    try {
      const formData = new FormData(form);
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });
      const result = await res.json();

      statusEl.hidden = false;
      if (result.success) {
        statusEl.className = 'form-status ok';
        statusEl.textContent = 'Pengajuan berhasil dikirim! Tim kami akan segera menghubungi Anda.';
        form.reset();
      } else {
        statusEl.className = 'form-status err';
        statusEl.textContent = 'Pengajuan tercatat, namun notifikasi email gagal terkirim. Coba lagi nanti.';
      }
    } catch (err) {
      statusEl.hidden = false;
      statusEl.className = 'form-status err';
      statusEl.textContent = 'Terjadi kendala koneksi. Mohon periksa internet Anda dan coba lagi.';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Kirim Pengajuan';
    }
  });
})();
