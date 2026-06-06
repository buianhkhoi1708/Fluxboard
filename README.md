# 🚀 Fluxboard - AI-Powered Project Management Platform

<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini" />
  <img src="https://img.shields.io/badge/AWS_S3-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS S3" />
</div>

<br />

**Fluxboard** là một hệ thống quản lý công việc và dự án theo mô hình Agile/Kanban, được thiết kế với kiến trúc hiện đại, linh hoạt. Dự án nổi bật với khả năng tích hợp AI để tự động hóa khởi tạo luồng công việc, hệ thống phân quyền đa cấp độ, lưu trữ đám mây, và khả năng đồng bộ dữ liệu theo thời gian thực.

## ✨ Tính năng cốt lõi

* **🤖 AI Board Generation (Gemini AI):** Tự động sinh cấu trúc bảng (Board), các cột (Columns) và thẻ công việc (Tasks) chi tiết chỉ từ một câu lệnh (Prompt) mô tả dự án.
* **🛡️ Advanced RBAC & Auto-Seeding:** Hệ thống phân quyền động, bảo mật và chia tách rõ ràng:
    * Quản lý cấp hệ thống (`SYSTEM_ADMIN`, `ADMIN`, `MANAGER`, `EMPLOYEE`). Hỗ trợ cơ chế tự động Seed dữ liệu Admin ngay khi khởi động.
    * Quản lý cấp dự án (`PROJECT_ADMIN`, `PM`, `LEAD`, `MEMBER`, `VIEWER`).
* **⚡ Real-time Collaboration:** Tích hợp WebSocket (Socket.IO) kết hợp với kỹ thuật *Optimistic UI Update* giúp các thao tác kéo thả (Drag & Drop) mượt mà, đồng bộ tức thì trên nhiều thiết bị.
* **☁️ Cloud Storage (AWS S3):** Upload, tải xuống và quản lý an toàn các tệp tin đính kèm (Attachments) của thẻ công việc thông qua Amazon S3.
* **⏰ Smart Deadline & Notifications:** Quản lý thời hạn công việc với hệ thống timezone chuẩn (`Asia/Ho_Chi_Minh`), tự động gửi Email nhắc nhở và kiểm soát số lần gia hạn (Extensions) của từng Task.

---

## 💻 Công nghệ sử dụng

### 🎨 Frontend
* **Framework:** React.js / TypeScript
* **Styling:** Tailwind CSS
* **State Management:** Zustand
* **Data Fetching:** React Query (`@tanstack/react-query`)
* **Drag & Drop:** `@dnd-kit/core`
* **HTTP Client:** Axios

### ⚙️ Backend
* **Runtime & Framework:** Node.js / Express.js
* **Database:** MongoDB & Mongoose
* **Real-time:** Socket.IO
* **Cloud & AI:** AWS SDK (S3), Google Gemini API
* **Security & Auth:** JSON Web Tokens (JWT), Custom RBAC Middleware
* **Mailing:** NodeMailer

---

## 🚀 Hướng dẫn cài đặt và khởi chạy

Vui lòng đảm bảo máy tính của bạn đã cài đặt sẵn [Node.js](https://nodejs.org/) và [MongoDB](https://www.mongodb.com/).

### 1. Cài đặt và cấu hình Backend

Di chuyển vào thư mục backend và cài đặt các thư viện cần thiết:
```bash
cd backend
npm install
```

Tạo file `.env` tại thư mục `backend` và điền đầy đủ các thông tin sau:
```env
# SERVER CONFIG
SERVER_HOST=localhost
SERVER_PORT=8080
APP_TIMEZONE=Asia/Ho_Chi_Minh

# DATABASE
MONGODB_URI=mongodb://localhost:27017/fluxboard

# AI INTEGRATION
GEMINI_API_KEY=your_google_gemini_api_key

# AUTHENTICATION
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION_MINUTES=1440
JWT_ISSUER=fluxboard_api

# EMAIL NOTIFICATION
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# RBAC SEEDING
SEED_DATA=true
SEED_SYSTEM_ADMIN_EMAIL=admin@fluxboard.com
SEED_SYSTEM_ADMIN_PASSWORD=Admin@123456

# AWS S3 (ATTACHMENTS)
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your_s3_bucket_name

# BUSINESS LOGIC
DEADLINE_MAX_EXTENSIONS=3
DEADLINE_REMINDER_OFFSET_MINUTES=1440
```

**Khởi chạy Backend Server:**
*(Nếu `SEED_DATA=true`, hệ thống sẽ tự động khởi tạo dữ liệu RBAC và tài khoản Admin trong lần chạy đầu tiên).*
```bash
node server
```
*Server sẽ bắt đầu lắng nghe tại: `http://localhost:8080`*

### 2. Cài đặt và chạy Frontend

Mở một Terminal mới, di chuyển vào thư mục frontend:
```bash
cd frontend
npm install
```

Tạo file `.env` tại thư mục `frontend` để trỏ API về Backend:
```env
VITE_API_URL=http://localhost:8080/api/v1
```

**Khởi chạy Frontend Server:**
```bash
npm run dev
```
*Truy cập vào ứng dụng thông qua trình duyệt tại địa chỉ được hiển thị ở Terminal (ví dụ: `http://localhost:5173`).*

---
