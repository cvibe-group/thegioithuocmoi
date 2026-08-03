"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Link,
  List,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageUpload,
  BlockQuote,
  Undo,
  FileRepository,
  type Editor,
  type EditorConfig,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import { createAuthBrowserClient } from "@/lib/supabase/browser";

type ArticleCkEditorProps = {
  value: string;
  onChange: (html: string) => void;
  onRequestMedia?: () => void;
  editorRef?: MutableRefObject<Editor | null>;
};

function SupabaseUploadAdapterPlugin(editor: Editor) {
  const repo = editor.plugins.get(FileRepository);
  repo.createUploadAdapter = (loader) => ({
    upload: async () => {
      const file = await loader.file;
      if (!file) throw new Error("Không có file");
      const supabase = createAuthBrowserClient();
      const ext = file.name.split(".").pop() || "jpeg";
      const objectPath = `thegioithuocmoi/article-body-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("images").upload(objectPath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("images").getPublicUrl(objectPath);
      return { default: data.publicUrl };
    },
    abort: () => undefined,
  });
}

export function ArticleCkEditor({
  value,
  onChange,
  onRequestMedia,
  editorRef,
}: ArticleCkEditorProps) {
  const localRef = useRef<Editor | null>(null);

  const config = useMemo<EditorConfig>(
    () => ({
      licenseKey: process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY || "GPL",
      plugins: [
        Essentials,
        Paragraph,
        Heading,
        Bold,
        Italic,
        Link,
        List,
        Image,
        ImageToolbar,
        ImageCaption,
        ImageStyle,
        ImageUpload,
        BlockQuote,
        Undo,
        SupabaseUploadAdapterPlugin,
      ],
      toolbar: {
        items: [
          "undo",
          "redo",
          "|",
          "heading",
          "|",
          "bold",
          "italic",
          "link",
          "|",
          "bulletedList",
          "numberedList",
          "blockQuote",
          "|",
          "uploadImage",
        ],
      },
      heading: {
        options: [
          {
            model: "paragraph",
            title: "Paragraph",
            class: "ck-heading_paragraph",
          },
          {
            model: "heading2",
            view: "h2",
            title: "Heading 2",
            class: "ck-heading_heading2",
          },
          {
            model: "heading3",
            view: "h3",
            title: "Heading 3",
            class: "ck-heading_heading3",
          },
        ],
      },
      image: {
        toolbar: [
          "imageTextAlternative",
          "toggleImageCaption",
          "|",
          "imageStyle:inline",
          "imageStyle:block",
          "imageStyle:side",
        ],
      },
      link: {
        addTargetToExternalLinks: true,
        defaultProtocol: "https://",
      },
    }),
    [],
  );

  return (
    <div className="article-ckeditor space-y-2">
      {onRequestMedia ? (
        <button
          type="button"
          onClick={onRequestMedia}
          className="rounded border border-brand bg-brand-light px-3 py-1.5 text-[12px] font-medium text-brand"
        >
          Chèn ảnh từ Media
        </button>
      ) : null}
      <div className="overflow-hidden rounded border border-[#d9d9d9] bg-white [&_.ck-editor__editable]:min-h-[280px]">
        <CKEditor
          editor={ClassicEditor}
          config={config}
          data={value}
          onReady={(editor) => {
            localRef.current = editor;
            if (editorRef) editorRef.current = editor;
          }}
          onChange={(_event, editor) => {
            onChange(editor.getData());
          }}
        />
      </div>
    </div>
  );
}
