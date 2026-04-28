"use client"

import * as React from "react"
import { useWorkspaceStore, type Folder } from "@/stores/workspace.store"

type FoldersState = {
  folders: Folder[]
  loading: boolean
  error: string | null
  selectedFolderId: number | null
  selectFolder: (id: number) => void
  refresh: () => Promise<void>
  create: (args: { name: string }) => Promise<void>
  rename: (args: { id: number; name: string }) => Promise<void>
  remove: (id: number) => Promise<void>
}

export function useFolders(): FoldersState {
  const store = useWorkspaceStore()

  React.useEffect(() => {
    if (store.folders.length === 0) {
      void store.refreshFolders()
    }
  }, [store])

  return {
    folders: store.folders,
    loading: store.foldersLoading,
    error: null, // Error handled via toast in store
    selectedFolderId: store.selectedFolderId,
    selectFolder: store.setSelectedFolderId,
    refresh: store.refreshFolders,
    create: (args) => store.createFolder(args.name),
    rename: (args) => store.renameFolder(args.id, args.name),
    remove: store.removeFolder,
  }
}

