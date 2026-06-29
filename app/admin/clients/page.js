'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocal } from '@/lib/local-storage-context'
import { sanitizeClient, validateClient, firstError } from '@/lib/validate'

export default function ClientsPage() {
  const router = useRouter()
  const localCtx = useLocal()
  const { isLocal, clients: localClients, projects: localProjects } = localCtx || {}

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isLocal) {
      const withCount = (localClients || []).map(c => ({
        ...c,
        projects: [{ count: (localProjects || []).filter(p => p.client_id === c.id).length }],
      }))
      setClients(withCount)
      setLoading(false)
    } else if (isLocal === false) {
      fetchClients()
    }
  }, [isLocal, localClients, localProjects])

  async function fetchClients() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('clients').select('id, name, email, company, phone, projects(count)').order('id', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const sanitized = sanitizeClient(form)
    const errs = validateClient(sanitized)
    const errMsg = firstError(errs)
    if (errMsg) { setError(errMsg); return }
    setSaving(true)
    setError('')
    if (isLocal) {
      localCtx.addClient(sanitized)
      setForm({ name: '', email: '', company: '', phone: '' })
      setShowModal(false)
      setSaving(false)
    } else {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Oturum bulunamadı.')
        setSaving(false)
        return
      }
      const { error } = await supabase.from('clients').insert({
        ...sanitized,
        user_id: session.user.id,
      })
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
      setForm({ name: '', email: '', company: '', phone: '' })
      setShowModal(false)
      setSaving(false)
      fetchClients()
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setForm({ name: '', email: '', company: '', phone: '' })
    setError('')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Müşteriler</h1>
        <button onClick={() => setShowModal(true)} style={btnPrimary}>+ Müşteri Ekle</button>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#555', fontSize: '13px' }}>Yükleniyor...</div>
        ) : clients.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#444', fontSize: '13px' }}>Henüz müşteri eklenmemiş.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1f1f1f' }}>
                {['Ad', 'Email', 'Şirket', 'Telefon', 'Proje Sayısı', 'İşlem'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: i < clients.length - 1 ? '1px solid #1f1f1f' : 'none', cursor: 'pointer' }}
                  onClick={() => router.push(`/admin/clients/${c.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = '#1f1f1f'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ ...td, color: '#e5e5e5', fontWeight: 500 }}>{c.name}</td>
                  <td style={td}>{c.email}</td>
                  <td style={td}>{c.company || '—'}</td>
                  <td style={td}>{c.phone || '—'}</td>
                  <td style={td}>{c.projects?.[0]?.count ?? 0}</td>
                  <td style={td} onClick={e => e.stopPropagation()}>
                    <Link href={`/admin/clients/${c.id}`} style={{ fontSize: '12px', color: '#6366f1', textDecoration: 'none', padding: '5px 10px', border: '1px solid #312e81', borderRadius: '6px', background: 'transparent', whiteSpace: 'nowrap' }}>
                      Görüntüle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          onClick={e => e.target === e.currentTarget && closeModal()}
        >
          <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Yeni Müşteri</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <Field label="Ad *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
              <Field label="Email *" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
              <Field label="Şirket" value={form.company} onChange={v => setForm(f => ({ ...f, company: v }))} />
              <Field label="Telefon" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} />
              {error && <div style={{ color: '#fca5a5', fontSize: '12px', marginBottom: '12px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button type="button" onClick={closeModal} style={btnSecondary}>İptal</button>
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

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required} style={inputStyle} />
    </div>
  )
}

const th = { padding: '11px 16px', textAlign: 'left', fontSize: '11px', color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }
const td = { padding: '13px 16px', fontSize: '13px', color: '#666' }

const inputStyle = { width: '100%', padding: '9px 12px', background: '#0f0f0f', border: '1px solid #262626', borderRadius: '8px', color: '#e5e5e5', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btnPrimary = { background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }
const btnSecondary = { background: 'transparent', color: '#888', padding: '8px 16px', borderRadius: '8px', border: '1px solid #262626', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }
