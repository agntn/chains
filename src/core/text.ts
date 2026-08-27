/** Guards caller text passes through before any surface prints it. */

/** Blanks every character that steers rendering instead of carrying content. */
export function stripControlCharacters(text: string): string {
  return text.replaceAll(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ");
}

/** Quotes caller input, because a raw newline in an address writes its own answer line. */
export function quoted(value: string): string {
  return stripControlCharacters(JSON.stringify(value));
}
