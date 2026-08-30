/* ============================================================
   CONFIG
   ============================================================ */

// Tambahkan dokumen di sini setelah file PDF di-upload ke assets/documents/
// Setiap entri: { name: "Nama tampil", file: "nama-file.pdf" }
const DOCUMENTS = [
  { name: "FAQ Transaksi REPO", file: "faq-transaksi-repo.pdf" },
  { name: "Peraturan OJK", file: "peraturan-ojk.pdf" },
];

// Kode saham untuk pita ticker. Dicoba ambil data live dari Yahoo Finance;
// kalau gagal (endpoint tidak resmi, lihat catatan di js/market-data.js),
// otomatis fallback ke arah dummy per-kode supaya ticker tidak pernah kosong.
const TICKER_CODES = [
  "BBCA", "BBRI", "BMRI", "TLKM", "ASII", "UNVR", "ANTM", "ICBP",
  "GOTO", "ADRO", "PGAS", "SMGR", "INDF", "KLBF", "CPIN", "BRPT",
];
const TICKER_DUMMY_DIR = { // fallback kalau live fetch gagal
  BBCA: "up", BBRI: "down", BMRI: "down", TLKM: "up", ASII: "up", UNVR: "up",
  ANTM: "down", ICBP: "up", GOTO: "up", ADRO: "down", PGAS: "up", SMGR: "down",
  INDF: "up", KLBF: "up", CPIN: "down", BRPT: "up",
};

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
   TICKER BAND — coba data live Yahoo Finance, fallback ke dummy per-kode
   ============================================================ */
(function buildTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  const renderItems = (list) => list.map(t => `
    <span class="ticker-item">
      <span class="ticker-code">${t.code}</span>
      <span class="${t.dir === 'up' ? 'ticker-up' : 'ticker-down'}">${t.dir === 'up' ? '▲' : '▼'}</span>
      ${t.pct != null ? `<span class="${t.dir === 'up' ? 'ticker-up' : 'ticker-down'}" style="font-size:0.75rem;">${t.pct}%</span>` : ''}
    </span>
  `).join('');

  // Render dummy dulu supaya ticker langsung tampil (tidak nunggu network)
  const dummyList = TICKER_CODES.map((code) => ({ code, dir: TICKER_DUMMY_DIR[code] || 'up', pct: null }));
  track.innerHTML = renderItems(dummyList) + renderItems(dummyList);

  // Lalu coba upgrade ke data live di background (kalau berhasil, ticker di-refresh)
  Promise.all(
    TICKER_CODES.map((code) =>
      MarketData.fetchStockMetrics(code)
        .then((m) => {
          if (m.error || m.prev_close == null) return { code, dir: TICKER_DUMMY_DIR[code] || 'up', pct: null };
          const dir = m.latest_close >= m.prev_close ? 'up' : 'down';
          const pct = (((m.latest_close - m.prev_close) / m.prev_close) * 100).toFixed(2);
          return { code, dir, pct: Math.abs(pct) };
        })
        .catch(() => ({ code, dir: TICKER_DUMMY_DIR[code] || 'up', pct: null }))
    )
  ).then((liveList) => {
    track.innerHTML = renderItems(liveList) + renderItems(liveList);
  });
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
   SIMULATOR — tersambung ke calc-engine.js asli (saham & obligasi)
   Field Kode Efek: ketik lalu pilih (datalist), bukan dropdown langsung.
   ============================================================ */
(function simulator() {
  const btn = document.getElementById('btnHitung');
  if (!btn) return;

  const SIM_STORAGE_KEY = 'repoSimulasiTersimpan';

  const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const resultBox = document.getElementById('resultBox');
  const warnMsg = document.getElementById('warnMsg');
  const btnSimpanSimulasi = document.getElementById('btnSimpanSimulasi');
  const simSavedMsg = document.getElementById('simSavedMsg');
  const modeSel = document.getElementById('modeSimulasi');
  const jenisEfekSel = document.getElementById('jenisEfek');
  const panelSaham = document.getElementById('panelSaham');
  const panelObligasi = document.getElementById('panelObligasi');
  const kodeSahamSel = document.getElementById('kodeSaham');
  const kodeObligasiSel = document.getElementById('kodeObligasi');
  const dlKodeSaham = document.getElementById('dlKodeSaham');
  const dlKodeObligasi = document.getElementById('dlKodeObligasi');
  const fieldRisikoKorporasi = document.getElementById('fieldRisikoKorporasi');
  const fieldJumlahLot = document.getElementById('fieldJumlahLot');
  const fieldTargetDanaSaham = document.getElementById('fieldTargetDanaSaham');
  const fieldJumlahUnit = document.getElementById('fieldJumlahUnit');
  const fieldTargetDanaObligasi = document.getElementById('fieldTargetDanaObligasi');

  let simData = null; // hasil DataLoader.loadAll()
  let sahamMap = {};      // display (label datalist) -> kode_efek
  let obligasiMap = {};   // display (label datalist) -> { kode_efek, is_korporasi }
  let currentSimPayload = null; // data hasil hitung terakhir, siap disimpan ke sessionStorage

  function showWarn(msg) {
    warnMsg.textContent = msg;
    warnMsg.hidden = false;
    resultBox.hidden = true;
    btnSimpanSimulasi.hidden = true;
    simSavedMsg.hidden = true;
    currentSimPayload = null;
  }

  // Render hasil simulasi (dipakai oleh ke-4 kombinasi: saham/obligasi x forward/reverse)
  // dan siapkan payload yang akan disimpan kalau tombol "Simpan Simulasi" diklik.
  function showResult({ label, value, metaHTML, payload }) {
    document.getElementById('resultLabel').textContent = label;
    document.getElementById('resultValue').textContent = value;
    document.getElementById('resultMeta').innerHTML = metaHTML;
    resultBox.hidden = false;
    btnSimpanSimulasi.hidden = false;
    btnSimpanSimulasi.textContent = '💾 Simpan Simulasi Ini untuk Form Pengajuan';
    simSavedMsg.hidden = true;
    currentSimPayload = payload;
  }

  btnSimpanSimulasi.addEventListener('click', () => {
    if (!currentSimPayload) return;
    try {
      sessionStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(currentSimPayload));
      simSavedMsg.textContent = '✓ Simulasi disimpan — scroll ke Form Pengajuan di bawah untuk memakainya.';
      simSavedMsg.hidden = false;
      btnSimpanSimulasi.textContent = '✓ Tersimpan';
      window.dispatchEvent(new CustomEvent('repoSimulasiTersimpan', { detail: currentSimPayload }));
    } catch (err) {
      console.error('Gagal menyimpan simulasi ke sessionStorage:', err);
    }
  });

  // Cari kode efek dari nilai yang diketik user di field datalist.
  // Kalau persis cocok dengan salah satu opsi (dipilih dari list), pakai map.
  // Kalau user ketik manual kode saja (tanpa pilih dari list), ambil token pertama.
  function resolveKode(inputValue, map) {
    const val = (inputValue || '').trim();
    if (map[val]) return map[val];
    const guess = val.split(/[-–—]/)[0].trim().toUpperCase();
    return guess;
  }

  function isReverseMode() {
    return modeSel.value === 'dana-ke-lot';
  }

  // ---- Toggle tampilan field sesuai mode simulasi (lot->dana vs dana->lot) ----
  function applyModeVisibility() {
    const reverse = isReverseMode();
    fieldJumlahLot.hidden = reverse;
    fieldTargetDanaSaham.hidden = !reverse;
    fieldJumlahUnit.hidden = reverse;
    fieldTargetDanaObligasi.hidden = !reverse;
    btn.textContent = reverse ? 'Hitung Kebutuhan Lot/Unit' : 'Hitung Estimasi Pendanaan';
    resultBox.hidden = true;
    warnMsg.hidden = true;
    btnSimpanSimulasi.hidden = true;
    simSavedMsg.hidden = true;
  }
  modeSel.addEventListener('change', applyModeVisibility);
  applyModeVisibility();

  // ---- Toggle panel saham/obligasi ----
  jenisEfekSel.addEventListener('change', () => {
    const isSaham = jenisEfekSel.value === 'saham';
    panelSaham.hidden = !isSaham;
    panelObligasi.hidden = isSaham;
    resultBox.hidden = true;
    warnMsg.hidden = true;
    btnSimpanSimulasi.hidden = true;
    simSavedMsg.hidden = true;
  });

  // ---- Tampilkan/sembunyikan pilihan kategori risiko kalau obligasi korporasi dipilih ----
  kodeObligasiSel?.addEventListener('input', () => {
    const entry = obligasiMap[kodeObligasiSel.value.trim()];
    fieldRisikoKorporasi.hidden = !(entry && entry.is_korporasi === true);
  });

  // ---- Load data referensi & isi datalist ----
  DataLoader.loadAll()
    .then((data) => {
      simData = data;

      const sahamOptions = DataLoader.getSahamOptions(data);
      sahamMap = {};
      dlKodeSaham.innerHTML = sahamOptions
        .map((o) => { sahamMap[o.display] = o.kode_efek; return `<option value="${o.display}"></option>`; })
        .join('');
      kodeSahamSel.placeholder = 'Ketik kode atau nama saham, lalu pilih...';

      const obligasiOptions = DataLoader.getObligasiOptions(data);
      obligasiMap = {};
      dlKodeObligasi.innerHTML = obligasiOptions
        .map((o) => {
          obligasiMap[o.display] = { kode_efek: o.kode_efek, is_korporasi: o.is_korporasi === true || o.is_korporasi === 'true' };
          return `<option value="${o.display}"></option>`;
        })
        .join('');
      kodeObligasiSel.placeholder = 'Ketik kode atau nama obligasi, lalu pilih...';
    })
    .catch((err) => {
      kodeSahamSel.placeholder = 'Gagal memuat data';
      kodeObligasiSel.placeholder = 'Gagal memuat data';
      kodeSahamSel.disabled = true;
      kodeObligasiSel.disabled = true;
      console.error('Gagal memuat data referensi simulator:', err);
    });

  btn.addEventListener('click', async () => {
    if (!simData) {
      showWarn('Data referensi masih dimuat, mohon tunggu sebentar lalu coba lagi.');
      return;
    }
    warnMsg.hidden = true;

    const jenis = jenisEfekSel.value;
    const reverse = isReverseMode();
    const origLabel = btn.textContent;
    btn.disabled = true;

    try {
      if (jenis === 'saham') {
        const namaTampilSaham = kodeSahamSel.value.trim();
        const kodeSaham = resolveKode(namaTampilSaham, sahamMap);

        if (!reverse) {
          // ---- MODE FORWARD: jumlah lot -> estimasi pendanaan ----
          const jumlahLot = parseInt(document.getElementById('jumlahLot').value, 10) || 0;
          if (!kodeSaham || jumlahLot <= 0) {
            showWarn('Mohon pilih kode efek dan isi jumlah lot terlebih dahulu.');
            return;
          }

          btn.textContent = `Mengambil data harga ${kodeSaham}...`;
          const marketMetrics = await MarketData.fetchStockMetrics(kodeSaham);
          if (marketMetrics.error) { showWarn(marketMetrics.error); return; }

          const instrumentRow = simData.instrumentByKode[kodeSaham];
          const haircutRow = simData.haircutKpei[kodeSaham];
          const listedFfRow = simData.listedFreefloat[kodeSaham];
          if (!instrumentRow || !haircutRow || !listedFfRow) {
            showWarn(`Data pendukung untuk ${kodeSaham} (Haircut KPEI / Listed-Free Float) tidak lengkap. Pastikan kode dipilih dari daftar yang muncul.`);
            return;
          }

          const result = CalcEngine.simulateStockFunding({
            kodeSaham, jumlahLot, marketMetrics, instrumentRow, haircutRow, listedFfRow,
          });
          if (result.error) { showWarn(result.error); return; }

          showResult({
            label: 'Estimasi Nilai Pendanaan (Saham)',
            value: rupiah(result.estimasi_pendanaan),
            metaHTML:
              `Nilai Jaminan: ${rupiah(result.nilai_jaminan_final)} • ` +
              `Rasio: ${(result.recommended_ratio * 100).toFixed(0)}% • Group: ${result.group} • ` +
              `Haircut KPEI: ${result.haircut_kpei_pct}% (${result.kategori_haircut})` +
              (result.kena_cap ? `<br/><span style="color:var(--maroon-700)">⚠ Nilai jaminan dipangkas karena melebihi batas maksimum per saham.</span>` : ''),
            payload: {
              jenis: 'saham',
              mode: 'lot-ke-dana',
              kode: kodeSaham,
              namaTampil: namaTampilSaham || kodeSaham,
              jumlah: jumlahLot,
              satuan: 'Lot',
              estimasiPendanaan: result.estimasi_pendanaan,
              timestamp: Date.now(),
            },
          });

        } else {
          // ---- MODE REVERSE: kebutuhan pendanaan -> jumlah lot dibutuhkan ----
          const targetPendanaan = parseFloat(document.getElementById('targetDanaSaham').value) || 0;
          if (!kodeSaham || targetPendanaan <= 0) {
            showWarn('Mohon pilih kode efek dan isi kebutuhan pendanaan terlebih dahulu.');
            return;
          }

          btn.textContent = `Mengambil data harga ${kodeSaham}...`;
          const marketMetrics = await MarketData.fetchStockMetrics(kodeSaham);
          if (marketMetrics.error) { showWarn(marketMetrics.error); return; }

          const instrumentRow = simData.instrumentByKode[kodeSaham];
          const haircutRow = simData.haircutKpei[kodeSaham];
          const listedFfRow = simData.listedFreefloat[kodeSaham];
          if (!instrumentRow || !haircutRow || !listedFfRow) {
            showWarn(`Data pendukung untuk ${kodeSaham} (Haircut KPEI / Listed-Free Float) tidak lengkap. Pastikan kode dipilih dari daftar yang muncul.`);
            return;
          }

          const result = CalcEngine.computeRequiredStockLots({
            kodeSaham, targetPendanaan, marketMetrics, instrumentRow, haircutRow, listedFfRow,
          });
          if (result.error) { showWarn(result.error); return; }

          showResult({
            label: 'Kebutuhan Jaminan Saham',
            value: `${result.jumlah_lot_dibutuhkan.toLocaleString('id-ID')} Lot`,
            metaHTML:
              `Jumlah Lembar: ${result.jumlah_lembar_dibutuhkan.toLocaleString('id-ID')} • ` +
              `Estimasi Pendanaan Aktual: ${rupiah(result.estimasi_pendanaan_aktual)} • ` +
              `Rasio: ${(result.recommended_ratio * 100).toFixed(0)}% • Group: ${result.group} • ` +
              `Haircut KPEI: ${result.haircut_kpei_pct}% (${result.kategori_haircut})` +
              (result.kena_cap
                ? `<br/><span style="color:var(--maroon-700)">⚠ Kebutuhan pendanaan melebihi batas maksimum yang bisa dijaminkan saham ini. ` +
                  `Maksimum pendanaan yang bisa dipenuhi hanya sekitar ${rupiah(result.max_pendanaan_dari_cap)} dari saham ini saja.</span>`
                : ''),
            payload: {
              jenis: 'saham',
              mode: 'dana-ke-lot',
              kode: kodeSaham,
              namaTampil: namaTampilSaham || kodeSaham,
              jumlah: result.jumlah_lot_dibutuhkan,
              satuan: 'Lot',
              estimasiPendanaan: result.estimasi_pendanaan_aktual,
              timestamp: Date.now(),
            },
          });
        }

      } else {
        const namaTampilObligasi = kodeObligasiSel.value.trim();
        const kodeObligasi = resolveKode(namaTampilObligasi, Object.fromEntries(
          Object.entries(obligasiMap).map(([k, v]) => [k, v.kode_efek])
        ));
        const bondRow = simData.statisEfek[kodeObligasi];
        const kategoriRisikoKorporasi =
          document.querySelector('input[name="risikoKorporasi"]:checked')?.value || 'Sedang';

        if (!reverse) {
          // ---- MODE FORWARD: jumlah unit -> estimasi pendanaan ----
          const jumlahUnit = parseInt(document.getElementById('jumlahUnit').value, 10) || 0;
          if (!kodeObligasi || jumlahUnit <= 0) {
            showWarn('Mohon pilih kode efek dan isi jumlah unit terlebih dahulu.');
            return;
          }
          if (!bondRow) {
            showWarn(`Data obligasi ${kodeObligasi} tidak ditemukan. Pastikan kode dipilih dari daftar yang muncul.`);
            return;
          }

          const result = CalcEngine.simulateBondFunding({
            kodeObligasi, jumlahUnit, bondRow, kategoriRisikoKorporasi,
          });
          if (result.error) { showWarn(result.error); return; }

          showResult({
            label: 'Estimasi Nilai Pendanaan (Obligasi)',
            value: rupiah(result.estimasi_pendanaan),
            metaHTML:
              `Nilai Jaminan: ${rupiah(result.nilai_jaminan)} • Rasio: ${(result.rasio * 100).toFixed(0)}% • ` +
              `Jenis: ${result.jenis_obligasi} (${result.kategori_risiko})`,
            payload: {
              jenis: 'obligasi',
              mode: 'lot-ke-dana',
              kode: kodeObligasi,
              namaTampil: namaTampilObligasi || kodeObligasi,
              jumlah: jumlahUnit,
              satuan: 'Unit',
              estimasiPendanaan: result.estimasi_pendanaan,
              timestamp: Date.now(),
            },
          });

        } else {
          // ---- MODE REVERSE: kebutuhan pendanaan -> jumlah unit dibutuhkan ----
          const targetPendanaan = parseFloat(document.getElementById('targetDanaObligasi').value) || 0;
          if (!kodeObligasi || targetPendanaan <= 0) {
            showWarn('Mohon pilih kode efek dan isi kebutuhan pendanaan terlebih dahulu.');
            return;
          }
          if (!bondRow) {
            showWarn(`Data obligasi ${kodeObligasi} tidak ditemukan. Pastikan kode dipilih dari daftar yang muncul.`);
            return;
          }

          const result = CalcEngine.computeRequiredBondUnits({
            kodeObligasi, targetPendanaan, bondRow, kategoriRisikoKorporasi,
          });
          if (result.error) { showWarn(result.error); return; }

          showResult({
            label: 'Kebutuhan Unit Obligasi',
            value: `${result.jumlah_unit_dibutuhkan.toLocaleString('id-ID')} Unit`,
            metaHTML:
              `Estimasi Pendanaan Aktual: ${rupiah(result.estimasi_pendanaan_aktual)} • ` +
              `Rasio: ${(result.rasio * 100).toFixed(0)}% • Jenis: ${result.jenis_obligasi} (${result.kategori_risiko})`,
            payload: {
              jenis: 'obligasi',
              mode: 'dana-ke-lot',
              kode: kodeObligasi,
              namaTampil: namaTampilObligasi || kodeObligasi,
              jumlah: result.jumlah_unit_dibutuhkan,
              satuan: 'Unit',
              estimasiPendanaan: result.estimasi_pendanaan_aktual,
              timestamp: Date.now(),
            },
          });
        }
      }
    } catch (err) {
      showWarn(`Terjadi kendala saat menghitung: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = origLabel;
    }
  });
})();

/* ============================================================
   MUAT SIMULASI TERSIMPAN — ke Form Pengajuan
   Membaca sessionStorage (diisi oleh tombol "Simpan Simulasi Ini untuk
   Form Pengajuan" di simulator), menampilkan ringkasannya, dan mengisi
   otomatis field "Saham/Obligasi yang Diajukan" + "Rencana Pengajuan"
   kalau tombol "Gunakan Data Ini di Form" diklik.

   Kotak ini di-refresh baik saat halaman pertama dimuat MAUPUN langsung
   saat tombol simpan di simulator diklik (lewat custom event
   'repoSimulasiTersimpan') — supaya muncul tanpa perlu reload halaman.
   ============================================================ */
(function muatSimulasiTersimpan() {
  const SIM_STORAGE_KEY = 'repoSimulasiTersimpan';
  const box = document.getElementById('simulasiTersimpanBox');
  const metaEl = document.getElementById('simulasiTersimpanMeta');
  const btnMuat = document.getElementById('btnMuatSimulasi');
  const fSaham = document.getElementById('fSaham');
  const fRencana = document.getElementById('fRencana');
  if (!box || !metaEl || !btnMuat || !fSaham) return;

  const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  let saved = null;

  function refreshBox() {
    try {
      const raw = sessionStorage.getItem(SIM_STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Gagal membaca simulasi tersimpan:', err);
      saved = null;
    }

    if (!saved) {
      box.hidden = true;
      return;
    }

    const jenisLabel = saved.jenis === 'saham' ? 'Saham' : 'Obligasi';
    metaEl.innerHTML =
      `${jenisLabel}: <strong>${saved.namaTampil}</strong> • ` +
      `Jumlah: ${saved.jumlah.toLocaleString('id-ID')} ${saved.satuan} • ` +
      `Estimasi Pendanaan: ${rupiah(saved.estimasiPendanaan)}`;
    box.hidden = false;
    btnMuat.textContent = 'Gunakan Data Ini di Form';
  }

  btnMuat.addEventListener('click', () => {
    if (!saved) return;
    const jenisLabel = saved.jenis === 'saham' ? 'Saham' : 'Obligasi';

    fSaham.value = `${jenisLabel}: ${saved.namaTampil} — ${saved.jumlah.toLocaleString('id-ID')} ${saved.satuan} (estimasi pendanaan ${rupiah(saved.estimasiPendanaan)})`;

    if (fRencana && !fRencana.value.trim()) {
      fRencana.value = `Mengajukan pendanaan REPO sekitar ${rupiah(saved.estimasiPendanaan)} berdasarkan hasil simulasi.`;
    }

    btnMuat.textContent = '✓ Data Dimuat ke Form';
    fSaham.focus();
  });

  refreshBox(); // saat halaman pertama dimuat
  window.addEventListener('repoSimulasiTersimpan', refreshBox); // saat tombol simpan di simulator diklik (live, tanpa refresh)
})();

/* ============================================================
   BROKER DATALIST (form pengajuan) — ketik lalu pilih, dari data/broker.json
   Format broker.json: [{ "broker_code": "...", "broker_name": "..." }, ...]
   ============================================================ */
(function buildBrokerDatalist() {
  const dl = document.getElementById('dlBroker');
  const input = document.getElementById('fBroker');
  if (!dl || !input) return;

  fetch('data/broker.json')
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then((brokers) => {
      dl.innerHTML = brokers
        .map((b) => `<option value="${b.broker_code} — ${b.broker_name}"></option>`)
        .join('');
    })
    .catch((err) => {
      console.error('Gagal memuat daftar broker (data/broker.json):', err);
      // Input tetap bisa diisi manual walau daftar broker gagal dimuat.
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
