'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useLocal } from '@/lib/local-storage-context'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const localCtx = useLocal()
  const { ready, isLocal, localUser, exitLocal } = localCtx || {}

  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  const isLoginPage = pathname === '/admin/login'

  useEffect(() => {
    if (!ready) return

    if (isLocal) {
      if (isLoginPage) router.push('/admin/dashboard')
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !isLoginPage) router.push('/admin/login')
      else if (session && isLoginPage) router.push('/admin/dashboard')
      if (session?.user?.email) setUserEmail(session.user.email)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session && !isLoginPage && !isLocal) router.push('/admin/login')
      if (session?.user?.email) setUserEmail(session.user.email)
    })

    return () => subscription.unsubscribe()
  }, [pathname, ready, isLocal, isLoginPage, router])

  const handleLogout = async () => {
    if (isLocal) {
      exitLocal()
      router.push('/admin/login')
    } else {
      await supabase.auth.signOut()
      router.push('/admin/login')
    }
  }

  if (loading) {
    return (
      <div style={{ background: '#0f0f0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#555', fontSize: '13px' }}>Yükleniyor...</div>
      </div>
    )
  }

  if (isLoginPage) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f0f' }}>
      <aside style={{
        width: '220px',
        minHeight: '100vh',
        background: '#141414',
        borderRight: '1px solid #1f1f1f',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1f1f1f' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>ClientSpace</span>
          {isLocal && (
            <div style={{ marginTop: '6px' }}>
              <span style={{ background: '#1d4ed8', color: '#93c5fd', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.05em' }}>
                YEREL MOD
              </span>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <NavItem href="/admin/dashboard" active={pathname === '/admin/dashboard'} icon="grid">Dashboard</NavItem>
          <NavItem href="/admin/clients" active={pathname.startsWith('/admin/clients')} icon="users">Müşteriler</NavItem>
          <NavItem href="/admin/projects" active={pathname.startsWith('/admin/projects')} icon="folder">Projeler</NavItem>
        </nav>

        <div style={{ padding: '10px 8px', borderTop: '1px solid #1f1f1f' }}>
          {isLocal ? (
            <div style={{ padding: '8px 10px', marginBottom: '2px' }}>
              <div style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {localUser?.name}
              </div>
            </div>
          ) : userEmail ? (
            <div style={{ padding: '8px 10px', fontSize: '11px', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
              {userEmail}
            </div>
          ) : null}
          <button
            onClick={handleLogout}
            onMouseEnter={e => { e.currentTarget.style.background = '#1f1f1f'; e.currentTarget.style.color = '#888' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#555' }}
            style={{ width: '100%', padding: '9px 10px', background: 'transparent', border: 'none', borderRadius: '8px', color: '#555', fontSize: '13px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: '220px', flex: 1, padding: '32px 36px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}

const ICONS = {
  grid: (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  users: (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  folder: (
    <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
}

function NavItem({ href, children, active, icon }) {
  return (
    <Link
      href={href}
      style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 10px', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: active ? 500 : 400, color: active ? '#818cf8' : '#666', background: active ? '#1e1b4b' : 'transparent' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#1f1f1f'; e.currentTarget.style.color = '#999' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#666' } }}
    >
      {ICONS[icon]}
      {children}
    </Link>
  )
}
