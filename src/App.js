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
} from "lucide-react";

// ─── storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "budget-app";

const defaultState = {
  salary: "",
  fixedExpenses: [],
  variableExpenses: [],
  monthlySavingGoal: "",
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ─── shared UI components ─────────────────────────────────────────────────────

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

const ProgressBar = ({ value, max }) => {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  const color =
    pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-indigo-500";
  return (
    <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

// inline-editable expense row
const ExpenseRow = ({ item, onEdit, onDelete }) => {
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

  if (editing) {
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
        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-slate-400 hover:text-indigo-500"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState(loadState);

  // persist every change to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const set = (patch) => setState((prev) => ({ ...prev, ...patch }));

  const { salary, fixedExpenses, variableExpenses, monthlySavingGoal } = state;

  // ── derived values ──
  const totalFixed = fixedExpenses.reduce((s, i) => s + num(i.amount), 0);
  const totalVariable = variableExpenses.reduce((s, i) => s + num(i.amount), 0);
  const totalExpenses = totalFixed + totalVariable;
  const salaryNum = num(salary);
  const remainingAfterExpenses = salaryNum - totalExpenses;
  const remainingAfterGoal = remainingAfterExpenses - num(monthlySavingGoal);
  const usagePct = salaryNum > 0 ? Math.min(100, (totalExpenses / salaryNum) * 100) : 0;
  const savingsPct =
    salaryNum > 0 ? ((num(monthlySavingGoal) / salaryNum) * 100).toFixed(1) : "0";

  const remainColor = (v) =>
    v < 0 ? "text-red-500" : v === 0 ? "text-slate-500" : "text-emerald-600";

  // ── salary inline edit ──
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState("");
  const openSalaryEdit = () => { setSalaryDraft(salary); setEditingSalary(true); };
  const commitSalary = () => { set({ salary: parseFloat(salaryDraft) || "" }); setEditingSalary(false); };

  // ── saving goal inline edit ──
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const openGoalEdit = () => { setGoalDraft(monthlySavingGoal); setEditingGoal(true); };
  const commitGoal = () => { set({ monthlySavingGoal: parseFloat(goalDraft) || "" }); setEditingGoal(false); };

  // ── add item modal ──
  const [addModal, setAddModal] = useState(null); // { list: 'fixed'|'variable' }
  const [addForm, setAddForm] = useState({ category: "", amount: "" });

  const openAdd = (list) => { setAddForm({ category: "", amount: "" }); setAddModal({ list }); };

  const commitAdd = () => {
    if (!addForm.category.trim() || !addForm.amount) return;
    const item = {
      id: Date.now(),
      category: addForm.category.trim(),
      amount: parseFloat(addForm.amount) || 0,
    };
    const key = addModal.list === "fixed" ? "fixedExpenses" : "variableExpenses";
    set({ [key]: [...state[key], item] });
    setAddModal(null);
  };

  const editItem = (list, updated) => {
    const key = list === "fixed" ? "fixedExpenses" : "variableExpenses";
    set({ [key]: state[key].map((i) => (i.id === updated.id ? updated : i)) });
  };

  const deleteItem = (list, id) => {
    const key = list === "fixed" ? "fixedExpenses" : "variableExpenses";
    set({ [key]: state[key].filter((i) => i.id !== id) });
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir="rtl">

      {/* ── Header ── */}
      <header className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            ניהול תזרים מזומנים
          </h1>
          <p className="text-slate-500 mt-1">מעקב הוצאות מול הכנסה וחיסכון</p>
        </div>

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
            <button onClick={commitSalary} className="text-emerald-600">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditingSalary(false)} className="text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={openSalaryEdit}
            className="flex items-center gap-2 bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-xl text-emerald-700 shadow-sm hover:bg-emerald-100 transition-colors"
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span className="font-bold">
              {salaryNum > 0
                ? `משכורת: ₪${salaryNum.toLocaleString()}`
                : "הגדר משכורת ✏️"}
            </span>
          </button>
        )}
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">הוצאות קבועות</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                ₪{totalFixed.toLocaleString()}
              </h2>
              <ProgressBar value={totalFixed} max={salaryNum} />
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">הוצאות משתנות</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                ₪{totalVariable.toLocaleString()}
              </h2>
              <ProgressBar value={totalVariable} max={salaryNum} />
            </div>

            <div className="bg-emerald-600 p-5 rounded-2xl shadow-lg text-white">
              <p className="text-emerald-100 text-xs font-medium uppercase">נותר אחרי הוצאות</p>
              <h2 className="text-2xl font-bold mt-1">
                ₪{remainingAfterExpenses.toLocaleString()}
              </h2>
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
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">
                        אין הוצאות קבועות עדיין — לחץ + להוספה
                      </td>
                    </tr>
                  ) : (
                    fixedExpenses.map((item) => (
                      <ExpenseRow
                        key={item.id}
                        item={item}
                        onEdit={(u) => editItem("fixed", u)}
                        onDelete={() => deleteItem("fixed", item.id)}
                      />
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
                הוצאות משתנות (ממוצע חודשי)
              </h3>
              <button
                onClick={() => openAdd("variable")}
                className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> הוסף
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <tbody className="divide-y divide-slate-100">
                  {variableExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">
                        אין הוצאות משתנות עדיין — לחץ + להוספה
                      </td>
                    </tr>
                  ) : (
                    variableExpenses.map((item) => (
                      <ExpenseRow
                        key={item.id}
                        item={item}
                        onEdit={(u) => editItem("variable", u)}
                        onDelete={() => deleteItem("variable", item.id)}
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
                  <span className="text-xs font-semibold py-1 px-2 rounded-full text-indigo-600 bg-indigo-100 uppercase">
                    ניצול מהכנסה
                  </span>
                  <span className="text-xs font-semibold text-indigo-600">
                    {usagePct.toFixed(0)}%
                  </span>
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
                  ₪{totalExpenses.toLocaleString()} מתוך{" "}
                  {salaryNum > 0 ? `₪${salaryNum.toLocaleString()}` : "—"}
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
                <p className="text-[10px] text-slate-400 leading-tight">
                  משכורת פחות כל ההוצאות הקבועות והמשתנות
                </p>
              </div>

              {/* monthly saving goal */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo-400" />
                    יעד חיסכון חודשי
                  </span>

                  {editingGoal ? (
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
                      <button onClick={commitGoal} className="text-emerald-600">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingGoal(false)} className="text-slate-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={openGoalEdit}
                      className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-bold"
                    >
                      {num(monthlySavingGoal) > 0
                        ? `₪${num(monthlySavingGoal).toLocaleString()}`
                        : "הגדר"}
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {num(monthlySavingGoal) > 0 && (
                  <>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-sm text-slate-600 font-medium">אחרי יעד חיסכון:</span>
                      <span className={`text-lg font-bold ${remainColor(remainingAfterGoal)}`}>
                        ₪{remainingAfterGoal.toLocaleString()}
                      </span>
                    </div>
                    {salaryNum > 0 && (
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {savingsPct}% מההכנסה מופנה לחיסכון
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* quick insights */}
              {salaryNum > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">מסקנות מהירות</h4>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        usagePct > 90 ? "bg-red-400" : usagePct > 70 ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                    />
                    <span>
                      {usagePct > 90
                        ? "הוצאות גבוהות — כדאי לבחון קיצוצים"
                        : usagePct > 70
                        ? `ניצול ${usagePct.toFixed(0)}% מהמשכורת`
                        : `שיעור חיסכון מצוין (${(100 - usagePct).toFixed(1)}%)`}
                    </span>
                  </div>
                  {num(monthlySavingGoal) > 0 && num(monthlySavingGoal) > remainingAfterExpenses && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span>יעד החיסכון גבוה מהיתרה הפנויה</span>
                    </div>
                  )}
                  {remainingAfterGoal > 0 && num(monthlySavingGoal) > 0 && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      <span>₪{remainingAfterGoal.toLocaleString()} פנויים לשיקול דעתך</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* reset button */}
          <button
            onClick={() => {
              if (window.confirm("למחוק את כל הנתונים ולהתחיל מחדש?")) {
                setState(defaultState);
                localStorage.removeItem(STORAGE_KEY);
              }
            }}
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
              placeholder='למשל: שכירות'
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
            <button
              onClick={() => setAddModal(null)}
              className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50"
            >
              ביטול
            </button>
            <button
              onClick={commitAdd}
              className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700"
            >
              הוסף
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
