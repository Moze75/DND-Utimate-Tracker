import React, { useMemo } from 'react';

export type MarkdownCtx = {
  characterId?: string | null;
  className?: string;
  subclassName?: string | null;
  checkedMap?: Map<string, boolean>;
  onToggle?: (featureKey: string, checked: boolean) => void;
  section?: { level: number; origin: 'class' | 'subclass'; title: string };
};

function sentenceCase(s: string) {
  const t = (s || '').toLocaleLowerCase('fr-FR').trim();
  if (!t) return t;
  const first = t.charAt(0).toLocaleUpperCase('fr-FR') + t.slice(1);
  return first.replace(/\b([A-Z]{2,})\b/g, '$1');
}

function slug(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function MarkdownLite({ text, ctx }: { text: string; ctx: MarkdownCtx }) {
  const nodes = useMemo(() => parseMarkdownLite(text, ctx), [text, ctx]);
  return <>{nodes}</>;
}

export function parseMarkdownLite(md: string, ctx: MarkdownCtx): React.ReactNode[] {
  const lines = md.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const pushPara = (buff: string[]) => {
    const content = buff.join(' ').trim();
    if (!content) return;
    out.push(
      <p key={`p-${key++}`} className="text-sm">
        {formatInline(content)}
      </p>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      out.push(<div key={`sp-${key++}`} className="h-2" />);
      i++;
      continue;
    }

    // Séparateur horizontal ---
    if (/^\s*---+\s*$/.test(line)) {
      out.push(<div key={`hr-${key++}`} className="my-3 border-t border-white/10" />);
      i++;
      continue;
    }

    // ##### -> case à cocher persistante
    const h5chk = line.match(/^\s*#####\s+(.*)$/);
    if (h5chk) {
      const rawLabel = h5chk[1];
      const label = sentenceCase(rawLabel);
      const featureKey = slug(`${ctx.section?.level ?? 'x'}-${ctx.section?.origin ?? 'class'}-${ctx.section?.title ?? ''}--${label}`);
      const checked = ctx.checkedMap?.get(featureKey) ?? false;
      const id = `chk-${key}`;

      out.push(
        <div key={`chk-${key++}`} className="flex items-start gap-2">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => ctx.onToggle?.(featureKey, e.currentTarget.checked)}
            className="mt-0.5 h-4 w-4 accent-violet-500 bg-black/40 border border-white/20 rounded"
          />
          <label htmlFor={id} className="text-sm text-white/90">
            {formatInline(label)}
          </label>
        </div>
      );
      i++;
      continue;
    }

    // #### -> petit titre
    const h4small = line.match(/^\s*####\s+(.*)$/);
    if (h4small) {
      out.push(
        <h5 key={`h4s-${key++}`} className="text-white font-semibold text-[13px]" style={{ fontVariant: 'small-caps' }}>
          {formatInline(sentenceCase(h4small[1]))}
        </h5>
      );
      i++;
      continue;
    }

    // ### / ## / #
    const h3 = line.match(/^\s*###\s+(.*)$/i);
    if (h3) {
      out.push(
        <h4 key={`h3-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h3[1]))}
        </h4>
      );
      i++;
      continue;
    }
    const h2 = line.match(/^\s*##\s+(.*)$/i);
    if (h2) {
      out.push(
        <h4 key={`h2-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h2[1]))}
        </h4>
      );
      i++;
      continue;
    }
    const h1 = line.match(/^\s*#\s+(.*)$/i);
    if (h1) {
      out.push(
        <h4 key={`h1-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h1[1]))}
        </h4>
      );
      i++;
      continue;
    }

    // Table Markdown simple
    if (line.includes('|')) {
      const block: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        block.push(lines[i]);
        i++;
      }
      const tableNode = renderTable(block, key);
      if (tableNode) {
        out.push(tableNode);
        key++;
        continue;
      }
      out.push(
        <p key={`pf-${key++}`} className="text-sm">
          {formatInline(block.join(' '))}
        </p>
      );
      continue;
    }

    // Liste à puces
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1">
          {items.map((it, idx) => (
            <li key={`li-${idx}`} className="text-sm">
              {formatInline(it)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Liste ordonnée
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(
        <ol key={`ol-${key++}`} className="list-decimal pl-5 space-y-1">
          {items.map((it, idx) => (
            <li key={`oli-${idx}`} className="text-sm">
              {formatInline(it)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraphe
    const buff: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].includes('|') &&
      !/^\s*#{1,6}\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      buff.push(lines[i]);
      i++;
    }
    pushPara(buff);
  }

  return out;
}

function renderTable(block: string[], key: number): React.ReactNode | null {
  if (block.length < 2) return null;
  const rows = block.map(r =>
    r
      .split('|')
      .map(c => c.trim())
      .filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === ''))
  );

  const hasSep = rows[1] && rows[1].every(cell => /^:?-{3,}:?$/.test(cell));
  const header = hasSep ? rows[0] : null;
  const body = hasSep ? rows.slice(2) : rows;

  return (
    <div key={`tbl-${key}`} className="overflow-x-auto">
      <table className="min-w-[360px] w-full text-sm border-separate border-spacing-y-1">
        {header && (
          <thead>
            <tr>
              {header.map((h, i) => (
                <th key={`th-${i}`} className="text-left text-white font-semibold px-2 py-1 bg-white/5 rounded">
                  {formatInline(sentenceCase(h))}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((cells, r) => (
            <tr key={`tr-${r}`}>
              {cells.map((c, ci) => (
                <td key={`td-${ci}`} className="px-2 py-1 text-white/90 bg-white/0">
                  {formatInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatInline(text: string): React.ReactNode[] {
  let parts: Array<string | React.ReactNode> = [text];
  // **gras**
  parts = splitAndMap(parts, /\*\*([^*]+)\*\*/g, (m, i) => <strong key={`b-${i}`} className="text-white">{m[1]}</strong>);
  // *italique*
  parts = splitAndMap(parts, /(^|[^*])\*([^*]+)\*(?!\*)/g, (m, i) => [m[1], <em key={`i-${i}`} className="italic">{m[2]}</em>]);
  // _italique_
  parts = splitAndMap(parts, /_([^_]+)_/g, (m, i) => <em key={`u-${i}`} className="italic">{m[1]}</em>);
  return parts.map((p, i) => (typeof p === 'string' ? <React.Fragment key={`t-${i}`}>{p}</React.Fragment> : p));
}

function splitAndMap(
  parts: Array<string | React.ReactNode>,
  regex: RegExp,
  toNode: (m: RegExpExecArray, idx: number) => React.ReactNode | React.ReactNode[]
): Array<string | React.ReactNode> {
  const out: Array<string | React.ReactNode> = [];

  for (const part of parts) {
    if (typeof part !== 'string') {
      out.push(part);
      continue;
    }
    let str = part;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    const r = new RegExp(regex.source, regex.flags);

    while ((m = r.exec(str)) !== null) {
      out.push(str.slice(lastIndex, m.index));
      const node = toNode(m, out.length);
      if (Array.isArray(node)) out.push(...node);
      else out.push(node);
      lastIndex = m.index + m[0].length;
    }
    out.push(str.slice(lastIndex));
  }
  return out;
}