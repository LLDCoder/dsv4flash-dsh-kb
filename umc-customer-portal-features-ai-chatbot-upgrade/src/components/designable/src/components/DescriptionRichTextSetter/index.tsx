import React, { useState, useCallback } from "react";
import { RichTextEditor } from "@/components/common";
import type { IDomEditor } from "@wangeditor/editor";
import "./index.less";

const MAX_LENGTH = 500;

const EMPTY_PATTERNS = [
  /^<p><br><\/p>$/,
  /^<p><br\/><\/p>$/,
  /^<p>\s*<\/p>$/,
  /^\s*$/,
];

function isEditorEmpty(html: string | undefined): boolean {
  if (!html) return true;
  const trimmed = html.trim();
  if (!trimmed) return true;
  return EMPTY_PATTERNS.some((p) => p.test(trimmed));
}

export interface DescriptionRichTextSetterProps {
  value?: string;
  onChange?: (value: string) => void;
}

const DescriptionRichTextSetter: React.FC<DescriptionRichTextSetterProps> = ({
  value,
  onChange,
}) => {
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  const handleEditorChange = useCallback(
    (html: string) => {
      if (isEditorEmpty(html)) {
        onChange?.("");
        return;
      }
      onChange?.(html);
    },
    [onChange],
  );

  const handleCreated = useCallback((ed: IDomEditor) => {
    setEditor(ed);
  }, []);

  return (
    <div
      className="desc-richtext-setter"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="desc-richtext-setter__header">
        <span className="desc-richtext-setter__label">Description</span>
      </div>
      <div className="desc-richtext-setter__editor-wrap">
        <RichTextEditor
          value={value}
          editor={editor}
          onCreated={handleCreated}
          onChange={handleEditorChange}
          placeholder="Enter description"
          showCharCount
          maxLength={MAX_LENGTH}
          height={120}
          className="desc-richtext-setter__editor"
          toolbarKeys={[
            "bold",
            "italic",
            "underline",
            "justifyLeft",
            "textCase",
            "insertLink",
            "uploadImage",
            // "uploadVideo",
          ]}
        />
      </div>
    </div>
  );
};

export default DescriptionRichTextSetter;
