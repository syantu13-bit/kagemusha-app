"use client";
import { useState, useEffect, useRef } from "react";
import { chatKey, QUICK_TOPICS, nowTime, buildSystemPrompt, downloadFile, messagesToMarkdown } from "../lib";
import { Markdown } from "../markdown";
import { ts } from "../styles";

function highlightText(text, query) {
  if (!query) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const out = [];
  let i = 0, key = 0;
  while (i < text.length) {
    const idx = lowerText.indexOf(lowerQuery, i);
    if (idx < 0) { out.push(text.slice(i)); break; }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark key={key++} style={{ background: "rgba(245,158,11,0.4)", color: "#fde68a", borderRadius: 3, padding: "0 2px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    i = idx + query.length;
  }
  return out;
}

export default function ChatTab({ profile, initials }) {
  const greetingMsg = () => ({
    role: "assistant",
    content: profile.greeting || "こんにちは。どんな悩みでも話しかけてください。",
    time: nowTime(),
  });
  const [messages, setMessages] = useState([greetingMsg()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    setHydrated(false);
    try {
      const s = localStorage.getItem(chatKey(profile.id));
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.map(m => ({ ...m, streaming: false })));
        } else {
          setMessages([greetingMsg()]);
        }
      } else {
        setMessages([greetingMsg()]);
      }
    } catch {
      setMessages([greetingMsg()]);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  useEffect(() => {
    if (!hydrated) return;
    // ストリーミング中のメッセージは保存しない
    const toSave = messages.map(m => ({ ...m, streaming: false }));
    try { localStorage.setItem(chatKey(profile.id), JSON.stringify(toSave)); } catch {}
  }, [messages, hydrated, profile.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  function clearChat() {
    if (!confirm("会話履歴をリセットしますか？")) return;
    setMessages([greetingMsg()]);
  }

  function ngHit(text) {
    const list = (profile.ngWords || "").split(",").map(s => s.trim()).filter(Boolean);
    return list.find(w => text.includes(w));
  }

  async function send(text) {
    const t = text || input.trim();
    if (!t || loading) return;
    setInput("");
    const userMsg = { role: "user", content: t, time: nowTime() };
    const next = [...messages, userMsg];
    setMessages(next);

    if (ngHit(t)) {
      setMessages(p => [...p, {
        role: "assistant",
        content: `大切なお話をしてくれてありがとうございます。\n専門の相談窓口（よりそいホットライン: 0120-279-338 / いのちの電話: 0570-783-556）にも、いつでも気軽に話してみてください。\nここでも引き続きお話を聞きます。`,
        time: nowTime(),
        safety: true,
      }]);
      return;
    }

    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(profile),
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        let errMsg = "不明なエラー";
        try { const data = await res.json(); errMsg = data.error || errMsg; } catch {}
        setMessages(p => [...p, { role: "assistant", content: `応答エラー: ${errMsg}`, time: nowTime(), error: true }]);
        return;
      }

      // ストリーミングテキストを逐次読み込む
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let firstChunk = true;
      const msgTime = nowTime();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        if (firstChunk) {
          firstChunk = false;
          setMessages(p => [...p, { role: "assistant", content: accumulated, time: msgTime, streaming: true }]);
        } else {
          const text = accumulated;
          setMessages(p => {
            const prev = [...p];
            prev[prev.length - 1] = { ...prev[prev.length - 1], content: text };
            return prev;
          });
        }
      }

      if (!accumulated.trim()) {
        const fallback = { role: "assistant", content: "応答が空でした。もう一度お試しください。", time: nowTime(), error: true };
        if (firstChunk) {
          setMessages(p => [...p, fallback]);
        } else {
          setMessages(p => { const a = [...p]; a[a.length - 1] = fallback; return a; });
        }
      } else {
        setMessages(p => {
          const a = [...p];
          if (a[a.length - 1]?.streaming) a[a.length - 1] = { ...a[a.length - 1], streaming: false };
          return a;
        });
      }
    } catch (err) {
      if (err?.name === "AbortError") {
        setMessages(p => {
          const a = [...p];
          const last = a[a.length - 1];
          if (last?.streaming) {
            a[a.length - 1] = { ...last, streaming: false, content: (last.content || "") + "\n…（中断されました）" };
          } else {
            a.push({ role: "assistant", content: "（送信を中断しました）", time: nowTime(), safety: true });
          }
          return a;
        });
      } else {
        setMessages(p => {
          const a = [...p];
          const last = a[a.length - 1];
          const errMsg = { role: "assistant", content: "接続が不安定です。もう一度お試しください。", time: nowTime(), error: true };
          if (last?.streaming) { a[a.length - 1] = errMsg; } else { a.push(errMsg); }
          return a;
        });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function cancelSend() {
    abortRef.current?.abort();
  }

  const isStreaming = messages.some(m => m.streaming);

  return (
    <div style={ts.wrap}>
      {messages.length > 1 && (
        <div style={{ ...ts.toolbar, gap: 8 }}>
          <button
            style={{ ...ts.clearBtn, ...(searchOpen ? { color: "#c4b5fd", borderColor: "rgba(167,139,250,0.4)" } : {}) }}
            onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearchQuery(""); }}
            aria-label="会話を検索"
            aria-pressed={searchOpen}
          >
            🔍 検索
          </button>
          <button
            style={ts.clearBtn}
            onClick={() => {
              const stamp = new Date().toISOString().slice(0, 10);
              downloadFile(`chat-${profile.name || "kagemusha"}-${stamp}.md`, messagesToMarkdown(messages, profile.name || "影武者"), "text/markdown;charset=utf-8");
            }}
            aria-label="会話をマークダウンでエクスポート"
          >
            📥 エクスポート
          </button>
          <button style={ts.clearBtn} onClick={clearChat} aria-label="会話をリセット">
            🗑 リセット
          </button>
        </div>
      )}
      {searchOpen && (
        <div style={{ padding: "8px 24px 0", display: "flex", flexDirection: "column", gap: 4 }}>
          <input
            type="search"
            autoFocus
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="会話内を検索…"
            aria-label="検索キーワード"
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
              padding: "8px 12px", color: "#f1f0ff", fontSize: 13, fontFamily: "inherit",
            }}
          />
          {searchQuery.trim() && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", paddingLeft: 4 }}>
              {(() => {
                const q = searchQuery.toLowerCase();
                const hits = messages.filter(m => m.content.toLowerCase().includes(q)).length;
                return hits > 0 ? `${hits} 件ヒット` : "ヒットなし";
              })()}
            </div>
          )}
        </div>
      )}
      <div style={ts.messages}>
        {(() => {
          const q = searchOpen ? searchQuery.trim().toLowerCase() : "";
          const visible = q ? messages.filter(m => m.content.toLowerCase().includes(q)) : messages;
          return visible.map((m, i) => {
            const bubbleStyle = m.role === "user"
              ? ts.bubbleUser
              : m.error
                ? { ...ts.bubbleAI, ...ts.bubbleError }
                : m.safety
                  ? { ...ts.bubbleAI, ...ts.bubbleSafety }
                  : ts.bubbleAI;
            return (
              <div key={i} style={{ ...ts.row, flexDirection: m.role === "user" ? "row-reverse" : "row", animation: "fadeInUp 0.3s ease" }}>
                {m.role === "assistant" && (
                  <div style={{ ...ts.msgAvatar, background: `linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})` }}>{initials}</div>
                )}
                <div>
                  <div style={{ ...ts.bubble, ...bubbleStyle }}>
                    {q
                      ? highlightText(m.content, q)
                      : m.role === "assistant"
                        ? <>
                            <Markdown>{m.content}</Markdown>
                            {m.streaming && <span style={ts.cursor} aria-hidden="true">▋</span>}
                          </>
                        : m.content.split("\n").map((l, j) => <span key={j}>{l}{j < m.content.split("\n").length - 1 && <br />}</span>)}
                  </div>
                  <div style={{ ...ts.time, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
                </div>
              </div>
            );
          });
        })()}
        {/* ストリーミング開始前のみドットを表示 */}
        {loading && !isStreaming && (
          <div style={{ ...ts.row }}>
            <div style={{ ...ts.msgAvatar, background: `linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})` }}>{initials}</div>
            <div style={{ ...ts.bubble, ...ts.bubbleAI, ...ts.typing }}>
              {[0, 200, 400].map(d => <span key={d} style={{ ...ts.dot, animationDelay: `${d}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div style={ts.quickWrap}>
          <div style={ts.quickLabel}>よくある相談</div>
          <div style={ts.quickBtns}>
            {QUICK_TOPICS.map(t => (
              <button key={t} style={ts.quickBtn} onClick={() => send(t)}>{t}</button>
            ))}
          </div>
        </div>
      )}

      <div style={ts.inputRow}>
        <textarea
          aria-label="悩みを入力"
          style={ts.textarea} rows={2} value={input} placeholder="悩みを入力してください…"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        {loading ? (
          <button
            style={{ ...ts.sendBtn, background: "linear-gradient(135deg,#dc2626,#9333ea)", boxShadow: "0 4px 14px rgba(220,38,38,0.3)" }}
            onClick={cancelSend}
            aria-label="送信を中断"
          >
            ⏹ 中断
          </button>
        ) : (
          <button style={{ ...ts.sendBtn, opacity: !input.trim() ? 0.35 : 1 }} onClick={() => send()} disabled={!input.trim()}>
            送信
          </button>
        )}
      </div>
      <div style={ts.footer}>Enter で送信 · Shift+Enter で改行</div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
