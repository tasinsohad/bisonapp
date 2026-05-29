'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse coordinates between -1 and 1
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      
      // Use requestAnimationFrame for smoother performance
      requestAnimationFrame(() => {
        setMousePos({ x, y })
      })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setError('Check your email for the confirmation link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#ffffff] font-sans antialiased overflow-hidden">
      {/* LEFT COLUMN: Clean Minimalist Brand Accent */}
      <div className="w-full md:w-1/2 flex flex-col justify-between p-8 md:p-16 bg-white z-10 relative">
        <div className="flex items-center gap-2 transform transition-transform duration-700 hover:scale-105 origin-left">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            L
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">LeadPilot</span>
        </div>

        <div className="my-auto py-12 md:py-0 max-w-xl">
          <div className="inline-block border-b-4 border-blue-600 pb-2 mb-6 transform transition-all duration-1000 ease-out translate-y-0 opacity-100 animate-fade-in" style={{ animationDuration: '0.5s' }}>
            <span className="text-4xl md:text-5xl font-black tracking-tight text-slate-950">AI</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.1] mb-6 animate-fade-in" style={{ animationDuration: '0.8s' }}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Sales Automation</span>
            <br />
            that Mixes Creativity with Convenience
          </h1>
          
          <p className="text-lg text-slate-500 font-medium max-w-md leading-relaxed animate-fade-in" style={{ animationDuration: '1.1s' }}>
            Supercharge your warm booking pipeline with multi-provider AI agents, dynamic enrichment, and automated workflows.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-medium animate-fade-in" style={{ animationDuration: '1.5s' }}>
          &copy; {new Date().getFullYear()} LeadPilot Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT COLUMN: Modern Soft Gradient with Floating Interactive Orbs */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 relative overflow-hidden">
        
        {/* INTERACTIVE BACKGROUND PARALLAX EFFECTS */}
        <div className="absolute inset-0 pointer-events-none">
          <div 
            className="absolute top-[10%] left-[20%] w-[450px] h-[450px] bg-blue-300 rounded-full filter blur-[100px] opacity-40 animate-pulse transition-transform duration-75 ease-out" 
            style={{ 
              animationDuration: '8s',
              transform: `translate(${mousePos.x * -100}px, ${mousePos.y * -100}px)`
            }}
          ></div>
          <div 
            className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-indigo-300 rounded-full filter blur-[80px] opacity-30 animate-pulse transition-transform duration-75 ease-out" 
            style={{ 
              animationDuration: '6s', 
              animationDelay: '1s',
              transform: `translate(${mousePos.x * 120}px, ${mousePos.y * 120}px)`
            }}
          ></div>
          <div 
            className="absolute top-[40%] right-[30%] w-[180px] h-[180px] bg-white rounded-full filter blur-[40px] opacity-60 transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${mousePos.x * -160}px, ${mousePos.y * -160}px)`
            }}
          ></div>
        </div>

        {/* FROSTED GLASS LOGIN CARD */}
        <div 
          className="w-full max-w-md p-8 md:p-10 rounded-[32px] bg-white/40 border border-white/45 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] backdrop-blur-2xl relative z-10 animate-fade-in flex flex-col items-center hover:shadow-[0_40px_80px_-16px_rgba(0,0,0,0.1)] transition-transform duration-75 ease-out"
          style={{ transform: `perspective(1000px) rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8}deg)` }}
        >
          <div className="text-center w-full mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-1.5 transition-colors">{isSignUp ? 'Join Us!' : 'Hello!'}</h2>
            <p className="text-slate-500 text-sm font-medium">{isSignUp ? 'Create a new account to get started.' : 'We are really happy to see you again!'}</p>
          </div>

          {error && (
            <div className="w-full mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm text-center font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="w-full space-y-5">
            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-white/60 rounded-2xl bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner text-sm font-medium backdrop-blur-md hover:bg-white/70"
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3.5 border border-white/60 rounded-2xl bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner text-sm font-medium backdrop-blur-md hover:bg-white/70"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 border border-transparent rounded-2xl shadow-[0_4px_12px_rgba(59,130,246,0.25)] text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(59,130,246,0.35)] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign in')}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-semibold px-4 py-2 hover:bg-slate-100/50 rounded-lg"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
