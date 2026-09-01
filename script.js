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
(function simulator() {
  const btn = document.getElementById('btnHitung');
  if (!btn) return;

  const SIM_STORAGE_KEY = 'repoSimulasiTersimpan';

  const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const parseRupiahInput = (str) => parseFloat((str || '').replace(/\D/g, '')) || 0;
  const resultBox = document.getElementById('resultBox');
  const warnMsg = document.getElementById('warnMsg');
  const btnSimpanSimulasi = document.getElementById('btnSimpanSimulasi');
  const simSavedMsg = document.getElementById('simSavedMsg');
  const modeSel = document.getElementById('modeSimulasi');
  const tenorSel = document.getElementById('tenorSimulasi');
  const efekList = document.getElementById('efekList');
  const btnTambahEfek = document.getElementById('btnTambahEfek');
  const totalTargetBox = document.getElementById('totalTargetBox');
  const totalTargetValue = document.getElementById('totalTargetValue');

  let simData = null; // hasil DataLoader.loadAll()
  let sahamOptions = []; // [{ kode_efek, display }]
  let obligasiOptions = []; // [{ kode_efek, display, is_korporasi }]
  let sahamMap = {};      // display -> kode_efek
  let obligasiMap = {};   // display -> { kode_efek, is_korporasi }
  let currentSimPayload = null; // data hasil hitung terakhir, siap disimpan ke sessionStorage
  let rowIdCounter = 0;
  const rows = new Map(); // rowId -> { el, jenisEl, kodeEl, datalistEl, jumlahField, jumlahLabelEl, jumlahInput, targetField, targetInput }

  function isReverseMode() {
    return modeSel.value === 'dana-ke-lot';
  }

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
  function resolveKode(inputValue, map) {
    const val = (inputValue || '').trim();
    if (map[val]) return map[val];
    const guess = val.split(/[-–—]/)[0].trim().toUpperCase();
    return guess;
  }

  // ---- Hitung total kebutuhan dana (mode reverse) dari semua baris, live ----
  function updateTotalTarget() {
    if (!isReverseMode()) {
      totalTargetBox.hidden = true;
      return;
    }
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

  // ---- Toggle field jumlah/target di semua baris sesuai mode global ----
  function applyModeVisibilityAll() {
    const reverse = isReverseMode();
    btn.textContent = reverse ? 'Hitung Kebutuhan Lot/Unit' : 'Hitung Estimasi Pendanaan';
    rows.forEach((row) => {
      row.jumlahField.hidden = reverse;
      row.targetField.hidden = !reverse;
    });
    updateTotalTarget();
    resetResultUI();
  }
  modeSel.addEventListener('change', applyModeVisibilityAll);

  // ---- Isi datalist baris sesuai jenis efek (saham/obligasi) yang dipilih ----
  function fillRowDatalist(row) {
    const jenis = row.jenisEl.value;
    if (jenis === 'saham') {
      row.datalistEl.innerHTML = sahamOptions.map((o) => `<option value="${o.display}"></option>`).join('');
      row.kodeEl.placeholder = simData ? 'Ketik kode atau nama saham, lalu pilih...' : 'Memuat daftar saham...';
      row.jumlahLabelEl.textContent = 'Jumlah Lot';
      row.jumlahInput.step = '100';
      row.jumlahInput.value = '100';
    } else {
      row.datalistEl.innerHTML = obligasiOptions.map((o) => `<option value="${o.display}"></option>`).join('');
      row.kodeEl.placeholder = simData ? 'Ketik kode atau nama obligasi, lalu pilih...' : 'Memuat daftar obligasi...';
      row.jumlahLabelEl.textContent = 'Jumlah Unit';
      row.jumlahInput.step = '10';
      row.jumlahInput.value = '100';
    }
    row.kodeEl.value = '';
  }

  function createRow() {
    rowIdCounter += 1;
    const id = rowIdCounter;

    const wrap = document.createElement('div');
    wrap.className = 'sim-grid efek-row';
    wrap.dataset.rowId = String(id);
    wrap.style.cssText = 'border:1px solid rgba(0,0,0,0.1); border-radius:10px; padding:1rem 1rem 0.6rem; margin-bottom:1rem; position:relative;';
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
      <div class="field row-jumlah-field">
        <label class="row-jumlah-label">Jumlah Lot</label>
        <input type="number" class="row-jumlah" min="1" step="100" value="100" />
      </div>
      <div class="field row-target-field" hidden>
        <label>Kebutuhan Dana dari Efek Ini (Rp)</label>
        <input type="text" inputmode="numeric" class="row-target" placeholder="Contoh: 5.000.000.000" />
      </div>
    `;
    efekList.appendChild(wrap);

    const row = {
      id,
      el: wrap,
      jenisEl: wrap.querySelector('.row-jenis'),
      kodeEl: wrap.querySelector('.row-kode'),
      datalistEl: wrap.querySelector(`#dl-row-${id}`),
      jumlahField: wrap.querySelector('.row-jumlah-field'),
      jumlahLabelEl: wrap.querySelector('.row-jumlah-label'),
      jumlahInput: wrap.querySelector('.row-jumlah'),
      targetField: wrap.querySelector('.row-target-field'),
      targetInput: wrap.querySelector('.row-target'),
    };
    rows.set(id, row);

    fillRowDatalist(row);
    row.jumlahField.hidden = isReverseMode();
    row.targetField.hidden = !isReverseMode();

    row.jenisEl.addEventListener('change', () => {
      fillRowDatalist(row);
      resetResultUI();
    });

    row.kodeEl.addEventListener('input', () => {
      resetResultUI();
    });

    // ---- Format ribuan live saat mengetik (mis. "5000000000" -> "5.000.000.000") ----
    row.targetInput.addEventListener('input', () => {
      const raw = row.targetInput.value.replace(/\D/g, '');
      row.targetInput.value = raw ? Number(raw).toLocaleString('id-ID') : '';
      updateTotalTarget();
      resetResultUI();
    });
    row.jumlahInput.addEventListener('input', resetResultUI);

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
    const reverse = isReverseMode();
    const origLabel = btn.textContent;
    btn.disabled = true;

    try {
      const items = []; // hasil per-baris, siap ditampilkan & disimpan
      let rowIndex = 0;

      for (const row of rows.values()) {
        rowIndex += 1;
        const jenis = row.jenisEl.value;
        const namaTampil = row.kodeEl.value.trim();

        if (jenis === 'saham') {
          const kodeSaham = resolveKode(namaTampil, sahamMap);

          if (!reverse) {
            const jumlahLot = parseInt(row.jumlahInput.value, 10) || 0;
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
              jumlah: jumlahLot, satuan: 'Lot', estimasiPendanaan: result.estimasi_pendanaan, rateKey: result.group,
              detailHTML:
                `Harga Penutupan Terakhir: ${rupiah(marketMetrics.latest_close)} • ` +
                `Nilai Jaminan: ${rupiah(result.nilai_jaminan_final)} • Rasio: ${(result.recommended_ratio * 100).toFixed(0)}% • Group: ${result.group}` +
                (result.kena_cap ? `<br/><span style="color:var(--maroon-700)">⚠ Nilai jaminan dipangkas karena melebihi batas maksimum per saham.</span>` : ''),
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
              jumlah: result.jumlah_lot_dibutuhkan, satuan: 'Lot', estimasiPendanaan: result.estimasi_pendanaan_aktual, rateKey: result.group,
              detailHTML:
                `Harga Penutupan Terakhir: ${rupiah(marketMetrics.latest_close)} • ` +
                `Jumlah Lembar: ${result.jumlah_lembar_dibutuhkan.toLocaleString('id-ID')} • Rasio: ${(result.recommended_ratio * 100).toFixed(0)}% • Group: ${result.group}` +
                (result.kena_cap
                  ? `<br/><span style="color:var(--maroon-700)">⚠ Kebutuhan dana untuk efek ini melebihi batas maksimum saham ini ` +
                    `(maks. sekitar ${rupiah(result.max_pendanaan_dari_cap)}).</span>`
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

          if (!reverse) {
            const jumlahUnit = parseInt(row.jumlahInput.value, 10) || 0;
            if (!kodeObligasi || jumlahUnit <= 0) {
              showWarn(`Efek #${rowIndex}: mohon pilih kode obligasi dan isi jumlah unit terlebih dahulu.`);
              return;
            }
            const result = CalcEngine.simulateBondFunding({ kodeObligasi, jumlahUnit, bondRow });
            if (result.error) { showWarn(`Efek #${rowIndex}: ${result.error}`); return; }

            items.push({
              jenis: 'obligasi', kode: kodeObligasi, namaTampil: namaTampil || kodeObligasi,
              jumlah: jumlahUnit, satuan: 'Unit', estimasiPendanaan: result.estimasi_pendanaan, rateKey: result.jenis_obligasi,
              detailHTML: `Nilai Jaminan: ${rupiah(result.nilai_jaminan)} • Rasio: ${(result.rasio * 100).toFixed(0)}% • Jenis: ${result.jenis_obligasi}`,
            });

          } else {
            const targetPendanaan = parseRupiahInput(row.targetInput.value);
            if (!kodeObligasi || targetPendanaan <= 0) {
              showWarn(`Efek #${rowIndex}: mohon pilih kode obligasi dan isi kebutuhan dana terlebih dahulu.`);
              return;
            }
            const result = CalcEngine.computeRequiredBondUnits({ kodeObligasi, targetPendanaan, bondRow });
            if (result.error) { showWarn(`Efek #${rowIndex}: ${result.error}`); return; }

            items.push({
              jenis: 'obligasi', kode: kodeObligasi, namaTampil: namaTampil || kodeObligasi,
              jumlah: result.jumlah_unit_dibutuhkan, satuan: 'Unit', estimasiPendanaan: result.estimasi_pendanaan_aktual, rateKey: result.jenis_obligasi,
              detailHTML: `Rasio: ${(result.rasio * 100).toFixed(0)}% • Jenis: ${result.jenis_obligasi}`,
            });
          }
        }
      }

      // ---- Gabungkan hasil semua baris ----
      const totalEstimasiPendanaan = items.reduce((sum, it) => sum + it.estimasiPendanaan, 0);
      const tenorBulan = parseInt(tenorSel.value, 10) || 1;

      // ---- Hitung kewajiban pembayaran (bunga) per efek, berdasarkan group/jenis-nya ----
      let totalBungaSemua = 0;
      let totalPengembalianSemua = 0;
      let adaRateTidakDitemukan = false;

      items.forEach((it) => {
        const rateAnnual = it.jenis === 'saham'
          ? CalcEngine.getInterestRateSaham(it.rateKey)
          : CalcEngine.getInterestRateObligasi(it.rateKey);
        const bunga = CalcEngine.hitungKewajibanPembayaran({ pokokPinjaman: it.estimasiPendanaan, tenorBulan, rateAnnual });
        it.bunga = bunga; // simpan di item supaya bisa dipakai render & disimpan ke sessionStorage
        if (bunga.error) {
          adaRateTidakDitemukan = true;
        } else {
          totalBungaSemua += bunga.total_bunga;
          totalPengembalianSemua += bunga.total_pengembalian;
        }
      });

      const itemsHTML = items.map((it, i) => {
        const jenisLabel = it.jenis === 'saham' ? 'Saham/ETF' : 'Obligasi';
        const jumlahLabel = reverse ? `${it.jumlah.toLocaleString('id-ID')} ${it.satuan} dibutuhkan` : `${it.jumlah.toLocaleString('id-ID')} ${it.satuan}`;
        const bungaHTML = it.bunga.error
          ? `<br/><span style="color:var(--maroon-700)">⚠ ${it.bunga.error}</span>`
          : `<br/>Bunga: ${(it.bunga.rate_annual * 100).toFixed(0)}% p.a. • Bunga per Bulan: ${rupiah(it.bunga.bunga_per_bulan)} • ` +
            `Total Bunga (${tenorBulan} bulan): ${rupiah(it.bunga.total_bunga)} • ` +
            `<strong>Total Dikembalikan: ${rupiah(it.bunga.total_pengembalian)}</strong>`;
        return (
          `<div style="margin-top:${i === 0 ? '0' : '0.8rem'}; padding-top:${i === 0 ? '0' : '0.8rem'}; ${i === 0 ? '' : 'border-top:1px dashed rgba(0,0,0,0.12);'}">` +
          `<strong>#${i + 1} — ${jenisLabel}: ${it.namaTampil}</strong> (${jumlahLabel}) • Estimasi Pendanaan: ${rupiah(it.estimasiPendanaan)}<br/>` +
          `<span style="font-size:0.85rem;">${it.detailHTML}${bungaHTML}</span>` +
          `</div>`
        );
      }).join('');

      const ringkasanBungaHTML = adaRateTidakDitemukan
        ? ''
        : `<div style="margin-top:0.8rem; padding-top:0.8rem; border-top:2px solid rgba(0,0,0,0.15);">` +
          `<strong>Ringkasan Kewajiban Pembayaran (Tenor ${tenorBulan} Bulan)</strong><br/>` +
          `Total Bunga: ${rupiah(totalBungaSemua)} • <strong>Total Harus Dikembalikan di Akhir Tenor: ${rupiah(totalPengembalianSemua)}</strong>` +
          `</div>`;

      let label, value, metaHTML;

      if (reverse) {
        // Angka besar di mode reverse = jumlah lot/unit yang dibutuhkan (bukan Rupiah),
        // karena itu yang sebenarnya dicari user di mode ini.
        const bySatuan = {};
        items.forEach((it) => { bySatuan[it.satuan] = (bySatuan[it.satuan] || 0) + it.jumlah; });
        value = Object.entries(bySatuan).map(([sat, jml]) => `${jml.toLocaleString('id-ID')} ${sat}`).join(' + ');
        label = items.length > 1 ? `Kebutuhan Jaminan (${items.length} Efek)` : 'Kebutuhan Jaminan';
        metaHTML = `<strong>Total Estimasi Pendanaan: ${rupiah(totalEstimasiPendanaan)}</strong><br/>` + itemsHTML + ringkasanBungaHTML;
      } else {
        // Mode forward: angka besar = total estimasi pendanaan (Rupiah) — ini yang dicari user.
        value = rupiah(totalEstimasiPendanaan);
        label = items.length > 1 ? `Total Estimasi Pendanaan Gabungan (${items.length} Efek)` : 'Estimasi Nilai Pendanaan';
        metaHTML = itemsHTML + ringkasanBungaHTML;
      }

      showResult({
        label,
        value,
        metaHTML,
        payload: {
          mode: reverse ? 'dana-ke-lot' : 'lot-ke-dana',
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

    // Format lama (satu efek, tanpa "items") sudah tidak didukung — abaikan saja.
    if (!saved || !Array.isArray(saved.items) || saved.items.length === 0) {
      box.hidden = true;
      saved = null;
      return;
    }

    const ringkasanPerEfek = saved.items
      .map((it) => `${it.jenis === 'saham' ? 'Saham/ETF' : 'Obligasi'} ${it.namaTampil} (${it.jumlah.toLocaleString('id-ID')} ${it.satuan})`)
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
      .map((it) => `${it.jenis === 'saham' ? 'Saham/ETF' : 'Obligasi'}: ${it.namaTampil} — ${it.jumlah.toLocaleString('id-ID')} ${it.satuan}`)
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
