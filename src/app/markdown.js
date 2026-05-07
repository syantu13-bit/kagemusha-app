"use client";
// 軽量Markdownレンダラ。依存ゼロ。AI応答に出やすい構文だけサポート：
// - **太字** / *斜体* / `code` / [リンク](url)
// - 見出し # / ## / ###
// - 箇条書き「- 」「* 」
// - 番号付きリスト「1. 」
// - パラグラフ区切り（空行）

const INLINE_PATTERNS = [
  { type: "code",   re: /^`([^`\n]+)`/ },
  { type: "bold",   re: /^\*\*([^*\n]+)\*\*/ },
  { type: "italic", re: /^\*([^*\n]+)\*/ },
  { type: "link",   re: /^\[([^\]\n]+)\]\(([^)\s]+)\)/ },
];

function renderInline(text, keyPrefix = "") {
  const out = [];
  let rest = text;
  let k = 0;
  while (rest.length > 0) {
    let matched = null;
    for (const p of INLINE_PATTERNS) {
      const m = rest.match(p.re);
      if (m) { matched = { p, m }; break; }
    }
    if (matched) {
      const { p, m } = matched;
      const key = `${keyPrefix}-${k++}`;
      if (p.type === "code") out.push(<code key={key} style={codeStyle}>{m[1]}</code>);
      else if (p.type === "bold") out.push(<strong key={key}>{m[1]}</strong>);
      else if (p.type === "italic") out.push(<em key={key}>{m[1]}</em>);
      else if (p.type === "link") out.push(
        <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" style={linkStyle}>{m[1]}</a>
      );
      rest = rest.slice(m[0].length);
    } else {
      // 次のメタ文字までを地の文として取り込む
      const next = rest.search(/[`*\[]/);
      if (next < 0) { out.push(rest); break; }
      if (next === 0) { out.push(rest[0]); rest = rest.slice(1); }
      else { out.push(rest.slice(0, next)); rest = rest.slice(next); }
    }
  }
  return out;
}

function parseBlocks(text) {
  // 改行で行に分け、先頭から塊を作る
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }

    // 見出し
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { blocks.push({ type: "heading", level: h[1].length, text: h[2] }); i++; continue; }

    // 箇条書き
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // 番号付き
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // パラグラフ（空行 or 箇条書き開始まで）
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !/^([-*]\s+|\d+\.\s+|#{1,3}\s+)/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    blocks.push({ type: "p", text: para.join("\n") });
  }
  return blocks;
}

export function Markdown({ children }) {
  if (typeof children !== "string") return null;
  const blocks = parseBlocks(children);
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "heading") {
          const Tag = `h${Math.min(b.level + 2, 6)}`;
          return <Tag key={i} style={headingStyle(b.level)}>{renderInline(b.text, `h${i}`)}</Tag>;
        }
        if (b.type === "ul") {
          return (
            <ul key={i} style={listStyle}>
              {b.items.map((it, j) => <li key={j}>{renderInline(it, `ul${i}-${j}`)}</li>)}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} style={listStyle}>
              {b.items.map((it, j) => <li key={j}>{renderInline(it, `ol${i}-${j}`)}</li>)}
            </ol>
          );
        }
        // p — 内部の改行は <br/>
        const lines = b.text.split("\n");
        return (
          <p key={i} style={pStyle}>
            {lines.map((l, j) => (
              <span key={j}>
                {renderInline(l, `p${i}-${j}`)}
                {j < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

const codeStyle = {
  background: "rgba(0,0,0,0.3)",
  padding: "1px 6px",
  borderRadius: 4,
  fontSize: "0.9em",
  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
};
const linkStyle = { color: "#a78bfa", textDecoration: "underline" };
const listStyle = { margin: "4px 0 4px 1.4em", padding: 0 };
const pStyle = { margin: "0 0 6px 0" };
const headingStyle = level => ({
  fontWeight: 700,
  fontSize: level === 1 ? "1.1em" : level === 2 ? "1.05em" : "1em",
  margin: "8px 0 4px 0",
});
