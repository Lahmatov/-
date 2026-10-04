// ISBN со штрихкода (EAN-13) или введённый руками: проверка контрольной цифры и приведение к ISBN-13.

function isbn13Valid(d: string): boolean {
  const sum = [...d].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return sum % 10 === 0;
}

function isbn10Valid(d: string): boolean {
  const sum = [...d].reduce((acc, ch, i) => acc + (ch === "X" ? 10 : Number(ch)) * (10 - i), 0);
  return sum % 11 === 0;
}

function isbn10to13(d: string): string {
  const body = `978${d.slice(0, 9)}`;
  const sum = [...body].reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return body + ((10 - (sum % 10)) % 10);
}

/** Возвращает ISBN-13 без дефисов или null, если строка — не ISBN. */
export function normalizeIsbn(input: string): string | null {
  const d = input.toUpperCase().replace(/^ISBN[:\s-]*/, "").replace(/[\s-]/g, "");
  if (/^97[89]\d{10}$/.test(d)) return isbn13Valid(d) ? d : null;
  if (/^\d{9}[\dX]$/.test(d)) return isbn10Valid(d) ? isbn10to13(d) : null;
  return null;
}

/** ISBN-10 для ISBN-13 с префиксом 978 (у 979 короткой формы нет). */
export function isbn13to10(isbn13: string): string | null {
  if (!isbn13.startsWith("978")) return null;
  const body = isbn13.slice(3, 12);
  const sum = [...body].reduce((acc, ch, i) => acc + Number(ch) * (10 - i), 0);
  const check = (11 - (sum % 11)) % 11;
  return body + (check === 10 ? "X" : String(check));
}
