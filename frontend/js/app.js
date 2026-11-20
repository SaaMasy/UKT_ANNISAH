const API = "http://localhost:5000/api";
const $ = (selector) => document.querySelector(selector);

let daftarAlat = [];
let daftarKategori = [];
let daftarPeminjaman = [];

function tanggal(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

function statusClass(status) {
    return status === "Dikembalikan" ? "status-dikembalikan" : status === "Terlambat" ? "status-terlambat" : "status-dipinjam";
}

async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.pesan || "Terjadi kesalahan.");
    return data;
}

function formObject(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function showPage(page) {
    document.querySelectorAll(".page").forEach(el => el.classList.add("hidden-page"));
    $("#receiptView").classList.add("hidden-page");
    $(`#page-${page}`).classList.remove("hidden-page");
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("bg-blue-300", btn.dataset.page === page);
        btn.classList.toggle("bg-white", btn.dataset.page !== page);
    });
}
document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));

async function loadDashboard() {
    const data = await api("/dashboard");
    $("#statAlat").textContent = data.total_alat;
    $("#statPinjam").textContent = data.sedang_dipinjam;
    $("#statKategori").textContent = data.total_kategori;
}

async function loadKategori() {
    daftarKategori = await api("/kategori");
    $("#tabelKategori").innerHTML = daftarKategori.map(k => `
    <tr><td>#${k.id_kategori}</td><td class="font-bold">${k.nama_kategori}</td>
    <td>${k.deskripsi || "-"}</td><td>
    <button class="text-blue-700 font-bold mr-2" onclick="editKategori(${k.id_kategori})">Edit</button>
    <button class="text-pink-600 font-bold" onclick="hapusKategori(${k.id_kategori})">Hapus</button></td></tr>
  `).join("") || `<tr><td colspan="4">Belum ada kategori.</td></tr>`;
}

async function loadAlat() {
    daftarAlat = await api("/alat");
    $("#tabelAlat").innerHTML = daftarAlat.map(a => `
    <tr><td class="font-bold">${a.nama_alat}</td><td>${a.nama_kategori || "-"}</td>
    <td>${a.lokasi || "-"}</td><td><span class="status">${a.kondisi}</span></td>
    <td class="font-black">${a.stok}</td><td class="whitespace-nowrap">
    <button class="text-blue-700 font-bold mr-2" onclick="editAlat(${a.id_alat})">Edit</button>
    <button class="text-pink-600 font-bold" onclick="hapusAlat(${a.id_alat})">Hapus</button></td></tr>
  `).join("") || `<tr><td colspan="6">Belum ada data alat.</td></tr>`;

    $("#pilihAlat").innerHTML = `<option value="">-- Pilih Alat --</option>` +
        daftarAlat.map(a => `<option value="${a.id_alat}" ${a.stok <= 0 ? "disabled" : ""}>${a.nama_alat} — stok ${a.stok}</option>`).join("");
}

async function loadPeminjaman() {
    daftarPeminjaman = await api("/peminjaman");
    renderPeminjaman();
}

function renderPeminjaman() {
    const filter = $("#filterStatus").value;
    const rows = daftarPeminjaman.filter(p => !filter || p.status === filter);
    $("#tabelPeminjaman").innerHTML = rows.map(p => `
    <tr>
      <td><strong>${p.nama_peminjam}</strong><br><span class="text-gray-500">${p.kelas}</span></td>
      <td><strong>${p.nama_alat}</strong><br><span class="text-gray-500">Jumlah: ${p.jumlah} unit</span></td>
      <td>Pinjam: ${tanggal(p.tanggal_pinjam)}${p.tanggal_kembali ? `<br><span class="text-emerald-700">Rencana: ${tanggal(p.tanggal_kembali)}</span>` : ""}</td>
      <td><span class="status ${statusClass(p.status)}">${p.status}</span></td>
      <td class="whitespace-nowrap">
        ${p.status === "Dipinjam" ? `<button class="text-emerald-700 font-bold" onclick="kembalikan(${p.id_peminjaman})">Kembalikan</button>` : `<span class="text-gray-400">Selesai</span>`}
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5">Belum ada transaksi.</td></tr>`;
}

async function refreshAll() {
    try {
        await Promise.all([loadDashboard(), loadKategori(), loadAlat(), loadPeminjaman()]);
    } catch (err) {
        alert("Gagal mengambil data dari API: " + err.message + "\nPastikan backend dan PostgreSQL sudah berjalan.");
    }
}

$("#formPeminjaman").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formObject(form);
    data.id_alat = Number(data.id_alat);
    data.jumlah = Number(data.jumlah);
    try {
        await api("/peminjaman", { method: "POST", body: JSON.stringify(data) });
        $("#pesanPinjam").textContent = "Peminjaman berhasil disimpan.";
        $("#pesanPinjam").className = "text-sm font-bold text-emerald-700";
        form.reset();
        form.elements.jumlah.value = 1;
        form.elements.tanggal_pinjam.value = new Date().toISOString().slice(0, 10);
        await refreshAll();
    } catch (err) {
        $("#pesanPinjam").textContent = err.message;
        $("#pesanPinjam").className = "text-sm font-bold text-pink-700";
    }
});

$("#formKategori").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        await api("/kategori", { method: "POST", body: JSON.stringify(formObject(form)) });
        $("#pesanKategori").textContent = "Kategori berhasil ditambahkan.";
        $("#pesanKategori").className = "text-sm font-bold text-emerald-700";
        form.reset();
        await refreshAll();
    } catch (err) {
        $("#pesanKategori").textContent = err.message;
        $("#pesanKategori").className = "text-sm font-bold text-pink-700";
    }
});

$("#filterStatus").addEventListener("change", renderPeminjaman);

window.hapusKategori = async (id) => {
    if (!confirm("Hapus kategori ini? Sesuai database, alat dalam kategori ini juga akan terhapus.")) return;
    try { await api(`/kategori/${id}`, { method: "DELETE" }); await refreshAll(); }
    catch (err) { alert(err.message); }
};

window.hapusAlat = async (id) => {
    if (!confirm("Yakin ingin menghapus alat ini? Alat yang memiliki transaksi peminjaman akan ditolak oleh database.")) return;
    try { await api(`/alat/${id}`, { method: "DELETE" }); await refreshAll(); }
    catch (err) { alert("Tidak dapat menghapus alat: " + err.message); }
};

window.editAlat = async (id) => {
    const a = daftarAlat.find(item => item.id_alat === id);
    if (!a) return;
    const nama_alat = prompt("Nama alat:", a.nama_alat);
    if (nama_alat === null) return;
    const stok = prompt("Stok alat:", a.stok);
    if (stok === null) return;
    const lokasi = prompt("Lokasi:", a.lokasi || "");
    if (lokasi === null) return;
    const kondisi = prompt("Kondisi:", a.kondisi || "Baik");
    if (kondisi === null) return;
    const pilihan = daftarKategori.map(k => `${k.id_kategori}: ${k.nama_kategori}`).join("\n");
    const id_kategori = prompt("Masukkan ID kategori:\n" + pilihan, a.id_kategori || "");
    if (id_kategori === null) return;
    try {
        await api(`/alat/${id}`, {
            method: "PUT", body: JSON.stringify({
                nama_alat, stok: Number(stok), lokasi, kondisi, id_kategori: Number(id_kategori) || null
            })
        });
        await refreshAll();
    } catch (err) { alert(err.message); }
};

$("#btnTambahAlat").addEventListener("click", async () => {
    const nama_alat = prompt("Nama alat:");
    if (!nama_alat) return;
    const kategoriText = daftarKategori.map(k => `${k.id_kategori}: ${k.nama_kategori}`).join("\n");
    const id_kategori = prompt("Masukkan ID kategori:\n" + kategoriText);
    if (id_kategori === null) return;
    const stok = prompt("Jumlah stok awal:", "1");
    if (stok === null) return;
    const lokasi = prompt("Lokasi penyimpanan:", "");
    if (lokasi === null) return;
    const kondisi = prompt("Kondisi alat:", "Baik");
    if (kondisi === null) return;
    try {
        await api("/alat", {
            method: "POST", body: JSON.stringify({
                nama_alat, id_kategori: Number(id_kategori) || null, stok: Number(stok), lokasi, kondisi
            })
        });
        await refreshAll();
    } catch (err) { alert(err.message); }
});

window.kembalikan = async (id) => {
    if (!confirm("Proses pengembalian alat ini? Trigger database akan menambahkan stok kembali.")) return;
    try { await api(`/peminjaman/${id}/kembali`, { method: "PATCH" }); await refreshAll(); }
    catch (err) { alert(err.message); }
};

$("#btnKembali").addEventListener("click", () => showPage("peminjaman"));

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().slice(0, 10);
  const input = document.querySelector('[name="tanggal_pinjam"]');
  if (input) input.value = today;
});
refreshAll();