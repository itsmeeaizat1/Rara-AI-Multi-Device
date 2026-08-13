# Aizat Karaoke Studio — Smule Style Redesign

File-file yang perlu diubah / ditambah ke repo GitHub kamu:

## File BARU (tambahkan ke repo):
1. `src/components/Sidebar.tsx` — Sidebar kiri (desktop) + bottom nav (mobile)
2. `src/components/PerformanceCard.tsx` — Card karaoke Smule-style (likes, comments, join duet)
3. `src/components/TopBar.tsx` — Header bar dengan search + avatar

## File yang DITIMPA (replace isi):
1. `src/App.tsx` — Full rewrite, layout Smule-style (social feed + grid lagu + FAB)

## Yang TIDAK berubah (tetap pakai yang lama):
- `src/components/KaraokeStudio.tsx`
- `src/components/FullScreenPlayer.tsx`
- `src/components/PlayerBar.tsx`
- `src/components/EqualizerModal.tsx`
- `src/components/ImportMusicModal.tsx`
- `src/components/RecordingsList.tsx`
- `src/components/UserProfileModal.tsx`
- `src/components/LyricsViewer.tsx`
- `src/lib/audioEngine.ts`
- `src/data/songs.ts`
- `src/types.ts`
- `src/index.css`
- `src/main.tsx`
- `server.ts`
- `package.json`
- `vite.config.ts`

## Yang DIHAPUS (tidak dipakai lagi):
- `src/components/AndroidFrame.tsx` — gak perlu lagi, sekarang full web layout
- `src/components/Navbar.tsx` — diganti oleh TopBar.tsx
- `src/components/BottomNav.tsx` — diganti oleh Sidebar.tsx (bottom nav mobile ada di dalamnya)

## Fitur baru di redesign ini:
✅ Smule-style social feed (card performance dari user lain)
✅ Like, comment, share di setiap performance card
✅ "Join Duet" button (Smule signature feature)
✅ Collab badge (menandakan duet collaboration)
✅ Trending ranking page (top performances)
✅ Floating Action Button (FAB) pink gradient untuk mulai karaoke
✅ Responsive: Sidebar di desktop, bottom nav di mobile
✅ Search bar di top bar
✅ Hero banner dengan CTA "Mulai Karaoke"
✅ Grid song library dengan badge karaoke di setiap card
