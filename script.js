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
   Mendukung BANYAK EFEK sekaligus (jaminan gabungan) — user bisa
   tambah baris efek sebanyak yang dibutuhkan lewat "+ Tambah Efek".
   Field Kode Efek: ketik lalu pilih (datalist), bukan dropdown langsung.
   ============================================================ */
/* ============================================================
   SIMULATOR — tersambung ke calc-engine.js asli (saham & obligasi)
   Ada 2 INSTANCE terpisah di halaman:
     - forward  ("Estimasi Pendanaan"): jumlah lot/nilai nominal -> estimasi pendanaan
     - reverse  ("Kebutuhan Jaminan"): target pendanaan -> jumlah lot/nilai nominal dibutuhkan
   Masing-masing punya elemen DOM sendiri (id berbeda), tapi logic & rumus
   perhitungannya sama persis — dibungkus dalam factory createSimulatorInstance()
   supaya tidak duplikasi kode.
   Mendukung BANYAK EFEK sekaligus (jaminan gabungan) — user bisa
   tambah baris efek sebanyak yang dibutuhkan lewat "+ Tambah Efek".
   Field Kode Efek: ketik lalu pilih (datalist), bukan dropdown langsung.
   ============================================================ */
function createSimulatorInstance(mode, ids) {
  const btn = document.getElementById(ids.btnHitung);
  if (!btn) return;

  const isReverse = mode === 'reverse';
  const SIM_STORAGE_KEY = 'repoSimulasiTersimpan';

  const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const parseRupiahInput = (str) => parseFloat((str || '').replace(/\D/g, '')) || 0;

  const resultBox = document.getElementById(ids.resultBox);
  const warnMsg = document.getElementById(ids.warnMsg);
  const btnSimpanSimulasi = document.getElementById(ids.btnSimpan);
  const simSavedMsg = document.getElementById(ids.simSavedMsg);
  const tenorSel = document.getElementById(ids.tenorSel);
  const efekList = document.getElementById(ids.efekList);
  const btnTambahEfek = document.getElementById(ids.btnTambahEfek);
  const totalTargetBox = isReverse ? document.getElementById(ids.totalTargetBox) : null;
  const totalTargetValue = isReverse ? document.getElementById(ids.totalTargetValue) : null;

  let simData = null; // hasil DataLoader.loadAll()
  let sahamOptions = []; // [{ kode_efek, display }]
  let obligasiOptions = []; // [{ kode_efek, display, is_korporasi }]
  let sahamMap = {};      // display -> kode_efek
  let obligasiMap = {};   // display -> { kode_efek, is_korporasi }
  let currentSimPayload = null; // data hasil hitung terakhir, siap disimpan ke sessionStorage
  let rowIdCounter = 0;
  const rows = new Map(); // rowId -> { el, jenisEl, kodeEl, datalistEl, ... }

  function resetResultUI() {
    resultBox.hidden = true;
    warnMsg.hidden = true;
    btnSimpanSimulasi.hidden = true;
    simSavedMsg.hidden = true;
    currentSimPayload = null;
  }

  function showWarn(msg) {
    warnMsg.textContent = msg;
    warnMsg.hidden = false;
    resultBox.hidden = true;
    btnSimpanSimulasi.hidden = true;
    simSavedMsg.hidden = true;
    currentSimPayload = null;
  }

  function showResult({ label, value, metaHTML, payload }) {
    document.getElementById(ids.resultLabel).textContent = label;
    document.getElementById(ids.resultValue).textContent = value;
    document.getElementById(ids.resultMeta).innerHTML = metaHTML;
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
  function resolveKode(inputValue, map) {
    const val = (inputValue || '').trim();
    if (map[val]) return map[val];
    const guess = val.split(/[-–—]/)[0].trim().toUpperCase();
    return guess;
  }

  // ---- Hitung total kebutuhan dana (mode reverse) dari semua baris, live ----
  function updateTotalTarget() {
    if (!isReverse) return;
    let total = 0;
    let adaIsi = false;
    rows.forEach((row) => {
      const v = parseRupiahInput(row.targetInput.value);
      if (v > 0) adaIsi = true;
      total += v;
    });
    if (!adaIsi) {
      totalTargetBox.hidden = true;
      return;
    }
    totalTargetValue.textContent = rupiah(total);
    totalTargetBox.hidden = false;
  }

  // ---- Isi datalist baris sesuai jenis efek (saham/obligasi) yang dipilih ----
  function fillRowDatalist(row) {
    const jenis = row.jenisEl.value;
    if (jenis === 'saham') {
      row.datalistEl.innerHTML = sahamOptions.map((o) => `<option value="${o.display}"></option>`).join('');
      row.kodeEl.placeholder = simData ? 'Ketik kode atau nama saham, lalu pilih...' : 'Memuat daftar saham...';
      if (!isReverse) {
        row.jumlahLotField.hidden = false;
        row.jumlahNominalField.hidden = true;
      }
    } else {
      row.datalistEl.innerHTML = obligasiOptions.map((o) => `<option value="${o.display}"></option>`).join('');
      row.kodeEl.placeholder = simData ? 'Ketik kode atau nama obligasi, lalu pilih...' : 'Memuat daftar obligasi...';
      if (!isReverse) {
        row.jumlahLotField.hidden = true;
        row.jumlahNominalField.hidden = false;
      }
    }
    row.kodeEl.value = '';
  }

  function createRow() {
    rowIdCounter += 1;
    const id = `${mode}-${rowIdCounter}`;

    const wrap = document.createElement('div');
    wrap.className = 'sim-grid efek-row';
    wrap.dataset.rowId = String(id);
    wrap.style.cssText = 'border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:1rem 1rem 0.6rem; margin-bottom:1rem; position:relative;';

    const jumlahFieldsHTML = isReverse
      ? `<div class="field row-target-field">
           <label>Kebutuhan Dana dari Efek Ini (Rp)</label>
           <input type="text" inputmode="numeric" class="row-target" placeholder="Contoh: 5.000.000.000" />
         </div>`
      : `<div class="field row-jumlah-lot-field">
           <label>Jumlah Lot</label>
           <input type="number" class="row-jumlah-lot" min="1" step="100" value="100" />
         </div>
         <div class="field row-jumlah-nominal-field" hidden>
           <label>Nilai Nominal Obligasi (Rp)</label>
           <input type="text" inputmode="numeric" class="row-jumlah-nominal" placeholder="Contoh: 5.000.000.000" />
         </div>`;

    wrap.innerHTML = `
      <button type="button" class="btn-hapus-row" title="Hapus efek ini"
              style="position:absolute; top:0.5rem; right:0.5rem; background:none; border:none; cursor:pointer; font-size:1.1rem; line-height:1; color:#888;">✕</button>
      <div class="field">
        <label>Jenis Efek</label>
        <select class="row-jenis">
          <option value="saham">Saham/ETF</option>
          <option value="obligasi">Obligasi</option>
        </select>
      </div>
      <div class="field" style="grid-column: span 2;">
        <label>Kode Efek</label>
        <input type="text" class="row-kode" list="dl-row-${id}" placeholder="Memuat daftar saham..." autocomplete="off" />
        <datalist id="dl-row-${id}"></datalist>
      </div>
      ${jumlahFieldsHTML}
    `;
    efekList.appendChild(wrap);

    const row = {
      id,
      el: wrap,
      jenisEl: wrap.querySelector('.row-jenis'),
      kodeEl: wrap.querySelector('.row-kode'),
      datalistEl: wrap.querySelector(`#dl-row-${id}`),
    };

    if (isReverse) {
      row.targetField = wrap.querySelector('.row-target-field');
      row.targetInput = wrap.querySelector('.row-target');
      row.targetInput.addEventListener('input', () => {
        const raw = row.targetInput.value.replace(/\D/g, '');
        row.targetInput.value = raw ? Number(raw).toLocaleString('id-ID') : '';
        updateTotalTarget();
        resetResultUI();
      });
    } else {
      row.jumlahLotField = wrap.querySelector('.row-jumlah-lot-field');
      row.jumlahLotInput = wrap.querySelector('.row-jumlah-lot');
      row.jumlahNominalField = wrap.querySelector('.row-jumlah-nominal-field');
      row.jumlahNominalInput = wrap.querySelector('.row-jumlah-nominal');
      row.jumlahLotInput.addEventListener('input', resetResultUI);
      row.jumlahNominalInput.addEventListener('input', () => {
        const raw = row.jumlahNominalInput.value.replace(/\D/g, '');
        row.jumlahNominalInput.value = raw ? Number(raw).toLocaleString('id-ID') : '';
        resetResultUI();
      });
    }

    rows.set(id, row);
    fillRowDatalist(row);

    row.jenisEl.addEventListener('change', () => {
      fillRowDatalist(row);
      resetResultUI();
    });

    row.kodeEl.addEventListener('input', resetResultUI);

    wrap.querySelector('.btn-hapus-row').addEventListener('click', () => {
      rows.delete(id);
      wrap.remove();
      updateTotalTarget();
      resetResultUI();
    });

    return row;
  }

  btnTambahEfek.addEventListener('click', () => createRow());

  // ---- Load data referensi & isi datalist semua baris yang sudah ada ----
  DataLoader.loadAll()
    .then((data) => {
      simData = data;
      sahamOptions = DataLoader.getSahamOptions(data);
      sahamMap = {};
      sahamOptions.forEach((o) => { sahamMap[o.display] = o.kode_efek; });

      obligasiOptions = DataLoader.getObligasiOptions(data);
      obligasiMap = {};
      obligasiOptions.forEach((o) => {
        obligasiMap[o.display] = { kode_efek: o.kode_efek, is_korporasi: o.is_korporasi === true || o.is_korporasi === 'true' };
      });

      rows.forEach((row) => fillRowDatalist(row));
    })
    .catch((err) => {
      rows.forEach((row) => {
        row.kodeEl.placeholder = 'Gagal memuat data';
        row.kodeEl.disabled = true;
      });
      console.error('Gagal memuat data referensi simulator:', err);
    });

  // Mulai dengan 1 baris efek
  createRow();

  const tableRow = (label, val, bold) => (
    `<tr><td style="text-align:left; padding:0.3rem 0.8rem 0.3rem 0; color:var(--gray-600, #666); white-space:nowrap;">${label}</td>` +
    `<td style="text-align:right; padding:0.3rem 0; ${bold ? 'font-weight:700;' : ''}">${val}</td></tr>`
  );

  // ---- Hitung SEMUA baris efek sekaligus ----
  btn.addEventListener('click', async () => {
    if (!simData) {
      showWarn('Data referensi masih dimuat, mohon tunggu sebentar lalu coba lagi.');
      return;
    }
    if (rows.size === 0) {
      showWarn('Tambahkan minimal satu efek terlebih dahulu.');
      return;
    }
    warnMsg.hidden = true;
    const tenorBulan = parseInt(tenorSel.value, 10) || 1;
    const origLabel = btn.textContent;
    btn.disabled = true;

    try {
      const items = [];
      let rowIndex = 0;

      for (const row of rows.values()) {
        rowIndex += 1;
        const jenis = row.jenisEl.value;
        const namaTampil = row.kodeEl.value.trim();

        if (jenis === 'saham') {
          const kodeSaham = resolveKode(namaTampil, sahamMap);

          if (!isReverse) {
            const jumlahLot = parseInt(row.jumlahLotInput.value, 10) || 0;
            if (!kodeSaham || jumlahLot <= 0) {
              showWarn(`Efek #${rowIndex}: mohon pilih kode saham dan isi jumlah lot terlebih dahulu.`);
              return;
            }
            btn.textContent = `Mengambil data harga ${kodeSaham}...`;
            const marketMetrics = await MarketData.fetchStockMetrics(kodeSaham);
            if (marketMetrics.error) { showWarn(`Efek #${rowIndex} (${kodeSaham}): ${marketMetrics.error}`); return; }

            const instrumentRow = simData.instrumentByKode[kodeSaham];
            const haircutRow = simData.haircutKpei[kodeSaham];
            const listedFfRow = simData.listedFreefloat[kodeSaham];
            if (!instrumentRow || !haircutRow || !listedFfRow) {
              showWarn(`Efek #${rowIndex}: data pendukung untuk ${kodeSaham} tidak lengkap. Pastikan kode dipilih dari daftar yang muncul.`);
              return;
            }

            const result = CalcEngine.simulateStockFunding({ kodeSaham, jumlahLot, marketMetrics, instrumentRow, haircutRow, listedFfRow });
            if (result.error) { showWarn(`Efek #${rowIndex}: ${result.error}`); return; }

            items.push({
              jenis: 'saham', kode: kodeSaham, namaTampil: namaTampil || kodeSaham,
              jumlahDisplay: `${jumlahLot.toLocaleString('id-ID')} Lot`,
              estimasiPendanaan: result.estimasi_pendanaan, rateKey: result.group,
              detailRows:
                tableRow('Harga Penutupan Terakhir', rupiah(marketMetrics.latest_close)) +
                tableRow('Nilai Jaminan', rupiah(result.nilai_jaminan_final)) +
                tableRow('Rasio', `${(result.recommended_ratio * 100).toFixed(0)}%`) +
                tableRow('Group', result.group) +
                (result.kena_cap ? tableRow('⚠ Catatan', `<span style="color:var(--maroon-700)">Nilai jaminan dipangkas karena melebihi batas maksimum per saham.</span>`) : ''),
            });

          } else {
            const targetPendanaan = parseRupiahInput(row.targetInput.value);
            if (!kodeSaham || targetPendanaan <= 0) {
              showWarn(`Efek #${rowIndex}: mohon pilih kode saham dan isi kebutuhan dana terlebih dahulu.`);
              return;
            }
            btn.textContent = `Mengambil data harga ${kodeSaham}...`;
            const marketMetrics = await MarketData.fetchStockMetrics(kodeSaham);
            if (marketMetrics.error) { showWarn(`Efek #${rowIndex} (${kodeSaham}): ${marketMetrics.error}`); return; }

            const instrumentRow = simData.instrumentByKode[kodeSaham];
            const haircutRow = simData.haircutKpei[kodeSaham];
            const listedFfRow = simData.listedFreefloat[kodeSaham];
            if (!instrumentRow || !haircutRow || !listedFfRow) {
              showWarn(`Efek #${rowIndex}: data pendukung untuk ${kodeSaham} tidak lengkap. Pastikan kode dipilih dari daftar yang muncul.`);
              return;
            }

            const result = CalcEngine.computeRequiredStockLots({ kodeSaham, targetPendanaan, marketMetrics, instrumentRow, haircutRow, listedFfRow });
            if (result.error) { showWarn(`Efek #${rowIndex}: ${result.error}`); return; }

            items.push({
              jenis: 'saham', kode: kodeSaham, namaTampil: namaTampil || kodeSaham,
              jumlahDisplay: `${result.jumlah_lot_dibutuhkan.toLocaleString('id-ID')} Lot dibutuhkan`,
              estimasiPendanaan: result.estimasi_pendanaan_aktual, rateKey: result.group,
              detailRows:
                tableRow('Harga Penutupan Terakhir', rupiah(marketMetrics.latest_close)) +
                tableRow('Jumlah Lembar', result.jumlah_lembar_dibutuhkan.toLocaleString('id-ID')) +
                tableRow('Rasio', `${(result.recommended_ratio * 100).toFixed(0)}%`) +
                tableRow('Group', result.group) +
                (result.kena_cap
                  ? tableRow('⚠ Catatan', `<span style="color:var(--maroon-700)">Kebutuhan dana melebihi batas maksimum saham ini (maks. sekitar ${rupiah(result.max_pendanaan_dari_cap)}).</span>`)
                  : ''),
            });
          }

        } else {
          const kodeObligasi = resolveKode(namaTampil, Object.fromEntries(
            Object.entries(obligasiMap).map(([k, v]) => [k, v.kode_efek])
          ));
          const bondRow = simData.statisEfek[kodeObligasi];

          if (!bondRow) {
            showWarn(`Efek #${rowIndex}: data obligasi ${kodeObligasi || '(belum dipilih)'} tidak ditemukan. Pastikan kode dipilih dari daftar yang muncul.`);
            return;
          }

          if (!isReverse) {
            const nilaiNominal = parseRupiahInput(row.jumlahNominalInput.value);
            if (!kodeObligasi || nilaiNominal <= 0) {
              showWarn(`Efek #${rowIndex}: mohon pilih kode obligasi dan isi nilai nominal terlebih dahulu.`);
              return;
            }
            const result = CalcEngine.simulateBondFunding({ kodeObligasi, nilaiNominal, bondRow });
            if (result.error) { showWarn(`Efek #${rowIndex}: ${result.error}`); return; }

            items.push({
              jenis: 'obligasi', kode: kodeObligasi, namaTampil: namaTampil || kodeObligasi,
              jumlahDisplay: `Nominal ${rupiah(nilaiNominal)}`,
              estimasiPendanaan: result.estimasi_pendanaan, rateKey: result.jenis_obligasi,
              detailRows:
                tableRow('Nilai Jaminan', rupiah(result.nilai_jaminan)) +
                tableRow('Rasio', `${(result.rasio * 100).toFixed(0)}%`) +
                tableRow('Jenis', result.jenis_obligasi),
            });

          } else {
            const targetPendanaan = parseRupiahInput(row.targetInput.value);
            if (!kodeObligasi || targetPendanaan <= 0) {
              showWarn(`Efek #${rowIndex}: mohon pilih kode obligasi dan isi kebutuhan dana terlebih dahulu.`);
              return;
            }
            const result = CalcEngine.computeRequiredBondNominal({ kodeObligasi, targetPendanaan, bondRow });
            if (result.error) { showWarn(`Efek #${rowIndex}: ${result.error}`); return; }

            items.push({
              jenis: 'obligasi', kode: kodeObligasi, namaTampil: namaTampil || kodeObligasi,
              jumlahDisplay: `Nominal ${rupiah(result.nilai_nominal_dibutuhkan)} dibutuhkan`,
              estimasiPendanaan: result.estimasi_pendanaan_aktual, rateKey: result.jenis_obligasi,
              detailRows:
                tableRow('Rasio', `${(result.rasio * 100).toFixed(0)}%`) +
                tableRow('Jenis', result.jenis_obligasi),
            });
          }
        }
      }

      // ---- Hitung kewajiban pembayaran (bunga) per efek, berdasarkan group/jenis-nya ----
      let totalBungaSemua = 0;
      let totalPengembalianSemua = 0;
      let totalBungaPerBulanSemua = 0;
      let totalPokokSemua = 0;
      let adaRateTidakDitemukan = false;

      items.forEach((it) => {
        const rateAnnual = it.jenis === 'saham'
          ? CalcEngine.getInterestRateSaham(it.rateKey)
          : CalcEngine.getInterestRateObligasi(it.rateKey);
        const bunga = CalcEngine.hitungKewajibanPembayaran({ pokokPinjaman: it.estimasiPendanaan, tenorBulan, rateAnnual });
        it.bunga = bunga;
        if (bunga.error) {
          adaRateTidakDitemukan = true;
        } else {
          totalBungaSemua += bunga.total_bunga;
          totalPengembalianSemua += bunga.total_pengembalian;
          totalBungaPerBulanSemua += bunga.bunga_per_bulan;
          totalPokokSemua += it.estimasiPendanaan;
        }
      });

      // ---- Gabungkan hasil semua baris ----
      const totalEstimasiPendanaan = items.reduce((sum, it) => sum + it.estimasiPendanaan, 0);

      const itemsHTML = items.map((it, i) => {
        const jenisLabel = it.jenis === 'saham' ? 'Saham/ETF' : 'Obligasi';
        const bungaRows = it.bunga.error
          ? tableRow('⚠ Bunga', `<span style="color:var(--maroon-700)">${it.bunga.error}</span>`)
          : tableRow('Bunga (p.a.)', `${(it.bunga.rate_annual * 100).toFixed(0)}%`) +
            tableRow('Bunga per Bulan', rupiah(it.bunga.bunga_per_bulan)) +
            tableRow(`Total Bunga (${tenorBulan} bulan)`, rupiah(it.bunga.total_bunga));

        return (
          `<div style="margin-top:${i === 0 ? '0' : '1.1rem'}; padding-top:${i === 0 ? '0' : '1.1rem'}; ${i === 0 ? '' : 'border-top:1px dashed rgba(0,0,0,0.12);'} text-align:left;">` +
          `<div style="font-weight:700; margin-bottom:0.4rem;">#${i + 1} — ${jenisLabel}: ${it.namaTampil} (${it.jumlahDisplay})</div>` +
          `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">` +
          tableRow('Estimasi Pendanaan', rupiah(it.estimasiPendanaan)) +
          it.detailRows +
          bungaRows +
          `</table>` +
          `</div>`
        );
      }).join('');

      // ---- Jadwal cicilan per bulan: bunga-only tiap bulan, pokok dilunasi penuh di bulan terakhir (bullet) ----
      const jadwalRows = [];
      for (let bulan = 1; bulan <= tenorBulan; bulan++) {
        const isLast = bulan === tenorBulan;
        const bayarBulanIni = totalBungaPerBulanSemua + (isLast ? totalPokokSemua : 0);
        const keterangan = isLast ? 'Bunga + Pelunasan Pokok (jatuh tempo)' : 'Bunga';
        jadwalRows.push(
          `<tr>` +
          `<td style="text-align:left; padding:0.3rem 0.8rem 0.3rem 0; color:var(--gray-600, #666);">Bulan ${bulan}</td>` +
          `<td style="text-align:left; padding:0.3rem 0.8rem 0.3rem 0; color:var(--gray-600, #666); font-size:0.8rem;">${keterangan}</td>` +
          `<td style="text-align:right; padding:0.3rem 0; ${isLast ? 'font-weight:700;' : ''}">${rupiah(bayarBulanIni)}</td>` +
          `</tr>`
        );
      }
      const jadwalHTML =
        `<div style="margin-top:0.9rem;">` +
        `<div style="font-weight:600; margin-bottom:0.4rem; font-size:0.9rem;">Rincian Pembayaran per Bulan</div>` +
        `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">` +
        `<thead><tr>` +
        `<th style="text-align:left; padding:0.2rem 0.8rem 0.4rem 0; font-size:0.78rem; text-transform:uppercase; color:var(--gray-600,#666); border-bottom:1px solid rgba(0,0,0,0.12);">Bulan</th>` +
        `<th style="text-align:left; padding:0.2rem 0.8rem 0.4rem 0; font-size:0.78rem; text-transform:uppercase; color:var(--gray-600,#666); border-bottom:1px solid rgba(0,0,0,0.12);">Keterangan</th>` +
        `<th style="text-align:right; padding:0.2rem 0 0.4rem; font-size:0.78rem; text-transform:uppercase; color:var(--gray-600,#666); border-bottom:1px solid rgba(0,0,0,0.12);">Jumlah Dibayar</th>` +
        `</tr></thead><tbody>` +
        jadwalRows.join('') +
        `</tbody></table>` +
        `</div>`;

      // Kotak highlight khusus untuk angka akhir — biar jelas kelihatan, terpisah dari tabel lain.
      const highlightHTML = adaRateTidakDitemukan ? '' :
        `<div style="margin-top:1rem; padding:1rem 1.2rem; border-radius:12px; background:var(--maroon-700,#b03236); color:#fff; text-align:center;">` +
        `<div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; opacity:0.85;">Total yang Harus Dibayar di Akhir Tenor (${tenorBulan} Bulan)</div>` +
        `<div style="font-size:1.5rem; font-weight:700; margin-top:0.2rem;">${rupiah(totalPengembalianSemua)}</div>` +
        `</div>`;

      const ringkasanBungaHTML = adaRateTidakDitemukan
        ? ''
        : `<div style="margin-top:1.1rem; padding-top:1.1rem; border-top:2px solid rgba(0,0,0,0.15); text-align:left;">` +
          `<div style="font-weight:700; margin-bottom:0.4rem;">Ringkasan Kewajiban Pembayaran (Tenor ${tenorBulan} Bulan)</div>` +
          `<table style="width:100%; border-collapse:collapse; font-size:0.85rem;">` +
          tableRow('Total Bunga', rupiah(totalBungaSemua)) +
          `</table>` +
          jadwalHTML +
          highlightHTML +
          `</div>`;

      // Angka besar (headline): selalu total estimasi pendanaan dalam Rupiah untuk kedua mode —
      // untuk mode reverse, jumlah lot/nominal per efek TIDAK dijumlahkan jadi satu angka
      // (karena beda jenis/satuan efek tidak bisa dijumlah begitu saja); rinciannya tetap
      // ditampilkan lengkap per efek di tabel di bawah.
      const label = isReverse
        ? (items.length > 1 ? `Total Kebutuhan Pendanaan (${items.length} Efek)` : 'Kebutuhan Pendanaan')
        : (items.length > 1 ? `Total Estimasi Pendanaan Gabungan (${items.length} Efek)` : 'Estimasi Nilai Pendanaan');
      const value = rupiah(totalEstimasiPendanaan);
      const metaHTML = itemsHTML + ringkasanBungaHTML;

      showResult({
        label,
        value,
        metaHTML,
        payload: {
          mode,
          tenorBulan,
          items,
          totalEstimasiPendanaan,
          totalBungaSemua,
          totalPengembalianSemua,
          timestamp: Date.now(),
        },
      });

    } catch (err) {
      showWarn(`Terjadi kendala saat menghitung: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = origLabel;
    }
  });
}

createSimulatorInstance('forward', {
  btnHitung: 'btnHitungFwd',
  resultBox: 'resultBoxFwd',
  resultLabel: 'resultLabelFwd',
  resultValue: 'resultValueFwd',
  resultMeta: 'resultMetaFwd',
  warnMsg: 'warnMsgFwd',
  btnSimpan: 'btnSimpanSimulasiFwd',
  simSavedMsg: 'simSavedMsgFwd',
  tenorSel: 'tenorSimulasiFwd',
  efekList: 'efekListFwd',
  btnTambahEfek: 'btnTambahEfekFwd',
});

createSimulatorInstance('reverse', {
  btnHitung: 'btnHitungRev',
  resultBox: 'resultBoxRev',
  resultLabel: 'resultLabelRev',
  resultValue: 'resultValueRev',
  resultMeta: 'resultMetaRev',
  warnMsg: 'warnMsgRev',
  btnSimpan: 'btnSimpanSimulasiRev',
  simSavedMsg: 'simSavedMsgRev',
  tenorSel: 'tenorSimulasiRev',
  efekList: 'efekListRev',
  btnTambahEfek: 'btnTambahEfekRev',
  totalTargetBox: 'totalTargetBoxRev',
  totalTargetValue: 'totalTargetValueRev',
});

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

    // Format lama (satu efek, tanpa "items") sudah tidak didukung — abaikan saja.
    if (!saved || !Array.isArray(saved.items) || saved.items.length === 0) {
      box.hidden = true;
      saved = null;
      return;
    }

    const ringkasanPerEfek = saved.items
      .map((it) => `${it.jenis === 'saham' ? 'Saham/ETF' : 'Obligasi'} ${it.namaTampil} (${it.jumlahDisplay})`)
      .join(' + ');

    metaEl.innerHTML =
      `${saved.items.length} efek: <strong>${ringkasanPerEfek}</strong><br/>` +
      `Total Estimasi Pendanaan: ${rupiah(saved.totalEstimasiPendanaan)}`;
    box.hidden = false;
    btnMuat.textContent = 'Gunakan Data Ini di Form';
  }

  btnMuat.addEventListener('click', () => {
    if (!saved) return;

    const daftarEfek = saved.items
      .map((it) => `${it.jenis === 'saham' ? 'Saham/ETF' : 'Obligasi'}: ${it.namaTampil} — ${it.jumlahDisplay}`)
      .join('\n');
    fSaham.value = `${daftarEfek}\nTotal Estimasi Pendanaan Gabungan: ${rupiah(saved.totalEstimasiPendanaan)}`;

    if (fRencana && !fRencana.value.trim()) {
      fRencana.value = `Mengajukan pendanaan REPO sekitar ${rupiah(saved.totalEstimasiPendanaan)} (${saved.items.length} efek) berdasarkan hasil simulasi.`;
    }

    btnMuat.textContent = '✓ Data Dimuat ke Form';
    fSaham.focus();
  });

  refreshBox(); // saat halaman pertama dimuat
  window.addEventListener('repoSimulasiTersimpan', refreshBox); // saat tombol simpan di simulator diklik (live, tanpa refresh)
})();

/* ============================================================
   BROKER "LAINNYA" — tampilkan field nama broker manual kalau
   opsi "Lainnya (broker tidak ada di daftar)" dipilih.
   ============================================================ */
(function brokerLainnya() {
  const select = document.getElementById('fBroker');
  const fieldLainnya = document.getElementById('fieldBrokerLainnya');
  const inputLainnya = document.getElementById('fBrokerLainnya');
  if (!select || !fieldLainnya || !inputLainnya) return;

  select.addEventListener('change', () => {
    const isLainnya = select.value === 'Lainnya';
    fieldLainnya.hidden = !isLainnya;
    inputLainnya.required = isLainnya;
    if (!isLainnya) inputLainnya.value = '';
  });
})();
