const BASE_URL = import.meta.env.BASE_URL || "/";
const BASE_PREFIX =
    BASE_URL === "/" ? "" : BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;

const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

export function withBasePath(path: string): string {
    if (!path) return path;
    if (
        ABSOLUTE_URL_PATTERN.test(path) ||
        path.startsWith("mailto:") ||
        path.startsWith("tel:") ||
        path.startsWith("#") ||
        path.startsWith("data:")
    ) {
        return path;
    }

    if (!path.startsWith("/")) {
        return path;
    }

    if (!BASE_PREFIX) {
        return path;
    }

    if (path === "/") {
        return `${BASE_PREFIX}/`;
    }

    if (path === BASE_PREFIX || path.startsWith(`${BASE_PREFIX}/`)) {
        return path;
    }

    return `${BASE_PREFIX}${path}`;
}

export function stripBasePath(pathname: string): string {
    if (!BASE_PREFIX || pathname === BASE_PREFIX) {
        return pathname === BASE_PREFIX ? "/" : pathname;
    }

    if (pathname.startsWith(`${BASE_PREFIX}/`)) {
        return pathname.slice(BASE_PREFIX.length) || "/";
    }

    return pathname;
}
