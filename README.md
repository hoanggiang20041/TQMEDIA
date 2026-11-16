# TQMEDIA — Nền tảng Marketing Mạng Xã Hội

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router) + TypeScript + Tailwind CSS |
| **Backend** | Express.js + TypeScript |
| **Shared** | Design tokens JSON |

## Cấu trúc dự án

```
TQMEDIA/
├── frontend/          # Next.js app
│   ├── src/
│   │   ├── app/       # Pages (file-based routing)
│   │   ├── components/ # Reusable components
│   │   └── lib/       # Utils, constants
│   └── tailwind.config.ts
├── backend/           # Express API server
│   └── src/server.ts
├── shared/            # Design tokens
└── docs/              # Documentation
```

## Cài đặt & Chạy

### 1. Cài đặt dependencies

```bash
cd d:\TQMEDIA

# Cài tất cả
cd frontend && npm install
cd ../backend && npm install
```

### 2. Chạy Frontend (Development)

```bash
cd frontend
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000**

### 3. Chạy Backend API (Optional)

```bash
cd backend
npm run dev
```

API tại: **http://localhost:4000**

## Các trang

| Route | Trang |
|-------|-------|
| `/` | Trang chủ (Landing page) |
| `/login` | Đăng nhập / Đăng ký |
| `/dashboard` | Bảng điều khiển |
| `/dashboard/tiktok` | Dịch vụ TikTok |
| `/dashboard/blog` | Blog |
| `/dashboard/courses` | Khóa học |
| `/dashboard/resources` | Kho tài nguyên |
| `/dashboard/profile` | Hồ sơ cá nhân |

## Design System

- **Theme**: Dark mode Glassmorphism
- **Colors**: Primary Purple (#7c3aed), Secondary Cyan (#4cd7f6)
- **Fonts**: Geist (headings), Inter (body)
- **Icons**: Material Symbols Outlined
