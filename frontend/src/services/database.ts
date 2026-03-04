/**
 * Database Service Layer
 * Direct Supabase database access - fetches data directly from database
 */

import { supabase } from "@/lib/supabase";

// ============================================================================
// TYPES (Matching Database Schema)
// ============================================================================

export interface User {
  user_id: string;
  phone_number: string;
  email?: string;
  full_name: string;
  occupation?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  date_of_birth?: string;
  preferred_language: string;
  is_active: boolean;
  kyc_verified: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

export interface UserProfile {
  profile_id: string;
  user_id: string;
  monthly_income_min: number;
  monthly_income_max: number;
  monthly_expenses_avg: number;
  emergency_fund_target: number;
  current_emergency_fund: number;
  risk_tolerance: 'low' | 'moderate' | 'high';
  financial_goals: Record<string, any>;
  income_sources: Record<string, any>;
  debt_obligations: Record<string, any>;
  dependents: number;
  created_at: string;
}

export interface Transaction {
  transaction_id: string;
  user_id: string;
  transaction_date: string;
  transaction_time?: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  category?: string;
  subcategory?: string;
  description?: string;
  payment_method?: string;
  merchant_name?: string;
  location?: string;
  source?: string;
  account_id?: string;
  input_method?: string;
  verified: boolean;
  confidence_score?: number;
  is_recurring: boolean;
  recurring_frequency?: string;
  tags?: string[];
  created_at: string;
}

export interface Recommendation {
  recommendation_id: string;
  user_id: string;
  recommendation_type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning?: string;
  action_items?: string[];
  target_amount?: number;
  target_date?: string;
  confidence_score?: number;
  success_probability?: number;
  agent_source?: string;
  status: 'pending' | 'accepted' | 'actioned' | 'completed' | 'rejected';
  user_feedback?: string;
  actual_outcome?: Record<string, any>;
  created_at: string;
}

export interface Budget {
  budget_id: string;
  user_id: string;
  budget_type: 'feast' | 'famine' | 'normal';
  valid_from: string;
  valid_until: string;
  total_income_expected: number;
  fixed_costs: Record<string, number>;
  variable_costs: Record<string, number>;
  savings_target: number;
  discretionary_budget: number;
  category_limits: Record<string, any>;
  confidence_score?: number;
  is_active: boolean;
  created_at: string;
}

export interface BankAccount {
  account_id: string;
  user_id: string;
  account_name: string;
  provider: string;
  account_number: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  goal_type: string;
  goal_name: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  priority: 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'completed';
  reasoning?: string;
  created_at: string;
}

export interface InvestmentRecommendation {
  id: string;
  user_id: string;
  investment_type: string;
  provider: string;
  recommended_amount: number;
  frequency: string;
  expected_return: number;
  risk_level: 'low' | 'moderate' | 'high';
  reasoning?: string;
  created_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  bill_name: string;
  bill_type: string;
  amount: number;
  due_date: string;
  frequency: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  auto_pay_recommended: boolean;
  payment_method?: string;
  status: 'pending' | 'paid' | 'overdue' | 'scheduled';
  created_at: string;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  goal_name: string;
  goal_type: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  priority: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  monthly_target: number;
  progress_percentage: number;
  explanation?: Record<string, any>;
  milestones?: any[];
  action_steps?: string[];
  created_at: string;
}

// ============================================================================
// HELPER: Get User ID
// ============================================================================

const getUserId = (): string | null => {
  return localStorage.getItem('user_id');
};

// ============================================================================
// DATABASE SERVICE
// ============================================================================

export const db = {
  // ========== AUTHENTICATION ==========
  auth: {
    login: async (phone_number: string, password: string) => {
      try {
        // Simple validation
        if (!phone_number || !password) {
          throw new Error('Phone number and password are required');
        }

        if (phone_number.length !== 10) {
          throw new Error('Please enter a valid 10-digit phone number');
        }

        // Check if user exists in database and get their UUID
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('phone_number', phone_number)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('[AUTH] Database error during login:', userError);
          throw new Error('Database error occurred');
        }

        if (!existingUser) {
          throw new Error('User not found. Please sign up first.');
        }

        // Simple password validation (in real app, use proper hashing)
        // For now, we'll just check if password matches a simple pattern
        // In production, you should implement proper password hashing
        const isValidPassword = password.length >= 6; // Simple validation
        
        if (!isValidPassword) {
          throw new Error('Invalid password');
        }

        // Use the actual UUID from the database
        const userId = existingUser.user_id;
        localStorage.setItem('user_id', userId);
        localStorage.setItem('auth_token', `token_${userId}_${Date.now()}`);
        
        console.log('[AUTH] Login successful for user:', userId);
        
        return {
          user: existingUser,
          user_id: userId,
          access_token: `token_${userId}_${Date.now()}`
        };
      } catch (error) {
        console.error('[AUTH] Login error:', error);
        throw error;
      }
    },

    signup: async (userData: {
      phone_number: string;
      full_name: string;
      password: string;
      email?: string;
      occupation?: string;
      city?: string;
      state?: string;
      date_of_birth?: string;
      preferred_language?: string;
    }) => {
      try {
        // Validate required fields
        if (!userData.phone_number || !userData.full_name || !userData.password) {
          throw new Error('Phone number, full name, and password are required');
        }

        if (userData.phone_number.length !== 10) {
          throw new Error('Please enter a valid 10-digit phone number');
        }

        if (userData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('user_id')
          .eq('phone_number', userData.phone_number)
          .single();

        if (existingUser) {
          throw new Error('User with this phone number already exists. Please login instead.');
        }

        // Generate a proper UUID for user_id
        const userId = crypto.randomUUID();

        // Create new user in database
        const newUser = {
          user_id: userId,
          phone_number: userData.phone_number,
          full_name: userData.full_name,
          email: userData.email || '',
          occupation: userData.occupation || '',
          city: userData.city || '',
          state: userData.state || '',
          date_of_birth: userData.date_of_birth || null,
          preferred_language: userData.preferred_language || 'en',
          is_active: true,
          kyc_verified: false,
          onboarding_completed: false,
          created_at: new Date().toISOString()
        };

        const { data: createdUser, error: insertError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single();

        if (insertError) {
          console.error('[AUTH] Error creating user:', insertError);
          
          // More detailed error message
          if (insertError.code === '23505') {
            throw new Error('User with this phone number already exists. Please login instead.');
          } else if (insertError.code === '23502') {
            throw new Error('Missing required information. Please fill all required fields.');
          } else {
            throw new Error(`Failed to create user account: ${insertError.message || 'Unknown database error'}`);
          }
        }

        // Set authentication tokens
        localStorage.setItem('user_id', userId);
        localStorage.setItem('auth_token', `token_${userId}_${Date.now()}`);
        
        console.log('[AUTH] Signup successful for user:', userId);
        
        return {
          user: createdUser,
          user_id: userId,
          access_token: `token_${userId}_${Date.now()}`
        };
      } catch (error) {
        console.error('[AUTH] Signup error:', error);
        throw error;
      }
    },

    logout: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_id');
    },
  },

  // ========== USERS ==========
  users: {
    getMe: async (): Promise<User> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        console.error('[DB] No user_id in localStorage. Current localStorage:', {
          user_id: localStorage.getItem('user_id'),
          auth_token: localStorage.getItem('auth_token') ? 'present' : 'missing'
        });
        throw new Error('Not authenticated - please login again');
      }

  const { data, error } = await supabase
        .from('users')
    .select('*')
    .eq('user_id', userId)
        .single();

      if (error) {
        console.error('[DB] Error fetching user:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('User not found in database');
      }
      
      return data as User;
    },

    updateMe: async (data: Partial<User>): Promise<User> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data: updated, error } = await supabase
        .from('users')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();

  if (error) throw error;
      return updated as User;
    },

    getProfile: async (): Promise<UserProfile> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
      return data as UserProfile;
    },

    updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data: updated, error } = await supabase
        .from('user_profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
        .select()
    .single();

  if (error) throw error;
      return updated as UserProfile;
    },
  },

  // ========== TRANSACTIONS ==========
  transactions: {
    getAll: async (filters?: {
      date_start?: string;
      date_end?: string;
      transaction_type?: 'income' | 'expense' | 'all';
      category?: string;
      search_query?: string;
    }): Promise<Transaction[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        console.error('[DB] No user_id in localStorage for transactions');
        throw new Error('Not authenticated - please login again');
      }
      
      let query = supabase
        .from('transactions')
    .select('*')
    .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .order('transaction_time', { ascending: false });
      
      if (filters?.date_start) {
        query = query.gte('transaction_date', filters.date_start);
      }
      if (filters?.date_end) {
        query = query.lte('transaction_date', filters.date_end);
      }
      if (filters?.transaction_type && filters.transaction_type !== 'all') {
        query = query.eq('transaction_type', filters.transaction_type);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.search_query) {
        query = query.or(`description.ilike.%${filters.search_query}%,merchant_name.ilike.%${filters.search_query}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Transaction[];
    },

    getTodaySummary: async () => {
      const today = new Date().toISOString().split('T')[0];
      const transactions = await db.transactions.getAll({
        date_start: today,
        date_end: today,
      });
      const income = transactions
        .filter((t) => t.transaction_type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = transactions
        .filter((t) => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      return { income, expense, count: transactions.length };
    },

    create: async (data: {
      transaction_date: string;
      transaction_time?: string;
      amount: number;
      transaction_type: 'income' | 'expense';
      category?: string;
      subcategory?: string;
  description?: string;
      payment_method?: string;
      merchant_name?: string;
      location?: string;
      source?: string;
      account_id?: string;
      is_recurring?: boolean;
      recurring_frequency?: string;
      tags?: string[];
    }): Promise<Transaction> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data: created, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          ...data,
          verified: true,
          input_method: 'manual',
          confidence_score: 1.0,
        })
        .select()
        .single();
      
      if (error) throw error;
      return created as Transaction;
    },

    update: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data: updated, error } = await supabase
        .from('transactions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('transaction_id', id)
        .eq('user_id', userId)
        .select()
    .single();

      if (error) throw error;
      return updated as Transaction;
    },

    delete: async (id: string): Promise<void> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('transaction_id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },

    bulkCreate: async (transactions: Array<{
      transaction_date: string;
      transaction_time?: string;
      amount: number;
      transaction_type: 'income' | 'expense';
      category?: string;
      subcategory?: string;
      description?: string;
      payment_method?: string;
      merchant_name?: string;
      location?: string;
      source?: string;
      account_id?: string;
      is_recurring?: boolean;
      recurring_frequency?: string;
      tags?: string[];
    }>): Promise<Transaction[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const transactionsWithUser = transactions.map(t => ({
        user_id: userId,
        ...t,
        verified: true,
        input_method: 'pdf_import',
        confidence_score: 0.85,
      }));

      const { data: created, error } = await supabase
        .from('transactions')
        .insert(transactionsWithUser)
        .select();

      if (error) throw error;
      return (created || []) as Transaction[];
    },
  },

  // ========== RECOMMENDATIONS ==========
  recommendations: {
    getAll: async (filters?: {
      status?: string;
      priority?: string;
      recommendation_type?: string;
    }): Promise<Recommendation[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      let query = supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.recommendation_type) {
        query = query.eq('recommendation_type', filters.recommendation_type);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Recommendation[];
    },

    update: async (id: string, data: {
      status?: string;
      user_feedback?: string;
    }): Promise<Recommendation> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const updateData: any = {};
      if (data.status) {
        updateData.status = data.status;
        if (data.status === 'actioned') updateData.actioned_at = new Date().toISOString();
        if (data.status === 'completed') updateData.completed_at = new Date().toISOString();
      }
      if (data.user_feedback) updateData.user_feedback = data.user_feedback;
      
      const { data: updated, error } = await supabase
        .from('recommendations')
        .update(updateData)
        .eq('recommendation_id', id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return updated as Recommendation;
    },
  },

  // ========== BANK ACCOUNTS ==========
  bankAccounts: {
    getAll: async (): Promise<BankAccount[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
        .from('bank_accounts')
    .select('*')
    .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

  if (error) throw error;
      return (data || []) as BankAccount[];
    },

    create: async (data: {
      account_name: string;
      provider: string;
      account_number: string;
      current_balance: number;
      currency?: string;
    }): Promise<BankAccount> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data: created, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: userId,
          ...data,
          currency: data.currency || 'INR',
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return created as BankAccount;
    },

    update: async (id: string, data: Partial<BankAccount>): Promise<BankAccount> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data: updated, error } = await supabase
        .from('bank_accounts')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('account_id', id)
        .eq('user_id', userId)
        .select()
        .single();

  if (error) throw error;
      return updated as BankAccount;
    },

    delete: async (id: string): Promise<void> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('account_id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
  },

  // ========== BUDGETS ==========
  budgets: {
    getAll: async (): Promise<Budget[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
        .order('created_at', { ascending: false });

  if (error) throw error;
      return (data || []) as Budget[];
    },

    getActive: async (): Promise<Budget | null> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gte('valid_until', today)
        .lte('valid_from', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
      return data as Budget | null;
    },

    create: async (data: {
      budget_type: string;
      valid_from: string;
      valid_until: string;
      total_income_expected: number;
      fixed_costs?: Record<string, number>;
      variable_costs?: Record<string, number>;
      savings_target?: number;
      discretionary_budget?: number;
      category_limits?: Record<string, number>;
      is_active?: boolean;
    }) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const budgetData = {
        user_id: userId,
        budget_type: data.budget_type,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        total_income_expected: data.total_income_expected,
        fixed_costs: data.fixed_costs || {},
        variable_costs: data.variable_costs || {},
        savings_target: data.savings_target || 0,
        discretionary_budget: data.discretionary_budget || 0,
        category_limits: data.category_limits || {},
        is_active: data.is_active !== undefined ? data.is_active : true,
        confidence_score: 0.8, // Default confidence
        created_at: new Date().toISOString(),
      };

      const { data: created, error } = await supabase
        .from('budgets')
        .insert(budgetData)
        .select()
        .single();

  if (error) throw error;
      return created;
    },

    update: async (budgetId: string, data: {
      budget_type?: string;
      valid_from?: string;
      valid_until?: string;
      total_income_expected?: number;
      fixed_costs?: Record<string, number>;
      variable_costs?: Record<string, number>;
      savings_target?: number;
      discretionary_budget?: number;
      category_limits?: Record<string, number>;
      is_active?: boolean;
    }) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      // Prepare update data, ensuring JSON fields are properly formatted
      const updateData: any = {
        budget_type: data.budget_type,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        total_income_expected: data.total_income_expected,
        savings_target: data.savings_target,
        discretionary_budget: data.discretionary_budget,
        is_active: data.is_active,
      };

      // Only include JSON fields if they are provided
      if (data.fixed_costs !== undefined) {
        updateData.fixed_costs = data.fixed_costs;
      }
      if (data.variable_costs !== undefined) {
        updateData.variable_costs = data.variable_costs;
      }
      if (data.category_limits !== undefined) {
        updateData.category_limits = data.category_limits;
      }

      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data: updated, error } = await supabase
        .from('budgets')
        .update(updateData)
        .eq('budget_id', budgetId)
    .eq('user_id', userId)
        .select()
        .maybeSingle(); // Use maybeSingle instead of single to handle not found gracefully

      if (error) {
        console.error('[DB] Budget update error:', error);
        throw error;
      }
      
      if (!updated) {
        throw new Error('Budget not found or you do not have permission to update it');
      }
      
      return updated;
    },
  },

  // ========== RISK ASSESSMENTS ==========
  riskAssessments: {
    getLatest: async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('risk_assessments')
    .select('*')
    .eq('user_id', userId)
        .order('assessment_date', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
    },
  },

  // ========== TAX RECORDS ==========
  taxRecords: {
    getAll: async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
        .from('tax_records')
    .select('*')
    .eq('user_id', userId)
        .order('financial_year', { ascending: false });

  if (error) throw error;
  return data || [];
    },

    getByYear: async (financialYear: string) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
        .from('tax_records')
    .select('*')
    .eq('user_id', userId)
        .eq('financial_year', financialYear)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
    },

    create: async (data: {
      financial_year: string;
      gross_income?: number;
      total_deductions?: number;
      tax_paid?: number;
      filing_status?: string;
      filing_date?: string;
      acknowledgement_number?: string;
    }) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const recordData = {
        user_id: userId,
        financial_year: data.financial_year,
        gross_income: data.gross_income || 0,
        total_deductions: data.total_deductions || 0,
        tax_paid: data.tax_paid || 0,
        taxable_income: (data.gross_income || 0) - (data.total_deductions || 0),
        tax_liability: 0, // Will be calculated by backend
        filing_status: data.filing_status || 'not_filed',
        filing_date: data.filing_date || null,
        acknowledgement_number: data.acknowledgement_number || null,
      };

      const { data: created, error } = await supabase
        .from('tax_records')
        .insert(recordData)
        .select()
    .single();

  if (error) throw error;
      return created;
    },
  },

  // ========== GOVERNMENT SCHEMES ==========
  governmentSchemes: {
    getAll: async (filters?: {
      scheme_type?: string;
      government_level?: string;
      state_applicable?: string;
      is_active?: boolean;
    }) => {
      let query = supabase
        .from('government_schemes')
        .select('*')
        .order('scheme_name', { ascending: true });

      if (filters?.scheme_type) {
        query = query.eq('scheme_type', filters.scheme_type);
      }
      if (filters?.government_level) {
        query = query.eq('government_level', filters.government_level);
      }
      if (filters?.state_applicable) {
        query = query.ilike('state_applicable', `%${filters.state_applicable}%`);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      } else {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    getById: async (schemeId: string) => {
  const { data, error } = await supabase
    .from('government_schemes')
    .select('*')
        .eq('scheme_id', schemeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  },

  // ========== USER SCHEME APPLICATIONS ==========
  userSchemeApplications: {
    getAll: async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_scheme_applications')
        .select(`
          *,
          government_schemes (
            scheme_name,
            scheme_code,
            scheme_type,
            benefits
          )
        `)
        .eq('user_id', userId)
        .order('application_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    getBySchemeId: async (schemeId: string) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_scheme_applications')
        .select('*')
        .eq('user_id', userId)
        .eq('scheme_id', schemeId)
        .order('application_date', { ascending: false });

  if (error) throw error;
  return data || [];
    },

    create: async (data: {
      scheme_id: string;
      application_date: string;
      application_status?: string;
      documents_submitted?: any;
      application_notes?: string;
    }) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const applicationData = {
        user_id: userId,
        scheme_id: data.scheme_id,
        application_date: data.application_date,
        application_status: data.application_status || 'submitted',
        documents_submitted: data.documents_submitted || null,
        application_notes: data.application_notes || null,
      };

      const { data: created, error } = await supabase
        .from('user_scheme_applications')
        .insert(applicationData)
        .select()
        .single();

      if (error) throw error;
      return created;
    },

    update: async (id: number, updates: {
      application_status?: string;
      documents_submitted?: any;
      documents_verified?: any;
      approval_date?: string;
      disbursement_date?: string;
      benefit_received?: number;
      application_notes?: string;
    }) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_scheme_applications')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  },

  // ========== EXECUTED ACTIONS ==========
  actions: {
    getAll: async (filters?: {
      status?: string;
      date_range?: 'today' | 'upcoming' | 'ongoing' | 'completed';
    }) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      let query = supabase
        .from('executed_actions')
    .select('*')
    .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.date_range === 'today') {
        const today = new Date().toISOString().split('T')[0];
        query = query.eq('next_execution', today).or('next_execution.is.null');
      } else if (filters?.date_range === 'upcoming') {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        query = query.gte('next_execution', today.toISOString().split('T')[0])
          .lte('next_execution', nextWeek.toISOString().split('T')[0]);
      } else if (filters?.date_range === 'ongoing') {
        query = query.eq('status', 'active').neq('schedule', 'once');
      } else if (filters?.date_range === 'completed') {
        query = query.eq('status', 'completed');
      }
      
      const { data, error } = await query;
  if (error) throw error;
      return data || [];
    },

    create: async (data: {
      action_type: string;
      action_description: string;
      amount: number;
      target_date?: string;
      schedule?: string;
      status?: string;
    }) => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const today = new Date();
      const targetDate = data.target_date ? new Date(data.target_date) : today;
      
      // Determine next_execution date
      let nextExecution: string;
      if (data.schedule === 'once') {
        // For one-time actions, use target date or today
        nextExecution = targetDate.toISOString().split('T')[0];
      } else if (data.schedule === 'daily') {
        // For daily, start today
        nextExecution = today.toISOString().split('T')[0];
      } else if (data.schedule === 'weekly') {
        // For weekly, use target date or next week
        nextExecution = targetDate.toISOString().split('T')[0];
      } else if (data.schedule === 'monthly') {
        // For monthly, use target date or next month
        nextExecution = targetDate.toISOString().split('T')[0];
      } else {
        // Default to today
        nextExecution = today.toISOString().split('T')[0];
      }

      const actionData = {
        user_id: userId,
        action_type: data.action_type,
        action_description: data.action_description,
        amount: data.amount,
        status: data.status || 'pending',
        schedule: data.schedule || 'once',
        next_execution: nextExecution,
        user_approved: false,
        is_reversible: true,
      };

      const { data: created, error } = await supabase
        .from('executed_actions')
        .insert(actionData)
        .select()
        .single();

      if (error) throw error;
      return created;
    },
  },

  // ========== INCOME FORECASTS ==========
  incomeForecasts: {
    getAll: async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('income_forecasts')
        .select('*')
        .eq('user_id', userId)
        .order('forecast_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    getLatest: async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('income_forecasts')
        .select('*')
        .eq('user_id', userId)
        .order('forecast_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  },

  // ========== FINANCIAL HEALTH ==========
  financialHealth: {
    getAll: async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('financial_health')
        .select('*')
        .eq('user_id', userId)
        .order('assessment_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },

    getLatest: async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('financial_health')
        .select('*')
        .eq('user_id', userId)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  },

  // ========== SAVINGS GOALS ==========
  savingsGoals: {
    getAll: async (): Promise<SavingsGoal[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return (data || []) as SavingsGoal[];
    },

    getByType: async (goalType: string): Promise<SavingsGoal | null> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('goal_type', goalType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as SavingsGoal | null;
    },

    updateProgress: async (id: string, currentAmount: number): Promise<void> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('savings_goals')
        .update({ current_amount: currentAmount })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },
  },

  // ========== INVESTMENT RECOMMENDATIONS ==========
  investments: {
    getAll: async (): Promise<InvestmentRecommendation[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('investment_recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InvestmentRecommendation[];
    },

    getByRiskLevel: async (riskLevel: string): Promise<InvestmentRecommendation[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('investment_recommendations')
        .select('*')
        .eq('user_id', userId)
        .eq('risk_level', riskLevel)
        .order('expected_return', { ascending: false });

      if (error) throw error;
      return (data || []) as InvestmentRecommendation[];
    },
  },

  // ========== BILLS ==========
  bills: {
    getAll: async (): Promise<Bill[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data || []) as Bill[];
    },

    getUpcoming: async (): Promise<Bill[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .gte('due_date', today)
        .lte('due_date', nextMonth)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return (data || []) as Bill[];
    },

    markPaid: async (id: string): Promise<void> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('bills')
        .update({ status: 'paid' })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },

    create: async (data: {
      bill_name: string;
      bill_type: string;
      amount: number;
      due_date: string;
      frequency: string;
      priority?: string;
      auto_pay_recommended?: boolean;
      payment_method?: string;
    }): Promise<Bill> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const billData = {
        user_id: userId,
        bill_name: data.bill_name,
        bill_type: data.bill_type,
        amount: data.amount,
        due_date: data.due_date,
        frequency: data.frequency,
        priority: data.priority || 'medium',
        auto_pay_recommended: data.auto_pay_recommended || false,
        payment_method: data.payment_method || 'upi',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { data: created, error } = await supabase
        .from('bills')
        .insert(billData)
        .select()
        .single();

      if (error) throw error;
      return created as Bill;
    },
  },

  // ========== FINANCIAL GOALS ==========
  financialGoals: {
    getAll: async (): Promise<FinancialGoal[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true });

      if (error) throw error;
      return (data || []) as FinancialGoal[];
    },

    getByStatus: async (status: string): Promise<FinancialGoal[]> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', status)
        .order('priority', { ascending: true });

      if (error) throw error;
      return (data || []) as FinancialGoal[];
    },

    updateProgress: async (id: string, updates: {
      current_amount?: number;
      progress_percentage?: number;
      status?: string;
    }): Promise<void> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('financial_goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    },

    create: async (data: {
      goal_name: string;
      goal_type: string;
      description?: string;
      target_amount: number;
      target_date?: string;
      priority?: number;
      monthly_target?: number;
    }): Promise<FinancialGoal> => {
      const userId = localStorage.getItem('user_id');
      if (!userId) throw new Error('Not authenticated');

      const goalData = {
        user_id: userId,
        goal_name: data.goal_name,
        goal_type: data.goal_type,
        description: data.description || '',
        target_amount: data.target_amount,
        current_amount: 0,
        target_date: data.target_date || null,
        priority: data.priority || 1,
        status: 'not_started',
        monthly_target: data.monthly_target || 0,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
      };

      const { data: created, error } = await supabase
        .from('financial_goals')
        .insert(goalData)
        .select()
        .single();

      if (error) throw error;
      return created as FinancialGoal;
    },
  },
};

export default db;
