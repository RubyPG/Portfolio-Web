# Datos Faltantes

## Objetivo
Cerrar vacios criticos para convertir el portfolio en narrativa de impacto cuantificado (entrevista + CV senior).

## 1) KPIs de impacto (prioridad alta)
1. Cual era el baseline y el valor actual de `conversion_30d_pct` tras desplegar el flujo completo? (fecha inicial y fecha actual). [Referencia de KPI disponible: docs/SUPABASE.md -> "6) Views de metricas y KPIs"]
2. Cuanto se redujo el tiempo medio desde lead creado hasta primer contacto comercial? [No aparece en docs; flujo relevante en docs/FRONTEND.md -> "5) Leads (flujo actual)"]
3. Cuanto bajo el tiempo de ciclo `DRAFT -> SENT -> PAID` despues de Opcion B? [Flujo documentado: docs/N8N_STRIPE_WORKFLOWS.md -> "6) Flujo Opcion B (recomendado)"]
4. Que variacion tuvo `overdue_count` (facturas vencidas) en 30/60/90 dias? [KPI disponible: docs/SUPABASE.md -> "6) Views de metricas y KPIs"]
5. Cual fue el uplift real en tasa de recomendacion IA util (aceptada por comercial) vs recomendacion manual? [Automatizacion IA: docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "1) Que queda montado"]
6. Cual es el porcentaje de errores/fallos en importacion de leads por lote? [Panel importacion: docs/FRONTEND.md -> "6) Importacion y scraper"]

## 2) Escala tecnica y performance (prioridad alta)
1. Cuantos leads totales y cuantos leads/mes maneja actualmente cada cliente?
2. Cuantos usuarios comerciales activos usan la app por dia/semana?
3. Cual es el volumen de facturas/mes y porcentaje procesado por Opcion B vs fallback checkout? [Flujos: docs/N8N_STRIPE_WORKFLOWS.md -> "2) Workflows activos"]
4. Cual es el throughput real de la IA por lote (tiempo medio por batch de 20)? [Batch default: docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "5) Configuracion minima del 008"]
5. Cual es latencia media de endpoints n8n criticos (`invoice-issue-send`, `invoice-events`, `offer recommendation`)?

## 3) Ownership, seniority y liderazgo (prioridad alta)
1. Cual fue exactamente tu rol (IC principal, tech lead, founder engineer, etc.) y periodo (inicio/fin con fechas)?
2. Cuantas personas participaron (engineering, negocio, operaciones) y que decisiones lideraste tu directamente?
3. Que decisiones tomaste tu que cambiaron el roadmap (ej. Opcion B Stripe, estrategia RAG, merge multiclave)? [Decisiones tecnicas visibles en docs/N8N_STRIPE_WORKFLOWS.md, docs/N8N_LEADS_OFFER_RECOMMENDATION.md, docs/SUPABASE.md]
4. Que incidentes criticos resolviste personalmente y con que resultado?

## 4) Negocio y adopcion (prioridad media)
1. Cuantos clientes finales estan en produccion con esta arquitectura de "un Supabase por cliente"? [Modelo: docs/SUPABASE.md -> "1) Crear proyecto Supabase por cliente"]
2. En que verticales hubo mayor adopcion real y por que? [Hipotesis de verticales: docs/LEADS_OFFER_INPUTS_TEMPLATE.md -> "2) Verticales objetivo y no objetivo"]
3. Que feedback concreto de comerciales/usuarios validó la UX inline y tabla tipo hoja? [UX: docs/FRONTEND.md -> "4) Estado real de la UX"]
4. Que parte del producto genera mas valor percibido hoy (billing, IA, scraper, metrics)?

## 5) Calidad, seguridad y operacion (prioridad media)
1. Existen SLAs/SLOs de disponibilidad para n8n y para sincronizacion Stripe?
2. Hay pruebas automatizadas para workflows criticos (005/006/007/008/009)? [Workflows: docs/N8N_STRIPE_WORKFLOWS.md, docs/N8N_LEADS_OFFER_RECOMMENDATION.md]
3. Como se gestiona rotacion periodica de credenciales (Stripe, Supabase, OpenAI, SES)? [Recomendacion parcial: docs/GRAFANA.md -> "7) Seguridad recomendada"]
4. Cual es el plan de backup/restore para datos y assets PDF en bucket `invoices`? [Storage: docs/SUPABASE.md -> "4) Storage para facturas"]

## Supuestos explicitos usados en este Portfolio Pack
1. Se asume que tu participacion cubre gran parte del alcance tecnico descrito en `/docs`.
2. Se asume que no hay metricas historicas publicables aun, porque no aparecen en la documentacion revisada.
3. Se asume que el proyecto esta activo al menos hasta la fecha de actualizacion `2026-03-04` indicada en varios documentos.

## Inconsistencias detectadas entre documentos
1. **Nombre de dashboard Grafana**: `docs/GRAFANA.md` pide importar `docs/grafana/ilead-crm-supabase-dashboard.json`, pero en `docs/grafana/` solo existe `ilead-crm-supabase-dashboard-fixed-supabase-crm.json`.
2. **Marca en facturacion/email**: la app puede mostrar/mandar `iCreate Group` cuando la marca contiene `iLead`; validar si es regla definitiva de branding o transitoria.
3. **Plantilla de ofertas**: varios precios figuran como `No encontrado en la web`; para narrativa comercial conviene confirmar pricing real o rango por vertical.

### Referencias de inconsistencias
- docs/GRAFANA.md -> "1) Objetivo", "4) Importar dashboard CRM"
- Inventario de archivos en `docs/grafana/`
- docs/FRONTEND.md -> "8) Facturacion (resumen UI)"
- docs/SUPABASE.md -> "7) n8n webhook (envio de factura)"
- docs/N8N_STRIPE_WORKFLOWS.md -> "8) Notas tecnicas"
- docs/LEADS_OFFER_INPUTS_TEMPLATE.md -> "1) Catalogo de ofertas"

