import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, FileAudio, Film, Folder, FolderOpen, HardDrive, LoaderCircle, X } from 'lucide-react'
import { api, type NasEntry, type NasKind } from '../../lib/api'

type TreeSelection = {
  kind: NasKind
  candidate: string
  initial: string
  onPick: (path: string) => void
}

function pathLabel(path: string) {
  return path === '.' ? 'NAS 根目录' : path
}

function DirectoryNode({ path, name, tree, root = false }: { path: string; name: string; tree: TreeSelection; root?: boolean }) {
  const [expanded, setExpanded] = useState(() => root || tree.initial.startsWith(`${path}/`))
  const childrenId = useId()
  const Icon = root ? HardDrive : expanded ? FolderOpen : Folder
  const Chevron = expanded ? ChevronDown : ChevronRight
  const selected = path === tree.candidate
  const toggle = () => setExpanded((value) => !value)

  return <li>
    {tree.kind === 'folder' ? <div className="nas-tree-folder">
      <button type="button" className="nas-tree-toggle" aria-label={`${expanded ? '折叠' : '展开'} ${name}`} aria-expanded={expanded} aria-controls={childrenId} onClick={toggle}><Chevron size={16} aria-hidden="true" /></button>
      <button type="button" className="nas-tree-row" aria-pressed={selected} onClick={() => tree.onPick(path)}>
        <Icon size={18} aria-hidden="true" /><span>{name}</span>{selected && <Check size={16} aria-hidden="true" />}
      </button>
    </div> : <button type="button" className="nas-tree-row nas-tree-disclosure" aria-expanded={expanded} aria-controls={childrenId} onClick={toggle}>
      <Chevron size={16} aria-hidden="true" /><Icon size={18} aria-hidden="true" /><span>{name}</span>
    </button>}
    <div id={childrenId} hidden={!expanded}>
      {expanded && <DirectoryContents path={path} tree={tree} />}
    </div>
  </li>
}

function DirectoryContents({ path, tree }: { path: string; tree: TreeSelection }) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ attempt: number; entries: NasEntry[] } | { attempt: number; error: string }>()
  const kind = tree.kind
  useEffect(() => {
    const controller = new AbortController()
    api.nasEntries(path, kind, controller.signal).then(
      (entries) => { if (!controller.signal.aborted) setResult({ attempt, entries }) },
      (cause: unknown) => { if (!controller.signal.aborted) setResult({ attempt, error: cause instanceof Error ? cause.message : '无法读取 NAS 目录。' }) },
    )
    return () => controller.abort()
  }, [path, kind, attempt])

  const current = result?.attempt === attempt ? result : undefined
  const FileIcon = kind === 'video' ? Film : FileAudio
  return <ul className="nas-tree-branch">
    {!current ? <li className="nas-tree-message" role="status"><LoaderCircle size={15} className="nas-spinner" aria-hidden="true" />正在读取目录…</li>
      : 'error' in current ? <li className="nas-tree-message nas-tree-error"><span role="alert">{current.error}</span><button type="button" className="nas-button nas-button-secondary" onClick={() => setAttempt((value) => value + 1)}>重试</button></li>
      : !current.entries.length ? <li className="nas-tree-message">{kind === 'folder' ? '没有子文件夹' : '没有可选文件或子文件夹'}</li>
      : current.entries.map((entry) => {
        const child = path === '.' ? entry.name : `${path}/${entry.name}`
        const selected = tree.candidate === child
        return entry.directory ? <DirectoryNode key={child} path={child} name={entry.name} tree={tree} />
          : <li key={child}><button type="button" className="nas-tree-row nas-tree-file" aria-pressed={selected} onClick={() => tree.onPick(child)}>
            <FileIcon size={18} aria-hidden="true" /><span>{entry.name}</span>{selected && <Check size={16} aria-hidden="true" />}
          </button></li>
      })}
  </ul>
}

function PickerDialog({ id, label, kind, initial, onConfirm, onClose }: {
  id: string; label: string; kind: NasKind; initial: string; onConfirm: (path: string) => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [candidate, setCandidate] = useState(initial)

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])

  return <dialog ref={dialog} id={id} className="nas-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} onClose={onClose}>
    <div className="nas-dialog-layout">
      <header className="nas-dialog-header">
        <span className="nas-icon-chip"><HardDrive size={22} aria-hidden="true" /></span>
        <div><h2 id={`${id}-title`}>选择{label}</h2><p id={`${id}-help`}>{kind === 'folder' ? '点箭头展开，点文件夹名称选中。多个挂载目录时，请选择其中一个可写目录。' : '展开文件夹，选择文件后点击确认。'}</p></div>
        <button type="button" className="nas-close" aria-label="关闭 NAS 选择器" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="nas-tree-pane">
        <ul className="nas-tree" aria-label="NAS 文件夹目录"><DirectoryNode path="." name="NAS 根目录" tree={{ kind, initial, candidate, onPick: setCandidate }} root /></ul>
      </div>
      <footer className="nas-dialog-footer">
        <div className="nas-selection" role="status"><span>所选路径</span><strong>{candidate ? pathLabel(candidate) : '尚未选择'}</strong></div>
        <div className="nas-dialog-actions">
          <button type="button" className="nas-button nas-button-secondary" onClick={() => dialog.current?.close()}>取消</button>
          <button type="button" className="nas-button nas-button-primary" disabled={!candidate} onClick={() => {
            if (!candidate) return
            onConfirm(candidate)
            dialog.current?.close()
          }}>确认选择</button>
        </div>
      </footer>
    </div>
  </dialog>
}

/** Shows the selected NAS path and opens the directory tree for changes. */
export function NasPicker({ label, kind, selected, onSelect, disabled }: {
  label: string; kind: NasKind; selected: string; onSelect: (path: string) => void; disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const Icon = kind === 'folder' ? Folder : kind === 'video' ? Film : FileAudio
  return <div className="nas-picker">
    <span className="nas-icon-chip"><Icon size={20} aria-hidden="true" /></span>
    <div className="nas-picker-copy"><strong id={`${id}-label`}>{label}</strong><span>{selected ? pathLabel(selected) : kind === 'folder' ? '尚未选择保存位置' : '尚未选择文件'}</span></div>
    <button type="button" className="nas-button nas-button-secondary" id={`${id}-browse`} aria-labelledby={`${id}-browse ${id}-label`} aria-haspopup="dialog" aria-controls={open ? id : undefined} disabled={disabled} onClick={() => setOpen(true)}>{selected ? '重新选择' : '浏览 NAS'}</button>
    {open && <PickerDialog id={id} label={label} kind={kind} initial={selected} onConfirm={onSelect} onClose={() => setOpen(false)} />}
  </div>
}
