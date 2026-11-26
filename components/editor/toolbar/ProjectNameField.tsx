"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store";
import { cn } from "@/lib/cn";

export function ProjectNameField() {
  const name = useEditorStore((state) => state.project.name);
  const renameProject = useEditorStore((state) => state.renameProject);
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  const commit = () => {
    const next = draft.trim();
    if (!next) {
      setDraft(name);
      return;
    }
    renameProject(next);
    setDraft(next);
  };

  const characterWidth = Math.min(
    28,
    Math.max(14, Math.max(name.length, draft.length) + 4),
  );

  return (
    <div className="flex min-w-0 flex-1 items-center sm:flex-none">
      <label htmlFor="project-name" className="sr-only">
        Project name
      </label>
      <input
        ref={inputRef}
        id="project-name"
        value={draft}
        size={characterWidth}
        maxLength={80}
        spellCheck={false}
        autoComplete="off"
        title="Rename project"
        className={cn(
          "h-8 w-full max-w-[120px] truncate rounded-field border border-transparent bg-transparent px-2 text-[13px] font-medium tracking-[-0.01em] text-ink outline-none transition-[border-color,background-color,box-shadow] duration-150 hover:border-line sm:w-auto sm:max-w-[280px] md:max-w-[340px]",
          editing && "border-line bg-surface shadow-sm focus:border-accent focus:ring-2 focus:ring-accent/20",
          !editing && "cursor-text",
        )}
        onFocus={(event) => {
          setEditing(true);
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          setEditing(false);
          commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setDraft(name);
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
