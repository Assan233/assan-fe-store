import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, FileAudio, Film, Folder, FolderOpen, HardDrive, LoaderCircle, Square, SquareCheck, X } from 'lucide-react'
import { api, type NasEntry, type NasKind } from '../../lib/api'
import { nasChildPath, type NasSelection } from './videoBatch'

type TreeSelection = {
  kind: NasKind
  multiple: boolean
  candidates: Set<string>
  initial: NasSelection[]
  onPick: (entry: NasSelection) => void
}

function pathLabel(path: string) {
  return path === '.' ? 'NAS 根目录' : path
}

function SelectionMark({ multiple, selected }: { multiple: boolean; selected: boolean }) {
  const Icon = multiple ? selected ? SquareCheck : Square : selected ? Check : null
  return Icon && <Icon size={16} aria-hidden="true" />
}

function DirectoryNode({ path, name, tree, root = false }: { path: string; name: string; tree: TreeSelection; root?: boolean }) {
  const [expanded, setExpanded] = useState(() => root || tree.initial.some((entry) => entry.path.startsWith(`${path}/`)))
  const childrenId = useId()
  const Icon = root ? HardDrive : expanded ? FolderOpen : Folder
  const Chevron = expanded ? ChevronDown : ChevronRight
  const selected = tree.candidates.has(path)
  const toggle = () => setExpanded((value) => !value)

  return <li>
    {tree.kind === 'folder' || tree.multiple ? <div className="nas-tree-folder">
      <button type="button" className="nas-tree-toggle" aria-label={`${expanded ? '折叠' : '展开'} ${name}`} aria-expanded={expanded} aria-controls={childrenId} onClick={toggle}><Chevron size={16} aria-hidden="true" /></button>
      <button type="button" className="nas-tree-row" aria-pressed={selected} onClick={() => tree.onPick({ path, directory: true })}>
        <Icon size={18} aria-hidden="true" /><span>{name}</span><SelectionMark multiple={tree.multiple} selected={selected} />
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
        const child = nasChildPath(path, entry.name)
        const selected = tree.candidates.has(child)
        return entry.directory ? <DirectoryNode key={child} path={child} name={entry.name} tree={tree} />
          : <li key={child}><button type="button" className="nas-tree-row nas-tree-file" aria-pressed={selected} onClick={() => tree.onPick({ path: child, directory: false })}>
            <FileIcon size={18} aria-hidden="true" /><span>{entry.name}</span><SelectionMark multiple={tree.multiple} selected={selected} />
          </button></li>
      })}
  </ul>
}

function selectionLabel(entries: NasSelection[]) {
  if (entries.length === 1) return pathLabel(entries[0].path)
  const folders = entries.filter((entry) => entry.directory).length
  return `已选 ${entries.length - folders} 个文件、${folders} 个文件夹`
}

function PickerDialog({ id, label, kind, multiple, initial, onConfirm, onClose }: {
  id: string; label: string; kind: NasKind; multiple: boolean; initial: NasSelection[]; onConfirm: (entries: NasSelection[]) => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [candidate, setCandidate] = useState(initial)
  const candidates = new Set(candidate.map((entry) => entry.path))

  function pick(entry: NasSelection) {
    setCandidate((current) => !multiple ? [entry] : current.some((item) => item.path === entry.path)
      ? current.filter((item) => item.path !== entry.path) : [...current, entry])
  }

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal()
  }, [])

  return <dialog ref={dialog} id={id} className="nas-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} onClose={onClose}>
    <div className="nas-dialog-layout">
      <header className="nas-dialog-header">
        <span className="nas-icon-chip"><HardDrive size={22} aria-hidden="true" /></span>
        <div><h2 id={`${id}-title`}>选择{label}</h2><p id={`${id}-help`}>{multiple ? '点箭头展开，点名称可多选文件和文件夹。选择文件夹会包含其子文件夹中的视频。' : kind === 'folder' ? '点箭头展开，点文件夹名称选中。多个挂载目录时，请选择其中一个可写目录。' : '展开文件夹，选择文件后点击确认。'}</p></div>
        <button type="button" className="nas-close" aria-label="关闭 NAS 选择器" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
      </header>
      <div className="nas-tree-pane">
        <ul className="nas-tree" aria-label="NAS 文件夹目录"><DirectoryNode path="." name="NAS 根目录" tree={{ kind, multiple, initial, candidates, onPick: pick }} root /></ul>
      </div>
      <footer className="nas-dialog-footer">
        <div className="nas-selection" role="status"><span>{multiple ? '所选来源' : '所选路径'}</span><strong>{candidate.length ? selectionLabel(candidate) : '尚未选择'}</strong></div>
        <div className="nas-dialog-actions">
          <button type="button" className="nas-button nas-button-secondary" onClick={() => dialog.current?.close()}>取消</button>
          <button type="button" className="nas-button nas-button-primary" disabled={!multiple && !candidate.length} onClick={() => {
            onConfirm(candidate)
            dialog.current?.close()
          }}>确认选择</button>
        </div>
      </footer>
    </div>
  </dialog>
}

type PickerProps = { label: string; disabled: boolean } & (
  { kind: 'video'; multiple: true; selected: NasSelection[]; onSelect: (entries: NasSelection[]) => void }
  | { kind: NasKind; multiple?: false; selected: string; onSelect: (path: string) => void }
)

/** Shows the selected NAS sources and opens the directory tree for changes. */
export function NasPicker(props: PickerProps) {
  const { label, kind, disabled } = props
  const [open, setOpen] = useState(false)
  const id = useId()
  const Icon = kind === 'folder' ? Folder : kind === 'video' ? Film : FileAudio
  const selected = props.multiple ? props.selected : props.selected ? [{ path: props.selected, directory: kind === 'folder' }] : []
  return <div className="nas-picker">
    <span className="nas-icon-chip"><Icon size={20} aria-hidden="true" /></span>
    <div className="nas-picker-copy"><strong id={`${id}-label`}>{label}</strong><span>{selected.length ? selectionLabel(selected) : kind === 'folder' ? '尚未选择保存位置' : props.multiple ? '尚未选择文件或文件夹' : '尚未选择文件'}</span></div>
    <button type="button" className="nas-button nas-button-secondary" id={`${id}-browse`} aria-labelledby={`${id}-browse ${id}-label`} aria-haspopup="dialog" aria-controls={open ? id : undefined} disabled={disabled} onClick={() => setOpen(true)}>{selected.length ? '重新选择' : '浏览 NAS'}</button>
    {open && <PickerDialog id={id} label={label} kind={kind} multiple={!!props.multiple} initial={selected} onConfirm={(entries) => {
      if (props.multiple) props.onSelect(entries)
      else if (entries[0]) props.onSelect(entries[0].path)
    }} onClose={() => setOpen(false)} />}
  </div>
}
