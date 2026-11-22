# Direktori Assignment — Verifikasi CAWI

Aplikasi pencarian assignment dengan HTML, CSS, dan vanilla JavaScript. Data dibaca dari `data.json`. Tidak ada proses build, framework, atau database.

## Fitur

- Pencarian data assignment dan pagination.
- Filter untuk `assignment_status_alias`, `instansi_lokasi`, `Instansi`, `Unit Kerja`, dan `instansi_kerja`.
- Kartu menampilkan nama, alamat, instansi/unit kerja BKD atau instansi Fasih, lokasi, serta status.
- Alamat menggunakan `ALAMAT`; jika kosong, menggunakan `data2` (mendukung juga skema lama `alamat_dari_bkd` lalu `alamat_prelist`).
- Tombol CAWI **tidak berupa tautan langsung**. Pengguna harus memasukkan NIK/No. KK, lalu input dibandingkan dengan `dtsen_no_kk` dan `nik_dtsen#1` sampai `nik_dtsen#10` pada baris assignment yang dipilih.
- Jika input salah, aplikasi menampilkan pesan validasi dan tidak membuka tautan. Jika cocok, tautan CAWI dibuka di tab baru.
- Instansi: jika salah satu kolom BKD (`Instansi` atau `Unit Kerja`) terisi, tampilkan hanya kolom BKD yang terisi. Instansi Fasih ditampilkan hanya jika kedua kolom BKD kosong. Jika semua kosong, bagian instansi tidak ditampilkan.
- Validasi input mensyaratkan 16 digit angka; spasi atau tanda hubung yang dipakai sebagai pemisah akan diabaikan.
- URL hanya diterima jika HTTPS dan host/path sesuai `https://esurvey.bps.go.id/h/s/`.

## Struktur berkas

```text
direktori-assignment/
├── index.html
├── styles.css
├── app.js
├── data.json
└── README.md
```

## 1. Ekspor data lengkap dari Pandas

ZIP ini memuat **3 baris contoh** dari contoh yang diberikan di percakapan, bukan keseluruhan data sekitar 2.300 baris. Sebelum dipakai, ganti `data.json` dengan seluruh DataFrame Anda.

Misalnya DataFrame bernama `df`:

```python
# Kolom identitas harus berbentuk string agar digit awal tetap terjaga.
identity_columns = ["dtsen_no_kk", *[f"nik_dtsen#{i}" for i in range(1, 11)]]
for col in identity_columns:
    if col in df.columns:
        df[col] = df[col].astype("string")

# NaN/NA akan diserialisasi menjadi null JSON yang valid.
df.to_json(
    "data.json",
    orient="records",
    force_ascii=False,
    indent=2
)
```

**Penting:** jika kolom identitas sudah terlanjur dibaca sebagai angka dan kehilangan nol di depan, mengubahnya menjadi string setelahnya tidak dapat memulihkan nol tersebut. Pastikan kolom dibaca sebagai string saat sumber data diimpor.

Pastikan kolom berikut ada di hasil ekspor dengan nama yang sesuai:

- `nama_prelist`, `data2`, `ALAMAT`, `code_identity`, `assignment_status_alias`
- `Instansi`, `Unit Kerja`, `instansi_kerja`, `instansi_lokasi`
- `url`, `dtsen_no_kk`, `nik_dtsen#1` sampai `nik_dtsen#10`

Kolom lain boleh tetap disertakan. Nama kolom peka huruf besar/kecil, jadi pertahankan nama asli dari DataFrame. Nilai NIK dan Nomor KK sebaiknya bertipe string agar nol di depan tidak hilang.

## 2. Menjalankan lokal

Buka terminal di folder proyek, lalu jalankan:

```bash
python -m http.server 8000
```

Buka `http://localhost:8000` pada browser. Gunakan web server; membuka `index.html` secara langsung melalui `file://` dapat membuat browser menolak `fetch("data.json")`.

## 3. Deploy ke hosting

Unggah `index.html`, `styles.css`, `app.js`, dan `data.json` ke folder yang sama di hosting statis. `README.md` boleh ikut diunggah, tetapi tidak diperlukan aplikasi untuk berjalan. Tidak ada build atau instalasi dependensi.

## 4. Aturan validasi

Untuk setiap kartu, input dicocokkan hanya dengan No. KK dan sepuluh kolom NIK milik **baris assignment tersebut**. Nilai tidak dicocokkan ke seluruh dataset agar satu keluarga tidak secara tidak sengaja membuka tautan milik assignment lain. Nilai masukan tidak disimpan ke local storage, cookie, atau dikirim ke server oleh kode aplikasi.

## PENTING: batasan keamanan aplikasi statis

Validasi ini berjalan **di browser (client-side)**. Ini mencegah tombol membuka CAWI sebelum input cocok melalui alur normal, tetapi **bukan perlindungan keamanan yang kuat**: `data.json` berisi tautan CAWI dan NIK/No. KK yang dipakai untuk verifikasi sehingga pengunjung yang dapat mengakses berkas tersebut berpotensi membacanya atau melewati validasi melalui Developer Tools. Memindahkan daftar NIK ke berkas terpisah, mengenkripsi/menyamarkan JSON, atau menyembunyikan URL melalui JavaScript tidak mengatasi masalah ini.

Karena data berisi pengenal pribadi dan tautan survei, **jangan unggah paket ini ke hosting publik jika akses data harus dibatasi**. Untuk keamanan sungguhan, simpan data dan URL di server yang tidak dapat diakses langsung, lalu lakukan validasi di endpoint backend yang menerapkan autentikasi, HTTPS, pembatasan percobaan, pencatatan seperlunya, dan kebijakan akses. Endpoint hanya mengembalikan/mengarahkan ke URL setelah verifikasi di sisi server. Backend tersebut tidak harus memakai database; dapat membaca file privat yang hanya tersedia di server, tetapi tetap membutuhkan lingkungan server-side.
