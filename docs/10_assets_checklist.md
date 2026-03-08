# Assets para Portfolio: Checklist Priorizada

## Prioridad P0 (imprescindible para entrevistas)
| Prioridad | Asset | Claim que respalda | Evidencia visual concreta | Fuente base |
|---|---|---|---|---|
| P0 | Mapa de arquitectura (1 slide) | Perfil full-stack product engineer y ownership end-to-end | Diagrama con bloques: Desktop App, Supabase, n8n, Stripe, Grafana, flujos de datos | docs/FRONTEND.md (1), docs/SUPABASE.md (2,5), docs/N8N_STRIPE_WORKFLOWS.md (2), docs/GRAFANA.md (1) |
| P0 | Captura de Leads table + inline edit | Optimizacion operativa y menos friccion | Screenshot con columnas `Negocio/Telefono/Estado/Comercial`, dropdown inline y nota contador | docs/FRONTEND.md (4,5) |
| P0 | Video corto (60-90s) flujo lead->cliente->factura | Ownership de flujo completo | Demo: editar lead, convertir a cliente, emitir factura, ver estado en UI | docs/FRONTEND.md (5,8), docs/N8N_STRIPE_WORKFLOWS.md (6) |
| P0 | Evidencia Stripe Option B | Decisiones tecnicas maduras en billing | Capturas de `Billing > Invoices`, `invoice.sent`/`invoice.paid` y registro en Supabase | docs/N8N_STRIPE_WORKFLOWS.md (2,6,7), docs/SUPABASE.md (8) |
| P0 | Dashboard Metrics embebido | Cultura de medicion y operacion por KPIs | Captura de paneles `Conversion (30d)`, `Revenue mes`, `Facturas vencidas` en modulo Metrics | docs/GRAFANA.md (5), docs/SUPABASE.md (6), docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json |

## Prioridad P1 (diferenciadores fuertes)
| Prioridad | Asset | Claim que respalda | Evidencia visual concreta | Fuente base |
|---|---|---|---|---|
| P1 | Flujo IA "Que venderle" (diagrama + screenshot workflow 008) | IA aplicada a negocio con RAG | Nodo `AI Agent` conectado a `OpenAI Chat Model` y `Supabase Vector Store Tool` | docs/N8N_LEADS_OFFER_RECOMMENDATION.md (1) |
| P1 | Evidencia de ingestion KB (workflow 009 + tabla) | Gobernanza de conocimiento interno | Screenshot carpeta Drive + ejecucion n8n + filas en `ilead_kb_documents` | docs/N8N_LEADS_OFFER_RECOMMENDATION.md (1,4) |
| P1 | Captura de panel de import con progreso | Calidad de datos y operacion robusta | Barra `X/Y`, conteos `Creados/Actualizados/Fallidos`, cierre de panel | docs/FRONTEND.md (6), docs/SUPABASE.md (13) |
| P1 | Before/After de estado de factura | Impacto operativo en trazabilidad | Secuencia visual `DRAFT -> SENT -> PAID/VOID` en app + DB | docs/N8N_STRIPE_WORKFLOWS.md (6), docs/SUPABASE.md (7,8) |
| P1 | Configuracion por cliente (client.json anonimizado) | Escalabilidad por cliente/tenant | Captura de `supabaseUrl`, `supabaseAnonKey`, `grafanaDashboardUrl`, `N8N_*` | docs/FRONTEND.md (3), docs/SUPABASE.md (1), docs/GRAFANA.md (5) |

## Prioridad P2 (refuerzo de credibilidad)
| Prioridad | Asset | Claim que respalda | Evidencia visual concreta | Fuente base |
|---|---|---|---|---|
| P2 | Troubleshooting playbook (1 pagina) | Madurez operativa y reduccion de MTTR | Tabla problema -> causa -> fix (Grafana URL, pooler, 401/403, storage policies) | docs/GRAFANA.md (6), docs/SUPABASE.md (9), docs/FRONTEND.md (9) |
| P2 | SQL snippet de views KPI | Solidez de capa de medicion | Captura de ejecucion `select * from v_dashboard_metrics` y resultado real | docs/GRAFANA.md (4.1), docs/SUPABASE.md (6) |
| P2 | Captura de reglas de negocio IA | Control de riesgo de recomendacion | Fragmento de reglas duras (no inventar precios, no prometer servicios fuera de foco) | docs/LEADS_OFFER_INPUTS_TEMPLATE.md (4) |

## Checklist de produccion de assets (accionable)
1. Anonimizar datos sensibles (emails, keys, IDs de proyecto) antes de capturar.
2. Grabar demo unica de 90 segundos con recorrido lineal: Lead -> IA -> Cliente -> Factura -> Metrics.
3. Preparar una slide de arquitectura y una slide de impacto (con KPIs reales cuando los tengas).
4. Adjuntar 1 evidencia por claim principal en CV/LinkedIn para sostener narrativa en entrevista.

