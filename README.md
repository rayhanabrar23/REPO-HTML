# Portal Pendanaan Transaksi REPO — PT Pendanaan Efek Indonesia (PEI)

Versi HTML/CSS/JS statis — tanpa build tool, tanpa perlu dijalankan lokal.
Simulasi awal pendanaan REPO + form pengajuan yang otomatis mengirim notifikasi email.

## Struktur folder

```
repo-portal-html/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/
    ├── logo.png            # (belum ada) — taruh logo PEI di sini
    └── documents/           # (belum ada) — taruh PDF dokumen pendukung di sini
```

## Yang masih perlu ditambahkan

1. **Logo PEI** → simpan sebagai `assets/logo.png`. Kalau belum ada, halaman otomatis
   menampilkan logo teks "PEI" sebagai fallback (tidak error).
2. **Dokumen pendukung (PDF)** → taruh file di `assets/documents/`, lalu daftarkan
   di `script.js` pada variabel `DOCUMENTS` di bagian paling atas file, contoh:
   ```js
   const DOCUMENTS = [
     { name: "Ketentuan Umum Transaksi REPO", file: "ketentuan-umum-repo.pdf" },
   ];
   ```
   (Situs statis tidak bisa membaca isi folder otomatis, jadi perlu didaftarkan manual.)
3. **Engine perhitungan simulator** → saat ini pakai haircut dummy (50% saham /
   30% obligasi), logic ada di `script.js` fungsi `simulator()`. Formula resmi menyusul.

## Setup pengiriman email (GRATIS, tanpa backend)

Form pakai **Web3Forms** — form disubmit dari browser langsung ke email tujuan,
tanpa server sendiri.

1. Buka https://web3forms.com
2. Masukkan email tujuan: `rayhanabrar023@gmail.com` → klik "Create Access Key"
3. Cek email tersebut, akan ada **Access Key** (format UUID, contoh: `a1b2c3d4-....`)
4. Buka `index.html`, cari baris:
   ```html
   <input type="hidden" name="access_key" value="GANTI_DENGAN_ACCESS_KEY_ANDA" />
   ```
   Ganti `GANTI_DENGAN_ACCESS_KEY_ANDA` dengan Access Key dari email tadi.
5. Commit & push perubahan itu ke GitHub.

Tier gratis Web3Forms: 250 submission/bulan — cukup untuk portal pengajuan calon nasabah.

## Deploy ke GitHub Pages (gratis, tanpa build)

1. Push seluruh isi folder ini ke repo GitHub (boleh pakai repo yang sudah ada,
   REPO-PEI, di branch terpisah atau folder terpisah).
2. Di repo → **Settings → Pages**.
3. Source: pilih **"Deploy from a branch"**, Branch: `main`, folder: `/ (root)`.
4. Save. Tunggu 1-2 menit, URL akan muncul di halaman yang sama (format
   `https://<username>.github.io/<repo>/`).

## Menjalankan lokal (opsional, tidak wajib)

Karena statis, bisa langsung dibuka via double-click `index.html` di file explorer.
Kalau mau simulasi environment server lokal: `python -m http.server` lalu buka
`localhost:8000`.

## Catatan desain

- Warna: maroon (`#7A1E28`/`#4A1018`), putih, abu — didefinisikan sebagai CSS variables
  di bagian atas `style.css`, gampang diubah kalau perlu revisi.
- Font: Roboto Condensed (heading & body), Roboto Mono (angka/data — harga, hasil simulasi).
- Animasi: scroll-reveal per section, hover micro-interaction di tombol/card,
  pita ticker saham berjalan di hero (dekoratif, bukan data real-time).
- Semua animasi menghormati `prefers-reduced-motion` (nonaktif otomatis untuk
  pengguna yang mengaktifkan pengaturan tersebut di sistem operasinya).
