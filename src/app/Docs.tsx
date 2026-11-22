import React from 'react';

/** Tiny, safe markdown renderer for the in-app guide (headers, lists, bold, links, code, tables). */
const inline = (s: string, k: string): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<b key={`${k}b${i++}`}>{t.slice(2, -2)}</b>);
    else if (t.startsWith('`')) out.push(<code key={`${k}c${i++}`}>{t.slice(1, -1)}</code>);
    else {
      const mm = t.match(/\[([^\]]+)\]\(([^)]+)\)/)!;
      out.push(<a key={`${k}a${i++}`} href={mm[2]} target="_blank" rel="noreferrer">{mm[1]}</a>);
    }
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
};

export const Markdown: React.FC<{src: string}> = ({src}) => {
  const lines = src.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let olist: string[] = [];
  let table: string[] = [];
  const flush = (k: number) => {
    if (list.length) blocks.push(<ul key={`u${k}`}>{list.map((l, i) => <li key={i}>{inline(l, `u${k}${i}`)}</li>)}</ul>);
    if (olist.length) blocks.push(<ol key={`o${k}`}>{olist.map((l, i) => <li key={i}>{inline(l, `o${k}${i}`)}</li>)}</ol>);
    if (table.length) {
      const rows = table.filter((r) => !/^\|\s*-/.test(r)).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
      blocks.push(
        <div className="tbl" key={`t${k}`}><table><thead><tr>{rows[0].map((c, i) => <th key={i}>{inline(c, `th${k}${i}`)}</th>)}</tr></thead><tbody>{rows.slice(1).map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c, `td${k}${i}${j}`)}</td>)}</tr>)}</tbody></table></div>,
      );
    }
    list = [];
    olist = [];
    table = [];
  };
  lines.forEach((l, k) => {
    if (/^\|/.test(l)) { table.push(l); return; }
    if (/^\s*[-*]\s+/.test(l)) { list.push(l.replace(/^\s*[-*]\s+/, '')); return; }
    if (/^\s*\d+[.)]\s+/.test(l)) { olist.push(l.replace(/^\s*\d+[.)]\s+/, '')); return; }
    flush(k);
    if (/^###\s/.test(l)) blocks.push(<h4 key={k}>{inline(l.slice(4), `h${k}`)}</h4>);
    else if (/^##\s/.test(l)) blocks.push(<h3 key={k}>{inline(l.slice(3), `h${k}`)}</h3>);
    else if (/^#\s/.test(l)) blocks.push(<h2 key={k}>{inline(l.slice(2), `h${k}`)}</h2>);
    else if (/^>\s?/.test(l)) blocks.push(<blockquote key={k}>{inline(l.replace(/^>\s?/, ''), `q${k}`)}</blockquote>);
    else if (/^---\s*$/.test(l)) blocks.push(<hr key={k} />);
    else if (l.trim()) blocks.push(<p key={k}>{inline(l, `p${k}`)}</p>);
  });
  flush(lines.length);
  return <div className="md">{blocks}</div>;
};
