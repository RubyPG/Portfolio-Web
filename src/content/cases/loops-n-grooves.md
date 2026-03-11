---
caseSlug: "loops-n-grooves"
title: "Loops n' Grooves — Headless WP E-commerce (Frontend)"
summary: "Frontend e-commerce en Astro integrado con WordPress + WooCommerce en modo headless: catálogo real, filtros dinámicos desde ACF/meta_data y carrito en cliente."
type: "E-commerce"
year: "2025–2026"
status: "En curso"
role: "Frontend Engineer — UI, integración headless, estado de carrito y UX de catálogo"
stack:
  - "Astro v5.15.6"
  - "TypeScript"
  - "Tailwind CSS v4"
  - "WordPress (Headless)"
  - "WooCommerce API"
  - "React (WebGL 'Threads')"
tags:
  - "Astro"
  - "Headless"
  - "WooCommerce"
  - "E-commerce"
cover: "/projects/loopsngrooves/thumb.png"
links:
  demo: "https://loopsngrooves.com"
  repo: null
  docs: null
---

## Contexto

Loops n' Grooves es una tienda online de productos musicales digitales (loops, presets, etc.) construida como **frontend desacoplado** con **Astro** y backend en **WordPress + WooCommerce** en modo headless.

## Problema

En un e-commerce de catálogo real (no mock), el reto no es "pintar cards", sino:
- modelar datos inconsistentes (WooCommerce + ACF),
- crear filtros que se mantengan en sync con WordPress,
- y resolver UX de compra sin backend propio (carrito en cliente, feedback, no duplicados).

## Solución

Un frontend en Astro que consume **productos reales** desde WooCommerce en:
- `/loops` y `/bundles` con **paginación** correcta,
- extracción de campos ACF desde `meta_data` (bpm, key, preview_audio, 3d_model, author, tags…) y resolución automática de IDs ACF a URLs,
- carrito en `localStorage` con guardas anti-duplicado y modal informativo.

## Arquitectura

Piezas relevantes:
- `src/utils/woocommerce.ts`: cliente + mapeo WooCommerce → modelo UI.
- `src/utils/cart.ts`: carrito cliente (items/subtotal/eventos) persistente en `localStorage`.
- `src/pages/cart.astro`: render del carrito.
- `AlreadyInCartModal`: modal "ya en carrito" para evitar duplicados.
- Banners con efecto WebGL **Threads** (React Bits) personalizado (no reinstalar).

## Features clave

- **Catálogo real**: sin datos de prueba, directamente desde WooCommerce.
- **Filtros dinámicos**: opciones (tags/keys/categorías) obtenidas desde ACF y actualizadas cuando cambia WordPress.
- **Carrito sin duplicados**: si un producto ya está añadido, no se duplica y se muestra modal informativo.
- **Páginas dinámicas**: `prerender` desactivado en páginas clave para datos siempre actualizados en tiempo real.
- **CORS en dev**: proxy `/wp` en `astro.config.mjs` para assets de WP (ej. `.glb`).

## Retos y decisiones

- **Datos heterogéneos**: ACF en `meta_data` exige mapeo robusto y tolerante a campos ausentes.
- **UX de filtrado**: equilibrio entre filtrado client-side y paginación backend.
- **Carrito client-only**: consistencia y eventos (badge, modal, render) sin servidor propio.
- **Efectos WebGL**: mantener estética sin penalizar performance, y con adaptación a tema/tamaño.

## Resultados / impacto

- Frontend headless funcional sobre catálogo real con base sólida para escalar:
  - más filtros,
  - checkout externo,
  - auth/panel de usuario,
  - analítica.

## Aprendizajes

- El éxito de un headless e-commerce depende del "contrato de datos" y del mapeo.
- La UX del carrito (feedback, duplicados, persistencia) es core, aunque "sea client-only".

## Próximos pasos

- TODO: links demo/repo.
- Mejoras SEO: schema.org Product, paginación canónica, OG por producto.
- Roadmap checkout: integración pasarela o redirección.

## Galería

> TODO: sube capturas a `public/projects/loopsngrooves/` y enlázalas aquí.
