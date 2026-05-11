import React, { useState } from 'react';
import { boardApi } from '../../board/api/boardApi';

import {
  X,
  KanbanSquare,
  Loader2
} from 'lucide-react';

const CreateBoardModal = ({
  isOpen,
  onClose,
  projectId,
  onSuccess
}) => {

  // ==========================================
  // STATE
  // ==========================================
  const [name, setName] = useState('');

  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // CLOSE MODAL
  // ==========================================
  const handleClose = () => {

    if (isSubmitting) return;

    setName('');
    setDescription('');

    onClose();
  };

  // ==========================================
  // SUBMIT
  // ==========================================
  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    try {

      setIsSubmitting(true);

      // ==========================================
      // PAYLOAD
      // ==========================================
      const payload = {

        // ✅ backend đang dùng snake_case
        project_id: projectId,

        name: name.trim(),

        description: description.trim()
      };

      console.log(
        '📤 Creating board:',
        payload
      );

      // ==========================================
      // API
      // ==========================================
      const response =
        await boardApi.createBoard(payload);

      console.log(
        '✅ Create Board Response:',
        response
      );

      // ==========================================
      // SUCCESS
      // ==========================================
      if (response?.success || response?.data) {

        setName('');
        setDescription('');

        // refresh parent
        if (onSuccess) {
          onSuccess(response.data);
        }

        handleClose();
      }

    } catch (error) {

      console.error(
        '❌ Create Board Error:',
        error
      );

      const errorDetail =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to create board';

      alert(`Backend báo: ${errorDetail}`);

    } finally {

      setIsSubmitting(false);
    }
  };

  // ==========================================
  // HIDE
  // ==========================================
  if (!isOpen) {
    return null;
  }

  // ==========================================
  // RENDER
  // ==========================================
  return (

    <div
      className="
        fixed inset-0 z-[110]
        flex items-center justify-center
        bg-slate-900/40
        backdrop-blur-sm
        p-4
      "
    >

      <div
        className="
          w-full max-w-md
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
          animate-in zoom-in-95 duration-200
        "
      >

        {/* ========================================== */}
        {/* HEADER */}
        {/* ========================================== */}

        <div
          className="
            flex items-center justify-between
            border-b border-slate-100
            bg-slate-50/50
            px-6 py-4
          "
        >

          <h2
            className="
              flex items-center gap-2
              text-lg font-bold text-slate-800
            "
          >
            <KanbanSquare
              size={20}
              className="text-indigo-600"
            />

            Create New Board
          </h2>

          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="
              text-slate-400
              transition-colors
              hover:text-rose-500
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* ========================================== */}
        {/* FORM */}
        {/* ========================================== */}

        <form
          onSubmit={handleSubmit}
          className="p-6"
        >

          <div className="space-y-4">

            {/* ========================================== */}
            {/* BOARD NAME */}
            {/* ========================================== */}

            <div>

              <label
                className="
                  mb-1.5 block
                  text-xs font-bold uppercase
                  text-slate-500
                "
              >
                Board Name *
              </label>

              <input
                type="text"

                value={name}

                onChange={(e) =>
                  setName(e.target.value)
                }

                placeholder="
                  e.g. Sprint Planning,
                  Bug Tracker...
                "

                className="
                  w-full rounded-xl
                  border border-slate-200
                  bg-slate-50
                  px-4 py-2
                  text-sm font-medium
                  outline-none
                  transition-all

                  focus:border-indigo-400
                  focus:ring-4
                  focus:ring-indigo-100
                "

                required

                autoFocus
              />
            </div>

            {/* ========================================== */}
            {/* DESCRIPTION */}
            {/* ========================================== */}

            <div>

              <label
                className="
                  mb-1.5 block
                  text-xs font-bold uppercase
                  text-slate-500
                "
              >
                Description
              </label>

              <textarea
                value={description}

                onChange={(e) =>
                  setDescription(e.target.value)
                }

                rows={3}

                placeholder="
                  Optional board description...
                "

                className="
                  w-full rounded-xl
                  border border-slate-200
                  bg-slate-50
                  px-4 py-3
                  text-sm
                  outline-none
                  transition-all

                  focus:border-indigo-400
                  focus:ring-4
                  focus:ring-indigo-100
                "
              />
            </div>
          </div>

          {/* ========================================== */}
          {/* ACTIONS */}
          {/* ========================================== */}

          <div
            className="
              mt-8 flex items-center justify-end gap-3
              border-t border-slate-100
              pt-4
            "
          >

            <button
              type="button"

              onClick={handleClose}

              disabled={isSubmitting}

              className="
                rounded-lg
                px-5 py-2
                text-sm font-bold
                text-slate-500

                hover:bg-slate-100
              "
            >
              Cancel
            </button>

            <button
              type="submit"

              disabled={
                isSubmitting ||
                !name.trim()
              }

              className="
                flex items-center gap-2
                rounded-lg
                bg-indigo-600
                px-6 py-2
                text-sm font-bold text-white
                transition-all

                hover:bg-indigo-700
                active:scale-95

                disabled:bg-slate-300
              "
            >

              {isSubmitting ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Creating...
                </>
              ) : (
                'Create Board'
              )}

            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;