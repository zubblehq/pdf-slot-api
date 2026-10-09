import { lazy, Suspense, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Dropzone, type UploadedFile } from '@/features/upload/Dropzone'
import { SavedFiles } from '@/features/files/SavedFiles'
import type { OpenedFile } from '@/features/template/openFile'
import { isFileId } from '@/lib/files/fileHash'
import { templateStore } from '@/lib/persistence'

/**
 * The editor, and the code that opens a PDF, are loaded when a file is --
 * not before.
 *
 * Between them they pull in pdf.js, pdf-lib and fontkit, which is most of
 * this app's weight. Someone arriving at the start screen has not asked for
 * any of it yet, and whichever path they take next (upload, or reopening a
 * saved file) goes through `loadPdfTools` first, so the wait is the same one
 * they were already waiting for.
 */
const TemplateEditor = lazy(() =>
  import('@/features/template/TemplateEditor').then((m) => ({ default: m.TemplateEditor })),
)

const loadPdfTools = () => import('@/features/template/openFile')

/**
 * Toasts, with the theme stated rather than detected.
 *
 * `layout.tsx` rendered this once around every page. There is no theme
 * switcher -- `index.html` sets `dark` on `<html>` -- so sonner's own
 * `useTheme` would report "system" and could disagree with the page.
 */
function Notifications() {
  return <Toaster theme="dark" position="top-center" />
}

/** Shown only for as long as the editor chunk takes to arrive. */
function EditorLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
      Opening…
    </div>
  )
}

export function App() {
  const [opened, setOpened] = useState<OpenedFile | null>(null)
  // Nothing renders until the restore has been attempted, so a saved
  // session never flashes the dropzone before landing in the editor.
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const session = await templateStore.get()
        if (!session) return
        // A random id (no SubtleCrypto at the time) can't be recognised
        // again, so restoring it would land on a write step with no
        // slots. A session whose bytes are gone is dead too. Clear both
        // rather than re-trying them on every reload.
        const file = isFileId(session.fileId) ? await templateStore.getFile(session.fileId) : null
        if (!file) {
          await templateStore.clear()
          return
        }
        const { openFile } = await loadPdfTools()
        const result = await openFile(file.source, file.name, templateStore)
        if (!cancelled) setOpened(result)
      } catch (err) {
        console.error('Failed to restore the last open file', err)
        toast.error("Couldn't reopen your last file. Upload it again to continue.")
        await templateStore.clear()
      } finally {
        // Always runs, so a failed restore shows the dropzone rather than
        // a blank page.
        if (!cancelled) setIsRestoring(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleFile = async ({ bytes, name }: UploadedFile) => {
    try {
      const { openFile } = await loadPdfTools()
      const result = await openFile(bytes, name, templateStore)
      // openFile falls back to a random id only when SubtleCrypto is
      // missing (insecure origin); anything else is a content hash.
      if (!isFileId(result.fileId)) {
        toast.warning("This browser can't remember layouts for this file (insecure connection).")
      }
      setOpened(result)
    } catch (err) {
      // normalizePdf's InvalidPdfError / EncryptedPdfError carry the
      // user-facing copy; keep them distinct rather than one generic line.
      toast.error(err instanceof Error ? err.message : 'Could not load that file.')
    }
  }

  // Open a file the browser already holds: same path as an upload, from
  // the stored bytes and name.
  const handleOpenSaved = async (fileId: string) => {
    const file = await templateStore.getFile(fileId)
    if (!file) {
      toast.error("That file isn't saved here any more.")
      return
    }
    await handleFile({ bytes: file.source, name: file.name })
  }

  // Nothing renders until the restore has been attempted (see above).
  if (isRestoring) return null

  // The editor is the whole viewport, Figma-style; the start screen is a
  // centred column.
  if (opened) {
    return (
      <>
        <Suspense fallback={<EditorLoading />}>
          {/* Keyed on the file so a restore or a fresh open remounts the editor
              with new initial state instead of reusing stale hooks. */}
          <TemplateEditor
            key={opened.fileId}
            opened={opened}
            store={templateStore}
            onStartOver={() => setOpened(null)}
          />
        </Suspense>
        <Notifications />
      </>
    )
  }

  return (
    <>
      <main className="flex min-h-dvh flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-2xl font-medium tracking-tight">PDF Slot Editor</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lay out named text slots on a PDF once; fill them in every time after.
          </p>
          <div className="mt-6">
            <Dropzone onFile={handleFile} />
            <SavedFiles store={templateStore} onOpen={(id) => void handleOpenSaved(id)} />
          </div>
        </div>
      </main>
      <Notifications />
    </>
  )
}
