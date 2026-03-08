# Elevator Pitch

## Supuesto de uso
Textos en primera persona para entrevista. Ajusta ownership exacto segun tu rol real. [Fuente: `/docs` no incluye asignacion formal por persona]

## 30 segundos (ES)
Lidere el desarrollo de iLead como plataforma comercial desktop: gestione leads, conversion a cliente y facturacion con Stripe dentro de un flujo unico. La clave fue combinar UX operativa de alta velocidad (edicion inline/autosave) con automatizaciones n8n y una base de datos en Supabase preparada para trazabilidad. Ademas, incorporamos recomendacion IA de oferta y un modulo de metricas embebido con Grafana para operar con datos, no con intuicion. [Fuente: docs/FRONTEND.md -> "4) Estado real de la UX", "5) Leads (flujo actual)", "8) Facturacion (resumen UI)"; docs/N8N_STRIPE_WORKFLOWS.md -> "1) Objetivo", "6) Flujo Opcion B (recomendado)"; docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "1) Que queda montado"; docs/GRAFANA.md -> "5) Hacerlo visible en iLead"]

## 90 segundos (ES)
En iLead resolvi un problema clasico: ventas, facturacion y cobro estaban fragmentados y eso dificulta escalar operacion. Construimos una app desktop modular en Kotlin + Compose, con tablas estilo hoja para que el equipo comercial haga cambios en segundos y sin friccion. En paralelo, estructure Supabase con relaciones y triggers para mantener consistencia en invoices, y conecte n8n con Stripe para reflejar estados reales (`SENT`, `PAID`, `VOID`) por webhooks.

Un diferenciador fuerte fue la automatizacion de "que venderle": workflow IA que analiza website/PDF y consulta una knowledge base interna en vector store, procesando leads por lotes sin colisiones. Finalmente, dejamos KPIs y dashboard embebido para monitorear conversion, revenue y vencidas. Resultado: una base tecnica lista para crecer y para demostrar impacto con datos operativos. [Fuente: docs/FRONTEND.md -> "1) Stack y alcance", "4) Estado real de la UX"; docs/SUPABASE.md -> "5) Tablas, relaciones y triggers clave", "6) Views de metricas y KPIs", "12) Campo \"que venderle\" + automatizacion n8n"; docs/N8N_STRIPE_WORKFLOWS.md -> "2) Workflows activos", "6) Flujo Opcion B (recomendado)"; docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "1) Que queda montado", "5) Configuracion minima del 008"]

## 2 minutos (ES)
Mi enfoque en iLead fue tratar el producto como sistema completo, no como features sueltas. Empezamos por la capa operativa: Leads, Clients e Invoices en UI tabular con filtros directos, cambios inline y guardado automatico para reducir coste de ejecucion diario. Despues cerramos la capa de datos en Supabase con esquema relacional, triggers y storage de facturas para garantizar integridad y trazabilidad.

En billing, tome una decision estrategica: usar Stripe Invoicing oficial (Opcion B) en lugar de depender solo de checkout. Eso nos dio ciclo formal de factura, links oficiales, sincronizacion por eventos `invoice.*` y una anulacion controlada que evita estados invalidos. En paralelo, integramos scraper e import/export con merge multiclave para mantener calidad de datos cuando entran leads desde fuentes distintas.

El siguiente salto fue IA aplicada a negocio real: recomendacion de oferta basada en website/PDF + conocimiento interno en vector store, con RPC de claim para procesar lotes sin pisarse. Y para operar con disciplina, incrustamos Grafana en el modulo Metrics y definimos KPIs de conversion, revenue y overdue.

Hoy la plataforma esta lista para escalar por cliente porque la configuracion es runtime y cada cliente puede vivir en su propio proyecto Supabase. El gap que estoy cerrando ahora para storytelling de negocio es publicar historicos antes/despues de esos KPIs. [Fuente: docs/FRONTEND.md -> "3) Carga de configuracion", "4) Estado real de la UX", "6) Importacion y scraper"; docs/SUPABASE.md -> "1) Crear proyecto Supabase por cliente", "5) Tablas, relaciones y triggers clave", "6) Views de metricas y KPIs", "13) Export/Import Leads (modelo iLead)"; docs/N8N_STRIPE_WORKFLOWS.md -> "6) Flujo Opcion B (recomendado)", "2) Workflows activos" (005/006/007); docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "1) Que queda montado"; docs/GRAFANA.md -> "5) Hacerlo visible en iLead"]

## EN (brief)
I built iLead as a full lead-to-cash product system: desktop CRM workflows, Stripe invoice-state automation, AI-assisted offer recommendation (RAG), and embedded KPI dashboards. The technical foundation is strong and measurable; the remaining storytelling gap is publishing historical business outcomes from those KPIs.

