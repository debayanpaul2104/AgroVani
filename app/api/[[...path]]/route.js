import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/adapters/weather'
import { fetchSprayWindow, fetchHydricStress, geocodeLocation } from '@/lib/adapters/cehub'
import { computeStressDiagnostic, CROP_LIST } from '@/lib/calculations/cropRecommendation'
import { computeResidue, DISTRICT_DATA, getDistrictData } from '@/lib/calculations/residueRecommendation'
import { createSupabaseDb, getSupabaseServerClient } from '@/lib/supabase/server'

let client
let db
let memoryDb = null
let supabaseDb = null

function createMemoryCollection(initialRows = []) {
  const rows = [...initialRows]

  const makeQueryMatcher = (query = {}) => (row) => Object.entries(query).every(([key, value]) => {
    if (value === undefined) return true
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.entries(value).every(([nestedKey, nestedValue]) => {
        const source = row[key]
        if (source && typeof source === 'object') return source[nestedKey] === nestedValue
        return false
      })
    }
    return row[key] === value
  })

  return {
    async countDocuments() {
      return rows.length
    },
    async insertMany(items) {
      rows.push(...items)
      return { insertedCount: items.length }
    },
    async insertOne(item) {
      rows.push(item)
      return { insertedId: item.id || rows.length }
    },
    find(query = {}) {
      const filtered = rows.filter(makeQueryMatcher(query))

      let sortSpec = null
      let limitValue = null

      return {
        sort(spec) {
          sortSpec = spec
          return this
        },
        limit(value) {
          limitValue = value
          return this
        },
        async toArray() {
          let result = [...filtered]
          if (sortSpec) {
            const entries = Object.entries(sortSpec)
            result.sort((a, b) => {
              for (const [key, direction] of entries) {
                const delta = (a[key] ?? 0) > (b[key] ?? 0) ? 1 : -1
                if ((a[key] ?? 0) === (b[key] ?? 0)) continue
                return direction === -1 ? -delta : delta
              }
              return 0
            })
          }
          if (limitValue !== null) result = result.slice(0, limitValue)
          return result
        },
      }
    },
    async findOne(query = {}) {
      return rows.find(makeQueryMatcher(query)) || null
    },
  }
}

function createMemoryDb() {
  const now = new Date()
  const farms = SEED_FARMS.map((farm) => ({ id: uuidv4(), ...farm, createdAt: now }))
  const machinery = SEED_MACHINERY.map((item) => ({ id: uuidv4(), ...item }))
  const districtMetrics = Object.entries(DISTRICT_DATA).map(([district, values]) => ({ id: uuidv4(), district, ...values }))

  const collections = {
    farms: createMemoryCollection(farms),
    machinery: createMemoryCollection(machinery),
    district_metrics: createMemoryCollection(districtMetrics),
    stress_diagnostic_logs: createMemoryCollection(),
    bookings: createMemoryCollection(),
  }

  return {
    collection(name) {
      if (!collections[name]) collections[name] = createMemoryCollection()
      return collections[name]
    },
  }
}

async function connectToMongo() {
  if (memoryDb) return memoryDb

  if (!process.env.MONGO_URL || !process.env.DB_NAME) {
    memoryDb = createMemoryDb()
    return memoryDb
  }

  try {
    if (!client) {
      client = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000 })
      await client.connect()
      db = client.db(process.env.DB_NAME)
    }
    if (db) return db
    throw new Error('MongoDB connection did not return a database')
  } catch (error) {
    console.warn('MongoDB unavailable, falling back to in-memory store for Vercel deployment:', error.message)
    client = null
    memoryDb = createMemoryDb()
    return memoryDb
  }
}

function connectToDatabase() {
  if (supabaseDb) return supabaseDb
  const supabase = getSupabaseServerClient()
  if (supabase) {
    supabaseDb = createSupabaseDb(supabase)
    return supabaseDb
  }
  return connectToMongo()
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

function ok(data, status = 200) {
  return handleCORS(NextResponse.json(data, { status }))
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

const SEED_FARMS = [
  { name: 'Gurpreet Singh', village: 'Patiala', district: 'Patiala', state: 'Punjab', cropType: 'Rice', areaInAcres: 6, latitude: 30.3398, longitude: 76.3869, soilPh: 6.4, nitrogenKgPerHa: 95 },
  { name: 'Harjinder Kaur', village: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', cropType: 'Wheat', areaInAcres: 8, latitude: 30.901, longitude: 75.8573, soilPh: 6.8, nitrogenKgPerHa: 110 },
  { name: 'Ramesh Patel', village: 'Indore', district: 'Indore', state: 'Madhya Pradesh', cropType: 'Soybean', areaInAcres: 5, latitude: 22.7196, longitude: 75.8577, soilPh: 6.2, nitrogenKgPerHa: 80 },
  { name: 'Vijay Deshmukh', village: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', cropType: 'Cotton', areaInAcres: 7, latitude: 21.1458, longitude: 79.0882, soilPh: 7.1, nitrogenKgPerHa: 105 },
  { name: 'Lakshmi Reddy', village: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', cropType: 'Rice', areaInAcres: 9, latitude: 16.3067, longitude: 80.4365, soilPh: 6.6, nitrogenKgPerHa: 120 },
]

const SEED_MACHINERY = [
  { type: 'Happy Seeder', provider: 'Patiala Agri Co-op', district: 'Patiala', pricePerAcre: 1200, available: true, lat: 30.35, lon: 76.40 },
  { type: 'Baler', provider: 'Green Fields Custom Hiring', district: 'Ludhiana', pricePerAcre: 1500, available: true, lat: 30.91, lon: 75.86 },
  { type: 'Mulcher', provider: 'Malwa Machinery Hub', district: 'Patiala', pricePerAcre: 1000, available: true, lat: 30.31, lon: 76.36 },
  { type: 'Boom Sprayer', provider: 'AgroSpray Services', district: 'Indore', pricePerAcre: 600, available: true, lat: 22.72, lon: 75.86 },
  { type: 'Happy Seeder', provider: 'Vidarbha Farm Tech', district: 'Nagpur', pricePerAcre: 1300, available: true, lat: 21.15, lon: 79.09 },
]

async function seedDb(db) {
  const farmsCol = db.collection('farms')
  const farmCount = await farmsCol.countDocuments()
  if (farmCount === 0) {
    const now = new Date()
    const farms = SEED_FARMS.map((farm) => ({ id: uuidv4(), ...farm, createdAt: now }))
    await farmsCol.insertMany(farms)
    await db.collection('machinery').insertMany(SEED_MACHINERY.map((item) => ({ id: uuidv4(), ...item })))
    const metrics = Object.entries(DISTRICT_DATA).map(([district, values]) => ({ id: uuidv4(), district, ...values }))
    await db.collection('district_metrics').insertMany(metrics)
    return { seeded: true, farms: farms.length }
  }
  return { seeded: false }
}

async function createAssistantReply(db, body) {
  if (!process.env.GEMINI_API_KEY) return ok({ error: 'Gemini voice assistant is not configured' }, 503)

  const farm = body.farmId ? await db.collection('farms').findOne({ id: body.farmId }) : null
  if (body.farmId && !farm) return ok({ error: 'Farm not found' }, 404)

  const farmContext = farm
    ? `Farmer: ${farm.name}. Location: ${farm.village}, ${farm.district}, ${farm.state}. Crop: ${farm.cropType}. Area: ${farm.areaInAcres} acres. Soil pH: ${farm.soilPh ?? 'unknown'}. Nitrogen: ${farm.nitrogenKgPerHa ?? 'unknown'} kg/ha.`
    : 'No farm profile is available yet.'
  const liveContext = body.context ? `Current dashboard data (may be stale): ${JSON.stringify(body.context)}` : ''
  const language = body.locale === 'hi' ? 'Hindi' : body.locale === 'pa' ? 'Punjabi' : 'English'
  const systemInstruction = [
    'You are AgroVani, a concise and practical agricultural voice advisor for Indian farmers.',
    `Speak in ${language}. If the farmer speaks another supported Indian language, follow their language.`,
    'Use simple words, short sentences, and quantities with units. Ask one clarifying question when essential.',
    'Never invent weather, disease diagnoses, pesticide doses, or prices. Recommend consulting a local agronomist for high-risk chemical or medical questions.',
    farmContext,
    liveContext,
  ].join('\n')
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: body.message || '' }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('Gemini assistant error:', data)
    return ok({ error: 'Unable to get an assistant response' }, 502)
  }
  const reply = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
  return reply ? ok({ reply }) : ok({ error: 'Assistant returned an empty response' }, 502)
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method
  const { searchParams } = new URL(request.url)

  try {
    const db = await connectToDatabase()

    if (route === '/assistant' && method === 'POST') {
      return createAssistantReply(db, await request.json())
    }

    if ((route === '/' || route === '/root') && method === 'GET') {
      return ok({ message: 'AgroVani API', crops: CROP_LIST })
    }

    if (route === '/seed' && method === 'POST') {
      const result = await seedDb(db)
      return ok(result)
    }

    if (route === '/geocode' && method === 'GET') {
      const query = searchParams.get('query') || ''
      if (!query) return ok({ results: [] })
      const results = await geocodeLocation(query)
      return ok({ results })
    }

    if (route === '/farms' && method === 'POST') {
      const body = await request.json()
      const farm = {
        id: uuidv4(),
        name: body.name || 'Farmer',
        village: body.village || '',
        district: body.district || 'Patiala',
        state: body.state || '',
        cropType: body.cropType || 'Rice',
        areaInAcres: Number(body.areaInAcres) || 1,
        latitude: Number(body.latitude) || 30.3398,
        longitude: Number(body.longitude) || 76.3869,
        soilPh: body.soilPh != null ? Number(body.soilPh) : null,
        nitrogenKgPerHa: body.nitrogenKgPerHa != null ? Number(body.nitrogenKgPerHa) : null,
        locale: body.locale || 'en',
        createdAt: new Date(),
      }
      await db.collection('farms').insertOne(farm)
      const { _id, ...clean } = farm
      return ok(clean)
    }

    if (route === '/farms' && method === 'GET') {
      const id = searchParams.get('id')
      if (id) {
        const farm = await db.collection('farms').findOne({ id })
        if (!farm) return ok({ error: 'Farm not found' }, 404)
        const { _id, ...clean } = farm
        return ok(clean)
      }
      const farms = await db.collection('farms').find({}).limit(100).toArray()
      return ok(farms.map(({ _id, ...rest }) => rest))
    }

    if (route === '/stress' && method === 'GET') {
      const farmId = searchParams.get('farmId')
      let lat, lon, crop, area, soilPh, nitrogen
      if (farmId) {
        const farm = await db.collection('farms').findOne({ id: farmId })
        if (!farm) return ok({ error: 'Farm not found' }, 404)
        lat = farm.latitude
        lon = farm.longitude
        crop = farm.cropType
        area = farm.areaInAcres
        soilPh = farm.soilPh
        nitrogen = farm.nitrogenKgPerHa
      } else {
        lat = Number(searchParams.get('lat'))
        lon = Number(searchParams.get('lon'))
        crop = searchParams.get('crop') || 'Rice'
        area = Number(searchParams.get('area')) || 5
        soilPh = searchParams.get('ph') ? Number(searchParams.get('ph')) : null
        nitrogen = searchParams.get('n') ? Number(searchParams.get('n')) : null
      }

      const weather = await fetchWeather(lat, lon)
      const diagnostic = computeStressDiagnostic({
        weather, crop, areaInAcres: area, soilPh, nitrogenKgPerHa: nitrogen,
      })
      const spray = await fetchSprayWindow(lat, lon, 'Foliar')
      const hydric = await fetchHydricStress(lat, lon, crop)

      const log = {
        id: uuidv4(),
        farmId: farmId || null,
        tmax: weather.tmax,
        tmin: weather.tmin,
        diurnalScore: diagnostic.scores.diurnal,
        nightScore: diagnostic.scores.night,
        frostScore: diagnostic.scores.frost,
        droughtIndex: diagnostic.droughtIndex?.value ?? null,
        recommendedProduct: diagnostic.product.product,
        sprayWindowStart: spray.windows?.[0]?.startTime || null,
        createdAt: new Date(),
      }
      await db.collection('stress_diagnostic_logs').insertOne(log)

      return ok({
        weather,
        diagnostic,
        sprayWindow: spray.windows,
        hydricStress: hydric.data,
        location: { latitude: lat, longitude: lon },
      })
    }

    if (route === '/residue' && method === 'GET') {
      const farmId = searchParams.get('farmId')
      let area, district
      if (farmId) {
        const farm = await db.collection('farms').findOne({ id: farmId })
        if (!farm) return ok({ error: 'Farm not found' }, 404)
        area = farm.areaInAcres
        district = farm.district
      } else {
        area = Number(searchParams.get('area')) || 5
        district = searchParams.get('district') || 'Patiala'
      }
      const result = computeResidue({ areaInAcres: area, district })
      return ok(result)
    }

    if (route === '/machinery' && method === 'GET') {
      const district = searchParams.get('district')
      const type = searchParams.get('type')
      const query = {}
      if (district) query.district = district
      if (type) query.type = type
      const items = await db.collection('machinery').find(query).limit(100).toArray()
      return ok(items.map(({ _id, ...rest }) => rest))
    }

    if (route === '/bookings' && method === 'POST') {
      const body = await request.json()
      const booking = {
        id: uuidv4(),
        farmId: body.farmId || null,
        farmerName: body.farmerName || 'Farmer',
        machineryType: body.machineryType || 'Happy Seeder',
        provider: body.provider || '',
        district: body.district || '',
        date: body.date || new Date().toISOString().slice(0, 10),
        acres: Number(body.acres) || 1,
        status: 'requested',
        createdAt: new Date(),
      }
      await db.collection('bookings').insertOne(booking)
      const { _id, ...clean } = booking
      return ok(clean)
    }

    if (route === '/bookings' && method === 'GET') {
      const farmId = searchParams.get('farmId')
      const query = farmId ? { farmId } : {}
      const items = await db.collection('bookings').find(query).sort({ createdAt: -1 }).limit(100).toArray()
      return ok(items.map(({ _id, ...rest }) => rest))
    }

    if (route === '/district-metrics' && method === 'GET') {
      const district = searchParams.get('district')
      if (district) return ok({ district, ...getDistrictData(district) })
      return ok(Object.entries(DISTRICT_DATA).map(([districtName, values]) => ({ district: districtName, ...values })))
    }

    return ok({ error: `Route ${route} not found` }, 404)
  } catch (error) {
    console.error('API Error:', error)
    return ok({ error: 'Internal server error', detail: String(error?.message || error) }, 500)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
