"use client";
import { useState, useEffect, useRef } from "react";
import {
  DEFAULT_PROFILE, useIsMobile, isLiveAt, getThemeBg,
  loadProfilesState, saveProfilesState, createDefaultProfile,
  chatKey, bookingsKey, getProfileStats,
} from "./lib";
import { cs } from "./styles";
import ChatTab from "./components/ChatTab";
import BookingTab from "./components/BookingTab";
import AdminTab from "./components/AdminTab";
import ProfileTab from "./components/ProfileTab";

export default function App() {
  const [tab, setTab] = useState("chat"); // chat | booking | admin
  const [profiles, setProfiles] = useState(() => [{ ...DEFAULT_PROFILE, id: "default" }]);
  const [activeId, setActiveId] = useState("default");
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const isMobile = useIsMobile();
  const switcherRef = useRef(null);

  useEffect(() => {
    const loaded = loadProfilesState();
    if (loaded) {
      setProfiles(loaded.profiles);
      setActiveId(loaded.activeId);
    }
  }, []);

  // メニューの外側クリックで閉じる
  useEffect(() => {
    if (!switcherOpen) return;
    function handler(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [switcherOpen]);

  const profile = profiles.find(p => p.id === activeId) || profiles[0];

  function persist(nextProfiles, nextActiveId) {
    setProfiles(nextProfiles);
    if (nextActiveId !== undefined) setActiveId(nextActiveId);
    saveProfilesState({ profiles: nextProfiles, activeId: nextActiveId ?? activeId });
  }

  function saveProfile(updated) {
    const next = profiles.map(p => p.id === updated.id ? updated : p);
    persist(next);
  }

  function addProfile() {
    const created = createDefaultProfile();
    persist([...profiles, created], created.id);
    setSwitcherOpen(false);
    setTab("admin");
  }

  function selectProfile(id) {
    persist(profiles, id);
    setSwitcherOpen(false);
  }

  function deleteProfile(id) {
    if (profiles.length <= 1) return;
    const target = profiles.find(p => p.id === id);
    if (!target) return;
    if (!confirm(`「${target.name}」を削除しますか？\n会話履歴と予約も一緒に削除されます。`)) return;
    const next = profiles.filter(p => p.id !== id);
    const newActive = activeId === id ? next[0].id : activeId;
    try { localStorage.removeItem(chatKey(id)); } catch {}
    try { localStorage.removeItem(bookingsKey(id)); } catch {}
    persist(next, newActive);
  }

  const initials = (profile.name || "K")[0].toUpperCase();
  const isLiveNow = isLiveAt(profile);

  return (
    <div style={{ ...cs.root, background: getThemeBg(profile.theme) }}>
      <div style={cs.bg1} /><div style={cs.bg2} /><div style={cs.bg3} />

      <div style={cs.shell}>
        <header style={{ ...cs.header, ...(isMobile ? cs.headerMobile : {}) }}>
          <div style={cs.headerLeft}>
            <div ref={switcherRef} style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setSwitcherOpen(o => !o)}
                aria-label={`影武者を切替（現在: ${profile.name}）`}
                aria-expanded={switcherOpen}
                style={{
                  ...cs.avatarSm,
                  background: `linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`,
                  boxShadow: `0 0 16px ${profile.avatarColor1}66`,
                  border: "none", padding: 0, cursor: "pointer",
                }}>
                {initials}
                <span style={isLiveNow ? cs.dotLive : cs.dotAI} />
              </button>
              {switcherOpen && (
                <div role="menu" style={{
                  position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 50,
                  minWidth: 220, background: "rgba(20,15,30,0.96)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
                  padding: 6, boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(12px)",
                }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", padding: "6px 10px 4px", textTransform: "uppercase" }}>
                    影武者を切替 ({profiles.length})
                  </div>
                  {profiles.map(p => {
                    const stats = getProfileStats(p.id);
                    const meta = [];
                    if (stats.messageCount > 0) meta.push(`💬${stats.messageCount}`);
                    if (stats.bookingCount > 0) meta.push(`📅${stats.bookingCount}`);
                    return (
                      <button
                        type="button"
                        key={p.id}
                        role="menuitem"
                        onClick={() => selectProfile(p.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, width: "100%",
                          padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                          border: "none", textAlign: "left", fontFamily: "inherit",
                          background: p.id === activeId ? "rgba(124,58,237,0.18)" : "transparent",
                          color: "#f1f0ff",
                        }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: `linear-gradient(135deg,${p.avatarColor1},${p.avatarColor2})`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, fontWeight: 700, fontFamily: "'Noto Serif JP',serif",
                          flexShrink: 0,
                        }}>{(p.name || "?")[0].toUpperCase()}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13, fontWeight: p.id === activeId ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </span>
                          {meta.length > 0 && (
                            <span style={{ display: "block", fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
                              {meta.join(" · ")}
                            </span>
                          )}
                        </span>
                        {p.id === activeId && <span style={{ color: "#a78bfa", fontSize: 11 }}>選択中</span>}
                      </button>
                    );
                  })}
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "6px 4px" }} />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={addProfile}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                      border: "none", textAlign: "left", fontFamily: "inherit",
                      background: "transparent", color: "#c4b5fd", fontSize: 13,
                    }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>+</span>
                    新しい影武者を追加
                  </button>
                </div>
              )}
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
            {[["chat", "💬", "相談"], ["profile", "🌙", "紹介"], ["booking", "📅", "予約"], ["admin", "🎭", "設定"]].map(([id, icon, label]) => (
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
          {tab === "profile" && <ProfileTab profile={profile} isMobile={isMobile} onStartChat={() => setTab("chat")} />}
          {tab === "booking" && <BookingTab profile={profile} isMobile={isMobile} />}
          {tab === "admin" && (
            <AdminTab
              profile={profile}
              setProfile={saveProfile}
              initials={initials}
              isMobile={isMobile}
              profiles={profiles}
              activeId={activeId}
              onSelectProfile={selectProfile}
              onAddProfile={addProfile}
              onDeleteProfile={deleteProfile}
            />
          )}
        </main>
      </div>

      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
      `}</style>
    </div>
  );
}
