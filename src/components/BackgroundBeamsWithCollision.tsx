import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '../lib/utils';

interface BackgroundBeamsWithCollisionProps {
  className?: string;
  children?: React.ReactNode;
}

interface BeamOptions {
  x: number;
  duration: number;
  delay: number;
  repeatDelay: number;
  className?: string;
}

const beams: BeamOptions[] = [
  { x: 6, duration: 5.2, delay: 0, repeatDelay: 1.8 },
  { x: 12, duration: 4.6, delay: 0.2, repeatDelay: 2.6, className: 'h-8' },
  { x: 19, duration: 5.8, delay: 0.45, repeatDelay: 2.1 },
  { x: 27, duration: 4.9, delay: 0.6, repeatDelay: 2.8, className: 'h-14' },
  { x: 34, duration: 5.4, delay: 0.9, repeatDelay: 1.9 },
  { x: 42, duration: 6.1, delay: 1.15, repeatDelay: 2.7, className: 'h-20' },
  { x: 51, duration: 5, delay: 1.35, repeatDelay: 2.2 },
  { x: 59, duration: 4.7, delay: 1.55, repeatDelay: 2.9, className: 'h-8' },
  { x: 67, duration: 5.7, delay: 1.8, repeatDelay: 2.1 },
  { x: 74, duration: 4.8, delay: 2.05, repeatDelay: 2.8, className: 'h-14' },
  { x: 81, duration: 5.4, delay: 2.3, repeatDelay: 1.8 },
  { x: 88, duration: 6.2, delay: 2.55, repeatDelay: 2.6, className: 'h-20' },
  { x: 94, duration: 5.1, delay: 2.8, repeatDelay: 2.2 }
];

export const BackgroundBeamsWithCollision = ({
  children,
  className
}: BackgroundBeamsWithCollisionProps) => {
  const collisionRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [travelDistance, setTravelDistance] = useState(1800);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const updateTravelDistance = () => {
      const nextHeight = parent.getBoundingClientRect().height;
      setTravelDistance(Math.max(Math.ceil(nextHeight) + 320, 1600));
    };

    updateTravelDistance();

    const resizeObserver = new ResizeObserver(updateTravelDistance);
    resizeObserver.observe(parent);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={parentRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden bg-transparent',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.18),transparent_56%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_35%,rgba(255,255,0,0.08),transparent_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(17,17,17,0)_0%,rgba(17,17,17,0.18)_34%,rgba(10,10,10,0.75)_100%)]" />

      {!reduceMotion &&
        beams.map((beam) => (
          <CollisionBeam
            key={`beam-${beam.x}`}
            beamOptions={beam}
            collisionRef={collisionRef}
            parentRef={parentRef}
            travelDistance={travelDistance}
          />
        ))}

      <div
        ref={collisionRef}
        className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-secondary/35 to-transparent"
      />

      {children ? <div className="relative z-10 h-full w-full">{children}</div> : null}
    </div>
  );
};

const CollisionBeam = ({
  beamOptions,
  collisionRef,
  parentRef,
  travelDistance
}: {
  collisionRef: React.RefObject<HTMLDivElement | null>;
  parentRef: React.RefObject<HTMLDivElement | null>;
  travelDistance: number;
  beamOptions: BeamOptions;
}) => {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({
    detected: false,
    coordinates: null
  });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  useEffect(() => {
    const checkCollision = () => {
      if (
        !beamRef.current ||
        !collisionRef.current ||
        !parentRef.current ||
        cycleCollisionDetected
      ) {
        return;
      }

      const beamRect = beamRef.current.getBoundingClientRect();
      const collisionRect = collisionRef.current.getBoundingClientRect();
      const parentRect = parentRef.current.getBoundingClientRect();

      if (beamRect.bottom >= collisionRect.top) {
        const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
        const relativeY = beamRect.bottom - parentRect.top;

        setCollision({
          detected: true,
          coordinates: {
            x: relativeX,
            y: relativeY
          }
        });
        setCycleCollisionDetected(true);
      }
    };

    const animationInterval = window.setInterval(checkCollision, 40);
    return () => window.clearInterval(animationInterval);
  }, [collisionRef, cycleCollisionDetected, parentRef, travelDistance]);

  useEffect(() => {
    if (!collision.detected) return;

    const clearCollisionTimer = window.setTimeout(() => {
      setCollision({ detected: false, coordinates: null });
      setCycleCollisionDetected(false);
    }, 1200);

    const resetBeamTimer = window.setTimeout(() => {
      setBeamKey((prevKey) => prevKey + 1);
    }, 1350);

    return () => {
      window.clearTimeout(clearCollisionTimer);
      window.clearTimeout(resetBeamTimer);
    };
  }, [collision.detected]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        className={cn(
          'absolute top-0 z-[1] w-px rounded-full bg-gradient-to-b from-transparent via-secondary/90 to-accent/90 opacity-80 shadow-[0_0_20px_rgba(59,130,246,0.28)]',
          beamOptions.className
        )}
        style={{
          left: `${beamOptions.x}%`,
          height: beamOptions.className?.includes('h-20')
            ? '5rem'
            : beamOptions.className?.includes('h-14')
              ? '3.5rem'
              : beamOptions.className?.includes('h-8')
                ? '2rem'
                : '3rem'
        }}
        initial={{
          translateY: -280,
          opacity: 0
        }}
        animate={{
          translateY: travelDistance,
          opacity: [0, 0.95, 0.95]
        }}
        transition={{
          duration: beamOptions.duration,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'loop',
          ease: 'linear',
          delay: beamOptions.delay,
          repeatDelay: beamOptions.repeatDelay
        }}
      />

      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            style={{
              left: `${collision.coordinates.x}px`,
              top: `${collision.coordinates.y}px`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const Explosion = ({ className, ...props }: React.HTMLProps<HTMLDivElement>) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        directionX: Math.floor(Math.random() * 90 - 45),
        directionY: Math.floor(Math.random() * -55 - 12)
      })),
    []
  );

  return (
    <div
      {...props}
      className={cn('absolute z-[2] h-2 w-2', className)}
    >
      <motion.div
        className="absolute -inset-x-12 top-0 m-auto h-2 w-24 rounded-full bg-gradient-to-r from-transparent via-secondary/80 to-transparent blur-sm"
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{ opacity: 1, scaleX: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute -inset-4 rounded-full bg-accent/30 blur-md"
        initial={{ opacity: 0, scale: 0.2 }}
        animate={{ opacity: 0.7, scale: 1.05 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute h-1.5 w-1.5 rounded-full bg-gradient-to-b from-accent to-secondary"
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: particle.directionX,
            y: particle.directionY,
            opacity: 0,
            scale: 0.3
          }}
          transition={{
            duration: Math.random() * 0.8 + 0.45,
            ease: 'easeOut'
          }}
        />
      ))}
    </div>
  );
};

export default BackgroundBeamsWithCollision;
