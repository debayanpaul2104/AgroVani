import { createClient } from '@supabase/supabase-js'

const TABLE_COLUMNS = {
  farms: {
    cropType: 'crop_type', areaInAcres: 'area_in_acres', soilPh: 'soil_ph',
    nitrogenKgPerHa: 'nitrogen_kg_per_ha', createdAt: 'created_at',
  },
  machinery: {},
  district_metrics: {},
  bookings: {
    farmId: 'farm_id', farmerName: 'farmer_name', machineryType: 'machinery_type',
    date: 'booking_date', createdAt: 'created_at',
  },
  stress_diagnostic_logs: {
    farmId: 'farm_id', diurnalScore: 'diurnal_score', nightScore: 'night_score',
    frostScore: 'frost_score', droughtIndex: 'drought_index',
    recommendedProduct: 'recommended_product', sprayWindowStart: 'spray_window_start',
    createdAt: 'created_at',
  },
}

function toDatabaseRow(table, row) {
  const columns = TABLE_COLUMNS[table] || {}
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [columns[key] || key, value instanceof Date ? value.toISOString() : value]))
}

function fromDatabaseRow(table, row) {
  const columns = TABLE_COLUMNS[table] || {}
  const reverse = Object.fromEntries(Object.entries(columns).map(([key, value]) => [value, key]))
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [reverse[key] || key, value]))
}

function throwIfError(result) {
  if (result.error) throw result.error
  return result.data
}

function createSupabaseCollection(supabase, table) {
  return {
    async countDocuments() {
      const result = await supabase.from(table).select('id', { count: 'exact', head: true })
      if (result.error) throw result.error
      return result.count || 0
    },
    async insertMany(items) {
      const result = await supabase.from(table).insert(items.map((item) => toDatabaseRow(table, item)))
      throwIfError(result)
      return { insertedCount: items.length }
    },
    async insertOne(item) {
      const result = await supabase.from(table).insert(toDatabaseRow(table, item)).select().single()
      const inserted = throwIfError(result)
      return { insertedId: inserted?.id || item.id }
    },
    find(query = {}) {
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
          let request = supabase.from(table).select('*')
          for (const [key, value] of Object.entries(query)) {
            if (value !== undefined) request = request.eq((TABLE_COLUMNS[table] || {})[key] || key, value)
          }
          if (sortSpec) {
            for (const [key, direction] of Object.entries(sortSpec)) {
              request = request.order((TABLE_COLUMNS[table] || {})[key] || key, { ascending: direction !== -1 })
            }
          }
          if (limitValue !== null) request = request.limit(limitValue)
          const rows = throwIfError(await request)
          return (rows || []).map((row) => fromDatabaseRow(table, row))
        },
      }
    },
    async findOne(query = {}) {
      let request = supabase.from(table).select('*')
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) request = request.eq((TABLE_COLUMNS[table] || {})[key] || key, value)
      }
      const result = await request.maybeSingle()
      if (result.error) throw result.error
      return result.data ? fromDatabaseRow(table, result.data) : null
    },
  }
}

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export function createSupabaseDb(supabase) {
  return {
    collection(name) {
      return createSupabaseCollection(supabase, name)
    },
  }
}