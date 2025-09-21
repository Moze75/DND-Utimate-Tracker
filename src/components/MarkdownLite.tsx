import React, { useMemo } from 'react';

// Nettoyage simple: retirer les crochets autour d'un segment [texte] -> texte
function stripBrackets(s: string): string {
  return s.replace(/\[([^\]]+)\]/g, '$1');
}

// Rendu inline: **gras** et _italique_
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  const cleaned = stripBrackets(text);

  // 1) Découpe par **...** (gras)
  const boldRe = /\*\*(.+?)\*\*/g;
  const parts: Array<{ type: 'text' | 'bold'; value: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = boldRe.exec(cleaned)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', value: cleaned.slice(last, m.index) });
    }
    parts.push({ type: 'bold', value: m[1] });
    last = boldRe.lastIndex;
  }
  if (last < cleaned.length) parts.push({ type: 'text', value: cleaned.slice(last) });

  // 2) Italique _..._ à l'intérieur de chaque segment
  const toItalicNodes = (str: string, keyPrefix: string) => {
    const nodes: React.ReactNode[] = [];
    const italicRe = /_(.+?)_/g;
    let idx = 0;
    let mm: RegExpExecArray | null;
    let cursor = 0;

    while ((mm = italicRe.exec(str)) !== null) {
      if (mm.index > cursor) {
        nodes.push(<span key={`${keyPrefix}-t${idx++}`}>{str.slice(cursor, mm.index)}</span>);
      }
      nodes.push(
        <em key={`${keyPrefix}-i${idx++}`} className="italic">
          {mm[1]}
        </em>
      );
      cursor = italicRe.lastIndex;
    }
    if (cursor < str.length) nodes.push(<span key={`${keyPrefix}-t${idx++}`}>{str.slice(cursor)}</span>);
    return nodes;
  };

  const out: React.ReactNode[] = [];
  let k = 0;
  for (const p of parts) {
    if (p.type === 'bold') {
      out.push(
        <strong key={`b-${k++}`} className="font-semibold">
          {toItalicNodes(p.value, `b${k}`)}
        </strong>
      );
    } else {
      out.push(<span key={`t-${k++}`}>{toItalicNodes(p.value, `t${k}`)}</span>);
    }
  }
  return out;
}

/* ---------- Helpers tableaux ---------- */

// Détermine si la ligne de séparation est valide (---, :---, ---:, :---:)
function isTableSeparator(line: string): boolean {
  const l = line.trim();
  if (!l.includes('-')) return false;
  // Tolère les pipes en début/fin
  const core = l.replace(/^\|/, '').replace(/\|$/, '');
  const cells = core
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
  if (cells.length === 0) return false;
  // Chaque cellule doit matcher :? -{3,} :?
  return cells.every((c) => /^:?-{3,}:?$/.test(c));
}

// Découpe une ligne de tableau en cellules, en gérant \| (pipe échappé)
function splitTableRow(line: string): string[] {
  let work = line.trim();
  if (work.startsWith('|')) work = work.slice(1);
  if (work.endsWith('|')) work = work.slice(0, -1);
  work = work.replace(/\\\|/g, '§PIPE§');
  const rawCells = work.split('|').map((c) => c.replace(/§PIPE§/g, '|').trim());
  return rawCells;
}

type Align = 'left' | 'center' | 'right';
function parseAlignments(sepLine: string, colCount: number): Align[] {
  const core = sepLine.trim().replace(/^\|/, '').replace(/\|$/, '');
  const specs = core.split('|').map((c) => c.trim());
  const aligns = specs.map<Align>((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });
  if (aligns.length < colCount) {
    while (aligns.length < colCount) aligns.push('left');
  } else if (aligns.length > colCount) {
    aligns.length = colCount;
  }
  return aligns;
}

/* ---------- Block-level rendering ---------- */

export default function MarkdownLite({ content }: { content: string }) {
  const elements = useMemo(() => {
    // 0) Décode d'éventuelles balises BOX encodées HTML
    const src = (content || '')
      .replace(/&lt;!--\s*BOX\s*--&gt;/gi, '<!-- BOX -->')
      .replace(/&lt;!--\s*\/\s*BOX\s*--&gt;/gi, '<!-- /BOX -->');

    const lines = src.split(/\r?\n/);
    const out: React.ReactNode[] = [];

    let ulBuffer: string[] = [];
    let olBuffer: string[] = [];
    let quoteBuffer: string[] = [];

    // Encadré par II ... || ou <!-- BOX --> ... <!-- /BOX -->
    let inBox = false;
    let boxBuffer: string[] = [];

    const flushUL = () => {
      if (ulBuffer.length > 0) {
        out.push(
          <ul className="list-disc pl-5 space-y-1" key={`ul-${out.length}`}>
            {ulBuffer.map((item, i) => (
              <li key={`uli-${i}`}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        ulBuffer = [];
      }
    };
    const flushOL = () => {
      if (olBuffer.length > 0) {
        out.push(
          <ol className="list-decimal pl-5 space-y-1" key={`ol-${out.length}`}>
            {olBuffer.map((item, i) => (
              <li key={`oli-${i}`}>{renderInline(item)}</li>
            ))}
          </ol>
        );
        olBuffer = [];
      }
    };
    const flushQuote = () => {
      if (quoteBuffer.length > 0) {
        const text = quoteBuffer.join(' ').trim();
        out.push(
          <blockquote
            key={`q-${out.length}`}
            className="border-l-2 border-white/20 pl-3 ml-1 italic text-gray-300 bg-white/5 rounded-sm py-1"
          >
            {renderInline(text)}
          </blockquote>
        );
        quoteBuffer = [];
      }
    };
    const flushAllBlocks = () => {
      flushQuote();
      flushUL();
      flushOL();
    };

    const flushBox = () => {
      if (!boxBuffer.length) return;
      const inner = boxBuffer.join('\n');
      out.push(
        <div key={`box-${out.length}`} className="rounded-lg border border-white/15 bg-white/5 p-3">
          <MarkdownLite content={inner} />
        </div>
      );
      boxBuffer = [];
    };

    // Tokens BOX (n'importe où sur la ligne)
    const openRE = /<!--\s*BOX\s*-->/i;
    const closeRE = /<!--\s*\/\s*BOX\s*-->/i;

    for (let i = 0; i < lines.length; i++) {
      let raw = lines[i];

      // Gestion des encadrés
      if (inBox) {
        // Fermeture via <!-- /BOX -->
        const mClose = closeRE.exec(raw);
        if (mClose && typeof mClose.index === 'number') {
          const before = raw.slice(0, mClose.index).trimRight();
          if (before) boxBuffer.push(before);
          inBox = false;
          flushBox();
          const after = raw.slice(mClose.index + mClose[0].length).trimLeft();
          if (after) {
            out.push(
              <p className="mb-2 leading-relaxed" key={`p-${out.length}`}>
                {renderInline(after)}
              </p>
            );
          }
          continue;
        }
        // Fermeture via ||
        const closePipe = raw.match(/^(.*)\s*\|\|\s*$/);
        if (closePipe) {
          const before = closePipe[1];
          if (before.trim() !== '') boxBuffer.push(before);
          inBox = false;
          flushBox();
          continue;
        }
        boxBuffer.push(raw);
        continue;
      }

      // Ouverture via <!-- BOX -->
      const mOpen = openRE.exec(raw);
      if (mOpen && typeof mOpen.index === 'number') {
        const before = raw.slice(0, mOpen.index).trimRight();
        if (before) {
          flushAllBlocks();
          out.push(
            <p className="mb-2 leading-relaxed" key={`p-${out.length}`}>
              {renderInline(before)}
            </p>
          );
        }
        flushAllBlocks();
        inBox = true;
        boxBuffer = [];
        const after = raw.slice(mOpen.index + mOpen[0].length).trimLeft();
        if (after) boxBuffer.push(after);
        continue;
      }

      // Ouverture legacy: "II"
      const openLegacy = raw.match(/^\s*II\s*(.*)$/);
      if (openLegacy) {
        flushAllBlocks();
        inBox = true;
        boxBuffer = [];
        const after = openLegacy[1];
        if (after.trim() !== '') boxBuffer.push(after);
        continue;
      }

      // Détection tableau GFM: header + ligne séparatrice
      const headerLine = raw;
      const sepLine = lines[i + 1];
      if (headerLine && sepLine && headerLine.includes('|') && isTableSeparator(sepLine)) {
        flushAllBlocks();

        const headerCells = splitTableRow(headerLine);
        const alignments = parseAlignments(sepLine, headerCells.length);

        const body: string[][] = [];
        let j = i + 2;
        for (; j < lines.length; j++) {
          const rowLine = lines[j];
          if (!rowLine || rowLine.trim() === '') break;
          if (!rowLine.includes('|')) break;
          body.push(splitTableRow(rowLine));
        }

        out.push(
          <div key={`tblwrap-${out.length}`} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  {headerCells.map((cell, idx) => {
                    const align = alignments[idx] || 'left';
                    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                    return (
                      <th
                        key={`th-${idx}`}
                        className={`px-3 py-2 bg-white/10 border border-white/15 font-semibold ${alignClass}`}
                      >
                        {renderInline(cell)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {body.map((row, r) => (
                  <tr key={`tr-${r}`}>
                    {headerCells.map((_, c) => {
                      const cell = row[c] ?? '';
                      const align = alignments[c] || 'left';
                      const alignClass =
                        align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
                      return (
                        <td key={`td-${r}-${c}`} className={`px-3 py-2 border border-white/10 ${alignClass}`}>
                          {renderInline(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        i = j - 1;
        continue;
      }

      // Listes à puces
      const mUL = raw.match(/^\s*[-*]\s+(.*)$/);
      if (mUL) {
        flushQuote();
        flushOL();
        ulBuffer.push(mUL[1]);
        continue;
      }

      // Listes numérotées
      const mOL = raw.match(/^\s*\d+[.)]\s+(.*)$/);
      if (mOL) {
        flushQuote();
        flushUL();
        olBuffer.push(mOL[1]);
        continue;
      }

      // Citations
      const mQ = raw.match(/^\s*>\s+(.*)$/);
      if (mQ) {
        flushUL();
        flushOL();
        quoteBuffer.push(mQ[1]);
        continue;
      }

      // sortie de blocs
      if ((ulBuffer.length || olBuffer.length || quoteBuffer.length) && raw.trim() !== '') {
        flushAllBlocks();
      }

      // Sous-titres ####
      const h4 = raw.match(/^\s*####\s+(.*)$/);
      if (h4) {
        out.push(
          <div className="font-semibold mt-3 mb-1 tracking-wide" key={`h4-${out.length}`}>
            {renderInline(h4[1])}
          </div>
        );
        continue;
      }

      // Titres ### (internes)
      const h3 = raw.match(/^\s*###\s+(.*)$/);
      if (h3) {
        out.push(
          <div className="font-bold text-base mt-4 mb-2" key={`h3-${out.length}`}>
            {renderInline(h3[1])}
          </div>
        );
        continue;
      }

      // Ligne entièrement en **gras** => sous-titre stylé
      const fullBold = raw.match(/^\s*\*\*(.+?)\*\*\s*$/);
      if (fullBold) {
        out.push(
          <div className="mt-3 mb-2 uppercase tracking-wide text-[0.95rem] text-gray-200" key={`sub-${out.length}`}>
            {renderInline(fullBold[1])}
          </div>
        );
        continue;
      }

      // Ligne vide -> espace vertical
      if (raw.trim() === '') {
        flushAllBlocks();
        out.push(<div className="h-2" key={`sp-${out.length}`} />);
        continue;
      }

      // Paragraphe "Label: valeur"
      const labelMatch = raw.match(/^([\p{L}\p{N}'’ .\-\/+()]+?)\s*:\s+(.*)$/u);
      if (labelMatch) {
        out.push(
          <p className="mb-2 leading-relaxed" key={`kv-${out.length}`}>
            <span className="font-semibold">{labelMatch[1]}: </span>
            {renderInline(labelMatch[2])}
          </p>
        );
        continue;
      }

      // Paragraphe simple
      out.push(
        <p className="mb-2 leading-relaxed" key={`p-${out.length}`}>
          {renderInline(raw)}
        </p>
      );
    }

    // Fin: flush des blocs restants
    flushAllBlocks();
    if (inBox) {
      inBox = false;
      flushBox();
    }

    return out;
  }, [content]);

  if (!content) return null;
  return <div className="prose prose-invert max-w-none">{elements}</div>;
}