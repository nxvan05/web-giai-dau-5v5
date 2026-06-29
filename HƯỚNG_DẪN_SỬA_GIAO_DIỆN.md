# HƯỚNG DẪN SỬA GIAO DIỆN — EVAN CUP

## 1. Tổng Quan Kiến Trúc

- **1 file HTML duy nhất:** `public/index.html` (~2200 dòng)
- **1 file JS duy nhất:** `public/js/app.js` (~3660 dòng)
- **0 file CSS** — toàn bộ style dùng Tailwind CDN + 2 block `<style>` trong `<head>`
- **Không build step, không framework** — mở browser là chạy
- **CDN:** Tailwind CSS, FontAwesome 6.5.1, Chart.js 4.4.7, Socket.IO 4.7.5

## 2. Import CDN (đừng xoá)

```html
<!-- Tailwind -->
<script src="https://cdn.tailwindcss.com"></script>
<!-- Font Awesome -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<!-- Socket.IO -->
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
```

## 3. Custom Colors (Tailwind Config)

Trong `<head>`, block `<script>` của tailwind.config:

| Token | Hex | Dùng cho |
|---|---|---|
| `valBg` | `#0b0e14` | Nền trang |
| `valCard` | `#111822` | Nền card |
| `valRed` | `#ff4655` | Màu chính (Valorant đỏ) |
| `valCyan` | `#00f2fe` | Màu phụ (xanh cyan) |
| `valLight` | `#ece8e1` | Chữ sáng |
| `valDarkRed` | `#7a1c22` | Đỏ tối |
| `valBorder` | `#1f2937` | Viền |

Các class custom (trong `<style>`):
- `.glow-red` / `.glow-cyan` / `.glow-gold` — hiệu ứng phát sáng
- `.hover-scale` — phóng to khi hover
- `.cyber-bg-glow` — gradient nền
- Các class cho VETO map, user dropdown, guide accordion, tooltip, context menu

**Có thể đổi màu sắc** trong tailwind.config, miễn giữ đúng tên token.

## 4. QUY TẮC VÀNG — KHÔNG ĐƯỢC ĐỤNG VÀO

### 4.1. ID (Element IDs) — TUYỆT ĐỐI KHÔNG ĐỔI

app.js dùng `document.getElementById('...')` để truy cập element. Đổi tên ID = hỏng chức năng.

**Các ID quan trọng nhất (261+ ID):**

**Tabs (9 tabs):**
- `guide-tab`, `register-tab`, `teams-tab`, `admin-tab`, `schedule-tab`
- `veto-tab`, `leaderboard-tab`, `bracket-tab`, `stream-tab`
- `dashboard-tab`, `profile-tab`
- `btn-guide-tab`, `btn-register-tab`, ... (tương ứng mỗi tab)

**Form đăng ký:**
- `registration-form`, `reg-submit-btn`, `reg-discord`, `reg-discord-id`, `reg-riotid`
- `reg-rank`, `reg-role`, `reg-team-option`, `reg-team-name`
- `register-discord-status`, `form-points-badge`, `reg-riot-lookup-result`

**Modals (12 cái):**
- `profile-modal`, `profile-edit-modal`, `team-modal`, `match-detail-modal`
- `result-modal`, `score-report-modal`, `mvp-modal`, `dispute-modal`
- `admin-login-modal`, `help-modal`, `discord-guide-modal`
- `admin-password-input`, `admin-trigger-btn`

**Profile:**
- `p-display-name`, `p-rank`, `p-elo`, `p-role`, `p-team`, `p-riot-id`
- `p-wins`, `p-losses`, `p-mvps`, `p-kda`
- `pe-rank`, `pe-rank-lock-notice`, `pe-display-name`, `pe-riot-id`, `pe-role`
- `h2h-opponent`, `h2h-result`

**Teams:**
- `my-team-section`, `my-team-content`, `my-team-name-input`
- `teams-list`, `teams-count`, `free-agents-list`

**Admin:**
- `admin-sub-players`, `admin-sub-teams`, `admin-sub-veto`, ...
- `admin-player-search`, `player-list-container`, `pending-teams-list`
- `penalty-list`, `audit-log-list`, `score-reports-list`

**Layout:**
- `main-logo`, `discord-login-btn`, `discord-user-info`, `discord-avatar`
- `discord-username`, `user-dropdown`, `user-dropdown-trigger`
- `toast-container`, `loading-overlay`, `loading-text`
- `confetti-canvas`, `context-menu`

Danh sách đầy đủ 261+ ID trong file `BAN_GIAO.md`.

**Có thể làm gì với các element này?**
- ✅ Đổi class (màu sắc, kích thước, spacing, font, border, shadow)
- ✅ Thêm/xoá class Tailwind
- ❌ Đổi `id=""`
- ❌ Xoá element khỏi DOM

### 4.2. Form Element Names

Các form element dùng `document.getElementById('...').value`:
- `reg-riotid`, `reg-rank`, `reg-role`, `reg-team-option`, `reg-team-name`

**Phải giữ đúng tag type** (`<input>`, `<select>`, `<button type="submit">`).

### 4.3. Cấu Trúc Tab

Mỗi tab có pattern:
```html
<button onclick="switchTab('guide-tab')" id="btn-guide-tab" class="tab-btn ...">Cẩm Nang</button>
<section id="guide-tab" class="tab-content ...">...</section>
```

- Tab button: class `tab-btn`, onclick gọi `switchTab('id')`
- Tab content: class `tab-content`, mặc định `hidden`
- **Có thể** đổi style của `.tab-btn` và `.tab-content`
- **Không được** đổi id, không xoá class `tab-btn`/`tab-content`

### 4.4. Cấu Trúc Modal

Mỗi modal theo pattern:
```html
<div id="some-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 hidden">
  <div class="bg-valCard border border-gray-800 max-w-lg w-full rounded-2xl shadow-2xl">
    <div class="p-4 border-b border-gray-800 flex items-center justify-between">
      <h3 class="font-display text-lg font-bold text-white">Title</h3>
      <button onclick="closeSomething()" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="p-4 space-y-4">content</div>
  </div>
</div>
```

- Show/Hide bằng `classList.remove('hidden')` / `classList.add('hidden')`
- **Có thể** đổi nội dung, style, layout bên trong
- **Không được** đổi ID của modal container, xoá class `hidden`, xoá nút close với onclick

### 4.5. Các onclick / Hàm JS

Các hàm JS quan trọng được gọi từ HTML:

| onclick | File:Line |
|---|---|
| `switchTab('...')` | app.js:361 |
| `handleRegistration(event)` | app.js:768 |
| `lookupRiotIdForRegister()` | app.js:732 |
| `openProfile(discordId)` | app.js:239 |
| `openProfileEdit()` | app.js:1463 |
| `closeProfileEdit()` | app.js:1482 |
| `saveProfileEdit()` | app.js:1485 |
| `openTeamDetail(name)` | app.js:1504 |
| `loadH2H()` | app.js:3504 |
| `openAdminLoginModal()` | app.js:378 |
| `checkAdminPassword()` | app.js:387 |
| `loginDiscord()` | app.js:1749 |
| `logoutDiscord()` | app.js:1758 |
| `confirmKickMember(...)` | app.js:2709 |
| `renameTeam()` | app.js:2640 |
| `leaveTeam()` | app.js:2653 |

**Không được đổi tên hàm, không đổi số lượng/kiểu tham số.**

## 5. NHỮNG THỨ CÓ THỂ ĐỔI

### ✅ Màu sắc
- Thay đổi giá trị hex trong tailwind.config
- Đổi class Tailwind (vd: `bg-valRed` → `bg-blue-500`)
- Thêm màu mới

### ✅ Layout
- Đổi grid columns, flex direction, spacing
- Thêm/xoá section trong tab
- Sắp xếp lại thứ tự element **trong cùng một container**

### ✅ Typography
- Đổi font trong tailwind.config
- Đổi kích thước chữ (text-sm, text-xs...)
- Đổi font-weight

### ✅ Hiệu ứng
- Thêm animation, transition
- Đổi glow intensity
- Thêm hover effects

### ✅ Responsive
- Thêm breakpoints (sm:, md:, lg:)
- Ẩn/hiện element trên mobile

### ✅ Thêm section tĩnh
- Có thể thêm nội dung HTML mới **không có JS tương tác**
- Ví dụ: footer links, banner quảng cáo, hướng dẫn

## 6. NHỮNG LƯU Ý ĐẶC BIỆT

### 6.1. Không xoá các element sau:
- `<canvas id="confetti-canvas">` — dùng cho confetti + particle effects
- `<div id="context-menu">` — context menu (right-click)
- `<div id="toast-container">` — toast notification
- `<div id="loading-overlay">` — loading spinner
- Modal containers (dù ẩn)
- `<script>` tags (app.js, socket.io, chart.js)

### 6.2. Easter eggs (tương tác ẩn)
Các element có `data-interactive` attribute sẽ có wiggle animation + beep sound khi hover:
- Logo (`#main-logo`)
- "make u feel better" text
- Các element chứa "TRẦN 21"

**Có thể thêm** `data-interactive` vào element khác để kích hoạt hiệu ứng.

### 6.3. Các tính năng realtime (Socket.IO)
- VETO map, check-in, match result, penalty, team changes
- **Không cache HTML** của các section này — chúng được render lại từ JS

### 6.4. Admin tab
- Tab admin có 7 sub-tab: Players, Teams, VETO, Config, Discipline, Data, Reports
- Sub-tab switch bằng `switchAdminSubTab('players')`
- Nội dung admin được render bằng JS, không phải HTML tĩnh

### 6.5. Stream Booth (OBS Widget)
- Có OBS widget overlay ẩn (`id="obs-widget-overlay"`)
- Dùng cho stream trực tiếp, không xoá

## 7. Cách Test

1. Mở `http://localhost:5000` (hoặc URL thật)
2. Test tất cả tabs có hoạt động không
3. Test Đăng Ký (cần login Discord trước)
4. Test mở Profile Modal (click avatar bất kỳ)
5. Test right-click context menu
6. Test double-click copy
7. Test VETO, Leaderboard, Bracket
8. Test Dashboard (nếu có tài khoản)
9. Check console (F12) — không có lỗi JS
10. Test responsive (F12 → mobile view)

## 8. Cấu Trúc File (Chỉ Sửa Được 2 File)

```
public/
├── index.html      # ✅ CÓ THỂ SỬA (style, layout, content, colors)
├── js/
│   └── app.js      # ❌ KHÔNG SỬA (trừ khi hiểu rõ logic)
├── css/
│   └── style.css   # Nhỏ, chủ yếu animation keyframes
```

> **Nguyên tắc:** Sửa index.html thoải mái về style, nhưng không đổi ID, không xoá element có tương tác JS. Nếu cần thêm element mới, dùng ID mới (không trùng với ID cũ).

## 9. Quy Trình Làm Việc Đề Xuất

1. Fork nhánh mới: `git checkout -b ui-redesign`
2. Sửa style trong index.html
3. Refresh browser — không cần build
4. Kiểm tra console log (F12) không có lỗi
5. Test các chức năng chính
6. Commit + push, tạo PR
