import React, { useEffect, useRef, useState } from "react";
import { getNoteContent } from "../utils/noteContent";
import { getBlock } from "../api";

export default function EditorModal({ item, onSave, onClose }) {
    const titleRef = useRef(null);
    const [title, setTitle] = useState(() => item?.title || item?.attributes?.title || '');
    const [description, setDescription] = useState(() => item?.description || item?.attributes?.description || '');
    const [content, setContent] = useState(() => getNoteContent(item));
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadContent() {
            const initialContent = getNoteContent(item);

            if (initialContent || !item?.id) {
                setContent(initialContent);
                return;
            }

            setIsLoading(true);

            try {
                const details = await getBlock(item.id);

                if (!cancelled) {
                    const merged = {
                        ...item,
                        ...details,
                        ...(details?.attributes || {})
                    };
                    setContent(getNoteContent(merged));
                    if (!title) setTitle(merged.title || '');
                    if (!description) setDescription(merged.description || '');
                }
            } catch (e) {
                console.error("[EditorModal] Failed to load note content:", e);

                if (!cancelled) {
                    setContent("");
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        loadContent();

        return () => {
            cancelled = true;
        };
    }, [item]);

    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    const handleSave = () => {
        onSave({ title, description, content });
    };

    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
            onClose();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal editor-modal">
                <div className="modal-header">
                    <h2>{item ? "Edit Note" : "New Note"}</h2>
                    <span>[Esc]</span>
                </div>

                <div className="editor-body">
                    <label className="editor-label">Title</label>
                    <input
                        ref={titleRef}
                        className="editor-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        disabled={isLoading}
                    />

                    <label className="editor-label">Description</label>
                    <input
                        className="editor-input"
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                        disabled={isLoading}
                    />

                    <label className="editor-label">Content (Markdown)</label>
                    <textarea
                        className="editor-textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={isLoading ? "Loading note..." : "Type your note here...  (Ctrl+Enter to save)"}
                        disabled={isLoading}
                    />
                </div>

                <div className="modal-actions">
                    <button onClick={onClose}>
                        Cancel [Esc]
                    </button>

                    <button onClick={handleSave} disabled={isLoading}>
                        Save [Ctrl+Enter]
                    </button>
                </div>
            </div>
        </div>
    );
}
