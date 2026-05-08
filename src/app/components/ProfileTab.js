"use client";
import { isLiveAt } from "../lib";

export default function ProfileTab({ profile, isMobile, onStartChat }) {
  const initials = (profile.name || "?")[0].toUpperCase();
  const live = isLiveAt(profile);
  const hasKeywords = Array.isArray(profile.keywords) && profile.keywords.length > 0;
  const hasAbilities = Array.isArray(profile.abilities) && profile.abilities.length > 0;
  const hasCatchphrases = Array.isArray(profile.catchphrases) && profile.catchphrases.length > 0;

  return (
    <div style={{ ...st.wrap, ...(isMobile ? st.wrapMobile : {}) }}>
      {/* 星の演出（背景） */}
      <div aria-hidden="true" style={st.stars}>
        {Array(20).fill(0).map((_, i) => (
          <span key={i} style={{
            ...st.star,
            top: `${(i * 37) % 100}%`,
            left: `${(i * 53) % 100}%`,
            animationDelay: `${(i * 0.3) % 4}s`,
            opacity: 0.2 + ((i * 13) % 50) / 100,
          }} />
        ))}
      </div>

      {/* ヒーロー */}
      <section style={{ ...st.hero, ...(isMobile ? st.heroMobile : {}) }}>
        <div style={{
          ...st.avatarRing,
          background: `radial-gradient(circle, ${profile.avatarColor1}55 0%, transparent 70%)`,
        }}>
          <div style={{
            ...st.avatar,
            background: `linear-gradient(135deg,${profile.avatarColor1},${profile.avatarColor2})`,
            boxShadow: `0 0 48px ${profile.avatarColor1}66, inset 0 0 32px rgba(255,255,255,0.1)`,
          }}>
            {initials}
          </div>
        </div>

        <div style={st.heroText}>
          <div style={st.statusPill}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: live ? "#22c55e" : "#a78bfa",
              boxShadow: `0 0 8px ${live ? "#22c55e" : "#a78bfa"}`,
            }} />
            {live ? "本人が対応中" : "AI影武者が対応中"}
          </div>
          <h1 style={st.name}>{profile.name}</h1>
          <p style={st.tagline}>{profile.tagline || "—"}</p>
          {profile.specialty && (
            <div style={st.specialty}>{profile.specialty}</div>
          )}
          <button type="button" onClick={onStartChat} style={st.cta}>
            相談を始める →
          </button>
        </div>
      </section>

      {/* 自己紹介 */}
      {profile.selfIntro && (
        <Section title="人物像">
          <div style={st.bioText}>
            {profile.selfIntro.split("\n").map((line, i) => (
              <p key={i} style={{ margin: "0 0 8px 0" }}>{line}</p>
            ))}
          </div>
        </Section>
      )}

      {/* 象徴キーワード */}
      {hasKeywords && (
        <Section title="象徴">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {profile.keywords.map((k, i) => (
              <span key={i} style={st.chip}>{k}</span>
            ))}
          </div>
        </Section>
      )}

      {/* 得意技・能力 */}
      {hasAbilities && (
        <Section title="得意な領域">
          <ul style={st.list}>
            {profile.abilities.map((a, i) => (
              <li key={i} style={st.listItem}>
                <span style={st.bullet} aria-hidden="true">◇</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 印象フレーズ */}
      {hasCatchphrases && (
        <Section title="印象に残る言葉">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {profile.catchphrases.map((c, i) => (
              <blockquote key={i} style={st.quote}>
                <span aria-hidden="true" style={st.quoteMark}>「</span>
                {c}
                <span aria-hidden="true" style={st.quoteMark}>」</span>
              </blockquote>
            ))}
          </div>
        </Section>
      )}

      {/* 対応時間 */}
      {profile.activeHours?.length > 0 && (
        <Section title="本人対応の時間帯">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {profile.activeHours.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#e8e6f0" }}>
                <span style={{
                  background: "rgba(124,58,237,0.15)",
                  color: "#c4b5fd",
                  borderRadius: 6,
                  padding: "3px 10px",
                  fontSize: 11,
                  minWidth: 50,
                  textAlign: "center",
                }}>{h.label}</span>
                <span style={{ fontFamily: "'Noto Serif JP', serif" }}>{h.start} 〜 {h.end}</span>
              </div>
            ))}
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", gap: 2, height: 14 }}>
                {Array(24).fill(null).map((_, h) => {
                  const on = profile.activeHours.some(slot => {
                    const [sh] = slot.start.split(":").map(Number);
                    const [eh] = slot.end.split(":").map(Number);
                    return h >= sh && h < eh;
                  });
                  return <div key={h} style={{
                    flex: 1, borderRadius: 2,
                    background: on ? `linear-gradient(to bottom, ${profile.avatarColor1}, ${profile.avatarColor2})` : "rgba(255,255,255,0.05)",
                    boxShadow: on ? `0 0 4px ${profile.avatarColor1}88` : "none",
                  }} />;
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                {[0, 6, 12, 18, 24].map(h => <span key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{h}時</span>)}
              </div>
            </div>
          </div>
        </Section>
      )}

      <div style={st.footer}>
        <button type="button" onClick={onStartChat} style={st.ctaSecondary}>
          相談を始める →
        </button>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.7; }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={st.section}>
      <h2 style={st.sectionTitle}>
        <span style={st.sectionMark} aria-hidden="true">◌</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

const st = {
  wrap: {
    flex: 1,
    overflow: "auto",
    padding: "30px 24px 60px",
    maxWidth: 720,
    margin: "0 auto",
    width: "100%",
    position: "relative",
  },
  wrapMobile: {
    padding: "20px 16px 50px",
  },
  stars: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    overflow: "hidden",
  },
  star: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: "50%",
    background: "#fff",
    animation: "twinkle 4s ease-in-out infinite",
  },
  hero: {
    display: "flex",
    alignItems: "center",
    gap: 28,
    padding: "20px 0 36px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 28,
    position: "relative",
  },
  heroMobile: {
    flexDirection: "column",
    textAlign: "center",
    gap: 16,
  },
  avatarRing: {
    width: 160,
    height: 160,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    animation: "breathe 4s ease-in-out infinite",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Noto Serif JP', serif",
    fontSize: 42,
    fontWeight: 700,
    color: "#fff",
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  name: {
    fontFamily: "'Noto Serif JP', serif",
    fontSize: 32,
    fontWeight: 700,
    color: "#f1f0ff",
    margin: "4px 0 6px",
    letterSpacing: "0.02em",
  },
  tagline: {
    fontSize: 14,
    color: "#a78bfa",
    margin: "0 0 10px",
    lineHeight: 1.6,
  },
  specialty: {
    display: "inline-block",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 999,
    padding: "4px 12px",
    marginBottom: 16,
  },
  cta: {
    display: "block",
    background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
    border: "none",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    fontFamily: "inherit",
    padding: "12px 26px",
    borderRadius: 14,
    cursor: "pointer",
    boxShadow: "0 6px 24px rgba(124,58,237,0.35)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  ctaSecondary: {
    background: "transparent",
    border: "1px solid rgba(167,139,250,0.4)",
    color: "#c4b5fd",
    fontSize: 13,
    fontFamily: "inherit",
    padding: "10px 22px",
    borderRadius: 12,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: "'Noto Serif JP', serif",
    fontSize: 14,
    fontWeight: 600,
    color: "#a78bfa",
    margin: "0 0 12px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    letterSpacing: "0.05em",
  },
  sectionMark: {
    color: "rgba(167,139,250,0.5)",
    fontSize: 12,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 1.85,
    color: "#e8e6f0",
  },
  chip: {
    background: "rgba(124,58,237,0.12)",
    border: "1px solid rgba(124,58,237,0.3)",
    color: "#c4b5fd",
    borderRadius: 999,
    padding: "5px 14px",
    fontSize: 12,
    fontFamily: "'Noto Serif JP', serif",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  listItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: 14,
    color: "#e8e6f0",
    lineHeight: 1.7,
  },
  bullet: {
    color: "#a78bfa",
    flexShrink: 0,
    marginTop: 2,
  },
  quote: {
    background: "rgba(255,255,255,0.03)",
    borderLeft: "2px solid rgba(167,139,250,0.5)",
    padding: "10px 16px",
    margin: 0,
    fontFamily: "'Noto Serif JP', serif",
    fontSize: 14,
    fontStyle: "italic",
    color: "#e8e6f0",
    lineHeight: 1.7,
  },
  quoteMark: {
    color: "rgba(167,139,250,0.5)",
    fontWeight: 700,
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
};
