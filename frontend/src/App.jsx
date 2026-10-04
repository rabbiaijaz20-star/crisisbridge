import { useState, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const priorityColor = { critical: "#D7263D", high: "#F46036", medium: "#F2C94C", low: "#27AE60" };
const STATUSES = ["new", "under_review", "assistance_assigned", "in_progress", "resolved"];

const C = {
  bg: "#DCCFC0",
  sidebar: "#CFC0AC",
  panel: "#EDE6DB",
  card: "#FFFFFF",
  border: "#A2AF9B",
  muted: "#6B7566",
  text: "#3A332C",
  accent: "#7C8B72",
  heading: "#3F5A3F",
};

const NAV_ITEMS = [
  { key: "home", label: "🏠 Home" },
  { key: "emergency", label: "🚨 Emergency" },
  { key: "firstaid", label: "🩹 First Aid / Medical" },
  { key: "resources", label: "🍲 Food, Water & Shelter" },
  { key: "blood", label: "🩸 Blood & Resources" },
];

const EDHI_FALLBACK = {
  name: "Edhi Foundation (National — food, water, shelter relief)",
  phone: "115",
  note: "Pakistan's largest welfare network — 300+ centers nationwide, 5000+ ambulances. Call 115 for emergency assistance.",
};

const ALKHIDMAT_FALLBACK = {
  name: "Alkhidmat Foundation (National — food, water, shelter relief)",
  phone: "0800-44448",
  note: "Pakistan ka ek aur bara welfare network — food, water, shelter aur emergency relief provide karta hai.",
};

const PRIMARY_PARTNER = {
  name: "Hello Future Technologies (Pvt) Ltd",
  website: "https://hellofuturetechnology.com/",
  phone: "+92 306 0007705",
  email: "info@hellofuturetechnology.com",
  note: "Lahore-based partner, UN Global Marketplace registered supplier — coordinating food, water & shelter resources for this project.",
};

const EMERGENCY_TYPES = [
  { key: "accident", label: "Accident", prefill: "Accident reported: " },
  { key: "fire", label: "Fire", prefill: "Fire reported: " },
  { key: "building_collapse", label: "Building Collapse", prefill: "Building collapsed: " },
  { key: "rescue", label: "Immediate Rescue", prefill: "Urgent rescue needed: " },
];

const HOW_IT_WORKS = [
  { step: "1", icon: "📝", title: "Submit a Report", text: "Describe what's happening in your own words, in English, Urdu, or Roman Urdu, and pin your location on the map." },
  { step: "2", icon: "🤖", title: "AI Understands It", text: "The system reads your report, identifies the type of emergency, urgency, and what kind of help is needed." },
  { step: "3", icon: "👥", title: "Responders See It", text: "Nearby responders and coordinators see your request, sorted by priority, and can accept it." },
  { step: "4", icon: "✅", title: "Help Is Tracked", text: "Your case is tracked from New through to Resolved, so nothing falls through the cracks." },
];

const QUICK_TOPICS = [
  { key: "gas", label: "🔥 Gas Leakage", text: "Ghar mein gas leak ho raha hai" },
  { key: "fire_burn", label: "🔥 Fire Burn", text: "Hath aag se jal gaya hai" },
  { key: "hand_burn", label: "♨️ Hand Burn", text: "Hath garam cheez se jal gaya" },
  { key: "electric", label: "⚡ Electric Shock", text: "Electric socket se shock laga hai" },
  { key: "cpr", label: "❤️ CPR Needed", text: "Insan behosh hai, saans nahi le raha, CPR chahiye" },
];

const BLOOD_KEYWORDS = ["blood", "khoon", "khon"];
const RESOURCE_KEYWORDS = ["food", "khana", "pani", "water", "drinking", "shelter", "panagah", "makan", "ration"];

function ChatBot({ onSubmit, C, accentBtn, inputStyle, openMapModal, position, showResourceMatches }) {
  const [messages, setMessages] = useState([
    { from: "bot", text: "Assalam-o-Alaikum! Bataiye kya emergency hai? Text likh dein, ya neeche diye topics mein se choose karein." }
  ]);
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const addMessage = (from, text) => setMessages((prev) => [...prev, { from, text }]);

  const handleQuickTopic = (topicText) => {
    setInput(topicText);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!phone.trim()) {
      addMessage("bot", "Pehle apna phone number likhein (upar wale box mein) — tabhi request submit ho sakti hai.");
      return;
    }
    const userText = input;
    const newHistory = [...messages, { from: "user", text: userText }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    const lowerText = userText.toLowerCase();
    const isBloodQuery = BLOOD_KEYWORDS.some((k) => lowerText.includes(k));
    const isResourceQuery = showResourceMatches || RESOURCE_KEYWORDS.some((k) => lowerText.includes(k));

    if (!isBloodQuery && !isResourceQuery) {
      const chatRes = await axios.post(`${API}/chat`, {
        message: userText,
        history: newHistory.map(m => ({ role: m.from === "user" ? "user" : "assistant", text: m.text })),
      });
      addMessage("bot", chatRes.data.reply);
    }

    const result = await onSubmit(userText, phone, position);
    setLoading(false);

    if (result.blocked) {
      addMessage("bot", result.message);
    } else if (!isBloodQuery && !isResourceQuery) {
      if (result.first_aid_tip) {
        const steps = result.first_aid_tip.tip
          .split(/(?<=[.!])\s+/)
          .map(s => s.trim())
          .filter(Boolean);
        const bulletText = "Fori first aid:\n" + steps.map(s => `• ${s}`).join("\n");
        addMessage("bot", bulletText);
      }
      if (result.department_info) {
        addMessage("bot", `Agar chahen to official madad bhi le sakte hain — ${result.department_info.name}, phone: ${result.department_info.emergency_number}${result.department_info.website ? `, website: ${result.department_info.website}` : ""}.`);
      }
    }

    if (isBloodQuery) {
      if (position && position[0] != null && position[1] != null) {
        addMessage("bot", "Aapki location ke qareeb blood banks dhoondh rahe hain...");
        try {
          const bbRes = await axios.get(`${API}/blood-banks`, {
            params: { lat: position[0], lon: position[1] },
          });
          if (bbRes.data.found) {
            const list = bbRes.data.banks
              .map((b) => `• ${b.name}${b.distance_km != null ? ` — ${b.distance_km} km` : ""}, phone: ${b.phone}`)
              .join("\n");
            addMessage("bot", "Qareeb ke blood banks:\n" + list);
          } else {
            addMessage("bot", bbRes.data.message);
          }
        } catch (e) {
          addMessage("bot", "Blood banks dhoondhte waqt masla aaya, dobara koshish karein.");
        }
      } else {
        addMessage("bot", "Blood bank dhoondhne ke liye pehle apni location set karein (📍 button use karein).");
      }
    }

    // Food / water / shelter: show matching resources, else show the partner organizations directly
    if (showResourceMatches && !result.blocked && result.report_id) {
      try {
        const matchRes = await axios.get(`${API}/reports/${result.report_id}/matches`);
        if (matchRes.data && matchRes.data.length > 0) {
          const list = matchRes.data
            .map((m) => `• ${m.resource_type} × ${m.quantity} @ ${m.location_text || "?"}`)
            .join("\n");
          addMessage("bot", "Hello Future Technologies ke paas ye resources available hain:\n" + list);
        } else {
          addMessage(
            "bot",
            `Aapki request record ho gayi hai. In mein se kisi se rabta karein:\n\n` +
            `🔹 ${PRIMARY_PARTNER.name}\nPhone: ${PRIMARY_PARTNER.phone}\nEmail: ${PRIMARY_PARTNER.email}\nWebsite: ${PRIMARY_PARTNER.website}\n\n` +
            `🔹 ${EDHI_FALLBACK.name}\nPhone: ${EDHI_FALLBACK.phone}\n\n` +
            `🔹 ${ALKHIDMAT_FALLBACK.name}\nPhone: ${ALKHIDMAT_FALLBACK.phone}`
          );
        }
      } catch (e) {
        addMessage("bot", "Resources check karte waqt masla aaya.");
      }
    }
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, maxWidth: 640 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {QUICK_TOPICS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleQuickTopic(t.text)}
            style={{ padding: "6px 10px", background: C.panel, color: C.text, border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 12, cursor: "pointer" }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ maxHeight: 360, overflowY: "auto", marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.from === "user" ? "right" : "left", margin: "8px 0" }}>
            <span style={{
              display: "inline-block",
              background: m.from === "user" ? C.accent : C.panel,
              color: m.from === "user" ? "#fff" : C.text,
              padding: "8px 12px",
              borderRadius: 12,
              maxWidth: "80%",
              fontSize: 14,
              whiteSpace: "pre-line",
              lineHeight: 1.5,
            }}>
              {m.text}
            </span>
          </div>
        ))}
        {loading && (
          <div style={{ textAlign: "left", margin: "8px 0" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: C.panel, padding: "10px 14px", borderRadius: 12,
            }}>
              <span className="cb-typing-dot" style={{ animationDelay: "0s" }} />
              <span className="cb-typing-dot" style={{ animationDelay: "0.15s" }} />
              <span className="cb-typing-dot" style={{ animationDelay: "0.3s" }} />
            </span>
          </div>
        )}
      </div>

      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (required)" style={{ width: "100%", padding: 8, marginBottom: 8, ...inputStyle, borderColor: !phone.trim() ? "#D7263D" : C.border }} />
      <button onClick={openMapModal} style={{ marginBottom: 8, padding: "6px 12px", background: C.panel, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
        📍 {position ? "Location Set ✓" : "Set Location on Map"}
      </button>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Apni emergency yahan likhein..."
          style={{ flex: 1, padding: 10, ...inputStyle }}
        />
        <button onClick={handleSend} disabled={loading} style={accentBtn}>Send</button>
      </div>
    </div>
  );
}

function LocationPicker({ tempPosition, setTempPosition }) {
  useMapEvents({ click(e) { setTempPosition([e.latlng.lat, e.latlng.lng]); } });
  return tempPosition ? <Marker position={tempPosition}><Popup>Selected location</Popup></Marker> : null;
}

function getUsers() {
  return JSON.parse(localStorage.getItem("cb_users") || "[]");
}
function saveUsers(users) {
  localStorage.setItem("cb_users", JSON.stringify(users));
}

function AuthModal({ authView, setAuthView, authEmail, setAuthEmail, authPassword, setAuthPassword, authNewPassword, setAuthNewPassword, authError, setAuthError, handleLogin, handleSignup, handleResetPassword, inputStyle, accentBtn, onClose }) {
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: C.card, borderRadius: 8, padding: 24, width: "90%", maxWidth: 380 }}>
        <h3 style={{ marginTop: 0, color: C.text }}>
          {authView === "login" ? "Log In" : authView === "signup" ? "Create Account" : "Reset Password"}
        </h3>
        {authError && <p style={{ color: "#B23A3A", fontSize: 13 }}>{authError}</p>}
        <input autoComplete="off" name="cb-email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" style={{ width: "100%", padding: 8, marginBottom: 8, ...inputStyle }} />
        {authView !== "forgot" && (
          <input autoComplete="new-password" name="cb-password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" style={{ width: "100%", padding: 8, marginBottom: 8, ...inputStyle }} />
        )}
        {authView === "forgot" && (
          <input autoComplete="new-password" name="cb-new-password" type="password" value={authNewPassword} onChange={(e) => setAuthNewPassword(e.target.value)} placeholder="New password" style={{ width: "100%", padding: 8, marginBottom: 8, ...inputStyle }} />
        )}

        {authView === "login" && <button onClick={handleLogin} style={{ ...accentBtn, width: "100%" }}>Log In</button>}
        {authView === "signup" && <button onClick={handleSignup} style={{ ...accentBtn, width: "100%" }}>Sign Up</button>}
        {authView === "forgot" && <button onClick={handleResetPassword} style={{ ...accentBtn, width: "100%" }}>Reset Password</button>}

        <div style={{ marginTop: 12, fontSize: 13, color: C.muted, display: "flex", justifyContent: "space-between" }}>
          {authView !== "signup" && <span style={{ cursor: "pointer" }} onClick={() => { setAuthView("signup"); setAuthError(""); }}>Create account</span>}
          {authView !== "login" && <span style={{ cursor: "pointer" }} onClick={() => { setAuthView("login"); setAuthError(""); }}>Log in</span>}
          {authView !== "forgot" && <span style={{ cursor: "pointer" }} onClick={() => { setAuthView("forgot"); setAuthError(""); }}>Forgot password?</span>}
        </div>
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <span style={{ cursor: "pointer", color: C.muted, fontSize: 13 }} onClick={onClose}>Close</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [authView, setAuthView] = useState(null);
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("cb_current_user") || null);
  const [pendingPage, setPendingPage] = useState(null);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authNewPassword, setAuthNewPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [reports, setReports] = useState([]);
  const [resources, setResources] = useState([]);
  const [text, setText] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState(null);
  const [tempPosition, setTempPosition] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [matches, setMatches] = useState({});
  const [resType, setResType] = useState("");
  const [resQty, setResQty] = useState("");
  const [resLoc, setResLoc] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const fetchAll = async () => {
    const r = await axios.get(`${API}/reports`);
    setReports(r.data);
    const res = await axios.get(`${API}/resources`);
    setResources(res.data);
  };

  useEffect(() => { fetchAll(); }, []);

  const goToPage = (key) => {
    if (key !== "home" && !currentUser) {
      setPendingPage(key);
      setAuthView("login");
      return;
    }
    setPage(key);
  };

  const openMapModal = () => { setTempPosition(position); setShowMapModal(true); };
  const confirmLocation = () => { setPosition(tempPosition); setShowMapModal(false); };
  const cancelLocation = () => { setShowMapModal(false); };

  const submitReport = async () => {
    if (!text.trim()) return;
    if (!phone.trim()) {
      alert("Phone number zaroori hai — pehle wo likhein.");
      return;
    }
    setLoading(true);
    const res = await axios.post(`${API}/reports`, { text, phone, lat: position?.[0] ?? null, lng: position?.[1] ?? null });

    if (res.data.blocked) {
      alert(res.data.message);
      setLoading(false);
      return;
    }

    setLastResult(res.data);
    setText(""); setPhone(""); setPosition(null);
    await fetchAll();
    setLoading(false);
  };

  const submitFromChat = async (chatText, chatPhone, chatPosition) => {
    const res = await axios.post(`${API}/reports`, { text: chatText, phone: chatPhone, lat: chatPosition?.[0] ?? null, lng: chatPosition?.[1] ?? null });
    await fetchAll();
    return res.data;
  };

  const submitResource = async () => {
    if (!resType || !resQty) return;
    await axios.post(`${API}/resources`, { resource_type: resType, quantity: parseInt(resQty), location_text: resLoc });
    setResType(""); setResQty(""); setResLoc("");
    await fetchAll();
  };

  const updateStatus = async (reportId, status) => {
    await axios.patch(`${API}/reports/${reportId}/status`, { status });
    await fetchAll();
  };

  const acceptReport = async (reportId) => {
    const name = prompt("Your name (responder):");
    if (!name) return;
    await axios.patch(`${API}/reports/${reportId}/accept`, { responder_name: name });
    await fetchAll();
  };

  const loadMatches = async (reportId) => {
    const res = await axios.get(`${API}/reports/${reportId}/matches`);
    setMatches((prev) => ({ ...prev, [reportId]: res.data }));
  };

  const loadSummary = async () => {
    const res = await axios.get(`${API}/summary`);
    setSummary(res.data.summary);
  };

  const closeAuth = () => { setAuthView(null); setPendingPage(null); setAuthError(""); };

  const handleSignup = () => {
    setAuthError("");
    if (!authEmail || !authPassword) { setAuthError("Enter email and password."); return; }
    const users = getUsers();
    if (users.find(u => u.email === authEmail)) { setAuthError("Account already exists. Try logging in."); return; }
    users.push({ email: authEmail, password: authPassword });
    saveUsers(users);
    localStorage.setItem("cb_current_user", authEmail);
    setCurrentUser(authEmail);
    if (pendingPage) { setPage(pendingPage); setPendingPage(null); }
    setAuthView(null); setAuthEmail(""); setAuthPassword("");
  };

  const handleLogin = () => {
    setAuthError("");
    const users = getUsers();
    const found = users.find(u => u.email === authEmail && u.password === authPassword);
    if (!found) { setAuthError("Invalid email or password."); return; }
    localStorage.setItem("cb_current_user", authEmail);
    setCurrentUser(authEmail);
    if (pendingPage) { setPage(pendingPage); setPendingPage(null); }
    setAuthView(null); setAuthEmail(""); setAuthPassword("");
  };

  const handleResetPassword = () => {
    setAuthError("");
    const users = getUsers();
    const idx = users.findIndex(u => u.email === authEmail);
    if (idx === -1) { setAuthError("No account found with that email."); return; }
    users[idx].password = authNewPassword;
    saveUsers(users);
    setAuthView("login"); setAuthEmail(""); setAuthNewPassword("");
    setAuthError("Password reset. Please log in.");
  };

  const handleLogout = () => {
    localStorage.removeItem("cb_current_user");
    setCurrentUser(null);
    setPage("home");
  };

  const total = reports.length;
  const critical = reports.filter(r => r.final_priority === "critical").length;
  const resolved = reports.filter(r => r.status === "resolved").length;
  const pending = total - resolved;

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedReports = [...reports].sort((a, b) => priorityOrder[a.final_priority] - priorityOrder[b.final_priority]);

  const filteredReports = sortedReports.filter((r) => {
    if (r.status === "resolved") return false; // resolved requests drop off the active list
    if (page === "emergency") return true;
    if (page === "firstaid") return r.department === "first_aid";
    if (page === "resources") return r.needs.includes("food") || r.needs.includes("drinking_water") || r.needs.includes("shelter");
    if (page === "blood") return r.department === "first_aid";
    return true;
  });

  const inputStyle = { background: C.card, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6 };
  const accentBtn = { padding: "8px 16px", background: C.accent, color: "#fff", border: "none", borderRadius: 6, fontWeight: "bold", cursor: "pointer" };

  const ReportCard = (r) => (
    <div key={r.report_id} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `6px solid ${priorityColor[r.final_priority]}`, padding: 12, marginBottom: 10, borderRadius: 6, color: C.text }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{r.incident_type}</strong>
        {r.final_priority === "critical" && (
          <span style={{ background: "#D7263D", color: "white", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: "bold" }}>🚨 CRITICAL</span>
        )}
      </div>
      {r.final_priority.toUpperCase()}
      {r.is_duplicate && <span style={{ color: C.muted }}> (duplicate of {r.duplicate_of})</span>}
      <p style={{ margin: "6px 0" }}>{r.summary}</p>
      <small style={{ color: C.muted }}>Needs: {r.needs.join(", ") || "none"} | People: {r.affected_people ?? "unknown"} | Phone: {r.phone || "n/a"}</small>
      {r.accepted_by && <div style={{ color: "#3F7D4F", fontSize: 13, marginTop: 4 }}>✓ Accepted by {r.accepted_by}</div>}
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={r.status || "new"} onChange={(e) => updateStatus(r.report_id, e.target.value)} style={{ padding: 4, ...inputStyle }}>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {!r.accepted_by && (
          <button onClick={() => acceptReport(r.report_id)} style={{ padding: "4px 10px", background: "#3F7D4F", color: "white", border: "none", borderRadius: 4 }}>
            Accept Request
          </button>
        )}
        <button onClick={() => loadMatches(r.report_id)} style={{ padding: "4px 10px", background: C.border, color: "#fff", border: "none", borderRadius: 4 }}>Check Matches</button>
      </div>
      {matches[r.report_id] && (
        <div style={{ marginTop: 6, fontSize: 13, color: C.muted }}>
          {matches[r.report_id].length === 0
            ? <em>No matching resources</em>
            : matches[r.report_id].map(m => (
                <div key={m.resource_id}>✓ {m.resource_type} × {m.quantity} @ {m.location_text}</div>
              ))}
        </div>
      )}
    </div>
  );

  const SubmitForm = (placeholder) => (
    <>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={3} style={{ width: "100%", padding: 10, ...inputStyle }} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number (required)" style={{ width: "100%", padding: 8, marginTop: 8, ...inputStyle, borderColor: !phone.trim() ? "#D7263D" : C.border }} />
      <button onClick={openMapModal} style={{ marginTop: 8, marginBottom: 8, padding: "8px 14px", background: C.panel, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}>
        📍 {position ? "Location Set ✓ (tap to change)" : "Set Location on Map"}
      </button>
      <br />
      <button onClick={submitReport} disabled={loading} style={accentBtn}>
        {loading ? "Processing..." : "Submit Request"}
      </button>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "sans-serif" }}>
      <style>{`
        h1, h2, h3 {
          font-family: 'Segoe UI', Arial, sans-serif !important;
        }
        .cb-typing-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: ${C.muted};
          display: inline-block;
          animation: cb-bounce 1.1s infinite ease-in-out;
        }
        @keyframes cb-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
      <div style={{ width: 220, background: C.sidebar, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: `1px solid ${C.border}` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            <img src="/logo-icon.png" alt="logo" style={{ height: 32 }} onError={(e) => e.target.style.display = "none"} />
            <strong>CrisisBridge AI</strong>
          </div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.key}
              onClick={() => goToPage(item.key)}
              style={{
                padding: "10px 12px",
                borderRadius: 6,
                marginBottom: 4,
                cursor: "pointer",
                background: page === item.key ? C.accent : "transparent",
                color: page === item.key ? "#fff" : C.text,
                fontWeight: page === item.key ? "bold" : "normal",
                opacity: item.key !== "home" && !currentUser ? 0.6 : 1,
              }}
            >
              {item.label} {item.key !== "home" && !currentUser && "🔒"}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13 }}>
          {currentUser ? (
            <>
              <div style={{ color: C.muted, marginBottom: 6 }}>{currentUser}</div>
              <div style={{ cursor: "pointer", color: C.accent }} onClick={handleLogout}>Log out</div>
            </>
          ) : (
            <div style={{ cursor: "pointer", color: C.accent, fontWeight: "bold" }} onClick={() => setAuthView("login")}>Log in / Sign up</div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, padding: "30px 32px", overflowY: "auto", position: "relative" }}>
        <img
          src="/logo-icon.png"
          alt=""
          aria-hidden="true"
          style={{
            position: "fixed",
            right: "4%",
            bottom: "2%",
            width: 420,
            height: 420,
            objectFit: "contain",
            opacity: 0.05,
            pointerEvents: "none",
            zIndex: 0,
          }}
          onError={(e) => (e.target.style.display = "none")}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
        {lastResult && (
          <div style={{ background: lastResult.final_priority === "critical" ? "#FDE8E8" : C.panel, border: `2px solid ${lastResult.final_priority === "critical" ? "#D7263D" : C.border}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
            {lastResult.final_priority === "critical" && (
              <div style={{ background: "#D7263D", color: "#fff", padding: "8px 14px", borderRadius: 6, fontWeight: "bold", marginBottom: 12, display: "inline-block" }}>
                🚨 Get Help Now — This has been marked Critical
              </div>
            )}

            <p style={{ margin: "0 0 8px 0" }}><strong>Routed to:</strong> {lastResult.department_info?.name} ({lastResult.department_info?.service_type})</p>

            {lastResult.first_aid_tip && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
                <strong>Immediate First Aid:</strong>
                <p style={{ margin: "6px 0" }}>{lastResult.first_aid_tip.tip}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href={`tel:${lastResult.department_info?.emergency_number}`} style={{ ...accentBtn, textDecoration: "none", display: "inline-block" }}>
                📞 Call {lastResult.department_info?.name} ({lastResult.department_info?.emergency_number})
              </a>
              <span style={{ padding: "8px 16px", background: "#3F7D4F", color: "#fff", borderRadius: 6 }}>📤 Sent to Department</span>
              <button onClick={() => setLastResult(null)} style={{ padding: "8px 16px", background: "transparent", color: C.muted, border: "none", cursor: "pointer" }}>Dismiss</button>
            </div>

            <p style={{ fontSize: 11, color: C.muted, marginTop: 10, marginBottom: 0 }}>{lastResult.department_info?.note}</p>
          </div>
        )}

        {page === "home" && (
          <div>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 32, marginBottom: 20, boxShadow: "0 2px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
              <div style={{
                width: 150, height: 150, minWidth: 150, borderRadius: "50%", overflow: "hidden",
                background: C.card, border: `4px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
              }}>
                <img src="/logo-icon.png" alt="CrisisBridge AI" style={{ width: "80%", height: "80%", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} />
              </div>
              <div style={{ textAlign: "left" }}>
                <h1 style={{ margin: "0 0 6px 0", color: C.heading, fontFamily: "'Segoe UI', Arial, sans-serif", fontWeight: 700, letterSpacing: "0.5px" }}>Welcome to CrisisBridge AI</h1>
                <p style={{ color: C.muted, maxWidth: 640, margin: 0 }}>
                  CrisisBridge AI is an AI-powered emergency reporting and coordination platform. It turns
                  scattered reports of accidents, fires, building collapses, and urgent needs into organized,
                  prioritized cases that responders can act on quickly.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 28 }}>
              <div style={{ background: C.card, padding: 14, borderRadius: 8, textAlign: "center", border: `1px solid ${C.border}`, borderBottom: "3px solid #2F80ED", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}><strong style={{ fontSize: 20 }}>{total}</strong><br /><span style={{ color: C.muted, fontSize: 13 }}>🔵 Total Cases</span></div>
              <div style={{ background: C.card, padding: 14, borderRadius: 8, textAlign: "center", border: `1px solid ${C.border}`, borderBottom: "3px solid #D7263D", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}><strong style={{ fontSize: 20 }}>{critical}</strong><br /><span style={{ color: C.muted, fontSize: 13 }}>🔴 Critical</span></div>
              <div style={{ background: C.card, padding: 14, borderRadius: 8, textAlign: "center", border: `1px solid ${C.border}`, borderBottom: "3px solid #27AE60", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}><strong style={{ fontSize: 20 }}>{resolved}</strong><br /><span style={{ color: C.muted, fontSize: 13 }}>🟢 Resolved</span></div>
              <div style={{ background: C.card, padding: 14, borderRadius: 8, textAlign: "center", border: `1px solid ${C.border}`, borderBottom: "3px solid #F2994A", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}><strong style={{ fontSize: 20 }}>{pending}</strong><br /><span style={{ color: C.muted, fontSize: 13 }}>🟠 Pending</span></div>
            </div>

            <h2 style={{ color: C.heading, marginBottom: 4 }}>About This Service</h2>
            <p style={{ color: C.muted, maxWidth: 640 }}>
              During a disaster, information comes in fast and from many places — affected people, volunteers,
              and field workers all reporting at once. CrisisBridge AI collects these reports, uses AI to
              understand what's needed and how urgent it is, and gives coordinators one clear view instead of
              hundreds of scattered messages. Responders can accept requests directly, and every case is tracked
              from the moment it's reported until it's resolved.
            </p>

            <h2 style={{ color: C.heading, marginTop: 24, marginBottom: 12 }}>How It Works</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
              {HOW_IT_WORKS.map((h) => (
                <div key={h.step} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: C.panel,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, marginBottom: 6,
                  }}>{h.icon}</div>
                  <div style={{ color: C.accent, fontWeight: "bold", fontSize: 13 }}>STEP {h.step}</div>
                  <div style={{ fontWeight: "bold", margin: "4px 0" }}>{h.title}</div>
                  <div style={{ color: C.muted, fontSize: 13 }}>{h.text}</div>
                </div>
              ))}
            </div>

            <button onClick={loadSummary} style={accentBtn}>Get AI Situation Summary</button>
            {summary && <p style={{ background: C.panel, padding: 12, borderRadius: 6, marginTop: 12, border: `1px solid ${C.border}` }}>{summary}</p>}

            {!currentUser && (
              <p style={{ marginTop: 24, color: C.muted, fontSize: 14 }}>
                Create a free account to submit reports or respond to requests — <span style={{ color: C.accent, cursor: "pointer", fontWeight: "bold" }} onClick={() => setAuthView("signup")}>sign up here</span>.
              </p>
            )}
          </div>
        )}

        {page === "emergency" && (
          <>
            <h2 style={{ color: C.heading }}>Emergency Chatbot</h2>
            <ChatBot onSubmit={submitFromChat} C={C} accentBtn={accentBtn} inputStyle={inputStyle} openMapModal={openMapModal} position={position} />
            <h3 style={{ marginTop: 24 }}>Requests ({filteredReports.length})</h3>
            {filteredReports.map(ReportCard)}
          </>
        )}

        {page === "firstaid" && (<>
          <h2 style={{ color: C.heading }}>First Aid / Medical Help</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>Gas leakage, jalna (burns), electric shock, CPR — kuch bhi likhein, chatbot fori guidance dega.</p>
          <ChatBot onSubmit={submitFromChat} C={C} accentBtn={accentBtn} inputStyle={inputStyle} openMapModal={openMapModal} position={position} />
          <h3 style={{ marginTop: 24 }}>Requests ({filteredReports.length})</h3>
          {filteredReports.map(ReportCard)}
        </>)}

        {page === "resources" && (<>
          <h2 style={{ color: C.heading }}>Food, Water & Shelter Resources</h2>
          <p style={{ color: C.muted, fontSize: 14 }}>Apni zaroorat (khana, pani, shelter) likhein, phone number aur location set karein — enter/send karte hi neeche chat mein Hello Future Technologies, Edhi Foundation aur Alkhidmat Foundation ka contact info aa jayega.</p>
          <ChatBot onSubmit={submitFromChat} C={C} accentBtn={accentBtn} inputStyle={inputStyle} openMapModal={openMapModal} position={position} showResourceMatches={true} />
          <h3 style={{ marginTop: 24 }}>Requests ({filteredReports.length})</h3>
          {filteredReports.map(ReportCard)}
        </>)}

        {page === "blood" && (
          <>
            <h2 style={{ color: C.heading }}>Blood & Medical Resources</h2>
            <p style={{ color: C.muted, fontSize: 14 }}>"Blood" ya "khoon" likh kar location set karein — nearby blood banks mil jayenge.</p>
            <ChatBot onSubmit={submitFromChat} C={C} accentBtn={accentBtn} inputStyle={inputStyle} openMapModal={openMapModal} position={position} />
            <h3 style={{ marginTop: 24 }}>Add a Resource</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input placeholder="type (e.g. blood, medical_assistance)" value={resType} onChange={e => setResType(e.target.value)} style={{ flex: 2, padding: 6, ...inputStyle }} />
              <input placeholder="quantity" type="number" value={resQty} onChange={e => setResQty(e.target.value)} style={{ flex: 1, padding: 6, ...inputStyle }} />
              <input placeholder="location" value={resLoc} onChange={e => setResLoc(e.target.value)} style={{ flex: 2, padding: 6, ...inputStyle }} />
              <button onClick={submitResource} style={accentBtn}>Add</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              {resources.map(r => (
                <span key={r.resource_id} style={{ display: "inline-block", background: C.card, padding: "4px 10px", borderRadius: 12, marginRight: 6, marginBottom: 6, fontSize: 13, border: `1px solid ${C.border}` }}>
                  {r.resource_type} × {r.quantity} @ {r.location_text || "?"}
                </span>
              ))}
            </div>
            <h3>Requests ({filteredReports.length})</h3>
            {filteredReports.map(ReportCard)}
          </>
        )}
        </div>
      </div>

      {showMapModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: C.card, borderRadius: 8, padding: 16, width: "90%", maxWidth: 600 }}>
            <h3 style={{ marginTop: 0, color: C.text }}>Tap the map to set your location</h3>
            <div style={{ height: 350, marginBottom: 12 }}>
              <MapContainer center={tempPosition || [30.3753, 69.3451]} zoom={5} style={{ height: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker tempPosition={tempPosition} setTempPosition={setTempPosition} />
              </MapContainer>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={cancelLocation} style={{ padding: "8px 16px", background: C.panel, color: C.text, border: `1px solid ${C.border}`, borderRadius: 6 }}>Cancel</button>
              <button onClick={confirmLocation} style={accentBtn}>Confirm Location</button>
            </div>
          </div>
        </div>
      )}

      {authView && (
        <AuthModal
          authView={authView} setAuthView={setAuthView}
          authEmail={authEmail} setAuthEmail={setAuthEmail}
          authPassword={authPassword} setAuthPassword={setAuthPassword}
          authNewPassword={authNewPassword} setAuthNewPassword={setAuthNewPassword}
          authError={authError} setAuthError={setAuthError}
          handleLogin={handleLogin} handleSignup={handleSignup} handleResetPassword={handleResetPassword}
          inputStyle={inputStyle} accentBtn={accentBtn}
          onClose={closeAuth}
        />
      )}
    </div>
  );
}

export default App;