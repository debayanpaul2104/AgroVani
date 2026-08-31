'use client'

import Link from 'next/link'
import { ArrowLeft, Store, TrendingUp, PackageCheck } from 'lucide-react'

export default function SellerDashboard() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.12),_transparent_18%),linear-gradient(180deg,#fffaf3_0%,#fff7ed_100%)] p-4 text-slate-800 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between rounded-[24px] border border-white/80 bg-white/70 p-4 backdrop-blur-md">
          <Link href="/login" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> AgroVani Seller Portal
          </Link>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Seller</span>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Store className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Inventory</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">864</p>
            <p className="mt-2 text-sm text-slate-600">Units listed this month</p>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Sales</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">₹2.4L</p>
            <p className="mt-2 text-sm text-slate-600">Monthly revenue generated</p>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <PackageCheck className="h-6 w-6" />
            </div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Fulfillment</p>
            <p className="mt-3 text-4xl font-bold text-slate-900">94%</p>
            <p className="mt-2 text-sm text-slate-600">On-time shipping rate</p>
          </div>
        </div>
      </div>
    </main>
  )
}
