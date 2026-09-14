/** Cuts a text at `max` code points with an ellipsis. */
export function clip(value: string, max: number): string {
  const points = [...value];
  return points.length > max
    ? `${points
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`
    : value;
}

/** Keeps the head and the tail of a long address: `bc1qw508d6qe…xw7kv8f3t4`. */
export function shorten(value: string, head = 12, tail = 10): string {
  return value.length > head + tail + 1 ? `${value.slice(0, head)}…${value.slice(-tail)}` : value;
}

/** A shell argument: single quotes unless the value is a plain word. */
export function shellArg(value: string): string {
  return /^[\w./:@-]+$/u.test(value) ? value : `'${value.replaceAll("'", `'\\''`)}'`;
}

/** Host and path of a URL for display: `etherscan.io`, `viewblock.io/arweave`. */
export function hostPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./u, "")}${parsed.pathname.replace(/\/$/u, "")}`;
  } catch {
    return url;
  }
}
