export const AUTH_STORAGE_KEY = 'fruitica-auth-v1'

export type UserRole = 'admin' | 'customer'

export interface AuthUser {
  id: number
  email: string
  full_name: string
  role: UserRole
}

export interface AuthSession {
  token: string
  user: AuthUser
  must_change_password?: boolean
}