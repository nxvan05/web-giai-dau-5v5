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
├── public/               # Frontend (static files)
│   ├── index.html         # Toàn bộ giao diện (SPA, ~2200 dòng)
│   ├── js/app.js          # Toàn bộ logic frontend (~3500 dòng)
│   └── ...                # ảnh, CSS, favicon
├── src/
│   ├── server.js          # Entry point + middleware
│   ├── routes/            # 18 file route (API endpoints)
│   ├── controllers/       # Business logic
│   ├── middleware/         # auth, discordAuth, validate, sanitize
│   ├── utils/             # prisma, logger, socket, profanity, audit
│   └── discord/           # Discord bot (node-cron reminders)
├── prisma/
│   └── schema.prisma      # 18 models (Player, Team, Match, ...)
├── scripts/               # seed, tạo admin
├── .env                   # Config (xem mục 4)
└── package.json
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

### Admin account
- Tạo bằng script: `node scripts/create-admin.js`
- Mặc định: username `evan`, password `evankk123`

### Tên đội
- Tên đội được kiểm tra trùng lặp + profanity filter (tiếng Việt + Anh)
- Profanity list ở `src/utils/profanity.js`

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

---

## 9. Develop Local

```bash
git clone <repo>
cd web-giai-dau-5v5
cp .env.example .env   # điền các giá trị
npm install
npm run db:push
npm run dev            # http://localhost:5000
```
