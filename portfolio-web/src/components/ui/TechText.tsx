"use client";

import { useEffect, useRef } from "react";
import { createTechText } from "./tech-text-engine";
import styles from "./TechText.module.css";

/** React Bits TechText, adapted to the portfolio's real, semantic typography. */
export function TechText({ text }: { text: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const source = textRef.current;
    const baseline = baselineRef.current;
    const canvas = canvasRef.current;
    if (!root || !source || !baseline || !canvas) return;
    return createTechText({ root, source, baseline, canvas });
  }, [text]);

  return (
    <span ref={rootRef} className={styles.word} data-tech-text>
      <span ref={textRef} className={styles.source}>
        {text}
      </span>
      <span ref={baselineRef} className={styles.baseline} aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </span>
  );
}
