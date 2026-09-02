'use client'

import Link from 'next/link'
import { ArrowLeft, BarChart3, ShieldCheck, Users } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function AdminDashboard() {
  return (
    <main className="page-admin min-h-screen p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between rounded-[24px] border border-white/80 bg-white/70 p-4 backdrop-blur-md">
          <Link href="/login" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> AgroVani Admin Portal
          </Link>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Admin</span>
          <LanguageSwitcher />
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Farmers</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">15.8K</p>
            <p className="mt-2 text-sm text-slate-600">Registered active farmers</p>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <BarChart3 className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Operations</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">87%</p>
            <p className="mt-2 text-sm text-slate-600">District program coverage</p>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Compliance</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">98%</p>
            <p className="mt-2 text-sm text-slate-600">Verification and audit score</p>
          </div>
        </div>
      </div>
    </main>
  )
}
