import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Home } from "lucide-react";
import { format, subDays } from "date-fns";
import { motion } from "framer-motion";
import db from "@/services/database";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import PageIntro from "@/components/PageIntro";
import HelpTooltip from "@/components/HelpTooltip";

const Stats = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  // Separate date range for income vs expense chart (7 days)
  const [incomeExpenseDateRange, setIncomeExpenseDateRange] = useState({
    from: subDays(new Date(), 6), // Last 7 days (including today)
    to: new Date(),
  });
  const [stats, setStats] = useState({
    total_income: 0,
    total_expense: 0,
    net_savings: 0,
    expense_by_category: [] as any[],
    income_vs_expense: [] as any[],
    income_trend: [] as any[],
    emergency_fund: { current: 0, target: 0, percentage: 0, months_covered: 0 },
  });

  useEffect(() => {
    loadStats();
  }, [dateRange, groupBy, incomeExpenseDateRange]);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const transactions = await db.transactions.getAll({
        date_start: format(dateRange.from, "yyyy-MM-dd"),
        date_end: format(dateRange.to, "yyyy-MM-dd"),
      });

      // Calculate summary
      const income = transactions
        .filter((t) => t.transaction_type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = transactions
        .filter((t) => t.transaction_type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Expense by category
      const categoryMap = new Map<string, number>();
      transactions
        .filter((t) => t.transaction_type === "expense" && t.category)
        .forEach((t) => {
          const current = categoryMap.get(t.category) || 0;
          categoryMap.set(t.category, current + Number(t.amount));
        });
      const expenseByCategory = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / expense) * 100,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Income vs Expense by day (for 7-day chart)
      const incomeExpenseTransactions = await db.transactions.getAll({
        date_start: format(incomeExpenseDateRange.from, "yyyy-MM-dd"),
        date_end: format(incomeExpenseDateRange.to, "yyyy-MM-dd"),
      });
      
      const dayMap = new Map<string, { income: number; expense: number }>();
      incomeExpenseTransactions.forEach((t) => {
        const date = t.transaction_date;
        if (!dayMap.has(date)) {
          dayMap.set(date, { income: 0, expense: 0 });
        }
        const day = dayMap.get(date)!;
        if (t.transaction_type === "income") {
          day.income += Number(t.amount);
        } else {
          day.expense += Number(t.amount);
        }
      });
      
      // Fill in missing days to show all 7 days
      const allDays: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(incomeExpenseDateRange.from);
        date.setDate(date.getDate() + i);
        allDays.push(format(date, "yyyy-MM-dd"));
      }
      
      const incomeVsExpense = allDays.map((dateStr) => {
        const dayData = dayMap.get(dateStr) || { income: 0, expense: 0 };
        return {
          date: format(new Date(dateStr), "MMM dd"),
          income: dayData.income,
          expense: dayData.expense,
        };
      });

      // Income trend
      const incomeByDay = transactions
        .filter((t) => t.transaction_type === "income")
        .reduce((map, t) => {
          const date = t.transaction_date;
          map.set(date, (map.get(date) || 0) + Number(t.amount));
          return map;
        }, new Map<string, number>());
      const incomeTrend = Array.from(incomeByDay.entries())
        .map(([date, amount]) => ({
          date: format(new Date(date), "MMM dd"),
          amount,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Emergency fund (from profile)
      let emergencyFund = { current: 0, target: 0, percentage: 0, months_covered: 0 };
      try {
        const profile = await db.users.getProfile();
        if (profile) {
          emergencyFund = {
            current: Number(profile.current_emergency_fund) || 0,
            target: Number(profile.emergency_fund_target) || 0,
            percentage: profile.emergency_fund_target
              ? (Number(profile.current_emergency_fund) / Number(profile.emergency_fund_target)) * 100
              : 0,
            months_covered: profile.monthly_expenses_avg
              ? Number(profile.current_emergency_fund) / Number(profile.monthly_expenses_avg)
              : 0,
          };
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }

      setStats({
        total_income: income,
        total_expense: expense,
        net_savings: income - expense,
        expense_by_category: expenseByCategory,
        income_vs_expense: incomeVsExpense,
        income_trend: incomeTrend,
        emergency_fund: emergencyFund,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/dashboard")} title="Back to Home">
          <Home className="w-4 h-4" />
        </Button>
          <div>
            <h1 className="text-3xl font-bold">Statistics</h1>
          <p className="text-muted-foreground">Analytics and insights</p>
        </div>
          </div>

      <PageIntro
        title="What is this page?"
        description="Here you see patterns in your money: when you earn more, where you spend more, and how your money moves over time."
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full md:w-[250px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{
                  from: dateRange.from,
                  to: dateRange.to,
                }}
                onSelect={(range) => {
                  setDateRange({
                    from: range?.from || dateRange.from,
                    to: range?.to || dateRange.to,
                  });
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

        {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Income</p>
          <p className="text-3xl font-bold text-green-600">
            ₹{stats.total_income.toLocaleString("en-IN")}
          </p>
            </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600">
            ₹{stats.total_expense.toLocaleString("en-IN")}
          </p>
            </Card>
            <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Net Savings</p>
          <p className="text-3xl font-bold">
            ₹{stats.net_savings.toLocaleString("en-IN")}
          </p>
            </Card>
            <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
          <p className="text-3xl font-bold">
            ₹{(stats.total_income - stats.total_expense).toLocaleString("en-IN")}
          </p>
            </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Expenses by Category</h3>
          {stats.expense_by_category.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                  data={stats.expense_by_category}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                  >
                  {stats.expense_by_category.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No expense data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Income vs Expenses</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-[13px]">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {format(incomeExpenseDateRange.from, "MMM dd")} - {format(incomeExpenseDateRange.to, "MMM dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={incomeExpenseDateRange.from}
                  selected={{
                    from: incomeExpenseDateRange.from,
                    to: incomeExpenseDateRange.to,
                  }}
                  onSelect={(range) => {
                    if (range?.from) {
                      // Always set to exactly 7 days from selected start date
                      const startDate = range.from;
                      const endDate = new Date(startDate);
                      endDate.setDate(endDate.getDate() + 6); // 6 days after = 7 days total
                      
                      // Don't allow future dates
                      const today = new Date();
                      today.setHours(23, 59, 59, 999);
                      if (endDate > today) {
                        endDate.setTime(today.getTime());
                        // Adjust start date backwards if needed to maintain 7 days
                        const adjustedStart = new Date(endDate);
                        adjustedStart.setDate(adjustedStart.getDate() - 6);
                        setIncomeExpenseDateRange({
                          from: adjustedStart,
                          to: endDate,
                        });
                      } else {
                        setIncomeExpenseDateRange({
                          from: startDate,
                          to: endDate,
                        });
                      }
                    }
                  }}
                  numberOfMonths={1}
                  disabled={(date) => {
                    // Disable dates that would result in more than 7 days
                    const today = new Date();
                    today.setHours(23, 59, 59, 999);
                    return date > today;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          {stats.income_vs_expense.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.income_vs_expense}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                <Legend />
                <Bar dataKey="income" fill="#10B981" name="Income" />
                <Bar dataKey="expense" fill="#EF4444" name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available
            </div>
          )}
            </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Income Trend</h3>
          {stats.income_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.income_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`} />
                <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No income data available
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Emergency Fund Progress</h3>
          <div className="space-y-4">
                  <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Current</span>
                <span className="text-sm font-semibold">
                  ₹{stats.emergency_fund.current.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(stats.emergency_fund.percentage, 100)}%` } as React.CSSProperties}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">Target</span>
                <span className="text-xs font-semibold">
                  ₹{stats.emergency_fund.target.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">Months Covered</p>
              <p className="text-2xl font-bold">
                {stats.emergency_fund.months_covered.toFixed(1)} months
              </p>
                    </div>
                  </div>
            </Card>
      </div>
    </div>
  );
};

export default Stats;
