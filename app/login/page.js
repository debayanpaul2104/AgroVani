'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, BadgeCheck, Building2, ShieldCheck, UserRound, Lock, Mail, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react'

const roles = [
  {
    key: 'farmer',
    label: 'Farmer',
    accent: 'emerald',
    username: 'farmer@agrovani.in',
    password: 'AgroVani@123',
    redirect: '/farmer/dashboard',
    badge: 'Crop & field access',
  },
  {
    key: 'seller',
    label: 'Seller',
    accent: 'amber',
    username: 'seller@agrovani.in',
    password: 'AgroVani@123',
    redirect: '/seller/dashboard',
    badge: 'Residue marketplace',
  },
  {
    key: 'admin',
    label: 'Admin',
    accent: 'blue',
    username: 'admin@agrovani.in',
    password: 'AgroVani@123',
    redirect: '/admin/dashboard',
    badge: 'Monitoring & oversight',
  },
]

const roleStyles = {
  farmer: {
    ring: 'ring-emerald-200',
    bg: 'from-emerald-600 to-emerald-500',
    text: 'text-emerald-700',
    chip: 'bg-emerald-50 text-emerald-700',
    button: 'bg-emerald-600 hover:bg-emerald-700',
  },
  seller: {
    ring: 'ring-amber-200',
    bg: 'from-amber-500 to-orange-500',
    text: 'text-amber-700',
    chip: 'bg-amber-50 text-amber-700',
    button: 'bg-amber-600 hover:bg-amber-700',
  },
  admin: {
    ring: 'ring-blue-200',
    bg: 'from-sky-600 to-blue-600',
    text: 'text-blue-700',
    chip: 'bg-blue-50 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
}

export default function LoginPage() {
  const router = useRouter()
  const [activeRole, setActiveRole] = useState('farmer')
  const [form, setForm] = useState({ email: 'farmer@agrovani.in', password: 'AgroVani@123' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const currentRole = useMemo(
    () => roles.find((role) => role.key === activeRole) || roles[0],
    [activeRole],
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')

    const trimEmail = form.email.trim().toLowerCase()
    const trimPassword = form.password.trim()

    const valid = trimEmail === currentRole.username.toLowerCase() && trimPassword === currentRole.password

    if (!valid) {
      setBusy(false)
      setError('Invalid credentials. Please use the correct username and password for this role.')
      return
    }

    const sessionUser = {
      role: currentRole.key,
      name: currentRole.label,
      email: trimEmail,
      loginAt: new Date().toISOString(),
    }

    localStorage.setItem('agrovani_user', JSON.stringify(sessionUser))
    router.push(currentRole.redirect)
    setBusy(false)
  }

  const setInput = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_20%),linear-gradient(180deg,#f8fafc_0%,#edf8f3_100%)] text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/75 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="h-2 w-full bg-gradient-to-r from-[#ff9933] via-[#ffffff] to-[#138808]" />

          <div className="flex flex-col gap-0 lg:flex-row">
            <section className="flex-1 bg-slate-950 px-6 py-8 text-white lg:px-10 lg:py-10">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-300">Government of India</p>
                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">AgroVani Agriculture Portal</h1>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/5 text-emerald-300">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-inner backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full bg-gradient-to-r ${roleStyles[currentRole.key].bg} p-2`}>
                    {currentRole.key === 'farmer' && <UserRound className="h-5 w-5 text-white" />}
                    {currentRole.key === 'seller' && <Building2 className="h-5 w-5 text-white" />}
                    {currentRole.key === 'admin' && <BadgeCheck className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Access Portal</p>
                    <p className="text-xl font-semibold text-white">{currentRole.label} Login</p>
                  </div>
                </div>

                <div className={`mt-5 inline-flex rounded-full ${roleStyles[currentRole.key].chip} px-3 py-1 text-xs font-semibold`}>
                  {currentRole.badge}
                </div>

                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Secure access to sector-specific dashboards
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Farmer, seller and admin workflows kept separate
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    Updated to support agricultural operations and reporting
                  </li>
                </ul>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">District</p>
                  <p className="mt-2 text-lg font-semibold text-white">Punjab</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Portal</p>
                  <p className="mt-2 text-lg font-semibold text-white">Agri-One</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-300">Support</p>
                  <p className="mt-2 text-lg font-semibold text-white">24/7</p>
                </div>
              </div>
            </section>

            <section className="flex-1 bg-white px-6 py-8 lg:px-10 lg:py-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">Sign in</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
                </div>
                <Link href="/" className="text-sm font-semibold text-slate-600 transition hover:text-slate-900">Back to home</Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {roles.map((role) => (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => {
                      setActiveRole(role.key)
                      setForm({
                        email: role.username,
                        password: role.password,
                      })
                      setError('')
                    }}
                    className={`rounded-2xl border p-3 text-left transition ${activeRole === role.key ? `border-${role.key === 'farmer' ? 'emerald' : role.key === 'seller' ? 'amber' : 'blue'}-300 bg-${role.key === 'farmer' ? 'emerald' : role.key === 'seller' ? 'amber' : 'blue'}-50 shadow-sm` : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{role.label}</span>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </div>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email / Username</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="text"
                      value={form.email}
                      onChange={setInput('email')}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      placeholder="Enter your email or username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={setInput('password')}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    Keep me signed in
                  </label>
                  <button type="button" className="font-medium text-slate-600 transition hover:text-slate-900">Need help?</button>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${roleStyles[currentRole.key].bg} font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {busy ? 'Signing in...' : `Sign in as ${currentRole.label}`}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  Secure agricultural operations platform for Punjab & beyond
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Demo credentials</span>
                  <span>Farmer, Seller, Admin roles</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
