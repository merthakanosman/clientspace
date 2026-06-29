'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocal } from '@/lib/local-storage-context'
import { sanitizeProject, validateProject, firstError } from '@/lib/validate'

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

const FILTERS = [
  { value: 'all', label: 'Tümü' },
  { value: 'pending', label: 'Beklemede' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'completed', label: 'Tamamlandı' },
  { value: 'cancelled', label: 'İptal' },
]

export default function ProjectsPage() {
  const localCtx = useLocal()
  const { isLocal, clients: localClients, projects: localProjects } = localCtx || {}

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ title: '', description: '', client_id: '', status: 'pending', budget: '', deadline: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isLocal) {
      const withClient = (localProjects || []).map(p => {
        const c = (localClients || []).find(cl => cl.id === p.client_id)
        return { ...p, clients: c ? { name: c.name } : null }
      })
      setProjects(withClient)
      setClients((localClients || []).map(c => ({ id: c.id, name: c.name })))
      setLoading(false)
    } else if (isLocal === false) {
      fetchProjects()
      fetchClients()
    }
  }, [isLocal, localClients, localProjects])

  const [formError, setFormError] = useState('')

  async function fetchProjects() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('projects').select('id, title, status, budget, deadline, clients(name)').order('id', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('id, name').order('name')
    setClients(data || [])
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const sanitized = sanitizeProject(form)
    const errs = validateProject(sanitized)
    const errMsg = firstError(errs)
    if (errMsg) { setFormError(errMsg); return }
    setFormError('')
    setSaving(true)
    if (isLocal) {
      localCtx.addProject({
        ...sanitized,
        budget: sanitized.budget ? parseFloat(sanitized.budget) : null,
        deadline: sanitized.deadline || null,
      })
      setForm({ title: '', description: '', client_id: '', status: 'pending', budget: '', deadline: '' })
      setShowModal(false)
      setSaving(false)
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setFormError('Oturum bulunamadı.')
        setSaving(false)
        return
      }
      await supabase.from('projects').insert({
        ...sanitized,
        user_id: session.user.id,
        budget: sanitized.budget ? parseFloat(sanitized.budget) : null,
        deadline: sanitized.deadline || null,
      })
      setForm({ title: '', description: '', client_id: '', status: 'pending', budget: '', deadline: '' })
      setShowModal(false)
      setSaving(false)
      fetchProjects()
    }
  }

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Projeler</h1>
        <button onClick={() => setShowModal(true)} style={btnPrimary}>+ Proje Ekle</button>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#141414', padding: '4px', borderRadius: '10px', border: '1px solid #1f1f1f', width: 'fit-content' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: filter === f.value ? 500 : 400, background: filter === f.value ? '#1a1a1a' : 'transparent', color: filter === f.value ? '#e5e5e5' : '#555', transition: 'all 0.1s' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#555', fontSize: '13px' }}>Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: '12px', padding: '60px', textAlign: 'center', color: '#444', fontSize: '13px' }}>
          {filter === 'all' ? 'Henüz proje eklenmemiş.' : 'Bu durumda proje yok.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(p => (
            <Link key={p.id} href={`/admin/projects/${p.id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: '12px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#262626'}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#e5e5e5', marginBottom: '5px' }}>{p.title}</div>
                  <div style={{ fontSize: '12px', color: '#555', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {p.clients?.name && <span>{p.clients.name}</span>}
                    {p.budget && <span>₺{Number(p.budget).toLocaleString('tr-TR')}</span>}
                    {p.deadline && <span>{new Date(p.deadline).toLocaleDateString('tr-TR')}</span>}
                  </div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setFormError('') } }}
        >
          <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Yeni Proje</h2>
              <button onClick={() => { setShowModal(false); setFormError('') }} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <Field label="Başlık *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Müşteri *</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required style={{ ...inputStyle, appearance: 'none' }}>
                  <option value="">Müşteri seçin...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
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
              {formError && <div style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '12px' }}>{formError}</div>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowModal(false); setFormError('') }} style={btnSecondary}>İptal</button>
                <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1, flex: 1 }}>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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

const inputStyle = { width: '100%', padding: '9px 12px', background: '#0f0f0f', border: '1px solid #262626', borderRadius: '8px', color: '#e5e5e5', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btnPrimary = { background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }
const btnSecondary = { background: 'transparent', color: '#888', padding: '8px 16px', borderRadius: '8px', border: '1px solid #262626', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }
