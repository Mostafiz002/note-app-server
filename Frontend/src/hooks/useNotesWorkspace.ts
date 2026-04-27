"use client"

import * as React from "react"

import { apiFetch } from "@/lib/api"
import type { Note, Paginated } from "@/lib/types"
import { useWorkspaceStore } from "@/stores/workspace.store"

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
}

function useDebouncedEffect(effect: () => void, ms: number, deps: React.DependencyList) {
  React.useEffect(() => {
    const t = window.setTimeout(effect, ms)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export function useNotesWorkspace(): WorkspaceState {
  const [q, setQ] = React.useState("")
  const selectedFolderId = useWorkspaceStore((s) => s.selectedFolderId)
  const initialLoad = React.useRef(true)

  const [notes, setNotes] = React.useState<Note[]>([])
  const [notesLoading, setNotesLoading] = React.useState(true)
  const [notesError, setNotesError] = React.useState<string | null>(null)

  const [selectedId, setSelectedId] = React.useState<number | null>(null)

  React.useEffect(() => {
    setSelectedId(null)
  }, [selectedFolderId])

  const [active, setActive] = React.useState<Note | null>(null)
  const [activeLoading, setActiveLoading] = React.useState(false)
  const [activeError, setActiveError] = React.useState<string | null>(null)

  const [draftTitle, setDraftTitle] = React.useState("")
  const [draftMarkdown, setDraftMarkdown] = React.useState("")

  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  const refreshList = React.useCallback(async () => {
    setNotesError(null)
    setNotesLoading(true)
    try {
      if (!selectedFolderId) {
        setNotes([])
        return
      }

      const path = q.trim()
        ? `/api/v1/notes/search?q=${encodeURIComponent(q.trim())}&folderId=${selectedFolderId}`
        : `/api/v1/notes?page=1&limit=50&folderId=${selectedFolderId}`

      const data = await apiFetch<Paginated<Note>>(path, { cache: "no-store" })
      setNotes(data.items)
      
      if (initialLoad.current) {
        initialLoad.current = false
        if (!selectedId && data.items[0]?.id) {
          setSelectedId(data.items[0].id)
        }
      }
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to load notes")
    } finally {
      setNotesLoading(false)
    }
  }, [q, selectedFolderId, selectedId])

  const select = React.useCallback((id: number) => {
    setSelectedId(id)
  }, [])

  React.useEffect(() => {
    void refreshList()
  }, [refreshList])

  React.useEffect(() => {
    if (!selectedId) {
      setActive(null)
      setDraftTitle("")
      setDraftMarkdown("")
      return
    }

    let cancelled = false
    setActiveError(null)
    setActiveLoading(true)
    void (async () => {
      try {
        const note = await apiFetch<Note>(`/api/v1/notes/${selectedId}`, {
          cache: "no-store",
        })
        if (cancelled) return
        setActive(note)
        setDraftTitle(note.title ?? "")
        setDraftMarkdown(note.markdownContent ?? "")
      } catch (err) {
        if (cancelled) return
        setActiveError(err instanceof Error ? err.message : "Failed to load note")
      } finally {
        if (!cancelled) setActiveLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const createNote = React.useCallback(async () => {
    setNotesError(null)
    try {
      if (!selectedFolderId) {
        setNotesError("Select a folder to create a note.")
        return
      }

      const created = await apiFetch<Note>("/api/v1/notes", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled",
          contentType: "MARKDOWN",
          // Backend validation rejects empty markdownContent
          markdownContent: " ",
          folderId: selectedFolderId,
        }),
      })
      setNotes((prev) => [created, ...prev])
      setSelectedId(created.id)
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Failed to create note")
    }
  }, [selectedFolderId])

  const saveNow = React.useCallback(async () => {
    if (!selectedId) return
    setSaveError(null)
    setSaving(true)
    try {
      const updated = await apiFetch<Note>(`/api/v1/notes/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draftTitle,
          contentType: "MARKDOWN",
          markdownContent: draftMarkdown,
        }),
      })
      setActive(updated)
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? { ...n, title: updated.title, updatedAt: updated.updatedAt } : n))
      )
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }, [draftMarkdown, draftTitle, selectedId])

  const moveToFolder = React.useCallback(
    async (folderId: number) => {
      if (!selectedId) return
      setNotesError(null)
      try {
        await apiFetch<unknown>(`/api/v1/notes/${selectedId}/folder`, {
          method: "PATCH",
          body: JSON.stringify({ folderId }),
        })
        // if moved out of the current folder filter, refresh list to reflect it
        await refreshList()
      } catch (err) {
        setNotesError(err instanceof Error ? err.message : "Failed to move note")
      }
    },
    [refreshList, selectedId]
  )

  const lastSavedRef = React.useRef<{ id: number; title: string; markdown: string } | null>(null)
  React.useEffect(() => {
    if (!selectedId) return
    lastSavedRef.current = { id: selectedId, title: draftTitle, markdown: draftMarkdown }
  }, [selectedId])

  useDebouncedEffect(
    () => {
      if (!selectedId || activeLoading) return
      const last = lastSavedRef.current
      if (!last || last.id !== selectedId) return
      if (last.title === draftTitle && last.markdown === draftMarkdown) return
      void saveNow()
      lastSavedRef.current = { id: selectedId, title: draftTitle, markdown: draftMarkdown }
    },
    800,
    [draftTitle, draftMarkdown, selectedId, activeLoading, saveNow]
  )

  return {
    q,
    setQ,

    notes,
    notesLoading,
    notesError,

    selectedId,
    select,

    active,
    activeLoading,
    activeError,

    draftTitle,
    setDraftTitle,
    draftMarkdown,
    setDraftMarkdown,

    saving,
    saveError,

    refreshList,
    createNote,
    saveNow,
    moveToFolder,
  }
}

