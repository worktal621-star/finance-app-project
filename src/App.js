import React, { useState, useMemo } from "react";
import {
  Wallet,
  Home,
  Zap,
  ShieldCheck,
  Dumbbell,
  Smartphone,
  TrendingDown,
  PieChart as PieChartIcon,
  PlusCircle,
  Calendar,
  ShoppingCart,
  Fuel,
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

const CATEGORY_ICONS = [
  { value: "🍽️", label: "מסעדות / אוכל בחוץ" },
  { value: "🛒", label: "סופר / קניות" },
  { value: "⛽", label: "דלק" },
  { value: "👗", label: "ביגוד" },
  { value: "🎬", label: "בידור" },
  { value: "💊", label: "בריאות / תרופות" },
  { value: "✈️", label: "נסיעות" },
  { value: "📦", label: "כללי" },
];

const ProgressBar = ({ value, max, colorClass }) => {
  const pct = max === 0 ? 0 : Math.min(100, (value / max) * 100);
  const color =
    pct >= 90
      ? "bg-red-400"
      : pct >= 70
      ? "bg-amber-400"
      : "bg-emerald-500";
  return (
    <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

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

const App = () => {
  const salary = 8500;

  const [fixedExpenses] = useState([
    { id: 1, category: "שכירות ודיור", amount: 1650, icon: <Home className="w-5 h-5" />, note: "יתרון משמעותי - נמוך מהשוק", color: "bg-emerald-100 text-emerald-700" },
    { id: 2, category: "חשבונות (חשמל/מים/ועד)", amount: 300, icon: <Zap className="w-5 h-5" />, note: "ממוצע חודשי מוערך", color: "bg-blue-100 text-blue-700" },
    { id: 3, category: 'ביטוח רכב + קופ"ח', amount: 318, icon: <ShieldCheck className="w-5 h-5" />, note: "חובה בריאותית ותחבורתית", color: "bg-purple-100 text-purple-700" },
    { id: 4, category: "מכון כושר", amount: 169, icon: <Dumbbell className="w-5 h-5" />, note: "השקעה בבריאות ואיכות חיים", color: "bg-orange-100 text-orange-700" },
    { id: 5, category: "החזר מכשיר S26", amount: 222, icon: <Smartphone className="w-5 h-5" />, note: "תשלום קבוע לעוד 12 חודשים", color: "bg-slate-100 text-slate-700" },
  ]);

  const [estimatedExpenses] = useState([
    { id: 6, category: "מזון וצריכה (סופר)", amount: 1600, icon: <ShoppingCart className="w-5 h-5" />, note: "מבוסס על ממוצע חודשים קודמים", color: "bg-rose-100 text-rose-700" },
    { id: 7, category: "דלק", amount: 600, icon: <Fuel className="w-5 h-5" />, note: "הערכת שימוש חודשית", color: "bg-amber-100 text-amber-700" },
  ]);

  // --- Budget Categories ---
  const [budgetCats, setBudgetCats] = useState([
    { id: 1, name: "מסעדות / אוכל בחוץ", icon: "🍽️", budget: 800, spent: 0 },
  ]);
  const [catModal, setCatModal] = useState(null); // null | { mode: 'add'|'edit'|'spend', data }
  const [catForm, setCatForm] = useState({ name: "", icon: "📦", budget: "", spent: "" });
  const [spendAmount, setSpendAmount] = useState("");

  const openAddCat = () => {
    setCatForm({ name: "", icon: "📦", budget: "", spent: "" });
    setCatModal({ mode: "add" });
  };
  const openEditCat = (cat) => {
    setCatForm({ name: cat.name, icon: cat.icon, budget: String(cat.budget), spent: String(cat.spent) });
    setCatModal({ mode: "edit", id: cat.id });
  };
  const openSpend = (cat) => {
    setSpendAmount("");
    setCatModal({ mode: "spend", id: cat.id, name: cat.name, current: cat.spent });
  };
  const saveCat = () => {
    const entry = { name: catForm.name.trim(), icon: catForm.icon, budget: parseFloat(catForm.budget) || 0, spent: parseFloat(catForm.spent) || 0 };
    if (!entry.name || !entry.budget) return;
    if (catModal.mode === "add") {
      setBudgetCats((prev) => [...prev, { ...entry, id: Date.now() }]);
    } else {
      setBudgetCats((prev) => prev.map((c) => (c.id === catModal.id ? { ...c, ...entry } : c)));
    }
    setCatModal(null);
  };
  const saveSpend = () => {
    const n = parseFloat(spendAmount);
    if (isNaN(n)) return;
    setBudgetCats((prev) => prev.map((c) => (c.id === catModal.id ? { ...c, spent: Math.max(0, c.spent + n) } : c)));
    setCatModal(null);
  };
  const deleteCat = (id) => setBudgetCats((prev) => prev.filter((c) => c.id !== id));

  // --- Savings Goals ---
  const [goals, setGoals] = useState([]);
  const [goalModal, setGoalModal] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: "", target: "", saved: "", monthly: "" });
  const [addSavedAmount, setAddSavedAmount] = useState("");

  const openAddGoal = () => {
    setGoalForm({ name: "", target: "", saved: "", monthly: "" });
    setGoalModal({ mode: "add" });
  };
  const openEditGoal = (g) => {
    setGoalForm({ name: g.name, target: String(g.target), saved: String(g.saved), monthly: String(g.monthly) });
    setGoalModal({ mode: "edit", id: g.id });
  };
  const openAddSaved = (g) => {
    setAddSavedAmount("");
    setGoalModal({ mode: "addSaved", id: g.id, name: g.name });
  };
  const saveGoal = () => {
    const entry = { name: goalForm.name.trim(), target: parseFloat(goalForm.target) || 0, saved: parseFloat(goalForm.saved) || 0, monthly: parseFloat(goalForm.monthly) || 0 };
    if (!entry.name || !entry.target) return;
    if (goalModal.mode === "add") {
      setGoals((prev) => [...prev, { ...entry, id: Date.now() }]);
    } else {
      setGoals((prev) => prev.map((g) => (g.id === goalModal.id ? { ...g, ...entry } : g)));
    }
    setGoalModal(null);
  };
  const saveAddSaved = () => {
    const n = parseFloat(addSavedAmount);
    if (isNaN(n)) return;
    setGoals((prev) => prev.map((g) => (g.id === goalModal.id ? { ...g, saved: Math.min(g.target, g.saved + n) } : g)));
    setGoalModal(null);
  };
  const deleteGoal = (id) => setGoals((prev) => prev.filter((g) => g.id !== id));

  // --- Totals ---
  const totalFixed = useMemo(() => fixedExpenses.reduce((s, i) => s + i.amount, 0), [fixedExpenses]);
  const totalEstimated = useMemo(() => estimatedExpenses.reduce((s, i) => s + i.amount, 0), [estimatedExpenses]);
  const totalOut = totalFixed + totalEstimated;
  const savings = salary - totalOut;
  const savingsRate = ((savings / salary) * 100).toFixed(1);

  const totalBudget = budgetCats.reduce((s, c) => s + c.budget, 0);
  const totalSpent = budgetCats.reduce((s, c) => s + c.spent, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir="rtl">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ניהול תזרים מזומנים</h1>
          <p className="text-slate-500 mt-1">מעקב הוצאות מול הכנסה וחיסכון</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-xl text-emerald-700 shadow-sm">
            <ArrowUpCircle className="w-4 h-4" />
            <span className="font-bold">משכורת: ₪{salary.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">הוצאות קבועות</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">₪ {totalFixed.toLocaleString()}</h2>
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(totalFixed / salary) * 100}%` }} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">צפי משתנות</p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">₪ {totalEstimated.toLocaleString()}</h2>
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full">
                <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(totalEstimated / salary) * 100}%` }} />
              </div>
            </div>
            <div className="bg-emerald-600 p-5 rounded-2xl shadow-lg text-white">
              <p className="text-emerald-100 text-xs font-medium uppercase">חיסכון חודשי צפוי</p>
              <h2 className="text-2xl font-bold mt-1">₪ {savings.toLocaleString()}</h2>
              <p className="text-xs text-emerald-100 mt-2 font-medium">{savingsRate}% מההכנסה</p>
            </div>
          </div>

          {/* Fixed Expenses */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-slate-400" />
                הוצאות קבועות
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <tbody className="divide-y divide-slate-100">
                  {fixedExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${expense.color}`}>{expense.icon}</div>
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">{expense.category}</p>
                            <p className="text-xs text-slate-400">{expense.note}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left font-bold text-slate-900">₪ {expense.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Estimated Expenses */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-rose-50/20 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-rose-400" />
                צפי הוצאות משתנות
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <tbody className="divide-y divide-slate-100">
                  {estimatedExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${expense.color}`}>{expense.icon}</div>
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">{expense.category}</p>
                            <p className="text-xs text-slate-400">{expense.note}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left font-bold text-slate-900">₪ {expense.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Budget Categories */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-indigo-400" />
                תקציב לפי קטגוריה
              </h3>
              <button
                onClick={openAddCat}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                הוסף קטגוריה
              </button>
            </div>

            {budgetCats.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/40 border-b border-slate-100 flex gap-6 text-xs text-slate-500">
                <span>תקציב כולל: <span className="font-semibold text-slate-700">₪{totalBudget.toLocaleString()}</span></span>
                <span>הוצאתי: <span className="font-semibold text-slate-700">₪{totalSpent.toLocaleString()}</span></span>
                <span>נותר: <span className={`font-semibold ${totalBudget - totalSpent < 0 ? "text-red-500" : "text-emerald-600"}`}>₪{(totalBudget - totalSpent).toLocaleString()}</span></span>
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {budgetCats.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8">אין קטגוריות עדיין. הוסף קטגוריה ראשונה!</p>
              ) : (
                budgetCats.map((cat) => {
                  const pct = cat.budget === 0 ? 0 : Math.min(100, (cat.spent / cat.budget) * 100);
                  const remaining = cat.budget - cat.spent;
                  const badgeColor = pct >= 100 ? "bg-red-100 text-red-600" : pct >= 70 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                  return (
                    <div key={cat.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="text-xl pt-0.5">{cat.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-700 text-sm">{cat.name}</p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                                {pct >= 100 ? "חרגת" : `נותר ₪${remaining.toLocaleString()}`}
                              </span>
                              <button onClick={() => openSpend(cat)} className="p-1 text-slate-400 hover:text-indigo-500 transition-colors" title="עדכן הוצאה">
                                <Plus className="w-4 h-4" />
                              </button>
                              <button onClick={() => openEditCat(cat)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => deleteCat(cat.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <ProgressBar value={cat.spent} max={cat.budget} />
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-slate-400">₪{cat.spent.toLocaleString()} הוצאתי</span>
                            <span className="text-xs text-slate-400">תקציב: ₪{cat.budget.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-emerald-500" />
              סיכום תקציב
            </h3>
            <div className="space-y-6">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-100">הוצאות סה"כ</span>
                  <span className="text-xs font-semibold inline-block text-indigo-600">{((totalOut / salary) * 100).toFixed(0)}%</span>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-100">
                  <div style={{ width: `${(totalOut / salary) * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500" />
                </div>
                <p className="text-xs text-slate-400 mt-2">₪{totalOut.toLocaleString()} מתוך ₪{salary.toLocaleString()}</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 font-medium">יתרה פנויה:</span>
                  <span className="text-lg font-bold text-emerald-600">₪{savings.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">זהו הסכום שנשאר לך לאחר כל ההוצאות הקבועות והצפויות. ניתן להעביר לחיסכון, השקעות או בלת"מים.</p>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase">מסקנות מהירות</h4>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>שיעור חיסכון מצוין ({savingsRate}%)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>החזר S26 מסתיים בעוד שנה</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Goals */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-500" />
                יעדי חיסכון
              </h3>
              <button
                onClick={openAddGoal}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                יעד חדש
              </button>
            </div>

            {goals.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">אין יעדים עדיין</p>
            ) : (
              <div className="space-y-4">
                {goals.map((g) => {
                  const pct = g.target === 0 ? 0 : Math.min(100, (g.saved / g.target) * 100);
                  const remaining = g.target - g.saved;
                  const months = g.monthly > 0 ? Math.ceil(remaining / g.monthly) : null;
                  return (
                    <div key={g.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">{g.name}</p>
                          {months !== null && remaining > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5">עוד ~{months} חודשים בקצב הנוכחי</p>
                          )}
                          {remaining <= 0 && (
                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">יעד הושג!</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openAddSaved(g)} className="p-1 text-slate-400 hover:text-emerald-500 transition-colors" title="הוסף חיסכון">
                            <Plus className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditGoal(g)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteGoal(g.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <ProgressBar value={g.saved} max={g.target} />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-slate-400">₪{g.saved.toLocaleString()} חסכתי</span>
                        <span className="text-xs text-slate-500 font-medium">{pct.toFixed(0)}% · יעד ₪{g.target.toLocaleString()}</span>
                      </div>
                      {g.monthly > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1">חיסכון חודשי: ₪{g.monthly.toLocaleString()}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Category Modal - Add/Edit */}
      {catModal && (catModal.mode === "add" || catModal.mode === "edit") && (
        <Modal title={catModal.mode === "add" ? "קטגוריה חדשה" : "עריכת קטגוריה"} onClose={() => setCatModal(null)}>
          <Field label="שם הקטגוריה">
            <input className={inputCls} value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="למשל: מסעדות" />
          </Field>
          <Field label="אייקון">
            <select className={inputCls} value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}>
              {CATEGORY_ICONS.map((i) => (
                <option key={i.value} value={i.value}>{i.value} {i.label}</option>
              ))}
            </select>
          </Field>
          <Field label="תקציב חודשי (₪)">
            <input className={inputCls} type="number" value={catForm.budget} onChange={(e) => setCatForm({ ...catForm, budget: e.target.value })} placeholder="800" />
          </Field>
          <Field label="הוצאה נוכחית (₪)">
            <input className={inputCls} type="number" value={catForm.spent} onChange={(e) => setCatForm({ ...catForm, spent: e.target.value })} placeholder="0" />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setCatModal(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={saveCat} className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700">שמור</button>
          </div>
        </Modal>
      )}

      {/* Category Modal - Update Spend */}
      {catModal && catModal.mode === "spend" && (
        <Modal title={`עדכון הוצאה — ${catModal.name}`} onClose={() => setCatModal(null)}>
          <p className="text-sm text-slate-500">הוצאה נוכחית: <span className="font-semibold text-slate-700">₪{catModal.current.toLocaleString()}</span></p>
          <Field label="סכום להוספה (₪)">
            <input className={inputCls} type="number" value={spendAmount} onChange={(e) => setSpendAmount(e.target.value)} placeholder="50" autoFocus />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setCatModal(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={saveSpend} className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700">עדכן</button>
          </div>
        </Modal>
      )}

      {/* Goal Modal - Add/Edit */}
      {goalModal && (goalModal.mode === "add" || goalModal.mode === "edit") && (
        <Modal title={goalModal.mode === "add" ? "יעד חיסכון חדש" : "עריכת יעד"} onClose={() => setGoalModal(null)}>
          <Field label="שם היעד">
            <input className={inputCls} value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="למשל: חופשה באירופה" />
          </Field>
          <Field label="סכום יעד (₪)">
            <input className={inputCls} type="number" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: e.target.value })} placeholder="10000" />
          </Field>
          <Field label="חסכתי עד כה (₪)">
            <input className={inputCls} type="number" value={goalForm.saved} onChange={(e) => setGoalForm({ ...goalForm, saved: e.target.value })} placeholder="0" />
          </Field>
          <Field label="חיסכון חודשי מתוכנן (₪)">
            <input className={inputCls} type="number" value={goalForm.monthly} onChange={(e) => setGoalForm({ ...goalForm, monthly: e.target.value })} placeholder="500" />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setGoalModal(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={saveGoal} className="flex-1 py-2 bg-indigo-600 rounded-xl text-sm text-white font-medium hover:bg-indigo-700">שמור</button>
          </div>
        </Modal>
      )}

      {/* Goal Modal - Add Saved Amount */}
      {goalModal && goalModal.mode === "addSaved" && (
        <Modal title={`הוסף חיסכון — ${goalModal.name}`} onClose={() => setGoalModal(null)}>
          <Field label="סכום להוספה (₪)">
            <input className={inputCls} type="number" value={addSavedAmount} onChange={(e) => setAddSavedAmount(e.target.value)} placeholder="500" autoFocus />
          </Field>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setGoalModal(null)} className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50">ביטול</button>
            <button onClick={saveAddSaved} className="flex-1 py-2 bg-emerald-600 rounded-xl text-sm text-white font-medium hover:bg-emerald-700">הוסף</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default App;
