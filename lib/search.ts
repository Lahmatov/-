// Ранжирование и нечёткое сравнение для поиска книг. Чистые функции — без базы, их удобно тестировать.

/** Слова без пунктуации, в нижнем регистре, ё → е. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Расстояние Дамерау–Левенштейна (с перестановкой соседних букв: «булгкаов» → «булгаков» = 1). */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Сколько опечаток прощаем в слове такой длины. */
function allowedTypos(length: number): number {
  if (length >= 8) return 2;
  if (length >= 4) return 1;
  return 0;
}

/** Насколько слово запроса совпадает со словом книги: 1 — точно, 0 — никак. */
export function wordScore(query: string, word: string): number {
  if (word === query) return 1;
  if (query.length >= 2 && word.startsWith(query)) return 0.9; // пользователь ещё печатает
  if (query.length >= 3 && word.includes(query)) return 0.7;
  const allowed = allowedTypos(query.length);
  if (allowed === 0) return 0;
  // Сравниваем и с целым словом, и с его началом той же длины (опечатка в недопечатанном слове).
  const distance = Math.min(
    editDistance(query, word),
    word.length > query.length ? editDistance(query, word.slice(0, query.length)) : Infinity,
  );
  return distance <= allowed ? 0.65 - 0.1 * distance : 0;
}

function bestScore(query: string, words: string[]): number {
  let best = 0;
  for (const w of words) best = Math.max(best, wordScore(query, w));
  return best;
}

export type Rankable = { title: string; author: string; popularity: number };

/**
 * Оценка книги по запросу. 0 — книга не подходит: каждое слово запроса должно
 * найтись (хотя бы с опечаткой) в названии или у автора.
 */
export function scoreBook(query: string, book: Rankable): number {
  const queryWords = tokenize(query);
  if (queryWords.length === 0) return 0;
  const titleWords = tokenize(book.title);
  const authorWords = tokenize(book.author);

  let sum = 0;
  for (const q of queryWords) {
    const score = Math.max(bestScore(q, titleWords), 0.85 * bestScore(q, authorWords));
    if (score === 0) return 0;
    sum += score;
  }
  let total = sum / queryWords.length;

  const normalizedQuery = queryWords.join(" ");
  const normalizedTitle = titleWords.join(" ");
  if (normalizedTitle === normalizedQuery) total += 0.5;
  else if (normalizedTitle.startsWith(normalizedQuery)) total += 0.25;

  // Популярные книги (их чаще добавляют на полки) немного выше.
  return total + 0.05 * Math.log1p(book.popularity);
}

/** Короткие куски слов запроса, по которым база подбирает кандидатов для нечёткого сравнения. */
export function candidateFragments(query: string): string[] {
  const fragments = new Set<string>();
  for (const word of tokenize(query)) {
    if (word.length < 4) {
      fragments.add(word);
      continue;
    }
    fragments.add(word.slice(0, 3)); // опечатка в конце слова
    fragments.add(word.slice(-3)); // опечатка в начале слова
  }
  return [...fragments];
}
