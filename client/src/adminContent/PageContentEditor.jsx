import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ComponentChip from "./ComponentChip";
import componentRegistry from "./componentRegistry";
import styles from "./PageContentEditor.module.css";

// Reusable TipTap instance for editing a page's draft_body. `page` is the
// slug the editor is currently open for — used only to filter the Insert
// dropdown to registry entries relevant to this page (or pages: null,
// available everywhere).
export default function PageContentEditor({ page, content, onChange }) {
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false }), ComponentChip],
    content: content || "",
    immediatelyRender: true, // pure client-side rendering, no SSR
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getHTML());
    },
  });

  if (!editor) return null;

  const insertOptions = Object.entries(componentRegistry).filter(
    ([, entry]) => entry.pages === null || entry.pages?.includes(page)
  );

  const insertChip = (key) => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "componentChip", attrs: { component: key, props: {} } })
      .run();
    setShowInsertMenu(false);
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl || "https://");
    if (url === null) return; // cancelled

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className={styles.editorWrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={editor.isActive("bold") ? styles.active : ""}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className={editor.isActive("italic") ? styles.active : ""}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          type="button"
          className={editor.isActive("link") ? styles.active : ""}
          onClick={setLink}
        >
          Link
        </button>

        {insertOptions.length > 0 && (
          <div className={styles.insertDropdown}>
            <button type="button" onClick={() => setShowInsertMenu((v) => !v)}>
              Insert ▾
            </button>
            {showInsertMenu && (
              <div className={styles.insertMenu}>
                {insertOptions.map(([key, entry]) => (
                  <button key={key} type="button" onClick={() => insertChip(key)}>
                    {entry.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}
