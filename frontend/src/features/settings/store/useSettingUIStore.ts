import { create } from "zustand";

interface SettingUiState {
  message: { type: "success" | "error" | ""; text: string };
  setMessage: (type: "success" | "error" | "", text: string) => void;
  clearMessage: () => void;
}

export const useSettingUiStore = create<SettingUiState>((set) => ({
  message: { type: "", text: "" },

  setMessage: (type, text) => set({ message: { type, text } }),
  clearMessage: () => set({ message: { type: "", text: "" } }),
}));
