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
//     "YYYY-MM": { variableExpenses: [{ id, category, amount }], savingGoal: "" }
//   }
// }

function emptyMonth() {
  return { variableExpenses: [], savingGoal: "" };
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
    // ensure current month exists
    if (!saved.months[current]) {
      saved.months[current] = emptyMonth();
    }
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
  const rows = [["חודש", "קטגוריה", "סכום", "סוג"]];
  const allMonths = Object.keys(months).sort();
  allMonths.forEach((ym) => {
    const label = formatMonthLabel(ym);
    fixedExpenses.forEach((e) => {
      rows.push([label, e.category, num(e.amount), "קבוע"]);
    });
    (months[ym].variableExpenses || []).forEach((e) => {
      rows.push([label, e.category, num(e.amount), "משתנה"]);
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

const ProgressBar = ({ value, max, colorOverride }) => {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  const color = colorOverride
    ? colorOverride
    : pct >= 90
    ? "bg-red-400"
    : pct >= 70
    ? "bg-amber-400"
    : "bg-indigo-500";
  return (
    <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

// inline-editable expense row (same as before, fully preserved)
const ExpenseRow = ({ item, onEdit, onDelete, readOnly }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    category: item.category,
    amount: String(item.amount),
  });

  const commit = () => {
    if (!form.category.trim() || !form.amount) return;
    onEdit({ ...item, category: form.category.trim(), amount: parseFloat(form.amount) || 0 });
    setEditing(false);
  };

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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [store, setStore] = useState(initStorage);
  const [activeMonth, setActiveMonth] = useState(todayMonth);

  // persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  // ── store helpers ──
  const currentMonth = todayMonth();
  const isCurrentMonth = activeMonth === currentMonth;
  const monthData = store.months[activeMonth] || emptyMonth();
  const { salary, fixedExpenses } = store;
  const { variableExpenses, savingGoal } = monthData;

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

  const handleAddNextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    let ny = y, nm = m + 1;
    if (nm > 12) { ny++; nm = 1; }
    const next = `${ny}-${String(nm).padStart(2, "0")}`;
    addNewMonth(next);
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

  // ── add item modal ──
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

  // ── new month modal ──
  const [newMonthModal, setNewMonthModal] = useState(false);
  const [newMonthVal, setNewMonthVal] = useState(currentMonth);

  // ── reset ──
  const handleReset = () => {
    if (window.confirm("למחוק את כל הנתונים ולהתחיל מחדש?")) {
      const fresh = initStorage();
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
          {/* salary badge */}
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

          {/* export CSV */}
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

          {/* Fixed expenses — global, always editable */}
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
                      <ExpenseRow key={item.id} item={item} onEdit={editFixed} onDelete={() => deleteFixed(item.id)} />
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

          {/* Variable expenses — per month */}
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
                <tbody className="divide-y divide-slate-100">
                  {variableExpenses.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">
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
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {variableExpenses.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100 text-left text-sm font-bold text-slate-700">
                סה"כ: ₪{totalVariable.toLocaleString()}
              </div>
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
                    className={`h-full rounded transition-all ${
                      usagePct >= 90 ? "bg-red-400" : usagePct >= 70 ? "bg-amber-400" : "bg-indigo-500"
                    }`}
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

              {/* saving goal — per month */}
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

                {/* saving goal progress bar */}
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
                          className={`h-full rounded transition-all ${
                            savingGoalPct >= 100 ? "bg-emerald-500" : savingGoalPct >= 60 ? "bg-amber-400" : "bg-red-400"
                          }`}
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
                </div>
              )}
            </div>
          </div>

          {/* Month history summary */}
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
                      className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        ym === activeMonth
                          ? "bg-indigo-50 border border-indigo-100 text-indigo-700"
                          : "hover:bg-slate-50 text-slate-600"
                      }`}
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

      {/* ── Add item modal ── */}
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
            ההוצאות הקבועות יועתקו אוטומטית לחודש החדש. ההוצאות המשתנות יתחילו ריקות.
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
