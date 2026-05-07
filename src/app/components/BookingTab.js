"use client";
import { useState, useEffect } from "react";
import {
  bookingsKey, SLOTS_DEMO, MONTHS_JP, WEEKDAYS,
  getDaysInMonth, getFirstDay, downloadFile, bookingsToCsv,
} from "../lib";
import { bk } from "../styles";

export default function BookingTab({ profile, isMobile }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [day, setDay] = useState(null);
  const [slot, setSlot] = useState(null);
  const [step, setStep] = useState("cal"); // cal|slot|form|done
  const [form, setForm] = useState({ name: "", email: "", worry: "" });
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    try {
      const s = localStorage.getItem(bookingsKey(profile.id));
      setBookings(s ? (JSON.parse(s) || []) : []);
    } catch { setBookings([]); }
    // 切替時にステップを初期化
    setStep("cal");
    setDay(null);
    setSlot(null);
    setForm({ name: "", email: "", worry: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  function persistBookings(next) {
    setBookings(next);
    try { localStorage.setItem(bookingsKey(profile.id), JSON.stringify(next)); } catch {}
  }

  function cancelBooking(idx) {
    const b = bookings[idx];
    if (!b) return;
    if (!confirm(`${b.date} ${b.slot} の予約をキャンセルしますか？`)) return;
    persistBookings(bookings.filter((_, i) => i !== idx));
  }

  const dateKey = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
  const bookedSlotsForDate = bookings.filter(b => b.date === dateKey).map(b => b.slot);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const formValid = form.name.trim() && emailValid && form.worry.trim();

  function isPast(d) {
    const dt = new Date(year, month, d); dt.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return dt < t;
  }
  function prevM() { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); setDay(null); }
  function nextM() { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); setDay(null); }
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

  // 未来の予約のみリスト表示（過去はフィルタ）
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const upcoming = bookings
    .map((b, i) => ({ ...b, _idx: i }))
    .filter(b => b.date >= todayKey)
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));

  return (
    <div style={bk.wrap}>
      {/* 既存の予約リスト */}
      {step === "cal" && upcoming.length > 0 && (
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "14px 16px", marginBottom: 18,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              あなたの予約 ({upcoming.length}件)
            </div>
            <button
              type="button"
              onClick={() => downloadFile(`bookings-${profile.name || "kagemusha"}-${todayKey}.csv`, bookingsToCsv(bookings), "text/csv;charset=utf-8")}
              aria-label="予約をCSVでエクスポート"
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#c4b5fd", borderRadius: 8, padding: "4px 10px",
                fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              }}>
              📥 CSV
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map(b => {
              const [yy, mm, dd] = b.date.split("-").map(Number);
              return (
                <div key={b._idx} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(124,58,237,0.08)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: 10, padding: "10px 12px",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "#f1f0ff", fontWeight: 600 }}>
                      {yy}年{MONTHS_JP[mm - 1]}{dd}日 {b.slot}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {b.name} · {b.worry}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelBooking(b._idx)}
                    aria-label={`${b.date} ${b.slot} の予約をキャンセル`}
                    style={{
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                      color: "#fca5a5", borderRadius: 8, padding: "5px 10px",
                      fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                    }}>
                    キャンセル
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ステップ */}
      <div style={bk.steps}>
        {["日程", "時間", "入力", "完了"].map((l, i) => {
          const cur = ["cal", "slot", "form", "done"].indexOf(step);
          return (
            <div key={i} style={bk.stepItem}>
              <div style={{
                ...bk.stepCircle,
                background: i < cur ? "#7c3aed" : i === cur ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.07)",
                boxShadow: i === cur ? "0 0 14px rgba(124,58,237,0.5)" : "none",
              }}>{i < cur ? "✓" : i + 1}</div>
              <div style={{ ...bk.stepLabel, color: i <= cur ? "#c4b5fd" : "rgba(255,255,255,0.25)" }}>{l}</div>
              {i < 3 && <div style={{ ...bk.stepLine, background: i < cur ? "#7c3aed" : "rgba(255,255,255,0.08)" }} />}
            </div>
          );
        })}
      </div>

      {/* カレンダー */}
      {step === "cal" && (
        <div style={bk.section}>
          <div style={bk.calNav}>
            <button type="button" aria-label="前の月" style={bk.navBtn} onClick={prevM}>‹</button>
            <span style={bk.calTitle}>{year}年 {MONTHS_JP[month]}</span>
            <button type="button" aria-label="次の月" style={bk.navBtn} onClick={nextM}>›</button>
          </div>
          <div style={bk.calGrid} role="grid" aria-label="日付選択">
            {WEEKDAYS.map(w => (
              <div key={w} style={{ ...bk.cell, fontSize: 11, color: w === "日" ? "#f87171" : w === "土" ? "#60a5fa" : "rgba(255,255,255,0.35)", paddingBottom: 6 }}>{w}</div>
            ))}
            {Array(getFirstDay(year, month)).fill(null).map((_, i) => <div key={"e" + i} style={bk.cell} />)}
            {Array(getDaysInMonth(year, month)).fill(null).map((_, i) => {
              const d = i + 1, past = isPast(d), sel = day === d;
              const isTd = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <button
                  type="button"
                  key={d}
                  disabled={past}
                  aria-label={`${MONTHS_JP[month]}${d}日${isTd ? " 今日" : ""}`}
                  aria-pressed={sel}
                  style={{
                    ...bk.cell, ...bk.dayCell,
                    opacity: past ? .25 : 1, cursor: past ? "default" : "pointer",
                    background: sel ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : isTd ? "rgba(124,58,237,0.18)" : "transparent",
                    border: isTd && !sel ? "1px solid rgba(124,58,237,0.45)" : "1px solid transparent",
                    color: sel ? "#fff" : "#e8e6f0",
                    boxShadow: sel ? "0 4px 14px rgba(124,58,237,0.4)" : "none",
                    font: "inherit",
                  }}
                  onClick={() => { if (!past) { setDay(d); setSlot(null); setStep("slot"); } }}
                >{d}</button>
              );
            })}
          </div>
          <div style={bk.hint}>📌 本人対応は平日10〜12時・14〜16時・19〜21時</div>
        </div>
      )}

      {/* 時間枠 */}
      {step === "slot" && (
        <div style={bk.section}>
          <div style={bk.subHeader}>
            <button style={bk.backBtn} onClick={() => setStep("cal")}>← 日程を変更</button>
            <span style={bk.subDate}>{dateLabel}</span>
          </div>
          <div style={bk.slotGrid} role="radiogroup" aria-label="時間帯">
            {SLOTS_DEMO.map(s => {
              const booked = bookedSlotsForDate.includes(s), sel = slot === s;
              return (
                <button
                  type="button"
                  key={s}
                  disabled={booked}
                  role="radio"
                  aria-checked={sel}
                  aria-label={`${s}${booked ? " 満席" : ""}`}
                  style={{
                    ...bk.slotItem,
                    background: booked ? "rgba(255,255,255,0.03)" : sel ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.06)",
                    border: booked ? "1px solid rgba(255,255,255,0.04)" : sel ? "none" : "1px solid rgba(255,255,255,0.1)",
                    color: booked ? "rgba(255,255,255,0.18)" : sel ? "#fff" : "#e8e6f0",
                    cursor: booked ? "not-allowed" : "pointer",
                    boxShadow: sel ? "0 4px 14px rgba(124,58,237,0.4)" : "none",
                    font: "inherit",
                  }}
                  onClick={() => { if (!booked) setSlot(s); }}
                >
                  {booked ? <><span>{s}</span><span style={bk.fullBadge}>満席</span></> : s}
                </button>
              );
            })}
          </div>
          <button style={{ ...bk.primaryBtn, opacity: slot ? 1 : 0.35 }} disabled={!slot} onClick={() => setStep("form")}>
            {slot ? `${slot} で予約を進める →` : "時間を選んでください"}
          </button>
        </div>
      )}

      {/* フォーム */}
      {step === "form" && (
        <div style={bk.section}>
          <div style={bk.subHeader}>
            <button style={bk.backBtn} onClick={() => setStep("slot")}>← 時間を変更</button>
            <span style={bk.subDate}>{dateLabel} {slot}</span>
          </div>
          <div style={bk.formFields}>
            <div style={bk.formGroup}>
              <label style={bk.formLabel}>お名前</label>
              <input type="text" placeholder="山田 太郎" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={bk.formInput} />
            </div>
            <div style={bk.formGroup}>
              <label style={bk.formLabel}>メールアドレス</label>
              <input type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ ...bk.formInput, borderColor: form.email && !emailValid ? "rgba(248,113,113,0.6)" : undefined }} />
              {form.email && !emailValid && (
                <div style={{ fontSize: 11, color: "#fca5a5", marginTop: 4 }}>メールアドレスの形式が正しくありません</div>
              )}
            </div>
            <div style={bk.formGroup}>
              <label style={bk.formLabel}>相談内容（簡単に）</label>
              <textarea placeholder="どんなことで悩んでいるか…" value={form.worry} onChange={e => setForm(f => ({ ...f, worry: e.target.value }))} style={{ ...bk.formInput, height: 80, resize: "none" }} />
            </div>
          </div>
          <button style={{ ...bk.primaryBtn, opacity: formValid ? 1 : 0.35 }} disabled={!formValid} onClick={confirmBooking}>
            予約を確定する ✓
          </button>
        </div>
      )}

      {/* 完了 */}
      {step === "done" && (
        <div style={{ ...bk.section, textAlign: "center", padding: "36px 24px" }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <div style={bk.doneTitle}>予約が完了しました</div>
          <div style={bk.doneSub}>{dateLabel} {slot} に相談枠を確保しました</div>
          <div style={bk.doneCard}>
            {[["お名前", form.name], ["メール", form.email], ["日時", `${dateLabel} ${slot}`]].map(([l, v]) => (
              <div key={l} style={bk.doneRow}><span style={{ color: "rgba(255,255,255,0.4)" }}>{l}</span><span style={{ color: "#e8e6f0" }}>{v}</span></div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 20 }}>確認メールをお送りしました。当日はチャット画面からアクセスしてください。</div>
          <button style={bk.primaryBtn} onClick={() => { setStep("cal"); setDay(null); setSlot(null); setForm({ name: "", email: "", worry: "" }); }}>
            別の日程で予約する
          </button>
        </div>
      )}
    </div>
  );
}
