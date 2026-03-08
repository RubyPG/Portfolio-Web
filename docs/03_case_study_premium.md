# Case Study Premium

## 1) Problema y contexto
El proyecto aborda un problema tipico de operaciones comerciales: herramientas separadas para leads, clientes, facturacion, cobro y seguimiento, lo que introduce friccion operativa y dificulta el control de estado end-to-end. [Fuente: docs/FRONTEND.md -> "5) Leads (flujo actual)", "8) Facturacion (resumen UI)"; docs/N8N_STRIPE_WORKFLOWS.md -> "1) Objetivo"]

La meta explicitada en la documentacion es unificar CRM + billing con trazabilidad tecnica, integrando Stripe y Supabase, y habilitar metricas operativas en la propia app. [Fuente: docs/N8N_STRIPE_WORKFLOWS.md -> "1) Objetivo"; docs/SUPABASE.md -> "6) Views de metricas y KPIs"; docs/GRAFANA.md -> "1) Objetivo", "5) Hacerlo visible en iLead"]

## 2) Alcance y restricciones
- Plataforma principal: app desktop en Kotlin + Compose Multiplatform (JVM), modular (`core/*`, `feature/*`). [Fuente: docs/FRONTEND.md -> "1) Stack y alcance"]
- Configuracion por cliente en runtime (`client.json` + variables de entorno), con validacion de configuracion critica en arranque. [Fuente: docs/FRONTEND.md -> "3) Carga de configuracion"]
- Aislamiento por cliente a nivel de datos: un proyecto Supabase por cliente/build. [Fuente: docs/SUPABASE.md -> "1) Crear proyecto Supabase por cliente"]
- Restriccion funcional actual: Web preview embebida deshabilitada (sin WebView). [Fuente: docs/FRONTEND.md -> "6) Importacion y scraper"]
- Dependencia de configuracion externa para observabilidad y automatizaciones (Grafana, n8n, credenciales). [Fuente: docs/GRAFANA.md -> "3) Crear datasource PostgreSQL en Grafana Cloud"; docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "3) Prerrequisitos (una vez)"]

## 3) Arquitectura y decisiones clave
1. **UI orientada a productividad operativa**: tablas estilo hoja, filtros en header y edicion inline con autosave para reducir friccion en tareas repetitivas de ventas. [Fuente: docs/FRONTEND.md -> "4) Estado real de la UX", "5) Leads (flujo actual)"]
2. **Modelo de datos relacional con reglas de consistencia**: relaciones, triggers de recalculo y numeracion de factura para mantener integridad de billing. [Fuente: docs/SUPABASE.md -> "5) Tablas, relaciones y triggers clave"]
3. **Facturacion Opcion B (Stripe Invoicing oficial)**: prioriza trazabilidad y estados oficiales (`SENT`, `PAID`, `VOID`) via eventos `invoice.*`. [Fuente: docs/N8N_STRIPE_WORKFLOWS.md -> "1) Objetivo", "2) Workflows activos" (006/007), "6) Flujo Opcion B (recomendado)"]
4. **IA de recomendacion comercial con RAG**: analisis de website/PDF + consulta a vector store interno para sugerir oferta. [Fuente: docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "1) Que queda montado"; docs/SUPABASE.md -> "12) Campo \"que venderle\" + automatizacion n8n"]
5. **Observabilidad integrada en producto**: dashboard Grafana embebido y views SQL de KPIs para lectura operativa continua. [Fuente: docs/GRAFANA.md -> "5) Hacerlo visible en iLead"; docs/SUPABASE.md -> "6) Views de metricas y KPIs"]

## 4) Retos complejos y resolucion
### Reto 1: mantener consistencia de estado entre sistemas de pago y base de datos
- Riesgo: divergencia entre estado real de Stripe y estado mostrado en CRM.
- Resolucion: workflow dedicado a eventos de factura (`invoice.finalized/sent/paid/payment_failed/voided`) y actualizacion de `invoices` + `invoice_payments`. [Fuente: docs/N8N_STRIPE_WORKFLOWS.md -> "2) Workflows activos" (007)]
- Control adicional: anulacion solo si factura Stripe sigue `open`; si no, respuesta `invoice_not_open` con HTTP 409 para evitar acciones invalidas. [Fuente: docs/N8N_STRIPE_WORKFLOWS.md -> "2) Workflows activos" (005)]

### Reto 2: procesar recomendaciones IA en lote sin colisiones
- Riesgo: dos ejecuciones compitiendo por los mismos leads pendientes.
- Resolucion: RPC `claim_leads_offer_recommendation(batch_size)` y encadenado automatico de lotes hasta `processed=0`. [Fuente: docs/SUPABASE.md -> "12) Campo \"que venderle\" + automatizacion n8n"; docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "5) Configuracion minima del 008"]

### Reto 3: importar datos heterogeneos sin degradar calidad
- Riesgo: duplicados y sobrescrituras incorrectas al mezclar scraper + ficheros manuales.
- Resolucion: import con merge por claves jerarquicas (`id`, `google_maps_url`, `website`, `business_name`) y regla de sobrescritura solo con datos no vacios. [Fuente: docs/FRONTEND.md -> "5) Leads (flujo actual)"; docs/SUPABASE.md -> "13) Export/Import Leads (modelo iLead)"]

### Reto 4: hacer operable el sistema en entornos reales
- Riesgo: alto tiempo de soporte por errores de configuracion (Grafana/Supabase/credenciales).
- Resolucion: guias de troubleshooting con causas-raiz concretas (`Host URL`, pooler IPv4, keys, policies, views faltantes). [Fuente: docs/GRAFANA.md -> "6) Troubleshooting rapido"; docs/SUPABASE.md -> "9) Troubleshooting Supabase"]

## 5) Resultados y metricas
### Resultado verificable en `/docs`
- Se instrumentaron KPIs operativos listos para reporting: `leads_7d`, `leads_30d`, `clients_30d`, `conversion_30d_pct`, `revenue_month_cents`, `overdue_count`. [Fuente: docs/SUPABASE.md -> "6) Views de metricas y KPIs"]
- Se definio dashboard con 10 paneles (stats, series temporales y pie por estado) y refresco cada 30 segundos. [Fuente: docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json -> `panels`, `refresh`]
- Se estandarizo ciclo de factura de negocio (`DRAFT -> SENT -> PAID/VOID`) con sincronizacion por webhooks. [Fuente: docs/N8N_STRIPE_WORKFLOWS.md -> "6) Flujo Opcion B (recomendado)"]
- Se habilito procesamiento IA por lotes (default 20, rango 1..10000) para cubrir backlog sin bloqueo manual. [Fuente: docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "5) Configuracion minima del 008"]

### Gap actual
No hay cifras historicas publicadas de impacto (ej. ahorro de tiempo, uplift de conversion o ingreso incremental) dentro de `/docs`. [Fuente: revision completa de archivos en `docs/`]

## 6) Lecciones y evolucion futura
1. **Leccion**: la calidad de arquitectura ya permite medir impacto, pero falta cerrar el loop con KPIs de negocio antes/despues.
2. **Leccion**: la decision de Opcion B en Stripe reduce ambiguedad operativa y facilita auditoria de cobros.
3. **Leccion**: IA util en ventas requiere gobernanza de entradas (website/PDF + KB curada), no solo modelo.
4. **Evolucion propuesta**: publicar baseline y target por KPI (`conversion_30d_pct`, `overdue_count`, tiempo de ciclo DRAFT->PAID).
5. **Evolucion propuesta**: incorporar test de regresion para workflows n8n criticos (006/007/008/009) y SLAs de incidentes.

## Supuestos explicitos
- Se asume que tu rol cubrio de forma directa la mayoria de estas decisiones tecnicas; valida alcance real en entrevista. [Fuente: docs tecnicos describen sistema, no asignacion por persona]
- Se asume que la ausencia de metricas de negocio en docs implica que aun no estan consolidadas para storytelling externo. [Fuente: `docs/` no incluye reportes de resultados]

## Inconsistencia detectada
- `docs/GRAFANA.md` referencia `docs/grafana/ilead-crm-supabase-dashboard.json`, pero en el arbol actual solo existe `docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json`. [Fuente: docs/GRAFANA.md -> "1) Objetivo", "4) Importar dashboard CRM"; inventario real de archivos en `docs/grafana/`]

## EN (brief)
- Built a desktop-first CRM that connects lead ops, invoicing, and payment-state sync.
- Chose Stripe official invoicing (Option B) for traceability and legal-safe state handling.
- Added AI offer recommendation with RAG (website/PDF + internal vector KB).
- Implemented KPI instrumentation and embedded Grafana dashboards.
- Remaining gap: business outcome history is not yet documented; measurement foundations are ready.

