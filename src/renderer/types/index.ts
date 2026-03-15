export interface Document {
  id: number; path: string; name: string; size: number
  page_count: number; has_password: number; last_page: number
  date_added: string; last_opened: string
}
export interface Annotation {
  id: number; document_id: number; page: number
  type: 'highlight' | 'note' | 'underline'
  content: string; color: string; rect: string; created_at: string
}
export interface Bookmark {
  id: number; document_id: number; page: number; label: string; created_at: string
}
export type AppTheme = 'dark' | 'light'
export type PdfTheme = 'white' | 'dark' | 'sepia'
export type AnnotationTool = 'none' | 'highlight' | 'note' | 'underline'
export type RightPanelTab = 'toc' | 'annotations' | 'bookmarks'

declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      openFile: () => Promise<string[]>
      readFile: (p: string) => Promise<{ success: boolean; data?: string; size?: number; error?: string }>
      fileExists: (p: string) => Promise<boolean>
      showInFolder: (p: string) => Promise<void>
      addDocument: (d: any) => Promise<number>
      getDocuments: () => Promise<Document[]>
      deleteDocument: (id: number) => Promise<void>
      updateLastPage: (id: number, p: number) => Promise<void>
      searchDocuments: (q: string) => Promise<Document[]>
      addAnnotation: (a: any) => Promise<number>
      getAnnotations: (id: number) => Promise<Annotation[]>
      deleteAnnotation: (id: number) => Promise<void>
      updateAnnotation: (id: number, c: string) => Promise<void>
      addBookmark: (b: any) => Promise<number>
      getBookmarks: (id: number) => Promise<Bookmark[]>
      deleteBookmark: (id: number) => Promise<void>
      getSetting: (k: string) => Promise<string | null>
      setSetting: (k: string, v: string) => Promise<void>
    }
  }
}
