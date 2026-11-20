require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5433),
  database: process.env.DB_NAME || "db_alat_pinjaman",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "123",
});

db.on("error", (err) => {
  console.error("Kesalahan koneksi PostgreSQL:", err.message);
});

app.get("/", (req, res) => {
  res.json({
    pesan: "API backend berhasil berjalan!",
    database: "PostgreSQL",
    endpoints: ["/api/dashboard", "/api/kategori", "/api/alat", "/api/peminjaman"],
  });
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const alat = await db.query("SELECT COUNT(*)::int AS total FROM alat");
    const kategori = await db.query("SELECT COUNT(*)::int AS total FROM kategori_alat");
    const dipinjam = await db.query(
      "SELECT COALESCE(SUM(jumlah), 0)::int AS total FROM peminjaman WHERE status = 'Dipinjam'"
    );

    res.json({
      total_alat: alat.rows[0].total,
      sedang_dipinjam: dipinjam.rows[0].total,
      total_kategori: kategori.rows[0].total,
    });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.get("/api/kategori", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id_kategori, nama_kategori, deskripsi FROM kategori_alat ORDER BY id_kategori"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.post("/api/kategori", async (req, res) => {
  try {
    const { nama_kategori, deskripsi } = req.body;
    if (!nama_kategori || !nama_kategori.trim()) {
      return res.status(400).json({ pesan: "Nama kategori wajib diisi." });
    }

    const result = await db.query(
      "INSERT INTO kategori_alat (nama_kategori, deskripsi) VALUES ($1, $2) RETURNING *",
      [nama_kategori.trim(), deskripsi || null]
    );
    res.status(201).json({ pesan: "Kategori berhasil ditambahkan.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.put("/api/kategori/:id", async (req, res) => {
  try {
    const { nama_kategori, deskripsi } = req.body;
    const result = await db.query(
      `UPDATE kategori_alat
       SET nama_kategori = $1, deskripsi = $2
       WHERE id_kategori = $3 RETURNING *`,
      [nama_kategori || null, deskripsi || null, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ pesan: "Kategori tidak ditemukan." });
    res.json({ pesan: "Data kategori berhasil diperbarui.", kategori: result.rows[0] });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.delete("/api/kategori/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM kategori_alat WHERE id_kategori = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ pesan: "Kategori tidak ditemukan." });
    res.json({ pesan: "Kategori berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.get("/api/alat", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.id_alat, a.id_kategori, a.nama_alat, a.kondisi, a.stok, a.lokasi,
             k.nama_kategori
      FROM alat a
      LEFT JOIN kategori_alat k ON a.id_kategori = k.id_kategori
      ORDER BY a.id_alat
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.post("/api/alat", async (req, res) => {
  try {
    const { id_kategori, nama_alat, kondisi, stok, lokasi } = req.body;
    if (!nama_alat || stok === undefined || Number(stok) < 0) {
      return res.status(400).json({ pesan: "Nama alat dan stok yang valid wajib diisi." });
    }

    const result = await db.query(
      `INSERT INTO alat (id_kategori, nama_alat, kondisi, stok, lokasi)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id_kategori || null, nama_alat.trim(), kondisi || "Baik", Number(stok), lokasi || null]
    );
    res.status(201).json({ pesan: "Alat berhasil ditambahkan.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.put("/api/alat/:id", async (req, res) => {
  try {
    const { id_kategori, nama_alat, kondisi, stok, lokasi } = req.body;
    const result = await db.query(
      `UPDATE alat
       SET id_kategori = $1, nama_alat = $2, kondisi = $3, stok = $4, lokasi = $5
       WHERE id_alat = $6 RETURNING *`,
      [id_kategori || null, nama_alat, kondisi || "Baik", Number(stok), lokasi || null, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ pesan: "Alat tidak ditemukan." });
    res.json({ pesan: "Data alat berhasil diperbarui.", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.delete("/api/alat/:id", async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM alat WHERE id_alat = $1 RETURNING *",
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ pesan: "Alat tidak ditemukan." });
    res.json({ pesan: "Alat berhasil dihapus." });
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.get("/api/peminjaman", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.id_peminjaman, p.nama_peminjam, p.kelas, p.tanggal_pinjam,
             p.tanggal_kembali, p.jumlah, p.status, p.id_alat,
             a.nama_alat, a.lokasi
      FROM peminjaman p
      JOIN alat a ON p.id_alat = a.id_alat
      ORDER BY p.id_peminjaman DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.post("/api/peminjaman", async (req, res) => {
  try {
    const { id_alat, nama_peminjam, kelas, tanggal_pinjam, tanggal_kembali, jumlah } = req.body;

    if (!id_alat || !nama_peminjam || !kelas || !tanggal_pinjam || !jumlah) {
      return res.status(400).json({ pesan: "Lengkapi nama peminjam, kelas, alat, tanggal, dan jumlah." });
    }

    const result = await db.query(
      `INSERT INTO peminjaman
       (id_alat, nama_peminjam, kelas, tanggal_pinjam, tanggal_kembali, jumlah, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Dipinjam')
       RETURNING *`,
      [id_alat, nama_peminjam.trim(), kelas.trim(), tanggal_pinjam, tanggal_kembali || null, Number(jumlah)]
    );

    res.status(201).json({ pesan: "Peminjaman berhasil disimpan.", data: result.rows[0] });
  } catch (err) {
    res.status(400).json({ pesan: err.message });
  }
});

app.patch("/api/peminjaman/:id/kembali", async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE peminjaman
       SET status = 'Dikembalikan'
       WHERE id_peminjaman = $1 AND status = 'Dipinjam'
       RETURNING *`,
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ pesan: "Transaksi tidak ditemukan atau sudah dikembalikan." });
    }

    res.json({ pesan: "Alat berhasil dikembalikan.", data: result.rows[0] });
  } catch (err) {
    res.status(400).json({ pesan: err.message });
  }
});

app.get("/api/peminjaman/:id", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, a.nama_alat, a.lokasi
      FROM peminjaman p
      JOIN alat a ON p.id_alat = a.id_alat
      WHERE p.id_peminjaman = $1
    `, [req.params.id]);

    if (!result.rowCount) return res.status(404).json({ pesan: "Transaksi tidak ditemukan." });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ pesan: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server API backend berjalan di http://localhost:${PORT}`);
});
