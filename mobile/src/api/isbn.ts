/** ISBN со штрихкода: проверка контрольной цифры и приведение к ISBN-13 (так же, как lib/isbn.ts на сервере). */
export function normalizeISBN(input: string): string | null {
  let s = input.toUpperCase();
  if (s.startsWith("ISBN")) s = s.slice(4);
  const chars = s.replace(/[ \-:]/g, "");
  const digits = [...chars].filter((c) => c >= "0" && c <= "9").map(Number);

  if (chars.length === 13 && digits.length === 13 && (chars.startsWith("978") || chars.startsWith("979"))) {
    return checksum13(digits) === 0 ? chars : null;
  }
  const endsWithX = chars.endsWith("X");
  if (chars.length === 10 && digits.length === (endsWithX ? 9 : 10)) {
    const values = endsWithX ? [...digits, 10] : digits;
    const sum = values.reduce((acc, v, i) => acc + v * (10 - i), 0);
    if (sum % 11 !== 0) return null;
    const body = [9, 7, 8, ...digits.slice(0, 9)];
    const check = (10 - (checksum13([...body, 0]) % 10)) % 10;
    return [...body, check].join("");
  }
  return null;
}

function checksum13(digits: number[]): number {
  return digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0) % 10;
}
