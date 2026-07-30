import type { ReactNode } from "react";

import Button from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;

  onClose: () => void;

  onConfirm?: () => void;

  confirmText?: string;
}

const Modal = ({
  open,
  title,
  children,
  onClose,
  onConfirm,
  confirmText = "Confirm",
}: ModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed
        inset-0
        z-50

        flex
        items-center
        justify-center

        bg-black/50

        px-4
      "
    >
      <div
        className="
          w-full
          max-w-md

          rounded-2xl

          bg-white

          p-6

          shadow-xl

          dark:bg-slate-900
        "
      >
        <h2
          className="
            text-xl
            font-bold

            text-slate-900

            dark:text-white
          "
        >
          {title}
        </h2>

        <div
          className="
            mt-4

            text-slate-600

            dark:text-slate-400
          "
        >
          {children}
        </div>

        <div
          className="
            mt-6

            flex
            justify-end

            gap-3
          "
        >
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          {onConfirm && (
            <Button variant="danger" onClick={onConfirm}>
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
