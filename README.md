# BRYXLab — Sistem Peminjaman Alat Praktik SMK

Project dibuat berdasarkan struktur tabel dan trigger pada `database.sql`.

## 1. Database
1. Buka PostgreSQL melalui Database Client VS Code.
2. Buat database bernama `db_peminjama_alat` (atau sesuaikan `DB_NAME` pada `.env`).
3. Jalankan seluruh isi `database.sql` pada database tersebut.
4. Pastikan tabel `kategori_alat`, `alat`, `peminjaman` dan trigger `trg_update_stok` sudah terbentuk.

## 2. Backend
Buka terminal di folder `backend`:
```bash
npm install
```
Salin `.env.example` menjadi `.env`, lalu sesuaikan password PostgreSQL dan port database.
```bash
npm run dev
```
Backend berjalan di `http://localhost:5000`.

## 3. Frontend
Buka terminal kedua di folder `frontend`:
```bash
npm install
npm run build
```
Buka `index.html` menggunakan Live Server.

Jika mengubah CSS Tailwind, jalankan `npm run watch` agar CSS dibuat ulang otomatis.

## API
- GET `/api/dashboard`
- GET, POST `/api/kategori`
- DELETE `/api/kategori/:id`
- GET, POST `/api/alat`
- PUT, DELETE `/api/alat/:id`
- GET, POST `/api/peminjaman`
- GET `/api/peminjaman/:id`
- PATCH `/api/peminjaman/:id/kembali`

## Catatan Trigger
Backend tidak mengurangi stok ketika peminjaman dibuat. Trigger PostgreSQL `update_stok_alat()` yang mengurangi stok dan menolak peminjaman jika stok tidak cukup. Ketika status berubah dari `Dipinjam` menjadi `Dikembalikan`, trigger menambahkan stok kembali.
