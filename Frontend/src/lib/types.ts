export type ContentType = "MARKDOWN" | "JSON"

export type Note = {
  id: number
  title: string
  contentType: ContentType
  markdownContent: string | null
  jsonContent: unknown | null
  folderId: number | null
  summary?: string | null
  keyPoints?: string[] | null
  archivedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type Paginated<T> = {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

