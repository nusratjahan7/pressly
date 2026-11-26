"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useEditorStore } from "@/store";
import { flushActiveProjectToIndexedDb } from "@/store/persistence";
import { useToastStore } from "@/store/toasts";
import { clampSpreadIndex } from "@/lib/spreads";
import {
  deleteStoredProject,
  duplicateStoredProject,
  exportProjectToJsonFile,
  importProjectFromJsonFile,
  listProjectSummaries,
  loadProjectDocument,
  renameStoredProject,
  saveProjectDocument,
  setActiveProjectId,
  type ProjectSummary,
} from "@/lib/projectStorage";
import { PageView } from "@/components/editor/canvas/PageView";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 15) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ProjectsDashboardModal() {
  const open = useEditorStore((state) => state.ui.dashboardOpen);
  const setDashboardOpen = useEditorStore((state) => state.setDashboardOpen);
  const openPageSetup = useEditorStore((state) => state.openPageSetup);
  const activeProject = useEditorStore((state) => state.project);
  const replaceProject = useEditorStore((state) => state.replaceProject);
  const renameProject = useEditorStore((state) => state.renameProject);

  const [summaries, setSummaries] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setRenamingId(null);
      setConfirmDeleteId(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      await flushActiveProjectToIndexedDb();
      const list = await listProjectSummaries();
      if (!cancelled) {
        setSummaries(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.pageSizeLabel.toLowerCase().includes(q),
    );
  }, [summaries, query]);

  const handleOpenProject = async (id: string) => {
    if (id === activeProject.id) {
      setDashboardOpen(false);
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await flushActiveProjectToIndexedDb();
      const doc = await loadProjectDocument(id);
      if (!doc) {
        setError("Could not load that project from IndexedDB.");
        return;
      }
      await setActiveProjectId(doc.project.id);
      replaceProject(doc.project);
      useEditorStore.setState((state) => ({
        ui: {
          ...state.ui,
          spreadIndex: clampSpreadIndex(doc.spreadIndex, doc.project.pages),
          saveState: "saved",
          lastSavedAt: doc.savedAt,
          dashboardOpen: false,
        },
      }));
    } finally {
      setBusyId(null);
    }
  };

  const handleRenameCommit = async (id: string) => {
    const trimmed = renameDraft.trim().replace(/\s+/g, " ").slice(0, 80);
    setRenamingId(null);
    if (!trimmed) return;
    setBusyId(id);
    try {
      if (id === activeProject.id) {
        renameProject(trimmed);
        await saveProjectDocument(
          { ...useEditorStore.getState().project, name: trimmed },
          useEditorStore.getState().ui.spreadIndex,
        );
        setSummaries(await listProjectSummaries());
      } else {
        const next = await renameStoredProject(id, trimmed);
        setSummaries(next);
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await flushActiveProjectToIndexedDb();
      const res = await duplicateStoredProject(id);
      if (res) {
        setSummaries(res.summaries);
        useToastStore.getState().pushToast({
          message: `Duplicated "${res.created.project.name}"`,
        });
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setConfirmDeleteId(null);
    setError(null);
    try {
      const { summaries: nextSummaries, fallbackDoc } =
        await deleteStoredProject(id);
      setSummaries(nextSummaries);
      if (fallbackDoc) {
        replaceProject(fallbackDoc.project);
        useEditorStore.setState((state) => ({
          ui: {
            ...state.ui,
            spreadIndex: clampSpreadIndex(
              fallbackDoc.spreadIndex,
              fallbackDoc.project.pages,
            ),
            saveState: "saved",
            lastSavedAt: fallbackDoc.savedAt,
          },
        }));
      }
      useToastStore.getState().pushToast({ message: "Project deleted" });
    } finally {
      setBusyId(null);
    }
  };

  const handleExportJson = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      if (id === activeProject.id) {
        await exportProjectToJsonFile(useEditorStore.getState().project);
      } else {
        const doc = await loadProjectDocument(id);
        if (!doc) {
          setError("Unable to export project JSON.");
          return;
        }
        await exportProjectToJsonFile(doc.project);
      }
      useToastStore.getState().pushToast({ message: "Exported .pressly.json" });
    } catch {
      setError("Could not export project JSON.");
    } finally {
      setBusyId(null);
    }
  };

  const handleImportJson = async (file: File | undefined) => {
    if (!file) return;
    setImportBusy(true);
    setError(null);
    try {
      await flushActiveProjectToIndexedDb();
      const imported = await importProjectFromJsonFile(file);
      replaceProject(imported.project);
      useEditorStore.setState((state) => ({
        ui: {
          ...state.ui,
          spreadIndex: clampSpreadIndex(
            imported.spreadIndex,
            imported.project.pages,
          ),
          saveState: "saved",
          lastSavedAt: imported.savedAt,
          dashboardOpen: false,
        },
      }));
      useToastStore.getState().pushToast({
        message: `Imported "${imported.project.name}"`,
      });
    } catch {
      setError(
        "That file isn't a valid Pressly .json project export.",
      );
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleNewProject = async () => {
    await flushActiveProjectToIndexedDb();
    setDashboardOpen(false);
    openPageSetup("new");
  };

  return (
    <Modal
      open={open}
      onClose={() => setDashboardOpen(false)}
      title="Projects"
      description="Autosaved locally in IndexedDB. Create, open, duplicate, or share portable .json archives."
      size="xl"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved projects…"
              aria-label="Search saved projects"
              className="h-8 w-full rounded-field border border-line bg-surface pl-8 pr-3 text-[11.5px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => void handleImportJson(e.target.files?.[0])}
          />

          <Button
            variant="secondary"
            size="sm"
            leadingIcon={FileJson}
            onClick={() => void handleExportJson(activeProject.id)}
            disabled={busyId === activeProject.id}
          >
            Export .json
          </Button>

          <Button
            variant="secondary"
            size="sm"
            leadingIcon={Upload}
            loading={importBusy}
            onClick={() => fileInputRef.current?.click()}
          >
            Import .json
          </Button>

          <Button
            variant="primary"
            size="sm"
            leadingIcon={Plus}
            onClick={() => void handleNewProject()}
          >
            New project
          </Button>
        </div>

        {error ? (
          <p className="rounded-field border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-card border border-line bg-surface-muted"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line py-12 text-center">
            <FolderOpen className="mb-2 size-6 text-ink-subtle" />
            <p className="text-[12.5px] font-medium text-ink">
              {query.trim() ? "No matching projects" : "No saved projects yet"}
            </p>
            <p className="mt-1 text-[11px] text-ink-subtle">
              Create a new magazine or import a .json backup.
            </p>
          </div>
        ) : (
          <div className="grid max-h-[60dvh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => {
              const isActive = item.id === activeProject.id;
              const isRenaming = renamingId === item.id;
              const isConfirmingDelete = confirmDeleteId === item.id;
              const isBusy = busyId === item.id;
              const previewScale = Math.min(
                96 / Math.max(1, item.pageSize.w),
                118 / Math.max(1, item.pageSize.h),
              );

              return (
                <article
                  key={item.id}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-card border bg-surface transition-colors",
                    isActive
                      ? "border-accent ring-1 ring-accent/30"
                      : "border-line hover:border-line-strong",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void handleOpenProject(item.id)}
                    disabled={isBusy}
                    className="relative flex h-36 w-full items-center justify-center overflow-hidden bg-surface-muted/80 p-3 text-left transition-opacity hover:opacity-95"
                  >
                    {item.coverPage ? (
                      <div className="pointer-events-none overflow-hidden rounded-[2px] shadow-md">
                        <PageView
                          page={item.coverPage}
                          pageSize={item.pageSize}
                          scale={previewScale}
                          decorative
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-16 rounded border border-line bg-surface" />
                    )}
                    {isActive ? (
                      <span className="absolute left-2.5 top-2.5 rounded-full bg-accent px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white shadow-sm">
                        Current
                      </span>
                    ) : null}
                  </button>

                  <div className="flex flex-1 flex-col gap-2 border-t border-line p-3">
                    {isRenaming ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={renameDraft}
                          maxLength={80}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleRenameCommit(item.id);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              setRenamingId(null);
                            }
                          }}
                          onBlur={() => void handleRenameCommit(item.id)}
                          className="h-7 min-w-0 flex-1 rounded-field border border-accent bg-surface px-2 text-[12px] font-medium text-ink outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Save project name"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            void handleRenameCommit(item.id);
                          }}
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-field bg-accent text-white"
                        >
                          <Check className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3
                            className="truncate text-[12.5px] font-semibold text-ink"
                            title={item.name}
                          >
                            {item.name}
                          </h3>
                          <p className="text-[10.5px] text-ink-subtle">
                            {item.pageCount} pages · {item.pageSizeLabel}
                          </p>
                          <p className="text-[10px] text-ink-subtle">
                            Updated {formatRelativeTime(item.updatedAt)}
                          </p>
                        </div>
                      </div>
                    )}

                    {isConfirmingDelete ? (
                      <div className="mt-auto flex items-center justify-between gap-1.5 rounded-field border border-danger/30 bg-danger/5 px-2 py-1.5">
                        <span className="text-[10.5px] font-medium text-danger">
                          Delete project?
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded px-1.5 py-0.5 text-[10.5px] font-medium text-ink-muted hover:text-ink"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDelete(item.id)}
                            className="rounded bg-danger px-2 py-0.5 text-[10.5px] font-medium text-white hover:opacity-90"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto flex items-center gap-1 pt-1">
                        <Button
                          variant={isActive ? "secondary" : "primary"}
                          size="sm"
                          className="h-7 flex-1 text-[11px]"
                          disabled={isBusy}
                          onClick={() => void handleOpenProject(item.id)}
                        >
                          {isActive ? "Resume" : "Open"}
                        </Button>
                        <button
                          type="button"
                          title="Rename project"
                          aria-label="Rename project"
                          disabled={isBusy}
                          onClick={() => {
                            setRenamingId(item.id);
                            setRenameDraft(item.name);
                          }}
                          className="inline-flex size-7 items-center justify-center rounded-field border border-line text-ink-muted hover:border-line-strong hover:text-ink"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Duplicate project"
                          aria-label="Duplicate project"
                          disabled={isBusy}
                          onClick={() => void handleDuplicate(item.id)}
                          className="inline-flex size-7 items-center justify-center rounded-field border border-line text-ink-muted hover:border-line-strong hover:text-ink"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Export as .json"
                          aria-label="Export project as JSON"
                          disabled={isBusy}
                          onClick={() => void handleExportJson(item.id)}
                          className="inline-flex size-7 items-center justify-center rounded-field border border-line text-ink-muted hover:border-line-strong hover:text-ink"
                        >
                          <Download className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete project"
                          aria-label="Delete project"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="inline-flex size-7 items-center justify-center rounded-field border border-line text-ink-muted hover:border-danger/40 hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
