'use client'

import { useState } from 'react'
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
  
  const router = useRouter()
  const supabase = createClient()

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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            L
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">LeadPilot</span>
        </div>

        <div className="my-auto py-12 md:py-0 max-w-xl">
          <div className="inline-block border-b-4 border-blue-600 pb-2 mb-6">
            <span className="text-4xl md:text-5xl font-black tracking-tight text-slate-950">AI</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.1] mb-6">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Sales Automation</span>
            <br />
            that Mixes Creativity with Convenience
          </h1>
          
          <p className="text-lg text-slate-500 font-medium max-w-md leading-relaxed">
            Supercharge your warm booking pipeline with multi-provider AI agents, dynamic enrichment, and automated workflows.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} LeadPilot Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT COLUMN: Modern Soft Gradient with Floating Frosted Glass Card */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 relative">
        {/* Soft Background Blur Circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[450px] h-[450px] bg-blue-300 rounded-full filter blur-[100px] opacity-40 animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-indigo-300 rounded-full filter blur-[80px] opacity-30 animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }}></div>
          <div className="absolute top-[40%] right-[30%] w-[180px] h-[180px] bg-white rounded-full filter blur-[40px] opacity-60"></div>
        </div>

        {/* FROSTED GLASS LOGIN CARD */}
        <div className="w-full max-w-md p-8 md:p-10 rounded-[32px] bg-white/40 border border-white/45 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.06)] backdrop-blur-2xl relative z-10 animate-fade-in flex flex-col items-center">
          <div className="text-center w-full mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-1.5">Hello!</h2>
            <p className="text-slate-500 text-sm font-medium">We are really happy to see you again!</p>
          </div>

          {error && (
            <div className="w-full mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm text-center font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="w-full space-y-5">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 border border-white/60 rounded-2xl bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner text-sm font-medium backdrop-blur-md"
                  placeholder="Email"
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-11 py-3.5 border border-white/60 rounded-2xl bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner text-sm font-medium backdrop-blur-md"
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
              className="w-full py-4 px-4 border border-transparent rounded-2xl shadow-[0_4px_12px_rgba(59,130,246,0.25)] text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(59,130,246,0.35)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : 'Sign in'}
            </button>
          </form>

          {/* Social Sign In Actions */}
          <div className="w-full mt-6 text-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold bg-transparent px-2">
              or sign in with
            </span>
            <div className="flex justify-center gap-3 mt-4 w-full">
              <button type="button" className="flex-1 py-3 border border-white/60 rounded-xl bg-white/50 hover:bg-white/80 transition-all flex items-center justify-center text-slate-600 shadow-sm backdrop-blur-md">
                <svg className="h-5 w-5 text-[#1877f2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </button>
              <button type="button" className="flex-1 py-3 border border-white/60 rounded-xl bg-white/50 hover:bg-white/80 transition-all flex items-center justify-center text-slate-600 shadow-sm backdrop-blur-md">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.57h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.47C21.68,11.83 21.56,11.45 21.35,11.1z" fill="#4285F4" />
                  <path d="M12,20.68c2.61,0 4.81,-0.87 6.41,-2.37l-3.3,-2.57c-0.91,0.61 -2.08,0.98 -3.11,0.98 -2.39,0 -4.42,-1.62 -5.14,-3.8H3.45v2.66C5.07,18.8 8.35,20.68 12,20.68z" fill="#34A853" />
                  <path d="M6.86,13.09c-0.18,-0.54 -0.28,-1.11 -0.28,-1.7c0,-0.59 0.1,-1.16 0.28,-1.7V7.03H3.45C2.84,8.26 2.5,9.64 2.5,11.09c0,1.45 0.34,2.83 0.95,4.06L6.86,13.09z" fill="#FBBC05" />
                  <path d="M12,4.82c1.42,0 2.7,0.49 3.71,1.45L17.8,4.19C16.21,2.7 14,1.82 12,1.82c-3.65,0 -6.93,1.88 -8.55,4.86l3.41,2.66C7.58,6.44 9.61,4.82 12,4.82z" fill="#EA4335" />
                </svg>
              </button>
              <button type="button" className="flex-1 py-3 border border-white/60 rounded-xl bg-white/50 hover:bg-white/80 transition-all flex items-center justify-center text-slate-600 shadow-sm backdrop-blur-md">
                <svg className="h-5 w-5 text-[#0a66c2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-semibold"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
