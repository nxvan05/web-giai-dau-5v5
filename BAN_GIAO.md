# BÀN GIAO DỰ ÁN — EVAN CUP (Giải 5v5 Valorant)

## 1. Tổng Quan

Website quản lý giải đấu Valorant 5v5 — đăng ký, xếp đội, check-in, VETO map, báo kết quả, tính điểm ELO, bảng xếp hạng, playoff bracket, stream booth.

- **Frontend:** HTML/CSS/JS thuần (Tailwind CDN + Chart.js), không framework
- **Backend:** Node.js + Express
- **Database:** SQLite (qua Prisma ORM)
- **Realtime:** Socket.IO
- **Auth:** Discord OAuth (cho người chơi) + JWT (cho admin)

---

## 2. Cấu Trúc Thư Mục

```
/
├── public/                     # Frontend (static files)
│   ├── index.html               # Giao diện chính (SPA)
│   ├── css/style.css            # Styles tách từ index.html
│   ├── js/
│   │   ├── app.js               # Logic frontend chính
│   │   ├── valorant-ux.js       # UX enhancements
│   │   ├── core/                # Core modules
│   │   │   ├── globals.js       # Biến toàn cục, helpers
│   │   │   ├── api.js           # API wrapper
│   │   │   ├── auth.js          # Xác thực
│   │   │   └── socket.js        # Socket.IO client
│   │   └── ui/                  # UI modules
│   │       ├── admin.js, bracket.js, dashboard.js
│   │       ├── modals.js, notifications.js
│   │       ├── players.js, profile.js, schedule.js
│   │       ├── stream.js, teams.js, veto.js
│   └── ...fonts, img, uploads...
├── src/
│   ├── server.js                # Entry point + middleware
│   ├── routes/                  # 18 file route (API endpoints)
│   ├── controllers/             # Business logic (10 files)
│   ├── middleware/               # auth, discordAuth, validate, sanitize
│   ├── utils/                   # prisma, logger, socket, profanity, audit
│   └── discord/                 # Discord bot (node-cron reminders)
├── prisma/
│   └── schema.prisma            # 18 models (Player, Team, Match, ...)
├── scripts/                     # seed, tạo admin, change-password
├── .env.example                 # Mẫu config (copy → .env)
├── .gitignore                   # node_modules, .env, *.db, data/
├── BAN_GIAO.md                  # File này
├── Dockerfile
└── docker-compose.yml
```

---

## 3. Tính Năng Chính

### Người chơi
- **Đăng nhập Discord** — OAuth, tự động điền form
- **Đăng ký thi đấu** — Nhập Riot ID, tự tra rank từ HenrikDev API, chọn vai trò, tạo đội mới hoặc đăng ký tự do
- **Hồ sơ cá nhân** — KDA chart, ELO history, W/L, match history, H2H (so sánh 2 người)
- **Dashboard đội trưởng** — Duyệt/xóa đơn xin vào, đá thành viên, đổi tên đội, giải tán
- **Check-in / Báo kết quả** — Check-in trước giờ đấu, báo tỉ số + screenshot
- **VETO map BO3** — Chọn/cấm map theo lượt
- **Bảng xếp hạng** — ELO leaderboard + team standings

### Admin
- Login bằng mật khẩu (JWT)
- **Tab Người Chơi:** Xem/xóa/draft/xuất/nhập CSV
- **Tab Đội Hình:** Duyệt đội, ghép đội hoàn chỉnh, thay người
- **Tab VETO:** Xem trạng thái VETO các trận
- **Tab Cấu Hình:** Webhook Discord, cài đặt
- **Tab Kỷ Luật:** Thêm/xóa penalty
- **Tab Dữ Liệu:** Audit log, export JSON
- **Tab Báo Cáo:** Duyệt/từ chối score report + dispute

### Tương tác ẩn (easter eggs)
- **Logo:** Double-click → confetti
- **"make u feel better":** Click 3 lần → rainbow text + confetti
- **Các element có `data-interactive`:** Hover vào → rung lắc + beep nhẹ
- **Console:** `evan.help()` xem danh sách lệnh bí mật

---

## 4. Biến Môi Trường (.env)

| Biến | Mô tả |
|---|---|
| `DATABASE_URL` | `file:./dev.db` (SQLite) |
| `JWT_SECRET` | 64 ký tự hex — dùng ký token |
| `PORT` | 5000 |
| `FRONTEND_URL` | `http://localhost:5000` (hoặc domain thật) |
| `NODE_ENV` | `development` / `production` |
| `DISCORD_CLIENT_ID` | Discord App ID (OAuth2) |
| `DISCORD_CLIENT_SECRET` | Discord App Secret |
| `DISCORD_REDIRECT_URI` | `{FRONTEND_URL}/api/discord/callback` |
| `DISCORD_BOT_TOKEN` | Bot token (gửi thông báo, reminder) |
| `DISCORD_GUILD_ID` | (tùy chọn) Server Discord |
| `HENRIKDEV_API_KEY` | Key từ dashboard.henrikdev.xyz |
| `DEFAULT_ADMIN_PASSWORD` | (tùy chọn) Nếu không set, tự sinh khi seed |

> ⚠️ **Lưu ý bảo mật:** `.env` đã có trong `.gitignore`, không bị push lên git. 
> Tuy nhiên cần kiểm tra lại git history — nếu trước đây `.env` từng được commit, phải dùng `git filter-branch` để xoá.

---

## 5. API QUAN TRỌNG

### HenrikDev API
- **Đã đổi từ header `Authorization` sang query param `?api_key=`** (v4 của HenrikDev)
- API dùng để tra rank Riot theo Riot ID
- Key hiện tại: `HDEV-8f296ea1-41f7-49e3-acc1-e779a0ae082d`

### Rank
- **Rank bị khoá SAU KHI đã set** — không thể sửa qua profile edit
- Backend `PUT /api/players/me` bỏ qua trường `rank` nếu player đã có rank

### ELO
- ELO mặc định: **1200**
- ELO được tính khi admin duyệt score report hoặc cập nhật kết quả trận
- Công thức: Elo chuẩn K=32, dựa trên average ELO của 2 đội

### Rate Limit
- **2000 requests / 15 phút** cho tất cả API endpoints
- **5 requests / phút** cho `/api/auth/login`

---

## 6. LƯU Ý QUAN TRỌNG

### Khi deploy
- Server chạy `git pull && npx prisma db push && node src/server.js` khi start
- Dùng `npm start` (production) hoặc `npm run dev` (development)
- Nếu dùng HTTPS: set `SSL_CERT_PATH` và `SSL_KEY_PATH`
- Docker: build với `docker compose up -d`, port map ở `docker-compose.yml`

### Socket.IO
- Dùng cho realtime: team created, match result, check-in, notification
- CORS được cấu hình theo `FRONTEND_URL`

### Discord Bot
- Bot dùng để gửi thông báo trận đấu, reminder check-in
- Slash commands: đăng ký qua lệnh `/register`

### Database
- SQLite — không cần cài DB server
- Prisma migration: `npm run migrate`
- Seed data: `npm run db:seed`
- **Không scale tốt khi nhiều writes đồng thời** — cân nhắc migrate lên PostgreSQL nếu giải lớn

### Admin account
- Tạo bằng script: `node scripts/create-admin.js`
- Hoặc tự seed lần đầu chạy server (nếu chưa có admin nào)
- **Password không còn hardcode** — dùng biến môi trường `DEFAULT_ADMIN_PASSWORD` hoặc tự sinh
- Đổi password: `npm run admin:password`

### Tên đội
- Tên đội được kiểm tra trùng lặp + profanity filter (tiếng Việt + Anh)
- Profanity list ở `src/utils/profanity.js`

### CSS
- CSS được tách ra file `public/css/style.css` (không còn inline trong index.html)

---

## 7. Các Route Chính

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/players/me` | Profile cá nhân (cần Discord JWT) |
| PUT | `/api/players/me` | Sửa profile (cần Discord JWT) |
| POST | `/api/players` | Đăng ký (cần Discord hoặc admin token) |
| GET | `/api/teams/all` | Danh sách đội (kèm `rosterPlayers`) |
| POST | `/api/teams/create-from-registration` | Tạo đội khi đăng ký |
| POST | `/api/valorant/lookup` | Tra rank từ Riot ID |
| PUT | `/api/matches/score-reports/:id/approve` | Duyệt báo cáo + tính ELO |

---

## 8. Hosting Hiện Tại

- **Server:** Pikamc (`lunar.pikamc.vn:2022`)
- **User:** `userlx0fglx7.9e49930b`
- **Project path:** `/home/container`
- **Cập nhật:** Push lên GitHub → Kill → Start trên Pikamc dashboard
- **Repo:** `https://github.com/nxvan05/web-giai-dau-5v5.git`
- **Port hiện tại:** `25113` (đổi từ 5000 để tránh xung đột)
- **Khởi động local:** chạy `start.vbs` (VBScript) — chạy node detached, không bị kill khi terminal đóng

---

## 9. Develop Local

```bash
git clone <repo>
cd web-giai-dau-5v5
cp .env.example .env   # điền các giá trị
npm install
npm run db:push
npm run dev            # http://localhost:5000 (hoặc PORT từ .env)
```

> ⚠️ **Port hiện tại đang dùng 25113** — sửa `PORT=25113` trong `.env`

---

## 10. Các Thay Đổi Gần Đây (Code Review)

### Bảo mật
- ✅ **CSP được bật** — helmet cấu hình whitelist các CDN + API cần thiết
- ✅ **Password admin không còn hardcode** — dùng env hoặc tự sinh
- ✅ `.env` trong `.gitignore` — kiểm tra không bị track

### Bug đã sửa
- ✅ **Match history** — `players.js` dùng biến `teamName` thay vì `player.teamId` so sánh với `team1Name`
- ✅ **Dockerfile port** — dùng `ARG PORT` thay vì hardcode `25113`
- ✅ **Duplicate Chart.js** — xóa script load lần 2 (chỉ giữ 1 bản)
- ✅ **`requireAdminAuth is not defined`** — thêm hàm `requireAdminAuth()` vào `app.js` (kiểm tra apiToken hoặc discordUser.isAdmin)
- ✅ **modals.js:260 SyntaxError** — sửa `openDraftPreviewModal` template literal bị lỗi ký tự đặc biệt

### Cấu trúc code
- ✅ **CSS tách riêng** — `public/css/style.css`, index.html sạch hơn
- ✅ **JS đã modular** — core/ + ui/ modules riêng biệt

### UI / Tính Năng Mới

#### Giải Thưởng (Guide Tab)
- ✅ **Thêm 2 giải mới:** Primmie (150k — player xuất sắc nhất) và Ace Đầu Tiên (150k — ace đầu giải)
- ✅ **Redesign layout:** 3 cột responsive, Vô Địch làm trung tâm (p-7, border vàng đậm), các giải phụ xếp xung quanh
- ✅ **Popup riêng từng giải:** mỗi thẻ giải thưởng mở popup riêng (popup-vodich, popup-nhi, popup-highlight, popup-primmie, popup-ace, popup-khuyenkhich) + popup tổng quan từ nút "Xem chi tiết"

#### Hồ Sơ Cá Nhân
- ✅ **Đổi tên:** "Hồ Sơ Discord" → "Hồ Sơ Cá Nhân"
- ✅ **Banner:** hiển thị ảnh nền từ `cardUrl` (Valorant card) mờ phía sau avatar
- ✅ **Level Badge:** gắn trên góc avatar (Lv...) từ `accountLevel`
- ✅ **Peak Rank:** hiển thị trong info column
- ✅ **Win Rate + K/D ratio:** tự động tính từ W/L và KDA
- ✅ **KDA chi tiết:** Kill / Death / Assist 3 ô riêng (xanh lá/đỏ/xanh dương)
- ✅ **Biểu đồ Elo:** Chart.js line chart lịch sử elo
- ✅ **Thành tích (Badges):** tự động hiện khi đạt: 10+ wins (vàng), 5+ wins (hổ phách), 3+ MVP (tím), K/D ≥ 2.0 (xanh lá), K/D ≥ 1.5 (xanh lá nhạt), Peak Rank
- ✅ **Tướng Tủ:** hiển thị agents từ `mainAgents` với màu theo role (Duelist=đỏ, Sentinel=xanh lá, Controller=xanh dương, Initiator=tím)
- ✅ **Roster clickable:** click vào thành viên team → mở profile

#### Profile Edit Modal
- ✅ **Thêm field "Tướng Tủ":** input text, nhập tên agent cách dấu phẩy (VD: `Jett, Reyna, Sova`)

### Database
- ✅ **Player model mở rộng:** thêm `mainAgents String? @default("")`, `cardUrl String? @default("")`, `accountLevel Int? @default(0)`, `achievements String? @default("[]")`, `discordAvatar String? @default("")`
- ✅ **Thêm 2 player mới:** `ph_30092010` (Discord 929759613073625108) và `_nk.lh._` (Discord 1414187629565575239)

### API
- ✅ **PUT /api/players/me:** nhận thêm trường `mainAgents`, lưu vào DB
- ✅ **Allowed fields:** thêm `mainAgents` vào danh sách validate

### Admin Panel
- ✅ **`requireAdminAuth()`** — hàm kiểm tra quyền admin trước khi thao tác
- ✅ **Dashboard:** 4 stats cards, donut phân bố rank, bar chart Top 5 Wins, activity feed từ audit log
- ✅ **Team Management:** team cards grid thay table, search + filter + sort, team detail modal 5 cột stats (pts nổi bật vàng)
- ✅ **Schedule:** match generation modal (format, rounds, start date, playoff), match edit/delete, admin match table

### Cần làm tiếp
- ⬜ Migrate SQLite → PostgreSQL nếu scale lớn
- ⬜ Chuyển frontend sang framework (React/Vue) để dễ maintain
- ⬜ Unit test cho API endpoints
- ⬜ Backup tự động database
- ⬜ Backfill avatar cho player cũ nếu có Discord Bot token
- ⬜ Đồng bộ rank từ Riot API cho player mới thêm thủ công
