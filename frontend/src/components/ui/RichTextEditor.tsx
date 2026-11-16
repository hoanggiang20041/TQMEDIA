'use client';

import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className = '' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync incoming value to editor if it differs from current innerHTML
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleChange();
  };

  const handleChange = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className={`flex flex-col border border-outline-variant/50 rounded-lg overflow-hidden bg-surface-container ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-surface border-b border-outline-variant/30">
        <button
          type="button"
          onClick={() => exec('bold')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors"
          title="In đậm (Ctrl+B)"
        >
          <span className="material-symbols-outlined text-[20px]">format_bold</span>
        </button>
        <button
          type="button"
          onClick={() => exec('italic')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors"
          title="In nghiêng (Ctrl+I)"
        >
          <span className="material-symbols-outlined text-[20px]">format_italic</span>
        </button>
        <button
          type="button"
          onClick={() => exec('underline')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors"
          title="Gạch chân (Ctrl+U)"
        >
          <span className="material-symbols-outlined text-[20px]">format_underlined</span>
        </button>
        
        <div className="w-px h-6 bg-outline-variant/50 mx-1 self-center"></div>
        
        <button
          type="button"
          onClick={() => exec('formatBlock', 'H2')}
          className="px-2 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors text-sm font-bold"
          title="Tiêu đề chính (H2)"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', 'H3')}
          className="px-2 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors text-sm font-bold"
          title="Tiêu đề phụ (H3)"
        >
          H3
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', 'P')}
          className="px-2 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors text-sm"
          title="Đoạn văn (P)"
        >
          P
        </button>

        <div className="w-px h-6 bg-outline-variant/50 mx-1 self-center"></div>

        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors"
          title="Danh sách dấu chấm"
        >
          <span className="material-symbols-outlined text-[20px]">format_list_bulleted</span>
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors"
          title="Danh sách số"
        >
          <span className="material-symbols-outlined text-[20px]">format_list_numbered</span>
        </button>

        <div className="w-px h-6 bg-outline-variant/50 mx-1 self-center"></div>

        <button
          type="button"
          onClick={() => exec('justifyLeft')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors"
          title="Căn trái"
        >
          <span className="material-symbols-outlined text-[20px]">format_align_left</span>
        </button>
        <button
          type="button"
          onClick={() => exec('justifyCenter')}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-variant text-on-surface transition-colors"
          title="Căn giữa"
        >
          <span className="material-symbols-outlined text-[20px]">format_align_center</span>
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        className="p-4 min-h-[200px] max-h-[600px] overflow-y-auto focus:outline-none custom-html-content text-on-surface-variant"
        onInput={handleChange}
        onBlur={handleChange}
        data-placeholder={placeholder}
      />
    </div>
  );
}
