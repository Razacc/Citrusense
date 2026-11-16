# CitruSense — Citrus Sensor & Computation System
Solusi Smart Farming berbasis sensor dan komputasi untuk budidaya jeruk yang lebih presisi.
Dashboard web real-time (Supabase) + CitruSense Bot (Groq AI) untuk data ESP32.

## Struktur
```
citrusense/
├─ index.html            halaman: splash, dashboard, riwayat, chat
├─ style.css             desain & tema (otomatis terang/gelap)
├─ app.js                logika: Supabase realtime, CSV, chat
├─ api/chat.js           proxy backend untuk Groq AI
├─ config.example.js     templat key (salin jadi config.js)
├─ build.js              membuat config.js dari env var di Vercel
├─ vercel.json           pengaturan deploy
├─ assets/logo.svg       logo (ganti dengan logo Anda bila perlu)
├─ supabase/schema.sql   tabel database + realtime
├─ esp32/citrusense_esp32.ino   kode perangkat sensor
└─ .vscode/              rekomendasi ekstensi VS Code
```

## 1. Jalankan di VS Code (mode demo)
1. Buka folder di VS Code (File > Open Folder).
2. Pasang ekstensi **Live Server** (akan disarankan otomatis).
3. Klik kanan `index.html` > **Open with Live Server**.
Tanpa `config.js`, aplikasi berjalan dengan data simulasi (status "Mode demo").

## 2. Hubungkan database (Supabase)
1. Buat project di supabase.com.
2. SQL Editor > jalankan isi `supabase/schema.sql`.
3. Settings > API: salin **Project URL** dan **anon key**.
4. Salin `config.example.js` menjadi `config.js`, isi `SUPABASE_URL` (URL project, tanpa `/rest/v1`) dan `SUPABASE_ANON_KEY`.

## 3. Aktifkan AI (Groq)
Buat key di console.groq.com dan simpan `GROQ_API_KEY` sebagai environment variable backend. Jangan masukkan key tersebut ke `config.js`.
Teks: `llama-3.1-8b-instant`, gambar: `llama-4-scout-17b-16e-instruct`.
Fitur AI penuh berjalan melalui `/api/chat` saat aplikasi di-deploy ke Vercel; saat dibuka melalui Live Server, chat memakai jawaban lokal mode demo.

## 4. Perangkat ESP32
Buka `esp32/citrusense_esp32.ino` di Arduino IDE, isi WiFi + URL/key Supabase
(`.../rest/v1/sensor_data`), kalibrasi sensor tanah/pH, lalu upload.

## 5. Deploy ke Vercel
1. Upload folder ke GitHub (`config.js` otomatis diabaikan).
2. Import repo di vercel.com.
3. Settings > Environment Variables: isi `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `GROQ_API_KEY`.
4. Deploy. `build.js` membuat `config.js` hanya dengan konfigurasi publik; endpoint backend membaca `GROQ_API_KEY` secara langsung.

## 6. Jadikan APK
- Cara cepat: deploy ke Vercel, lalu pakai **pwabuilder.com** > Package for Android.
- Atau Capacitor: `npm i @capacitor/core @capacitor/cli @capacitor/android`, `npx cap init`,
  set `webDir` ke `.`, lalu `npx cap add android` dan `npx cap open android`.

## Catatan keamanan
- Jangan pernah menaruh `GROQ_API_KEY` di `config.js`; endpoint backend menjaga key agar tidak dikirim ke browser.
- Endpoint chat tetap dapat diakses publik. Tambahkan autentikasi dan pembatasan penggunaan sebelum membuka aplikasi secara luas.
- Policy `schema.sql` mengizinkan anon insert agar ESP32 mudah terhubung; perketat bila perlu.
