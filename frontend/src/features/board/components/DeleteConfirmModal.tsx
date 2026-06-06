import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

import { DeleteConfirmModalProps } from "../types/index";

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  taskTitle,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") {
        onConfirm();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 sm:p-6 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all outline-none"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="flex flex-col items-center text-center gap-3 sm:gap-4 mt-2 sm:mt-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shadow-sm shrink-0">
            <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              Xác nhận xoá Task?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 px-1 sm:px-2 line-clamp-4">
              Ông có chắc chắn muốn xoá task{" "}
              <span className="font-bold text-slate-800">"{taskTitle}"</span>{" "}
              không? Hành động này không thể hoàn tác!
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full mt-3 sm:mt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all active:scale-95 outline-none"
            >
              Huỷ bỏ <span className="hidden sm:inline">(Esc)</span>
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-4 py-3 sm:py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-rose-200 transition-all active:scale-95 outline-none"
            >
              Xoá ngay <span className="hidden sm:inline">(Enter)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default DeleteConfirmModal;
