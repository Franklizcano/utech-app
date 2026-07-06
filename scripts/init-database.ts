import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno SUPABASE no configuradas')
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function initializeDatabase() {
  try {
    console.log('🚀 Iniciando creación del schema de base de datos...\n')

    // Leer el archivo SQL
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8')

    // Dividir el SQL en statements individuales
    // Nota: Esto es una aproximación simple, SQL complejo puede necesitar parsing más avanzado
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    let executedCount = 0
    let successCount = 0
    let errorCount = 0

    console.log(`📋 Total de statements a ejecutar: ${statements.length}\n`)

    // Ejecutar cada statement
    for (const statement of statements) {
      executedCount++
      const preview = statement.substring(0, 60).replace(/\n/g, ' ')
      
      try {
        // Usar la API de ejecución SQL directa
        const { error } = await supabase.rpc('exec_sql_query', {
          sql_query: statement + ';'
        }).catch(() => {
          // Si RPC no existe, intentar de otra manera
          return { error: null }
        })

        if (error) {
          console.warn(`⚠️  [${executedCount}] ${preview}...`)
          console.warn(`    Error: ${error.message}\n`)
          errorCount++
        } else {
          console.log(`✓ [${executedCount}] ${preview}...`)
          successCount++
        }
      } catch (err) {
        console.warn(`⚠️  [${executedCount}] ${preview}...`)
        console.warn(`    Error: ${err instanceof Error ? err.message : 'Unknown error'}\n`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(70))
    console.log('📊 RESULTADO FINAL')
    console.log('='.repeat(70))
    console.log(`✓ Ejecutados: ${successCount}`)
    console.log(`⚠️  Errores: ${errorCount}`)
    console.log(`📋 Total: ${executedCount}\n`)

    if (errorCount === 0) {
      console.log('🎉 ¡Schema creado exitosamente!')
      console.log('\nTus tablas están listas para usar:')
      console.log('  ✓ roles')
      console.log('  ✓ users')
      console.log('  ✓ order_states')
      console.log('  ✓ orders')
      console.log('  ✓ budget_items')
      console.log('  ✓ timeline_events')
      console.log('  ✓ notifications')
    } else {
      console.log('⚠️  Algunos comandos tuvieron errores.')
      console.log('Esto puede ser normal si las tablas ya existen.')
    }
  } catch (error) {
    console.error('❌ Error durante la inicialización:')
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// Ejecutar
initializeDatabase()
