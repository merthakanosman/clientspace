'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocal } from '@/lib/local-storage-context'
import { sanitizeClient, validateClient, sanitizeProject, validateProject, firstError } from '@/lib/validate'

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

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const localCtx = useLocal()
  const { isLocal, clients: localClients, projects: localProjects } = localCtx || {}

  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', status: 'pending', budget: '', deadline: '' })
  const [saving, setSaving] = useState(false)

  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', company: '', phone: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [projectError, setProjectError] = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isLocal) {
      const c = (localClients || []).find(cl => cl.id === id)
      const p = (localProjects || []).filter(pr => pr.client_id === id)
      setClient(c || null)
      setProjects(p)
      setLoading(false)
    } else if (isLocal === false) {
      fetchData()
    }
    // fetchData only reads the current route id and Supabase singleton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLocal, localClients, localProjects])

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [{ data: clientData }, { data: projectsData }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('projects').select('*').eq('client_id', id).order('id', { ascending: false }),
    ])
    setClient(clientData)
    setProjects(projectsData || [])
    setLoading(false)
  }

  const startEdit = () => {
    setEditForm({ name: client.name, email: client.email, company: client.company || '', phone: client.phone || '' })
    setEditError('')
    setEditMode(true)
  }

  const handleUpdateClient = async () => {
    const sanitized = sanitizeClient(editForm)
    const errs = validateClient(sanitized)
    const errMsg = firstError(errs)
    if (errMsg) { setEditError(errMsg); return }
    setEditSaving(true)
    setEditError('')
    if (isLocal) {
      localCtx.updateClient(id, sanitized)
    } else {
      const { data } = await supabase.from('clients').update(sanitized).eq('id', id).select().single()
      if (data) setClient(data)
    }
    setEditMode(false)
    setEditSaving(false)
  }

  const handleAddProject = async (e) => {
    e.preventDefault()
    const sanitized = sanitizeProject(form)
    const errs = validateProject(sanitized)
    const errMsg = firstError(errs)
    if (errMsg) { setProjectError(errMsg); return }
    setProjectError('')
    setSaving(true)
    if (isLocal) {
      localCtx.addProject({
        ...sanitized,
        client_id: id,
        budget: sanitized.budget ? parseFloat(sanitized.budget) : null,
        deadline: sanitized.deadline || null,
      })
      setForm({ title: '', description: '', status: 'pending', budget: '', deadline: '' })
      setShowModal(false)
      setSaving(false)
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setProjectError('Oturum bulunamadı.')
        setSaving(false)
        return
      }
      await supabase.from('projects').insert({
        ...sanitized,
        client_id: id,
        user_id: session.user.id,
        budget: sanitized.budget ? parseFloat(sanitized.budget) : null,
        deadline: sanitized.deadline || null,
      })
      setForm({ title: '', description: '', status: 'pending', budget: '', deadline: '' })
      setShowModal(false)
      setSaving(false)
      fetchData()
    }
  }

  const handleDeleteProject = async (e, projectId) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLocal) {
      localCtx.deleteProject(projectId)
    } else {
      await supabase.from('projects').delete().eq('id', projectId)
      setProjects(prev => prev.filter(p => p.id !== projectId))
    }
  }

  const handleDeleteClient = async () => {
    setDeleting(true)
    if (isLocal) {
      localCtx.deleteClient(id)
      router.push('/admin/clients')
    } else {
      await supabase.from('projects').delete().eq('client_id', id)
      await supabase.from('clients').delete().eq('id', id)
      router.push('/admin/clients')
    }
  }

  if (loading) return <div style={{ color: '#555', fontSize: '13px' }}>Yükleniyor...</div>
  if (!client) return <div style={{ color: '#fca5a5', fontSize: '13px' }}>Müşteri bulunamadı.</div>

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/clients" style={{ fontSize: '12px', color: '#555', textDecoration: 'none' }}>← Müşteriler</Link>
      </div>

      {/* Client Card */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          {editMode ? (
            <input
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              style={{ ...inputStyle, fontSize: '16px', fontWeight: 700, flex: 1, marginRight: '12px' }}
            />
          ) : (
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>{client.name}</h1>
          )}
          {!editMode && (
            <button onClick={startEdit} style={{ ...btnPrimary, fontSize: '12px', padding: '6px 14px', flexShrink: 0 }}>
              Düzenle
            </button>
          )}
        </div>

        {editMode ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={labelStyle}>Email</div>
                <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Şirket</div>
                <input value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <div style={labelStyle}>Telefon</div>
                <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            {editError && <div style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '10px' }}>{editError}</div>}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setEditMode(false); setEditError('') }} style={btnSecondary}>İptal</button>
              <button onClick={handleUpdateClient} disabled={editSaving} style={{ ...btnPrimary, opacity: editSaving ? 0.7 : 1 }}>
                {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <InfoRow label="Email" value={client.email} />
            <InfoRow label="Şirket" value={client.company || '—'} />
            <InfoRow label="Telefon" value={client.phone || '—'} />
          </div>
        )}
      </div>

      {/* Delete Client Button */}
      {!editMode && (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ background: 'transparent', color: '#ef4444', padding: '7px 16px', borderRadius: '8px', border: '1px solid #ef4444', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
          >
            Müşteriyi Sil
          </button>
        </div>
      )}

      {/* Projects */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#e5e5e5' }}>
          Projeler <span style={{ color: '#555', fontWeight: 400 }}>({projects.length})</span>
        </h2>
        <button onClick={() => setShowModal(true)} style={btnPrimary}>+ Proje Ekle</button>
      </div>

      {projects.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px', color: '#444', fontSize: '13px' }}>Bu müşteriye ait proje yok.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {projects.map(p => (
            <Link key={p.id} href={`/admin/projects/${p.id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#262626'}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#e5e5e5', marginBottom: '4px' }}>{p.title}</div>
                  <div style={{ fontSize: '12px', color: '#555', display: 'flex', gap: '10px' }}>
                    {p.deadline && <span>{new Date(p.deadline).toLocaleDateString('tr-TR')}</span>}
                    {p.budget && <span>₺{Number(p.budget).toLocaleString('tr-TR')}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <StatusBadge status={p.status} />
                  <button
                    onClick={e => handleDeleteProject(e, p.id)}
                    style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setProjectError('') } }}
        >
          <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Yeni Proje</h2>
              <button onClick={() => { setShowModal(false); setProjectError('') }} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleAddProject}>
              <Field label="Başlık *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Durum</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <Field label="Bütçe (₺)" type="number" value={form.budget} onChange={v => setForm(f => ({ ...f, budget: v }))} />
              <Field label="Deadline" type="date" value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} />
              {projectError && <div style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '12px' }}>{projectError}</div>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowModal(false); setProjectError('') }} style={btnSecondary}>İptal</button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, flex: 1 }}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Client Confirm Modal */}
      {showDeleteModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          onClick={e => e.target === e.currentTarget && !deleting && setShowDeleteModal(false)}
        >
          <div style={{ background: '#141414', border: '1px solid #3f1a1a', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '420px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>Müşteriyi sil</h2>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>
              <strong style={{ color: '#e5e5e5' }}>{client.name}</strong> adlı müşteriyi silmek istediğinizden emin misiniz?
            </p>
            <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '24px' }}>
              Bu işlem müşteriyi ve tüm projelerini ({projects.length} proje) kalıcı olarak siler, geri alınamaz.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} style={{ ...btnSecondary, flex: 1 }}>İptal</button>
              <button
                onClick={handleDeleteClient}
                disabled={deleting}
                style={{ background: '#ef4444', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer', flex: 1, opacity: deleting ? 0.7 : 1 }}
              >
                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#e5e5e5' }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { background: '#2a2a2a', color: '#888' }
  return (
    <span style={{ ...s, padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} style={inputStyle} />
    </div>
  )
}

const card = { background: '#1a1a1a', border: '1px solid #262626', borderRadius: '12px', padding: '20px 24px', marginBottom: '12px', transition: 'border-color 0.1s' }
const labelStyle = { fontSize: '11px', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }
const inputStyle = { width: '100%', padding: '9px 12px', background: '#0f0f0f', border: '1px solid #262626', borderRadius: '8px', color: '#e5e5e5', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btnPrimary = { background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }
const btnSecondary = { background: 'transparent', color: '#888', padding: '8px 16px', borderRadius: '8px', border: '1px solid #262626', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }
