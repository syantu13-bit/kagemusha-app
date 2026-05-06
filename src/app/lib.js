"use client";
import { useState, useEffect } from "react";

// ─── 永続化キー ──────────────────────────────────────
export const STORAGE_KEY = "kagemusha_profile_v2";
export const CHAT_KEY = "kagemusha_chat_v1";
export const BOOKINGS_KEY = "kagemusha_bookings_v1";

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
};

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

export function isLiveAt(profile, date = new Date()) {
  const cur = date.getHours() * 60 + date.getMinutes();
  return profile.activeHours.some(slot => {
    const [sh,sm] = slot.start.split(":").map(Number);
    const [eh,em] = slot.end.split(":").map(Number);
    return cur >= sh*60+sm && cur < eh*60+em;
  });
}
