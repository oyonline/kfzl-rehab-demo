import { useEffect, useRef, useState } from 'react'
import { toISODate } from '../data/seed'
import { IconCheck } from './Icons'

/**
 * 模拟上传（v0.2 §4.2 已裁决：本轮不做真上传）。
 *
 * 只取文件名与大小这类元数据，**不读取文件内容、不落盘、不上传任何数据**。
 * 未选择文件时用一个默认名，保证现场即使没有备好素材也能演示这一步。
 */
export function UploadPanel({
  onDone,
  onCancel,
}: {
  onDone: (filename: string, sizeLabel: string) => void
  onCancel: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<{ name: string; size: string } | null>(null)
  const [pct, setPct] = useState<number | null>(null)

  const fallback = { name: `训练记录_${toISODate(new Date()).replace(/-/g, '')}.mp4`, size: '18.4 MB' }
  const picked = file ?? fallback

  useEffect(() => {
    if (pct === null) return
    if (pct >= 100) {
      const t = window.setTimeout(() => onDone(picked.name, picked.size), 420)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setPct((p) => Math.min(100, (p ?? 0) + 7 + Math.random() * 11)), 90)
    return () => window.clearTimeout(t)
  }, [pct, picked.name, picked.size, onDone])

  return (
    <div className="upload">
      <div className="upload-t">回传训练视频</div>

      <div className="upload-file">
        <span className="upload-ico">MP4</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <div className="upload-name">{picked.name}</div>
          <div className="upload-size num">{picked.size}</div>
        </span>
        {pct === null && (
          <button className="btn-quiet" onClick={() => inputRef.current?.click()}>选择文件</button>
        )}
        {pct !== null && pct >= 100 && <span className="chip chip-ok"><IconCheck size={10} /> 完成</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setFile({ name: f.name, size: `${(f.size / 1024 / 1024).toFixed(1)} MB` })
        }}
      />

      {pct !== null && (
        <div className="upload-bar"><div className="upload-fill" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
        {pct === null ? (
          <>
            <button className="btn-quiet" onClick={onCancel}>取消</button>
            <button className="btn" onClick={() => setPct(4)}>开始上传</button>
          </>
        ) : (
          <span className="card-note num">{Math.min(100, Math.round(pct))}%</span>
        )}
      </div>
    </div>
  )
}
