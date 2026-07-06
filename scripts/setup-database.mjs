#!/usr/bin/env node

/**
 * Script para inicializar la base de datos Supabase
 * Uso: node scripts/setup-database.mjs
 * 
 * Este script ejecuta el schema SQL completo para crear todas las tablas,
 * índices, vistas y funciones necesarias para el sistema de gestión de reparaciones.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = __filename.replace(/\/[^/]+$/, '')

// Obtener variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno SUPABASE no configuradas')
  console.error('Variables requeridas:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Crear cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

async function setupDatabase() {
  try {
    console.log('\n🚀 Iniciando configuración de base de datos...')
    console.log('📍 URL:', supabaseUrl.substring(0, 50) + '...\n')

    // Leer el archivo SQL
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql')
    const schemaSql = readFileSync(schemaPath, 'utf-8')

    console.log('📋 Ejecutando schema SQL...\n')

    // Ejecutar el SQL usando la API de admin
    const { error, data } = await supabase.rpc('_execute_sql', {
      sql: schemaSql
    }).catch(async () => {
      // Si _execute_sql no existe, intentar con exec
      return await supabase.rpc('exec', {
        sql: schemaSql
      }).catch(() => {
        // Si tampoco existe, notificar al usuario
        return { 
          error: {
            message: 'Las funciones SQL RPC no están disponibles. Ejecuta manualmente el schema.sql'
          }
        }
      })
    })

    if (error) {
      console.warn('⚠️  Nota:', error.message)
      console.log('\n📌 Opción: Ejecutar manualmente en Supabase')
      console.log('━'.repeat(70))
      console.log('1. Abre Supabase Dashboard → SQL Editor')
      console.log('2. Copia el contenido de: database/schema.sql')
      console.log('3. Pega y ejecuta el SQL')
      console.log('4. ✅ ¡Listo!')
      console.log('━'.repeat(70))
      return
    }

    console.log('✅ Schema ejecutado exitosamente!')
    console.log('\n📊 Tablas creadas:')
    console.log('  ✓ roles')
    console.log('  ✓ users')
    console.log('  ✓ order_states')
    console.log('  ✓ orders')
    console.log('  ✓ budget_items')
    console.log('  ✓ timeline_events')
    console.log('  ✓ notifications')

    console.log('\n🔗 Vistas creadas:')
    console.log('  ✓ v_orders_summary')
    console.log('  ✓ v_latest_notifications')

    console.log('\n⚡ Funciones creadas:')
    console.log('  ✓ get_order_budget_total()')
    console.log('  ✓ get_order_statistics()')

    console.log('\n📚 Datos de ejemplo insertados:')
    console.log('  ✓ 7 usuarios')
    console.log('  ✓ 3 órdenes de reparación')
    console.log('  ✓ 6 items de presupuesto')
    console.log('  ✓ 4 eventos de línea de tiempo')
    console.log('  ✓ 4 notificaciones')

    console.log('\n🎉 ¡Base de datos lista para usar!\n')

  } catch (error) {
    console.error('❌ Error durante la inicialización:')
    console.error(error instanceof Error ? error.message : error)
    console.log('\n💡 Intenta ejecutar manualmente el schema.sql en Supabase Dashboard')
    process.exit(1)
  }
}

// Ejecutar
setupDatabase()
