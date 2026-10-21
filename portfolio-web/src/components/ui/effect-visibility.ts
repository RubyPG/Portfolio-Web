/** Watch exposure without treating every GSAP transform as a visibility change. */
export function observeEffectVisibility(
  container: HTMLElement,
  onChange: (exposed: boolean) => void,
  sceneLayer?: HTMLElement | null,
) {
  const nodes: HTMLElement[] = [container];
  for (let node = container.parentElement; node; node = node.parentElement)
    nodes.push(node);
  const inlineVisibility = (node: HTMLElement) =>
    `${node.style.visibility}|${node.style.display}|${node.style.contentVisibility}|${node.style.getPropertyValue?.("all") ?? ""}`;
  const styles = new Map(nodes.map((node) => [node, inlineVisibility(node)]));
  let previous: boolean | undefined;
  const refresh = () => {
    const next =
      !nodes.some((node) => node.hidden || node.inert) &&
      sceneLayer?.getAttribute("aria-hidden") !== "true" &&
      getComputedStyle(container).visibility !== "hidden";
    if (next === previous) return;
    previous = next;
    onChange(next);
  };
  const observer = new MutationObserver((records) => {
    let changed = false;
    for (const record of records) {
      if (record.attributeName !== "style") {
        changed = true;
        continue;
      }
      const node = record.target as HTMLElement;
      const next = inlineVisibility(node);
      if (styles.get(node) === next) continue;
      styles.set(node, next);
      changed = true;
    }
    if (changed) refresh();
  });
  for (const node of nodes)
    observer.observe(node, {
      attributes: true,
      attributeFilter: [
        "hidden",
        "inert",
        "class",
        "style",
        ...(node === sceneLayer ? ["aria-hidden"] : []),
      ],
    });
  refresh();
  return { refresh, destroy: () => observer.disconnect() };
}
