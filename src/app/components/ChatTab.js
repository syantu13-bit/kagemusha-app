"use client";
import { useState, useEffect, useRef } from "react";
import { CHAT_KEY, QUICK_TOPICS, nowTime, buildSystemPrompt } from "../lib";
import { ts } from "../styles";

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
  const bottomRef = useRef(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem(CHAT_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CHAT_KEY, JSON.stringify(messages)); } catch {}
  }, [messages, hydrated]);

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
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(profile),
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(p => [...p, { role: "assistant", content: `応答エラー: ${data.error || "不明なエラー"}`, time: nowTime(), error: true }]);
        return;
      }
      const reply = data.content?.[0]?.text || "少し考えさせてください…";
      setMessages(p => [...p, { role: "assistant", content: reply, time: nowTime() }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "接続が不安定です。もう一度お試しください。", time: nowTime(), error: true }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={ts.wrap}>
      {messages.length > 1 && (
        <div style={ts.toolbar}>
          <button style={ts.clearBtn} onClick={clearChat} aria-label="会話をリセット">
            🗑 会話をリセット
          </button>
        </div>
      )}
      <div style={ts.messages}>
        {messages.map((m, i) => {
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
                  {m.content.split("\n").map((l, j) => <span key={j}>{l}{j < m.content.split("\n").length - 1 && <br />}</span>)}
                </div>
                <div style={{ ...ts.time, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
              </div>
            </div>
          );
        })}
        {loading && (
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
        <button style={{ ...ts.sendBtn, opacity: (!input.trim() || loading) ? 0.35 : 1 }} onClick={() => send()} disabled={!input.trim() || loading}>
          送信
        </button>
      </div>
      <div style={ts.footer}>Enter で送信 · Shift+Enter で改行</div>
    </div>
  );
}
