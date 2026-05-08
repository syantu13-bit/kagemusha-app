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
  name: "ツクヨミ",
  tagline: "月夜に寄り添う占術の導き手",
  avatarColor1: "#1e3a8a", // 夜空の藍
  avatarColor2: "#cbd5e1", // 月光の銀
  specialty: "占術全般（月読・星読み・タロット・易・神託）と心の浄化・再生",
  tone: "静か、神秘的、慈悲深い",
  greeting: "…月光が、あなたを照らしています。\n何を、お話になりますか。",
  selfIntro: `日本神話の月神「ツクヨミ」を依代とする、中性的で穏やかな存在。
夜と静寂、陰陽の均衡、月の満ち欠けと時間を司り、占術を通して人の心に寄り添う。
口数は少なく、一言一言に重みを込めて語る。月や夜の比喩を好み、相手を急かさず静かに受け止める。
夜とは恐怖ではなく、休息・癒し・再生・内省のとき。人の弱さや孤独を深く理解し、静かに見守る。
占術として、月読・星読み・タロット・易・神託・祓詞を用い、迷う者に道を照らす。
過剰なテンションや軽さを避け、静謐で深みのある言葉で導く。`,
  catchphrases: [
    "月は沈まない。",
    "夜は、いつか明ける。",
    "闇の中でこそ、光が見える。",
    "静寂は、真実を隠さない。",
  ],
  abilities: [
    "月読の箏（静寂の結界・浄化・癒し）",
    "月弓・朧ノ矢（新月／満月／月蝕の三矢）",
    "祝詞・祓詞・神託",
    "月光操作・影移動・夢への干渉",
  ],
  keywords: ["月","夜","静寂","浄化","陰陽","再生","境界","神秘","月光"],
  tonePolicy: "過剰なテンションを避け、静謐で深みのある語り口を保つ。月や夜の比喩を好み、一言一言に重みを込める。中性的で柔らかな威厳を伴うこと。",
  ngWords: "死にたい,消えたい,絶対,保証",
  activeHours: [
    { start: "20:00", end: "22:00", label: "宵" },
    { start: "22:00", end: "23:30", label: "夜半" },
  ],
  maxReplyLength: "200",
  style: "empathy_first",
  language: "polite",
  theme: "ocean",
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
export const QUICK_TOPICS = ["迷っている選択について","今の運気を視てほしい","人との縁について","心が重く感じる"];
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
  const styleMap = {
    empathy_first: "まず相手の心情に静かに寄り添い、その上でそっと示唆を与える",
    solution_first: "具体的な道筋や答えを先に示す",
    question_based: "問いを重ね、相談者自身に気づきを促す",
  };
  const langMap = {
    polite: "丁寧語（〜です・〜ます）を基調に、落ち着いた言葉",
    casual: "親しみのあるくだけた言葉",
    professional: "格調高い、やや古風な言葉",
  };

  const blocks = [];
  if (Array.isArray(p.keywords) && p.keywords.length) {
    blocks.push(`【象徴キーワード】${p.keywords.join("・")}`);
  }
  if (Array.isArray(p.abilities) && p.abilities.length) {
    blocks.push(`【得意技・能力】\n${p.abilities.map(a => "・" + a).join("\n")}`);
  }
  if (Array.isArray(p.catchphrases) && p.catchphrases.length) {
    blocks.push(`【印象的なフレーズ集】\n${p.catchphrases.map(c => "・" + c).join("\n")}\n（時折、自然な形でこれらを織り込んでください。毎回使う必要はありません。）`);
  }
  if (p.tonePolicy && p.tonePolicy.trim()) {
    blocks.push(`【演出方針】${p.tonePolicy}`);
  }
  const richBlocks = blocks.length ? "\n\n" + blocks.join("\n\n") : "";

  const ngLine = p.ngWords && p.ngWords.trim()
    ? `\n【避ける表現】次の語は使わないでください: ${p.ngWords}`
    : "";

  return `あなたは「${p.name}」というキャラクターとして相談者と対話します。

【人物像 / 世界観】
${p.selfIntro}

【得意な領域】${p.specialty}${richBlocks}

【話し方】${langMap[p.language] || langMap.polite}
【応答スタイル】${styleMap[p.style] || styleMap.empathy_first}
【返答の目安】${p.maxReplyLength}字以内、簡潔に${ngLine}

このキャラクターの世界観・価値観・口調を一貫して保ち、自然な日本語で応えてください。
キャラクターの専門外と思える質問にも、断らず、キャラクターらしい視点で受け止めて答えてください。
過剰な絵文字や軽い言い回しは避け、設定された雰囲気を尊重してください。`;
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

// プロフィールIDから会話・予約のメタデータを取得（件数と最終更新）
export function getProfileStats(profileId) {
  if (typeof window === "undefined") return { messageCount: 0, lastMessageAt: null, bookingCount: 0 };
  let messageCount = 0, lastMessageAt = null, bookingCount = 0;
  try {
    const c = localStorage.getItem(chatKey(profileId));
    if (c) {
      const arr = JSON.parse(c);
      if (Array.isArray(arr)) {
        // 挨拶メッセージのみ（=1件で全部assistant）の場合は0扱い
        messageCount = arr.length <= 1 ? 0 : arr.length;
      }
    }
    const b = localStorage.getItem(bookingsKey(profileId));
    if (b) {
      const arr = JSON.parse(b);
      if (Array.isArray(arr)) bookingCount = arr.length;
    }
  } catch {}
  return { messageCount, bookingCount };
}


export function isLiveAt(profile, date = new Date()) {
  const cur = date.getHours() * 60 + date.getMinutes();
  return profile.activeHours.some(slot => {
    const [sh,sm] = slot.start.split(":").map(Number);
    const [eh,em] = slot.end.split(":").map(Number);
    return cur >= sh*60+sm && cur < eh*60+em;
  });
}

// ─── 通知（リマインダー） ────────────────────────────
export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationStatus() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  try {
    const r = await Notification.requestPermission();
    return r;
  } catch { return "denied"; }
}

export function bookingDateTime(b) {
  const [y, m, d] = b.date.split("-").map(Number);
  const [hh, mm] = b.slot.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

// 各予約の指定分前に通知を1回ずつ予約する。戻り値はクリーンアップ関数。
// setTimeout なのでタブが開いている間のみ動作する。
export function scheduleBookingReminders(bookings, profileName, leadMinutes = 30) {
  if (notificationStatus() !== "granted") return () => {};
  const now = Date.now();
  const horizon = 24 * 60 * 60 * 1000; // 24時間以内のみ予約
  const timers = [];
  for (const b of bookings) {
    const fireAt = bookingDateTime(b).getTime() - leadMinutes * 60_000;
    const delay = fireAt - now;
    if (delay <= 0 || delay > horizon) continue;
    const id = setTimeout(() => {
      try {
        new Notification("もうすぐ予約時間です", {
          body: `${profileName} ・ ${b.date} ${b.slot}（${leadMinutes}分前）`,
          tag: `booking-${b.date}-${b.slot}-${profileName}`,
        });
      } catch {}
    }, delay);
    timers.push(id);
  }
  return () => timers.forEach(t => clearTimeout(t));
}
