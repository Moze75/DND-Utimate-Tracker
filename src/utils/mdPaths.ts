export function stripDiacritics(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function encodeSeg(s: string) {
  // encodeURIComponent suffit pour les segments de chemin
  return encodeURIComponent(s);
}

export function subclassFileName(sub: string) {
  return `Sous-classe - ${sub}.md`;
}

export function subclassMdCandidates(cls: string, sub: string): string[] {
  const cVariants = uniq([
    cls,
    stripDiacritics(cls),
  ]);

  // variantes pour "Credo"/"Crédo"
  const subNoAcc = stripDiacritics(sub);
  const subAcc = subNoAcc.replace(/\bcredo\b/i, 'Crédo');

  const sVariants = uniq([
    sub,
    subNoAcc,  // "Credo de la paume"
    subAcc,    // "Crédo de la paume"
  ]);

  const out: string[] = [];
  for (const c of cVariants) {
    for (const s of sVariants) {
      out.push(`Classes/${encodeSeg(c)}/Subclasses/${encodeSeg(subclassFileName(s))}`);
    }
  }
  return uniq(out);
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}