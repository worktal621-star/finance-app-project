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
} from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "budget-app-v2";

// קטגוריות מערכת קבועות
const SYSTEM_CATEGORIES = ["מזון", "דלק", "בילויים", "קניות", "בריאות", "תחבורה", "אחר"];

// ─── date helpers ─────────────────────────────────────────────────────────────

// מחזור חיוב: 10 לחודש → 10 לחודש הבא
// אם היום >= 10 → החודש הנוכחי; אם < 10 → החודש הקודם
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

// מחזיר קטגוריית מערכת לפי שם (fallback: "אחר")
function resolveSystemCategory(name) {
  if (!name) return "אחר";
  const lower = name.trim().toLowerCase();
  const match = SYSTEM_CATEGORIES.find((sc) => lower.includes(sc.toLowerCase()));
  return match || "אחר";
}

// מחשב צפי אוטומטי לפי קטגוריית מערכת — ממוצע actual מ-3 חודשים קודמים
// אם item.estimatedManual=true → לא מחשב (המשתמש עקף)
function calcAutoEstimate(item, months, beforeMonth) {
  if (item.estimatedManual) return num(item.estimated);

  const sysCategory = resolveSystemCategory(item.category);

  const sorted = Object.keys(months)
    .filter((ym) => ym < beforeMonth)
    .sort()
    .reverse()
    .slice(0, 3);

  const actuals = sorted
    .flatMap((ym) =>
      (months[ym].variableExpenses || [])
        .filter((e) => resolveSystemCategory(e.category) === sysCategory)
        .map((e) => num(e.actual))
    )
    .filter((v) => v > 0);

  if (actuals.length === 0) return 0;
  return Math.round(actuals.reduce((s, v) => s + v, 0) / actuals.length);
}

// ─── migration ────────────────────────────────────────────────────────────────

function migrateVariableExpense(item) {
  if (item.estimated !== undefined) {
    // backfill estimatedManual if missing
    return { estimatedManual: false, ...item };
  }
  return {
    id: item.id,
    category: item.category,
    estimated: num(item.amount ?? 0),
    actual: num(item.actual ?? 0),
    estimatedManual: false,
  };
}

// ─── storage schema ───────────────────────────────────────────────────────────
// {
//   salary: number | "",
//   fixedExpenses: [{ id, category, amount }],
//   months: {
//     "YYYY-MM": {
//       variableExpenses: [{ id, category, estimated, actual, estimatedManual }],
//       savingGoal: "",
//       categories: [{ id, name, budget, spent }]
//     }
//   }
// }

function emptyMonth() {
  return { variableExpenses: [], savingGoal: "", categories: [] };
}

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function initStorage() {
  const saved = loadStorage();
  const current = currentBillingMonth();
  if (saved) {
    if (!saved.months[current]) saved.months[current] = emptyMonth();
    Object.keys(saved.months).forEach((ym) => {
      if (!saved.months[ym].categories) saved.months[ym].categories = [];
      if (!saved.months[ym].variableExpenses) saved.months[ym].variableExpenses = [];
      saved.months[ym].variableExpenses =
        saved.months[ym].variableExpenses.map(migrateVariableExpense);
    });
    return saved;
  }
  return {
    salary: "",
    fixedExpenses: [],
    months: { [current]: emptyMonth() },
  };
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(salary, fixedExpenses, months) {
  const rows = [["חודש", "קטגוריה", "קטגוריית מערכת", "צפי", "בפועל", "הפרש", "סוג"]];
  Object.keys(months).sort().forEach((ym) => {
    const label = formatMonthLabel(ym);
    fixedExpenses.forEach((e) => {
      rows.push([label, e.category, "", num(e.amount), "", "", "קבוע"]);
    });
    (months[ym].variableExpenses || []).forEach((e) => {
      const est = num(e.estimated);
      const act = num(e.actual);
      rows.push([label, e.category, resolveSystemCategory(e.category), est, act, act - est, "משתנה"]);
    });
    (months[ym].categories || []).forEach((c) => {
      rows.push([label, c.name, "", num(c.budget), num(c.spent), num(c.spent) - num(c.budget), "קטגוריה"]);
    });
  });
  const BOM = "\uFEFF";
  const csv = BOM + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-export-${currentBillingMonth()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── shared UI ────────────────────────────────────────────────────────────────

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
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

const inputCls =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300";

const cellInputCls =
  "w-20 border border-indigo-200 rounded-lg px-2 py-1 text-sm text-left text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300";

const ProgressBar = ({ value, max }) => {
  const pct = max === 0 ? 0 : Math.min(120, (value / max) * 100);
  const displayPct = Math.min(100, pct);
  const color = pct > 100 ? "bg-red-400" : pct > 80 ? "bg-amber-400" : "bg-emerald-500";
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

  if (editing) {
    return (
      <tr className="bg-indigo-50/40">
        <td className="px-6 py-3">
          <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commit()} autoFocus />
        </td>
        <td className="px-6 py-3">
          <input className={`${inputCls} text-left`} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commit()} placeholder="0" />
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1 justify-end">
            <button onClick={commit} className="p-1 text-emerald-600"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditing(false)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4"><p className="font-semibold text-slate-700 text-sm">{item.category}</p></td>
      <td className="px-6 py-4 text-left font-bold text-slate-900">₪{num(item.amount).toLocaleString()}</td>
      <td className="px-4 py-4">
        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-indigo-500"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </td>
    </tr>
  );
};

// ── Variable expense row ──
// item shape: { id, category, estimated, actual, estimatedManual }
// autoEstimate: number | null — חישוב ממוצע 3 חודשים
const VariableExpenseRow = ({ item, onEdit, onDelete, onAddExpense, autoEstimate }) => {
  const [editField, setEditField] = useState(null);
  const [draft, setDraft] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState("");

  const startEdit = (field, currentVal) => {
    setDraft(String(currentVal));
    setEditField(field);
  };

  const commit = () => {
    if (editField === "category") {
      if (!draft.trim()) { setEditField(null); return; }
      onEdit({ ...item, category: draft.trim() });
    } else if (editField === "estimated") {
      // סמן manual override
      onEdit({ ...item, estimated: parseFloat(draft) || 0, estimatedManual: true });
    } else if (editField === "actual") {
      onEdit({ ...item, actual: parseFloat(draft) || 0 });
    }
    setEditField(null);
  };

  // איפוס לצפי אוטומטי
  const resetToAuto = () => {
    onEdit({ ...item, estimated: autoEstimate ?? 0, estimatedManual: false });
  };

  const handleKey = (e) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditField(null);
  };

  const commitExpense = () => {
    const n = parseFloat(expenseDraft);
    if (!isNaN(n) && n !== 0) onAddExpense(item.id, n);
    setExpenseDraft("");
    setAddingExpense(false);
  };

  const diff = num(item.actual) - num(item.estimated);
  const diffColor = diff < 0 ? "text-emerald-600" : diff > 0 ? "text-red-500" : "text-slate-400";
  const diffLabel = diff === 0 ? "זהה" : diff < 0 ? `↓ ₪${Math.abs(diff).toLocaleString()}` : `↑ ₪${diff.toLocaleString()}`;

  const sysCategory = resolveSystemCategory(item.category);
  const isManual = !!item.estimatedManual;

  // generic editable cell (used for category name & actual)
  const EditableCell = ({ field, value, isText = false }) => {
    if (editField === field) {
      return (
        <div className="flex items-center gap-1">
          <input
            className={cellInputCls + (isText ? " w-28" : "")}
            type={isText ? "text" : "number"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            autoFocus
          />
          <button onClick={commit} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditField(null)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
        </div>
      );
    }
    return (
      <button
        onClick={() => startEdit(field, value)}
        className="text-sm font-medium text-right w-full hover:text-indigo-600 text-slate-700"
      >
        {isText ? value : `₪${num(value).toLocaleString()}`}
      </button>
    );
  };

  return (
    <>
      <tr className="hover:bg-slate-50/50 transition-colors group">

        {/* קטגוריה + תגית מערכת */}
        <td className="px-6 py-3">
          <EditableCell field="category" value={item.category} isText />
          <span className="text-[10px] text-slate-400 mt-0.5 block">{sysCategory}</span>
        </td>

        {/* צפי + כפתור איפוס לאוטומטי */}
        <td className="px-4 py-3 text-left">
          <div className="flex items-center gap-1">
            <div className="flex-1">
              {editField === "estimated" ? (
                <div className="flex items-center gap-1">
                  <input
                    className={cellInputCls}
                    type="number"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKey}
                    autoFocus
                  />
                  <button onClick={commit} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditField(null)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit("estimated", item.estimated)}
                  className="text-sm font-medium text-slate-700 hover:text-indigo-600 w-full text-left"
                  title={isManual ? "ידני — לחץ לעריכה" : "אוטומטי — לחץ לעריכה"}
                >
                  ₪{num(item.estimated).toLocaleString()}
                  {isManual && <span className="mr-1 text-[9px] text-indigo-400">ידני</span>}
                </button>
              )}
              {!isManual && autoEstimate !== null && autoEstimate > 0 && (
                <p className="text-[9px] text-slate-400 mt-0.5">ממוצע ₪{autoEstimate.toLocaleString()}</p>
              )}
              {!isManual && (autoEstimate === null || autoEstimate === 0) && (
                <p className="text-[9px] text-slate-400 mt-0.5">מחושב לפי ממוצע 3 חודשים</p>
              )}
            </div>
            {/* כפתור איפוס לצפי אוטומטי — מוצג רק כשהמשתמש עקף ידנית */}
            {isManual && (
              <button
                onClick={resetToAuto}
                title="איפוס לצפי אוטומטי"
                className="flex-shrink-0 p-1 text-slate-300 hover:text-indigo-500 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </td>

        {/* בפועל + כפתור הוסף הוצאה */}
        <td className="px-4 py-3 text-left">
          <div className="flex items-center gap-1.5">
            <EditableCell field="actual" value={item.actual} />
            <button
              onClick={() => { setAddingExpense((v) => !v); setExpenseDraft(""); }}
              title="הוסף הוצאה"
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                addingExpense
                  ? "bg-rose-500 text-white"
                  : "bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-500"
              }`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </td>

        {/* הפרש */}
        <td className="px-4 py-3 text-left">
          <span className={`text-xs font-semibold ${diffColor}`}>{diffLabel}</span>
        </td>

        {/* actions */}
        <td className="px-4 py-3">
          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* שורת הוספת הוצאה בודדת */}
      {addingExpense && (
        <tr className="bg-rose-50/50 border-t border-rose-100">
          <td className="px-6 py-2 text-xs text-slate-500 text-right">
            הוסף ל<span className="font-semibold text-slate-700">{item.category}</span>:
          </td>
          <td className="px-4 py-2 text-xs text-slate-400">
            סה"כ: ₪{num(item.actual).toLocaleString()}
          </td>
          <td className="px-4 py-2" colSpan={2}>
            <div className="flex items-center gap-2">
              <input
                className="w-24 border border-rose-200 rounded-lg px-2 py-1 text-sm text-left text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-300"
                type="number"
                placeholder="₪ סכום"
                value={expenseDraft}
                onChange={(e) => setExpenseDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitExpense();
                  if (e.key === "Escape") setAddingExpense(false);
                }}
                autoFocus
              />
              <button onClick={commitExpense} className="p-1 text-emerald-600 hover:text-emerald-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setAddingExpense(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </td>
          <td />
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
  const badgeCls = pct > 100
    ? "bg-red-50 text-red-600 border-red-100"
    : pct > 80
    ? "bg-amber-50 text-amber-700 border-amber-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

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
              <>
                <p className="font-bold text-slate-800 text-sm truncate">{cat.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">תקציב: ₪{num(cat.budget).toLocaleString()}</p>
              </>
            )}
          </div>
          {!editingName && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => { setNameDraft({ name: cat.name, budget: String(cat.budget) }); setEditingName(true); }} className="p-1 text-slate-300 hover:text-indigo-500 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={onDelete} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>

        {!editingName && (
          <>
            <div className="mb-2">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            </div>
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
                <p className={`text-sm font-bold ${remaining < 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {remaining < 0 ? "-" : ""}₪{Math.abs(remaining).toLocaleString()}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [store, setStore] = useState(initStorage);
  const [activeMonth, setActiveMonth] = useState(currentBillingMonth);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  // ── store helpers ──
  const currentMonth = currentBillingMonth();
  const isCurrentMonth = activeMonth === currentMonth;
  const isPastMonth = activeMonth < currentMonth;

  const monthData = store.months[activeMonth] || emptyMonth();
  const { salary, fixedExpenses } = store;
  const { variableExpenses, savingGoal, categories } = {
    variableExpenses: [],
    savingGoal: "",
    categories: [],
    ...monthData,
  };

  const setStore_ = (patch) => setStore((prev) => ({ ...prev, ...patch }));

  const setMonthData = (patch) =>
    setStore((prev) => ({
      ...prev,
      months: { ...prev.months, [activeMonth]: { ...prev.months[activeMonth], ...patch } },
    }));

  // ── derived values ──
  const totalFixed = fixedExpenses.reduce((s, i) => s + num(i.amount), 0);
  const totalVariable = variableExpenses.reduce((s, i) => s + num(i.estimated), 0);
  const totalExpenses = totalFixed + totalVariable;
  const salaryNum = num(salary);
  const remainingAfterExpenses = salaryNum - totalExpenses;
  const remainingAfterGoal = remainingAfterExpenses - num(savingGoal);
  const usagePct = salaryNum > 0 ? Math.min(100, (totalExpenses / salaryNum) * 100) : 0;
  const savingsPct = salaryNum > 0 ? ((num(savingGoal) / salaryNum) * 100).toFixed(1) : "0";
  const savingGoalPct = num(savingGoal) > 0
    ? Math.min(100, ((salaryNum - totalExpenses) / num(savingGoal)) * 100)
    : 0;

  // actual = variable.actual + categories.spent
  const actualTotal = useMemo(() => {
    const varActual = variableExpenses.reduce((s, i) => s + num(i.actual), 0);
    const catSpent  = categories.reduce((s, c) => s + num(c.spent), 0);
    return varActual + catSpent;
  }, [variableExpenses, categories]);

  const remainingActual = salaryNum - (totalFixed + actualTotal);
  const actualPct = salaryNum > 0 ? Math.min(100, ((totalFixed + actualTotal) / salaryNum) * 100) : 0;

  const remainColor = (v) => v < 0 ? "text-red-500" : v === 0 ? "text-slate-500" : "text-emerald-600";

  // ── auto-estimate map per variable expense item ──
  const autoEstimateMap = useMemo(() => {
    const map = {};
    variableExpenses.forEach((item) => {
      map[item.id] = calcAutoEstimate(item, store.months, activeMonth);
    });
    return map;
  }, [variableExpenses, store.months, activeMonth]);

  // ── month management ──
  const sortedMonths = Object.keys(store.months).sort().reverse();

  const addNewMonth = (ym) => {
    if (store.months[ym]) { setActiveMonth(ym); return; }

    // העתק קטגוריות משתנות עם צפי אוטומטי מהיסטוריה
    const templateVars = variableExpenses.map((item) => {
      const auto = calcAutoEstimate(item, store.months, ym);
      return {
        id: Date.now() + Math.random(),
        category: item.category,
        estimated: auto > 0 ? auto : item.estimated,
        actual: 0,
        estimatedManual: false,
      };
    });

    setStore((prev) => ({
      ...prev,
      months: { ...prev.months, [ym]: { ...emptyMonth(), variableExpenses: templateVars } },
    }));
    setActiveMonth(ym);
  };

  // ── salary inline edit ──
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState("");
  const openSalaryEdit = () => { setSalaryDraft(salary); setEditingSalary(true); };
  const commitSalary = () => { setStore_({ salary: parseFloat(salaryDraft) || "" }); setEditingSalary(false); };

  // ── saving goal inline edit ──
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const openGoalEdit = () => { setGoalDraft(savingGoal); setEditingGoal(true); };
  const commitGoal = () => { setMonthData({ savingGoal: parseFloat(goalDraft) || "" }); setEditingGoal(false); };

  // ── add fixed expense modal ──
  const [addFixedModal, setAddFixedModal] = useState(false);
  const [addFixedForm, setAddFixedForm] = useState({ category: "", amount: "" });
  const openAddFixed = () => { setAddFixedForm({ category: "", amount: "" }); setAddFixedModal(true); };
  const commitAddFixed = () => {
    if (!addFixedForm.category.trim() || !addFixedForm.amount) return;
    setStore_({ fixedExpenses: [...fixedExpenses, { id: Date.now(), category: addFixedForm.category.trim(), amount: parseFloat(addFixedForm.amount) || 0 }] });
    setAddFixedModal(false);
  };

  // ── add variable expense modal ──
  const [addVarModal, setAddVarModal] = useState(false);
  const [addVarForm, setAddVarForm] = useState({ category: "", estimated: "", actual: "" });
  const openAddVar = () => { setAddVarForm({ category: "", estimated: "", actual: "" }); setAddVarModal(true); };
  const commitAddVar = () => {
    if (!addVarForm.category.trim()) return;
    const draftItem = { category: addVarForm.category, estimatedManual: false };
    const auto = calcAutoEstimate(draftItem, store.months, activeMonth);
    const estimatedVal = addVarForm.estimated ? parseFloat(addVarForm.estimated) : (auto ?? 0);
    const isManual = !!addVarForm.estimated;
    setMonthData({
      variableExpenses: [...variableExpenses, {
        id: Date.now(),
        category: addVarForm.category.trim(),
        estimated: estimatedVal,
        actual: parseFloat(addVarForm.actual) || 0,
        estimatedManual: isManual,
      }],
    });
    setAddVarModal(false);
  };

  const editFixed = (updated) =>
    setStore_({ fixedExpenses: fixedExpenses.map((i) => (i.id === updated.id ? updated : i)) });
  const deleteFixed = (id) =>
    setStore_({ fixedExpenses: fixedExpenses.filter((i) => i.id !== id) });

  const editVariable = (updated) =>
    setMonthData({ variableExpenses: variableExpenses.map((i) => (i.id === updated.id ? updated : i)) });
  const deleteVariable = (id) =>
    setMonthData({ variableExpenses: variableExpenses.filter((i) => i.id !== id) });
  const addExpenseToVariable = (id, amount) =>
    setMonthData({
      variableExpenses: variableExpenses.map((i) =>
        i.id === id ? { ...i, actual: num(i.actual) + amount } : i
      ),
    });

  // ── budget categories ──
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", budget: "" });
  const openAddCat = () => { setCatForm({ name: "", budget: "" }); setCatModal(true); };
  const commitAddCat = () => {
    if (!catForm.name.trim() || !catForm.budget) return;
    setMonthData({ categories: [...categories, { id: Date.now(), name: catForm.name.trim(), budget: parseFloat(catForm.budget) || 0, spent: 0 }] });
    setCatModal(false);
  };
  const editCat = (updated) =>
    setMonthData({ categories: categories.map((c) => (c.id === updated.id ? updated : c)) });
  const deleteCat = (id) =>
    setMonthData({ categories: categories.filter((c) => c.id !== id) });

  // ── new month modal ──
  const [newMonthModal, setNewMonthModal] = useState(false);
  const [newMonthVal, setNewMonthVal] = useState(currentMonth);

  // ── reset ──
  const handleReset = () => {
    if (window.confirm("למחוק את כל הנתונים ולהתחיל מחדש?")) {
      setStore({ salary: "", fixedExpenses: [], months: { [currentMonth]: emptyMonth() } });
      setActiveMonth(currentMonth);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir="rtl">

      {/* ── Header ── */}
      <header className="max-w-5xl mx-auto mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ניהול תזרים מזומנים</h1>
          <p className="text-slate-500 mt-1">מעקב הוצאות מול הכנסה וחיסכון</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {editingSalary ? (
            <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-xl px-3 py-2 shadow-sm">
              <span className="text-sm text-slate-500">משכורת: ₪</span>
              <input className="w-28 border-0 outline-none text-sm font-bold text-slate-800" type="number" value={salaryDraft} onChange={(e) => setSalaryDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commitSalary()} autoFocus />
              <button onClick={commitSalary} className="text-emerald-600"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingSalary(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={openSalaryEdit} className="flex items-center gap-2 bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-xl text-emerald-700 shadow-sm hover:bg-emerald-100 transition-colors">
              <ArrowUpCircle className="w-4 h-4" />
              <span className="font-bold">{salaryNum > 0 ? `משכורת: ₪${salaryNum.toLocaleString()}` : "הגדר משכורת ✏️"}</span>
            </button>
          )}

          <button
            onClick={() => exportCSV(salary, fixedExpenses, store.months)}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            ייצוא CSV
          </button>
        </div>
      </header>

      {/* ── Month bar ── */}
      <div className="max-w-5xl mx-auto mb-6 bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span className="text-sm font-medium text-slate-600 flex-shrink-0">חודש:</span>

        <div className="relative flex-shrink-0">
          <select
            value={activeMonth}
            onChange={(e) => setActiveMonth(e.target.value)}
            className="appearance-none bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm rounded-xl pr-3 pl-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
          >
            {sortedMonths.map((ym) => (
              <option key={ym} value={ym}>
                {formatMonthLabel(ym)}{ym === currentMonth ? " (נוכחי)" : ""}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
        </div>

        {isCurrentMonth && (
          <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> חודש נוכחי
          </span>
        )}
        {isPastMonth && (
          <span className="flex items-center gap-1 text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full">
            <History className="w-3 h-3" /> מציג חודש קודם
          </span>
        )}

        <div className="mr-auto">
          <button
            onClick={() => { setNewMonthVal(currentMonth); setNewMonthModal(true); }}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> הוסף חודש
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">הוצאות קבועות</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">₪{totalFixed.toLocaleString()}</h2>
              <div className="mt-2"><ProgressBar value={totalFixed} max={salaryNum} /></div>
              {salaryNum > 0 && <p className="text-[10px] text-slate-400 mt-1.5">{((totalFixed / salaryNum) * 100).toFixed(1)}% מההכנסה</p>}
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">צפי משתנות</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">₪{totalVariable.toLocaleString()}</h2>
              <div className="mt-2"><ProgressBar value={totalVariable} max={salaryNum} /></div>
              <p className="text-[10px] text-slate-400 mt-1.5">נתון ייחוס בלבד</p>
            </div>

            <div className="bg-indigo-700 p-5 rounded-2xl shadow-lg text-white">
              <p className="text-indigo-200 text-xs font-medium uppercase">הוצאות בפועל</p>
              <h2 className="text-2xl font-bold mt-1">₪{actualTotal.toLocaleString()}</h2>
              <div className="mt-2 h-1.5 w-full bg-indigo-500/50 rounded-full overflow-hidden">
                <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${actualPct}%` }} />
              </div>
              <p className="text-[10px] text-indigo-200 mt-1.5">{salaryNum > 0 ? `${actualPct.toFixed(1)}% מההכנסה` : "—"}</p>
            </div>

            <div className="bg-emerald-600 p-5 rounded-2xl shadow-lg text-white">
              <p className="text-emerald-100 text-xs font-medium uppercase">יתרה בפועל</p>
              <h2 className="text-2xl font-bold mt-1">₪{remainingActual.toLocaleString()}</h2>
              <div className="mt-2 h-1.5 w-full bg-emerald-500/50 rounded-full overflow-hidden">
                <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${salaryNum > 0 ? Math.min(100, Math.max(0, (remainingActual / salaryNum) * 100)) : 0}%` }} />
              </div>
              <p className="text-xs text-emerald-100 mt-1.5 font-medium">{salaryNum > 0 ? `${(100 - actualPct).toFixed(1)}% מההכנסה` : "—"}</p>
            </div>
          </div>

          {/* Fixed expenses */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-slate-400" />
                הוצאות קבועות
                <span className="text-xs font-normal text-slate-400">(גלובלי — כל החודשים)</span>
              </h3>
              <button onClick={openAddFixed} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> הוסף
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <tbody className="divide-y divide-slate-100">
                  {fixedExpenses.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">אין הוצאות קבועות — לחץ + להוספה</td></tr>
                  ) : (
                    fixedExpenses.map((item) => (
                      <FixedExpenseRow key={item.id} item={item} onEdit={editFixed} onDelete={() => deleteFixed(item.id)} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {fixedExpenses.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100 text-left text-sm font-bold text-slate-700">
                סה"כ: ₪{totalFixed.toLocaleString()}
              </div>
            )}
          </div>

          {/* Variable expenses */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-rose-50/20 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-rose-400" />
                הוצאות משתנות
                <span className="text-xs font-normal text-slate-400">({formatMonthLabel(activeMonth)})</span>
              </h3>
              <button onClick={openAddVar} className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> הוסף
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                {variableExpenses.length > 0 && (
                  <thead>
                    <tr className="bg-slate-50/50 text-xs text-slate-400 font-medium">
                      <th className="px-6 py-2 text-right">קטגוריה</th>
                      <th className="px-4 py-2 text-left">צפי</th>
                      <th className="px-4 py-2 text-left">בפועל</th>
                      <th className="px-4 py-2 text-left">הפרש</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-slate-100">
                  {variableExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">אין הוצאות משתנות — לחץ + להוספה</td></tr>
                  ) : (
                    variableExpenses.map((item) => (
                      <VariableExpenseRow
                        key={item.id}
                        item={item}
                        onEdit={editVariable}
                        onDelete={() => deleteVariable(item.id)}
                        onAddExpense={addExpenseToVariable}
                        autoEstimate={autoEstimateMap[item.id] ?? null}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {variableExpenses.length > 0 && (() => {
              const totalEst = variableExpenses.reduce((s, i) => s + num(i.estimated), 0);
              const totalAct = variableExpenses.reduce((s, i) => s + num(i.actual), 0);
              const diff = totalAct - totalEst;
              return (
                <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-700">
                  <span>צפי סה"כ: ₪{totalEst.toLocaleString()}</span>
                  <span className={diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-600" : "text-slate-400"}>
                    בפועל: ₪{totalAct.toLocaleString()}
                    {diff !== 0 && <span className="mr-1 font-normal text-xs">({diff > 0 ? "+" : ""}₪{diff.toLocaleString()})</span>}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Budget Categories */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-violet-50/30 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <LayoutList className="w-4 h-4 text-violet-400" />
                קטגוריות תקציב
                <span className="text-xs font-normal text-slate-400">({formatMonthLabel(activeMonth)})</span>
              </h3>
              <button onClick={openAddCat} className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" /> הוסף קטגוריה
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">אין קטגוריות תקציב — לחץ + להוספה</p>
            ) : (
              <>
                {(() => {
                  const totalBudget = categories.reduce((s, c) => s + num(c.budget), 0);
                  const totalSpent  = categories.reduce((s, c) => s + num(c.spent), 0);
                  return (
                    <div className="px-6 py-2.5 bg-slate-50/40 border-b border-slate-100 flex gap-6 text-xs text-slate-500">
                      <span>תקציב: <span className="font-semibold text-slate-700">₪{totalBudget.toLocaleString()}</span></span>
                      <span>הוצאתי: <span className="font-semibold text-slate-700">₪{totalSpent.toLocaleString()}</span></span>
                      <span>נותר: <span className={`font-semibold ${totalBudget - totalSpent < 0 ? "text-red-500" : "text-emerald-600"}`}>₪{(totalBudget - totalSpent).toLocaleString()}</span></span>
                    </div>
                  );
                })()}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <CategoryCard key={cat.id} cat={cat} onEdit={editCat} onDelete={() => deleteCat(cat.id)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-5 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-emerald-500" />
              סיכום תקציב
            </h3>

            <div className="space-y-5">

              {/* usage bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold py-1 px-2 rounded-full text-indigo-600 bg-indigo-100 uppercase">ניצול בפועל</span>
                  <span className="text-xs font-semibold text-indigo-600">{actualPct.toFixed(0)}%</span>
                </div>
                <div className="overflow-hidden h-2 rounded bg-slate-100">
                  <div style={{ width: `${actualPct}%` }} className={`h-full rounded transition-all ${actualPct >= 90 ? "bg-red-400" : actualPct >= 70 ? "bg-amber-400" : "bg-indigo-500"}`} />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  ₪{(totalFixed + actualTotal).toLocaleString()} מתוך {salaryNum > 0 ? `₪${salaryNum.toLocaleString()}` : "—"}
                </p>
              </div>

              {/* remaining */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">לפי צפי:</span>
                  <span className={`text-sm font-semibold ${remainColor(remainingAfterExpenses)}`}>₪{remainingAfterExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 font-medium">בפועל:</span>
                  <span className={`text-lg font-bold ${remainColor(remainingActual)}`}>₪{remainingActual.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1 border-t border-slate-200">
                  משכורת פחות הוצאות קבועות + בפועל
                </p>
              </div>

              {/* saving goal */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-400" />
                    יעד חיסכון
                  </span>
                  {editingGoal ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">₪</span>
                      <input className="w-24 border border-indigo-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300" type="number" value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && commitGoal()} autoFocus />
                      <button onClick={commitGoal} className="text-emerald-600"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingGoal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button onClick={openGoalEdit} className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800">
                      {num(savingGoal) > 0 ? `₪${num(savingGoal).toLocaleString()}` : "הגדר"}
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {num(savingGoal) > 0 && (
                  <>
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>התקדמות לעמידה ביעד</span>
                        <span>{savingGoalPct.toFixed(0)}%</span>
                      </div>
                      <div className="overflow-hidden h-2 rounded bg-slate-100">
                        <div style={{ width: `${savingGoalPct}%` }} className={`h-full rounded transition-all ${savingGoalPct >= 100 ? "bg-emerald-500" : savingGoalPct >= 60 ? "bg-amber-400" : "bg-red-400"}`} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-sm text-slate-600 font-medium">אחרי יעד חיסכון:</span>
                      <span className={`text-lg font-bold ${remainColor(remainingAfterGoal)}`}>₪{remainingAfterGoal.toLocaleString()}</span>
                    </div>
                    {salaryNum > 0 && <p className="text-[10px] text-slate-400 leading-tight">{savingsPct}% מההכנסה מופנה לחיסכון</p>}
                  </>
                )}
              </div>

              {/* quick insights */}
              {salaryNum > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">מסקנות מהירות</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${actualPct > 90 ? "bg-red-400" : actualPct > 70 ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <span>
                      {actualPct > 90 ? "הוצאות בפועל גבוהות — כדאי לבחון קיצוצים"
                        : actualPct > 70 ? `ניצול בפועל ${actualPct.toFixed(0)}% מהמשכורת`
                        : `שיעור חיסכון מצוין (${(100 - actualPct).toFixed(1)}%)`}
                    </span>
                  </div>
                  {num(savingGoal) > 0 && num(savingGoal) > remainingAfterExpenses && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span>יעד החיסכון גבוה מהיתרה הפנויה</span>
                    </div>
                  )}
                  {remainingAfterGoal > 0 && num(savingGoal) > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      <span>₪{remainingAfterGoal.toLocaleString()} פנויים לשיקול דעתך</span>
                    </div>
                  )}
                  {categories.length > 0 && (() => {
                    const overBudget = categories.filter((c) => c.spent > c.budget);
                    return overBudget.length > 0 ? (
                      <div className="flex items-center gap-2 text-sm text-red-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        <span>{overBudget.length} קטגורי{overBudget.length > 1 ? "ות" : "ה"} חרגו מהתקציב</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Month history */}
          {sortedMonths.length > 1 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                <History className="w-4 h-4 text-slate-400" />
                היסטוריית חודשים
              </h3>
              <div className="space-y-2">
                {sortedMonths.map((ym) => {
                  const md = store.months[ym];
                  const mVar = (md.variableExpenses || []).reduce((s, i) => s + num(i.estimated ?? 0), 0);
                  const mTotal = totalFixed + mVar;
                  const mRem = salaryNum - mTotal;
                  return (
                    <button
                      key={ym}
                      onClick={() => setActiveMonth(ym)}
                      className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm transition-colors ${ym === activeMonth ? "bg-indigo-50 border border-indigo-100 text-indigo-700" : "hover:bg-slate-50 text-slate-600"}`}
                    >
                      <span className="font-medium">
                        {formatMonthLabel(ym)}
                        {ym === currentMonth && <span className="mr-1 text-[10px] text-emerald-500">●</span>}
                      </span>
                      <span className={`font-bold text-xs ${mRem >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {mRem >= 0 ? "+" : ""}₪{mRem.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* reset */}
          <button
            onClick={handleReset}
            className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs hover:border-red-300 hover:text-red-400 transition-all"
          >
            איפוס כל הנתונים
          </button>
        </div>
      </main>

      {/* ── Add fixed expense modal ── */}
      {addFixedModal && (
        <Modal title="הוספת הוצאה קבועה" onClose={() => setAddFixedModal(false)}>
          <Field label="שם הקטגוריה">
            <input className={inputCls} value={addFixedForm.category} onChange={(e) => setAddFixedForm({ ...addFixedForm, category: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commitAddFixed()} placeholder="למשל: שכירות" autoFocus />
          </Field>
          <Field label="סכום חודשי (₪)">
            <input className={inputCls} type="number" value={addFixedForm.amount} onChange={(e) => setAddFixedForm({ ...addFixedForm, amount: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commitAddFixed()} placeholder="0" />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setAddFixedModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={commitAddFixed} className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700">הוסף</button>
          </div>
        </Modal>
      )}

      {/* ── Add variable expense modal ── */}
      {addVarModal && (
        <Modal title="הוספת הוצאה משתנה" onClose={() => setAddVarModal(false)}>
          <Field label="שם הקטגוריה">
            <input
              className={inputCls}
              value={addVarForm.category}
              onChange={(e) => setAddVarForm({ ...addVarForm, category: e.target.value })}
              placeholder="למשל: מסעדות"
              autoFocus
            />
          </Field>
          {/* כפתורי קטגוריות מערכת לבחירה מהירה */}
          <div className="flex flex-wrap gap-1.5">
            {SYSTEM_CATEGORIES.map((sc) => (
              <button
                key={sc}
                onClick={() => setAddVarForm((f) => ({ ...f, category: sc }))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  addVarForm.category === sc
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
          <Field label="צפי חודשי (₪) — ריק = אוטומטי לפי היסטוריה">
            <input className={inputCls} type="number" value={addVarForm.estimated} onChange={(e) => setAddVarForm({ ...addVarForm, estimated: e.target.value })} placeholder="מחושב אוטומטית" />
          </Field>
          <Field label="בפועל עד כה (₪)">
            <input className={inputCls} type="number" value={addVarForm.actual} onChange={(e) => setAddVarForm({ ...addVarForm, actual: e.target.value })} placeholder="0" />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setAddVarModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={commitAddVar} className="flex-1 py-2 bg-rose-600 rounded-xl text-sm text-white font-medium hover:bg-rose-700">הוסף</button>
          </div>
        </Modal>
      )}

      {/* ── Add budget category modal ── */}
      {catModal && (
        <Modal title="קטגוריית תקציב חדשה" onClose={() => setCatModal(false)}>
          <Field label="שם הקטגוריה">
            <input className={inputCls} value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commitAddCat()} placeholder="למשל: בגדים" autoFocus />
          </Field>
          <Field label="תקציב חודשי (₪)">
            <input className={inputCls} type="number" value={catForm.budget} onChange={(e) => setCatForm({ ...catForm, budget: e.target.value })} onKeyDown={(e) => e.key === "Enter" && commitAddCat()} placeholder="0" />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setCatModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={commitAddCat} className="flex-1 py-2 bg-violet-600 rounded-xl text-sm text-white font-medium hover:bg-violet-700">הוסף</button>
          </div>
        </Modal>
      )}

      {/* ── New month modal ── */}
      {newMonthModal && (
        <Modal title="הוספת חודש" onClose={() => setNewMonthModal(false)}>
          <Field label="בחר חודש">
            <input className={inputCls} type="month" value={newMonthVal} onChange={(e) => setNewMonthVal(e.target.value)} />
          </Field>
          <p className="text-xs text-slate-400">
            הוצאות קבועות יועתקו אוטומטית. הצפי המשתנה יחושב לפי ממוצע 3 חודשים קודמים בכל קטגוריה.
          </p>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setNewMonthModal(false)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button
              onClick={() => { addNewMonth(newMonthVal); setNewMonthModal(false); }}
              className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700"
            >
              צור חודש
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
