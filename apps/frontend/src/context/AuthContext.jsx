import { useCallback, useEffect, useState } from 'react'
import { authApi } from '../services/api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const hydrateUser = useCallback(async () => {
    const me = await authApi.me()
    setUser({ id: me.id, role: me.role })
  }, [])

  const checkAuth = useCallback(async () => {
    try {
      await authApi.refresh()
      await hydrateUser()
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [hydrateUser])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = useCallback(
    async (email, password) => {
      await authApi.login(email, password)
      await hydrateUser()
    },
    [hydrateUser]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
