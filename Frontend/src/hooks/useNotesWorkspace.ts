"use client"

import * as React from "react"
import { useWorkspaceStore } from "@/stores/workspace.store"
import type { Note } from "@/lib/types"

type WorkspaceState = {
  q: string
  setQ: (q: string) => void

  notes: Note[]
  notesLoading: boolean
  notesError: string | null

  selectedId: number | null
  select: (id: number) => void

  active: Note | null
  activeLoading: boolean
  activeError: string | null

  draftTitle: string
  setDraftTitle: (v: string) => void
  draftMarkdown: string
  setDraftMarkdown: (v: string) => void

  saving: boolean
  saveError: string | null

  refreshList: () => Promise<void>
  createNote: () => Promise<void>
  saveNow: () => Promise<void>
  moveToFolder: (folderId: number) => Promise<void>
  removeNote: (id: number) => Promise<void>
}

function useDebouncedEffect(effect: () => void, ms: number, deps: React.DependencyList) {
  React.useEffect(() => {
    const t = window.setTimeout(effect, ms)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function useNotesWorkspace(): WorkspaceState {
  const store = useWorkspaceStore()

  // Autosave logic
  const lastSavedRef = React.useRef<{ id: number; title: string; markdown: string } | null>(null)
  
  React.useEffect(() => {
    if (!store.selectedNoteId) return
    lastSavedRef.current = { 
      id: store.selectedNoteId, 
      title: store.draftTitle, 
      markdown: store.draftMarkdown 
    }
  }, [store.selectedNoteId])

  useDebouncedEffect(
    () => {
      if (!store.selectedNoteId || store.activeNoteLoading) return
      const last = lastSavedRef.current
      if (!last || last.id !== store.selectedNoteId) return
      if (last.title === store.draftTitle && last.markdown === store.draftMarkdown) return
      
      void store.saveActiveNote()
      lastSavedRef.current = { 
        id: store.selectedNoteId, 
        title: store.draftTitle, 
        markdown: store.draftMarkdown 
      }
    },
    800,
    [store.draftTitle, store.draftMarkdown, store.selectedNoteId, store.activeNoteLoading]
  )

  return {
    q: store.q,
    setQ: store.setQ,

    notes: store.notes,
    notesLoading: store.notesLoading,
    notesError: null,

    selectedId: store.selectedNoteId,
    select: store.setSelectedNoteId,

    active: store.activeNote,
    activeLoading: store.activeNoteLoading,
    activeError: null,

    draftTitle: store.draftTitle,
    setDraftTitle: store.setDraftTitle,
    draftMarkdown: store.draftMarkdown,
    setDraftMarkdown: store.setDraftMarkdown,

    saving: false, // Could be derived from a specific state if needed
    saveError: null,

    refreshList: store.refreshNotes,
    createNote: store.createNote,
    saveNow: store.saveActiveNote,
    moveToFolder: store.moveNote,
    removeNote: store.removeNote,
  }
}

