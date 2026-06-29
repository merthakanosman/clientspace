'use client'
import { LocalStorageProvider } from '@/lib/local-storage-context'

export default function Providers({ children }) {
  return (
    <LocalStorageProvider>
      {children}
    </LocalStorageProvider>
  )
}
