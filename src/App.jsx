                import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

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

const DEMO_TICKETS = [
  { id: "TK-001", subject: "Can't log into my account", customer: "Maria Santos", email: "maria@co.com", status: "open", priority: "high", created_at: new Date(Date.now() - 7200000).toISOString(), channel: "email" },
  { id: "TK-002", subject: "Billing charge I don't recognize", customer: "James Okafor", email: "james@co.com", status: "open", priority: "urgent", created_at: new Date(Date.now() - 1800000).toISOString(), channel: "chat" },
  { id: "TK-003", subject: "How do I export my data?", customer: "Yuki Tanaka", email: "yuki@co.com", status: "resolved", priority: "low", created_at: new Date(Date.now() - 86400000).toISOString(), channel: "portal" },
  { id: "TK-004", subject: "Zapier integration broken", customer: "Carlos Diaz", email: "carlos@co.com", status: "open", priority: "medium", created_at: new Date(Date.now() - 14400000).toISOString(), channel: "email" },
  { id: "TK-005", subject: "Feature request: dark mode", customer: "Priya Nair", email: "priya@co.com", status: "pending", priority: "low", created_at: new Date(Date.now() - 259200000).toISOString(), channel: "portal" },
];

const P_COLOR = { urgent: "#FF3B30", high: "#FF9F0A", medium: "#FFD60A", low: "#32D74B" };
const S_COLOR = { open: "#0A84FF", pending: "#FF9F0A", resolved: "#32D74B" };

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

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
    <button {...props} style={{ border: "none", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: props.disabled ? "not-allowed" : "pointer", opacity: props.disabled ? 0.5 : 1, transition: "opacity .15s", ...styles[variant], ...props.style }}>
      {children}
    </button>
  );
}

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
      onAuth({ email: email || "demo@supportdesk.ai", token: "demo", demo: true });
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060610", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "radial-gradient(circle, #5555ff18 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ width: 400, background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 20, padding: "40px 36px", position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#5555ff,#9955ff)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 22, color: "#fff", fontWeight: 900 }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f0f0ff", letterSpacing: -0.5 }}>SupportDesk<span style={{ color: "#5555ff" }}>.ai</span></div>
          <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>AI-powered customer support</div>
        </div>

        <div style={{ display: "flex", background: "#060610", borderRadius: 10, padding: 3, marginBottom: 24 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, background: mode === m ? "#1e1e3a" : "transparent", color: mode === m ? "#e0e0ff" : "#555", transition: "all .15s" }}>
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <Input label="Email" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
        <Input label="Password" type="password" placeholder="min 6 characters" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} />

        {error && <div style={{ fontSize: 12, color: error.includes("created") ? "#32D74B" : "#FF3B30", marginBottom: 12, padding: "8px 12px", background: "#FF3B3011", borderRadius: 7 }}>{error}</div>}

        <Btn onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "12px", fontSize: 14 }}>
          {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
        </Btn>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#333" }}>
          <span onClick={() => onAuth({ email: "demo@supportdesk.ai", token: "demo", demo: true })} style={{ color: "#5555ff", cursor: "pointer" }}>
            Skip - enter demo mode
          </span>
        </div>
      </div>
    </div>
  );
}

function PricingScreen({ onBack }) {
  const plans = [
    { name: "Free", price: "0", period: "/mo", color: "#666", features: ["1 agent seat", "50 tickets/month", "Basic email support", "Community portal"], link: null, cta: "Current Plan" },
    { name: "Starter", price: "999", period: "/mo", color: "#5555ff", features: ["3 agent seats", "500 tickets/month", "AI reply drafting", "Live chatbot widget", "Analytics dashboard"], popular: true, cta: "Upgrade" },
    { name: "Growth", price: "2999", period: "/mo", color: "#32D74B", features: ["Unlimited agents", "Unlimited tickets", "Priority AI responses", "Custom chatbot branding", "Dedicated support"], cta: "Upgrade" },
  ];

  function handleUpgrade(plan) {
    if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID === "undefined") {
      alert("Razorpay not configured yet. Add your key ID to Vercel environment variables.");
      return;
    }
    const options = {
      key: RAZORPAY_KEY_ID,
      amount: parseInt(plan.price) * 100,
      currency: "INR",
      name: "SupportDesk.ai",
      description: `${plan.name} Plan - Monthly`,
      handler: function(response) {
        alert("Payment successful! Plan upgraded to " + plan.name);
      },
      theme: { color: plan.color },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060610", fontFamily: "system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, marginBottom: 32 }}>Back to dashboard</button>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#f0f0ff" }}>Simple pricing</div>
          <div style={{ fontSize: 14, color: "#555", marginTop: 8 }}>Start free. Scale when ready.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {plans.map(p => (
            <div key={p.name} style={{ background: "#0a0a18", border: `1px solid ${p.popular ? p.color + "55" : "#1e1e3a"}`, borderRadius: 16, padding: "28px 24px", position: "relative" }}>
              {p.popular && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: p.color, color: "#fff", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20, letterSpacing: 1, whiteSpace: "nowrap" }}>MOST POPULAR</div>}
              <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 8 }}>{p.name}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: "#f0f0ff" }}>
                {p.price === "0" ? "Free" : `Rs.${p.price}`}
                <span style={{ fontSize: 13, color: "#555", fontWeight: 400 }}>{p.period}</span>
              </div>
              <div style={{ margin: "20px 0", borderTop: "1px solid #1a1a2e" }} />
              {p.features.map(f => (
                <div key={f} style={{ fontSize: 13, color: "#aaa", marginBottom: 10, display: "flex", gap: 8 }}>
                  <span style={{ color: p.color }}>+</span> {f}
                </div>
              ))}
              <div style={{ marginTop: 24 }}>
                {p.price === "0"
                  ? <Btn variant="ghost" style={{ width: "100%", borderColor: "#333", color: "#555" }}>{p.cta}</Btn>
                  : <Btn onClick={() => handleUpgrade(p)} style={{ width: "100%", background: p.color }}>{p.cta}</Btn>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmbedScreen({ onBack }) {
  const [copied, setCopied] = useState(false);
  const code = `<script src="https://cdn.supportdesk.ai/widget.js"></script>\n<script>\n  SupportDesk.init({ key: "YOUR_KEY" });\n</script>`;

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060610", fontFamily: "system-ui, sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, marginBottom: 32 }}>Back</button>
        <div style={{ fontSize: 24, fontWeight: 900, color: "#f0f0ff", marginBottom: 6 }}>Embed your chatbot</div>
        <div style={{ fontSize: 13, color: "#555", marginBottom: 32 }}>Paste before the closing body tag on any website.</div>
        <div style={{ background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #1e1e3a", background: "#08080f" }}>
            <span style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>embed.html</span>
            <Btn onClick={copy} variant="ghost" style={{ padding: "5px 12px", fontSize: 11 }}>{copied ? "Copied!" : "Copy"}</Btn>
          </div>
          <pre style={{ margin: 0, padding: "20px", fontSize: 12, color: "#a0a0ff", fontFamily: "monospace", lineHeight: 1.8, overflowX: "auto", whiteSpace: "pre-wrap" }}>{code}</pre>
        </div>
        <div style={{ marginTop: 24, background: "#0a0a18", border: "1px solid #1e1e3a", borderRadius: 14, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0ff", marginBottom: 14 }}>Platform guides</div>
          {["Shopify", "WordPress", "Webflow", "Squarespace", "Custom HTML"].map(p => (
            <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #111128", fontSize: 13, color: "#888" }}>
              <span>{p}</span>
              <span style={{ color: "#5555ff", cursor: "pointer" }}>View guide</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("inbox");
  const [screen, setScreen] = useState("dashboard");
  const [tickets, setTickets] = useState(DEMO_TICKETS);
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [chatMsgs, setChatMsgs] = useState([{ role: "assistant", text: "Hi! I am your AI support bot. Ask me anything about your product." }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", customer: "", email: "", priority: "medium" });
  const [showNewTicket, setShowNewTicket] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

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
    const res = await askClaude("You are a helpful SaaS product support bot. Answer clearly and briefly.", msg, history);
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
    { id: "inbox", label: "IN" },
    { id: "chatbot", label: "BOT" },
    { id: "analytics", label: "ST" },
    { id: "portal", label: "KB" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#060610", color: "#e0e0ff", fontFamily: "system-ui, sans-serif", overflow: "hidden" }}>
      <nav style={{ width: 60, background: "#08080f", borderRight: "1px solid #111128", display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 0", gap: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#5555ff,#9955ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14, marginBottom: 16 }}>S</div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)} title={n.id}
            style={{ width: 44, height: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, background: tab === n.id ? "#1a1a3a" : "transparent", color: tab === n.id ? "#a0a0ff" : "#444", outline: tab === n.id ? "1px solid #5555ff44" : "none", transition: "all .12s" }}>
            {n.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => setScreen("embed")} title="Embed" style={{ width: 44, height: 44, borderRadius: 11, border: "none", cursor: "pointer", fontSize: 11, background: "transparent", color: "#555", fontWeight: 700 }}>{"</>"}</button>
        <button onClick={() => setScreen("pricing")} title="Pricing" style={{ width: 44, height: 44, borderRadius: 11, border: "1px solid #5555ff33", cursor: "pointer", fontSize: 11, background: "#5555ff11", c
