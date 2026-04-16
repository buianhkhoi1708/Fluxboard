// Cấu hình URL mặc định của Backend
const BASE_URL: string = 'http://localhost:8080/api';

// Định nghĩa kiểu dữ liệu trả về của API Health Check
// Dùng Union Type để phân biệt rõ trường hợp thành công và thất bại
export type HealthCheckResponse = 
  | { success: true; data: any } // Thay 'any' bằng interface cụ thể nếu bạn biết rõ BE trả về gì
  | { success: false; error: string };

/**
 * Hàm kiểm tra sức khỏe của Backend
 * Trả về một Object chứa trạng thái thành công và dữ liệu
 */
export const checkHealthAPI = async (): Promise<HealthCheckResponse> => {
  try {
    // Gọi phương thức GET tới endpoint /health-check
    const response = await fetch(`${BASE_URL}/health-check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    // Chuyển đổi dữ liệu trả về sang dạng JSON
    const data = await response.json();
    return { success: true, data: data };

  } catch (error: unknown) {
    // Trong TypeScript, error trong khối catch mặc định là unknown, 
    // ta cần ép kiểu hoặc kiểm tra (instanceof) để lấy message an toàn.
    const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";
    
    console.error("Lỗi khi kết nối BE:", errorMessage);
    return { success: false, error: errorMessage };
  }
};