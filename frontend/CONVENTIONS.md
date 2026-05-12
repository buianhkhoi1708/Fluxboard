# Fluxboard Project Conventions - Frontend (Bản đơn giản - Tiếng Việt)

## 1. Nguyên tắc chung

- Tách biệt UI và Logic: Component chỉ để hiển thị (View). Logic tính toán, gọi API phải đẩy ra Custom Hooks hoặc Store.
- Dumb & Smart Component: Ưu tiên viết component "ngu" (chỉ nhận props và render). Component "thông minh" (gọi API, lấy state) chỉ đặt ở cấp cao nhất (Pages/Features).
- Tuyệt đối không dùng `any`: Code TypeScript 100%, phải định nghĩa `Interface` hoặc `Type` rõ ràng.
- Sử dụng React 18+ và Vite.

---

## 2. Cấu trúc thư mục (Feature-Based)

Dự án áp dụng kiến trúc gom nhóm theo tính năng (Feature-driven):

### Core (dùng chung toàn app)

- `src/components`: UI Components câm (Button, Modal, Input...). Không chứa logic business.
- `src/layouts`: Layout chuẩn (MainLayout, AuthLayout...).
- `src/lib`: Cấu hình thư viện (AxiosClient, Dnd-kit config).
- `src/utils`: Hàm helpers dùng chung (formatDate, calculate...).
- `src/routes`: Cấu hình React Router DOM.

### Feature module (Nghiệp vụ cốt lõi)

- `src/features/<tên-tính-năng>/api`: Các hàm gọi API (boardApi.ts).
- `src/features/<tên-tính-năng>/components`: UI riêng của tính năng.
- `src/features/<tên-tính-năng>/stores`: Zustand store (useBoardStore.ts).
- `src/features/<tên-tính-năng>/types`: Interfaces/Types.
- `src/features/<tên-tính-năng>/index.ts`: File export public.

---

## 3. Quy ước Đặt tên (Naming Convention)

- Component & Pages: PascalCase (VD: `CardItem.tsx`, `DashboardPage.tsx`).
- Hàm, Biến, Hooks: camelCase (VD: `fetchBoardData`, `useBoardStore`, `isOpen`).
- Hằng số (Constants): UPPER_SNAKE_CASE (VD: `MAX_WIP_LIMIT`, `API_BASE_URL`).
- Interface / Type: Bắt đầu bằng chữ `I` hoặc `T` (VD: `IBoard`, `TUserStatus`).

---

## 4. Xử lý API & Kết nối Backend

- Không dùng `fetch`/`axios` trực tiếp trong Component.
- Tất cả API phải đi qua `AxiosClient` (đã config sẵn Base URL là `/api/v1` và tự động gắn Token).
- Dữ liệu trả về từ Backend (bọc trong `ApiResponse`) phải được "bóc vỏ" ngay tại tầng API. Component chỉ nhận data thuần.

### Ví dụ bóc vỏ dữ liệu chuẩn:

```typescript
// Trong tầng api/boardApi.ts
const response = await axiosClient.get('/boards/123');
// Trả về thẳng response.data.data cho Store/Component xài
return response.data.data;
```
## 5. Quản lý Trạng thái (State Management)

- Local State (`useState`, `useReducer`): Dành cho UI nội bộ (đóng mở modal, text đang gõ trong input).
- Global State (`Zustand`): Dành cho dữ liệu nghiệp vụ (Board Data, User Auth) cần share giữa nhiều component.
- Server State: Dành cho dữ liệu fetch từ API. Khuyến khích dùng `TanStack Query` (React Query) kết hợp với Zustand nếu dự án lớn.

---

## 6. Xử lý Lỗi & Loading (Error Handling)

- Bắt buộc phải có trạng thái `isLoading` khi gọi API để khóa nút bấm (tránh spam) và hiện Spinner/Skeleton.
- Bắt lỗi: Dùng `try/catch` ở tầng gọi API. Lỗi phải được show ra cho người dùng bằng thư viện Toast (VD: `react-toastify` hoặc `sonner`).
- Lỗi 401 (Unauthorized): Axios Interceptor sẽ tự động đá văng ra màn hình Login. Frontend không cần xử lý tay từng API.

---

## 7. Validation Form

- Không validate bằng tay (bằng `if/else`).
- Bắt buộc sử dụng `React Hook Form` kết hợp với `Zod` hoặc `Yup` để validate phía Client.
- Đồng bộ rules validate với Backend (VD: Tên bảng không để trống, mật khẩu ít nhất 8 ký tự).

---

## 8. Styling (Tailwind CSS)

- Không dùng Inline Style (`style={{ color: 'red' }}`).
- Gom nhóm class Tailwind hợp lý (Layout -> Spacing -> Typography -> Colors -> Effects).
- Dùng `clsx` hoặc `tailwind-merge` để nối class động (đặc biệt khi viết UI Component dùng chung).

---

## 9. Configuration (.env)

- Biến môi trường phải bắt đầu bằng `VITE_` (VD: `VITE_API_BASE_URL`).
- Tuyệt đối không commit file `.env` lên GitHub.
- Cập nhật các key cần thiết vào file `.env.example` để member mới biết đường setup.

---

## 10. Code Review Checklist (Dành cho Frontend)

- [ ] Component có bị phình to không? (Nên < 200 dòng).
- [ ] Đã tách logic gọi API ra file riêng chưa?
- [ ] Có hardcode chữ/text/màu sắc không? (Nên dùng hằng số hoặc theme Tailwind).
- [ ] Đã có trạng thái Loading và xử lý Error khi call API chưa?
- [ ] Giao diện có vỡ trên màn hình nhỏ (Responsive) không?
- [ ] Tuyệt đối không còn `console.log()` nào bị sót lại trước khi tạo Pull Request.
