const BASE_URL: string = "http://localhost:8080/api";

export type HealthCheckResponse =
  | { success: true; data: any }
  | { success: false; error: string };

export const checkHealthAPI = async (): Promise<HealthCheckResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/health-check`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error! Status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data: data };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định";

    console.error("Lỗi khi kết nối BE:", errorMessage);
    return { success: false, error: errorMessage };
  }
};
