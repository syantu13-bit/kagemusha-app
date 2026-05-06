"use client";
import { useState, useEffect } from "react";
import { STORAGE_KEY, DEFAULT_PROFILE, useIsMobile, isLiveAt } from "./lib";
import { cs } from "./styles";
import ChatTab from "./components/ChatTab";
import BookingTab from "./components/BookingTab";
import AdminTab from "./components/AdminTab";

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

  const initials = (profile.name || "K")[0].toUpperCase();
  const isLiveNow = isLiveAt(profile);

  return (
    <div style={cs.root}>
      <div style={cs.bg1} /><div style={cs.bg2} /><div style={cs.bg3} />

      <div style={cs.shell}>
        <header style={{ ...cs.header, ...(isMobile ? cs.headerMobile : {}) }}>
          <div style={cs.headerLeft}>
            <div style={{
              ...cs.avatarSm,
              background: `linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`,
              boxShadow: `0 0 16px ${profile.avatarColor1}66`,
            }}>
              {initials}
              <span style={isLiveNow ? cs.dotLive : cs.dotAI} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={cs.headerName}>
                {profile.name}
                {!isMobile && <span style={cs.headerAI}> 影武者相談室</span>}
              </div>
              <div style={cs.headerStatus}>{isLiveNow ? "🟢 本人が対応中" : "🤖 AI影武者が対応中"}</div>
            </div>
          </div>
          <nav style={cs.nav} aria-label="メインナビゲーション">
            {[["chat", "💬", "相談"], ["booking", "📅", "予約"], ["admin", "🎭", "設定"]].map(([id, icon, label]) => (
              <button
                key={id}
                style={{ ...cs.navBtn, ...(tab === id ? cs.navBtnActive : {}), ...(isMobile ? { padding: "7px 10px" } : {}) }}
                onClick={() => setTab(id)}
                aria-current={tab === id ? "page" : undefined}
                aria-label={label}
              >
                <span aria-hidden="true">{icon}</span>{!isMobile && ` ${label}`}
              </button>
            ))}
          </nav>
        </header>

        <main style={cs.main}>
          {tab === "chat" && <ChatTab profile={profile} initials={initials} />}
          {tab === "booking" && <BookingTab isMobile={isMobile} />}
          {tab === "admin" && <AdminTab profile={profile} setProfile={saveProfile} initials={initials} isMobile={isMobile} />}
        </main>
      </div>

      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
      `}</style>
    </div>
  );
}
