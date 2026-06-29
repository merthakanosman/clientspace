'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocal } from '@/lib/local-storage-context'

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

export default function DashboardPage() {
  const localCtx = useLocal()
  const { isLocal, clients: localClients, projects: localProjects } = localCtx || {}

  const [stats, setStats] = useState({ totalClients: 0, activeProjects: 0, completedProjects: 0 })
  const [recentClients, setRecentClients] = useState([])
  const [recentProjects, setRecentProjects] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const [
      { count: totalClients },
      { count: activeProjects },
      { count: completedProjects },
      { data: clients },
      { data: projects },
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('clients').select('id, name, email, company').order('id', { ascending: false }).limit(5),
      supabase.from('projects').select('id, title, status, clients(name)').order('id', { ascending: false }).limit(5),
    ])
    setStats({ totalClients: totalClients || 0, activeProjects: activeProjects || 0, completedProjects: completedProjects || 0 })
    setRecentClients(clients || [])
    setRecentProjects(projects || [])
    setLoading(false)
  }

  useEffect(() => {
    if (isLocal) {
      setStats({
        totalClients: localClients.length,
        activeProjects: localProjects.filter(p => p.status === 'in_progress').length,
        completedProjects: localProjects.filter(p => p.status === 'completed').length,
      })
      setRecentClients(localClients.slice(0, 5))
      setRecentProjects(
        localProjects.slice(0, 5).map(p => {
          const c = localClients.find(cl => cl.id === p.client_id)
          return { ...p, clients: c ? { name: c.name } : null }
        })
      )
      setLoading(false)
    } else if (isLocal === false) {
      fetchData()
    }
  }, [isLocal, localClients, localProjects])

  if (loading) return <div style={{ color: '#555', fontSize: '13px' }}>Yükleniyor...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/admin/clients" style={btnSecondary}>+ Yeni Müşteri</Link>
          <Link href="/admin/projects" style={btnPrimary}>+ Yeni Proje</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        <StatCard label="Toplam Müşteri" value={stats.totalClients} accentColor="#6366f1" />
        <StatCard label="Aktif Proje" value={stats.activeProjects} accentColor="#22c55e" />
        <StatCard label="Tamamlanan Proje" value={stats.completedProjects} accentColor="#eab308" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div style={listCard}>
          <div style={listCardHeader}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5' }}>Son Müşteriler</span>
            <Link href="/admin/clients" style={linkStyle}>Tümü →</Link>
          </div>
          {recentClients.length === 0 ? (
            <p style={emptyText}>Henüz müşteri yok.</p>
          ) : recentClients.map((c, i) => (
            <Link key={c.id} href={`/admin/clients/${c.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div
                style={{ padding: '12px 20px', borderBottom: i < recentClients.length - 1 ? '1px solid #1f1f1f' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1f1f1f'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#e5e5e5' }}>{c.name}</div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{c.company || c.email}</div>
                </div>
                <span style={{ color: '#333', fontSize: '14px' }}>›</span>
              </div>
            </Link>
          ))}
        </div>

        <div style={listCard}>
          <div style={listCardHeader}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5' }}>Son Projeler</span>
            <Link href="/admin/projects" style={linkStyle}>Tümü →</Link>
          </div>
          {recentProjects.length === 0 ? (
            <p style={emptyText}>Henüz proje yok.</p>
          ) : recentProjects.map((p, i) => (
            <Link key={p.id} href={`/admin/projects/${p.id}`} style={{ textDecoration: 'none', display: 'block' }}>
              <div
                style={{ padding: '12px 20px', borderBottom: i < recentProjects.length - 1 ? '1px solid #1f1f1f' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1f1f1f'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#e5e5e5' }}>{p.title}</div>
                  <div style={{ fontSize: '12px', color: '#555', marginTop: '2px' }}>{p.clients?.name}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, accentColor }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #262626', borderLeft: `3px solid ${accentColor}`, borderRadius: '12px', padding: '20px 24px' }}>
      <div style={{ fontSize: '36px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>{label}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { background: '#2a2a2a', color: '#888' }
  return (
    <span style={{ ...s, padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap' }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

const listCard = { background: '#1a1a1a', border: '1px solid #262626', borderRadius: '12px', overflow: 'hidden' }
const listCardHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #1f1f1f' }
const emptyText = { color: '#444', fontSize: '13px', textAlign: 'center', padding: '24px 20px', margin: 0 }
const linkStyle = { fontSize: '12px', color: '#6366f1', textDecoration: 'none' }
const btnPrimary = { background: '#6366f1', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }
const btnSecondary = { background: 'transparent', color: '#888', padding: '8px 16px', borderRadius: '8px', border: '1px solid #262626', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textDecoration: 'none' }
