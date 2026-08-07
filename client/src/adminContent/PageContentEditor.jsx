import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import ComponentChip from "./ComponentChip";
import componentRegistry from "./componentRegistry";
import EMAIL_PLACEHOLDERS from "./emailPlaceholders";
import EMAIL_SLUGS from "../admin/pages/pages/emailSlugs";
import styles from "./PageContentEditor.module.css";

// Reusable TipTap instance for editing a page's draft_body. `page` is the
// slug the editor is currently open for — used only to filter the Insert
// dropdown to registry entries relevant to this page (or pages: null,
// available everywhere).
export default function PageContentEditor({ page, content, onChange }) {
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  const editor = useEditor({
    // StarterKit (v3) bundles its own Link extension internally, which
    // collides with the explicit one below ("Duplicate extension names
    // found: ['link']") — disable StarterKit's copy so ours is the only
    // registration.
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      ComponentChip,
    ],
    content: content || "",
    immediatelyRender: true, // pure client-side rendering, no SSR
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getHTML());
    },
  });

  if (!editor) return null;

  const isEmail = EMAIL_SLUGS.has(page);

  const insertOptions = Object.entries(componentRegistry).filter(
    ([, entry]) => entry.pages === null || entry.pages?.includes(page)
  );
  const placeholderOptions = isEmail ? EMAIL_PLACEHOLDERS : [];
  const hasInsertMenu = insertOptions.length > 0 || placeholderOptions.length > 0;

  const insertChip = (key) => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "componentChip", attrs: { component: key, props: {} } })
      .run();
    setShowInsertMenu(false);
  };

  const insertPlaceholder = (token) => {
    editor.chain().focus().insertContent(token).run();
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

        {hasInsertMenu && (
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
                {placeholderOptions.map(({ key, label, token }) => (
                  <button key={key} type="button" onClick={() => insertPlaceholder(token)}>
                    {label}
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
