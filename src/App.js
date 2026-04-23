import React, { useState, useEffect } from "react";
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
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "budget-app-v2";

function todayMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

// ─── storage schema ───────────────────────────────────────────────────────────
// {
//   salary: number | "",
//   fixedExpenses: [{ id, category, amount }],
//   months: {
//     "YYYY-MM": {
//       variableExpenses: [{ id, category, amount, actual? }],
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
  const current = todayMonth();
  if (saved) {
    if (!saved.months[current]) {
      saved.months[current] = emptyMonth();
    }
    // backfill categories for older months that lack it
    Object.keys(saved.months).forEach((ym) => {
      if (!saved.months[ym].categories) saved.months[ym].categories = [];
    });
    return saved;
  }
  return {
    salary: "",
    fixedExpenses: [],
    months: { [current]: emptyMonth() },
  };
}

// ─── CSV export (extended with categories + actual) ───────────────────────────

function exportCSV(salary, fixedExpenses, months) {
  const rows = [["חודש", "קטגוריה / שם", "סכום מוערך / תקציב", "בפועל", "סוג"]];
  const allMonths = Object.keys(months).sort();
  allMonths.forEach((ym) => {
    const label = formatMonthLabel(ym);
    fixedExpenses.forEach((e) => {
      rows.push([label, e.category, num(e.amount), "", "קבוע"]);
    });
    (months[ym].variableExpenses || []).forEach((e) => {
      rows.push([label, e.category, num(e.amount), num(e.actual ?? ""), "משתנה"]);
    });
    (months[ym].categories || []).forEach((c) => {
      rows.push([label, c.name, num(c.budget), num(c.spent), "קטגוריה"]);
    });
  });
  const BOM = "\uFEFF";
  const csv = BOM + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `budget-export-${todayMonth()}.csv`;
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

// Generic progress bar — thresholds configurable
const ProgressBar = ({ value, max, thresholds }) => {
  const pct = max === 0 ? 0 : Math.min(120, (value / max) * 100); // allow overflow visual
  const displayPct = Math.min(100, pct);
  const lo = thresholds?.lo ?? 80;
  const hi = thresholds?.hi ?? 100;
  const color = pct > hi ? "bg-red-400" : pct > lo ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${displayPct}%` }}
      />
    </div>
  );
};

// ── Inline-editable expense row — now with optional "actual" column ──
const ExpenseRow = ({ item, onEdit, onDelete, readOnly, showActual }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    category: item.category,
    amount: String(item.amount),
  });
  const [actualDraft, setActualDraft] = useState(String(item.actual ?? ""));
  const [editingActual, setEditingActual] = useState(false);

  const commit = () => {
    if (!form.category.trim() || !form.amount) return;
    onEdit({ ...item, category: form.category.trim(), amount: parseFloat(form.amount) || 0 });
    setEditing(false);
  };

  const commitActual = () => {
    onEdit({ ...item, actual: parseFloat(actualDraft) || 0 });
    setEditingActual(false);
  };

  const diff = showActual && item.actual != null ? num(item.actual) - num(item.amount) : null;
  const diffColor = diff === null ? "" : diff < 0 ? "text-emerald-600" : diff > 0 ? "text-red-500" : "text-slate-400";

  if (editing && !readOnly) {
    return (
      <tr className="bg-indigo-50/40">
        <td className="px-6 py-3">
          <input
            className={inputCls}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            autoFocus
          />
        </td>
        <td className="px-6 py-3">
          <input
            className={`${inputCls} text-left`}
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            placeholder="0"
          />
        </td>
        {showActual && <td className="px-4 py-3" />}
        {showActual && <td className="px-4 py-3" />}
        <td className="px-4 py-3">
          <div className="flex gap-1 justify-end">
            <button onClick={commit} className="p-1 text-emerald-600 hover:text-emerald-700">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <p className="font-semibold text-slate-700 text-sm">{item.category}</p>
      </td>
      <td className="px-6 py-4 text-left font-bold text-slate-900">
        ₪{num(item.amount).toLocaleString()}
      </td>

      {showActual && (
        <td className="px-4 py-4 text-left">
          {editingActual && !readOnly ? (
            <div className="flex items-center gap-1">
              <input
                className="w-20 border border-indigo-200 rounded-lg px-2 py-1 text-sm text-left text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                type="number"
                value={actualDraft}
                onChange={(e) => setActualDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitActual()}
                autoFocus
              />
              <button onClick={commitActual} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setEditingActual(false)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => { if (!readOnly) { setActualDraft(String(item.actual ?? "")); setEditingActual(true); } }}
              className={`text-sm font-medium ${readOnly ? "cursor-default" : "hover:text-indigo-600"} ${item.actual != null ? "text-slate-800" : "text-slate-300"}`}
            >
              {item.actual != null ? `₪${num(item.actual).toLocaleString()}` : (readOnly ? "—" : "+ הזן")}
            </button>
          )}
        </td>
      )}

      {showActual && (
        <td className="px-4 py-4 text-left">
          {diff !== null ? (
            <span className={`text-xs font-semibold ${diffColor}`}>
              {diff === 0 ? "זהה" : diff < 0 ? `↓ ₪${Math.abs(diff).toLocaleString()}` : `↑ ₪${diff.toLocaleString()}`}
            </span>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </td>
      )}

      <td className="px-4 py-4">
        {!readOnly && (
          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditing(true)} className="p-1 text-slate-400 hover:text-indigo-500">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

// ── Budget category card with inline spent editing ──
const CategoryCard = ({ cat, onEdit, onDelete, readOnly }) => {
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

  const commitSpent = () => {
    onEdit({ ...cat, spent: parseFloat(spentDraft) || 0 });
    setEditingSpent(false);
  };

  const commitName = () => {
    if (!nameDraft.name.trim()) return;
    onEdit({ ...cat, name: nameDraft.name.trim(), budget: parseFloat(nameDraft.budget) || 0 });
    setEditingName(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-4 pt-4 pb-3">
        {/* header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {editingName && !readOnly ? (
              <div className="space-y-2">
                <input
                  className={inputCls}
                  value={nameDraft.name}
                  onChange={(e) => setNameDraft({ ...nameDraft, name: e.target.value })}
                  placeholder="שם קטגוריה"
                  autoFocus
                />
                <input
                  className={inputCls}
                  type="number"
                  value={nameDraft.budget}
                  onChange={(e) => setNameDraft({ ...nameDraft, budget: e.target.value })}
                  placeholder="תקציב (₪)"
                />
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
          {!readOnly && !editingName && (
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => { setNameDraft({ name: cat.name, budget: String(cat.budget) }); setEditingName(true); }} className="p-1 text-slate-300 hover:text-indigo-500 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onDelete} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {!editingName && (
          <>
            {/* progress bar */}
            <div className="mb-2">
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>

            {/* stats row */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 mb-0.5">בפועל</p>
                {editingSpent && !readOnly ? (
                  <div className="flex items-center gap-1">
                    <input
                      className="w-20 border border-indigo-200 rounded-lg px-2 py-1 text-sm text-left font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      type="number"
                      value={spentDraft}
                      onChange={(e) => setSpentDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && commitSpent()}
                      autoFocus
                    />
                    <button onClick={commitSpent} className="p-1 text-emerald-600"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingSpent(false)} className="p-1 text-slate-400"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => { if (!readOnly) { setSpentDraft(String(cat.spent)); setEditingSpent(true); } }}
                    className={`text-sm font-bold ${readOnly ? "cursor-default text-slate-700" : "text-slate-700 hover:text-indigo-600"}`}
                  >
                    ₪{num(cat.spent).toLocaleString()}
                    {!readOnly && <span className="text-indigo-300 text-xs mr-1">✏️</span>}
                  </button>
                )}
              </div>

              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${badgeCls}`}>
                {pct.toFixed(0)}%
              </span>

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
  const [activeMonth, setActiveMonth] = useState(todayMonth);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  // ── store helpers ──
  const currentMonth = todayMonth();
  const isCurrentMonth = activeMonth === currentMonth;
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
      months: {
        ...prev.months,
        [activeMonth]: { ...prev.months[activeMonth], ...patch },
      },
    }));

  // ── derived values ──
  const totalFixed = fixedExpenses.reduce((s, i) => s + num(i.amount), 0);
  const totalVariable = variableExpenses.reduce((s, i) => s + num(i.amount), 0);
  const totalExpenses = totalFixed + totalVariable;
  const salaryNum = num(salary);
  const remainingAfterExpenses = salaryNum - totalExpenses;
  const remainingAfterGoal = remainingAfterExpenses - num(savingGoal);
  const usagePct = salaryNum > 0 ? Math.min(100, (totalExpenses / salaryNum) * 100) : 0;
  const savingsPct = salaryNum > 0 ? ((num(savingGoal) / salaryNum) * 100).toFixed(1) : "0";
  const savingGoalPct = num(savingGoal) > 0
    ? Math.min(100, ((salaryNum - totalExpenses) / num(savingGoal)) * 100)
    : 0;

  const remainColor = (v) =>
    v < 0 ? "text-red-500" : v === 0 ? "text-slate-500" : "text-emerald-600";

  // ── month management ──
  const sortedMonths = Object.keys(store.months).sort().reverse();

  const addNewMonth = (ym) => {
    if (store.months[ym]) { setActiveMonth(ym); return; }
    setStore((prev) => ({
      ...prev,
      months: { ...prev.months, [ym]: emptyMonth() },
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

  // ── add expense modal (fixed / variable) ──
  const [addModal, setAddModal] = useState(null);
  const [addForm, setAddForm] = useState({ category: "", amount: "" });

  const openAdd = (list) => { setAddForm({ category: "", amount: "" }); setAddModal({ list }); };

  const commitAdd = () => {
    if (!addForm.category.trim() || !addForm.amount) return;
    const item = { id: Date.now(), category: addForm.category.trim(), amount: parseFloat(addForm.amount) || 0 };
    if (addModal.list === "fixed") {
      setStore_({ fixedExpenses: [...fixedExpenses, item] });
    } else {
      setMonthData({ variableExpenses: [...variableExpenses, item] });
    }
    setAddModal(null);
  };

  const editFixed = (updated) =>
    setStore_({ fixedExpenses: fixedExpenses.map((i) => (i.id === updated.id ? updated : i)) });
  const deleteFixed = (id) =>
    setStore_({ fixedExpenses: fixedExpenses.filter((i) => i.id !== id) });

  const editVariable = (updated) =>
    setMonthData({ variableExpenses: variableExpenses.map((i) => (i.id === updated.id ? updated : i)) });
  const deleteVariable = (id) =>
    setMonthData({ variableExpenses: variableExpenses.filter((i) => i.id !== id) });

  // ── budget categories ──
  const [catModal, setCatModal] = useState(false);
  const [catForm, setCatForm] = useState({ name: "", budget: "" });

  const openAddCat = () => { setCatForm({ name: "", budget: "" }); setCatModal(true); };

  const commitAddCat = () => {
    if (!catForm.name.trim() || !catForm.budget) return;
    const cat = {
      id: Date.now(),
      name: catForm.name.trim(),
      budget: parseFloat(catForm.budget) || 0,
      spent: 0,
    };
    setMonthData({ categories: [...categories, cat] });
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
              <input
                className="w-28 border-0 outline-none text-sm font-bold text-slate-800"
                type="number"
                value={salaryDraft}
                onChange={(e) => setSalaryDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitSalary()}
                autoFocus
              />
              <button onClick={commitSalary} className="text-emerald-600"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingSalary(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button
              onClick={openSalaryEdit}
              className="flex items-center gap-2 bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-xl text-emerald-700 shadow-sm hover:bg-emerald-100 transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span className="font-bold">
                {salaryNum > 0 ? `משכורת: ₪${salaryNum.toLocaleString()}` : "הגדר משכורת ✏️"}
              </span>
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

        {!isCurrentMonth && (
          <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-1 rounded-full">
            <History className="w-3 h-3" />
            צפייה בהיסטוריה
          </span>
        )}
        {isCurrentMonth && (
          <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            חודש נוכחי
          </span>
        )}

        <div className="mr-auto flex gap-2">
          <button
            onClick={() => { setNewMonthVal(currentMonth); setNewMonthModal(true); }}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            הוסף חודש
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">הוצאות קבועות</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">₪{totalFixed.toLocaleString()}</h2>
              <ProgressBar value={totalFixed} max={salaryNum} />
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">הוצאות משתנות</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">₪{totalVariable.toLocaleString()}</h2>
              <ProgressBar value={totalVariable} max={salaryNum} />
            </div>
            <div className="bg-emerald-600 p-5 rounded-2xl shadow-lg text-white">
              <p className="text-emerald-100 text-xs font-medium uppercase">נותר אחרי הוצאות</p>
              <h2 className="text-2xl font-bold mt-1">₪{remainingAfterExpenses.toLocaleString()}</h2>
              <p className="text-xs text-emerald-100 mt-2 font-medium">
                {salaryNum > 0 ? `${(100 - usagePct).toFixed(1)}% מההכנסה` : "—"}
              </p>
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
              <button
                onClick={() => openAdd("fixed")}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
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
                      <ExpenseRow key={item.id} item={item} onEdit={editFixed} onDelete={() => deleteFixed(item.id)} showActual={false} />
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

          {/* Variable expenses — with actual column */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-rose-50/20 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-rose-400" />
                הוצאות משתנות
                <span className="text-xs font-normal text-slate-400">({formatMonthLabel(activeMonth)})</span>
              </h3>
              {isCurrentMonth && (
                <button
                  onClick={() => openAdd("variable")}
                  className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> הוסף
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                {variableExpenses.length > 0 && (
                  <thead>
                    <tr className="bg-slate-50/50 text-xs text-slate-400 font-medium">
                      <th className="px-6 py-2 text-right">קטגוריה</th>
                      <th className="px-6 py-2 text-left">צפי</th>
                      <th className="px-4 py-2 text-left">בפועל</th>
                      <th className="px-4 py-2 text-left">הפרש</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-slate-100">
                  {variableExpenses.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                      {isCurrentMonth ? "אין הוצאות משתנות — לחץ + להוספה" : "לא נרשמו הוצאות משתנות בחודש זה"}
                    </td></tr>
                  ) : (
                    variableExpenses.map((item) => (
                      <ExpenseRow
                        key={item.id}
                        item={item}
                        onEdit={editVariable}
                        onDelete={() => deleteVariable(item.id)}
                        readOnly={!isCurrentMonth}
                        showActual={true}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {variableExpenses.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-700">
                <span>צפי סה"כ: ₪{totalVariable.toLocaleString()}</span>
                {(() => {
                  const totalActual = variableExpenses.reduce((s, i) => s + num(i.actual ?? i.amount), 0);
                  const diff = totalActual - totalVariable;
                  return (
                    <span className={diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-600" : "text-slate-400"}>
                      בפועל: ₪{totalActual.toLocaleString()}
                      {diff !== 0 && <span className="mr-1 text-xs">({diff > 0 ? "+" : ""}₪{diff.toLocaleString()})</span>}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {/* ── Budget Categories ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-violet-50/30 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <LayoutList className="w-4 h-4 text-violet-400" />
                קטגוריות תקציב
                <span className="text-xs font-normal text-slate-400">({formatMonthLabel(activeMonth)})</span>
              </h3>
              {isCurrentMonth && (
                <button
                  onClick={openAddCat}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> הוסף קטגוריה
                </button>
              )}
            </div>

            {categories.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">
                {isCurrentMonth ? "אין קטגוריות תקציב — לחץ + להוספה" : "לא הוגדרו קטגוריות בחודש זה"}
              </p>
            ) : (
              <>
                {/* summary strip */}
                {(() => {
                  const totalBudget = categories.reduce((s, c) => s + num(c.budget), 0);
                  const totalSpent = categories.reduce((s, c) => s + num(c.spent), 0);
                  return (
                    <div className="px-6 py-2.5 bg-slate-50/40 border-b border-slate-100 flex gap-6 text-xs text-slate-500">
                      <span>תקציב כולל: <span className="font-semibold text-slate-700">₪{totalBudget.toLocaleString()}</span></span>
                      <span>הוצאתי: <span className="font-semibold text-slate-700">₪{totalSpent.toLocaleString()}</span></span>
                      <span>נותר: <span className={`font-semibold ${totalBudget - totalSpent < 0 ? "text-red-500" : "text-emerald-600"}`}>₪{(totalBudget - totalSpent).toLocaleString()}</span></span>
                    </div>
                  );
                })()}

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      cat={cat}
                      onEdit={editCat}
                      onDelete={() => deleteCat(cat.id)}
                      readOnly={!isCurrentMonth}
                    />
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
                  <span className="text-xs font-semibold py-1 px-2 rounded-full text-indigo-600 bg-indigo-100 uppercase">ניצול מהכנסה</span>
                  <span className="text-xs font-semibold text-indigo-600">{usagePct.toFixed(0)}%</span>
                </div>
                <div className="overflow-hidden h-2 rounded bg-slate-100">
                  <div
                    style={{ width: `${usagePct}%` }}
                    className={`h-full rounded transition-all ${usagePct >= 90 ? "bg-red-400" : usagePct >= 70 ? "bg-amber-400" : "bg-indigo-500"}`}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  ₪{totalExpenses.toLocaleString()} מתוך {salaryNum > 0 ? `₪${salaryNum.toLocaleString()}` : "—"}
                </p>
              </div>

              {/* remaining after expenses */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-600 font-medium">אחרי הוצאות:</span>
                  <span className={`text-lg font-bold ${remainColor(remainingAfterExpenses)}`}>
                    ₪{remainingAfterExpenses.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">משכורת פחות כל ההוצאות הקבועות והמשתנות</p>
              </div>

              {/* saving goal */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-400" />
                    יעד חיסכון
                  </span>
                  {editingGoal && isCurrentMonth ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">₪</span>
                      <input
                        className="w-24 border border-indigo-200 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        type="number"
                        value={goalDraft}
                        onChange={(e) => setGoalDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && commitGoal()}
                        autoFocus
                      />
                      <button onClick={commitGoal} className="text-emerald-600"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingGoal(false)} className="text-slate-400"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button
                      onClick={isCurrentMonth ? openGoalEdit : undefined}
                      className={`flex items-center gap-1 text-sm font-bold ${isCurrentMonth ? "text-indigo-600 hover:text-indigo-800" : "text-slate-500 cursor-default"}`}
                    >
                      {num(savingGoal) > 0 ? `₪${num(savingGoal).toLocaleString()}` : isCurrentMonth ? "הגדר" : "—"}
                      {isCurrentMonth && <Pencil className="w-3 h-3" />}
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
                        <div
                          style={{ width: `${savingGoalPct}%` }}
                          className={`h-full rounded transition-all ${savingGoalPct >= 100 ? "bg-emerald-500" : savingGoalPct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                      <span className="text-sm text-slate-600 font-medium">אחרי יעד חיסכון:</span>
                      <span className={`text-lg font-bold ${remainColor(remainingAfterGoal)}`}>
                        ₪{remainingAfterGoal.toLocaleString()}
                      </span>
                    </div>
                    {salaryNum > 0 && (
                      <p className="text-[10px] text-slate-400 leading-tight">{savingsPct}% מההכנסה מופנה לחיסכון</p>
                    )}
                  </>
                )}
              </div>

              {/* quick insights */}
              {salaryNum > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">מסקנות מהירות</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${usagePct > 90 ? "bg-red-400" : usagePct > 70 ? "bg-amber-400" : "bg-emerald-400"}`} />
                    <span>
                      {usagePct > 90 ? "הוצאות גבוהות — כדאי לבחון קיצוצים"
                        : usagePct > 70 ? `ניצול ${usagePct.toFixed(0)}% מהמשכורת`
                        : `שיעור חיסכון מצוין (${(100 - usagePct).toFixed(1)}%)`}
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
                  const mVar = (md.variableExpenses || []).reduce((s, i) => s + num(i.amount), 0);
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

      {/* ── Add expense modal (fixed / variable) ── */}
      {addModal && (
        <Modal
          title={addModal.list === "fixed" ? "הוספת הוצאה קבועה" : "הוספת הוצאה משתנה"}
          onClose={() => setAddModal(null)}
        >
          <Field label="שם הקטגוריה">
            <input
              className={inputCls}
              value={addForm.category}
              onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && commitAdd()}
              placeholder="למשל: שכירות"
              autoFocus
            />
          </Field>
          <Field label="סכום חודשי (₪)">
            <input
              className={inputCls}
              type="number"
              value={addForm.amount}
              onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && commitAdd()}
              placeholder="0"
            />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setAddModal(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={commitAdd} className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700">הוסף</button>
          </div>
        </Modal>
      )}

      {/* ── Add budget category modal ── */}
      {catModal && (
        <Modal title="קטגוריית תקציב חדשה" onClose={() => setCatModal(false)}>
          <Field label="שם הקטגוריה">
            <input
              className={inputCls}
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && commitAddCat()}
              placeholder="למשל: מסעדות"
              autoFocus
            />
          </Field>
          <Field label="תקציב חודשי (₪)">
            <input
              className={inputCls}
              type="number"
              value={catForm.budget}
              onChange={(e) => setCatForm({ ...catForm, budget: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && commitAddCat()}
              placeholder="0"
            />
          </Field>
          <p className="text-xs text-slate-400">לאחר ההוספה תוכל לעדכן את הסכום שהוצאת בפועל ישירות מהכרטיס.</p>
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
            <input
              className={inputCls}
              type="month"
              value={newMonthVal}
              onChange={(e) => setNewMonthVal(e.target.value)}
            />
          </Field>
          <p className="text-xs text-slate-400">
            ההוצאות הקבועות יועתקו אוטומטית לחודש החדש. ההוצאות המשתנות וקטגוריות התקציב יתחילו ריקות.
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
