/** Physical-pixel geometry shared by all nine diagonal strips in the shader. */
export function getPatternWaveBands(width: number, height: number) {
  const angle = (24 * Math.PI) / 180;
  const sine = Math.sin(angle);
  const cosine = Math.cos(angle);
  return {
    // WebGL's y axis points up: this is down-right in CSS coordinates.
    direction: [sine, -cosine],
    normal: [cosine, sine],
    span: width * cosine + height * sine,
    // Greater than the viewport's whole projection on the direction axis.
    travel: height * cosine + width * sine + 2,
  };
}
