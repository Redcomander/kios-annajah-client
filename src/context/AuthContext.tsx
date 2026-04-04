import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
    id: number;
    username: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Force fresh login on every app open; keep session only while app stays open.
        localStorage.removeItem('token')
        localStorage.removeItem('user')

        const savedToken = sessionStorage.getItem('token')
        const savedUser = sessionStorage.getItem('user')
        
        if (savedToken && savedUser) {
            setToken(savedToken)
            setUser(JSON.parse(savedUser))
        }
        setIsLoading(false)
    }, [])

    useEffect(() => {
        const clearAuthOnClose = () => {
            sessionStorage.removeItem('token')
            sessionStorage.removeItem('user')
            localStorage.removeItem('token')
            localStorage.removeItem('user')
        }

        window.addEventListener('beforeunload', clearAuthOnClose)
        return () => window.removeEventListener('beforeunload', clearAuthOnClose)
    }, [])

    const login = (newToken: string, newUser: User) => {
        setToken(newToken)
        setUser(newUser)
        sessionStorage.setItem('token', newToken)
        sessionStorage.setItem('user', JSON.stringify(newUser))
    }

    const logout = () => {
        setToken(null)
        setUser(null)
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('user')
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
