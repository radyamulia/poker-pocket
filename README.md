# Poker Pocket

Chip tracker untuk poker rumahan (No-Limit Texas Hold'em, format turnamen). Kartu tetap fisik di tangan pemain — aplikasi ini cuma ngurusin hal yang paling sering bikin ribut: hitungan chip, pot, dan giliran.

Host bikin room dari HP/laptopnya, pemain lain join lewat scan QR atau input kode 6-karakter — tanpa install apa pun, tanpa akun. Semua device lihat state yang sama secara real-time lewat WebSocket.

## Fitur utama

- **Join tanpa akun** — scan QR atau input kode, langsung masuk lobby.
- **Turn engine lengkap** — blind otomatis, validasi minimum raise, giliran otomatis pindah (skip folded/all-in/eliminated).
- **Side pot** — all-in di jumlah berbeda-beda otomatis dipecah jadi beberapa pot sesuai eligibility, host tinggal pilih pemenang tiap pot.
- **Eliminasi & Next Hand** — chip habis otomatis keluar dari turnamen; dealer/blind lanjut ke pemain berikutnya, skip yang sudah eliminated.
- **Main Lagi** — setelah ada juara, host bisa restart turnamen dengan pemain yang sama tanpa perlu join ulang.
- **Reconnect-friendly** — identitas pemain dibawa lewat URL, reload halaman tidak kehilangan wallet.
- **Host controls** — kick pemain, tutup room, panduan aturan main (modal markdown).
- **Community cards dekoratif** — animasi flip kartu di layar host mengikuti tahap reveal (bukan penentu hasil — hasil tetap dari kartu fisik).
- **Efek suara & visual** — boo saat fold, tepuk tangan saat menang, overlay emoji besar, musik latar untuk layar host.

## Tech stack

- **Next.js** (Pages Router) untuk frontend + API routes
- **Custom Node server** (`server.js`) yang menyatukan HTTP server Next dengan WebSocket server (`ws`) di satu port
- State game disimpan **in-memory** (tidak ada database) — cukup untuk satu sesi permainan
- Vanilla CSS (tidak pakai framework UI)

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Untuk test dari HP lain di jaringan yang sama atau lewat internet, pakai tunnel seperti `ngrok http 3000`.

## Deploy

Sudah ada `render.yaml` untuk deploy ke [Render](https://render.com) (Blueprint, plan free). Karena WebSocket & state in-memory butuh proses server yang hidup terus, platform static hosting (seperti GitHub Pages) tidak bisa dipakai.

## Struktur project

```
lib/          logic inti: game engine (turn/pot/showdown), store in-memory, WS hub
pages/        halaman (host, join, play) + API routes (pages/api/games/[code]/**)
components/   komponen UI reusable (community cards, guide modal, dll)
public/       aset statis (suara, gambar diagram)
server.js     entry point: Next.js + WebSocket server jadi satu proses
```

## Scope

Kartu virtual, cash game/rebuy, riwayat lintas sesi, dan multi-meja sengaja tidak masuk scope — lihat `spec.md` untuk detail lengkap keputusan produk dan requirement.
