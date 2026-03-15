import React, { useEffect } from 'react'
import { useApp } from './store/AppContext'
import { Titlebar } from './components/Titlebar'
import { Sidebar } from './components/Sidebar'
import { Library } from './components/Library'
import { PdfViewer } from './components/PdfViewer'
import { RightPanel } from './components/RightPanel'
import { SettingsModal } from './components/SettingsModal'
import { PasswordModal } from './components/PasswordModal'

export default function App() {
  const { state, dispatch } = useApp()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!state.activeDoc) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') dispatch({ type: 'SET_PAGE', payload: state.currentPage + 1 })
      else if (e.key === 'ArrowLeft') dispatch({ type: 'SET_PAGE', payload: state.currentPage - 1 })
      else if (e.ctrlKey && e.key === '=') { e.preventDefault(); dispatch({ type: 'SET_ZOOM', payload: state.zoom + 0.1 }) }
      else if (e.ctrlKey && e.key === '-') { e.preventDefault(); dispatch({ type: 'SET_ZOOM', payload: state.zoom - 0.1 }) }
      else if (e.key === 'Escape') dispatch({ type: 'SET_ANN_TOOL', payload: 'none' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state.activeDoc, state.currentPage, state.zoom])

  useEffect(() => {
    if (state.activeDoc && state.currentPage > 0)
      window.electronAPI.updateLastPage(state.activeDoc.id, state.currentPage)
  }, [state.currentPage])

  return (
    <div className="app-shell">
      <Titlebar />
      <div className="app-body">
        <Sidebar />
        <div className="main-area">
          {!state.activeDoc ? <Library /> : (
            <div className="viewer-area">
              <PdfViewer />
              <RightPanel />
            </div>
          )}
        </div>
      </div>
      {state.showSettings && <SettingsModal />}
      {state.passwordModal?.open && <PasswordModal />}
    </div>
  )
}
