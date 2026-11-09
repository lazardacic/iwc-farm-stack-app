import { useEffect, useId } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import type { IconType } from "react-icons";
import {
  FiBold,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiItalic,
  FiList,
} from "react-icons/fi";
import { MdFormatListNumbered, MdFormatQuote } from "react-icons/md";

interface RichTextEditorProps {
  label: string;
  // HTML; read once when the editor is created.
  value: string;
  // Called on every change with the HTML and the plain text.
  onChange: (html: string, text: string) => void;
  error?: string;
}

// Only what the backend allowlist keeps (backend/utils/rich_text.py):
// paragraphs, bold, italic, H2, H3, lists and quotes. Everything else is off,
// so pasted links, code or images do not end up in the document.
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: false,
    strike: false,
    underline: false,
  }),
];

const RichTextEditor = ({ label, value, onChange, error }: RichTextEditorProps) => {
  const labelId = useId();
  const errorId = useId();

  const editor = useEditor({
    extensions,
    content: value,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": labelId,
        class:
          "rich-text min-h-48 px-4 py-3 text-slate-900 focus:outline-none dark:text-white",
      },
    },
    onUpdate: ({ editor: current }) => {
      // The editor keeps an empty paragraph after a list or quote so the cursor
      // can leave it; it is not part of the content.
      const html = current.isEmpty ? "" : current.getHTML().replace(/(<p><\/p>)+$/, "");
      onChange(html, current.getText({ blockSeparator: "\n\n" }).trim());
    },
  });

  // Editor attributes are set once, so the error state is applied here.
  useEffect(() => {
    const element = editor?.view.dom;
    if (!element) return;
    if (error) {
      element.setAttribute("aria-invalid", "true");
      element.setAttribute("aria-describedby", errorId);
    } else {
      element.removeAttribute("aria-invalid");
      element.removeAttribute("aria-describedby");
    }
  }, [editor, error, errorId]);

  // Re-renders only the toolbar when the active marks change.
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      h2: current?.isActive("heading", { level: 2 }) ?? false,
      h3: current?.isActive("heading", { level: 3 }) ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
      blockquote: current?.isActive("blockquote") ?? false,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false,
    }),
  });

  const buttons: {
    label: string;
    icon?: IconType;
    text?: string;
    pressed?: boolean;
    disabled?: boolean;
    run: () => void;
  }[] = [
    { label: "Bold", icon: FiBold, pressed: active?.bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: "Italic", icon: FiItalic, pressed: active?.italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { label: "Heading", text: "H2", pressed: active?.h2, run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Subheading", text: "H3", pressed: active?.h3, run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bullet list", icon: FiList, pressed: active?.bulletList, run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: MdFormatListNumbered, pressed: active?.orderedList, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: MdFormatQuote, pressed: active?.blockquote, run: () => editor?.chain().focus().toggleBlockquote().run() },
    { label: "Undo", icon: FiCornerUpLeft, disabled: !active?.canUndo, run: () => editor?.chain().focus().undo().run() },
    { label: "Redo", icon: FiCornerUpRight, disabled: !active?.canRedo, run: () => editor?.chain().focus().redo().run() },
  ];

  return (
    <div className="flex w-full flex-col gap-2">
      <span id={labelId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>

      <div
        className={clsx(
          "overflow-hidden rounded-xl border bg-white transition focus-within:ring-2 dark:bg-slate-900",
          error
            ? "border-red-400 focus-within:ring-red-500/20"
            : "border-slate-300 focus-within:border-blue-500 focus-within:ring-blue-500/20 dark:border-slate-700",
        )}
      >
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-950"
        >
          {buttons.map(({ label: buttonLabel, icon: Icon, text, pressed, disabled, run }) => (
            <button
              key={buttonLabel}
              type="button"
              title={buttonLabel}
              aria-label={buttonLabel}
              aria-pressed={pressed === undefined ? undefined : pressed}
              disabled={disabled || !editor}
              onClick={run}
              className={clsx(
                "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
                pressed
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                  : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800",
              )}
            >
              {Icon ? <Icon aria-hidden="true" /> : text}
            </button>
          ))}
        </div>

        <EditorContent editor={editor} />
      </div>

      {error && (
        <p id={errorId} className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default RichTextEditor;
