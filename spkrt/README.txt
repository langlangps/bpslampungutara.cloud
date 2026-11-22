SPKRT 2027 Lampung Utara — Versi 2

1. Ekstrak folder spkrt ke htdocs (XAMPP), lalu buka http://localhost/spkrt/.
   Atau jalankan python -m http.server 8000 dari folder induk spkrt dan buka http://localhost:8000/spkrt/.
2. Simpan logo BPS Kabupaten Lampung Utara sebagai assets/logo.png. Logo resmi belum disertakan; fallback tulisan BPS tersedia.
3. Ganti href="not-found/" pada index.html untuk tiap tautan tujuan. Semua tautan tersebut memakai target="_blank".
4. Tema dan suara tersimpan di browser melalui localStorage. Suara dibuat dengan Web Audio API.
5. Outfit dan Plus Jakarta Sans dimuat melalui Google Fonts; saat offline, font sistem digunakan. Tidak ada framework atau library JavaScript eksternal.
6. Animated mesh, parallax, ripple, transisi modal, dan animasi judul menghormati pengaturan prefers-reduced-motion.
