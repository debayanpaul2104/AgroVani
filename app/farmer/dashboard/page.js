'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import React from 'react'
import Link from 'next/link'
import FarmMapCard from '@/components/farmer/FarmMapCard'
import BookMachineryCard from '@/components/farmer/BookMachineryCard'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import {
  Wheat, FlaskConical, ArrowLeft, TrendingUp, Sun, Moon, Snowflake,
  Droplets, Sparkles, Clock, Mic, Camera, IndianRupee, AlertTriangle, Loader2,
} from 'lucide-react'

class DebugBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err) { console.error('Dashboard render error:', err) }
  render() {
    if (this.state.err) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">Something went wrong loading this view.</p>
          <button onClick={() => this.setState({ err: null })} className="pill-dark mt-4">Retry</button>
        </div>
      )
    }
    return this.props.children
  }
}

function StressGauge({ label, value, icon: Icon, unit = '/9' }) {
  const v = Number(value) || 0
  const pct = Math.min(100, (v / 9) * 100)
  const color = v > 6 ? '#ef4444' : v > 4 ? '#f59e0b' : v > 2 ? '#eab308' : '#10b981'
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/75 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.04)] backdrop-blur-md">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{label}</span>
      </div>
      <p className="mt-3 text-4xl font-bold tracking-tight" style={{ color }}>{v.toFixed(1)}<span className="ml-1 text-base font-medium text-slate-400">{unit}</span></p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

export default function App() {
  const [farms, setFarms] = useState([])
  const [farm, setFarm] = useState(null)
  const [tab, setTab] = useState('crop')
  const [stress, setStress] = useState(null)
  const [residue, setResidue] = useState(null)
  const [loading, setLoading] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [voiceReply, setVoiceReply] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceMode, setVoiceMode] = useState('idle')
  const [cameraFile, setCameraFile] = useState(null)
  const [cameraPreview, setCameraPreview] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const recognitionRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const { locale, t } = useLanguage()
  const copy = t.dashboard

  function stopVoice() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
    setVoiceMode('idle')
  }

  function startVoice() {
    if (listening) {
      stopVoice()
      return
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setVoiceText('Voice input is not supported in this browser.')
      return
    }
    const recognition = new Recognition()
    recognition.lang = locale === 'hi' ? 'hi-IN' : locale === 'pa' ? 'pa-IN' : 'en-IN'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onstart = () => setListening(true)
    recognition.onend = () => { setListening(false); recognitionRef.current = null }
    recognition.onerror = () => { setListening(false); setVoiceMode('idle'); setVoiceText('Could not hear that. Please try again.') }
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      setVoiceText(transcript)
      setVoiceMode('thinking')
      try {
        const response = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmId: farm?.id,
            locale,
            message: transcript,
            context: { weather: stress?.weather, diagnostic: stress?.diagnostic, residue },
          }),
        })
        const data = await response.json()
        if (!response.ok || !data.reply) throw new Error(data.error || 'Assistant unavailable')
        setVoiceReply(data.reply)
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.reply))
        }
      } catch (error) {
        setVoiceReply(error.message || 'Assistant unavailable.')
      } finally {
        setVoiceMode('idle')
      }
    }
    recognitionRef.current = recognition
    recognition.start()
  }

  function stopCamera() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    setCameraOpen(false)
  }

  async function openCamera() {
    setCameraError('')
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. Use Upload photo instead.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      cameraStreamRef.current = stream
      setCameraOpen(true)
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch (error) {
      setCameraError(error.name === 'NotAllowedError' ? 'Camera permission was denied. Enable it in browser settings or use Upload photo.' : 'Unable to start the camera. Use Upload photo instead.')
    }
  }

  function captureCamera() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob) setCameraFile(new File([blob], `crop-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      stopCamera()
    }, 'image/jpeg', 0.9)
  }

  useEffect(() => () => stopVoice(), [])
  useEffect(() => () => stopCamera(), [])
  useEffect(() => {
    if (!cameraFile) {
      setCameraPreview('')
      return undefined
    }
    const previewUrl = URL.createObjectURL(cameraFile)
    setCameraPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [cameraFile])

  useEffect(() => {
    const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null
    if (p === 'crop') setTab('crop')
    if (p === 'residue') setTab('residue')

    async function loadFarms() {
      try {
        let res = await fetch('/api/farms')
        let list = await res.json()
        const farmsArr = Array.isArray(list) ? list : []
        setFarms(farmsArr)
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('fv_farmId') : null
        const initial = farmsArr.find((f) => f.id === savedId) || farmsArr[0] || null
        setFarm(initial)
      } catch (e) {
        setFarms([])
      }
    }
    loadFarms()
  }, [])

  const loadData = useCallback((f) => {
    if (!f) return
    setLoading(true)
    setStress(null)
    setResidue(null)
    fetch(`/api/residue?farmId=${f.id}`).then((r) => r.json()).then(setResidue).catch(() => {})
    fetch(`/api/stress?farmId=${f.id}`)
      .then((r) => r.json())
      .then(setStress)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { if (farm) loadData(farm) }, [farm, loadData])

  const diag = stress?.diagnostic
  const sprayWindows = stress?.sprayWindow || []
  const syngentaApi = stress?.syngentaApi

  return (
    <DebugBoundary>
      <main className="page-farmer min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> AgroVani
            </Link>
            <LanguageSwitcher />

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="inline-flex rounded-full border border-white/80 bg-white/70 p-1 shadow-[0_8px_20px_rgba(0,0,0,0.05)] backdrop-blur-md">
                  <button onClick={() => setTab('residue')} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${tab === 'residue' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                  <Wheat className="h-4 w-4" /> {copy.residueTab}
                </button>
                <button onClick={() => setTab('crop')} className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${tab === 'crop' ? 'bg-[#006a42] text-white shadow-md shadow-emerald-600/20' : 'text-slate-600 hover:text-slate-900'}`}>
                  <FlaskConical className="h-4 w-4" /> {copy.cropTab}
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-white/80 bg-white/70 px-4 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.04)] backdrop-blur-md">
                <span className="text-sm font-medium text-slate-600">{copy.farm}:</span>
                <select
                  className="bg-transparent text-sm font-semibold text-slate-900 focus:outline-none"
                  value={farm?.id || ''}
                  onChange={(e) => setFarm(farms.find((f) => f.id === e.target.value))}
                >
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} • {f.village} ({f.cropType})</option>
                  ))}
                </select>
              </div>
            </div>
          </header>

          {loading && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur-md">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching live weather & agronomic data…
            </div>
          )}

          {tab === 'residue' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="glass-card card-3d">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">{copy.residueForecast}</p>
                <p className="mt-4 text-5xl font-bold tracking-tight text-slate-900">{residue ? (residue.residueTons / (farm?.areaInAcres || 1)).toFixed(1) : '—'} <span className="text-lg font-medium text-slate-500">t/acre</span></p>
                <p className="mt-3 text-sm text-slate-600">{residue?.residueTons ?? '—'} tons total across {farm?.areaInAcres ?? '—'} acres</p>
              </div>

              <div className="glass-card card-3d">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">{copy.buyerDemand}</p>
                <p className="mt-4 text-5xl font-bold tracking-tight text-emerald-600">{residue?.buyerDemand || '—'}</p>
                <p className="mt-3 flex items-center gap-1 text-sm text-slate-600"><IndianRupee className="h-4 w-4" /> {residue?.totalValueINR?.toLocaleString('en-IN') ?? '—'} potential value</p>
                <BookMachineryCard farm={farm} defaultType="Baler" triggerLabel="Sell Stubble" triggerClass="pill-dark mt-4 w-full" />
              </div>

              <div className="glass-card card-3d">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">{copy.machineryReadiness}</p>
                <p className="mt-4 text-5xl font-bold tracking-tight text-slate-900">{residue?.machineryReadiness ?? '—'}<span className="text-2xl font-medium text-slate-500">%</span></p>
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <AlertTriangle className={`h-4 w-4 ${residue?.riskLevel === 'High' ? 'text-red-500' : 'text-amber-500'}`} />
                  Stubble risk: <span className="font-semibold">{residue?.riskLevel || '—'}</span> • {residue?.hotspots ?? 0} hotspots
                </div>
              </div>

              <div className="lg:col-span-2">
                <FarmMapCard lat={farm?.latitude} lon={farm?.longitude} mode="residue" title="Residue & Machinery Map" />
              </div>

              <div className="glass-card card-3d flex flex-col">
                <h3 className="text-xl font-semibold text-slate-900">Equipment</h3>
                <p className="mt-2 text-sm text-slate-600">Nearby custom hiring centers</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  <li className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3"><span>Happy Seeder</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Available</span></li>
                  <li className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3"><span>Baler</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Available</span></li>
                  <li className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3"><span>Mulcher</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Available</span></li>
                </ul>
                <div className="mt-auto pt-4">
                  <BookMachineryCard farm={farm} defaultType="Happy Seeder" triggerLabel="Request Equipment" triggerClass="pill-dark w-full" />
                </div>
              </div>
            </div>
          )}

          {tab === 'crop' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4 rounded-[28px] bg-gradient-to-r from-[#006a42] to-[#29a56b] px-6 py-5 text-white shadow-[0_20px_45px_rgba(0,106,66,0.25)]">
                <TrendingUp className="h-6 w-6" />
                <p className="text-lg font-semibold">+12% Verified Yield Gain</p>
                <span className="hidden h-6 w-px bg-white/40 sm:block" />
                <p className="text-lg font-semibold">+₹4,200 Profit / Acre</p>
                <span className="ml-auto rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">Causal ROI attribution</span>
              </div>

              <div className="glass-card">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <h3 className="text-xl font-semibold text-slate-900">Live abiotic stress — {farm?.cropType}</h3>
                  {diag && <span className="text-sm text-slate-500">TMAX {diag.tmax?.toFixed(1)}°C • TMIN {diag.tmin?.toFixed(1)}°C</span>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StressGauge label="Diurnal Heat" value={diag?.scores?.diurnal} icon={Sun} />
                  <StressGauge label="Night Heat" value={diag?.scores?.night} icon={Moon} />
                  <StressGauge label="Frost" value={diag?.scores?.frost} icon={Snowflake} />
                  <div className="rounded-[24px] border border-white/70 bg-white/75 p-5 shadow-[0_12px_28px_rgba(0,0,0,0.04)] backdrop-blur-md">
                    <div className="flex items-center gap-2 text-slate-500"><Droplets className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Drought Index</span></div>
                    <p className="mt-3 text-4xl font-bold text-slate-900">{diag?.droughtIndex?.value?.toFixed(2) ?? '—'}</p>
                    <p className="mt-3 text-sm font-medium" style={{ color: diag?.droughtIndex?.risk === 'High Risk' ? '#ef4444' : diag?.droughtIndex?.risk === 'Medium Risk' ? '#f59e0b' : '#10b981' }}>{diag?.droughtIndex?.risk || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="glass-card card-3d lg:col-span-2">
                  <div className="flex items-center gap-2 text-emerald-600"><Sparkles className="h-5 w-5" /><span className="text-[10px] font-bold uppercase tracking-[0.28em]">Recommendation</span></div>
                  {diag ? (
                    <>
                      <h3 className="mt-4 text-2xl font-bold text-slate-900">{diag.product.product}</h3>
                      <p className="text-sm font-semibold text-emerald-700">{diag.product.brand}</p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{diag.product.rationale}</p>
                      {diag.product.options?.length > 0 && (
                        <div className="mt-5 space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Potential Syngenta options</p>
                          {diag.product.options.map((option) => (
                            <div key={option.name} className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                              <p className="text-sm font-semibold text-emerald-900">{option.name} <span className="font-normal text-emerald-700">· {option.type}</span></p>
                              <p className="mt-1 text-xs leading-5 text-emerald-800">{option.use}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-300"><FlaskConical className="h-4 w-4" /> Smart pump-count dosing</div>
                        <p className="mt-3 text-sm text-slate-200">{diag.dosing.message}</p>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                          <span>{diag.dosing.totalPumps} pumps</span>
                          <span>{diag.dosing.totalCaps} caps</span>
                          <span>{diag.dosing.totalLitres} L product</span>
                        </div>
                      </div>
                    </>
                  ) : <p className="mt-4 text-sm text-slate-500">Computing recommendation…</p>}
                </div>

                <div className="glass-card card-3d">
                  <div className="flex items-center gap-2 text-slate-500"><Clock className="h-5 w-5" /><span className="text-[10px] font-bold uppercase tracking-[0.28em]">Optimal Spray Window</span></div>
                  <p className="mt-2 text-xs text-slate-400">Syngenta CE Hub</p>
                  {syngentaApi && <p className="mt-1 text-xs text-slate-500">Live API: {syngentaApi.sprayWindow ? 'connected' : 'unavailable'} · Hydric stress: {syngentaApi.hydricStress ? 'connected' : 'unavailable'}</p>}
                  {sprayWindows.length > 0 ? (
                    <ul className="mt-4 space-y-2 text-sm text-emerald-800">
                      {sprayWindows.slice(0, 4).map((w, i) => (
                        <li key={i} className="rounded-xl bg-emerald-50 px-3 py-2">{w.startTime || w.date || 'Window'} {w.endTime ? `→ ${w.endTime}` : ''}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      No high-confidence window flagged right now. Best practice: spray in the <span className="font-semibold text-slate-800">early morning (6–9 AM)</span> or late evening with low wind.
                    </div>
                  )}
                  <BookMachineryCard farm={farm} defaultType="Boom Sprayer" triggerLabel="Book Sprayer Machine" triggerClass="pill-dark mt-4 w-full" />
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="glass-card">
                  <div className="flex items-center gap-2 text-slate-900"><Mic className="h-5 w-5 text-emerald-600" /><h3 className="text-xl font-semibold">Voice Advisory</h3></div>
                  <p className="mt-2 text-sm text-slate-600">Ask in Punjabi, Hindi, Marathi, Tamil or Telugu. Speech-to-Text advisory.</p>
                  <button onClick={startVoice} aria-label={listening ? 'Stop voice advisory' : 'Start voice advisory'} aria-pressed={listening} className={`mt-5 flex h-14 w-14 items-center justify-center rounded-full shadow-sm ${listening ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}><Mic className="h-6 w-6" /></button>
                  <p className="mt-3 text-xs text-slate-500">{voiceText || (voiceMode === 'thinking' ? 'Thinking...' : listening ? 'Listening... Tap again to stop.' : 'Tap the microphone and ask your question.')}</p>
                  {voiceReply && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{voiceReply}</p>}
                </div>

                <div className="glass-card">
                  <div className="flex items-center gap-2 text-slate-900"><Camera className="h-5 w-5 text-emerald-600" /><h3 className="text-xl font-semibold">Crop Cam Diagnostic</h3></div>
                  <p className="mt-2 text-sm text-slate-600">Snap a leaf to detect chlorosis, heat wilting & fungal lesions with Gemini Vision.</p>
                  {cameraOpen ? (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-slate-950">
                      <video ref={videoRef} autoPlay playsInline muted className="h-48 w-full object-cover" />
                      <div className="flex gap-3 p-3">
                        <button type="button" onClick={captureCamera} className="pill-dark flex-1">Capture photo</button>
                        <button type="button" onClick={stopCamera} className="glass-btn flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20">Cancel</button>
                      </div>
                    </div>
                  ) : cameraPreview ? (
                    <img src={cameraPreview} alt="Captured crop leaf" className="mt-5 h-48 w-full rounded-2xl object-cover" />
                  ) : (
                    <div className="mt-5 flex h-24 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-sm font-medium text-slate-500">No crop photo selected</div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={openCamera} className="pill-dark"><Camera className="mr-2 h-4 w-4" /> Open camera</button>
                    <label className="glass-btn cursor-pointer"><span>Upload photo</span><input type="file" accept="image/*" className="sr-only" onChange={(event) => setCameraFile(event.target.files?.[0] || null)} /></label>
                  </div>
                  {cameraError && <p role="alert" className="mt-3 text-xs font-medium text-red-600">{cameraError}</p>}
                  <p className="mt-3 text-xs text-slate-500">{cameraFile ? 'Leaf image ready for diagnosis.' : 'Use the camera or upload a leaf photo to prepare a crop diagnosis.'}</p>
                </div>
              </div>

              <FarmMapCard lat={farm?.latitude} lon={farm?.longitude} mode="crop" stressScore={Math.max(diag?.scores?.diurnal || 0, diag?.scores?.night || 0)} title="Crop Health & Stress Map" />
            </div>
          )}
        </div>
      </main>
    </DebugBoundary>
  )
}
