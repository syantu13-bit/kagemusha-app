"use client";
import { useState, useEffect, useRef } from "react";
import { cs, ts, bk, ad, baseInput } from "./styles";

// ─── 定数 ───────────────────────────────────────────
const STORAGE_KEY = "kagemusha_profile_v2";
const CHAT_KEY = "kagemusha_chat_v1";
const BOOKINGS_KEY = "kagemusha_bookings_v1";

const DEFAULT_PROFILE = {
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

const SLOTS_DEMO = ["10:00","10:30","11:00","11:30","14:00","14:30","15:00","19:00","19:30","20:00"];
const QUICK_TOPICS = ["仕事のストレスが辛い","人間関係に悩んでいる","将来が不安","自信が持てない"];
const STYLE_OPTIONS = [
  { value:"empathy_first", label:"共感優先", desc:"まず気持ちに寄り添い、その後アドバイス" },
  { value:"solution_first", label:"解決策優先", desc:"具体的なアクションを先に提示" },
  { value:"question_based", label:"対話型", desc:"質問を重ねて悩みを深掘りする" },
];
const LANG_OPTIONS = [
  { value:"polite", label:"丁寧語", example:"〜ですね、〜と思います" },
  { value:"casual", label:"タメ口", example:"〜だね、〜だよ" },
  { value:"professional", label:"プロ口調", example:"〜でございます" },
];
const COLOR_PRESETS = [
  ["#7c3aed","#2563eb"],["#db2777","#f97316"],["#059669","#0891b2"],
  ["#dc2626","#9333ea"],["#d97706","#16a34a"],["#1e293b","#334155"],
];
const WEEKDAYS = ["日","月","火","水","木","金","土"];
const MONTHS_JP = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];

// ─── ユーティリティ ──────────────────────────────────
function useIsMobile(breakpoint = 720) {
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

function nowTime() {
  return new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"});
}
function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m){ return new Date(y,m,1).getDay(); }
function buildSystemPrompt(p) {
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

// ─── メインコンポーネント ────────────────────────────
export default function App() {
  const [tab, setTab] = useState("chat"); // chat | booking | admin
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const isMobile = useIsMobile();

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setProfile(p => ({ ...p, ...JSON.parse(s) }));
    } catch {}
  }, []);

  function saveProfile(p) {
    setProfile(p);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
  }

  const initials = (profile.name||"K")[0].toUpperCase();
  const isLiveNow = (() => {
    const h = new Date().getHours(), m = new Date().getMinutes();
    const cur = h * 60 + m;
    return profile.activeHours.some(slot => {
      const [sh,sm] = slot.start.split(":").map(Number);
      const [eh,em] = slot.end.split(":").map(Number);
      return cur >= sh*60+sm && cur < eh*60+em;
    });
  })();

  return (
    <div style={cs.root}>
      {/* 背景 */}
      <div style={cs.bg1}/><div style={cs.bg2}/><div style={cs.bg3}/>

      <div style={cs.shell}>
        {/* ヘッダー */}
        <header style={{...cs.header, ...(isMobile ? cs.headerMobile : {})}}>
          <div style={cs.headerLeft}>
            <div style={{
              ...cs.avatarSm,
              background:`linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`,
              boxShadow:`0 0 16px ${profile.avatarColor1}66`,
            }}>
              {initials}
              <span style={isLiveNow ? cs.dotLive : cs.dotAI}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={cs.headerName}>
                {profile.name}
                {!isMobile && <span style={cs.headerAI}> 影武者相談室</span>}
              </div>
              <div style={cs.headerStatus}>{isLiveNow ? "🟢 本人が対応中" : "🤖 AI影武者が対応中"}</div>
            </div>
          </div>
          <nav style={cs.nav} aria-label="メインナビゲーション">
            {[["chat","💬","相談"],["booking","📅","予約"],["admin","🎭","設定"]].map(([id,icon,label]) => (
              <button
                key={id}
                style={{...cs.navBtn, ...(tab===id?cs.navBtnActive:{}), ...(isMobile?{padding:"7px 10px"}:{})}}
                onClick={()=>setTab(id)}
                aria-current={tab===id ? "page" : undefined}
                aria-label={label}
              >
                <span aria-hidden="true">{icon}</span>{!isMobile && ` ${label}`}
              </button>
            ))}
          </nav>
        </header>

        {/* コンテンツ */}
        <main style={cs.main}>
          {tab === "chat"    && <ChatTab profile={profile} isLiveNow={isLiveNow} initials={initials}/>}
          {tab === "booking" && <BookingTab isMobile={isMobile}/>}
          {tab === "admin"   && <AdminTab profile={profile} setProfile={saveProfile} initials={initials} isMobile={isMobile}/>}
        </main>
      </div>

      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  チャットタブ
// ══════════════════════════════════════════════════
function ChatTab({ profile, isLiveNow, initials }) {
  const greetingMsg = () => ({
    role:"assistant",
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

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [messages, loading]);

  function clearChat() {
    if (!confirm("会話履歴をリセットしますか？")) return;
    setMessages([greetingMsg()]);
  }

  function ngHit(text) {
    const list = (profile.ngWords || "").split(",").map(s=>s.trim()).filter(Boolean);
    return list.find(w => text.includes(w));
  }

  async function send(text) {
    const t = text || input.trim();
    if (!t || loading) return;
    setInput("");
    const userMsg = { role:"user", content:t, time:nowTime() };
    const next = [...messages, userMsg];
    setMessages(next);

    const hit = ngHit(t);
    if (hit) {
      setMessages(p => [...p, {
        role:"assistant",
        content:`大切なお話をしてくれてありがとうございます。\n専門の相談窓口（よりそいホットライン: 0120-279-338 / いのちの電話: 0570-783-556）にも、いつでも気軽に話してみてください。\nここでも引き続きお話を聞きます。`,
        time:nowTime(),
        safety:true,
      }]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          system: buildSystemPrompt(profile),
          messages: next.map(m=>({role:m.role, content:m.content})),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(p => [...p, {role:"assistant", content:`応答エラー: ${data.error || "不明なエラー"}`, time:nowTime(), error:true}]);
        return;
      }
      const reply = data.content?.[0]?.text || "少し考えさせてください…";
      setMessages(p => [...p, {role:"assistant", content:reply, time:nowTime()}]);
    } catch {
      setMessages(p => [...p, {role:"assistant", content:"接続が不安定です。もう一度お試しください。", time:nowTime(), error:true}]);
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
        {messages.map((m,i) => {
          const bubbleStyle = m.role==="user"
            ? ts.bubbleUser
            : m.error
              ? {...ts.bubbleAI, ...ts.bubbleError}
              : m.safety
                ? {...ts.bubbleAI, ...ts.bubbleSafety}
                : ts.bubbleAI;
          return (
          <div key={i} style={{...ts.row, flexDirection:m.role==="user"?"row-reverse":"row", animation:"fadeInUp 0.3s ease"}}>
            {m.role==="assistant" && (
              <div style={{...ts.msgAvatar, background:`linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`}}>{initials}</div>
            )}
            <div>
              <div style={{...ts.bubble, ...bubbleStyle}}>
                {m.content.split("\n").map((l,j)=><span key={j}>{l}{j<m.content.split("\n").length-1&&<br/>}</span>)}
              </div>
              <div style={{...ts.time, textAlign:m.role==="user"?"right":"left"}}>{m.time}</div>
            </div>
          </div>
          );
        })}
        {loading && (
          <div style={{...ts.row}}>
            <div style={{...ts.msgAvatar, background:`linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`}}>{initials}</div>
            <div style={{...ts.bubble,...ts.bubbleAI,...ts.typing}}>
              {[0,200,400].map(d=><span key={d} style={{...ts.dot,animationDelay:`${d}ms`}}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {messages.length <= 1 && (
        <div style={ts.quickWrap}>
          <div style={ts.quickLabel}>よくある相談</div>
          <div style={ts.quickBtns}>
            {QUICK_TOPICS.map(t=>(
              <button key={t} style={ts.quickBtn} onClick={()=>send(t)}>{t}</button>
            ))}
          </div>
        </div>
      )}

      <div style={ts.inputRow}>
        <textarea
          style={ts.textarea} rows={2} value={input} placeholder="悩みを入力してください…"
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
        />
        <button style={{...ts.sendBtn,opacity:(!input.trim()||loading)?0.35:1}} onClick={()=>send()} disabled={!input.trim()||loading}>
          送信
        </button>
      </div>
      <div style={ts.footer}>Enter で送信 · Shift+Enter で改行</div>
    </div>
  );
}

// ══════════════════════════════════════════════════
//  予約タブ
// ══════════════════════════════════════════════════
function BookingTab({ isMobile }) {
  const today = new Date();
  const [year,setYear]   = useState(today.getFullYear());
  const [month,setMonth] = useState(today.getMonth());
  const [day,setDay]     = useState(null);
  const [slot,setSlot]   = useState(null);
  const [step,setStep]   = useState("cal"); // cal|slot|form|done
  const [form,setForm]   = useState({name:"",email:"",worry:""});
  const [bookings,setBookings] = useState([]);

  useEffect(() => {
    try {
      const s = localStorage.getItem(BOOKINGS_KEY);
      if (s) setBookings(JSON.parse(s) || []);
    } catch {}
  }, []);

  function persistBookings(next) {
    setBookings(next);
    try { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(next)); } catch {}
  }

  const dateKey = day ? `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : "";
  const bookedSlotsForDate = bookings.filter(b => b.date === dateKey).map(b => b.slot);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const formValid = form.name.trim() && emailValid && form.worry.trim();

  function isPast(d){ const dt=new Date(year,month,d); dt.setHours(0,0,0,0); const t=new Date(); t.setHours(0,0,0,0); return dt<t; }
  function prevM(){ if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); setDay(null); }
  function nextM(){ if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); setDay(null); }
  const dateLabel = day ? `${year}年${MONTHS_JP[month]}${day}日` : "";

  function confirmBooking() {
    if (!formValid || !dateKey || !slot) return;
    const next = [...bookings, {
      date: dateKey, slot,
      name: form.name.trim(), email: form.email.trim(), worry: form.worry.trim(),
      createdAt: new Date().toISOString(),
    }];
    persistBookings(next);
    setStep("done");
  }

  return (
    <div style={bk.wrap}>
      {/* ステップ */}
      <div style={bk.steps}>
        {["日程","時間","入力","完了"].map((l,i)=>{
          const cur = ["cal","slot","form","done"].indexOf(step);
          return (
            <div key={i} style={bk.stepItem}>
              <div style={{...bk.stepCircle,
                background: i<cur?"#7c3aed":i===cur?"linear-gradient(135deg,#7c3aed,#4f46e5)":"rgba(255,255,255,0.07)",
                boxShadow: i===cur?"0 0 14px rgba(124,58,237,0.5)":"none",
              }}>{i<cur?"✓":i+1}</div>
              <div style={{...bk.stepLabel,color:i<=cur?"#c4b5fd":"rgba(255,255,255,0.25)"}}>{l}</div>
              {i<3&&<div style={{...bk.stepLine,background:i<cur?"#7c3aed":"rgba(255,255,255,0.08)"}}/>}
            </div>
          );
        })}
      </div>

      {/* カレンダー */}
      {step==="cal" && (
        <div style={bk.section}>
          <div style={bk.calNav}>
            <button type="button" aria-label="前の月" style={bk.navBtn} onClick={prevM}>‹</button>
            <span style={bk.calTitle}>{year}年 {MONTHS_JP[month]}</span>
            <button type="button" aria-label="次の月" style={bk.navBtn} onClick={nextM}>›</button>
          </div>
          <div style={bk.calGrid} role="grid" aria-label="日付選択">
            {WEEKDAYS.map(w=>(
              <div key={w} style={{...bk.cell,fontSize:11,color:w==="日"?"#f87171":w==="土"?"#60a5fa":"rgba(255,255,255,0.35)",paddingBottom:6}}>{w}</div>
            ))}
            {Array(getFirstDay(year,month)).fill(null).map((_,i)=><div key={"e"+i} style={bk.cell}/>)}
            {Array(getDaysInMonth(year,month)).fill(null).map((_,i)=>{
              const d=i+1,past=isPast(d),sel=day===d;
              const isTd=d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
              return (
                <button
                  type="button"
                  key={d}
                  disabled={past}
                  aria-label={`${MONTHS_JP[month]}${d}日${isTd?" 今日":""}`}
                  aria-pressed={sel}
                  style={{...bk.cell,...bk.dayCell,
                    opacity:past?.25:1,cursor:past?"default":"pointer",
                    background:sel?"linear-gradient(135deg,#7c3aed,#4f46e5)":isTd?"rgba(124,58,237,0.18)":"transparent",
                    border:isTd&&!sel?"1px solid rgba(124,58,237,0.45)":"1px solid transparent",
                    color:sel?"#fff":"#e8e6f0",
                    boxShadow:sel?"0 4px 14px rgba(124,58,237,0.4)":"none",
                    font:"inherit",
                  }}
                  onClick={()=>{if(!past){setDay(d);setSlot(null);setStep("slot");}}}
                >{d}</button>
              );
            })}
          </div>
          <div style={bk.hint}>📌 本人対応は平日10〜12時・14〜16時・19〜21時</div>
        </div>
      )}

      {/* 時間枠 */}
      {step==="slot" && (
        <div style={bk.section}>
          <div style={bk.subHeader}>
            <button style={bk.backBtn} onClick={()=>setStep("cal")}>← 日程を変更</button>
            <span style={bk.subDate}>{dateLabel}</span>
          </div>
          <div style={bk.slotGrid} role="radiogroup" aria-label="時間帯">
            {SLOTS_DEMO.map(s=>{
              const booked=bookedSlotsForDate.includes(s),sel=slot===s;
              return (
                <button
                  type="button"
                  key={s}
                  disabled={booked}
                  role="radio"
                  aria-checked={sel}
                  aria-label={`${s}${booked?" 満席":""}`}
                  style={{...bk.slotItem,
                    background:booked?"rgba(255,255,255,0.03)":sel?"linear-gradient(135deg,#7c3aed,#4f46e5)":"rgba(255,255,255,0.06)",
                    border:booked?"1px solid rgba(255,255,255,0.04)":sel?"none":"1px solid rgba(255,255,255,0.1)",
                    color:booked?"rgba(255,255,255,0.18)":sel?"#fff":"#e8e6f0",
                    cursor:booked?"not-allowed":"pointer",
                    boxShadow:sel?"0 4px 14px rgba(124,58,237,0.4)":"none",
                    font:"inherit",
                  }}
                  onClick={()=>{if(!booked)setSlot(s);}}
                >
                  {booked?<><span>{s}</span><span style={bk.fullBadge}>満席</span></>:s}
                </button>
              );
            })}
          </div>
          <button style={{...bk.primaryBtn,opacity:slot?1:0.35}} disabled={!slot} onClick={()=>setStep("form")}>
            {slot?`${slot} で予約を進める →`:"時間を選んでください"}
          </button>
        </div>
      )}

      {/* フォーム */}
      {step==="form" && (
        <div style={bk.section}>
          <div style={bk.subHeader}>
            <button style={bk.backBtn} onClick={()=>setStep("slot")}>← 時間を変更</button>
            <span style={bk.subDate}>{dateLabel} {slot}</span>
          </div>
          <div style={bk.formFields}>
            <div style={bk.formGroup}>
              <label style={bk.formLabel}>お名前</label>
              <input type="text" placeholder="山田 太郎" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={bk.formInput}/>
            </div>
            <div style={bk.formGroup}>
              <label style={bk.formLabel}>メールアドレス</label>
              <input type="email" placeholder="your@email.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={{...bk.formInput, borderColor: form.email && !emailValid ? "rgba(248,113,113,0.6)" : undefined}}/>
              {form.email && !emailValid && (
                <div style={{fontSize:11,color:"#fca5a5",marginTop:4}}>メールアドレスの形式が正しくありません</div>
              )}
            </div>
            <div style={bk.formGroup}>
              <label style={bk.formLabel}>相談内容（簡単に）</label>
              <textarea placeholder="どんなことで悩んでいるか…" value={form.worry} onChange={e=>setForm(f=>({...f,worry:e.target.value}))} style={{...bk.formInput,height:80,resize:"none"}}/>
            </div>
          </div>
          <button style={{...bk.primaryBtn,opacity:formValid?1:0.35}} disabled={!formValid} onClick={confirmBooking}>
            予約を確定する ✓
          </button>
        </div>
      )}

      {/* 完了 */}
      {step==="done" && (
        <div style={{...bk.section,textAlign:"center",padding:"36px 24px"}}>
          <div style={{fontSize:52,marginBottom:12}}>🎉</div>
          <div style={bk.doneTitle}>予約が完了しました</div>
          <div style={bk.doneSub}>{dateLabel} {slot} に相談枠を確保しました</div>
          <div style={bk.doneCard}>
            {[["お名前",form.name],["メール",form.email],["日時",`${dateLabel} ${slot}`]].map(([l,v])=>(
              <div key={l} style={bk.doneRow}><span style={{color:"rgba(255,255,255,0.4)"}}>{l}</span><span style={{color:"#e8e6f0"}}>{v}</span></div>
            ))}
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:20}}>確認メールをお送りしました。当日はチャット画面からアクセスしてください。</div>
          <button style={bk.primaryBtn} onClick={()=>{setStep("cal");setDay(null);setSlot(null);setForm({name:"",email:"",worry:""});}}>
            別の日程で予約する
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════
//  管理タブ
// ══════════════════════════════════════════════════
function AdminTab({ profile, setProfile, initials, isMobile }) {
  const [tab, setTab]   = useState(0);
  const [savedFlash,setSavedFlash] = useState(false);
  const [prev,setPrev]  = useState({msg:"",reply:"",loading:false});

  function upd(k,v){
    setProfile({...profile,[k]:v});
    setSavedFlash(true);
    setTimeout(()=>setSavedFlash(false), 1500);
  }
  function updHour(i,k,v){
    const next=profile.activeHours.map((h,idx)=>idx===i?{...h,[k]:v}:h);
    upd("activeHours",next);
  }

  async function runPreview(){
    if(!prev.msg.trim()) return;
    setPrev(p=>({...p,loading:true,reply:""}));
    try {
      const res = await fetch("/api/chat",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({system:buildSystemPrompt(profile),messages:[{role:"user",content:prev.msg}]}),
      });
      const data=await res.json();
      setPrev(p=>({...p,reply:data.content?.[0]?.text||"応答を取得できませんでした",loading:false}));
    } catch { setPrev(p=>({...p,reply:"エラーが発生しました",loading:false})); }
  }

  const ADMIN_TABS=["基本情報","口調・スタイル","対応時間","プレビュー"];

  return (
    <div style={{...ad.wrap, ...(isMobile ? ad.wrapMobile : {})}}>
      {/* サイドバー */}
      <div style={{...ad.sidebar, ...(isMobile ? ad.sidebarMobile : {})}}>
        <div style={ad.sideLabel}>影武者プレビュー</div>
        <div style={{...ad.avatarBig,background:`linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`,boxShadow:`0 0 32px ${profile.avatarColor1}55`}}>
          {initials}
        </div>
        <div style={ad.sideName}>{profile.name||"名前未設定"}</div>
        <div style={ad.sideTag}>{profile.tagline||"—"}</div>
        <div style={ad.sideSp}>{profile.specialty||"—"}</div>
        <div style={ad.sideDivider}/>
        <div style={ad.sideSecLabel}>挨拶文</div>
        <div style={ad.sideGreeting}>「{profile.greeting||"未設定"}」</div>
        <div style={ad.sideSecLabel}>対応時間</div>
        {profile.activeHours.map((h,i)=>(
          <div key={i} style={ad.sideHour}><span style={ad.sideHourDot}/>　{h.label} {h.start}〜{h.end}</div>
        ))}
        <div style={{
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
      </div>

      {/* メイン */}
      <div style={ad.main}>
        <div style={ad.tabRow}>
          {ADMIN_TABS.map((l,i)=>(
            <button key={i} style={{...ad.tab,...(tab===i?ad.tabActive:{})}} onClick={()=>setTab(i)}>{l}</button>
          ))}
        </div>

        <div style={ad.tabBody}>
          {/* 基本情報 */}
          {tab===0 && (
            <>
              <Field label="表示名"><Input value={profile.name} onChange={v=>upd("name",v)} placeholder="例：Kenji"/></Field>
              <Field label="タグライン"><Input value={profile.tagline} onChange={v=>upd("tagline",v)} placeholder="例：人生相談のプロ"/></Field>
              <Field label="専門分野"><Input value={profile.specialty} onChange={v=>upd("specialty",v)} placeholder="例：キャリア・人間関係"/></Field>
              <Field label="自己紹介文"><Textarea value={profile.selfIntro} onChange={v=>upd("selfIntro",v)} placeholder="AIが使う自己紹介テキスト" rows={3}/></Field>
              <Field label="最初の挨拶"><Textarea value={profile.greeting} onChange={v=>upd("greeting",v)} placeholder="チャット開始時の挨拶" rows={2}/></Field>
              <Field label="アバターカラー">
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}} role="radiogroup" aria-label="アバターカラー">
                  {COLOR_PRESETS.map(([c1,c2],i)=>(
                    <button
                      type="button"
                      key={i}
                      role="radio"
                      aria-checked={profile.avatarColor1===c1}
                      aria-label={`カラー${i+1}`}
                      onClick={()=>{upd("avatarColor1",c1);upd("avatarColor2",c2);}}
                      style={{
                        width:36,height:36,borderRadius:"50%",cursor:"pointer",padding:0,
                        background:`linear-gradient(135deg,${c1},${c2})`,
                        border:profile.avatarColor1===c1?"3px solid #fff":"3px solid transparent",
                        boxShadow:profile.avatarColor1===c1?`0 0 10px ${c1}88`:"none",
                        transition:"all 0.2s",
                      }}
                    />
                  ))}
                </div>
              </Field>
              <Field label="NGワード（カンマ区切り）"><Input value={profile.ngWords} onChange={v=>upd("ngWords",v)} placeholder="例：保証します,絶対に"/></Field>
            </>
          )}

          {/* 口調・スタイル */}
          {tab===1 && (
            <>
              <Field label="応答スタイル">
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}} role="radiogroup" aria-label="応答スタイル">
                  {STYLE_OPTIONS.map(o=>(
                    <button
                      type="button"
                      key={o.value}
                      role="radio"
                      aria-checked={profile.style===o.value}
                      onClick={()=>upd("style",o.value)}
                      style={{
                        flex:"1 1 120px",borderRadius:12,padding:"12px",cursor:"pointer",transition:"all 0.2s",
                        border:profile.style===o.value?"1px solid #7c3aed":"1px solid rgba(255,255,255,0.08)",
                        background:profile.style===o.value?"rgba(124,58,237,0.15)":"rgba(255,255,255,0.04)",
                        textAlign:"left",font:"inherit",
                      }}
                    >
                      <div style={{fontSize:13,fontWeight:600,color:"#f1f0ff",marginBottom:4}}>{o.label}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",lineHeight:1.5}}>{o.desc}</div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="言葉づかい">
                <div style={{display:"flex",gap:10,flexWrap:"wrap"}} role="radiogroup" aria-label="言葉づかい">
                  {LANG_OPTIONS.map(o=>(
                    <button
                      type="button"
                      key={o.value}
                      role="radio"
                      aria-checked={profile.language===o.value}
                      onClick={()=>upd("language",o.value)}
                      style={{
                        flex:"1 1 110px",borderRadius:12,padding:"12px",cursor:"pointer",transition:"all 0.2s",
                        border:profile.language===o.value?"1px solid #7c3aed":"1px solid rgba(255,255,255,0.08)",
                        background:profile.language===o.value?"rgba(124,58,237,0.15)":"rgba(255,255,255,0.04)",
                        textAlign:"left",font:"inherit",
                      }}
                    >
                      <div style={{fontSize:13,fontWeight:600,color:"#f1f0ff",marginBottom:4}}>{o.label}</div>
                      <div style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>{o.example}</div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={`返答の最大文字数：${profile.maxReplyLength}字`}>
                <input type="range" min="80" max="400" step="20" value={profile.maxReplyLength} onChange={e=>upd("maxReplyLength",e.target.value)} style={{width:"100%"}}/>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginTop:6}}>
                  {profile.maxReplyLength<=100?"短め・テンポよい":profile.maxReplyLength<=200?"標準・バランスが良い":"長め・じっくり丁寧"}
                </div>
              </Field>
            </>
          )}

          {/* 対応時間 */}
          {tab===2 && (
            <>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.8,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 14px",marginBottom:4}}>
                本人が直接対応する時間帯を設定します。それ以外はAI影武者が自動応答します。
              </div>
              {profile.activeHours.map((h,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",background:"rgba(255,255,255,0.04)",borderRadius:12,padding:"12px 16px"}}>
                  <span style={{fontSize:11,color:"#a78bfa",background:"rgba(124,58,237,0.15)",borderRadius:6,padding:"3px 8px",whiteSpace:"nowrap"}}>{h.label}</span>
                  <input type="time" aria-label={`${h.label}の開始時刻`} value={h.start} onChange={e=>updHour(i,"start",e.target.value)} style={ad.timeInput}/>
                  <span style={{color:"rgba(255,255,255,0.3)"}}>〜</span>
                  <input type="time" aria-label={`${h.label}の終了時刻`} value={h.end} onChange={e=>updHour(i,"end",e.target.value)} style={ad.timeInput}/>
                  <input aria-label="ラベル" value={h.label} onChange={e=>updHour(i,"label",e.target.value)} placeholder="ラベル" style={{...ad.input,width:80,flex:isMobile?"1 1 100%":"none"}}/>
                </div>
              ))}
              {/* 24時間バー */}
              <div style={{marginTop:8}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.3)",marginBottom:8}}>24時間表示</div>
                <div style={{display:"flex",gap:2,height:24}}>
                  {Array(24).fill(null).map((_,h)=>{
                    const on=profile.activeHours.some(slot=>{
                      const[sh,sm]=slot.start.split(":").map(Number);
                      const[eh,em]=slot.end.split(":").map(Number);
                      return h>=sh && h<eh;
                    });
                    return <div key={h} style={{flex:1,borderRadius:3,background:on?"linear-gradient(to bottom,#7c3aed,#4f46e5)":"rgba(255,255,255,0.05)",boxShadow:on?"0 0 6px rgba(124,58,237,0.4)":"none",transition:"all 0.3s"}}/>;
                  })}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
                  {[0,6,12,18,24].map(h=><span key={h} style={{fontSize:10,color:"rgba(255,255,255,0.25)"}}>{h}時</span>)}
                </div>
              </div>
            </>
          )}

          {/* プレビュー */}
          {tab===3 && (
            <>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",lineHeight:1.8,background:"rgba(255,255,255,0.03)",borderRadius:10,padding:"12px 14px"}}>
                現在の設定でAI影武者に話しかけてテストできます。
              </div>
              <div style={{minHeight:100,background:"rgba(0,0,0,0.25)",borderRadius:14,padding:"14px",display:"flex",flexDirection:"column",gap:10}}>
                {prev.reply && (
                  <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,flexShrink:0}}>
                      {(profile.name||"K")[0]}
                    </div>
                    <div style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"10px 14px",fontSize:13,color:"#e8e6f0",lineHeight:1.7,maxWidth:360}}>
                      {prev.reply}
                    </div>
                  </div>
                )}
                {prev.loading && <div style={{color:"rgba(255,255,255,0.3)",fontSize:13,paddingLeft:40}}>考え中…</div>}
              </div>
              <div style={{display:"flex",gap:10}}>
                <input style={{...ad.input,flex:1}} placeholder="悩みを入力してテスト…" value={prev.msg} onChange={e=>setPrev(p=>({...p,msg:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&runPreview()}/>
                <button style={{...ad.saveBtn,width:"auto",padding:"10px 20px",opacity:prev.msg.trim()&&!prev.loading?1:0.35}} onClick={runPreview} disabled={!prev.msg.trim()||prev.loading}>送信</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 小コンポーネント ─────────────────────────────────
function Field({label,children}){
  return <div style={{display:"flex",flexDirection:"column",gap:8}}><div style={{fontSize:12,color:"#a78bfa",fontWeight:500}}>{label}</div>{children}</div>;
}
function Input({value,onChange,placeholder,style:extra}){
  return <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{...baseInput,...extra}}/>;
}
function Textarea({value,onChange,placeholder,rows=3}){
  return <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...baseInput,lineHeight:1.7}}/>;
}
