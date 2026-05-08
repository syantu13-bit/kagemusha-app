"use client";
import { useState, useRef, useEffect } from "react";
import {
  COLOR_PRESETS, STYLE_OPTIONS, LANG_OPTIONS, BG_PRESETS, DEFAULT_PROFILE,
  buildSystemPrompt, downloadFile,
} from "../lib";
import { Markdown } from "../markdown";
import { ad, baseInput } from "../styles";

const ADMIN_TABS = ["基本情報", "口調・スタイル", "世界観・語彙", "対応時間", "プレビュー"];

// 配列フィールド <-> テキストエリア（行区切り）の変換
const linesToArr = (s) => s.split("\n").map(t => t.trim()).filter(Boolean);
const arrToLines = (a) => Array.isArray(a) ? a.join("\n") : "";
// カンマ区切り（タグ的）
const tagsToArr = (s) => s.split(/[,、]/).map(t => t.trim()).filter(Boolean);
const arrToTags = (a) => Array.isArray(a) ? a.join("、") : "";

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 500 }}>{label}</div>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, style: extra }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...baseInput, ...extra }} />;
}
function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...baseInput, lineHeight: 1.7 }} />;
}

export default function AdminTab({
  profile, setProfile, initials, isMobile,
  profiles, activeId, onSelectProfile, onAddProfile, onDeleteProfile,
}) {
  const [tab, setTab] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);
  const [prev, setPrev] = useState({ msg: "", reply: "", loading: false });
  const [health, setHealth] = useState(null); // null=未確認 | {ok, checks}
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then(r => r.json().then(d => ({ ok: r.ok, ...d })))
      .then(d => { if (!cancelled) setHealth(d); })
      .catch(() => { if (!cancelled) setHealth({ ok: false, checks: {} }); });
    return () => { cancelled = true; };
  }, []);

  function exportProfile() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(
      `kagemusha-profile-${profile.name || "default"}-${stamp}.json`,
      JSON.stringify(profile, null, 2),
      "application/json;charset=utf-8"
    );
  }

  async function importProfile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || typeof parsed.name !== "string") {
        alert("無効なファイルです（プロフィールJSONではありません）");
        return;
      }
      if (!confirm(`「${parsed.name}」の設定を読み込んで現在の設定を上書きしますか？`)) return;
      // 現在のプロフィールIDは保持（プロフィール一覧の整合性のため）
      setProfile({ ...DEFAULT_PROFILE, ...parsed, id: profile.id });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch {
      alert("ファイルの読み込みに失敗しました（JSONとして解析できません）");
    }
  }

  function upd(k, v) {
    setProfile({ ...profile, [k]: v });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }
  function updHour(i, k, v) {
    const next = profile.activeHours.map((h, idx) => idx === i ? { ...h, [k]: v } : h);
    upd("activeHours", next);
  }

  async function runPreview() {
    if (!prev.msg.trim()) return;
    setPrev(p => ({ ...p, loading: true, reply: "" }));
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: buildSystemPrompt(profile), messages: [{ role: "user", content: prev.msg }] }),
      });
      const data = await res.json();
      setPrev(p => ({ ...p, reply: data.content?.[0]?.text || data.error || "応答を取得できませんでした", loading: false }));
    } catch { setPrev(p => ({ ...p, reply: "エラーが発生しました", loading: false })); }
  }

  return (
    <div style={{ ...ad.wrap, ...(isMobile ? ad.wrapMobile : {}) }}>
      {/* サイドバー */}
      <div style={{ ...ad.sidebar, ...(isMobile ? ad.sidebarMobile : {}) }}>
        {profiles && profiles.length > 0 && (
          <div style={{ width: "100%", marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              編集中の影武者
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <select
                value={activeId}
                onChange={e => onSelectProfile?.(e.target.value)}
                aria-label="影武者を選択"
                style={{
                  flex: 1, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                  padding: "6px 8px", color: "#f1f0ff", fontSize: 12,
                  fontFamily: "inherit", colorScheme: "dark",
                }}>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name || "（名称未設定）"}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={onAddProfile}
                aria-label="新しい影武者を追加"
                title="新しい影武者を追加"
                style={{
                  background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)",
                  color: "#c4b5fd", borderRadius: 8, width: 32, fontSize: 16,
                  cursor: "pointer", fontFamily: "inherit",
                }}>+</button>
            </div>
          </div>
        )}
        <div style={ad.sideLabel}>影武者プレビュー</div>
        <div style={{ ...ad.avatarBig, background: `linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`, boxShadow: `0 0 32px ${profile.avatarColor1}55` }}>
          {initials}
        </div>
        <div style={ad.sideName}>{profile.name || "名前未設定"}</div>
        <div style={ad.sideTag}>{profile.tagline || "—"}</div>
        <div style={ad.sideSp}>{profile.specialty || "—"}</div>
        <div style={ad.sideDivider} />
        <div style={ad.sideSecLabel}>挨拶文</div>
        <div style={ad.sideGreeting}>「{profile.greeting || "未設定"}」</div>
        <div style={ad.sideSecLabel}>対応時間</div>
        {profile.activeHours.map((h, i) => (
          <div key={i} style={ad.sideHour}><span style={ad.sideHourDot} />　{h.label} {h.start}〜{h.end}</div>
        ))}
        <div
          role="status"
          aria-live="polite"
          style={{
            ...ad.saveBtn,
            background: savedFlash ? "#059669" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "default",
            textAlign: "center",
            boxShadow: savedFlash ? "0 0 12px rgba(5,150,105,0.4)" : "none",
            transition: "background 0.3s, box-shadow 0.3s",
          }}>
          {savedFlash ? "✓ 保存しました" : "🟢 変更は自動保存されます"}
        </div>
        <div style={{ display: "flex", gap: 6, width: "100%", marginTop: 4 }}>
          <button
            type="button"
            onClick={exportProfile}
            aria-label="プロフィールをエクスポート"
            style={{
              flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#c4b5fd", borderRadius: 8, padding: "6px 8px",
              fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            }}>
            📤 出力
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="プロフィールをインポート"
            style={{
              flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#c4b5fd", borderRadius: 8, padding: "6px 8px",
              fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            }}>
            📥 読込
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={importProfile}
            style={{ display: "none" }}
            aria-hidden="true"
          />
        </div>
        {profiles && profiles.length > 1 && (
          <button
            type="button"
            onClick={() => onDeleteProfile?.(activeId)}
            aria-label="この影武者を削除"
            style={{
              width: "100%", marginTop: 4,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5", borderRadius: 8, padding: "6px",
              fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            }}>
            🗑 この影武者を削除
          </button>
        )}
        {health !== null && (
          <div
            title={
              health.ok
                ? "Gemini APIキーが設定されています"
                : !health.checks?.env_GEMINI_API_KEY_present
                  ? "GEMINI_API_KEY が設定されていません"
                  : "API接続を確認できません"
            }
            style={{
              width: "100%", marginTop: 8, padding: "5px 8px",
              fontSize: 10, textAlign: "center", borderRadius: 6,
              background: health.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${health.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              color: health.ok ? "#86efac" : "#fca5a5",
            }}>
            {health.ok ? "🟢 API設定OK" : "🔴 API設定エラー"}
          </div>
        )}
      </div>

      {/* メイン */}
      <div style={ad.main}>
        <div style={ad.tabRow} role="tablist">
          {ADMIN_TABS.map((l, i) => (
            <button key={i} role="tab" aria-selected={tab === i} style={{ ...ad.tab, ...(tab === i ? ad.tabActive : {}) }} onClick={() => setTab(i)}>{l}</button>
          ))}
        </div>

        <div style={ad.tabBody}>
          {/* 基本情報 */}
          {tab === 0 && (
            <>
              <Field label="表示名"><Input value={profile.name} onChange={v => upd("name", v)} placeholder="例：Kenji" /></Field>
              <Field label="タグライン"><Input value={profile.tagline} onChange={v => upd("tagline", v)} placeholder="例：人生相談のプロ" /></Field>
              <Field label="専門分野"><Input value={profile.specialty} onChange={v => upd("specialty", v)} placeholder="例：キャリア・人間関係" /></Field>
              <Field label="自己紹介文"><Textarea value={profile.selfIntro} onChange={v => upd("selfIntro", v)} placeholder="AIが使う自己紹介テキスト" rows={3} /></Field>
              <Field label="最初の挨拶"><Textarea value={profile.greeting} onChange={v => upd("greeting", v)} placeholder="チャット開始時の挨拶" rows={2} /></Field>
              <Field label="アバターカラー">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} role="radiogroup" aria-label="アバターカラー">
                  {COLOR_PRESETS.map(([c1, c2], i) => (
                    <button
                      type="button" key={i} role="radio"
                      aria-checked={profile.avatarColor1 === c1}
                      aria-label={`カラー${i + 1}`}
                      onClick={() => { upd("avatarColor1", c1); upd("avatarColor2", c2); }}
                      style={{
                        width: 36, height: 36, borderRadius: "50%", cursor: "pointer", padding: 0,
                        background: `linear-gradient(135deg,${c1},${c2})`,
                        border: profile.avatarColor1 === c1 ? "3px solid #fff" : "3px solid transparent",
                        boxShadow: profile.avatarColor1 === c1 ? `0 0 10px ${c1}88` : "none",
                        transition: "all 0.2s",
                      }}
                    />
                  ))}
                </div>
              </Field>
              <Field label="NGワード（カンマ区切り）"><Input value={profile.ngWords} onChange={v => upd("ngWords", v)} placeholder="例：保証します,絶対に" /></Field>
              <Field label="背景テーマ">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} role="radiogroup" aria-label="背景テーマ">
                  {BG_PRESETS.map(t => (
                    <button
                      type="button" key={t.id} role="radio"
                      aria-checked={profile.theme === t.id}
                      aria-label={t.name}
                      onClick={() => upd("theme", t.id)}
                      style={{
                        flex: "1 1 80px", borderRadius: 12, padding: 0, cursor: "pointer", overflow: "hidden",
                        border: profile.theme === t.id ? "2px solid #a78bfa" : "2px solid rgba(255,255,255,0.08)",
                        boxShadow: profile.theme === t.id ? "0 0 12px rgba(167,139,250,0.4)" : "none",
                        transition: "all 0.2s", height: 60, position: "relative",
                      }}>
                      <div style={{ position: "absolute", inset: 0, background: t.bg }} />
                      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "4px 6px", fontSize: 11, color: "#fff", textAlign: "center", background: "rgba(0,0,0,0.35)" }}>{t.name}</div>
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* 口調・スタイル */}
          {tab === 1 && (
            <>
              <Field label="応答スタイル">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} role="radiogroup" aria-label="応答スタイル">
                  {STYLE_OPTIONS.map(o => (
                    <button
                      type="button" key={o.value} role="radio"
                      aria-checked={profile.style === o.value}
                      onClick={() => upd("style", o.value)}
                      style={{
                        flex: "1 1 120px", borderRadius: 12, padding: "12px", cursor: "pointer", transition: "all 0.2s",
                        border: profile.style === o.value ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.08)",
                        background: profile.style === o.value ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                        textAlign: "left", font: "inherit",
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f0ff", marginBottom: 4 }}>{o.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{o.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="言葉づかい">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }} role="radiogroup" aria-label="言葉づかい">
                  {LANG_OPTIONS.map(o => (
                    <button
                      type="button" key={o.value} role="radio"
                      aria-checked={profile.language === o.value}
                      onClick={() => upd("language", o.value)}
                      style={{
                        flex: "1 1 110px", borderRadius: 12, padding: "12px", cursor: "pointer", transition: "all 0.2s",
                        border: profile.language === o.value ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.08)",
                        background: profile.language === o.value ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                        textAlign: "left", font: "inherit",
                      }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f0ff", marginBottom: 4 }}>{o.label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{o.example}</div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={`返答の最大文字数：${profile.maxReplyLength}字`}>
                <input type="range" min="80" max="400" step="20" value={profile.maxReplyLength} onChange={e => upd("maxReplyLength", e.target.value)} style={{ width: "100%" }} />
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                  {profile.maxReplyLength <= 100 ? "短め・テンポよい" : profile.maxReplyLength <= 200 ? "標準・バランスが良い" : "長め・じっくり丁寧"}
                </div>
              </Field>
            </>
          )}

          {/* 世界観・語彙 */}
          {tab === 2 && (
            <>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
                キャラクターの世界観・口癖・能力を入力するとAIが拾ってくれます。<br />
                プロフィール画面の表示にも反映されます。
              </div>
              <Field label="象徴キーワード（カンマ or 読点区切り）">
                <Input
                  value={arrToTags(profile.keywords)}
                  onChange={v => upd("keywords", tagsToArr(v))}
                  placeholder="例：月、夜、静寂、浄化"
                />
                {profile.keywords?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {profile.keywords.map((k, i) => (
                      <span key={i} style={{
                        background: "rgba(124,58,237,0.15)",
                        border: "1px solid rgba(124,58,237,0.3)",
                        color: "#c4b5fd",
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontSize: 11,
                      }}>{k}</span>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="得意技・能力（1行ずつ）">
                <textarea
                  value={arrToLines(profile.abilities)}
                  onChange={e => upd("abilities", linesToArr(e.target.value))}
                  placeholder={"例：\n月読の箏（静寂の結界・浄化）\n月弓・朧ノ矢\n祝詞・祓詞・神託"}
                  rows={4}
                  style={{ ...baseInput, lineHeight: 1.7, fontFamily: "inherit", resize: "vertical" }}
                />
              </Field>
              <Field label="印象的なフレーズ／口癖（1行ずつ）">
                <textarea
                  value={arrToLines(profile.catchphrases)}
                  onChange={e => upd("catchphrases", linesToArr(e.target.value))}
                  placeholder={"例：\n月は沈まない。\n夜は、いつか明ける。"}
                  rows={4}
                  style={{ ...baseInput, lineHeight: 1.7, fontFamily: "inherit", resize: "vertical" }}
                />
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                  AIが時折これらを自然に織り込みます。プロフィール画面では引用として表示。
                </div>
              </Field>
              <Field label="演出方針（雰囲気の指示）">
                <Textarea
                  value={profile.tonePolicy || ""}
                  onChange={v => upd("tonePolicy", v)}
                  placeholder="例：過剰なテンションを避け、静謐で深みのある語り口を保つ。月や夜の比喩を好む。"
                  rows={3}
                />
              </Field>
            </>
          )}

          {/* 対応時間 */}
          {tab === 3 && (
            <>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
                本人が直接対応する時間帯を設定します。それ以外はAI影武者が自動応答します。
              </div>
              {profile.activeHours.map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 16px" }}>
                  <span style={{ fontSize: 11, color: "#a78bfa", background: "rgba(124,58,237,0.15)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>{h.label}</span>
                  <input type="time" aria-label={`${h.label}の開始時刻`} value={h.start} onChange={e => updHour(i, "start", e.target.value)} style={ad.timeInput} />
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>〜</span>
                  <input type="time" aria-label={`${h.label}の終了時刻`} value={h.end} onChange={e => updHour(i, "end", e.target.value)} style={ad.timeInput} />
                  <input aria-label="ラベル" value={h.label} onChange={e => updHour(i, "label", e.target.value)} placeholder="ラベル" style={{ ...ad.input, width: 80, flex: isMobile ? "1 1 100%" : "none" }} />
                </div>
              ))}
              {/* 24時間バー */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>24時間表示</div>
                <div style={{ display: "flex", gap: 2, height: 24 }}>
                  {Array(24).fill(null).map((_, h) => {
                    const on = profile.activeHours.some(slot => {
                      const [sh] = slot.start.split(":").map(Number);
                      const [eh] = slot.end.split(":").map(Number);
                      return h >= sh && h < eh;
                    });
                    return <div key={h} style={{ flex: 1, borderRadius: 3, background: on ? "linear-gradient(to bottom,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.05)", boxShadow: on ? "0 0 6px rgba(124,58,237,0.4)" : "none", transition: "all 0.3s" }} />;
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  {[0, 6, 12, 18, 24].map(h => <span key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{h}時</span>)}
                </div>
              </div>
            </>
          )}

          {/* プレビュー */}
          {tab === 4 && (
            <>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.8, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "12px 14px" }}>
                現在の設定でAI影武者に話しかけてテストできます。
              </div>
              <div style={{ minHeight: 100, background: "rgba(0,0,0,0.25)", borderRadius: 14, padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {prev.reply && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {(profile.name || "K")[0]}
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#e8e6f0", lineHeight: 1.7, maxWidth: 360 }}>
                      <Markdown>{prev.reply}</Markdown>
                    </div>
                  </div>
                )}
                {prev.loading && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, paddingLeft: 40 }}>考え中…</div>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input aria-label="プレビュー用メッセージ" style={{ ...ad.input, flex: 1 }} placeholder="悩みを入力してテスト…" value={prev.msg} onChange={e => setPrev(p => ({ ...p, msg: e.target.value }))} onKeyDown={e => e.key === "Enter" && runPreview()} />
                <button style={{ ...ad.saveBtn, width: "auto", padding: "10px 20px", opacity: prev.msg.trim() && !prev.loading ? 1 : 0.35 }} onClick={runPreview} disabled={!prev.msg.trim() || prev.loading}>送信</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
