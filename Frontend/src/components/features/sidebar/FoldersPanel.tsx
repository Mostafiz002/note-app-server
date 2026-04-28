"use client";

import * as React from "react";
import {
  Check,
  FolderPlus,
  Folder as FolderIcon,
  Loader2,
  PencilLine,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFolders, type Folder } from "@/hooks/useFolders";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function renderTree(args: {
  nodes: Folder[];
  depth?: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
  renamingId: number | null;
  renameValue: string;
  setRenameValue: (v: string) => void;
  startRename: (folder: Folder) => void;
  commitRename: () => void;
  onDelete: (id: number) => void;
}): React.ReactNode {
  const depth = args.depth ?? 0;
  return args.nodes.map((f) => (
    <div key={f.id}>
      <div
        role="button"
        onClick={() => args.onSelect(f.id)}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-all duration-200",
          "",
          args.selectedId === f.id
            ? "bg-secondary shadow-sm text-foreground"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        )}
        style={{ paddingLeft: 12 + depth * 12 }}
      >
        <FolderIcon
          className={cn(
            "size-4 shrink-0 transition-colors",
            args.selectedId === f.id
              ? "text-primary"
              : "text-muted-foreground/50",
          )}
        />

        {args.renamingId === f.id ? (
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <Input
              value={args.renameValue}
              onChange={(e) => args.setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") args.commitRename();
                if (e.key === "Escape") args.startRename({ ...f, name: "" });
              }}
              className="h-7 flex-1 bg-background text-xs"
              autoFocus
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 text-primary hover:bg-primary/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                args.commitRename();
              }}
            >
              <Check className="size-3.5" />
            </Button>
          </div>
        ) : (
          <>
            <span className="min-w-0 flex-1 text-[13px] truncate font-medium">
              {f.name}
            </span>
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 hover:bg-background shadow-sm cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  args.startRename(f);
                }}
              >
                <PencilLine className="size-3.5 text-muted-foreground" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 hover:bg-destructive/10 hover:text-destructive shadow-sm cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  args.onDelete(f.id);
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </span>
          </>
        )}
      </div>
    </div>
  ));
}

export function FoldersPanel() {
  const folders = useFolders();
  const [name, setName] = React.useState("");
  const [renamingId, setRenamingId] = React.useState<number | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  const startRename = React.useCallback((folder: Folder) => {
    if (!folder.name) {
      setRenamingId(null);
      setRenameValue("");
      return;
    }
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  }, []);

  const commitRename = React.useCallback(() => {
    const id = renamingId;
    const v = renameValue.trim();
    if (!id || !v) {
      setRenamingId(null);
      return;
    }
    void folders.rename({ id, name: v });
    setRenamingId(null);
  }, [folders, renamingId, renameValue]);

  const createRoot = React.useCallback(() => {
    const v = name.trim();
    if (!v) return;
    void folders.create({ name: v });
    setName("");
  }, [folders, name]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-primary animate-pulse" />
          <div className="text-[12px] font-semibold  text-primary/70">
            Folders
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-primary transition-colors"
          onClick={createRoot}
          disabled={folders.loading || !name.trim()}
        >
          <FolderPlus className="size-4" />
        </Button>
      </div>

      {/* Input Section */}
      <div className="relative group">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New folder name..."
          className="h-9 border-none bg-muted/40 pl-3 text-xs focus-visible:ring-1 focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            createRoot();
          }}
        />
      </div>

      {folders.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] text-destructive animate-in fade-in slide-in-from-top-1">
          {folders.error}
        </div>
      )}

      {/* Folders List Container */}
      <div className="relative flex-1 overflow-auto rounded-xl border border-primary/5 bg-linear-to-b from-muted/30 to-background/50 p-1.5">
        <div className="absolute inset-0 -z-10 bg-grid-white/[0.02]" />

        <div className="h-full rounded-[10px] bg-background/40 backdrop-blur-sm p-1">
          {folders.loading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3 p-4 text-[11px] font-mono text-muted-foreground/60">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="uppercase tracking-widest">Syncing_Folders</span>
            </div>
          ) : folders.folders.length ? (
            <div className="grid gap-0.5 ">
              {renderTree({
                nodes: folders.folders.filter((f) => f.parentId == null),
                selectedId: folders.selectedFolderId,
                onSelect: folders.selectFolder,
                renamingId,
                renameValue,
                setRenameValue,
                startRename,
                commitRename,
                onDelete: (id: number) => {
                  toast.warning(
                    "Are you sure you want to delete this folder?",
                    {
                      action: {
                        label: "Delete",
                        onClick: () => void folders.remove(id),
                      },
                    },
                  );
                },
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 p-4 text-center">
              <FolderIcon className="size-8 text-muted-foreground/10 mb-2" />
              <div className="text-[11px] text-muted-foreground/40 italic">
                No structures found.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
