# Triển khai và đánh giá các cơ chế truyền thông Realtime trên web

## Công nghệ sử dụng

### Backend
- Node.js
- ExpressJS
- MongoDB

### Frontend
- ReactJS
- Vite
- Zustand
- Tenstack
---

# Clone Project

```bash
git clone -b Seminar https://github.com/buianhkhoi1708/Fluxboard.git
cd Fluxboard
Chạy Backend
cd backend
npm install
node server

Hoặc:

npm run dev
Chạy Frontend

Mở terminal mới:

cd frontend
npm install
npm run dev

Frontend chạy tại:

http://localhost:5173

Backend chạy tại:

http://localhost:8080
Biến môi trường Backend

Tạo file .env trong thư mục backend:

SERVER_HOST=localhost
SERVER_PORT=8080

MONGODB_URI=mongodb+srv://fluxboard_admin:Fluxboard12345@cluster0.sknswiy.mongodb.net/fluxboard

GEMINI_API_KEY=your_key

JWT_SECRET=your_secret
JWT_EXPIRATION_MINUTES=3600
JWT_ISSUER=your_issuer

EMAIL=fluxboardteam@gmail.com
EMAIL_PASSWORD=wmxf bsxi oyzm visl

SEED_DATA=false
SEED_SYSTEM_ADMIN_EMAIL=systemadmin@gmail.com
SEED_SYSTEM_ADMIN_PASSWORD=@Systemadmin

AWS_ACCESS_KEY=your_key
AWS_SECRET_KEY=your_key
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=your_bucket

DEADLINE_MAX_EXTENSIONS=2
DEADLINE_REMINDER_OFFSET_MINUTES=1440
APP_TIMEZONE=Asia/Ho_Chi_Minh

Tạo file .env trong thư mục frontend:
VITE_API_BASE_URL=http://localhost:8080/api/v1

Lưu ý
Chạy backend trước frontend
Sử dụng đúng branch Seminar
