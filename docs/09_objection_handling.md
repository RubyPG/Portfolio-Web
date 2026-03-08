# Objection Handling (8 dudas + respuesta con evidencia)

## 1) "Parece mucho stack. No sera sobre-ingenieria?"
- **Riesgo percibido**: complejidad innecesaria.
- **Respuesta**: el stack responde a necesidades distintas del flujo lead-to-cash: UI operativa desktop, datos transaccionales, automatizacion de integraciones y analitica embebida.
- **Evidencia**: [docs/FRONTEND.md](D:/Dev/src/iLead/docs/FRONTEND.md) secciones "1", "5", "8"; [docs/N8N_STRIPE_WORKFLOWS.md](D:/Dev/src/iLead/docs/N8N_STRIPE_WORKFLOWS.md) seccion "2"; [docs/GRAFANA.md](D:/Dev/src/iLead/docs/GRAFANA.md) seccion "1".

## 2) "No veo impacto de negocio cuantificado"
- **Riesgo percibido**: ausencia de resultados.
- **Respuesta**: es correcto que `/docs` no publica historicos; lo solido es que ya existe instrumentacion de KPIs y dashboard listo para reportar baseline/objetivos.
- **Evidencia**: [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "6"; [docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json](D:/Dev/src/iLead/docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json).

## 3) "La facturacion puede quedar inconsistente entre app y Stripe"
- **Riesgo percibido**: errores financieros.
- **Respuesta**: se separaron workflows de emision/envio/eventos y se sincronizan estados por webhooks `invoice.*`; ademas, `void` esta restringido a facturas `open`.
- **Evidencia**: [docs/N8N_STRIPE_WORKFLOWS.md](D:/Dev/src/iLead/docs/N8N_STRIPE_WORKFLOWS.md) workflows "005", "006", "007".

## 4) "La IA puede recomendar mal o alucinar"
- **Riesgo percibido**: baja confiabilidad comercial.
- **Respuesta**: la recomendacion no depende solo del LLM; combina website/PDF con KB interna en vector store y reglas de negocio explicitas para limitar salidas fuera de foco.
- **Evidencia**: [docs/N8N_LEADS_OFFER_RECOMMENDATION.md](D:/Dev/src/iLead/docs/N8N_LEADS_OFFER_RECOMMENDATION.md) seccion "1"; [docs/LEADS_OFFER_INPUTS_TEMPLATE.md](D:/Dev/src/iLead/docs/LEADS_OFFER_INPUTS_TEMPLATE.md) seccion "4".

## 5) "Importar datos desde muchos formatos rompe la calidad"
- **Riesgo percibido**: duplicados y datos corruptos.
- **Respuesta**: el import soporta merge por claves jerarquicas y evita sobrescribir con vacios; ademas reporta creados/actualizados/fallidos.
- **Evidencia**: [docs/FRONTEND.md](D:/Dev/src/iLead/docs/FRONTEND.md) secciones "5" y "6"; [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "13".

## 6) "Depende demasiado de configuracion manual"
- **Riesgo percibido**: onboarding lento.
- **Respuesta**: el riesgo existe, pero esta mitigado con playbooks paso a paso y troubleshooting detallado; siguiente mejora natural es automatizar checks pre-flight.
- **Evidencia**: [docs/GRAFANA.md](D:/Dev/src/iLead/docs/GRAFANA.md) secciones "3-6"; [docs/N8N_LEADS_OFFER_RECOMMENDATION.md](D:/Dev/src/iLead/docs/N8N_LEADS_OFFER_RECOMMENDATION.md) secciones "3-5".

## 7) "Como garantizan aislamiento entre clientes?"
- **Riesgo percibido**: fuga de datos entre tenants.
- **Respuesta**: la pauta operativa documentada es 1 proyecto Supabase por cliente/build, con configuracion dedicada por `client.json`.
- **Evidencia**: [docs/SUPABASE.md](D:/Dev/src/iLead/docs/SUPABASE.md) seccion "1"; [docs/FRONTEND.md](D:/Dev/src/iLead/docs/FRONTEND.md) seccion "3".

## 8) "La documentacion tiene inconsistencias, puedo confiar?"
- **Riesgo percibido**: baja confiabilidad documental.
- **Respuesta**: hay una inconsistencia puntual en nombre de archivo de dashboard Grafana; se identifica explicitamente y se recomienda normalizar para evitar friccion.
- **Evidencia**: [docs/GRAFANA.md](D:/Dev/src/iLead/docs/GRAFANA.md) secciones "1" y "4" vs inventario real `docs/grafana/ilead-crm-supabase-dashboard-fixed-supabase-crm.json`.

