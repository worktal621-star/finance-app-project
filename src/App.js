import React, { useState, useEffect, useMemo } from "react";
import {
  PieChart as PieChartIcon,
  Banknote,
  PiggyBank,
  ArrowUpCircle,
  Target,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Download,
  ChevronDown,
  Calendar,
  History,
  LayoutList,
  RotateCcw,
  Home,
  Wallet,
  ReceiptText,
  Clock,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
  Tag,
  Lightbulb,
  AlertCircle,
  Sparkles,
  PiggyBank as PiggyBankIcon,
  TrendingDown as TrendingDownIcon,
} from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "budget-app-v2";
const SYSTEM_CATEGORIES = ["מזון", "דלק", "בילויים", "קניות", "בריאות", "תחבורה", "אחר"];

const CATEGORY_COLORS = {
  מזון: "#fbbf24",
  דלק: "#60a5fa",
  בילויים: "#f87171",
  קניות: "#a78bfa",
  בריאות: "#34d399",
  תחבורה: "#fb923c",
  אחר: "#94a3b8",
};

// ─── date helpers ─────────────────────────────────────────────────────────────

function currentBillingMonth() {
  const d = new Date();
  if (d.getDate() >= 10) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(ym) {
  const [y, m] = ym.split("-");
  const names = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ─── category helpers ─────────────────────────────────────────────────────────

function resolveSystemCategory(name) {
  if (!name) return "אחר";
  const lower = name.trim().toLowerCase();
  const match = SYSTEM_CATEGORIES.find((sc) => lower.includes(sc.toLowerCase()));
  return match || "אחר";
}

function calcAutoEstimate(item, months, beforeMonth) {
  if (item.estimatedManual) return num(item.estimated);
  const sysCategory = resolveSystemCategory(item.category);
  const sorted = Object.keys(months).filter((ym) => ym < beforeMonth).sort().reverse().slice(0, 3);
  const actuals = sorted
    .flatMap((ym) => (months[ym].variableExpenses || []).filter((e) => resolveSystemCategory(e.category) === sysCategory).map((e) => num(e.actual)))
    .filter((v) => v > 0);
  if (actuals.length === 0) return 0;
  return Math.round(actuals.reduce((s, v) => s + v, 0) / actuals.length);
}

// ─── migration ────────────────────────────────────────────────────────────────

function migrateVariableExpense(item) {
  if (item.estimated !== undefined) {
    return {
      estimatedManual: false,
      description: item.description || "",
      date: item.date || new Date().toISOString(),
      ...item,
    };
  }
  return {
    id: item.id,
    category: item.category,
    estimated: num(item.amount ?? 0),
    actual: num(item.actual ?? 0),
    estimatedManual: false,
    description: "",
    date: new Date().toISOString(),
  };
}

// ─── storage ──────────────────────────────────────────────────────────────────

function emptyMonth() {
  return { variableExpenses: [], savingGoal: "", categories: [] };
}

function loadStorage() {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function initStorage() {
  const saved = loadStorage();
  const current = currentBillingMonth();
  if (saved) {
    if (!saved.months[current]) saved.months[current] = emptyMonth();
    Object.keys(saved.months).forEach((ym) => {
      if (!saved.months[ym].categories) saved.months[ym].categories = [];
      if (!saved.months[ym].variableExpenses) saved.months[ym].variableExpenses = [];
      saved.months[ym].variableExpenses = saved.months[ym].variableExpenses.map(migrateVariableExpense);
    });
    return saved;
  }
  return { salary: "", fixedExpenses: [], months: { [current]: emptyMonth() } };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(salary, fixedExpenses, months) {
  const rows = [["חודש", "קטגוריה", "קטגוריית מערכת", "צפי", "בפועל", "הפרש", "סוג"]];
  Object.keys(months).sort().forEach((ym) => {
    const label = formatMonthLabel(ym);
    fixedExpenses.forEach((e) => rows.push([label, e.category, "", num(e.amount), "", "", "קבוע"]));
    (months[ym].variableExpenses || []).forEach((e) => {
      const est = num(e.estimated), act = num(e.actual);
      rows.push([label, e.category, resolveSystemCategory(e.category), est, act, act - est, "משתנה"]);
    });
    (months[ym].categories || []).forEach((c) => rows.push([label, c.name, "", num(c.budget), num(c.spent), num(c.spent) - num(c.budget), "קטגוריה (מעקב בלבד)"]));
  });
  const BOM = "\uFEFF";
  const csv = BOM + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `budget-export-${currentBillingMonth()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── shared UI primitives ─────────────────────────────────────────────────────

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300";
const cellInputCls = "w-20 border border-indigo-200 rounded-lg px-2 py-1 text-sm text-left text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300";

const ProgressBar = ({ value, max, colorOverride }) => {
  const pct = max === 0 ? 0 : Math.min(120, (value / max) * 100);
  const displayPct = Math.min(100, pct);
  const color = colorOverride || (pct > 100 ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-emerald-500");
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${displayPct}%` }} />
    </div>
  );
};

// ── Fixed expense row ──
const FixedExpenseRow = ({ item, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ category: item.category, amount: String(item.amount) });
  const commit = () => {
    if (!form.category.trim() || !form.amount) return;
    onEdit({ ...item, category: form.category.trim(), amount: parseFloat(form.amount) || 0 });
    setEditing(false);
  };
  if (editing) return (
    <tr className="bg-indigo-50/40">
      <td className="px-4 py-3"><input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commit()} autoFocus /></td>
      <td className="px-4 py-3"><input className={`${inputCls} text-left`} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commit()} placeholder="0" /></td>
      <td className="px-3 py-3"><div className="flex gap-1 justify-end"><button onClick={commit} className="p-1 text-emerald-600"><Check className="w-4 h-4" /></button><button onClick={() => setEditing(false)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button></div></td>
    </tr>
  );
  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-4 py-3.5"><p className="font-semibold text-slate-700 text-sm">{item.category}</p></td>
      <td className="px-4 py-3.5 text-left font-bold text-slate-900 text-sm">₪{num(item.amount).toLocaleString()}</td>
      <td className="px-3 py-3.5"><div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-indigo-500"><Pencil className="w-3.5 h-3.5" /></button><button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
    </tr>
  );
};

// ── Variable expense row ──
const VariableExpenseRow = ({ item, onEdit, onDelete, onAddExpense, autoEstimate }) => {
  const [editField, setEditField] = useState(null);
  const [draft, setDraft] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState("");

  const startEdit = (field, currentVal) => { setDraft(String(currentVal)); setEditField(field); };

  const commit = () => {
    if (editField === "category") { if (!draft.trim()) { setEditField(null); return; } onEdit({ ...item, category: draft.trim() }); }
    else if (editField === "estimated") onEdit({ ...item, estimated: parseFloat(draft) || 0, estimatedManual: true });
    else if (editField === "actual") onEdit({ ...item, actual: parseFloat(draft) || 0 });
    setEditField(null);
  };

  const resetToAuto = () => onEdit({ ...item, estimated: autoEstimate ?? 0, estimatedManual: false });
  const handleKey = (e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditField(null); };

  const commitExpense = () => {
    const n = parseFloat(expenseDraft);
    if (!isNaN(n) && n !== 0) onAddExpense(item.id, n);
    setExpenseDraft(""); setAddingExpense(false);
  };

  const diff = num(item.actual) - num(item.estimated);
  const diffColor = diff < 0 ? "text-emerald-600" : diff > 0 ? "text-red-500" : "text-slate-400";
  const diffLabel = diff === 0 ? "זהה" : diff < 0 ? `↓ ₪${Math.abs(diff).toLocaleString()}` : `↑ ₪${diff.toLocaleString()}`;
  const isManual = !!item.estimatedManual;
  const color = CATEGORY_COLORS[item.category] || "#94a3b8";
  const dateStr = item.date ? new Date(item.date).toLocaleDateString("he-IL") : "";

  return (
    <>
      <tr className="hover:bg-slate-50/50 transition-colors group">
        {/* קטגוריה + תיאור + תאריך */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
              style={{ backgroundColor: color }}
            >
              {item.category.charAt(0)}
            </div>
            <div className="min-w-0">
              {editField === "category" ? (
                <div className="flex items-center gap-1">
                  <input className={cellInputCls + " w-28"} type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKey} autoFocus />
                  <button onClick={commit} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditField(null)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button onClick={() => startEdit("category", item.category)} className="font-semibold text-slate-800 text-sm hover:text-indigo-600 text-right block truncate max-w-[150px]">
                  {item.description || item.category}
                </button>
              )}
              <p className="text-[10px] text-slate-400 mt-0.5 flex gap-1.5">
                <span>{item.category}</span>
                {dateStr && <><span>·</span><span>{dateStr}</span></>}
              </p>
            </div>
          </div>
        </td>

        {/* בפועל */}
        <td className="px-3 py-3 text-left">
          <div className="flex items-center gap-1.5">
            {editField === "actual" ? (
              <div className="flex items-center gap-1">
                <input className={cellInputCls} type="number" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKey} autoFocus />
                <button onClick={commit} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditField(null)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => startEdit("actual", item.actual)} className="text-sm font-medium text-slate-700 hover:text-indigo-600">
                ₪{num(item.actual).toLocaleString()}
              </button>
            )}
            <button
              onClick={() => { setAddingExpense((v) => !v); setExpenseDraft(""); }}
              title="הוסף הוצאה"
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${addingExpense ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-500"}`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </td>

        {/* מחיקה */}
        <td className="px-3 py-3">
          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </td>
      </tr>

      {addingExpense && (
        <tr className="bg-rose-50/50 border-t border-rose-100">
          <td className="px-4 py-2 text-xs text-slate-500 text-right">הוסף ל<span className="font-semibold text-slate-700">{item.category}</span>:</td>
          <td className="px-3 py-2" colSpan={2}>
            <div className="flex items-center gap-2">
              <input
                className="w-24 border border-rose-200 rounded-lg px-2 py-1 text-sm text-left text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
                type="number" placeholder="₪ סכום" value={expenseDraft}
                onChange={(e) => setExpenseDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitExpense(); if (e.key === "Escape") setAddingExpense(false); }}
                autoFocus
              />
              <button onClick={commitExpense} className="p-1 text-emerald-600"><Check className="w-4 h-4" /></button>
              <button onClick={() => setAddingExpense(false)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Budget category card ──
const CategoryCard = ({ cat, onEdit, onDelete }) => {
  const [editingSpent, setEditingSpent] = useState(false);
  const [spentDraft, setSpentDraft] = useState(String(cat.spent));
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState({ name: cat.name, budget: String(cat.budget) });

  const pct = cat.budget > 0 ? (cat.spent / cat.budget) * 100 : 0;
  const remaining = cat.budget - cat.spent;
  const barColor = pct > 100 ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-emerald-500";
  const badgeCls = pct > 100 ? "bg-red-50 text-red-600 border-red-100" : pct > 80 ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100";

  const commitSpent = () => { onEdit({ ...cat, spent: parseFloat(spentDraft) || 0 }); setEditingSpent(false); };
  const commitName = () => {
    if (!nameDraft.name.trim()) return;
    onEdit({ ...cat, name: nameDraft.name.trim(), budget: parseFloat(nameDraft.budget) || 0 });
    setEditingName(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="space-y-2">
                <input className={inputCls} value={nameDraft.name} onChange={(e) => setNameDraft({ ...nameDraft, name: e.target.value })} placeholder="שם קטגוריה" autoFocus />
                <input className={inputCls} type="number" value={nameDraft.budget} onChange={(e) => setNameDraft({ ...nameDraft, budget: e.target.value })} placeholder="תקציב (₪)" />
                <div className="flex gap-2">
                  <button onClick={commitName} className="flex-1 py-1.5 bg-indigo-600 text-white text-xs rounded-lg">שמור</button>
                  <button onClick={() => setEditingName(false)} className="flex-1 py-1.5 border border-slate-200 text-slate-500 text-xs rounded-lg">ביטול</button>
                </div>
              </div>
            ) : (
              <><p className="font-bold text-slate-800 text-sm truncate">{cat.name}</p><p className="text-xs text-slate-400 mt-0.5">תקציב: ₪{num(cat.budget).toLocaleString()}</p></>
            )}
          </div>
          {!editingName && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => { setNameDraft({ name: cat.name, budget: String(cat.budget) }); setEditingName(true); }} className="p-1 text-slate-300 hover:text-indigo-500"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
        {!editingName && (
          <>
            <div className="mb-2"><div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} /></div></div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 mb-0.5">בפועל</p>
                {editingSpent ? (
                  <div className="flex items-center gap-1">
                    <input className="w-20 border border-indigo-200 rounded-lg px-2 py-1 text-sm text-left font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" type="number" value={spentDraft} onChange={(e) => setSpentDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commitSpent()} autoFocus />
                    <button onClick={commitSpent} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingSpent(false)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <button onClick={() => { setSpentDraft(String(cat.spent)); setEditingSpent(true); }} className="text-sm font-bold text-slate-700 hover:text-indigo-600">
                    ₪{num(cat.spent).toLocaleString()} <span className="text-indigo-300 text-xs">✏️</span>
                  </button>
                )}
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${badgeCls}`}>{pct.toFixed(0)}%</span>
              <div className="text-left">
                <p className="text-[10px] text-slate-400 mb-0.5">יתרה</p>
                <p className={`text-sm font-bold ${remaining < 0 ? "text-red-500" : "text-emerald-600"}`}>{remaining < 0 ? "-" : ""}₪{Math.abs(remaining).toLocaleString()}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── insights engine (rule-based) ────────────────────────────────────────────

function generateInsights({ salaryNum, totalFixed, actualTotal, remainingActual, remainingAfterExpenses, savingGoal, variableExpenses, store, activeMonth }) {
  const insights = [];
  const totalActual = totalFixed + actualTotal;
  const savingGoalNum = num(savingGoal);

  // נתוני חודשים קודמים
  const prevMonths = Object.keys(store.months)
    .filter((ym) => ym < activeMonth)
    .sort()
    .reverse()
    .slice(0, 3);

  const prevAvgTotal = prevMonths.length > 0
    ? prevMonths.reduce((s, ym) => {
        const mv = (store.months[ym].variableExpenses || []).reduce((a, i) => a + num(i.actual), 0);
        return s + mv;
      }, 0) / prevMonths.length
    : null;

  // ─ תחזית לסוף חודש ─
  if (salaryNum > 0) {
    const pct = salaryNum > 0 ? (totalActual / salaryNum) * 100 : 0;
    if (remainingActual > 0) {
      insights.push({
        id: "forecast-positive",
        type: "forecast",
        priority: pct > 80 ? 1 : 3,
        icon: "trending-up",
        color: pct > 80 ? "amber" : "emerald",
        text: `בקצב הנוכחי תסיים את החודש עם ₪${remainingActual.toLocaleString()} פנויים`,
      });
    } else {
      insights.push({
        id: "forecast-negative",
        type: "forecast",
        priority: 0,
        icon: "alert",
        color: "red",
        text: `ההוצאות עברו את ההכנסה החודש ב-₪${Math.abs(remainingActual).toLocaleString()}`,
      });
    }
  }

  // ─ השוואה לחודשים קודמים ─
  if (prevAvgTotal !== null && actualTotal > 0) {
    const diff = actualTotal - prevAvgTotal;
    const diffPct = Math.abs(Math.round((diff / prevAvgTotal) * 100));
    if (diff > 0 && diffPct > 10) {
      insights.push({
        id: "vs-prev-higher",
        type: "behavior",
        priority: 1,
        icon: "trending-up",
        color: "red",
        text: `ההוצאות המשתנות שלך גבוהות ב-${diffPct}% לעומת הממוצע האחרון`,
      });
    } else if (diff < 0 && diffPct > 10) {
      insights.push({
        id: "vs-prev-lower",
        type: "behavior",
        priority: 2,
        icon: "trending-down",
        color: "emerald",
        text: `הצלחת לצמצם הוצאות ב-${diffPct}% לעומת הממוצע — עבודה יפה!`,
      });
    }
  }

  // ─ קטגוריה הכי יקרה ─
  if (variableExpenses.length > 0) {
    const sorted = [...variableExpenses].sort((a, b) => num(b.actual) - num(a.actual));
    const top = sorted[0];
    if (num(top.actual) > 0) {
      const topPct = actualTotal > 0 ? Math.round((num(top.actual) / actualTotal) * 100) : 0;
      insights.push({
        id: "top-category",
        type: "behavior",
        priority: 2,
        icon: "pie",
        color: "violet",
        text: `${top.category} היא ההוצאה הגבוהה ביותר — ₪${num(top.actual).toLocaleString()} (${topPct}% מסך הוצאות)`,
      });
    }
  }

  // ─ יעד חיסכון ─
  if (savingGoalNum > 0 && salaryNum > 0) {
    if (remainingActual >= savingGoalNum) {
      insights.push({
        id: "goal-ok",
        type: "saving",
        priority: 2,
        icon: "piggy",
        color: "emerald",
        text: `נראה שתעמוד ביעד החיסכון החודשי של ₪${savingGoalNum.toLocaleString()} 🎉`,
      });
    } else if (remainingActual > 0) {
      const gap = savingGoalNum - remainingActual;
      insights.push({
        id: "goal-gap",
        type: "saving",
        priority: 1,
        icon: "target",
        color: "amber",
        text: `חסרים ₪${gap.toLocaleString()} להשגת יעד החיסכון החודשי`,
      });
    }
  }

  // ─ המלצת חיסכון ─
  if (variableExpenses.length > 0 && actualTotal > 0) {
    const sorted = [...variableExpenses].sort((a, b) => num(b.actual) - num(a.actual));
    const top = sorted[0];
    const saving10 = Math.round(num(top.actual) * 0.1);
    if (saving10 > 0) {
      insights.push({
        id: "save-tip",
        type: "saving",
        priority: 3,
        icon: "lightbulb",
        color: "indigo",
        text: `צמצום של 10% בהוצאות ${top.category} יחסוך לך ₪${saving10.toLocaleString()} בחודש`,
      });
    }
  }

  // ─ יתרה פנויה לחיסכון ─
  if (remainingActual > 500 && savingGoalNum === 0) {
    insights.push({
      id: "free-to-save",
      type: "saving",
      priority: 3,
      icon: "piggy",
      color: "emerald",
      text: `נשאר לך ₪${remainingActual.toLocaleString()} פנויים — שקול להעביר חלק לחיסכון`,
    });
  }

  // מיון לפי priority ובחירת 3 ראשונות
  return insights
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

const INSIGHT_STYLES = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-500", text: "text-emerald-800" },
  amber:   { bg: "bg-amber-50",   border: "border-amber-100",   icon: "text-amber-500",   text: "text-amber-800"   },
  red:     { bg: "bg-red-50",     border: "border-red-100",     icon: "text-red-500",     text: "text-red-800"     },
  violet:  { bg: "bg-violet-50",  border: "border-violet-100",  icon: "text-violet-500",  text: "text-violet-800"  },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-100",  icon: "text-indigo-500",  text: "text-indigo-800"  },
};

const InsightIcon = ({ type, cls }) => {
  if (type === "trending-up")   return <TrendingUp className={`w-4 h-4 ${cls}`} />;
  if (type === "trending-down") return <TrendingDown className={`w-4 h-4 ${cls}`} />;
  if (type === "alert")         return <AlertCircle className={`w-4 h-4 ${cls}`} />;
  if (type === "pie")           return <PieChartIcon className={`w-4 h-4 ${cls}`} />;
  if (type === "piggy")         return <PiggyBank className={`w-4 h-4 ${cls}`} />;
  if (type === "target")        return <Target className={`w-4 h-4 ${cls}`} />;
  if (type === "lightbulb")     return <Lightbulb className={`w-4 h-4 ${cls}`} />;
  return <Sparkles className={`w-4 h-4 ${cls}`} />;
};

const AIInsights = ({ salaryNum, totalFixed, actualTotal, remainingActual, remainingAfterExpenses, savingGoal, variableExpenses, store, activeMonth }) => {
  const insights = useMemo(() =>
    generateInsights({ salaryNum, totalFixed, actualTotal, remainingActual, remainingAfterExpenses, savingGoal, variableExpenses, store, activeMonth }),
    [salaryNum, totalFixed, actualTotal, remainingActual, savingGoal, variableExpenses, activeMonth]
  );

  if (insights.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-indigo-50/50 to-white">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          תובנות פיננסיות
        </h3>
        <p className="text-[10px] text-slate-400 mt-0.5">מבוסס על הנתונים שלך</p>
      </div>
      <div className="p-4 space-y-2.5">
        {insights.map((insight) => {
          const style = INSIGHT_STYLES[insight.color] || INSIGHT_STYLES.indigo;
          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-3.5 rounded-xl border ${style.bg} ${style.border} transition-all hover:shadow-sm`}
            >
              <div className={`flex-shrink-0 mt-0.5 ${style.icon}`}>
                <InsightIcon type={insight.icon} cls={style.icon} />
              </div>
              <p className={`text-sm leading-relaxed ${style.text}`}>{insight.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── screen components ────────────────────────────────────────────────────────

// ── HomeScreen ──
const HomeScreen = ({ salaryNum, totalFixed, actualTotal, remainingActual, actualPct, remainingAfterExpenses, remainingAfterGoal, savingGoal, savingGoalPct, savingsPct, categories, variableExpenses, fixedExpenses, isCurrentMonth, activeMonth, currentMonth, editingSalary, salaryDraft, setSalaryDraft, openSalaryEdit, commitSalary, setEditingSalary, editingGoal, goalDraft, setGoalDraft, openGoalEdit, commitGoal, setEditingGoal, setActiveTab }) => {
  const remainColor = (v) => v < 0 ? "text-red-500" : v === 0 ? "text-slate-500" : "text-emerald-600";
  const overBudgetCats = categories.filter((c) => c.spent > c.budget);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-1">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">
            {formatMonthLabel(activeMonth)} {!isCurrentMonth && "· חודש קודם"}
          </p>
          {editingSalary ? (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1">
              <span className="text-xs text-indigo-200">₪</span>
              <input className="w-24 bg-transparent border-0 outline-none text-sm font-bold text-white placeholder-indigo-300" type="number" value={salaryDraft} onChange={(e) => setSalaryDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commitSalary()} autoFocus placeholder="משכורת" />
              <button onClick={commitSalary} className="text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditingSalary(false)} className="text-indigo-300"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={openSalaryEdit} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-1.5 transition-colors">
              <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-xs font-semibold">{salaryNum > 0 ? `₪${salaryNum.toLocaleString()}` : "הגדר משכורת"}</span>
            </button>
          )}
        </div>
        <p className="text-indigo-100 text-sm mb-1">יתרה בפועל החודש</p>
        <h1 className={`text-5xl font-bold mb-4 ${remainingActual < 0 ? "text-red-300" : "text-white"}`}>₪{remainingActual.toLocaleString()}</h1>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-indigo-200"><span>ניצול מהמשכורת</span><span>{actualPct.toFixed(0)}%</span></div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${actualPct > 90 ? "bg-red-400" : actualPct > 70 ? "bg-amber-300" : "bg-emerald-400"}`} style={{ width: `${actualPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-medium mb-1">הוצאות קבועות</p>
          <p className="text-lg font-bold text-slate-800">₪{totalFixed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-medium mb-1">הוצאות בפועל</p>
          <p className="text-lg font-bold text-slate-800">₪{actualTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Target className="w-4 h-4 text-indigo-500" />יעד חיסכון חודשי</h3>
          {editingGoal ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">₪</span>
              <input className="w-24 border border-indigo-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" type="number" value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commitGoal()} autoFocus />
              <button onClick={commitGoal} className="text-emerald-600"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingGoal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={openGoalEdit} className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800">
              {num(savingGoal) > 0 ? `₪${num(savingGoal).toLocaleString()}` : "הגדר"} <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
        {num(savingGoal) > 0 ? (
          <>
            <div className="flex justify-between text-xs text-slate-500 mb-1.5"><span>התקדמות</span><span>{savingGoalPct.toFixed(0)}%</span></div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
              <div style={{ width: `${savingGoalPct}%` }} className={`h-full rounded-full transition-all ${savingGoalPct >= 100 ? "bg-emerald-500" : savingGoalPct >= 60 ? "bg-amber-400" : "bg-red-400"}`} />
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-500">נשאר אחרי יעד חיסכון:</span>
              <span className={`text-sm font-bold ${remainColor(remainingAfterGoal)}`}>₪{remainingAfterGoal.toLocaleString()}</span>
            </div>
            {salaryNum > 0 && <p className="text-[10px] text-slate-400 mt-1">{savingsPct}% מההכנסה לחיסכון</p>}
          </>
        ) : (
          <p className="text-sm text-slate-400 text-center py-2">לחץ "הגדר" להגדרת יעד חיסכון חודשי</p>
        )}
      </div>

      {(overBudgetCats.length > 0 || (num(savingGoal) > 0 && num(savingGoal) > remainingAfterExpenses)) && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-bold text-amber-700 uppercase">התראות</h4>
          {overBudgetCats.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              <span>{overBudgetCats.length} קטגורי{overBudgetCats.length > 1 ? "ות" : "ה"} חרגו מהתקציב</span>
            </div>
          )}
          {num(savingGoal) > 0 && num(savingGoal) > remainingAfterExpenses && (
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span>יעד החיסכון גבוה מהיתרה הפנויה</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setActiveTab("expenses")} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:border-rose-200 transition-colors text-right">
          <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center flex-shrink-0"><ReceiptText className="w-4 h-4 text-rose-500" /></div>
          <div><p className="text-sm font-semibold text-slate-700">הוצאות</p><p className="text-xs text-slate-400">{variableExpenses.length} פריטים</p></div>
        </button>
        <button onClick={() => setActiveTab("budget")} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 hover:border-violet-200 transition-colors text-right">
          <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0"><LayoutList className="w-4 h-4 text-violet-500" /></div>
          <div><p className="text-sm font-semibold text-slate-700">תקציב</p><p className="text-xs text-slate-400">{categories.length} קטגוריות</p></div>
        </button>
      </div>

      {/* AI Insights */}
      <AIInsights
        salaryNum={salaryNum}
        totalFixed={totalFixed}
        actualTotal={actualTotal}
        remainingActual={remainingActual}
        remainingAfterExpenses={remainingAfterExpenses}
        savingGoal={savingGoal}
        variableExpenses={variableExpenses}
        store={store}
        activeMonth={activeMonth}
      />
    </div>
  );
};

// ── BudgetScreen ──
const BudgetScreen = ({ categories, fixedExpenses, editCat, deleteCat, openAddCat, editFixed, deleteFixed, openAddFixed, totalFixed, salaryNum }) => {
  const totalBudget = categories.reduce((s, c) => s + num(c.budget), 0);
  const totalSpent  = categories.reduce((s, c) => s + num(c.spent), 0);

  return (
    <div className="space-y-5">
      {(categories.length > 0 || fixedExpenses.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-medium mb-1">קבועות</p>
            <p className="text-lg font-bold text-slate-800">₪{totalFixed.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-medium mb-1">תקציב</p>
            <p className="text-lg font-bold text-slate-800">₪{totalBudget.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-medium mb-1">נוצל</p>
            <p className={`text-lg font-bold ${totalBudget - totalSpent < 0 ? "text-red-500" : "text-emerald-600"}`}>₪{totalSpent.toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Banknote className="w-4 h-4 text-slate-400" /> הוצאות קבועות</h3>
          <button onClick={openAddFixed} className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> הוסף</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <tbody className="divide-y divide-slate-100">
              {fixedExpenses.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-sm">אין הוצאות קבועות — לחץ + להוספה</td></tr>
              ) : fixedExpenses.map((item) => <FixedExpenseRow key={item.id} item={item} onEdit={editFixed} onDelete={() => deleteFixed(item.id)} />)}
            </tbody>
          </table>
        </div>
        {fixedExpenses.length > 0 && (
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 text-left text-sm font-bold text-slate-700">סה"כ: ₪{totalFixed.toLocaleString()}</div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-violet-50/30 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><LayoutList className="w-4 h-4 text-violet-400" /> קטגוריות תקציב</h3>
          <button onClick={openAddCat} className="flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" /> הוסף</button>
        </div>
        {categories.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-8">אין קטגוריות תקציב — לחץ + להוספה</p>
        ) : (
          <>
            <div className="px-5 py-2.5 bg-slate-50/40 border-b border-slate-100 flex gap-6 text-xs text-slate-500">
              <span>תקציב: <span className="font-semibold text-slate-700">₪{totalBudget.toLocaleString()}</span></span>
              <span>הוצאתי: <span className="font-semibold text-slate-700">₪{totalSpent.toLocaleString()}</span></span>
              <span>נותר: <span className={`font-semibold ${totalBudget - totalSpent < 0 ? "text-red-500" : "text-emerald-600"}`}>₪{(totalBudget - totalSpent).toLocaleString()}</span></span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => <CategoryCard key={cat.id} cat={cat} onEdit={editCat} onDelete={() => deleteCat(cat.id)} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── ExpensesScreen ── (updated with pie chart + description + date)
const ExpensesScreen = ({ variableExpenses, editVariable, deleteVariable, addExpenseToVariable, autoEstimateMap, openAddVar, activeMonth }) => {
  const totalEst = variableExpenses.reduce((s, i) => s + num(i.estimated), 0);
  const totalAct = variableExpenses.reduce((s, i) => s + num(i.actual), 0);
  const diff = totalAct - totalEst;

  const chartData = useMemo(() => {
    const totals = variableExpenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + num(item.actual);
      return acc;
    }, {});
    const totalSum = Object.values(totals).reduce((s, v) => s + v, 0);
    let cumulative = 0;
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([category, value]) => {
        const percent = totalSum > 0 ? (value / totalSum) * 100 : 0;
        const start = cumulative;
        cumulative += percent;
        return { category, value, percent, startPercent: start, color: CATEGORY_COLORS[category] || "#94a3b8" };
      });
  }, [variableExpenses]);

  const getCoords = (pct) => [Math.cos(2 * Math.PI * pct), Math.sin(2 * Math.PI * pct)];

  return (
    <div className="space-y-4">
      {/* סטטיסטיקות */}
      {variableExpenses.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-medium mb-1">בפועל</p>
            <p className="text-lg font-bold text-slate-800">₪{totalAct.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 uppercase font-medium mb-1">פריטים</p>
            <p className="text-lg font-bold text-slate-800">{variableExpenses.length}</p>
          </div>
        </div>
      )}

      {/* גרף עוגה */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-indigo-50/30">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <PieChartIcon className="w-4 h-4 text-indigo-500" /> התפלגות הוצאות
            </h3>
          </div>
          <div className="flex items-center gap-6 px-5 py-5">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg viewBox="-1 -1 2 2" className="w-full h-full -rotate-90">
                {chartData.map((slice, i) => {
                  if (slice.percent >= 99.9) return <circle key={i} r="1" cx="0" cy="0" fill={slice.color} />;
                  const [sx, sy] = getCoords(slice.startPercent / 100);
                  const [ex, ey] = getCoords((slice.startPercent + slice.percent) / 100);
                  return (
                    <path
                      key={i}
                      d={`M ${sx} ${sy} A 1 1 0 ${slice.percent > 50 ? 1 : 0} 1 ${ex} ${ey} L 0 0`}
                      fill={slice.color}
                    />
                  );
                })}
                <circle r="0.58" cx="0" cy="0" fill="white" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] text-slate-400">סה"כ</span>
                <span className="text-xs font-bold text-slate-800">₪{totalAct.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {chartData.map((slice, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{slice.category}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">({Math.round(slice.percent)}%)</span>
                  <span className="text-xs text-slate-500 mr-auto whitespace-nowrap">₪{slice.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* טבלת הוצאות */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-rose-50/20 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-rose-400" /> הוצאות משתנות
            <span className="text-xs font-normal text-slate-400">({formatMonthLabel(activeMonth)})</span>
          </h3>
          <button onClick={openAddVar} className="flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> הוסף
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            {variableExpenses.length > 0 && (
              <thead>
                <tr className="bg-slate-50/50 text-xs text-slate-400 font-medium">
                  <th className="px-4 py-2 text-right">קטגוריה / תיאור</th>
                  <th className="px-3 py-2 text-left">בפועל</th>
                  <th className="px-3 py-2 text-left">הפרש</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-slate-100">
              {variableExpenses.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">אין הוצאות משתנות — לחץ + להוספה</td></tr>
              ) : variableExpenses.map((item) => (
                <VariableExpenseRow
                  key={item.id}
                  item={item}
                  onEdit={editVariable}
                  onDelete={() => deleteVariable(item.id)}
                  onAddExpense={addExpenseToVariable}
                  autoEstimate={autoEstimateMap[item.id] ?? null}
                />
              ))}
            </tbody>
          </table>
        </div>
        {variableExpenses.length > 0 && (
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-700">
            <span>סה"כ בפועל:</span>
            <span className="text-slate-800">₪{totalAct.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── HistoryScreen ──
const HistoryScreen = ({ store, activeMonth, setActiveMonth, currentMonth, sortedMonths, addNewMonth, totalFixed, salaryNum, newMonthModal, setNewMonthModal, newMonthVal, setNewMonthVal, handleReset, exportCSV, salary, fixedExpenses }) => {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
        <div className="flex items-center gap-3 mb-4"><Calendar className="w-4 h-4 text-slate-400" /><span className="text-sm font-semibold text-slate-700">בחר חודש לצפייה</span></div>
        <div className="relative">
          <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="appearance-none w-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm rounded-xl pr-4 pl-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
            {sortedMonths.map((ym) => (<option key={ym} value={ym}>{formatMonthLabel(ym)}{ym === currentMonth ? " (נוכחי)" : ""}</option>))}
          </select>
          <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
        </div>
        <div className="flex gap-2 mt-3">
          {activeMonth === currentMonth ? (
            <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> חודש נוכחי</span>
          ) : (
            <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full"><History className="w-3 h-3" /> מציג חודש קודם</span>
          )}
          <button onClick={() => { setNewMonthVal(currentMonth); setNewMonthModal(true); }} className="flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full transition-colors mr-auto">
            <Plus className="w-3 h-3" /> הוסף חודש
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/30">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-slate-400" /> היסטוריית חודשים</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {sortedMonths.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">אין חודשים קודמים</p>
          ) : sortedMonths.map((ym) => {
            const md = store.months[ym];
            const mVarAct = (md.variableExpenses || []).reduce((s, i) => s + num(i.actual ?? 0), 0);
            const mActual = mVarAct;
            const mRem = salaryNum - (totalFixed + mActual);
            const isActive = ym === activeMonth;
            return (
              <button key={ym} onClick={() => setActiveMonth(ym)} className={`w-full flex items-center px-5 py-4 transition-colors ${isActive ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                <div className="flex-1 text-right">
                  <p className={`font-semibold text-sm ${isActive ? "text-indigo-700" : "text-slate-700"}`}>
                    {formatMonthLabel(ym)}{ym === currentMonth && <span className="mr-2 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">נוכחי</span>}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">הוצאות בפועל: ₪{(totalFixed + mActual).toLocaleString()}</p>
                </div>
                <div className="text-left mr-3">
                  <p className={`text-base font-bold ${mRem >= 0 ? "text-emerald-600" : "text-red-500"}`}>{mRem >= 0 ? "+" : ""}₪{mRem.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">יתרה</p>
                </div>
                <ChevronLeft className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-indigo-400" : "text-slate-300"}`} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <button onClick={() => exportCSV(salary, fixedExpenses, store.months)} className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 py-3 rounded-2xl text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors text-sm font-medium">
          <Download className="w-4 h-4" /> ייצוא כל הנתונים ל-CSV
        </button>
        <button onClick={handleReset} className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs hover:border-red-300 hover:text-red-400 transition-all">איפוס כל הנתונים</button>
      </div>
    </div>
  );
};

// ─── Bottom Navigation ────────────────────────────────────────────────────────

const BottomNav = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "home", label: "בית", icon: Home },
    { id: "budget", label: "תקציב", icon: Wallet },
    { id: "expenses", label: "הוצאות", icon: ReceiptText },
    { id: "history", label: "היסטוריה", icon: Clock },
  ];
  return (
    <div className="fixed bottom-0 right-0 left-0 z-40 bg-white border-t border-slate-100 shadow-lg" dir="rtl">
      <div className="max-w-lg mx-auto px-2 py-2 flex items-center justify-around">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all ${isActive ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}>
              <Icon className={`w-5 h-5 ${isActive ? "stroke-2" : "stroke-1.5"}`} />
              <span className={`text-[10px] font-medium ${isActive ? "text-indigo-600" : "text-slate-400"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [store, setStore] = useState(initStorage);
  const [activeMonth, setActiveMonth] = useState(currentBillingMonth);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }, [store]);

  const currentMonth = currentBillingMonth();
  const isCurrentMonth = activeMonth === currentMonth;
  const isPastMonth = activeMonth < currentMonth;

  const monthData = store.months[activeMonth] || emptyMonth();
  const { salary, fixedExpenses } = store;
  const { variableExpenses, savingGoal, categories } = { variableExpenses: [], savingGoal: "", categories: [], ...monthData };

  const setStore_ = (patch) => setStore((prev) => ({ ...prev, ...patch }));
  const setMonthData = (patch) =>
    setStore((prev) => ({ ...prev, months: { ...prev.months, [activeMonth]: { ...prev.months[activeMonth], ...patch } } }));

  const totalFixed = fixedExpenses.reduce((s, i) => s + num(i.amount), 0);
  const totalVariable = variableExpenses.reduce((s, i) => s + num(i.estimated), 0);
  const totalExpenses = totalFixed + totalVariable;
  const salaryNum = num(salary);

  const actualTotal = useMemo(() => variableExpenses.reduce((s, i) => s + num(i.actual), 0), [variableExpenses]);
  const remainingActual = salaryNum - (totalFixed + actualTotal);
  const remainingAfterExpenses = salaryNum - totalExpenses;
  const remainingAfterGoal = remainingActual - num(savingGoal);
  const savingsPct = salaryNum > 0 ? ((num(savingGoal) / salaryNum) * 100).toFixed(1) : "0";
  const savingGoalPct = num(savingGoal) > 0 ? Math.max(0, Math.min(100, (remainingActual / num(savingGoal)) * 100)) : 0;
  const actualPct = salaryNum > 0 ? Math.min(100, ((totalFixed + actualTotal) / salaryNum) * 100) : 0;

  const autoEstimateMap = useMemo(() => {
    const map = {};
    variableExpenses.forEach((item) => { map[item.id] = calcAutoEstimate(item, store.months, activeMonth); });
    return map;
  }, [variableExpenses, store.months, activeMonth]);

  const sortedMonths = Object.keys(store.months).sort().reverse();

  const addNewMonth = (ym) => {
    if (store.months[ym]) { setActiveMonth(ym); return; }
    const templateVars = variableExpenses.map((item) => {
      const auto = calcAutoEstimate(item, store.months, ym);
      return { id: Date.now() + Math.random(), category: item.category, estimated: auto > 0 ? auto : item.estimated, actual: 0, estimatedManual: false, description: "", date: new Date().toISOString() };
    });
    setStore((prev) => ({ ...prev, months: { ...prev.months, [ym]: { ...emptyMonth(), variableExpenses: templateVars } } }));
    setActiveMonth(ym);
  };

  // salary
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState("");
  const openSalaryEdit = () => { setSalaryDraft(salary); setEditingSalary(true); };
  const commitSalary = () => { setStore_({ salary: parseFloat(salaryDraft) || "" }); setEditingSalary(false); };

  // saving goal
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const openGoalEdit = () => { setGoalDraft(savingGoal); setEditingGoal(true); };
  const commitGoal = () => { setMonthData({ savingGoal: parseFloat(goalDraft) || "" }); setEditingGoal(false); };

  // add fixed
  const [addFixedModal, setAddFixedModal] = useState(false);
  const [addFixedForm, setAddFixedForm] = useState({ category: "", amount: "" });
  const openAddFixed = () => { setAddFixedForm({ category: "", amount: "" }); setAddFixedModal(true); };
  const commitAddFixed = () => {
    if (!addFixedForm.category.trim() || !addFixedForm.amount) return;
    setStore_({ fixedExpenses: [...fixedExpenses, { id: Date.now(), category: addFixedForm.category.trim(), amount: parseFloat(addFixedForm.amount) || 0 }] });
    setAddFixedModal(false);
  };

  // add variable
  const [addVarModal, setAddVarModal] = useState(false);
  const [addVarForm, setAddVarForm] = useState({ category: "", estimated: "", actual: "", description: "" });
  const openAddVar = () => { setAddVarForm({ category: "", estimated: "", actual: "", description: "" }); setAddVarModal(true); };
  const commitAddVar = () => {
    if (!addVarForm.category.trim()) return;
    const draftItem = { category: addVarForm.category, estimatedManual: false };
    const auto = calcAutoEstimate(draftItem, store.months, activeMonth);
    const estimatedVal = addVarForm.estimated ? parseFloat(addVarForm.estimated) : (auto ?? 0);
    setMonthData({
      variableExpenses: [...variableExpenses, {
        id: Date.now(),
        category: addVarForm.category.trim(),
        estimated: estimatedVal,
        actual: parseFloat(addVarForm.actual) || 0,
        estimatedManual: !!addVarForm.estimated,
        description: addVarForm.description || "",
        date: new Date().toISOString(),
      }],
    });
    setAddVarModal(false);
  };

  const editFixed = (u) => setStore_({ fixedExpenses: fixedExpenses.map((i) => (i.id === u.id ? u : i)) });
  const deleteFixed = (id) => setStore_({ fixedExpenses: fixedExpenses.filter((i) => i.id !== id) });
  const editVariable = (u) => setMonthData({ variableExpenses: variableExpenses.map((i) => (i.id === u.id ? u : i)) });
  const deleteVariable = (id) => setMonthData({ variableExpenses: variableExpenses.filter((i) => i.id !== id) });
  const addExpenseToVariable = (id, amount) =>
    setMonthData({ variableExpenses: variableExpenses.map((i) => i.id === id ? { ...i, actual: num(i.actual) + amount } : i) });

  // budget categories
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", budget: "" });
  const openAddCat = () => { setCatForm({ name: "", budget: "" }); setCatModal(true); };
  const commitAddCat = () => {
    if (!catForm.name.trim() || !catForm.budget) return;
    setMonthData({ categories: [...categories, { id: Date.now(), name: catForm.name.trim(), budget: parseFloat(catForm.budget) || 0, spent: 0 }] });
    setCatModal(false);
  };
  const editCat = (u) => setMonthData({ categories: categories.map((c) => (c.id === u.id ? u : c)) });
  const deleteCat = (id) => setMonthData({ categories: categories.filter((c) => c.id !== id) });

  // new month modal
  const [newMonthModal, setNewMonthModal] = useState(false);
  const [newMonthVal, setNewMonthVal] = useState(currentMonth);

  // reset
  const handleReset = () => {
    if (window.confirm("למחוק את כל הנתונים ולהתחיל מחדש?")) {
      setStore({ salary: "", fixedExpenses: [], months: { [currentMonth]: emptyMonth() } });
      setActiveMonth(currentMonth);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const sharedProps = { activeMonth, currentMonth, isCurrentMonth, isPastMonth, salaryNum, totalFixed, actualTotal, remainingActual, actualPct, remainingAfterExpenses, remainingAfterGoal, savingGoal, savingGoalPct, savingsPct, categories, variableExpenses, fixedExpenses, store };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24" dir="rtl">
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">תזרים מזומנים</h1>
            <p className="text-[11px] text-slate-400">{formatMonthLabel(activeMonth)}{!isCurrentMonth && " · היסטוריה"}</p>
          </div>
          <div className="relative">
            <select value={activeMonth} onChange={(e) => setActiveMonth(e.target.value)} className="appearance-none bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium rounded-xl pr-2.5 pl-6 py-1.5 focus:outline-none cursor-pointer">
              {sortedMonths.map((ym) => (<option key={ym} value={ym}>{formatMonthLabel(ym)}{ym === currentMonth ? " ●" : ""}</option>))}
            </select>
            <ChevronDown className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5">
        {activeTab === "home" && (
          <HomeScreen
            {...sharedProps}
            editingSalary={editingSalary} salaryDraft={salaryDraft} setSalaryDraft={setSalaryDraft}
            openSalaryEdit={openSalaryEdit} commitSalary={commitSalary} setEditingSalary={setEditingSalary}
            editingGoal={editingGoal} goalDraft={goalDraft} setGoalDraft={setGoalDraft}
            openGoalEdit={openGoalEdit} commitGoal={commitGoal} setEditingGoal={setEditingGoal}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "budget" && (
          <BudgetScreen
            categories={categories} fixedExpenses={fixedExpenses}
            editCat={editCat} deleteCat={deleteCat} openAddCat={openAddCat}
            editFixed={editFixed} deleteFixed={deleteFixed} openAddFixed={openAddFixed}
            totalFixed={totalFixed} salaryNum={salaryNum}
          />
        )}
        {activeTab === "expenses" && (
          <ExpensesScreen
            variableExpenses={variableExpenses} editVariable={editVariable}
            deleteVariable={deleteVariable} addExpenseToVariable={addExpenseToVariable}
            autoEstimateMap={autoEstimateMap} openAddVar={openAddVar} activeMonth={activeMonth}
          />
        )}
        {activeTab === "history" && (
          <HistoryScreen
            store={store} activeMonth={activeMonth} setActiveMonth={setActiveMonth}
            currentMonth={currentMonth} sortedMonths={sortedMonths} addNewMonth={addNewMonth}
            totalFixed={totalFixed} salaryNum={salaryNum}
            newMonthModal={newMonthModal} setNewMonthModal={setNewMonthModal}
            newMonthVal={newMonthVal} setNewMonthVal={setNewMonthVal}
            handleReset={handleReset} exportCSV={exportCSV} salary={salary} fixedExpenses={fixedExpenses}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modals */}
      {addFixedModal && (
        <Modal title="הוספת הוצאה קבועה" onClose={() => setAddFixedModal(false)}>
          <Field label="שם הקטגוריה"><input className={inputCls} value={addFixedForm.category} onChange={(e) => setAddFixedForm({ ...addFixedForm, category: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commitAddFixed()} placeholder="למשל: שכירות" autoFocus /></Field>
          <Field label="סכום חודשי (₪)"><input className={inputCls} type="number" value={addFixedForm.amount} onChange={(e) => setAddFixedForm({ ...addFixedForm, amount: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commitAddFixed()} placeholder="0" /></Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setAddFixedModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={commitAddFixed} className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700">הוסף</button>
          </div>
        </Modal>
      )}

      {addVarModal && (
        <Modal title="הוספת הוצאה משתנה" onClose={() => setAddVarModal(false)}>
          <Field label="שם הקטגוריה">
            <input className={inputCls} value={addVarForm.category} onChange={(e) => setAddVarForm({ ...addVarForm, category: e.target.value })} placeholder="למשל: מסעדות" autoFocus />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {SYSTEM_CATEGORIES.map((sc) => (
              <button key={sc} onClick={() => setAddVarForm((f) => ({ ...f, category: sc }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${addVarForm.category === sc ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"}`}>
                {sc}
              </button>
            ))}
          </div>
          <Field label="תיאור (אופציונלי)">
            <input className={inputCls} value={addVarForm.description} onChange={(e) => setAddVarForm({ ...addVarForm, description: e.target.value })} placeholder="למשל: קניות בסופר" />
          </Field>
          <Field label="סכום (₪)">
            <input className={inputCls} type="number" value={addVarForm.actual} onChange={(e) => setAddVarForm({ ...addVarForm, actual: e.target.value })} placeholder="0" autoFocus={false} />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setAddVarModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={commitAddVar} className="flex-1 py-2 bg-rose-600 rounded-xl text-sm text-white font-medium hover:bg-rose-700">הוסף</button>
          </div>
        </Modal>
      )}

      {catModal && (
        <Modal title="קטגוריית תקציב חדשה" onClose={() => setCatModal(false)}>
          <Field label="שם הקטגוריה"><input className={inputCls} value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commitAddCat()} placeholder="למשל: בגדים" autoFocus /></Field>
          <Field label="תקציב חודשי (₪)"><input className={inputCls} type="number" value={catForm.budget} onChange={(e) => setCatForm({ ...catForm, budget: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commitAddCat()} placeholder="0" /></Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setCatModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={commitAddCat} className="flex-1 py-2 bg-violet-600 rounded-xl text-sm text-white font-medium hover:bg-violet-700">הוסף</button>
          </div>
        </Modal>
      )}

      {newMonthModal && (
        <Modal title="הוספת חודש" onClose={() => setNewMonthModal(false)}>
          <Field label="בחר חודש"><input className={inputCls} type="month" value={newMonthVal} onChange={(e) => setNewMonthVal(e.target.value)} /></Field>
          <p className="text-xs text-slate-400">הוצאות קבועות יועתקו אוטומטית לחודש החדש.</p>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setNewMonthModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={() => { addNewMonth(newMonthVal); setNewMonthModal(false); }} className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700">צור חודש</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
