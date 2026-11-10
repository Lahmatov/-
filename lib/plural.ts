export const Plural = {
  /** Русское склонение по числу: 1 книга, 2 книги, 5 книг. */
  ru(n: number, one: string, few: string, many: string): string {
    const mod10 = Math.abs(n) % 10;
    const mod100 = Math.abs(n) % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
  },
};
