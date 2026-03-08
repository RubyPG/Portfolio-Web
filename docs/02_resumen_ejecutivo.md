# Resumen Ejecutivo

## ES (impacto, 158 palabras)
iLead consolida en una sola plataforma el ciclo operativo comercial completo: gestion de leads, conversion a cliente, facturacion y seguimiento de cobro con sincronizacion de estados entre Supabase y Stripe. [Fuente: docs/FRONTEND.md -> "5) Leads (flujo actual)", "8) Facturacion (resumen UI)"; docs/N8N_STRIPE_WORKFLOWS.md -> "6) Flujo Opcion B (recomendado)"]

La implementacion combina una app desktop modular en Kotlin + Compose con automatizaciones n8n y un modelo de datos en Supabase preparado para trazabilidad (tablas relacionales, triggers de totales, numeracion de factura y log de envio). [Fuente: docs/FRONTEND.md -> "1) Stack y alcance"; docs/SUPABASE.md -> "5) Tablas, relaciones y triggers clave", "7) n8n webhook (envio de factura)"]

A nivel de diferenciacion, el proyecto incorpora IA aplicada a negocio (recomendacion de oferta con RAG sobre web/PDF + conocimiento interno) y observabilidad embebida en producto con KPIs operativos y dashboard Grafana. [Fuente: docs/N8N_LEADS_OFFER_RECOMMENDATION.md -> "1) Que queda montado"; docs/SUPABASE.md -> "12) Campo \"que venderle\" + automatizacion n8n", "6) Views de metricas y KPIs"; docs/GRAFANA.md -> "5) Hacerlo visible en iLead"]

No hay en `/docs` resultados historicos (ej. % conversion real o ingresos), pero si infraestructura de medicion para reportarlos con evidencia. [Fuente: docs/SUPABASE.md -> "6) Views de metricas y KPIs"; docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json -> paneles de metricas]

## EN (brief)
iLead unifies lead operations, client conversion, invoicing, and payment-state synchronization in one product stack. It combines desktop delivery (Kotlin/Compose), workflow automation (n8n), and structured data governance (Supabase + Stripe webhooks), plus AI-driven offer recommendation and embedded KPI dashboards. Business KPI history is not documented yet, but measurement infrastructure is already in place.

