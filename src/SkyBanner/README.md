# SkyBanner Export Guide (Astro + React + TS + pnpm)

Este directorio contiene una version **lista para mover** del banner.

## Objetivo
Sustituir una imagen estatica del proyecto destino por un banner React interactivo (capas: `nubes -> sol -> nubes`).

## Usa Solo Esto
- `export/SkyBanner.tsx`
- `export/SkyBanner.css`
- `export/layers.ts`
- `export/index.ts`
- `public/sol.png` (de este proyecto)
- `public/nubes.png` (de este proyecto)

## Ignora Esto
- Todo `src/` de este proyecto (es solo demo local).
- `public/imagen.png` (no se usa en la version final).
- `dist/`, `node_modules/`, configuraciones de Vite de este repo.

## Integracion Exacta En Proyecto Objetivo
1. Copia archivos:
   - `export/SkyBanner.tsx` -> `src/components/SkyBanner/SkyBanner.tsx`
   - `export/SkyBanner.css` -> `src/components/SkyBanner/SkyBanner.css`
   - `export/layers.ts` -> `src/components/SkyBanner/layers.ts`
   - `export/index.ts` -> `src/components/SkyBanner/index.ts`
2. Copia assets:
   - `public/sol.png` -> `public/images/sol.png`
   - `public/nubes.png` -> `public/images/nubes.png`
3. Reemplaza la imagen actual en el componente objetivo por:

```tsx
import SkyBanner from '@/components/SkyBanner'

<SkyBanner
  sunSrc="/images/sol.png"
  cloudsSrc="/images/nubes.png"
  height="clamp(320px, 62vw, 720px)"
  ariaLabel="Background banner"
/>
```

4. Si el proyecto es Astro, usar isla React:

```astro
---
import SkyBanner from '@/components/SkyBanner/SkyBanner.tsx'
---

<SkyBanner
  client:load
  sunSrc="/images/sol.png"
  cloudsSrc="/images/nubes.png"
  height="clamp(320px, 62vw, 720px)"
/>
```

## Notas Tecnicas
- No necesita dependencias nuevas (solo React, ya presente en Astro al usar integracion React).
- El componente ya respeta `prefers-reduced-motion` y punteros tactiles.
- Si quieres que sea solo fondo sin interaccion, elimina `onPointerMove` y `onPointerLeave` de `SkyBanner.tsx`.

## Checklist Rapido
- [ ] Archivos `SkyBanner.*` + `layers.ts` copiados en `src/components/SkyBanner/`
- [ ] `sol.png` y `nubes.png` copiados a `public/images/`
- [ ] Imagen anterior reemplazada por `<SkyBanner ... />`
- [ ] Render en desktop y mobile validado
- [ ] `pnpm build` sin errores

## Instruccion Para Otra IA (copiar/pegar)
Implementa solo con estos archivos: `src/components/SkyBanner/{SkyBanner.tsx,SkyBanner.css,layers.ts,index.ts}` y assets `public/images/{sol.png,nubes.png}`.  
No uses archivos de demo del proyecto origen (`src/`, `dist/`, `public/imagen.png`).  
Reemplaza la imagen existente del hero/banner por `<SkyBanner client:load ... />` en Astro o `<SkyBanner ... />` en React.
