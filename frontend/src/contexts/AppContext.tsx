import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiService from "@/services/api";
import type { User as ApiUser, Transaction as ApiTransaction, Recommendation as ApiRecommendation } from "@/services/api";
import db from "@/services/database";
import { supabase } from "@/lib/supabase";
import { seedUserData } from "@/services/dataSeeder";

export interface User extends ApiUser {
  balance: number;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  time: string;
  date: string;
  description?: string;
}

export interface Recommendation {
  id: string;
  priority: "high" | "medium" | "low" | "High" | "Medium" | "Low" | "Alert" | "Opportunity";
  title: string;
  description: string;
  reason?: string;
  status?: "pending" | "accepted" | "later";
  impact?: number;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  recommendations: Recommendation[];
  updateRecommendationStatus: (id: string, status: "accepted" | "later") => void;
  dailyGoal: number;
  goalProgress: number;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user profile and transactions - using database service (no CORS issues)
  const loadUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userId = localStorage.getItem('user_id');
      if (!userId) {
        throw new Error('No user_id found. Please login again.');
      }

      // Get user data directly from database (Supabase) - no CORS issues
      const userData = await db.users.getMe();

      // Get transactions directly from database (Supabase) - no CORS issues
      const transactionsData = await db.transactions.getAll();

      // Calculate balance from transactions
      const balance = transactionsData.reduce((sum, t) => {
        return sum + (t.transaction_type === "income" ? t.amount : -t.amount);
      }, 0);

      // Get recommendations from database (Supabase) - no CORS issues
      let recommendationsData: any[] = [];
      try {
        recommendationsData = await db.recommendations.getAll();
      } catch (err) {
        console.log("No recommendations yet:", err);
      }

      // Map database fields to frontend interface
      setUser({
        id: userData.user_id,
        email: userData.email || "",
        name: userData.full_name || "User",
        phone: userData.phone_number,
        occupation: userData.occupation,
        created_at: userData.created_at,
        updated_at: userData.created_at, // Database User interface doesn't have updated_at
        balance,
      });

      setTransactions(
        transactionsData.map((t) => ({
          id: t.transaction_id,
          category: t.category || "Other",
          amount: t.amount,
          date: t.transaction_date,
          time: t.transaction_time || new Date().toLocaleTimeString(),
          type: t.transaction_type,
          description: t.description || "",
        }))
      );

      setRecommendations(
        recommendationsData.map((r) => ({
          id: r.recommendation_id || r.id,
          title: r.title,
          description: r.description || "",
          priority: (r.priority?.toLowerCase() || "medium") as Recommendation["priority"],
          reason: r.reasoning || "",
          status: (r.status || "pending") as "pending" | "accepted" | "later",
        }))
      );
    } catch (err) {
      console.error("Error loading user data:", err);
      setError(err instanceof Error ? err.message : "Failed to load user data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auth state is derived from the real Supabase session -- localStorage's
  // 'user_id' is kept only as a mirror (set below) so the rest of
  // database.ts's ~1500 lines of CRUD, which read it directly, keep working
  // unchanged.
  useEffect(() => {
    const syncSession = async (userId: string | undefined) => {
      if (!userId) {
        localStorage.removeItem('user_id');
        setIsAuthenticated(false);
        setUser(null);
        setTransactions([]);
        setRecommendations([]);
        setIsLoading(false);
        return;
      }

      localStorage.setItem('user_id', userId);
      setIsAuthenticated(true);
      try {
        await loadUserData();
      } catch (error) {
        console.error('[AUTH] Failed to load user data for session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session?.user?.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session?.user?.id);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadUserData]);

  // Calculate daily goal and progress
  const dailyGoal = 300;
  const today = new Date().toISOString().split("T")[0];
  const todayTransactions = transactions.filter((t) => t.date === today);
  const todayIncome = todayTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const todayExpense = todayTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const goalProgress = Math.min(
    Math.max(((todayIncome - todayExpense) / dailyGoal) * 100, 0),
    100
  );

  // Add transaction
  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    try {
      setError(null);

      if (!isAuthenticated) {
        throw new Error("Please login to add transactions");
      }

      const newTransaction = await apiService.transactions.addTransaction({
        amount: transaction.amount,
        category: transaction.category,
        description: transaction.description,
        type: transaction.type,
        date: transaction.date,
        time: transaction.time,
      });

      const mappedTransaction: Transaction = {
        id: newTransaction.id,
        category: newTransaction.category,
        amount: newTransaction.amount,
        date: newTransaction.date,
        time: newTransaction.time || transaction.time,
        type: newTransaction.type,
        description: newTransaction.description,
      };

      setTransactions([mappedTransaction, ...transactions]);

      // Recalculate balance
      const newBalance =
        (user?.balance || 0) +
        (transaction.type === "income" ? transaction.amount : -transaction.amount);
      setUser(user ? { ...user, balance: newBalance } : null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to add transaction";
      setError(errorMsg);
      throw err;
    }
  };

  // Update recommendation status
  const updateRecommendationStatus = (id: string, status: "accepted" | "later") => {
    setRecommendations(
      recommendations.map((rec) =>
        rec.id === id ? { ...rec, status } : rec
      )
    );
  };

  // Login. The onAuthStateChange listener (above) picks up the resulting
  // session and calls loadUserData/setIsAuthenticated -- this just has to
  // wait for signInWithPassword to resolve (throwing on bad credentials)
  // and then navigate.
  const login = async (phone_number: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await db.auth.login(phone_number, password);
      navigate("/dashboard");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Signup
  const signup = async (data: any) => {
    try {
      setError(null);
      setIsLoading(true);
      await db.auth.signup(data);
      navigate("/dashboard");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Signup failed";
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    await db.auth.logout();
    apiService.auth.logout();
    navigate("/");
  };

  // Refresh data
  const refreshData = async () => {
    if (isAuthenticated) {
      await loadUserData();
    }
  };

  const value: AppContextType = {
    user,
    setUser,
    transactions,
    addTransaction,
    recommendations,
    updateRecommendationStatus,
    dailyGoal,
    goalProgress,
    isLoading,
    error,
    isAuthenticated,
    login,
    signup,
    logout,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
