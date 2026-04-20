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
} from "lucide-react";

const App = () => {
  const salary = 8500;

  const [fixedExpenses] = useState([
    {
      id: 1,
      category: "שכירות ודיור",
      amount: 1650,
      icon: <Home className="w-5 h-5" />,
      note: "יתרון משמעותי - נמוך מהשוק",
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      id: 2,
      category: "חשבונות (חשמל/מים/ועד)",
      amount: 300,
      icon: <Zap className="w-5 h-5" />,
      note: "ממוצע חודשי מוערך",
      color: "bg-blue-100 text-blue-700",
    },
    {
      id: 3,
      category: 'ביטוח רכב + קופ"ח',
      amount: 318,
      icon: <ShieldCheck className="w-5 h-5" />,
      note: "חובה בריאותית ותחבורתית",
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: 4,
      category: "מכון כושר",
      amount: 169,
      icon: <Dumbbell className="w-5 h-5" />,
      note: "השקעה בבריאות ואיכות חיים",
      color: "bg-orange-100 text-orange-700",
    },
    {
      id: 5,
      category: "החזר מכשיר S26",
      amount: 222,
      icon: <Smartphone className="w-5 h-5" />,
      note: "תשלום קבוע לעוד 12 חודשים",
      color: "bg-slate-100 text-slate-700",
    },
  ]);

  const [estimatedExpenses] = useState([
    {
      id: 6,
      category: "מזון וצריכה (סופר)",
      amount: 1600,
      icon: <ShoppingCart className="w-5 h-5" />,
      note: "מבוסס על ממוצע חודשים קודמים",
      color: "bg-rose-100 text-rose-700",
    },
    {
      id: 7,
      category: "דלק",
      amount: 600,
      icon: <Fuel className="w-5 h-5" />,
      note: "הערכת שימוש חודשית",
      color: "bg-amber-100 text-amber-700",
    },
  ]);

  const totalFixed = useMemo(
    () => fixedExpenses.reduce((sum, item) => sum + item.amount, 0),
    [fixedExpenses]
  );
  const totalEstimated = useMemo(
    () => estimatedExpenses.reduce((sum, item) => sum + item.amount, 0),
    [estimatedExpenses]
  );
  const totalOut = totalFixed + totalEstimated;
  const savings = salary - totalOut;
  const savingsRate = ((savings / salary) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir="rtl">
      {/* Header */}
      <header className="max-w-5xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            ניהול תזרים מזומנים
          </h1>
          <p className="text-slate-500 mt-1">מעקב הוצאות מול הכנסה וחיסכון</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-xl text-emerald-700 shadow-sm">
            <ArrowUpCircle className="w-4 h-4" />
            <span className="font-bold">
              משכורת: ₪{salary.toLocaleString()}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">
                הוצאות קבועות
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                ₪ {totalFixed.toLocaleString()}
              </h2>
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(totalFixed / salary) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 text-xs font-medium uppercase">
                צפי משתנות
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mt-1">
                ₪ {totalEstimated.toLocaleString()}
              </h2>
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full">
                <div
                  className="h-full bg-rose-400 rounded-full"
                  style={{ width: `${(totalEstimated / salary) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-emerald-600 p-5 rounded-2xl shadow-lg text-white">
              <p className="text-emerald-100 text-xs font-medium uppercase">
                חיסכון חודשי צפוי
              </p>
              <h2 className="text-2xl font-bold mt-1">
                ₪ {savings.toLocaleString()}
              </h2>
              <p className="text-xs text-emerald-100 mt-2 font-medium">
                {savingsRate}% מההכנסה
              </p>
            </div>
          </div>

          {/* Fixed Expenses List */}
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
                    <tr
                      key={expense.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${expense.color}`}>
                            {expense.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">
                              {expense.category}
                            </p>
                            <p className="text-xs text-slate-400">
                              {expense.note}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left font-bold text-slate-900">
                        ₪ {expense.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Estimated Expenses List */}
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
                    <tr
                      key={expense.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${expense.color}`}>
                            {expense.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">
                              {expense.category}
                            </p>
                            <p className="text-xs text-slate-400">
                              {expense.note}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left font-bold text-slate-900">
                        ₪ {expense.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-emerald-500" />
              סיכום תקציב
            </h3>

            <div className="space-y-6">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-100">
                      הוצאות סה"כ
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-indigo-600">
                      {((totalOut / salary) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-slate-100">
                  <div
                    style={{ width: `${(totalOut / salary) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  ₪{totalOut.toLocaleString()} מתוך ₪{salary.toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 font-medium">
                    יתרה פנויה:
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    ₪{savings.toLocaleString()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  זהו הסכום שנשאר לך לאחר כל ההוצאות הקבועות והצפויות. ניתן
                  להעביר לחיסכון, השקעות או בלת"מים.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase">
                  מסקנות מהירות
                </h4>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span>שיעור חיסכון מצוין ({savingsRate}%)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                  <span>החזר S26 מסתיים בעוד שנה</span>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium hover:border-indigo-300 hover:text-indigo-500 transition-all flex flex-col items-center gap-1 group">
            <PlusCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span>הוספת יעד חיסכון</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
