"use client"

import { create } from "zustand"
import { apiFetch } from "@/lib/api"
import { toast } from "sonner"
import type { Note, Paginated } from "@/lib/types"

export type Folder = {
  id: number
  name: string
  parentId: number | null
  children?: Folder[]
}

type WorkspaceStore = {
  // Folders
  folders: Folder[]
  foldersLoading: boolean
  selectedFolderId: number | null
  
  // Notes
  notes: Note[]
  notesLoading: boolean
  selectedNoteId: number | null
  
  // Active Note (Editor)
  activeNote: Note | null
  activeNoteLoading: boolean
  draftTitle: string
  draftMarkdown: string
  
  // Search
  q: string

  // Setters
  setQ: (q: string) => void
  setSelectedFolderId: (id: number | null) => void
  setSelectedNoteId: (id: number | null) => void
  setDraftTitle: (v: string) => void
  setDraftMarkdown: (v: string) => void

  // Actions
  refreshFolders: () => Promise<void>
  createFolder: (name: string) => Promise<void>
  renameFolder: (id: number, name: string) => Promise<void>
  removeFolder: (id: number) => Promise<void>
  
  refreshNotes: (keepSelected?: boolean) => Promise<void>
  fetchActiveNote: (id: number) => Promise<void>
  createNote: () => Promise<void>
  saveActiveNote: () => Promise<void>
  removeNote: (id: number) => Promise<void>
  moveNote: (noteId: number, folderId: number) => Promise<void>
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  // Initial State
  folders: [],
  foldersLoading: false,
  selectedFolderId: null,
  
  notes: [],
  notesLoading: false,
  selectedNoteId: null,
  
  activeNote: null,
  activeNoteLoading: false,
  draftTitle: "",
  draftMarkdown: "",
  
  q: "",

  // Basic Setters
  setQ: (q) => {
    set({ q })
    get().refreshNotes(true)
  },
  setSelectedFolderId: (id) => {
    // Only reset notes if folder actually changes
    if (get().selectedFolderId === id) return
    
    set({ selectedFolderId: id, selectedNoteId: null, activeNote: null, notes: [] })
    if (id) get().refreshNotes()
  },
  setSelectedNoteId: (id) => {
    if (get().selectedNoteId === id) return
    set({ selectedNoteId: id })
    if (id) get().fetchActiveNote(id)
    else set({ activeNote: null, draftTitle: "", draftMarkdown: "" })
  },
  setDraftTitle: (v) => set({ draftTitle: v }),
  setDraftMarkdown: (v) => set({ draftMarkdown: v }),

  // Folders Actions
  refreshFolders: async () => {
    set({ foldersLoading: true })
    try {
      const data = await apiFetch<Folder[]>("/api/v1/folders", { cache: "no-store" })
      set({ folders: data })
      // Auto-select first folder if none selected
      if (!get().selectedFolderId && data[0]) {
        get().setSelectedFolderId(data[0].id)
      }
    } catch (err) {
      toast.error("Failed to load folders")
    } finally {
      set({ foldersLoading: false })
    }
  },

  createFolder: async (name) => {
    try {
      const created = await apiFetch<Folder>("/api/v1/folders", {
        method: "POST",
        body: JSON.stringify({ name, parentId: null }),
      })
      toast.success(`Folder "${name}" created`)
      set((state) => ({ folders: [...state.folders, created] }))
      if (!get().selectedFolderId) get().setSelectedFolderId(created.id)
    } catch (err) {
      toast.error("Failed to create folder")
    }
  },

  renameFolder: async (id, name) => {
    try {
      await apiFetch(`/api/v1/folders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      })
      set((state) => ({
        folders: state.folders.map(f => f.id === id ? { ...f, name } : f)
      }))
      toast.success("Folder renamed")
    } catch (err) {
      toast.error("Failed to rename folder")
    }
  },

  removeFolder: async (id) => {
    try {
      await apiFetch(`/api/v1/folders/${id}`, { method: "DELETE" })
      toast.success("Folder deleted")
      if (get().selectedFolderId === id) set({ selectedFolderId: null })
      set((state) => ({ folders: state.folders.filter(f => f.id !== id) }))
    } catch (err) {
      toast.error("Failed to delete folder")
    }
  },

  // Notes Actions
  refreshNotes: async (keepSelected = false) => {
    const { q, selectedFolderId } = get()
    if (!selectedFolderId) return
    
    set({ notesLoading: true })
    try {
      const path = q.trim()
        ? `/api/v1/notes/search?q=${encodeURIComponent(q.trim())}&folderId=${selectedFolderId}`
        : `/api/v1/notes?page=1&limit=50&folderId=${selectedFolderId}`
      
      const data = await apiFetch<Paginated<Note>>(path, { cache: "no-store" })
      set({ notes: data.items })
      
      // Auto-select first note if none selected and not searching
      if (!keepSelected && !get().selectedNoteId && data.items[0]) {
        get().setSelectedNoteId(data.items[0].id)
      }
    } catch (err) {
      toast.error("Failed to load notes")
    } finally {
      set({ notesLoading: false })
    }
  },

  fetchActiveNote: async (id) => {
    // If already loading this note, skip
    if (get().activeNote?.id === id && get().activeNoteLoading) return
    
    set({ activeNoteLoading: true })
    try {
      const note = await apiFetch<Note>(`/api/v1/notes/${id}`, { cache: "no-store" })
      set({ 
        activeNote: note,
        draftTitle: note.title ?? "",
        draftMarkdown: note.markdownContent ?? ""
      })
    } catch (err) {
      toast.error("Failed to load note")
    } finally {
      set({ activeNoteLoading: false })
    }
  },

  createNote: async () => {
    const { selectedFolderId } = get()
    if (!selectedFolderId) {
      toast.error("Select a folder first")
      return
    }
    
    try {
      const created = await apiFetch<Note>("/api/v1/notes", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled",
          contentType: "MARKDOWN",
          markdownContent: " ",
          folderId: selectedFolderId,
        }),
      })
      set((state) => ({ notes: [created, ...state.notes] }))
      get().setSelectedNoteId(created.id)
      toast.success("Note created")
    } catch (err) {
      toast.error("Failed to create note")
    }
  },

  saveActiveNote: async () => {
    const { selectedNoteId, draftTitle, draftMarkdown } = get()
    if (!selectedNoteId) return
    
    try {
      const updated = await apiFetch<Note>(`/api/v1/notes/${selectedNoteId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draftTitle,
          contentType: "MARKDOWN",
          markdownContent: draftMarkdown,
        }),
      })
      set((state) => ({
        activeNote: updated,
        notes: state.notes.map(n => n.id === updated.id ? { ...n, title: updated.title, updatedAt: updated.updatedAt } : n)
      }))
    } catch (err) {
      // Don't toast error for autosave to avoid spam, but we could log it
      console.error("Autosave failed", err)
    }
  },

  removeNote: async (id) => {
    try {
      await apiFetch(`/api/v1/notes/${id}`, { method: "DELETE" })
      toast.success("Note deleted")
      if (get().selectedNoteId === id) {
        set({ selectedNoteId: null, activeNote: null })
      }
      set((state) => ({ notes: state.notes.filter(n => n.id !== id) }))
    } catch (err) {
      toast.error("Failed to delete note")
    }
  },

  moveNote: async (noteId, folderId) => {
    try {
      await apiFetch(`/api/v1/notes/${noteId}/folder`, {
        method: "PATCH",
        body: JSON.stringify({ folderId }),
      })
      toast.success("Note moved")
      set((state) => ({ 
        notes: state.notes.filter(n => n.id !== noteId),
        selectedNoteId: state.selectedNoteId === noteId ? null : state.selectedNoteId,
        activeNote: state.selectedNoteId === noteId ? null : state.activeNote
      }))
    } catch (err) {
      toast.error("Failed to move note")
    }
  }
}))

