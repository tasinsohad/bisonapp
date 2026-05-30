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
        setLoading(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()
        // Do not set loading false here to keep button disabled during redirect
      }
    } catch (err: any) {
      setError(err.message)
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
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden group/bg">
        
        {/* INTERACTIVE BACKGROUND PARALLAX EFFECTS */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Animated Background Mesh */}
          <div className="absolute inset-0 opacity-10 mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #94a3b8 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          
          {/* Main Orbs */}
          <div 
            className="absolute top-[10%] left-[20%] w-[450px] h-[450px] bg-blue-400 rounded-full filter blur-[120px] opacity-30 animate-pulse transition-transform duration-300 ease-out mix-blend-multiply" 
            style={{ 
              animationDuration: '8s',
              transform: `translate(${mousePos.x * -100}px, ${mousePos.y * -100}px) scale(${1 + Math.abs(mousePos.x * 0.1)})`
            }}
          ></div>
          <div 
            className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-indigo-400 rounded-full filter blur-[100px] opacity-20 animate-pulse transition-transform duration-300 ease-out mix-blend-multiply" 
            style={{ 
              animationDuration: '6s', 
              animationDelay: '1s',
              transform: `translate(${mousePos.x * 120}px, ${mousePos.y * 120}px) scale(${1 + Math.abs(mousePos.y * 0.1)})`
            }}
          ></div>

          {/* Mouse Follower Glow (Direct Interactive Element) */}
          <div 
            className="absolute w-[300px] h-[300px] bg-blue-500/20 rounded-full filter blur-[80px] transition-transform duration-75 ease-out pointer-events-none opacity-0 group-hover/bg:opacity-100 mix-blend-multiply"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${mousePos.x * 400}px), calc(-50% + ${mousePos.y * 400}px))`
            }}
          ></div>
        </div>

        {/* FROSTED GLASS LOGIN CARD */}
        <div 
          className="w-full max-w-md p-8 md:p-10 rounded-[32px] bg-white/60 border border-white/80 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] backdrop-blur-2xl relative z-10 animate-fade-in flex flex-col items-center hover:shadow-[0_40px_100px_-16px_rgba(59,130,246,0.15)] hover:bg-white/70 transition-all duration-300 ease-out group/card"
          style={{ transform: `perspective(1000px) rotateX(${mousePos.y * -8}deg) rotateY(${mousePos.x * 8}deg) scale(1.02)` }}
        >
          {/* Card internal interactive reflection */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-full transition-all duration-1000 pointer-events-none rounded-[32px]"></div>

          <div className="text-center w-full mb-8 relative z-10" style={{ transform: 'translateZ(30px)' }}>
            <h2 className="text-3xl font-bold text-slate-900 mb-1.5 transition-colors">{isSignUp ? 'Join Us!' : 'Welcome Back'}</h2>
            <p className="text-slate-500 text-sm font-medium">{isSignUp ? 'Create a new account to get started.' : 'We are really happy to see you again!'}</p>
          </div>

          {error && (
            <div className="w-full mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm text-center font-medium animate-shake relative z-10">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="w-full space-y-5 relative z-10" style={{ transform: 'translateZ(40px)' }}>
            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors z-20">
                  <Mail className="h-5 w-5" />
                </div>
                {/* Input Glow Effect */}
                <div className="absolute inset-[-2px] bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300"></div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-white/60 rounded-2xl bg-white/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white/90 transition-all text-sm font-medium backdrop-blur-md relative z-10 shadow-inner"
                  placeholder="Email"
                />
              </div>
            </div>

            <div className="group">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors z-20">
                  <Lock className="h-5 w-5" />
                </div>
                {/* Input Glow Effect */}
                <div className="absolute inset-[-2px] bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300"></div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3.5 border border-white/60 rounded-2xl bg-white/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white/90 transition-all text-sm font-medium backdrop-blur-md relative z-10 shadow-inner"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors z-20"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full py-4 px-4 border border-transparent rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] shadow-[0_8px_20px_rgba(37,99,235,0.2)] hover:shadow-[0_12px_30px_rgba(37,99,235,0.4)] active:scale-95"
            >
              {/* Button Hover Sweep Effect */}
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign in')}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center relative z-10" style={{ transform: 'translateZ(20px)' }}>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-semibold px-4 py-2 hover:bg-slate-100 rounded-lg"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
