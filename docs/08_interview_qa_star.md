# Entrevista: 15 Preguntas Probables + Respuestas Modelo (STAR)

## Nota de uso
Respuestas redactadas como plantilla en primera persona. Sustituye `[dato pendiente]` con tus numeros reales donde aplique.

## 1) "Cuentame este proyecto en 1-2 minutos"
- **S**: Tenia un flujo comercial y de facturacion que debia operar de forma integrada dentro de una app desktop.
- **T**: Unificar leads, clientes, invoices, cobros y metricas sin perder trazabilidad.
- **A**: Estructure iLead con frontend modular, Supabase relacional, workflows n8n y sincronizacion Stripe por eventos.
- **R**: Quedo un flujo lead-to-cash operativo y medible, con KPIs listos para seguimiento.
- **Evidencia**: [docs/FRONTEND.md](D:/Dev/src/iLead/docs/FRONTEND.md) secciones "1", "5", "8"; [docs/N8N_STRIPE_WORKFLOWS.md](D:/Dev/src/iLead/docs/N8N_STRIPE_WORKFLOWS.md) seccion "6"; [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "6".

## 2) "Por que eligieron app desktop y no web?"
- **S**: El caso de uso principal era operacion diaria intensiva de tablas y cambios rapidos.
- **T**: Reducir friccion de uso para equipo comercial en tareas repetitivas.
- **A**: Implemente vistas tabulares tipo hoja, filtros en cabecera y edicion inline con autosave.
- **R**: Se optimizo velocidad operativa de la interfaz para tareas de cold calling y seguimiento.
- **Evidencia**: [docs/FRONTEND.md](D:/Dev/src/iLead/docs/FRONTEND.md) secciones "4" y "5".

## 3) "Que decision de arquitectura fue mas importante?"
- **S**: El producto crecia en features heterogeneas (leads, facturacion, metricas).
- **T**: Evitar deuda por acoplamiento fuerte entre modulos.
- **A**: Use arquitectura por modulos `core/* + feature/*` y configuracion runtime por `client.json`.
- **R**: La base permitio evolucion por cliente sin duplicar codigo base.
- **Evidencia**: [docs/FRONTEND.md](D:/Dev/src/iLead/docs/FRONTEND.md) secciones "1", "2", "3"; [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "1".

## 4) "Que trade-off tomaste en billing?"
- **S**: Habia dos caminos: checkout como flujo principal u optar por factura oficial Stripe.
- **T**: Maximizar trazabilidad legal y operativa.
- **A**: Priorice Opcion B (create/finalize invoice oficial + eventos `invoice.*`).
- **R**: Logramos sincronizar `SENT/PAID/VOID` con mas claridad de auditoria.
- **Evidencia**: [docs/N8N_STRIPE_WORKFLOWS.md](D:/Dev/src/iLead/docs/N8N_STRIPE_WORKFLOWS.md) secciones "1", "2", "6".

## 5) "Como evitaste inconsistencias de estado con Stripe?"
- **S**: El riesgo era que CRM y Stripe mostraran estados distintos.
- **T**: Garantizar consistencia de estado y manejo de anulaciones validas.
- **A**: Separe workflows de emision, envio y eventos; en void valide estado `open` y devolvi 409 si no procedia.
- **R**: Evite anulaciones forzadas y mantuve integridad de estados en Supabase.
- **Evidencia**: [docs/N8N_STRIPE_WORKFLOWS.md](D:/Dev/src/iLead/docs/N8N_STRIPE_WORKFLOWS.md) workflow "005" y "007".

## 6) "Como controlaste duplicados y calidad de datos en leads?"
- **S**: Entraban leads por scraper y por importaciones manuales.
- **T**: Reimportar sin crear ruido ni perder datos utiles.
- **A**: Defini merge por orden de matching (`id`, `google_maps_url`, `website`, `business_name`) y overwrite solo con campos no vacios.
- **R**: Se habilito un proceso de carga repetible y mas confiable.
- **Evidencia**: [docs/FRONTEND.md](D:/Dev/src/iLead/docs/FRONTEND.md) seccion "5"; [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "13".

## 7) "Como escalaste la automatizacion IA sin pisarte registros?"
- **S**: Procesar leads en lote puede generar colisiones entre ejecuciones.
- **T**: Asegurar procesamiento concurrente sin doble asignacion.
- **A**: Use RPC `claim_leads_offer_recommendation(batch_size)` y encadenado de lotes desde app hasta `processed=0`.
- **R**: El flujo IA quedo apto para vaciar cola de pendientes de forma controlada.
- **Evidencia**: [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "12"; [docs/N8N_LEADS_OFFER_RECOMMENDATION.md](D:/Dev/src/iLead/docs/N8N_LEADS_OFFER_RECOMMENDATION.md) seccion "5".

## 8) "Que hiciste para medir impacto y no solo entregar features?"
- **S**: Sin metricas, no hay forma de priorizar mejoras con rigor.
- **T**: Instrumentar KPIs operativos dentro del producto.
- **A**: Cree views de metricas en Supabase y dashboard Grafana embebido en modulo Metrics.
- **R**: Quedo trazabilidad de conversion, revenue y vencidas; pendiente publicar historico antes/despues.
- **Evidencia**: [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "6"; [docs/GRAFANA.md](D:/Dev/src/iLead/docs/GRAFANA.md) secciones "4.1" y "5".

## 9) "Dame un ejemplo de troubleshooting complejo"
- **S**: En configuracion Grafana aparecian errores tipo `invalid URL` o `Tenant or user not found`.
- **T**: Restablecer conectividad estable con Supabase desde Grafana Cloud.
- **A**: Documente formato exacto de Host (`host:port`), username `postgres.<project_ref>` y uso de pooler IPv4 `:6543`.
- **R**: Se redujo la ambiguedad de diagnostico en onboarding tecnico.
- **Evidencia**: [docs/GRAFANA.md](D:/Dev/src/iLead/docs/GRAFANA.md) secciones "3" y "6".

## 10) "Como manejaste seguridad y secretos?"
- **S**: El proyecto depende de credenciales de Supabase, Stripe, OpenAI, SES y Grafana.
- **T**: Minimizar exposicion y riesgos operativos.
- **A**: Centralice configuracion en credenciales/nodos y documente rotacion de passwords compartidas.
- **R**: Se establecio una practica explicita de higiene de secretos.
- **Evidencia**: [docs/N8N_LEADS_OFFER_RECOMMENDATION.md](D:/Dev/src/iLead/docs/N8N_LEADS_OFFER_RECOMMENDATION.md) seccion "3"; [docs/GRAFANA.md](D:/Dev/src/iLead/docs/GRAFANA.md) seccion "7".

## 11) "Como demuestras liderazgo tecnico sin ser manager formal?"
- **S**: Habia multiples capas tecnicas con alta dependencia entre si.
- **T**: Coordinar decisiones para que frontend, datos y automatizaciones convergieran.
- **A**: Defini contratos (payloads/eventos/estados), secuencia SQL y guias de integracion/troubleshooting.
- **R**: El sistema quedo desplegable y operable con menor friccion de handoff.
- **Evidencia**: [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) secciones "2", "7", "12"; [docs/N8N_STRIPE_WORKFLOWS.md](D:/Dev/src/iLead/docs/N8N_STRIPE_WORKFLOWS.md) secciones "3" y "5".

## 12) "Que priorizaste cuando no podias hacerlo todo a la vez?"
- **S**: Habia backlog simultaneo en UX, billing, IA y metricas.
- **T**: Priorizar lo que desbloqueaba operacion real primero.
- **A**: Ordene por impacto operativo: flujo core de Leads/Invoices, despues consistencia billing, luego IA y finalmente refinamiento de observabilidad.
- **R**: Se aseguro continuidad de negocio mientras se agregaban capacidades avanzadas.
- **Evidencia**: secuencia funcional visible en [docs/FRONTEND.md](D:/Dev/src/iLead/docs/FRONTEND.md), [docs/N8N_STRIPE_WORKFLOWS.md](D:/Dev/src/iLead/docs/N8N_STRIPE_WORKFLOWS.md), [docs/N8N_LEADS_OFFER_RECOMMENDATION.md](D:/Dev/src/iLead/docs/N8N_LEADS_OFFER_RECOMMENDATION.md), [docs/GRAFANA.md](D:/Dev/src/iLead/docs/GRAFANA.md).

## 13) "No veo KPIs de resultado final. Como respondes?"
- **S**: La documentacion tecnica define metricas, pero no publica historicos de negocio.
- **T**: Ser transparente sin debilitar credibilidad.
- **A**: Explico que instrumente la capa de medicion y presento plan para cerrar baseline/target con datos reales.
- **R**: Convierto una objecion en hoja de ruta accionable y medible.
- **Evidencia**: [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "6"; dashboard en [docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json](D:/Dev/src/iLead/docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json).

## 14) "Que haria distinto si rehicieras una parte?"
- **S**: El sistema tiene alta dependencia de configuracion manual (datasource, credenciales, import de workflows).
- **T**: Reducir tiempo de setup y riesgo humano.
- **A**: Priorizaria automatizar provisioning (scripts de validacion pre-flight y checklist ejecutable) y pruebas de humo por flujo critico.
- **R**: Esperaria menor tiempo de onboarding y menos incidencias de configuracion.
- **Evidencia**: complejidad de setup en [docs/GRAFANA.md](D:/Dev/src/iLead/docs/GRAFANA.md) secciones "3-5" y [docs/N8N_LEADS_OFFER_RECOMMENDATION.md](D:/Dev/src/iLead/docs/N8N_LEADS_OFFER_RECOMMENDATION.md) secciones "3-5".

## 15) "Que haras en los proximos 6 meses para multiplicar impacto?"
- **S**: La base tecnica esta lista, falta consolidar ROI historico y escala de adopcion.
- **T**: Convertir capacidades tecnicas en evidencia de negocio repetible.
- **A**: Definir baseline por KPI (`conversion_30d_pct`, `overdue_count`, tiempo DRAFT->PAID), crear cuadro de mando semanal y cerrar experimentos de mejora.
- **R**: Esperaria una narrativa de impacto cuantificado apta para negocio e inversion.
- **Evidencia**: [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "6"; flujo de estados en [docs/N8N_STRIPE_WORKFLOWS.md](D:/Dev/src/iLead/docs/N8N_STRIPE_WORKFLOWS.md) seccion "6".

