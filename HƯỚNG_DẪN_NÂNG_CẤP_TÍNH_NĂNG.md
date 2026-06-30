# HƯỚNG DẪN NÂNG CẤP TÍNH NĂNG — EVAN CUP

## 1. Tổng Quan Kiến Trúc

```
public/
├── index.html         # Giao diện (SPA, ~2200 dòng, Tailwind CDN)
├── js/app.js          # Logic frontend (~3660 dòng, Vanilla JS)
└── css/style.css      # Animation keyframes (nhỏ)

src/
├── server.js          # Entry point, middleware, route mounting
├── routes/            # 16 route files (API endpoints)
├── controllers/       # Business logic (9 files)
├── middleware/        # auth, discordAuth, validate, sanitize
├── utils/             # prisma, socket, logger, audit, profanity, reminder
└── discord/           # Discord bot (slash commands + reminder)

prisma/
└── schema.prisma     # 16 models, SQLite database
```

**Công nghệ:**
- Backend: Node.js + Express
- Database: SQLite (via Prisma ORM)
- Realtime: Socket.IO
- Auth: Discord OAuth (người chơi) + JWT (admin)
- Frontend: Vanilla JS, Tailwind CSS CDN, Chart.js, FontAwesome

---

## 2. QUY TẮC VÀNG KHI THÊM TÍNH NĂNG

### 2.1. Frontend — KHÔNG ĐƯỢC SỬA các thứ sau

**Không đổi ID element** — `app.js` dùng `document.getElementById('id')` để truy cập. Đổi ID = hỏng.

**Không đổi tên hàm JS** — Các hàm được gọi từ `onclick` trong HTML:
- `switchTab('tab-id')`, `handleRegistration(event)`, `openProfile(discordId)`
- `openAdminLoginModal()`, `loginDiscord()`, `logoutDiscord()`
- `openProfileEdit()`, `saveProfileEdit()`, `renameTeam()`, `leaveTeam()`
- `lookupRiotIdForRegister()`, `loadH2H()`, `openTeamDetail(name)`

**Không xoá các element ẩn quan trọng:**
- `<canvas id="confetti-canvas">` — confetti + particle effects
- `<div id="context-menu">` — right-click context menu
- `<div id="toast-container">` — toast notification
- `<div id="loading-overlay">` — loading spinner
- `<div id="obs-widget-overlay">` — OBS stream overlay
- Tất cả modal containers (dù đang `hidden`)

**Không xoá các CDN script:** Tailwind CSS, FontAwesome, Socket.IO, Chart.js

### 2.2. Frontend — Quy tắc khi thêm code mới

**Nếu cần element mới:**
```html
<div id="my-new-feature" class="...">nội dung</div>
```
- Dùng ID **không trùng** với 261+ ID đã tồn tại
- Thêm vào HTML, truy cập trong JS bằng `document.getElementById('my-new-feature')`

**Nếu cần hàm mới:**
```js
// Pattern chuẩn
async function myNewFeature() {
    try {
        const data = await api('/api/my-endpoint', { method: 'POST', body: { ... } });
        showToast('Thành công!', 'success');
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}
```

**Nếu cần API call:**
```js
// Dùng hàm api() có sẵn — tự động gửi auth token + parse JSON
const data = await api('/api/players/me');
const result = await api('/api/teams/all');

// POST có body
const created = await api('/api/players', { method: 'POST', body: { name: '...' } });
```

**Nếu cần Toast:**
```js
showToast('Nội dung', 'success');   // success / error / info / warning
```

**Nếu cần Loading:**
```js
showLoading('Đang xử lý...');
// ... làm gì đó ...
hideLoading();
```

**Nếu cần Socket.IO realtime:**
```js
// Socket đã có sẵn trong biến global `socket`
socket.emit('my:event', data);
socket.on('my:response', (data) => { ... });
```

**Nếu cần Modal:**
```js
// Mở
document.getElementById('my-modal').classList.remove('hidden');
// Đóng
document.getElementById('my-modal').classList.add('hidden');
```

### 2.3. Backend — Pattern route

```js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');           // Admin JWT
const discordAuth = require('../middleware/discordAuth'); // Discord JWT
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const prisma = require('../utils/prisma');
const { logAction } = require('../utils/audit');
const { getIO } = require('../utils/socket');

// Pattern chuẩn cho 1 route
router.get('/my-data', auth, async (req, res, next) => {
  try {
    const data = await prisma.model.findMany();
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/my-data', discordAuth,
  body('name').trim().notEmpty().withMessage('Name required'),
  validate,
  async (req, res, next) => {
    try {
      const { name } = req.body;
      const item = await prisma.model.create({ data: { name } });
      logAction('my.create', name);
      const io = getIO();
      if (io) io.emit('my:created', item);
      res.status(201).json(item);
    } catch (e) { next(e); }
  }
);

module.exports = router;
```

### 2.4. Backend — Auth middleware nào dùng?

| Middleware | Dùng cho | req có gì |
|---|---|---|
| `auth` | Admin (JWT từ cookie/header) | `req.user` |
| `discordAuth` | Người chơi Discord (JWT từ cookie) | `req.discordUser` (có `.discordId`, `.discordUsername`) |
| `orAuth` (định nghĩa trong file route) | Cả admin lẫn Discord | `req.user` HOẶC `req.discordUser` |

**`orAuth` pattern** — copy function này nếu route file chưa có:
```js
function orAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  const discord = req.cookies?.discord_token;
  const jwt = require('jsonwebtoken');
  try { if (token) { req.user = jwt.verify(token, process.env.JWT_SECRET); return next(); } } catch(_) {}
  try { if (discord) { const d = jwt.verify(discord, process.env.JWT_SECRET); if (d.type === 'discord') { req.discordUser = d; return next(); } } } catch(_) {}
  return res.status(401).json({ error: 'Vui lòng đăng nhập' });
}
```

### 2.5. Backend — Pattern controller

```js
const prisma = require('../utils/prisma');
const { getIO } = require('../utils/socket');
const { logAction } = require('../utils/audit');

exports.myAction = async (req, res, next) => {
  try {
    const data = await prisma.model.findMany();
    // Luôn dùng try/catch + next(e)
    res.json(data);
  } catch (e) { next(e); }
};
```

### 2.6. Backend — Socket.IO events

Các event đã dùng trong hệ thống (không nên trùng tên):
```
match:created, match:result, matches:generated
score:report, score:report-resolved
player:created
team:created, team:approved, team:deleted, teams:reload
joinRequest:created, joinRequest:resolved
checkin:updated, dispute:created, dispute:updated
penalty:added, notification:created
stream:started, stream:stopped, stream:score, stream:casters
caster:added, caster:removed
veto:update, veto:reset
bracket:generated, mvp:assigned, kda:updated
```

### 2.7. Backend — Notification + Audit

```js
// Notification (trong DB + socket realtime)
try {
  const { createNotification } = require('./notifications');
  await createNotification('match_result', 'Team A thắng 2-1', { matchId: '...' });
} catch(e) {}

// Audit log
const { logAction } = require('../utils/audit');
await logAction('my.action', 'Chi tiết hành động');
```

---

## 3. THÊM MODEL MỚI

### 3.1. Thêm vào Prisma schema

```prisma
// prisma/schema.prisma
model MyNewModel {
  id        String   @id @default(cuid())
  name      String
  value     Int      @default(0)
  createdAt DateTime @default(now())
}
```

### 3.2. Push database

```bash
npx prisma db push
```

---

## 4. THÊM API ENDPOINT MỚI

### 4.1. Tạo file route

`src/routes/my-feature.js`:

```js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../utils/prisma');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { logAction } = require('../utils/audit');
const { getIO } = require('../utils/socket');

router.get('/', auth, async (req, res, next) => {
  try {
    const items = await prisma.myNewModel.findMany();
    res.json(items);
  } catch (e) { next(e); }
});

router.post('/', auth,
  body('name').trim().notEmpty().withMessage('Name is required'),
  validate,
  async (req, res, next) => {
    try {
      const item = await prisma.myNewModel.create({ data: { name: req.body.name } });
      logAction('my-feature.create', item.name);
      const io = getIO();
      if (io) io.emit('my-feature:created', item);
      res.status(201).json(item);
    } catch (e) { next(e); }
  }
);

module.exports = router;
```

### 4.2. Mount vào server

`src/server.js` — thêm dòng:
```js
app.use('/api/my-feature', require('./routes/my-feature'));
```

### 4.3. Thêm vào frontend

Trong `public/js/app.js`:
```js
async function loadMyFeature() {
    try {
        const data = await api('/api/my-feature');
        // render vào container
        document.getElementById('my-feature-container').innerHTML = ...;
    } catch(e) {
        showToast('Lỗi: ' + e.message, 'error');
    }
}
```

Trong `public/index.html` — thêm container:
```html
<div id="my-feature-container">Đang tải...</div>
<button onclick="loadMyFeature()">Tải dữ liệu</button>
```

---

## 5. NHỮNG LỖI THƯỜNG GẶP & CÁCH TRÁNH

### ❌ Lỗi 1: Quên await
```js
// SAI — promise không được resolve
const data = api('/api/players');  // data = Promise object

// ĐÚNG
const data = await api('/api/players');
```

### ❌ Lỗi 2: Không try/catch API call
```js
// SAI — nếu API lỗi, Promise rejection không bắt
const data = await api('/api/players');

// ĐÚNG
try {
    const data = await api('/api/players');
} catch(e) {
    showToast('Lỗi: ' + e.message, 'error');
}
```

### ❌ Lỗi 3: Quên next(e) trong route
```js
// SAI — lỗi treo, không có response
router.get('/data', async (req, res) => {
    const data = await prisma.model.findMany(); // nếu lỗi → crash
    res.json(data);
});

// ĐÚNG
router.get('/data', async (req, res, next) => {
    try {
        const data = await prisma.model.findMany();
        res.json(data);
    } catch (e) { next(e); }
});
```

### ❌ Lỗi 4: Đổi ID element
```js
// Trong HTML:
<div id="old-id">...</div>

// Trong JS:
document.getElementById('old-id') // Nếu đổi thành 'new-id' → JS không tìm thấy
```

### ❌ Lỗi 5: Dùng biến chưa khai báo
```js
// SAI — thiếu const/let
myVar = 'hello'; // global scope, dễ conflict

// ĐÚNG
const myVar = 'hello';
```

### ❌ Lỗi 6: Không kiểm tra null
```js
// SAI — nếu data null → crash
const p = data.player;
console.log(p.displayName);

// ĐÚNG
const p = data.player;
if (!p) { showToast('Không tìm thấy', 'error'); return; }
console.log(p.displayName);
```

---

## 6. QUY TRÌNH THÊM TÍNH NĂNG MỚI

```
1. Phân tích yêu cầu
2. Xác định model (có cần model mới không?)
3. Thêm model vào prisma/schema.prisma
4. Chạy npx prisma db push
5. Tạo controller + route (backend)
6. Mount route vào src/server.js
7. Thêm UI vào public/index.html
8. Thêm JS vào public/js/app.js
9. Test thủ công:
   - Mở http://localhost:5000
   - F12 → Console: không có lỗi đỏ
   - Test API (Postman hoặc fetch)
   - Test giao diện
10. Commit + push
```

## 7. CÁCH TEST

```bash
# 1. Kiểm tra syntax JS
node -e "new Function(require('fs').readFileSync('public/js/app.js','utf8')); console.log('OK');"

# 2. Kiểm tra server khởi động (local)
npm run dev

# 3. Mở trình duyệt → http://localhost:5000
# 4. F12 → Console: không lỗi
# 5. Test chức năng mới
# 6. Test các tab khác không bị ảnh hưởng
```

## 8. FILE CẦN QUAN TÂM

| File | Vai trò | Khi thêm feature |
|---|---|---|
| `prisma/schema.prisma` | Định nghĩa database | ✅ Thêm model mới |
| `src/server.js` | Mount routes | ✅ Thêm `app.use('/api/...', require(...))` |
| `src/routes/*.js` | API endpoints | ✅ Thêm route mới hoặc sửa route cũ |
| `src/controllers/*.js` | Business logic | ✅ Thêm controller mới |
| `src/middleware/*.js` | Auth, validation | ✅ Dùng có sẵn, không cần sửa |
| `src/utils/*.js` | Helpers | ✅ Dùng có sẵn |
| `public/index.html` | UI | ✅ Thêm container/button mới |
| `public/js/app.js` | Logic frontend | ✅ Thêm hàm mới |
| `.env` | Config | ✅ Nếu cần biến môi trường mới |

## 9. KẾT LUẬN

- **Không đổi ID, không đổi tên hàm** = không hỏng tính năng cũ
- **Dùng `api()`, `showToast()`, `showLoading()`** có sẵn
- **Backend: async + try/catch + next(e)** trong mọi route
- **Thêm model → push DB → route → controller → HTML → JS**
- **Test kỹ trước khi commit**
