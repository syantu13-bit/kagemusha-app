"use client";
import { useState, useEffect, useRef } from "react";
import {
  chatKey, QUICK_TOPICS, nowTime, buildSystemPrompt, downloadFile, messagesToMarkdown,
  PREFECTURES, DIVINATION_TYPES,
  detectDivinationType, detectDivinationOffer,
  loadConsultantInfo, saveConsultantInfo, isConsultantInfoComplete,
  DEFAULT_CONSULTANT_INFO, callDivinationAPI,
} from "../lib";
import { Markdown } from "../markdown";
import { ts, dv } from "../styles";

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

function DivinationCard({ data }) {
  if (!data) return null;
  const typeLabel = DIVINATION_TYPES.find(t => t.id === data.type)?.label || data.type;
  return (
    <div style={dv.card}>
      <div style={dv.cardType}>◌ {typeLabel}</div>
      <h3 style={dv.cardTitle}>{data.title}</h3>
      {data.summary && <div style={dv.cardSummary}>{data.summary}</div>}
      {data.detail && <div style={dv.cardDetail}>{data.detail}</div>}
      {data.advice && <div style={dv.cardAdvice}>◇ {data.advice}</div>}
      {Array.isArray(data.extras) && data.extras.length > 0 && (
        <div style={dv.cardExtras}>
          {data.extras.map((e, i) => (
            <span key={i} style={dv.cardExtraChip}>
              <span style={dv.cardExtraLabel}>{e.label}：</span>{e.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ConsultantForm({ info, onChange, onSubmit, onClose, submitLabel = "🔮 占いを引く" }) {
  const update = (k, v) => onChange({ ...info, [k]: v });
  const ready = isConsultantInfoComplete(info);
  return (
    <div style={dv.formCard}>
      <div style={dv.formTitle}>
        <span>📋 占いに必要な情報</span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="閉じる" style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>
        )}
      </div>
      <div style={dv.formGrid}>
        <div style={dv.formField}>
          <label style={dv.formLabel}>姓（任意）</label>
          <input style={dv.formInput} value={info.lastName} onChange={e => update("lastName", e.target.value)} placeholder="富田" />
        </div>
        <div style={dv.formField}>
          <label style={dv.formLabel}>名（任意）</label>
          <input style={dv.formInput} value={info.firstName} onChange={e => update("firstName", e.target.value)} placeholder="尚子" />
        </div>
        <div style={dv.formField}>
          <label style={dv.formLabel}>生年月日 ★</label>
          <input type="date" style={dv.formInput} value={info.birthdate} onChange={e => update("birthdate", e.target.value)} />
        </div>
        <div style={dv.formField}>
          <label style={dv.formLabel}>時刻（不明なら12:00）</label>
          <input type="time" style={dv.formInput} value={info.time} onChange={e => update("time", e.target.value)} />
        </div>
        <div style={dv.formField}>
          <label style={dv.formLabel}>都道府県 ★</label>
          <select style={dv.formInput} value={info.prefecture} onChange={e => update("prefecture", e.target.value)}>
            {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={dv.formField}>
          <label style={dv.formLabel}>性別 ★</label>
          <select style={dv.formInput} value={info.gender} onChange={e => update("gender", e.target.value)}>
            <option value="female">女性</option>
            <option value="male">男性</option>
            <option value="other">その他</option>
          </select>
        </div>
      </div>
      <div style={dv.formActions}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!ready}
          style={{ ...dv.actionBtn, opacity: ready ? 1 : 0.4, cursor: ready ? "pointer" : "not-allowed" }}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
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
  const [consultantInfo, setConsultantInfo] = useState(DEFAULT_CONSULTANT_INFO);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
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
    const info = loadConsultantInfo(profile.id);
    setConsultantInfo(info || DEFAULT_CONSULTANT_INFO);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  useEffect(() => {
    if (!hydrated) return;
    const toSave = messages.map(m => ({ ...m, streaming: false }));
    try { localStorage.setItem(chatKey(profile.id), JSON.stringify(toSave)); } catch {}
  }, [messages, hydrated, profile.id]);

  useEffect(() => {
    if (hydrated) saveConsultantInfo(profile.id, consultantInfo);
  }, [consultantInfo, hydrated, profile.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, formOpen]);

  function clearChat() {
    if (!confirm("会話履歴をリセットしますか？")) return;
    setMessages([greetingMsg()]);
  }

  function ngHit(text) {
    const list = (profile.ngWords || "").split(",").map(s => s.trim()).filter(Boolean);
    return list.find(w => text.includes(w));
  }

  // AIに送るための履歴（hidden を含む、divination は除外）
  function apiHistory(extra = []) {
    return [...messages, ...extra]
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role, content: m.content }));
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
      const apiMessages = next
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(profile),
          messages: apiMessages,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        let errMsg = "不明なエラー";
        try { const data = await res.json(); errMsg = data.error || errMsg; } catch {}
        setMessages(p => [...p, { role: "assistant", content: `応答エラー: ${errMsg}`, time: nowTime(), error: true }]);
        return;
      }

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
          const text2 = accumulated;
          setMessages(p => {
            const prev = [...p];
            prev[prev.length - 1] = { ...prev[prev.length - 1], content: text2 };
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

  // 占いを実行
  async function performDivination(typeId) {
    if (!isConsultantInfoComplete(consultantInfo)) {
      setPendingType(typeId);
      setFormOpen(true);
      return;
    }

    setLoading(true);
    let result;
    try {
      result = await callDivinationAPI(typeId, consultantInfo);
    } catch (err) {
      setMessages(p => [...p, {
        role: "assistant",
        content: `占い結果を取得できませんでした。\n\nlocalhost:5500 が起動しているか、CORS（Access-Control-Allow-Origin）が許可されているか確認してください。\n\nエラー: ${err.message}`,
        time: nowTime(),
        error: true,
      }]);
      setLoading(false);
      return;
    }

    const divMsg = { role: "divination", content: result, time: nowTime() };
    const triggerMsg = {
      role: "user",
      content: `（占い結果が画面に表示されました）
占術: ${DIVINATION_TYPES.find(t => t.id === result.type)?.label || result.type}
タイトル: ${result.title}
${result.summary ? `概要: ${result.summary}\n` : ""}${result.detail ? `詳細: ${result.detail}\n` : ""}${result.advice ? `アドバイス: ${result.advice}` : ""}

この結果を踏まえて、${profile.name}の言葉で相談者に解釈を伝えてください。`,
      time: nowTime(),
      hidden: true,
    };
    const nextMessages = [...messages, divMsg, triggerMsg];
    setMessages(nextMessages);

    // AIに解釈を依頼
    try {
      const apiMessages = nextMessages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: buildSystemPrompt(profile), messages: apiMessages }),
      });
      if (!res.ok) throw new Error("AI解釈の取得に失敗しました");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      setMessages(p => [...p, { role: "assistant", content: text || "解釈を取得できませんでした", time: nowTime() }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "AIによる解釈の取得に失敗しました。", time: nowTime(), error: true }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmitForm() {
    setFormOpen(false);
    if (pendingType) {
      const t = pendingType;
      setPendingType(null);
      performDivination(t);
    }
  }

  function handleDeclineDivination() {
    send("（今は遠慮します。別の話を続けたい）");
  }

  // 表示用メッセージ（hidden を除外）
  const renderable = messages.filter(m => !m.hidden);
  const lastRenderable = renderable[renderable.length - 1];
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
              downloadFile(`chat-${profile.name || "kagemusha"}-${stamp}.md`, messagesToMarkdown(messages.filter(m => !m.hidden && m.role !== "divination"), profile.name || "影武者"), "text/markdown;charset=utf-8");
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
                const hits = renderable.filter(m => typeof m.content === "string" && m.content.toLowerCase().includes(q)).length;
                return hits > 0 ? `${hits} 件ヒット` : "ヒットなし";
              })()}
            </div>
          )}
        </div>
      )}
      <div style={ts.messages}>
        {(() => {
          const q = searchOpen ? searchQuery.trim().toLowerCase() : "";
          const visible = q
            ? renderable.filter(m => typeof m.content === "string" && m.content.toLowerCase().includes(q))
            : renderable;
          return visible.map((m, i) => {
            // 占い結果カード
            if (m.role === "divination") {
              return (
                <div key={i} style={{ ...ts.row, animation: "fadeInUp 0.3s ease" }}>
                  <div style={{ ...ts.msgAvatar, background: "linear-gradient(135deg,#fde68a,#a78bfa)", color: "#1a0e2e" }}>占</div>
                  <div>
                    <DivinationCard data={m.content} />
                    <div style={{ ...ts.time }}>{m.time}</div>
                  </div>
                </div>
              );
            }
            const bubbleStyle = m.role === "user"
              ? ts.bubbleUser
              : m.error
                ? { ...ts.bubbleAI, ...ts.bubbleError }
                : m.safety
                  ? { ...ts.bubbleAI, ...ts.bubbleSafety }
                  : ts.bubbleAI;

            // この AI 返答が占いの提案で、最後の表示メッセージなら、アクションボタンを出す
            const isLastRenderable = m === lastRenderable;
            const offer = m.role === "assistant" && !m.error && !m.safety && detectDivinationOffer(m.content || "");
            const offerType = offer ? detectDivinationType(m.content || "") : null;
            const showActions = offer && isLastRenderable && !loading;

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
                    {showActions && (
                      <div style={dv.actionRow}>
                        <button
                          type="button"
                          style={dv.actionBtn}
                          onClick={() => performDivination(offerType?.id || "tarot")}
                        >
                          🔮 {offerType?.label || "占いを引く"}で占う
                        </button>
                        <button
                          type="button"
                          style={dv.actionBtnSec}
                          onClick={handleDeclineDivination}
                        >
                          遠慮します
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ ...ts.time, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
                </div>
              </div>
            );
          });
        })()}
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

      {/* 占いフォーム */}
      {formOpen && (
        <ConsultantForm
          info={consultantInfo}
          onChange={setConsultantInfo}
          onSubmit={handleSubmitForm}
          onClose={() => { setFormOpen(false); setPendingType(null); }}
        />
      )}

      {/* 占術選択 */}
      {typePickerOpen && (
        <div style={{ ...dv.formCard, padding: "10px 14px" }}>
          <div style={{ ...dv.formTitle, marginBottom: 4 }}>
            <span>🔮 どの占術で占いますか？</span>
            <button type="button" onClick={() => setTypePickerOpen(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DIVINATION_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                style={{ ...dv.actionBtnSec, padding: "5px 12px" }}
                onClick={() => { setTypePickerOpen(false); performDivination(t.id); }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
        <button
          type="button"
          onClick={() => setTypePickerOpen(o => !o)}
          aria-label="占いを引く"
          title="占いを引く"
          style={{
            background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)",
            color: "#c4b5fd", borderRadius: 12, padding: "0 12px",
            fontSize: 18, cursor: "pointer", fontFamily: "inherit", height: 42, alignSelf: "flex-end",
          }}>
          🔮
        </button>
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
      <div style={ts.footer}>Enter で送信 · Shift+Enter で改行 · 🔮 で占いを引く</div>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
