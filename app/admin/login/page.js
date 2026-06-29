'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasSupabaseConfig, supabase } from '@/lib/supabase'
import { useLocal } from '@/lib/local-storage-context'

export default function LoginPage() {
  const router = useRouter()
  const localCtx = useLocal()

  const [tab, setTab] = useState('supabase')

  // Supabase form
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Local mode
  const [localUsers, setLocalUsers] = useState([])
  const [showNewUser, setShowNewUser] = useState(false)
  const [newName, setNewName] = useState('')
  const [localError, setLocalError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (!hasSupabaseConfig) {
      setError('Supabase yapılandırılmamış. Yerel Mod ile devam edin.')
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email veya şifre hatalı.')
      setLoading(false)
    } else {
      router.push('/admin/dashboard')
    }
  }

  const openLocalTab = () => {
    setLocalUsers(localCtx.getUsers())
    setLocalError('')
    setTab('local')
  }

  const handleStartDemo = () => {
    setLocalError('')
    const user = localCtx.startDemoLocal()
    if (!user) {
      openLocalTab()
      setLocalError('Demo için yer açmak adına mevcut yerel kullanıcılardan birini silin.')
      return
    }
    router.push('/admin/dashboard')
  }

  const handleLocalLogin = (userId) => {
    localCtx.loginLocal(userId)
    router.push('/admin/dashboard')
  }

  const handleCreateUser = () => {
    if (!newName.trim()) return
    const user = localCtx.startLocal(newName.trim())
    if (!user) {
      setLocalError('Maksimum 2 yerel kullanıcı oluşturulabilir.')
      return
    }
    router.push('/admin/dashboard')
  }

  const handleDeleteUser = (userId, userName) => {
    if (!confirm(`"${userName}" kullanıcısını ve tüm verilerini silmek istiyor musunuz?`)) return
    localCtx.deleteLocalUser(userId)
    setLocalUsers(prev => prev.filter(u => u.id !== userId))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: '16px', padding: '40px 36px', width: '100%', maxWidth: '400px' }}>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px', letterSpacing: '-0.3px' }}>ClientSpace</h1>
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>Müşteri ve proje yönetim panelini inceleyin</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '22px' }}>
          <button
            onClick={handleStartDemo}
            style={{ width: '100%', padding: '11px', background: '#6366f1', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Demo olarak dene
          </button>
          <button
            onClick={openLocalTab}
            style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #333', borderRadius: '9px', color: '#d4d4d4', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Yerel modda kullan
          </button>
          <p style={{ color: '#555', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
            Demo örnek verilerle açılır. Yerel mod verileri sadece tarayıcınızda saklar.
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#0f0f0f', padding: '4px', borderRadius: '10px', border: '1px solid #1f1f1f' }}>
          <button
            onClick={() => setTab('supabase')}
            style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: tab === 'supabase' ? 500 : 400, background: tab === 'supabase' ? '#1a1a1a' : 'transparent', color: tab === 'supabase' ? '#e5e5e5' : '#555', transition: 'all 0.1s' }}
          >
            Giriş Yap
          </button>
          <button
            onClick={openLocalTab}
            style={{ flex: 1, padding: '7px', borderRadius: '7px', border: 'none', fontSize: '13px', cursor: 'pointer', fontWeight: tab === 'local' ? 500 : 400, background: tab === 'local' ? '#1a1a1a' : 'transparent', color: tab === 'local' ? '#e5e5e5' : '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.1s' }}
          >
            Yerel Mod
            <span style={{ background: '#1d4ed8', color: '#93c5fd', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.03em' }}>
              BETA
            </span>
          </button>
        </div>

        {tab === 'supabase' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ornek@email.com" style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Şifre</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle} />
            </div>
            {error && (
              <div style={{ background: 'rgba(252,165,165,0.08)', border: '1px solid rgba(252,165,165,0.2)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', color: '#fca5a5', fontSize: '12px' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        ) : (
          <div>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px', lineHeight: '1.6' }}>
              Veriler tarayıcınızda saklanır. İnternet bağlantısı gerekmez. Maksimum 2 kullanıcı.
            </p>

            {localUsers.length > 0 && (
              <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {localUsers.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f0f0f', border: '1px solid #262626', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '13px', color: '#e5e5e5', fontWeight: 500 }}>{u.name}</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.name)}
                        style={{ background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Sil
                      </button>
                      <button
                        onClick={() => handleLocalLogin(u.id)}
                        style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Giriş
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {localUsers.length < 2 ? (
              <button
                onClick={() => setShowNewUser(true)}
                style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed #333', borderRadius: '8px', color: '#666', fontSize: '13px', cursor: 'pointer' }}
              >
                + Yeni Kullanıcı Oluştur
              </button>
            ) : (
              <p style={{ fontSize: '12px', color: '#444', textAlign: 'center', marginTop: '8px' }}>Maksimum 2 kullanıcıya ulaşıldı.</p>
            )}

            {localError && <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '12px' }}>{localError}</div>}
          </div>
        )}
      </div>

      {/* New User Modal */}
      {showNewUser && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' }}
          onClick={e => e.target === e.currentTarget && setShowNewUser(false)}
        >
          <div style={{ background: '#141414', border: '1px solid #262626', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '360px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '20px' }}>Yeni Kullanıcı</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>İsim *</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Adınızı girin"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateUser()}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => { setShowNewUser(false); setNewName('') }} style={btnSecondary}>İptal</button>
              <button
                onClick={handleCreateUser}
                disabled={!newName.trim()}
                style={{ flex: 1, padding: '8px 16px', background: '#6366f1', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: !newName.trim() ? 'not-allowed' : 'pointer', opacity: !newName.trim() ? 0.5 : 1 }}
              >
                Oluştur ve Giriş Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  background: '#0f0f0f',
  border: '1px solid #262626',
  borderRadius: '8px',
  color: '#e5e5e5',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnSecondary = {
  background: 'transparent',
  color: '#888',
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #262626',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
}
