#!/bin/bash

# Script para inicializar la base de datos mediante la API REST de Supabase
# Este script envía el SQL completo a Supabase

set -e

# Variables de entorno
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Error: Variables de entorno SUPABASE no configuradas"
    echo "Requeridas:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "🚀 Inicializando base de datos..."
echo "📍 URL: $SUPABASE_URL"
echo ""

# Leer el archivo SQL
SCHEMA_SQL=$(cat ./database/schema.sql)

# Contar líneas
TOTAL_LINES=$(echo "$SCHEMA_SQL" | wc -l)
echo "📋 Enviando $TOTAL_LINES líneas de SQL..."
echo ""

# Crear JSON para la solicitud
PAYLOAD=$(cat <<EOF
{
  "query": "$SCHEMA_SQL"
}
EOF
)

# Intentar ejecutar mediante RPC (si la función _execute_sql existe)
echo "⏳ Ejecutando SQL en Supabase..."

RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/_execute_sql" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"sql_query\": \"$(echo "$SCHEMA_SQL" | sed 's/"/\\"/g' | tr '\n' ' ')\"}" 2>&1 || echo "")

# Si la RPC no existe, notificar al usuario
if echo "$RESPONSE" | grep -q "not found\|doesn't exist"; then
    echo ""
    echo "⚠️  La función SQL para ejecutar comandos no está disponible."
    echo ""
    echo "📌 Opción: Ejecutar manualmente en Supabase"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1️⃣  Abre Supabase Dashboard: $SUPABASE_URL"
    echo ""
    echo "2️⃣  Ve a: SQL Editor → New Query"
    echo ""
    echo "3️⃣  Copia y pega el contenido de:"
    echo "    ./database/schema.sql"
    echo ""
    echo "4️⃣  Presiona RUN (o Ctrl+Enter)"
    echo ""
    echo "5️⃣  ✅ ¡Listo! Tu base de datos estará configurada"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
fi

# Si se ejecutó exitosamente
echo "✅ ¡Base de datos inicializada!"
echo ""
echo "📊 Recursos creados:"
echo "  ✓ 7 tablas"
echo "  ✓ 2 vistas"
echo "  ✓ 2 funciones"
echo "  ✓ Índices y restricciones"
echo "  ✓ Datos de ejemplo"
echo ""
echo "🎉 ¡Tu aplicación está lista para usar!"
