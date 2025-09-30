import React, { useEffect, useMemo, useState } from "react";

// Resolve image from product record.
// - Accepts full https:// URLs as-is
// - Otherwise prefixes /images/ (served from public/images)
// - Encodes spaces and special chars
function imgSrcFor(p) {
  const raw =
    (p && (p.imageURL || p.image || p.img || p.photo || p.picture)) || "";
  const looksLikeUrl = /^https?:\/\//i.test(raw);
  const src = looksLikeUrl ? raw : `/images/${raw}`;
  return encodeURI(src);
}

function useQuery() {
  const [q, setQ] = useState(new URLSearchParams(window.location.search));
  useEffect(() => {
    const fn = () => setQ(new URLSearchParams(window.location.search));
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);
  return q;
}

export default function App() {
  const [modal, setModal] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const q = useQuery();
  const teamFilter = q.get("team");

  useEffect(() => {
  (async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        if (Array.isArray(j.products) && j.products.length > 0) {
          setItems(j.products);
          setLoading(false);
          return;
        }
      }
    } catch {}
    try {
      const res2 = await fetch("/products.json", { cache: "no-store" });
      const j2 = await res2.json();
      setItems(j2.products || []);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  const products = useMemo(() => {
    if (!teamFilter) return items;
    return items.filter(p => (p.team || []).includes(teamFilter));
  }, [items, teamFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-black/40 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/logo.svg" alt="Arena Customs" className="h-8" />
            <span className="font-semibold tracking-wide">Arena Customs</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#catalog" className="hover:text-white/90">Catalog</a>
            <a href="#work" className="hover:text-white/90">Projects</a>
            <a href="#contact" className="hover:text-white/90">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/hero-jersey-court.jpg" alt="Custom Jerseys" className="w-full h-full object-cover opacity-60" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-24 sm:py-32">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight">
              Custom Jerseys that
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                Play as Hard as You Do
              </span>
            </h1>
            <p className="mt-4 text-lg text-slate-200/90">
              Fast proofs. Pro fabrics. Team packages that scale. Tap to pay, invoice, or order online—your call.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#catalog" className="px-5 py-3 rounded-2xl bg-white text-black font-medium hover:opacity-90">Shop Catalog</a>
              <button onClick={() => setModal({ type: 'invoice' })} className="px-5 py-3 rounded-2xl ring-1 ring-white/30 hover:bg-white/10">
                Request Team Quote
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-black/40 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-slate-300 text-sm">
          <div>Secure Checkout (Stripe & Square)</div>
          <div>Invoices via Ninja</div>
          <div>Rush Orders Available</div>
          <div>Worldwide Shipping</div>
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold">Catalog{teamFilter ? ` — ${teamFilter}` : ""}</h2>
            <p className="text-slate-300">
              {teamFilter ? "Filtered by team" : "Tap a product to customize and check out."}
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-8 text-slate-300">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="mt-8 text-slate-300">No products found{teamFilter ? " for this team." : "."}</p>
        ) : (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <article key={p.id} onClick={() => { const url = p.stripeLink || p.squareLink; if(url) window.open(url, "_blank"); }} className="rounded-3xl cursor-pointer overflow-hidden bg-white/5 backdrop-blur ring-1 ring-white/10 hover:ring-white/20 transition">
                <img
                  src={imgSrcFor(p)}
                  alt={p.name}
                  className="w-full h-56 rounded-3xl object-cover"
                />
                <div className="p-5">
                  <h3 className="text-xl font-semibold">{p.name}</h3>
                  <p className="text-slate-300 text-sm">{p.tagline || ""}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-white font-bold text-lg">${p.price ?? 0}</span>
                    <span className="text-slate-400 text-sm">USD</span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    {p.stripeLink ? (
                      <a className="btn-primary" href={p.stripeLink} target="_blank" rel="noreferrer">Pay with Stripe</a>
                    ) : <div className="btn-secondary opacity-50 text-center">Stripe N/A</div>}
                    {p.squareLink ? (
                      <a className="btn-secondary" href={p.squareLink} target="_blank" rel="noreferrer">Pay with Square</a>
                    ) : <div className="btn-ghost opacity-50 text-center">Square N/A</div>}
                    <button className="btn-ghost" onClick={() => setModal({ type: 'cash', product: p })}>Cash</button>
                    <button className="btn-ghost" onClick={() => setModal({ type: 'invoice', product: p })}>Request Invoice</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Work / gallery */}
      {/* Contact */}
      <section id="contact" className="max-w-6xl mx-auto px-4 pb-24">
        <div className="bg-white/5 rounded-3xl p-6 ring-1 ring-white/10">
          <h2 className="text-2xl font-bold">Tell us about your team</h2>
          <p className="text-slate-300">We’ll reply with a proof + timeline. Or email hello@arenacustoms.example</p>
          <LeadForm onSubmitted={() => setModal({ type: 'thanks' })} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-slate-400 text-sm">
        © {new Date().getFullYear()} Arena Customs • All rights reserved.
      </footer>

      {/* Modals */}
      {modal && <Modal onClose={() => setModal(null)}>
        {modal.type === 'cash' && <CashModal product={modal.product} onClose={() => setModal(null)} />}
        {modal.type === 'invoice' && <InvoiceModal product={modal.product} onClose={() => setModal(null)} />}
        {modal.type === 'thanks' && <ThanksModal onClose={() => setModal(null)} />}
      </Modal>}

      {/* Button styles */}
      <style>{`
        .btn-primary{ @apply px-3 py-2 rounded-xl bg-white text-black text-sm font-semibold text-center hover:opacity-90; }
        .btn-secondary{ @apply px-3 py-2 rounded-xl ring-1 ring-white/30 text-sm text-center hover:bg-white/10; }
        .btn-ghost{ @apply px-3 py-2 rounded-xl text-sm text-center ring-1 ring-white/10 hover:bg-white/5; }
      `}</style>
    </div>
  );
}

function LeadForm({ onSubmitted }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", team: "", qty: "", notes: "" });
  async function submit(e){ e.preventDefault(); try{ setLoading(true);
    await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    onSubmitted?.(); setForm({ name: "", email: "", team: "", qty: "", notes: "" });
  } finally { setLoading(false); } }
  return (
    <form onSubmit={submit} className="mt-4 grid sm:grid-cols-2 gap-3">
      <input required placeholder="Your name" className="inp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
      <input required type="email" placeholder="Email" className="inp" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
      <input placeholder="Team / Organization" className="inp" value={form.team} onChange={e=>setForm({...form,team:e.target.value})} />
      <input placeholder="Estimated quantity" className="inp" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})} />
      <textarea placeholder="Notes (colors, deadline, sport)" className="inp sm:col-span-2" rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
      <button disabled={loading} className="btn-primary sm:col-span-2">{loading? 'Submitting…' : 'Get a Proof'}</button>
      <style>{`.inp{@apply w-full px-4 py-3 rounded-2xl bg-black/40 ring-1 ring-white/10 placeholder:text-slate-400 focus:outline-none focus:ring-white/30;}`}</style>
    </form>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg" onClick={e=>e.stopPropagation()}>
        <div className="rounded-2xl bg-slate-900 ring-1 ring-white/10 p-6">
          <button onClick={onClose} className="float-right text-slate-400 hover:text-white">✕</button>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CashModal({ product, onClose }) {
  const [form, setForm] = useState({ name: "", email: "", amount: product?.price ?? "", notes: "" });
  async function submit(e){ e.preventDefault(); onClose?.(); }
  return (
    <div>
      <h3 className="text-xl font-bold">Record Cash Sale</h3>
      <p className="text-slate-300 text-sm">We’ll log this in Notion and email a receipt.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <input required placeholder="Buyer name" className="inp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
        <input type="email" placeholder="Buyer email (for receipt)" className="inp" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
        <input required placeholder="Amount (USD)" className="inp" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
        <textarea placeholder="Notes" className="inp" rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} />
        <button className="btn-primary">Save Cash Sale</button>
      </form>
    </div>
  );
}

function InvoiceModal({ product, onClose }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  async function submit(e){ e.preventDefault(); onClose?.(); }
  return (
    <div>
      <h3 className="text-xl font-bold">Request Invoice</h3>
      <p className="text-slate-300 text-sm">We’ll send a Ninja invoice with your custom details.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <input required className="inp" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
        <input required type="email" className="inp" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <textarea className="inp" rows={3} placeholder="Jersey type, sizes, colors, deadline" value={notes} onChange={e=>setNotes(e.target.value)} />
        <button className="btn-primary">Send Invoice Request</button>
      </form>
    </div>
  );
}

function ThanksModal(){
  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold">Thanks! 📣</h3>
      <p className="text-slate-300 mt-2">We’ll reply shortly with a proof and timeline.</p>
    </div>
  );
}
