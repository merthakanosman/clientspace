'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocal } from '@/lib/local-storage-context'
import { sanitizeNote, validateNote } from '@/lib/validate'

const STATUS_STYLES = {
  pending:     { background: '#854d0e', color: '#fef08a' },
  in_progress: { background: '#1e3a5f', color: '#93c5fd' },
  completed:   { background: '#14532d', color: '#86efac' },
  cancelled:   { background: '#431414', color: '#fca5a5' },
}

const STATUS_LABELS = {
  pending: 'Bekliyor',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const localCtx = useLocal()
  const { isLocal, clients: localClients, projects: localProjects, notes: localNotes } = localCtx || {}

  const [project, setProject] = useState(null)
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (isLocal) {
      const proj = (localProjects || []).find(p => p.id === id)
      const client = proj ? (localClients || []).find(c => c.id === proj.client_id) : null
      setProject(proj ? { ...proj, clients: client ? { id: client.id, name: client.name } : null } : null)
      setNotes((localNotes || []).filter(n => n.project_id === id))
      setLoading(false)
    } else if (isLocal === false) {
      fetchData()
    }
    // fetchData only reads the current route id and Supabase singleton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLocal, localProjects, localClients, localNotes])

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [{ data: proj }, { data: noteData }] = await Promise.all([
      supabase.from('projects').select('*, clients(id, name)').eq('id', id).single(),
      supabase.from('notes').select('*').eq('project_id', id).order('id', { ascending: false }),
    ])
    setProject(proj)
    setNotes(noteData || [])
    setLoading(false)
  }

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    if (isLocal) {
      localCtx.updateProject(id, { status: newStatus })
    } else {
      await supabase.from('projects').update({ status: newStatus }).eq('id', id)
      setProject(p => ({ ...p, status: newStatus }))
    }
    setUpdatingStatus(false)
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    const content = sanitizeNote(newNote)
    const err = validateNote(content)
    if (err) { setNoteError(err); return }
    setNoteError('')
    setSavingNote(true)
    if (isLocal) {
      localCtx.addNote({ project_id: id, content })
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setNoteError('Oturum bulunamadı.')
        setSavingNote(false)
        return
      }
      const { data } = await supabase.from('notes').insert({
        project_id: id,
        user_id: session.user.id,
        content,
      }).select().single()
      if (data) setNotes(n => [data, ...n])
    }
    setNewNote('')
    setSavingNote(false)
  }

  const handleDeleteNote = async (noteId) => {
    if (isLocal) {
      localCtx.deleteNote(noteId)
    } else {
      await supabase.from('notes').delete().eq('id', noteId)
      setNotes(n => n.filter(x => x.id !== noteId))
    }
  }

  if (loading) return <div style={{ color: '#555', fontSize: '13px' }}>Yükleniyor...</div>
  if (!project) return <div style={{ color: '#fca5a5', fontSize: '13px' }}>Proje bulunamadı.</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/projects" style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>← Projeler</Link>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{project.title}</h1>
            {project.clients && (
              <Link href={`/admin/clients/${project.clients.id}`} style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none' }}>
                {project.clients.name}
              </Link>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>

        {project.description && (
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>{project.description}</p>
        )}

        {(project.budget || project.deadline) && (
          <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
            {project.budget && <InfoRow label="Bütçe" value={`₺${Number(project.budget).toLocaleString('tr-TR')}`} />}
            {project.deadline && <InfoRow label="Deadline" value={new Date(project.deadline).toLocaleDateString('tr-TR')} />}
          </div>
        )}

        <div>
          <div style={{ fontSize: '11px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Durum Güncelle
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => {
              const isActive = project.status === value
              const s = STATUS_STYLES[value]
              return (
                <button
                  key={value}
                  onClick={() => !isActive && handleStatusChange(value)}
                  disabled={updatingStatus || isActive}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: `1px solid ${isActive ? 'transparent' : '#262626'}`,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: isActive ? 'default' : 'pointer',
                    background: isActive ? s.background : 'transparent',
                    color: isActive ? s.color : '#555',
                    opacity: updatingStatus ? 0.6 : 1,
                    transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = '#444' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = '#262626' }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e5e5e5', marginBottom: '16px' }}>
          Notlar <span style={{ color: '#555', fontWeight: 400 }}>({notes.length})</span>
        </h2>

        <form onSubmit={handleAddNote} style={{ marginBottom: '20px' }}>
          <textarea
            value={newNote}
            onChange={e => { setNewNote(e.target.value); setNoteError('') }}
            placeholder="Not ekle..."
            rows={3}
            maxLength={1000}
            style={{ ...inputStyle, resize: 'vertical', marginBottom: '6px', width: '100%', boxSizing: 'border-box' }}
          />
          {noteError && <div style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '8px' }}>{noteError}</div>}
          <button
            type="submit"
            disabled={savingNote || !newNote.trim()}
            style={{ ...btnPrimary, opacity: (savingNote || !newNote.trim()) ? 0.5 : 1 }}
          >
            {savingNote ? 'Ekleniyor...' : 'Not Ekle'}
          </button>
        </form>

        {notes.length === 0 ? (
          <p style={{ color: '#444', fontSize: '13px', textAlign: 'center', padding: '16px 0', margin: 0 }}>Henüz not yok.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notes.map(n => (
              <div key={n.id} style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <p style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.6', margin: 0, flex: 1, whiteSpace: 'pre-wrap' }}>
                  {n.content}
                </p>
                <button
                  onClick={() => handleDeleteNote(n.id)}
                  style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, flexShrink: 0, padding: '2px' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fca5a5'}
                  onMouseLeave={e => e.currentTarget.style.color = '#444'}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#555', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '14px', color: '#e5e5e5', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { background: '#2a2a2a', color: '#888' }
  return (
    <span style={{ ...s, padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

const card = { background: '#1a1a1a', border: '1px solid #262626', borderRadius: '12px', padding: '20px 24px', marginBottom: '14px' }
const inputStyle = { padding: '9px 12px', background: '#0f0f0f', border: '1px solid #262626', borderRadius: '8px', color: '#e5e5e5', fontSize: '13px', outline: 'none' }
const btnPrimary = { background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }
