# Direktori Assignment

Aplikasi pencarian data assignment menggunakan **HTML, CSS, dan vanilla JavaScript**. Tidak menggunakan framework, database, server API, Docker, atau dependensi eksternal. Data dibaca dari `data.json` dan diproses langsung di browser.

## Fitur

- Pencarian teks di nama, alamat, instansi, unit kerja, kode identitas, status, lokasi, dan kolom lainnya.
- Filter kombinasi untuk `assignment_status_alias`, `lokasi_kerja_fasih`, `instansi_dari_bkd`, `unit_kerja_dari_bkd`, dan `instansi_kerja_fasih`.
- Kartu ringkas yang menampilkan nama, alamat, instansi/unit BKD, instansi Fasih, status, lokasi, serta tombol tautan CAWI.
- Alamat menggunakan `alamat_dari_bkd`; jika kosong, otomatis menggunakan `alamat_prelist`.
- Link CAWI menerima URL biasa maupun string Markdown link seperti `[label](https://alamat...)`.
- Pagination untuk menjaga tampilan tetap ringan saat data berisi ribuan baris.
- Layout responsif untuk desktop dan ponsel.

## Struktur berkas

```text
direktori-assignment/
├── index.html
├── styles.css
├── app.js
├── data.json
└── README.md
```

## 1. Menyiapkan data dari Pandas DataFrame

Tidak perlu menaruh 2.300 data secara hardcoded di `app.js`. Simpan semua baris di `data.json`, supaya data mudah diperbarui tanpa mengubah kode aplikasi.

Misalnya DataFrame Anda bernama `df`:

```python
import json
import pandas as pd

# Mengubah nilai NaN/NaT menjadi null JSON yang valid.
df.to_json(
    "data.json",
    orient="records",
    force_ascii=False,
    indent=2
)
```

Perintah di atas membuat `data.json` sebagai array objek, sesuai format yang dibaca aplikasi. Pastikan file `data.json` hasil ekspor diletakkan satu folder dengan `index.html`, `app.js`, dan `styles.css`.

Contoh bentuk datanya:

```json
[
  {
    "assignment_id": "id-assignment",
    "code_identity": "kode identitas",
    "nama_prelist": "NAMA RESPONDEN",
    "alamat_prelist": "ALAMAT DARI PRELIST",
    "assignment_status_alias": "OPEN",
    "alamat_dari_bkd": null,
    "instansi_dari_bkd": null,
    "unit_kerja_dari_bkd": null,
    "instansi_kerja_fasih": "NAMA INSTANSI FASIH",
    "lokasi_kerja_fasih": "LAMPUNG UTARA",
    "link_cawi": "https://contoh.id/tautan-cawi"
  }
]
```

Nama kolom mengikuti nama di DataFrame. Kolom yang kosong boleh berisi `null`, `NaN` dari Pandas akan diubah menjadi `null` oleh `to_json()`.

> **Penting:** folder unduhan proyek ini berisi tujuh baris contoh dari data yang diberikan di percakapan, bukan seluruh 2.300-an baris. Ganti `data.json` dengan hasil ekspor DataFrame lengkap sebelum dipakai.

## 2. Menjalankan di komputer lokal

Browser biasanya membatasi `fetch("data.json")` ketika `index.html` dibuka langsung melalui alamat `file://`. Jalankan web server statis sederhana dari folder proyek.

### Dengan Python

Buka Terminal atau Command Prompt di folder `direktori-assignment`, kemudian jalankan:

```bash
python -m http.server 8000
```

Buka alamat berikut di browser:

```text
http://localhost:8000
```

Untuk menghentikan server, tekan `Ctrl+C` di Terminal.

## 3. Deploy ke hosting statis

Setelah mengganti `data.json` dengan data lengkap, unggah **semua lima berkas** (`index.html`, `styles.css`, `app.js`, `data.json`, `README.md`) ke satu folder di hosting. Tidak ada proses build atau instalasi paket.

Bisa menggunakan hosting statis apa pun yang mendukung penyajian berkas HTML, CSS, JS, dan JSON, seperti GitHub Pages, Netlify, atau hosting web biasa. Jika aplikasi diletakkan dalam subfolder, pastikan `data.json` berada di folder yang sama dengan `index.html`.

Sesudah deploy, cek hal-hal berikut:

1. Halaman dapat dibuka melalui URL hosting.
2. Tidak muncul pesan gagal membaca `data.json`.
3. Jumlah assignment sesuai dengan banyaknya baris DataFrame.
4. Tombol CAWI mengarah ke tautan yang benar.

## Catatan privasi dan akses

Ini aplikasi **frontend statis**. Data di `data.json` dikirim ke browser setiap pengunjung yang membuka situs; tidak ada autentikasi atau kontrol akses bawaan. Jika data memuat tautan survei atau informasi yang tidak boleh diakses publik, tempatkan situs dan berkas JSON di hosting dengan pembatasan akses yang sesuai, atau jangan unggah data tersebut ke hosting publik.
