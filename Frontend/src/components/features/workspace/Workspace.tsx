"use client";

import * as React from "react";
import {
  FilePlus2,
  Loader2,
  PencilLine,
  Sparkles,
  Save,
  Search,
  Wand2,
  ChevronLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAiPanel } from "@/hooks/useAiPanel";
import { useFolderRootsList } from "@/hooks/useFolderRootsList";
import { useNotesWorkspace } from "@/hooks/useNotesWorkspace";
import { cn } from "@/lib/utils";

export function Workspace() {
  const ws = useNotesWorkspace();
  const ai = useAiPanel();
  const [instruction, setInstruction] = React.useState("");
  const folderRoots = useFolderRootsList();

  // FIX: Removed ai.clear() from the useEffect. 


  return (
    <div className="relative flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative flex w-full flex-1">
        {/* Sidebar */}
        <section className={cn(
          "flex flex-col border-r bg-muted/10 transition-all duration-300",
          ws.selectedId ? "hidden lg:flex lg:w-72" : "w-full lg:w-72",
        )}>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  value={ws.q}
                  onChange={(e) => ws.setQ(e.target.value)}
                  placeholder="Search..."
                  className="h-8 border-none bg-muted/40 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-primary/20"
                />
              </div>
              <Button onClick={() => void ws.createNote()} size="icon" variant="ghost" className="size-8">
                <FilePlus2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="space-y-0.5">
              {ws.notesLoading ? (
                <div className="p-4 text-xs text-muted-foreground animate-pulse text-center">Loading...</div>
              ) : ws.notes.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-muted-foreground/20 rounded-xl m-2">
                  <p className="text-xs text-muted-foreground/60 italic">No notes found here.</p>
                </div>
              ) : (
                ws.notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => ws.select(n.id)}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left transition-colors",
                      ws.selectedId === n.id ? "bg-secondary shadow-sm" : "hover:bg-muted/50",
                    )}
                  >
                    <div className="truncate text-sm font-medium">{n.title || "Untitled"}</div>
                    <div className="text-[10px] text-muted-foreground/60 tabular-nums">
                      {new Date(n.updatedAt).toLocaleDateString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Main Editor */}
        <section className={cn("flex-1 flex flex-col min-w-0 bg-background", ws.selectedId ? "flex" : "hidden lg:flex")}>
          <header className="flex h-12 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <Button variant="ghost" size="icon" className="lg:hidden shrink-0" onClick={() => ws.select(null)}>
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                <PencilLine className="size-3.5" />
                <span className="truncate opacity-50">Notes /</span>
                <span className="truncate font-medium text-foreground">{ws.draftTitle || "Untitled"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {ws.saving ? (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Saving
                </div>
              ) : (
                <div className="text-[10px] font-mono flex  gap-1.75 items-center text-muted-foreground/40  uppercase tracking-tighter ">
                   <div className="size-1.5 rounded-full bg-primary animate-pulse" />Auto_Save Active</div>
              )}
              <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-[11px]">
                <select
                  className="bg-transparent font-medium outline-none cursor-pointer"
                  value={ws.active?.folderId ?? ""}
                  onChange={(e) => void ws.moveToFolder(Number(e.target.value))}
                >
                  {folderRoots.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs font-semibold shadow-sm"
                onClick={() => void ws.saveNow()}
                disabled={!ws.selectedId || ws.activeLoading || ws.saving}
              >
                <Save className="mr-1.5 size-3.5" /> Save
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pt-16 pb-32">
            <div className="mx-auto max-w-3xl px-8 lg:px-16 space-y-10">
              <div className="relative group">
                <Input
                  value={ws.draftTitle}
                  onChange={(e) => ws.setDraftTitle(e.target.value)}
                  placeholder="Untitled"
                  className="h-auto w-full border-none bg-transparent p-0 text-5xl font-bold tracking-tight shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/10"
                />
              </div>

              {/* AI Control Panel */}
              <div className="relative rounded-2xl border border-primary/5 bg-gradient-to-b from-muted/50 to-background p-1.5 shadow-2xl transition-all duration-500 hover:border-primary/20">
                <div className="absolute -inset-0.5 -z-10 animate-pulse rounded-2xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/10 opacity-50 blur-xl" />

                <div className="flex flex-col gap-3 rounded-[14px] bg-background/80 p-3 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-1 shrink-0">
                      <Sparkles className="size-4 text-primary animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">AI Studio</span>
                    </div>
                    <Input
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Specialized instructions for the AI..."
                      className="h-9 flex-1 border-none bg-muted/40 text-xs focus-visible:ring-1 focus-visible:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-primary/5 pt-2">
                    {[
                      { id: "summarize", label: "Summarize", action: () => ai.run("summarize", { noteId: ws.selectedId!, instruction }) },
                      { id: "rewrite", label: "Rewrite", action: () => ai.run("rewrite", { noteId: ws.selectedId!, instruction }).then((d: any) => d.rewrittenContent && ws.setDraftMarkdown(d.rewrittenContent)) },
                      { id: "generate-title", label: "Gen Title", action: () => ai.run("generate-title", { noteId: ws.selectedId!, instruction }).then((d: any) => d.title && ws.setDraftTitle(d.title)) },
                      { id: "key-points", label: "Key Points", action: () => ai.run("key-points", { noteId: ws.selectedId!, instruction }) },
                    ].map((btn) => (
                      <Button
                        key={btn.id}
                        size="sm"
                        variant="outline"
                        disabled={ai.running !== null}
                        onClick={() => void btn.action()}
                        className="relative h-8 gap-2 overflow-hidden border-primary/10 bg-background px-4 text-[11px] font-bold transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                      >
                        {ai.running === btn.id ? <Loader2 className="size-3 animate-spin" /> : <Wand2 className="size-3 text-primary" />}
                        <span className="relative z-10">{ai.running === btn.id ? "Working..." : btn.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {(ai.summary || ai.keyPoints?.length || ai.error) && (
                  <div className="mt-2 space-y-2 p-3 animate-in slide-in-from-top-2 duration-300">
                    {ai.error && <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">{ai.error}</div>}
                    {ai.summary && (
                      <div className="rounded-xl border border-primary/5 bg-primary/5 p-4 text-[13px] leading-relaxed text-foreground/80 shadow-inner group/summary">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-tighter text-primary/60 flex items-center gap-2">
                          <div className="h-[1px] flex-1 bg-primary/10" /> Summary
                        </div>
                        {ai.summary}
                      </div>
                    )}
                    {ai.keyPoints && ai.keyPoints.length > 0 && (
                      <div className="rounded-xl border border-primary/5 bg-primary/5 p-4 text-[13px] leading-relaxed shadow-inner">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-tighter text-primary/60 flex items-center gap-2">
                          <div className="h-[1px] flex-1 bg-primary/10" /> Key Insights
                        </div>
                        <ul className="space-y-1.5">
                          {ai.keyPoints.map((kp, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/40 shadow-[0_0_5px_rgba(var(--primary),0.5)]" />
                              <span className="text-muted-foreground">{kp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Textarea
                value={ws.draftMarkdown}
                onChange={(e) => ws.setDraftMarkdown(e.target.value)}
                placeholder="Start writing..."
                className="min-h-[500px] w-full resize-none border-none bg-transparent p-0 text-lg leading-relaxed shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/20"
              />
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}