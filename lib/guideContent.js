// Player-facing rules guide, rendered as markdown in the "Panduan" modal
// (see components/GuideModal.js). Keeping it as a plain string here avoids
// needing extra webpack loader config just to import a .md file.

module.exports = `
## Cara Menang

Poker Pocket cuma ngurusin chip — kartu tetap kamu pegang fisik di tangan seperti biasa. Ada 2 cara menang di satu hand:

1. **Semua lawan fold** — kamu otomatis menang seluruh pot, tanpa perlu buka kartu.
2. **Showdown** — kalau masih ada 2+ pemain sampai River, semua yang belum fold buka kartu di meja, host pilih pemenang berdasarkan kombinasi kartu terbaik (lihat urutan di bawah).

Turnamen berakhir kalau tinggal **1 pemain** yang masih punya chip — dia juara.

---

## Small Blind & Big Blind

Setiap hand baru, 2 pemain di sebelah kiri dealer *wajib* pasang taruhan duluan sebelum lihat kartu — ini yang bikin ada isi di pot sejak awal, supaya orang gak selalu fold.

- **Small Blind (SB)** — pemain tepat di kiri dealer, pasang setengah dari Big Blind.
- **Big Blind (BB)** — pemain di kiri SB, pasang taruhan penuh (ini jadi taruhan minimum di ronde pertama).

Posisi dealer, SB, BB **geser satu kursi searah jarum jam** tiap hand baru — jadi semua orang gantian kena blind.

![Diagram posisi Dealer, Small Blind, Big Blind](/blinds-diagram.svg)

---

## Alur Taruhan Tiap Ronde

1. **Preflop** — setelah blind dipasang, giliran dimulai dari pemain setelah Big Blind.
2. **Flop / Turn / River** — host buka kartu tengah tahap demi tahap; tiap tahap ada ronde taruhan baru.
3. Tiap giliran, pemain pilih salah satu:
   - **Fold** — buang kartu, keluar dari hand ini.
   - **Call** — samakan taruhan tertinggi saat ini.
   - **Raise** — naikkan taruhan (minimal sebesar kenaikan terakhir).
   - **All-in** — taruh semua chip yang tersisa.

Ronde taruhan selesai kalau semua pemain yang masih aktif sudah menyamakan taruhan tertinggi (atau all-in/fold). Setelah itu host baru bisa lanjut ke tahap berikutnya.

---

## Urutan Kombinasi Kartu (Tertinggi ke Terendah)

![Urutan kombinasi kartu poker dari tertinggi ke terendah](https://upload.wikimedia.org/wikipedia/commons/5/51/Poker_hands.svg)

1. **Royal Flush** — A-K-Q-J-10 satu jenis (suit) yang sama.
2. **Straight Flush** — 5 kartu berurutan, satu jenis yang sama.
3. **Four of a Kind** — 4 kartu angka/gambar yang sama.
4. **Full House** — 3 kartu sama + 2 kartu sama (pasangan lain).
5. **Flush** — 5 kartu jenis (suit) yang sama, urutan bebas.
6. **Straight** — 5 kartu berurutan, jenis bebas.
7. **Three of a Kind** — 3 kartu angka/gambar yang sama.
8. **Two Pair** — 2 pasang kartu yang sama.
9. **One Pair** — 1 pasang kartu yang sama.
10. **High Card** — gak ada kombinasi, dinilai dari kartu tertinggi.

*Gambar: [Poker hands.svg](https://commons.wikimedia.org/wiki/File:Poker_hands.svg) oleh KekoLangarica, lisensi CC BY-SA 3.0 / GFDL, via Wikimedia Commons.*

---

## Istilah Lain

- **Pot** — total chip yang diperebutkan di satu hand.
- **Side Pot** — kalau ada pemain all-in dengan chip lebih sedikit dari yang lain, pot terpecah otomatis; dia cuma berhak menang sebesar taruhannya, sisanya diperebutkan pemain yang taruh lebih banyak.
- **All-in** — bertaruh seluruh chip yang tersisa; gak bisa raise lagi setelah ini.
- **Eliminated** — chip habis (0), keluar dari turnamen.

Kalau bingung di tengah permainan, tanya aja ke host — dia yang pegang kendali penuh jalannya hand. Selamat main! 🃏
`;
