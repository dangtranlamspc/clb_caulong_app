"use client";
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import {
    Bold as BoldIcon,
    Italic as ItalicIcon,
    Underline as UnderlineIcon,
    List,
    ListOrdered,
    Link as LinkIcon,
} from "lucide-react";

const TEXT_COLORS = [
    { value: "", label: "Mặc định", swatch: "#111827" },
    { value: "#ef4444", label: "Đỏ", swatch: "#ef4444" },
    { value: "#f59e0b", label: "Vàng", swatch: "#f59e0b" },
    { value: "#10b981", label: "Xanh lá", swatch: "#10b981" },
    { value: "#3b82f6", label: "Xanh dương", swatch: "#3b82f6" },
    { value: "#8b5cf6", label: "Tím", swatch: "#8b5cf6" },
];

const FONT_SIZES = [
    { value: "12px", label: "Nhỏ" },
    { value: "", label: "Vừa" },
    { value: "18px", label: "Lớn" },
    { value: "22px", label: "Rất lớn" },
];

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    minHeight?: number;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder,
    minHeight = 120,
}: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            FontSize,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: { rel: "noopener noreferrer" },
            }),
        ],
        content: value || "",
        editorProps: {
            attributes: {
                class: "prose prose-sm max-w-none focus:outline-none",
            },
        },
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    useEffect(() => {
        if (!editor) return;
        const isFocused = editor.view.hasFocus();
        if (!isFocused && value !== editor.getHTML()) {
            editor.commands.setContent(value || "", { emitUpdate: false });
        }
    }, [value, editor]);

    if (!editor) return null;

    const setLink = () => {
        const previousUrl = editor.getAttributes("link").href;
        const url = window.prompt("Nhập URL:", previousUrl || "");
        if (url === null) return;
        if (url === "") {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().setLink({ href: url }).run();
    };

    const isEmpty = editor.isEmpty;
    const activeColor = editor.getAttributes("textStyle").color || "";
    const activeSize = editor.getAttributes("textStyle").fontSize || "";

    return (
        <div className="rounded-lg border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
            <div className="flex items-center flex-wrap gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
                <ToolbarButton
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    label="Đậm"
                >
                    <BoldIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    label="Nghiêng"
                >
                    <ItalicIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("underline")}
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    label="Gạch chân"
                >
                    <UnderlineIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <ToolbarButton
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    label="Danh sách chấm"
                >
                    <List className="w-3.5 h-3.5" />
                </ToolbarButton>
                <ToolbarButton
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    label="Danh sách số"
                >
                    <ListOrdered className="w-3.5 h-3.5" />
                </ToolbarButton>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <ToolbarButton active={editor.isActive("link")} onClick={setLink} label="Chèn liên kết">
                    <LinkIcon className="w-3.5 h-3.5" />
                </ToolbarButton>
                <div className="w-px h-4 bg-gray-200 mx-1" />

                <div className="flex items-center gap-1 px-1">
                    {TEXT_COLORS.map((c) => (
                        <button
                            key={c.label}
                            type="button"
                            title={c.label}
                            onClick={() => {
                                if (c.value) editor.chain().focus().setColor(c.value).run();
                                else editor.chain().focus().unsetColor().run();
                            }}
                            className={`rounded-full border-2 transition-transform ${activeColor === c.value ? "border-gray-900 scale-110" : "border-white"
                                }`}
                            style={{ backgroundColor: c.swatch, width: 18, height: 18 }}
                        />
                    ))}
                </div>
                <div className="w-px h-4 bg-gray-200 mx-1" />

                <select
                    value={activeSize}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val) editor.chain().focus().setFontSize(val).run();
                        else editor.chain().focus().unsetFontSize().run();
                    }}
                    className="text-xs rounded-md border border-gray-200 bg-white px-1.5 py-1 outline-none"
                >
                    {FONT_SIZES.map((s) => (
                        <option key={s.label} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>
            </div>
            <div className="relative">
                {isEmpty && placeholder && (
                    <p className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none">
                        {placeholder}
                    </p>
                )}
                <EditorContent
                    editor={editor}
                    className="px-3 py-2 text-sm [&_.ProseMirror]:outline-none"
                    style={{ minHeight }}
                />
            </div>
        </div>
    );
}

function ToolbarButton({
    children,
    active,
    onClick,
    label,
}: {
    children: React.ReactNode;
    active?: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`p-1.5 rounded-md transition-colors ${active ? "bg-gray-200 text-gray-900" : "text-gray-500 hover:bg-gray-100"
                }`}
        >
            {children}
        </button>
    );
}