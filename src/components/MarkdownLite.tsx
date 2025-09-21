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

  // 2) Dans chaque segment, appliquer l'italique _..._
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

export default function MarkdownLite({ content }: { content: string }) {
  const elements = useMemo(() => {
    const lines = (content || '').split(/\r?\n/);
    const out: React.ReactNode[] = [];

    let ulBuffer: string[] = [];
    let olBuffer: string[] = [];
    let quoteBuffer: string[] = [];

    // Encadré: <!-- BOX --> ... <!-- /BOX --> et II ... ||
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

    // Regex commentaires pour BOX (ancrés au début/fin de ligne — version "fonctionnelle" d'origine)
    const openBoxCommentRe = /^\s*<!--\s*BOX\s*-->\s*(.*)$/;
    const closeBoxCommentRe = /^(.*)<!--\s*\/\s*BOX\s*-->\s*$/;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];

      // Si on est dans un encadré, détecter la fermeture (commentaire ou ||)
      if (inBox) {
        // Fermeture via commentaire avec contenu avant
        const closeC = raw.match(closeBoxCommentRe);
        if (closeC) {
          const before = closeC[1];
          if (before.trim() !== '') boxBuffer.push(before);
          inBox = false;
          flushBox();
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

      // Ouverture d'encadré via commentaire (peut contenir du contenu après)
      const openC = raw.match(openBoxCommentRe);
      if (openC) {
        flushAllBlocks();
        inBox = true;
        boxBuffer = [];
        const after = openC[1];
        if (after.trim() !== '') boxBuffer.push(after);
        continue;
      }

      // Ouverture d'encadré: "II" au début de ligne, éventuellement suivi de contenu
      const openLegacy = raw.match(/^\s*II\s*(.*)$/);
      if (openLegacy) {
        flushAllBlocks();
        inBox = true;
        boxBuffer = [];
        const after = openLegacy[1];
        if (after.trim() !== '') boxBuffer.push(after);
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