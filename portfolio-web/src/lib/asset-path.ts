/** Public files need the deployment prefix as well as Next.js routes. */
export function assetPath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
