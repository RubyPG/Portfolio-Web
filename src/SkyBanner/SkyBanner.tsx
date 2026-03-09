import { useEffect, useRef } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import skyBannerLayers from './layers'
import './SkyBanner.css'
import { withBasePath } from '../utils/base-path'

export type SkyBannerProps = {
  sunSrc?: string
  cloudsSrc?: string
  height?: string
  ariaLabel?: string
  className?: string
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor

function subscribeToMediaQuery(query: MediaQueryList, handler: (event?: MediaQueryListEvent) => void) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler)

    return () => query.removeEventListener('change', handler)
  }

  query.addListener(handler)

  return () => query.removeListener(handler)
}

function applyMotion(node: HTMLDivElement, x: number, y: number) {
  node.style.setProperty('--tilt-x', `${(x * 7).toFixed(2)}deg`)
  node.style.setProperty('--tilt-y', `${(y * -5.5).toFixed(2)}deg`)
  node.style.setProperty('--drift-x', x.toFixed(4))
  node.style.setProperty('--drift-y', y.toFixed(4))
}

export default function SkyBanner({
  sunSrc = '/images/sol.png',
  cloudsSrc = '/images/nubes.png',
  height = 'clamp(360px, 68vw, 760px)',
  ariaLabel = 'Interactive 3D sky banner',
  className = '',
}: SkyBannerProps) {
  const bannerRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number>(0)
  const motionRef = useRef({
    currentX: 0,
    currentY: 0,
    targetX: 0,
    targetY: 0,
    enabled: true,
  })

  const layerSources = {
    sun: withBasePath(sunSrc),
    clouds: withBasePath(cloudsSrc),
  } as const

  const scheduleFrame = () => {
    if (frameRef.current !== 0) {
      return
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0

      const node = bannerRef.current

      if (!node) {
        return
      }

      const motion = motionRef.current

      motion.currentX = lerp(motion.currentX, motion.targetX, 0.14)
      motion.currentY = lerp(motion.currentY, motion.targetY, 0.14)

      applyMotion(node, motion.currentX, motion.currentY)

      if (
        Math.abs(motion.currentX - motion.targetX) > 0.001 ||
        Math.abs(motion.currentY - motion.targetY) > 0.001
      ) {
        scheduleFrame()
      }
    })
  }

  useEffect(() => {
    const node = bannerRef.current

    if (!node) {
      return undefined
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarsePointerQuery = window.matchMedia('(pointer: coarse)')

    const syncMotionPreference = () => {
      const enabled = !reducedMotionQuery.matches && !coarsePointerQuery.matches

      motionRef.current.enabled = enabled
      motionRef.current.currentX = 0
      motionRef.current.currentY = 0
      motionRef.current.targetX = 0
      motionRef.current.targetY = 0

      node.dataset.motion = enabled ? 'on' : 'off'
      applyMotion(node, 0, 0)
    }

    syncMotionPreference()
    const unsubscribeReducedMotion = subscribeToMediaQuery(
      reducedMotionQuery,
      syncMotionPreference,
    )
    const unsubscribeCoarsePointer = subscribeToMediaQuery(
      coarsePointerQuery,
      syncMotionPreference,
    )

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (!motionRef.current.enabled) {
        return
      }

      const bounds = node.getBoundingClientRect()
      const insideX = event.clientX >= bounds.left && event.clientX <= bounds.right
      const insideY = event.clientY >= bounds.top && event.clientY <= bounds.bottom

      if (!insideX || !insideY) {
        if (motionRef.current.targetX !== 0 || motionRef.current.targetY !== 0) {
          updateTarget(0, 0)
        }
        return
      }

      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2

      updateTarget(x, y)
    }

    const handleWindowPointerLeave = () => {
      updateTarget(0, 0)
    }

    window.addEventListener('pointermove', handleWindowPointerMove, { passive: true })
    window.addEventListener('pointerleave', handleWindowPointerLeave)

    return () => {
      unsubscribeReducedMotion()
      unsubscribeCoarsePointer()
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerleave', handleWindowPointerLeave)

      if (frameRef.current !== 0) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const updateTarget = (x: number, y: number) => {
    if (!motionRef.current.enabled) {
      return
    }

    motionRef.current.targetX = clamp(x, -1, 1)
    motionRef.current.targetY = clamp(y, -1, 1)
    scheduleFrame()
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = bannerRef.current

    if (!node || !motionRef.current.enabled) {
      return
    }

    const bounds = node.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2

    updateTarget(x, y)
  }

  return (
    <div
      ref={bannerRef}
      className={`skybanner ${className}`.trim()}
      aria-label={ariaLabel}
      style={{ '--banner-height': height } as CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => updateTarget(0, 0)}
    >
      <div className="skybanner__viewport">
        <div className="skybanner__scene" aria-hidden="true">
          {skyBannerLayers.map((layer) => (
            <img
              key={layer.id}
              src={layerSources[layer.source]}
              alt=""
              aria-hidden="true"
              className={`skybanner__layer ${layer.className}`}
              style={{ '--depth': layer.depth } as CSSProperties}
              draggable={false}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
