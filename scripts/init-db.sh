#!/bin/bash

# Script para inicializar la base de datos en Supabase
# Uso: ./scripts/init-db.sh

set -e

echo "🚀 Inicializando base de datos Supabase..."
echo ""

# Verificar que existan las variables de entorno
if [ -z "$POSTGRES_URL" ]; then
    echo "❌ Error: POSTGRES_URL no está configurada"
    echo "Asegúrate de que las variables de entorno de Supabase están configuradas"
    exit 1
fi

# Ejecutar el schema SQL
echo "📋 Ejecutando schema.sql..."
psql "$POSTGRES_URL" < ./database/schema.sql

echo ""
echo "✅ ¡Base de datos inicializada exitosamente!"
echo ""
echo "Tablas creadas:"
echo "  ✓ roles"
echo "  ✓ users"
echo "  ✓ order_states"
echo "  ✓ orders"
echo "  ✓ budget_items"
echo "  ✓ timeline_events"
echo "  ✓ notifications"
echo ""
echo "Vistas creadas:"
echo "  ✓ v_orders_summary"
echo "  ✓ v_latest_notifications"
echo ""
echo "Funciones creadas:"
echo "  ✓ get_order_budget_total()"
echo "  ✓ get_order_statistics()"
