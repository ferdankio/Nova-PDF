import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { Document, Annotation, Bookmark, AppTheme, PdfTheme, AnnotationTool, RightPanelTab } from '../types'

interface State {
  documents: Document[]; activeDoc: Document | null; pdfData: string | null
  pageCount: number; currentPage: number; zoom: number
  annotations: Annotation[]; bookmarks: Bookmark[]
  annotationTool: AnnotationTool; highlightColor: string
  theme: AppTheme; pdfTheme: PdfTheme; rightPanel: RightPanelTab
  showSettings: boolean; passwordModal: { open: boolean; docPath: string; docName: string } | null
  isLoading: boolean
}

const initial: State = {
  documents: [], activeDoc: null, pdfData: null,
  pageCount: 0, currentPage: 1, zoom: 1.0,
  annotations: [], bookmarks: [],
  annotationTool: 'none', highlightColor: '#FBBF24',
  theme: 'dark', pdfTheme: 'white', rightPanel: 'toc',
  showSettings: false, passwordModal: null, isLoading: false,
}

type Action =
  | { type: 'SET_DOCUMENTS'; payload: Document[] }
  | { type: 'SET_ACTIVE_DOC'; payload: Document | null }
  | { type: 'SET_PDF_DATA'; payload: string | null }
  | { type: 'SET_PAGE_COUNT'; payload: number }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_ANNOTATIONS'; payload: Annotation[] }
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'REMOVE_ANNOTATION'; payload: number }
  | { type: 'SET_BOOKMARKS'; payload: Bookmark[] }
  | { type: 'ADD_BOOKMARK'; payload: Bookmark }
  | { type: 'REMOVE_BOOKMARK'; payload: number }
  | { type: 'SET_ANN_TOOL'; payload: AnnotationTool }
  | { type: 'SET_HL_COLOR'; payload: string }
  | { type: 'SET_THEME'; payload: AppTheme }
  | { type: 'SET_PDF_THEME'; payload: PdfTheme }
  | { type: 'SET_RIGHT_PANEL'; payload: RightPanelTab }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'SET_PASSWORD_MODAL'; payload: State['passwordModal'] }
  | { type: 'SET_LOADING'; payload: boolean }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'SET_DOCUMENTS':     return { ...s, documents: a.payload }
    case 'SET_ACTIVE_DOC':    return { ...s, activeDoc: a.payload, currentPage: a.payload?.last_page ?? 1 }
    case 'SET_PDF_DATA':      return { ...s, pdfData: a.payload }
    case 'SET_PAGE_COUNT':    return { ...s, pageCount: a.payload }
    case 'SET_PAGE':          return { ...s, currentPage: Math.max(1, Math.min(a.payload, s.pageCount)) }
    case 'SET_ZOOM':          return { ...s, zoom: Math.max(0.5, Math.min(a.payload, 3.0)) }
    case 'SET_ANNOTATIONS':   return { ...s, annotations: a.payload }
    case 'ADD_ANNOTATION':    return { ...s, annotations: [...s.annotations, a.payload] }
    case 'REMOVE_ANNOTATION': return { ...s, annotations: s.annotations.filter(x => x.id !== a.payload) }
    case 'SET_BOOKMARKS':     return { ...s, bookmarks: a.payload }
    case 'ADD_BOOKMARK':      return { ...s, bookmarks: [...s.bookmarks, a.payload] }
    case 'REMOVE_BOOKMARK':   return { ...s, bookmarks: s.bookmarks.filter(x => x.id !== a.payload) }
    case 'SET_ANN_TOOL':      return { ...s, annotationTool: a.payload }
    case 'SET_HL_COLOR':      return { ...s, highlightColor: a.payload }
    case 'SET_THEME':         return { ...s, theme: a.payload }
    case 'SET_PDF_THEME':     return { ...s, pdfTheme: a.payload }
    case 'SET_RIGHT_PANEL':   return { ...s, rightPanel: a.payload }
    case 'TOGGLE_SETTINGS':   return { ...s, showSettings: !s.showSettings }
    case 'SET_PASSWORD_MODAL':return { ...s, passwordModal: a.payload }
    case 'SET_LOADING':       return { ...s, isLoading: a.payload }
    default: return s
  }
}

const Ctx = createContext<{ state: State; dispatch: React.Dispatch<Action> } | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  useEffect(() => {
    async function init() {
      const theme = (await window.electronAPI.getSetting('theme') ?? 'dark') as AppTheme
      const pdfTheme = (await window.electronAPI.getSetting('pdfTheme') ?? 'white') as PdfTheme
      const zoom = parseFloat(await window.electronAPI.getSetting('zoom') ?? '1.0')
      dispatch({ type: 'SET_THEME', payload: theme })
      dispatch({ type: 'SET_PDF_THEME', payload: pdfTheme })
      dispatch({ type: 'SET_ZOOM', payload: zoom })
      const docs = await window.electronAPI.getDocuments()
      dispatch({ type: 'SET_DOCUMENTS', payload: docs })
    }
    init()
  }, [])
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
