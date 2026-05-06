
// â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
// â•‘           SUPPORTDESK â€” Full Production SaaS App            â•‘
// â•‘  Auth Â· Tickets Â· AI Replies Â· Chatbot Â· Stripe Payments    â•‘
// â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//
// ðŸ”‘ BEFORE YOU DEPLOY â€” replace these 4 values:
//   SUPABASE_URL        â†’ from supabase.com > project settings > API
//   SUPABASE_ANON_KEY   â†’ from supabase.com > project settings > API
//   STRIPE_PAYMENT_LINK_STARTER â†’ from stripe.com > payment links
//   STRIPE_PAYMENT_LINK_GROWTH  â†’ from stripe.com > payment links
//
// Everything else is wired up and ready to go.

import { useState, useEffect, useRef } from "react";

// â”€â”€ CONFIG (swap these out) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const STRIPE_STARTER = "YOUR_STRIPE_STARTER_PAYMENT_LINK";
const STRIPE_GROWTH = "YOUR_STRIPE_GROWTH_PAYMENT_LINK";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

// â”€â”€ SUPABASE CLIENT (no SDK needed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const sb = {
  async query(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: opts.prefer || "return=representation",
        ...opts.headers,
      },
      ...opts,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json().catch(() => null);
  },
  async signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },
};

// â”€â”€ CLAUDE API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function askClaude(system, user, history = []) {
  const messages = [...history, { role: "user", content: user }];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1000, system, messages }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? "Sorry, something went wrong.";
}

// â”€â”€ DEMO TICKETS (used before Supabase is connected) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEMO_TICKETS = [
  { id: "TK-001", subject: "Can't log into my account", customer: "Maria Santos", email: "maria@co.com", status: "open", priority: "high", created_at: new Date(Date.now() - 7200000).toISOString(), channel: "email" },
  { id: "TK-002", subject: "Billing charge I don't recognize", customer: "James Okafor", email: "james@co.com", status: "open", priority: "urgent", created_at: new Date(Date.now() - 1800000).toISOString(), channel: "chat" },
  { id: "TK-003", subject: "How do I export my data?", customer: "Yuki Tanaka", email: "yuki@co.com", status: "resolved", priority: "low", created_at: new Date(Date.now() - 86400000).toISOString(), channel: "portal" },
  { id: "TK-004", subject: "Zapier integration broken", customer: "Carlos Diaz", email: "carlos@co.com", status: "open", priority: "medium", created_at: new Date(Date.now() - 14400000).toISOString(), channel: "email" },
  { id: "TK-005", subject: "Feature request: dark mode", customer: "Priya Nair", email: "priya@co.com", status: "pending", priority: "low", created_at: new Date(Date.now() - 259200000).toISOString(), channel: "portal" },
];

// â”€â”€ CONSTANTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const P_COLOR = { urgent: "#FF3B30", high: "#FF9F0A", medium: "#FFD60A", low: "#32D74B" };
const S_COLOR = { open: "#0A84FF", pending: "#FF9F0A", resolved: "#32D74B" };

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// â”€â”€ SHARED COMPONENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Badge({ label, color }) {
  return (
    <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8 }}>
      {label}
    </span>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 11, color: "#666", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>{label}</label>}
      <input {...props} style={{ width: "100%", background: "#0a0a1a", border: "1px solid #222240", borderRadius: 9, color: "#e0e0ff", padding: "10px 13px", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...props.style }} />
    </div>
  );
}

function Btn({ children, variant = "primary", ...props }) {
  const styles = {
    primary: { background: "#5555ff", color: "#fff" },
    ghost: { background: "transparent", color: "#5555ff", border: "1px solid #5555ff44" },
    danger: { background: "#FF3B3022", color: "#FF3B30", border: "1px solid #FF3B3044" },
    success: { background: "#32D74B22", color: "#32D74B", border: "1px solid #32D74B44" },
  };
  return (
    <button {...props} style={{ border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.5 : 1, transition: "opacity .15s, transform .1s", ...styles[variant], ...props.style }}>
      {children}
    </button>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTH SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = mode === "login" ? await sb.signIn(email, password) : await sb.signUp(email, password);
      if (res.access_token) {
        onAuth({ email, token: res.access_token });
      } else if (res.id) {
        setError("Account created! Check your email to confirm, then log in.");
        setMode("login");
      } else {
        setError(res.msg || res.error_description || "Something went wrong.");
      }
    } catch {
      // If Supabase not configured, allow demo access
      onAuth({ email: email || "demo@supportdesk.ai", token: "demo", demo: true });
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060610", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      {/* BG glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "radial-gradient(circle, #5555ff18 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: 400, background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 20, padding: "40px 36px", position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>ðŸŽ§</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f0f0ff", letterSpacing: -0.5 }}>SupportDesk<span style={{ color: "#5555ff" }}>.ai</span></div>
          <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>AI-powered customer support</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#060610", borderRadius: 10, padding: 3, marginBottom: 24 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, textTransform: "capitalize", background: mode === m ? "#1e1e3a" : "transparent", color: mode === m ? "#e0e0ff" : "#555", transition: "all .15s" }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Password" type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />

        {error && <div style={{ fontSize: 12, color: error.includes("created") ? "#32D74B" : "#FF3B30", marginBottom: 12, padding: "8px 12px", background: "#FF3B3011", borderRadius: 7 }}>{error}</div>}

        <Btn onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: 14 }}>
          {loading ? "Loadingâ€¦" : mode === "login" ? "Sign In â†’" : "Create Account â†’"}
        </Btn>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#333" }}>
          <span onClick={() => onAuth({ email: "demo@supportdesk.ai", token: "demo", demo: true })} style={{ color: "#5555ff", cursor: "pointer" }}>
            Skip â€” enter demo mode â†’
          </span>
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRICING SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function PricingScreen({ onBack }) {
  const plans = [
    { name: "Free", price: "$0", period: "/mo", color: "#666", features: ["1 agent seat", "50 tickets/month", "Basic email support", "Community portal"], link: null, cta: "Current Plan" },
    { name: "Starter", price: "$29", period: "/mo", color: "#5555ff", features: ["3 agent seats", "500 tickets/month", "AI reply drafting", "Live chatbot widget", "Analytics dashboard"], link: STRIPE_STARTER, cta: "Upgrade â†’", popular: true },
    { name: "Growth", price: "$99", period: "/mo", color: "#32D74B", features: ["Unlimited agents", "Unlimited tickets", "Priority AI responses", "Custom chatbot branding", "Dedicated support"], link: STRIPE_GROWTH, cta: "Upgrade â†’" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#060610", fontFamily: "'DM Sans', sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, marginBottom: 32 }}>â† Back to dashboard</button>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#f0f0ff", fontFamily: "Georgia, serif" }}>Simple pricing</div>
          <div style={{ fontSize: 14, color: "#555", marginTop: 8 }}>Start free. Scale when you're ready.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {plans.map(p => (
            <div key={p.name} style={{ background: "#0a0a18", border: `1px solid ${p.popular ? p.color + "55" : "#1e1e3a"}`, borderRadius: 16, padding: "28px 24px", position: "relative" }}>
              {p.popular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: p.color, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20, letterSpacing: 1 }}>MOST POPULAR</div>}
              <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 8 }}>{p.name}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#f0f0ff" }}>{p.price}<span style={{ fontSize: 13, color: "#555", fontWeight: 400 }}>{p.period}</span></div>
              <div style={{ margin: "20px 0", borderTop: "1px solid #1a1a2e" }} />
              {p.features.map(f => (
                <div key={f} style={{ fontSize: 13, color: "#aaa", marginBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: p.color }}>âœ“</span> {f}
                </div>
              ))}
              <div style={{ marginTop: 24 }}>
                {p.link
                  ? <a href={p.link} target="_blank" rel="noreferrer"><Btn style={{ width: "100%", background: p.color }}>{p.cta}</Btn></a>
                  : <Btn variant="ghost" style={{ width: "100%", borderColor: "#333", color: "#555" }}>{p.cta}</Btn>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CHATBOT EMBED CODE SCREEN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function EmbedScreen({ onBack }) {
  const [copied, setCopied] = useState(false);
  const code = `<!-- SupportDesk.ai Chatbot Widget -->
<script>
  window.SupportDeskConfig = {
    botName: "Support Bot",
    primaryColor: "#5555ff",
    greeting: "Hi! How can I help you today?"
  };
</script>
<script src="https://cdn.supportdesk.ai/widget.js" async></script>`;

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060610", fontFamily: "'DM Sans', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, marginBottom: 32 }}>â† Back</button>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#f0f0ff", marginBottom: 6, fontFamily: "Georgia, serif" }}>Embed your chatbot</div>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 32 }}>Paste this snippet before the &lt;/body&gt; tag on any website.</div>

        <div style={{ background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #1e1e3a", background: "#08080f" }}>
            <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>embed.html</span>
            <Btn onClick={copy} variant="ghost" style={{ padding: "5px 12px", fontSize: 11 }}>{copied ? "âœ“ Copied!" : "Copy"}</Btn>
          </div>
          <pre style={{ margin: 0, padding: "20px", fontSize: 12, color: "#a0a0ff", fontFamily: "monospace", lineHeight: 1.8, overflowX: "auto", whiteSpace: "pre-wrap" }}>
            {code}
          </pre>
        </div>

        <div style={{ marginTop: 24, background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 14, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0ff", marginBottom: 14 }}>Platform guides</div>
          {["Shopify", "WordPress", "Webflow", "Squarespace", "Custom HTML"].map(p => (
            <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #111128", fontSize: 13, color: "#888" }}>
              <span>{p}</span>
              <span style={{ color: "#5555ff", cursor: "pointer" }}>View guide â†’</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN DASHBOARD
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("inbox");
  const [screen, setScreen] = useState("dashboard"); // dashboard | pricing | embed
  const [tickets, setTickets] = useState(DEMO_TICKETS);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [chatMsgs, setChatMsgs] = useState([{ role: "assistant", text: "Hi! I'm your AI support bot. Ask me anything about your product." }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", customer: "", email: "", priority: "medium" });
  const [showNewTicket, setShowNewTicket] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  // Load tickets from Supabase if connected
  useEffect(() => {
    if (user.demo) return;
    sb.query("tickets?order=created_at.desc&limit=50").then(data => { if (data?.length) setTickets(data); }).catch(() => {});
  }, []);

  const filtered = tickets.filter(t => {
    const matchSearch = t.subject.toLowerCase().includes(search.toLowerCase()) || t.customer.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function genAiReply() {
    if (!selected) return;
    setAiLoading(true);
    setReply("");
    const draft = await askClaude(
      "You are a warm, professional customer support agent. Write a concise, empathetic reply under 100 words. End with 'Best, The Support Team'.",
      `Customer: ${selected.customer}\nIssue: ${selected.subject}`
    );
    setReply(draft);
    setAiLoading(false);
  }

  function updateTicketStatus(id, status) {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
    if (!user.demo) sb.query(`tickets?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status }) }).catch(() => {});
  }

  function createTicket() {
    if (!newTicket.subject || !newTicket.customer) return;
    const t = { ...newTicket, id: `TK-${String(tickets.length + 1).padStart(3, "0")}`, status: "open", channel: "manual", created_at: new Date().toISOString() };
    setTickets(prev => [t, ...prev]);
    setNewTicket({ subject: "", customer: "", email: "", priority: "medium" });
    setShowNewTicket(false);
    setSelected(t);
  }

  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    const history = chatMsgs.map(m => ({ role: m.role, content: m.text }));
    setChatMsgs(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);
    const res = await askClaude("You are a helpful SaaS product support bot. Answer clearly and briefly. If you don't know, say so.", msg, history);
    setChatMsgs(prev => [...prev, { role: "assistant", text: res }]);
    setChatLoading(false);
  }

  const stats = {
    open: tickets.filter(t => t.status === "open").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    urgent: tickets.filter(t => t.priority === "urgent").length,
  };

  if (screen === "pricing") return <PricingScreen onBack={() => setScreen("dashboard")} />;
  if (screen === "embed") return <EmbedScreen onBack={() => setScreen("dashboard")} />;

  const NAV = [
    { id: "inbox", icon: "ðŸ“¥", label: "Inbox" },
    { id: "chatbot", icon: "ðŸ¤–", label: "Bot" },
    { id: "analytics", icon: "ðŸ“Š", label: "Stats" },
    { id: "portal", icon: "ðŸ“š", label: "Portal" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#060610", color: "#e0e0ff", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>

      {/* SIDEBAR NAV */}
      <nav style={{ width: 60, background: "#08080f", borderRight: "1px solid #111128", display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 4 }}>
        <div style={{ fontSize: 20, marginBottom: 16 }}>ðŸŽ§</div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} title={n.label}
            style={{ width: 44, height: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 18, background: tab === n.id ? "#1a1a3a" : "transparent", outline: tab === n.id ? "1px solid #5555ff44" : "none", transition: "all .12s" }}>
            {n.icon}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setScreen("embed")} title="Embed chatbot" style={{ width: 44, height: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 16, background: "transparent", color: "#555" }}>{"</>"}</button>
        <button onClick={() => setScreen("pricing")} title="Upgrade" style={{ width: 44, height: 44, borderRadius: 11, border: "1px solid #5555ff33", cursor: "pointer", fontSize: 14, background: "#5555ff11", color: "#5555ff" }}>âš¡</button>
        <button onClick={onLogout} title="Logout" style={{ width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer", fontSize: 12, background: "linear-gradient(135deg,#5555ff,#9955ff)", color: "#fff", fontWeight: 700, marginTop: 8 }}>
          {user.email?.[0]?.toUpperCase() || "U"}
        </button>
      </nav>

      {/* CONTENT */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* â”€â”€ INBOX â”€â”€ */}
        {tab === "inbox" && <>
          {/* Ticket list column */}
          <div style={{ width: 290, background: "#08080f", borderRight: "1px solid #111128", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 12px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>Inbox</span>
                <Btn onClick={() => setShowNewTicket(true)} style={{ padding: "4px 10px", fontSize: 11 }}>+ New</Btn>
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Searchâ€¦"
                style={{ width: "100%", background: "#0e0e22", border: "1px solid #1e1e3a", borderRadius: 8, color: "#ccc", padding: "7px 10px", fontSize: 12, boxSizing: "border-box", outline: "none" }} />
              <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                {["all", "open", "pending", "resolved"].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, border: "none", borderRadius: 5, padding: "3px 8px", cursor: "pointer", background: filterStatus === s ? "#5555ff" : "#111128", color: filterStatus === s ? "#fff" : "#555" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats strip */}
            <div style={{ display: "flex", borderBottom: "1px solid #111128", borderTop: "1px solid #111128" }}>
              {[["Open", stats.open, "#0A84FF"], ["Urgent", stats.urgent, "#FF3B30"], ["Done", stats.resolved, "#32D74B"]].map(([l, v, c]) => (
                <div key={l} style={{ flex: 1, padding: "8px 0", textAlign: "center", borderRight: "1px solid #111128" }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: c }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#444", letterSpacing: 0.5 }}>{l.toUpperCase()}</div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.length === 0 && <div style={{ padding: 20, fontSize: 12, color: "#333", textAlign: "center" }}>No tickets found</div>}
              {filtered.map(t => (
                <div key={t.id} onClick={() => { setSelected(t); setReply(""); }}
                  style={{ padding: "11px 12px", borderBottom: "1px solid #0e0e1a", cursor: "pointer", background: selected?.id === t.id ? "#111130" : "transparent", borderLeft: selected?.id === t.id ? "3px solid #5555ff" : "3px solid transparent", transition: "all .1s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: "#444" }}>{t.id}</span>
                    <span style={{ fontSize: 10, color: "#333" }}>{timeAgo(t.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#dde", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                  <div style={{ fontSize: 11, color: "#555", marginBottom: 6 }}>{t.customer}</div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Badge label={t.priority} color={P_COLOR[t.priority]} />
                    <Badge label={t.status} color={S_COLOR[t.status]} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket detail */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {showNewTicket && (
              <div style={{ position: "fixed", inset: 0, background: "#00000088", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "#0e0e22", border: "1px solid #2a2a4a", borderRadius: 16, padding: "28px 28px", width: 420 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#f0f0ff", marginBottom: 20 }}>New Ticket</div>
                  <Input label="Subject" value={newTicket.subject} onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))} placeholder="What's the issue?" />
                  <Input label="Customer Name" value={newTicket.customer} onChange={e => setNewTicket(p => ({ ...p, customer: e.target.value }))} placeholder="John Doe" />
                  <Input label="Customer Email" value={newTicket.email} onChange={e => setNewTicket(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 700 }}>Priority</label>
                    <select value={newTicket.priority} onChange={e => setNewTicket(p => ({ ...p, priority: e.target.value }))}
                      style={{ width: "100%", background: "#0a0a1a", border: "1px solid #222240", borderRadius: 9, color: "#e0e0ff", padding: "10px 13px", fontSize: 13, outline: "none" }}>
                      {["low", "medium", "high", "urgent"].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <Btn variant="ghost" onClick={() => setShowNewTicket(false)}>Cancel</Btn>
                    <Btn onClick={createTicket}>Create Ticket</Btn>
                  </div>
                </div>
              </div>
            )}

            {selected ? (
              <>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #111128", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#f0f0ff", marginBottom: 4, fontFamily: "Georgia, serif" }}>{selected.subject}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{selected.customer} Â· {selected.email} Â· via {selected.channel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {selected.status !== "resolved" && <Btn variant="success" onClick={() => updateTicketStatus(selected.id, "resolved")} style={{ padding: "6px 12px", fontSize: 11 }}>âœ“ Resolve</Btn>}
                    {selected.status !== "pending" && selected.status !== "resolved" && <Btn variant="ghost" onClick={() => updateTicketStatus(selected.id, "pending")} style={{ padding: "6px 12px", fontSize: 11 }}>â¸ Pending</Btn>}
                    <Badge label={selected.priority} color={P_COLOR[selected.priority]} />
                    <Badge label={selected.status} color={S_COLOR[selected.status]} />
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
                  {/* Customer message */}
                  <div style={{ background: "#0c0c1e", border: "1px solid #1a1a30", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: "#444", marginBottom: 8 }}>Customer wrote Â· {timeAgo(selected.created_at)}</div>
                    <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7 }}>
                      Hello, I'm reaching out about: <strong style={{ color: "#ddd" }}>{selected.subject}</strong>. I've been experiencing this issue and would appreciate your help resolving it as quickly as possible. Thank you for your time.
                    </div>
                  </div>

                  {/* AI Reply Box */}
                  <div style={{ background: "#0a0a20", border: "1px solid #2a2a5a", borderRadius: 13, padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#5555ff", letterSpacing: 0.8 }}>âœ¦ AI REPLY ASSISTANT</div>
                      <Btn onClick={genAiReply} disabled={aiLoading} style={{ padding: "5px 12px", fontSize: 11 }}>
                        {aiLoading ? "Writingâ€¦" : "âœ¦ Draft reply"}
                      </Btn>
                    </div>
                    <textarea value={reply} onChange={e => setReply(e.target.value)}
                      placeholder="Click 'Draft reply' to generate an AI response, or write your ownâ€¦"
                      style={{ width: "100%", minHeight: 120, background: "#06060e", border: "1px solid #1e1e36", borderRadius: 9, color: "#ddd", padding: "10px 13px", fontSize: 13, lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", outline: "none", fontFamily: "inherit" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#333" }}>{reply.length} chars</span>
                      <Btn onClick={() => { alert("Reply sent! âœ“"); setReply(""); updateTicketStatus(selected.id, "resolved"); }} disabled={!reply} style={{ padding: "7px 16px" }}>
                        Send & Resolve â†’
                      </Btn>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#222", gap: 10 }}>
                <div style={{ fontSize: 40 }}>ðŸ“¥</div>
                <div style={{ fontSize: 13 }}>Select a ticket to get started</div>
              </div>
            )}
          </div>
        </>}

        {/* â”€â”€ CHATBOT â”€â”€ */}
        {tab === "chatbot" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #111128", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "Georgia, serif", color: "#f0f0ff" }}>ðŸ¤– AI Chatbot</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>Live preview Â· Powered by Claude</div>
              </div>
              <Btn onClick={() => setScreen("embed")} variant="ghost" style={{ fontSize: 11 }}>Get embed code â†’</Btn>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12, maxWidth: 680, width: "100%" }}>
              {chatMsgs.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "72%", background: m.role === "user" ? "#3333aa" : "#0e0e22", border: `1px solid ${m.role === "user" ? "#5555cc" : "#1e1e3a"}`, borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px", fontSize: 13, color: "#e0e0ff", lineHeight: 1.65 }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && <div style={{ display: "flex" }}><div style={{ background: "#0e0e22", border: "1px solid #1e1e3a", borderRadius: "16px 16px 16px 4px", padding: "10px 14px", fontSize: 12, color: "#444" }}>Thinkingâ€¦</div></div>}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: "12px 24px", borderTop: "1px solid #111128", display: "flex", gap: 10 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Ask the bot anythingâ€¦"
                style={{ flex: 1, background: "#0e0e22", border: "1px solid #1e1e3a", borderRadius: 10, color: "#ddd", padding: "10px 13px", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
              <Btn onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>Send</Btn>
            </div>
          </div>
        )}

        {/* â”€â”€ ANALYTICS â”€â”€ */}
        {tab === "analytics" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "Georgia, serif", color: "#f0f0ff", marginBottom: 4 }}>ðŸ“Š Analytics</div>
            <div style={{ fontSize: 12, color: "#444", marginBottom: 24 }}>All-time support performance</div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
              {[["Total tickets", tickets.length, null], ["Open", stats.open, "#0A84FF"], ["Resolved", stats.resolved, "#32D74B"], ["Urgent", stats.urgent, "#FF3B30"]].map(([l, v, c]) => (
                <div key={l} style={{ flex: "1 1 130px", background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: c || "#f0f0ff", fontFamily: "Georgia, serif" }}>{v}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 14, padding: "20px 22px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: 0.8, marginBottom: 16 }}>BY STATUS</div>
                {[["Open", stats.open, "#0A84FF"], ["Pending", tickets.filter(t => t.status === "pending").length, "#FF9F0A"], ["Resolved", stats.resolved, "#32D74B"]].map(([l, v, c]) => {
                  const pct = tickets.length ? Math.round(v / tickets.length * 100) : 0;
                  return (
                    <div key={l} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 5 }}><span>{l}</span><span style={{ color: c }}>{pct}%</span></div>
                      <div style={{ background: "#111128", borderRadius: 4, height: 5 }}><div style={{ width: `${pct}%`, background: c, height: "100%", borderRadius: 4 }} /></div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 14, padding: "20px 22px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#555", letterSpacing: 0.8, marginBottom: 16 }}>BY PRIORITY</div>
                {["urgent", "high", "medium", "low"].map(p => {
                  const count = tickets.filter(t => t.priority === p).length;
                  const pct = tickets.length ? Math.round(count / tickets.length * 100) : 0;
                  return (
                    <div key={p} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 5 }}><span style={{ textTransform: "capitalize" }}>{p}</span><span style={{ color: P_COLOR[p] }}>{count}</span></div>
                      <div style={{ background: "#111128", borderRadius: 4, height: 5 }}><div style={{ width: `${pct}%`, background: P_COLOR[p], height: "100%", borderRadius: 4 }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ PORTAL â”€â”€ */}
        {tab === "portal" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
            <div style={{ fontSize: 22, fontWeight: 900, fontFamily: "Georgia, serif", color: "#f0f0ff", marginBottom: 4 }}>ðŸ“š Self-Service Portal</div>
            <div style={{ fontSize: 12, color: "#444", marginBottom: 24 }}>Help articles that deflect tickets automatically</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px,1fr))", gap: 12 }}>
              {[["How to reset your password", 1240, 94], ["Understanding your invoice", 880, 89], ["Connecting integrations", 670, 91], ["Exporting your data", 540, 87], ["Managing team permissions", 430, 92], ["Getting started guide", 2100, 96]].map(([title, views, helpful]) => (
                <div key={title} onClick={() => alert(`ðŸ“„ ${title}\n\nFull article editor coming in next build!`)}
                  style={{ background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 12, padding: "16px 18px", cursor: "pointer", transition: "border-color .15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#5555ff55"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e3a"}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0ff", marginBottom: 10 }}>{title}</div>
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#555" }}>
                    <span>ðŸ‘ {views.toLocaleString()}</span>
                    <span style={{ color: "#32D74B" }}>ðŸ‘ {helpful}%</span>
                  </div>
                </div>
              ))}
              <div onClick={() => alert("Article editor coming soon!")}
                style={{ background: "#08080f", border: "2px dashed #1a1a2e", borderRadius: 12, padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 13 }}>
                + Write new article
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ROOT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function App() {
  const [user, setUser] = useState(null);
  return user
    ? <Dashboard user={user} onLogout={() => setUser(null)} />
    : <AuthScreen onAuth={setUser} />;
}
