"use client";
import { useState, useEffect } from "react";

// ─── 永続化キー ──────────────────────────────────────
export const PROFILES_KEY = "kagemusha_profiles_v3";
// レガシー（v2/v1）からの移行用
const LEGACY_PROFILE_KEY = "kagemusha_profile_v2";
const LEGACY_CHAT_KEY = "kagemusha_chat_v1";
const LEGACY_BOOKINGS_KEY = "kagemusha_bookings_v1";

export const chatKey = (id) => `kagemusha_chat_v2_${id}`;
export const bookingsKey = (id) => `kagemusha_bookings_v2_${id}`;

export function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// ─── デフォルトプロフィール ──────────────────────────
export const DEFAULT_PROFILE = {
  name: "Kenji",
  tagline: "人生相談のプロ",
  avatarColor1: "#7c3aed",
  avatarColor2: "#2563eb",
  specialty: "人生相談・キャリア・人間関係",
  tone: "温かく、落ち着いた、知的",
  greeting: "こんにちは。どんな悩みでも、気軽に話しかけてください。",
  selfIntro: "10年以上、人の悩みに向き合ってきました。一緒に考えましょう。",
  ngWords: "死にたい,消えたい",
  activeHours: [
    { start: "10:00", end: "12:00", label: "午前" },
    { start: "14:00", end: "16:00", label: "午後" },
    { start: "19:00", end: "21:00", label: "夜" },
  ],
  maxReplyLength: "150",
  style: "empathy_first",
  language: "polite",
  theme: "default",
};

// ─── 背景テーマプリセット ────────────────────────────
export const BG_PRESETS = [
  { id: "default", name: "夜の紫", bg: "linear-gradient(135deg,#080612 0%,#120d20 50%,#0a1520 100%)" },
  { id: "ocean",   name: "深海",   bg: "linear-gradient(135deg,#020617 0%,#0c1e3a 50%,#0a1f2a 100%)" },
  { id: "sakura",  name: "桜夜",   bg: "linear-gradient(135deg,#1a0a14 0%,#2a0e1f 50%,#1a0e1c 100%)" },
  { id: "forest",  name: "森閑",   bg: "linear-gradient(135deg,#0a1410 0%,#0e2018 50%,#08120e 100%)" },
  { id: "paper",   name: "和紙",   bg: "linear-gradient(135deg,#1c1612 0%,#2a201a 50%,#1f1813 100%)" },
];

export function getThemeBg(themeId) {
  return (BG_PRESETS.find(t => t.id === themeId) || BG_PRESETS[0]).bg;
}

// ─── ファイルダウンロード ──────────────────────────────
export function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function bookingsToCsv(bookings) {
  const headers = ["date", "slot", "name", "email", "worry", "createdAt"];
  const escape = v => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = bookings.map(b => headers.map(h => escape(b[h])).join(","));
  return "﻿" + [headers.join(","), ...rows].join("\n");
}

export function messagesToMarkdown(messages, profileName) {
  const header = `# ${profileName} との会話\n\n_${new Date().toLocaleString("ja-JP")} 出力_\n\n---\n`;
  const body = messages.map(m => {
    const who = m.role === "user" ? "**あなた**" : `**${profileName}**`;
    const time = m.time ? ` _(${m.time})_` : "";
    return `${who}${time}\n\n${m.content}\n`;
  }).join("\n");
  return header + "\n" + body;
}

// ─── 選択肢 ─────────────────────────────────────────
export const SLOTS_DEMO = ["10:00","10:30","11:00","11:30","14:00","14:30","15:00","19:00","19:30","20:00"];
export const QUICK_TOPICS = ["仕事のストレスが辛い","人間関係に悩んでいる","将来が不安","自信が持てない"];
export const STYLE_OPTIONS = [
  { value:"empathy_first", label:"共感優先", desc:"まず気持ちに寄り添い、その後アドバイス" },
  { value:"solution_first", label:"解決策優先", desc:"具体的なアクションを先に提示" },
  { value:"question_based", label:"対話型", desc:"質問を重ねて悩みを深掘りする" },
];
export const LANG_OPTIONS = [
  { value:"polite", label:"丁寧語", example:"〜ですね、〜と思います" },
  { value:"casual", label:"タメ口", example:"〜だね、〜だよ" },
  { value:"professional", label:"プロ口調", example:"〜でございます" },
];
export const COLOR_PRESETS = [
  ["#7c3aed","#2563eb"],["#db2777","#f97316"],["#059669","#0891b2"],
  ["#dc2626","#9333ea"],["#d97706","#16a34a"],["#1e293b","#334155"],
];
export const WEEKDAYS = ["日","月","火","水","木","金","土"];
export const MONTHS_JP = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

// ─── ユーティリティ ──────────────────────────────────
export function useIsMobile(breakpoint = 720) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = e => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export function nowTime() {
  return new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});
}
export function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
export function getFirstDay(y,m){ return new Date(y,m,1).getDay(); }

export function buildSystemPrompt(p) {
  const styleMap = { empathy_first:"まず共感、その後アドバイス", solution_first:"解決策を先に提示", question_based:"質問を重ねて深掘り" };
  const langMap  = { polite:"丁寧語（〜ですね）", casual:"タメ口（〜だね）", professional:"プロ口調（〜でございます）" };
  return `あなたは「${p.name}」という人物の影武者AIです。
専門：${p.specialty}
自己紹介：${p.selfIntro}
口調：${langMap[p.language]}
スタイル：${styleMap[p.style]}
${p.maxReplyLength}字以内で返答。禁止ワード：${p.ngWords}
相談者に${p.name}として真摯に答えてください。`;
}

// ─── プロフィール永続化 ────────────────────────────
export function loadProfilesState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.profiles?.length && parsed.activeId) {
        // 互換性: idが欠けているprofileを補正
        const fixed = parsed.profiles.map(p => p.id ? p : { ...p, id: generateId() });
        const activeId = fixed.find(p => p.id === parsed.activeId) ? parsed.activeId : fixed[0].id;
        return { profiles: fixed, activeId };
      }
    }
    // v2 -> v3 マイグレーション
    const legacyRaw = localStorage.getItem(LEGACY_PROFILE_KEY);
    if (legacyRaw) {
      const old = JSON.parse(legacyRaw);
      const id = generateId();
      const merged = { ...DEFAULT_PROFILE, ...old, id };
      const oldChat = localStorage.getItem(LEGACY_CHAT_KEY);
      if (oldChat) try { localStorage.setItem(chatKey(id), oldChat); } catch {}
      const oldBookings = localStorage.getItem(LEGACY_BOOKINGS_KEY);
      if (oldBookings) try { localStorage.setItem(bookingsKey(id), oldBookings); } catch {}
      const state = { profiles: [merged], activeId: id };
      try { localStorage.setItem(PROFILES_KEY, JSON.stringify(state)); } catch {}
      return state;
    }
  } catch {}
  return null;
}

export function saveProfilesState(state) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(state)); } catch {}
}

export function createDefaultProfile(name = "新しい影武者") {
  return { ...DEFAULT_PROFILE, id: generateId(), name, greeting: "こんにちは。お話を聞かせてください。" };
}

export function isLiveAt(profile, date = new Date()) {
  const cur = date.getHours() * 60 + date.getMinutes();
  return profile.activeHours.some(slot => {
    const [sh,sm] = slot.start.split(":").map(Number);
    const [eh,em] = slot.end.split(":").map(Number);
    return cur >= sh*60+sm && cur < eh*60+em;
  });
}
