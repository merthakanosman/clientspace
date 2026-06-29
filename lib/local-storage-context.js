'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const LocalStorageContext = createContext(null)

const genId = () => crypto.randomUUID()

const demoClients = [
  {
    id: 'demo-client-1',
    name: 'Ayşe Yılmaz',
    email: 'ayse@studiovera.com',
    company: 'Studio Vera',
    phone: '+90 555 010 2030',
  },
  {
    id: 'demo-client-2',
    name: 'Mehmet Kaya',
    email: 'mehmet@northline.co',
    company: 'Northline Co.',
    phone: '+90 555 018 4421',
  },
]

const demoProjects = [
  {
    id: 'demo-project-1',
    client_id: 'demo-client-1',
    title: 'Landing page yenileme',
    status: 'in_progress',
    budget: 45000,
    deadline: '2026-07-18',
  },
  {
    id: 'demo-project-2',
    client_id: 'demo-client-2',
    title: 'CRM dashboard tasarımı',
    status: 'completed',
    budget: 72000,
    deadline: '2026-06-12',
  },
]

const demoNotes = [
  {
    id: 'demo-note-1',
    project_id: 'demo-project-1',
    content: 'Hero bölümü, fiyat teklifi formu ve mobil menü öncelikli.',
  },
  {
    id: 'demo-note-2',
    project_id: 'demo-project-2',
    content: 'Final teslim yapıldı. Geri bildirimler ikinci faza alınacak.',
  },
]

export function LocalStorageProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [isLocal, setIsLocal] = useState(false)
  const [localUser, setLocalUser] = useState(null)
  const [localUsers, setLocalUsers] = useState([])
  const [clients, setClients] = useState([])
  const [projects, setProjects] = useState([])
  const [notes, setNotes] = useState([])

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cs_users') || '[]')
    setLocalUsers(stored)
    const activeId = localStorage.getItem('cs_active_user')
    if (activeId) {
      const user = stored.find(u => u.id === activeId)
      if (user) {
        setIsLocal(true)
        setLocalUser(user)
        setClients(JSON.parse(localStorage.getItem(`cs_clients_${activeId}`) || '[]'))
        setProjects(JSON.parse(localStorage.getItem(`cs_projects_${activeId}`) || '[]'))
        setNotes(JSON.parse(localStorage.getItem(`cs_notes_${activeId}`) || '[]'))
      }
    }
    setReady(true)
  }, [])

  const persist = (key, data) => localStorage.setItem(key, JSON.stringify(data))

  const refreshLocalUsers = () => {
    const u = JSON.parse(localStorage.getItem('cs_users') || '[]')
    setLocalUsers(u)
    return u
  }

  const getUsers = () => JSON.parse(localStorage.getItem('cs_users') || '[]')

  const startLocal = (name) => {
    const users = getUsers()
    if (users.length >= 2) return null
    const user = { id: genId(), name }
    const next = [...users, user]
    persist('cs_users', next)
    setLocalUsers(next)
    localStorage.setItem('cs_active_user', user.id)
    persist(`cs_clients_${user.id}`, [])
    persist(`cs_projects_${user.id}`, [])
    persist(`cs_notes_${user.id}`, [])
    setLocalUser(user)
    setIsLocal(true)
    setClients([])
    setProjects([])
    setNotes([])
    return user
  }

  const startDemoLocal = () => {
    const users = getUsers()
    const existingDemo = users.find(u => u.isDemo)
    const user = existingDemo || { id: 'demo-user', name: 'Demo Kullanıcı', isDemo: true }
    if (!existingDemo && users.length >= 2) return null
    const next = existingDemo ? users : [user, ...users]
    persist('cs_users', next)
    setLocalUsers(next)
    localStorage.setItem('cs_active_user', user.id)
    persist(`cs_clients_${user.id}`, demoClients)
    persist(`cs_projects_${user.id}`, demoProjects)
    persist(`cs_notes_${user.id}`, demoNotes)
    setLocalUser(user)
    setIsLocal(true)
    setClients(demoClients)
    setProjects(demoProjects)
    setNotes(demoNotes)
    return user
  }

  const loginLocal = (userId) => {
    const users = getUsers()
    const user = users.find(u => u.id === userId)
    if (!user) return
    localStorage.setItem('cs_active_user', userId)
    setLocalUser(user)
    setIsLocal(true)
    setClients(JSON.parse(localStorage.getItem(`cs_clients_${userId}`) || '[]'))
    setProjects(JSON.parse(localStorage.getItem(`cs_projects_${userId}`) || '[]'))
    setNotes(JSON.parse(localStorage.getItem(`cs_notes_${userId}`) || '[]'))
  }

  const exitLocal = () => {
    localStorage.removeItem('cs_active_user')
    setIsLocal(false)
    setLocalUser(null)
    setClients([])
    setProjects([])
    setNotes([])
  }

  const deleteLocalUser = (userId) => {
    const users = getUsers()
    const next = users.filter(u => u.id !== userId)
    persist('cs_users', next)
    setLocalUsers(next)
    localStorage.removeItem(`cs_clients_${userId}`)
    localStorage.removeItem(`cs_projects_${userId}`)
    localStorage.removeItem(`cs_notes_${userId}`)
    if (localUser?.id === userId) exitLocal()
  }

  // ─── Client CRUD ─────────────────────────────────────────────
  const addClient = (data) => {
    const client = { ...data, id: genId() }
    const next = [client, ...clients]
    setClients(next)
    persist(`cs_clients_${localUser.id}`, next)
    return client
  }

  const updateClient = (id, data) => {
    const next = clients.map(c => c.id === id ? { ...c, ...data } : c)
    setClients(next)
    persist(`cs_clients_${localUser.id}`, next)
    return next.find(c => c.id === id)
  }

  const deleteClient = (id) => {
    const removedProjectIds = projects.filter(p => p.client_id === id).map(p => p.id)
    const nextClients = clients.filter(c => c.id !== id)
    const nextProjects = projects.filter(p => p.client_id !== id)
    const nextNotes = notes.filter(n => !removedProjectIds.includes(n.project_id))
    setClients(nextClients)
    setProjects(nextProjects)
    setNotes(nextNotes)
    persist(`cs_clients_${localUser.id}`, nextClients)
    persist(`cs_projects_${localUser.id}`, nextProjects)
    persist(`cs_notes_${localUser.id}`, nextNotes)
  }

  // ─── Project CRUD ─────────────────────────────────────────────
  const addProject = (data) => {
    const project = { ...data, id: genId() }
    const next = [project, ...projects]
    setProjects(next)
    persist(`cs_projects_${localUser.id}`, next)
    return project
  }

  const updateProject = (id, data) => {
    const next = projects.map(p => p.id === id ? { ...p, ...data } : p)
    setProjects(next)
    persist(`cs_projects_${localUser.id}`, next)
    return next.find(p => p.id === id)
  }

  const deleteProject = (id) => {
    const nextProjects = projects.filter(p => p.id !== id)
    const nextNotes = notes.filter(n => n.project_id !== id)
    setProjects(nextProjects)
    setNotes(nextNotes)
    persist(`cs_projects_${localUser.id}`, nextProjects)
    persist(`cs_notes_${localUser.id}`, nextNotes)
  }

  // ─── Note CRUD ─────────────────────────────────────────────
  const addNote = (data) => {
    const note = { ...data, id: genId() }
    const next = [note, ...notes]
    setNotes(next)
    persist(`cs_notes_${localUser.id}`, next)
    return note
  }

  const deleteNote = (id) => {
    const next = notes.filter(n => n.id !== id)
    setNotes(next)
    persist(`cs_notes_${localUser.id}`, next)
  }

  return (
    <LocalStorageContext.Provider value={{
      ready, isLocal, localUser, localUsers,
      clients, projects, notes,
      getUsers, refreshLocalUsers,
      startLocal, startDemoLocal, loginLocal, exitLocal, deleteLocalUser,
      addClient, updateClient, deleteClient,
      addProject, updateProject, deleteProject,
      addNote, deleteNote,
    }}>
      {children}
    </LocalStorageContext.Provider>
  )
}

export const useLocal = () => useContext(LocalStorageContext)
