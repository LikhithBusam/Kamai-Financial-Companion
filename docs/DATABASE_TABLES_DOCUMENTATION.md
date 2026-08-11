# Database Tables Documentation

This document provides a comprehensive overview of all database tables in the Agente AI system, their purpose, structure, and how they're used in the application.

---

## Table of Contents

1. [Core User Tables](#core-user-tables)
2. [Financial Data Tables](#financial-data-tables)
3. [AI & Analysis Tables](#ai--analysis-tables)
4. [Action & Outcome Tables](#action--outcome-tables)
5. [Support & External Data Tables](#support--external-data-tables)
6. [System Tables](#system-tables)

---

## Core User Tables

### 1. `profiles` (formerly `users`)

**Purpose:** Application-level identity/profile record for each user. Credentials live in Supabase-managed `auth.users`, not here — this table has no password column; it's populated automatically from signup metadata by a DB trigger (see `supabase/migrations/20260811000100_profiles.sql`) and keyed 1:1 to `auth.users.id`.

**Key Fields:**
- `user_id` (UUID, Primary Key, references `auth.users(id)`)
- `phone_number` (unique — used as the login identifier via a synthetic shadow email, see `CLAUDE.md`)
- `email`, `full_name`
- `date_of_birth`, `preferred_language`
- `occupation`, `city`, `state`, `pin_code`
- `kyc_verified`, `onboarding_completed` (boolean flags)
- `is_active`, `created_at`, `updated_at`

**Used In:**
- **Login/Signup Page:** Authentication and user creation
- **Profile Page:** Basic user information display and editing
- **All Pages:** User identification and data filtering
- **Onboarding Flow:** Track completion status

**UI Components:**
- Auth forms (login/signup)
- Profile page "Basic Info" section
- User avatar/name in TopBar

---

### 2. `user_profiles`

**Purpose:** Extended financial profile and preferences of the user.

**Key Fields:**
- `profile_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `monthly_income_min`, `monthly_income_max`
- `monthly_expenses_avg`
- `emergency_fund_target`, `current_emergency_fund`
- `risk_tolerance` (low/moderate/high)
- `financial_goals` (JSON)
- `income_sources` (JSON array)
- `debt_obligations` (JSON array)
- `dependents` (number)
- `created_at`, `updated_at`

**Used In:**
- **Profile Page:** "Financial Profile" section
- **Risk Analysis Page:** Input for risk calculations
- **Budget Page:** Income/expense assumptions
- **Recommendations Engine:** Personalization parameters
- **Stats Page:** Baseline comparisons

**UI Components:**
- Profile page financial settings
- Risk dashboard calculations
- Budget planning inputs

---

### 3. `bank_accounts`

**Purpose:** User's linked bank accounts, UPI accounts, and savings accounts.

**Key Fields:**
- `account_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `account_name` (e.g., "Main UPI", "Savings Account")
- `provider` (e.g., "SBI", "HDFC", "PhonePe")
- `account_number` (masked/last 4 digits)
- `current_balance`
- `currency`, `is_active`
- `created_at`, `updated_at`

**Used In:**
- **Home Page:** Account dropdown in transaction input
- **Transactions Page:** Filter by account
- **Stats Page:** Balance tracking per account
- **Action Plan:** Auto-transfer target accounts
- **Budget Page:** Account-specific budgets

**UI Components:**
- Transaction input account selector
- Account balance displays
- Account management (if implemented)

**Note:** Currently removed from Profile page UI per user request.

---

## Financial Data Tables

### 4. `transactions`

**Purpose:** Main ledger of all user income and expense transactions.

**Key Fields:**
- `transaction_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `transaction_date`, `transaction_time`
- `amount`
- `transaction_type` (income/expense)
- `category`, `subcategory`
- `source` (e.g., "Uber", "Swiggy", "Freelance")
- `payment_method` (UPI, Cash, Card, Bank Transfer)
- `description`, `merchant_name`, `location`
- `is_recurring`, `recurring_frequency`
- `tags` (JSON array)
- `input_method` (manual/image/voice)
- `confidence_score`, `verified` (boolean)
- `account_id` (FK to bank_accounts)
- `balance_after`
- `created_at`, `updated_at`

**Used In:**
- **Home Page:** Today's income/expense summary, recent transactions
- **Transactions Page:** Full transaction list with filters
- **Stats Page:** Charts (expense breakdown, income vs expense, trends)
- **Budget Page:** Actual spending vs planned
- **Risk Analysis:** Income volatility, expense patterns
- **Recommendations:** Transaction pattern analysis

**UI Components:**
- Transaction input card (Manual/Image/Voice modes)
- Transaction list with edit/delete
- Transaction filters (date, type, category, search)
- Charts and visualizations

---

### 5. `transactions_backup`

**Purpose:** Backup/archive copy of transactions for safety and audit purposes.

**Key Fields:**
- Same structure as `transactions` table

**Used In:**
- **Internal:** Data backup and recovery
- **No Direct UI:** This is a system table for data safety

**Note:** Not exposed in frontend UI.

---

### 6. `budgets`

**Purpose:** User's budget configurations for different time periods and scenarios.

**Key Fields:**
- `budget_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `budget_type` (weekly, monthly, feast_week, famine_week, etc.)
- `valid_from`, `valid_until` (date range)
- `total_income_expected`
- `fixed_costs` (JSON array: name, amount, due_date)
- `variable_costs` (JSON array: category, planned_amount)
- `savings_target`
- `discretionary_budget`
- `category_limits` (JSON object: category → limit)
- `confidence_score`
- `is_active` (boolean)
- `created_at`, `updated_at`

**Used In:**
- **Budget Page:**
  - Display active budget
  - Show category limits with progress bars
  - Edit fixed/variable costs
  - Budget vs actual comparison
- **Risk Analysis:** Budget adherence factor
- **Recommendations:** Budget-based suggestions

**UI Components:**
- Budget selector dropdown
- Summary cards (income, expenses, remaining)
- Fixed costs table
- Variable costs table
- Category limits with progress bars
- Edit budget modal

---

## AI & Analysis Tables

### 7. `income_patterns`

**Purpose:** Aggregated patterns identified in the user's income history.

**Key Fields:**
- `pattern_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `pattern_type` (baseline, weekend_pattern, weekday_pattern, etc.)
- `avg_income`, `min_income`, `max_income`
- `confidence_score`
- `weekday_income` (JSON: Mon-Sun income breakdown)
- `monthly_trend` (JSON: income by month)
- `peak_hours` (JSON: hours with highest income)
- `weather_impact` (JSON)
- `seasonal_factors` (JSON)
- `last_calculated`, `valid_until`
- `created_at`, `updated_at`

**Used In:**
- **Stats Page:**
  - Weekday pattern visualization
  - Best times to work chart
  - Monthly trends
- **Tips/Recommendations:**
  - "Work more on weekends" suggestions
  - "Your income is higher on Mondays"
- **Income Forecasts:** Pattern-based predictions
- **Risk Analysis:** Income stability assessment

**UI Components:**
- Pattern charts (weekday, monthly, hourly)
- Insights cards ("Best earning days", "Peak hours")

---

### 8. `income_forecasts`

**Purpose:** AI-predicted future income ranges and scenarios.

**Key Fields:**
- `forecast_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `forecast_start_date`, `forecast_end_date`
- `historical_days`, `historical_total_income`
- `historical_avg_daily`, `historical_std_dev`
- `volatility_index`
- `pessimistic_scenario` (JSON)
- `realistic_scenario` (JSON)
- `optimistic_scenario` (JSON)
- `weighted_forecast`
- `forecast_range_min`, `forecast_range_max`
- `weekday_breakdown` (JSON)
- `recent_trend`
- `forecast_confidence`
- `ai_reasoning` (text)
- `created_at`, `updated_at`

**Used In:**
- **Stats Page:**
  - Future income band visualization
  - Income volatility/forecast line chart
  - Scenario comparison
- **Risk Analysis Page:**
  - "Future income may be weak" warnings
  - Income drop predictions
- **Budget Page:**
  - Adjusting future budgets based on forecast
  - Feast/famine week planning

**UI Components:**
- Forecast line chart with confidence bands
- Scenario cards (pessimistic/realistic/optimistic)
- Volatility indicator

---

### 9. `risk_assessments`

**Purpose:** AI-calculated risk profile snapshots for the user.

**Key Fields:**
- `risk_assessment_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `overall_risk_level` (low/medium/high)
- `risk_score` (0-10)
- `risk_factors` (JSON array: {name, detail, severity})
- `debt_to_income_ratio`
- `income_drop_percentage`
- `expense_spike_factor`
- `emergency_fund_coverage` (months)
- `transaction_anomalies` (JSON)
- `escalation_needed` (boolean)
- `escalation_priority`, `escalation_reason`
- `recommended_actions` (JSON array)
- `ai_risk_analysis` (text)
- `assessment_date`
- `created_at`, `updated_at`

**Used In:**
- **Risk Analysis Page:**
  - Display overall risk score and level
  - Show risk factors with severity
  - Display metrics (DTI ratio, emergency fund, etc.)
  - Show recommended actions
  - Escalation banner if high risk
- **Notifications:** Risk alerts
- **Human Escalations:** Trigger advisor review

**UI Components:**
- Risk score card with color coding
- Risk metrics cards (DTI, income drop, expense spike, emergency fund)
- Risk factors list
- Recommended actions list
- Escalation alert banner

---

### 10. `recommendations`

**Purpose:** All AI (or human) financial recommendations for the user.

**Key Fields:**
- `recommendation_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `recommendation_type` (savings, income, debt, budget, risk, tax, other)
- `priority` (high/medium/low)
- `title`, `description`
- `reasoning` (AI explanation)
- `action_items` (JSON array: can be strings or {step, timeline} objects)
- `target_amount`, `target_date`
- `confidence_score`
- `expected_outcome`
- `success_probability`
- `agent_source` (which AI engine generated it)
- `context_data` (JSON)
- `status` (pending/accepted/in_progress/completed/rejected)
- `user_feedback` (text)
- `actual_outcome` (JSON)
- `created_at`, `updated_at`

**Used In:**
- **Tips Page (Recommendations):**
  - Display recommendation cards
  - Detail drawer with full reasoning
  - User feedback collection
  - Status updates (Helpful/Not Relevant/Already Following)
- **Action Plan Page:** Link recommendations to actions
- **Dashboard:** Quick tips widget

**UI Components:**
- Recommendation card grid
- Priority badges (high/medium/low)
- Status icons (pending/completed/rejected)
- Detail modal/drawer
- Feedback textarea
- Quick action buttons

---

## Action & Outcome Tables

### 11. `executed_actions`

**Purpose:** Concrete actions taken or scheduled based on recommendations.

**Key Fields:**
- `action_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `action_type` (savings_transfer, auto_transfer, debt_payment, etc.)
- `action_description`
- `status` (scheduled/completed/failed/paused)
- `amount`
- `target_account`, `target_entity`
- `user_approved` (boolean), `approval_date`
- `requires_2fa`, `security_verification_id`
- `execution_date`
- `transaction_id` (FK to transactions, if mapped)
- `schedule` (cron-like string)
- `next_execution` (date)
- `recurrence_count`
- `is_reversible`, `reversal_requested`, `reversal_date`
- `audit_trail` (JSON)
- `error_message`
- `created_at`, `updated_at`

**Used In:**
- **Action Plan Page:**
  - "Today & Upcoming Actions" list
  - "Completed Actions" list
  - Approve/pause/reverse actions
  - Create custom action plans
- **Notifications:** Action reminders
- **Outcomes Tracking:** Link to results

**UI Components:**
- Action cards with status
- Approve/Pause toggle buttons
- Reversal request button
- Create custom action modal
- Action timeline

---

### 12. `action_outcomes`

**Purpose:** Measurement of action effectiveness and results.

**Key Fields:**
- `outcome_id` (UUID, Primary Key)
- `action_id` (FK to executed_actions)
- `verification_date`
- `days_after_execution`
- `intended_target`
- `actual_achievement`
- `achievement_percentage`
- `success` (boolean)
- `deviation`, `deviation_reason`
- `influencing_factors` (JSON)
- `learnings` (text)
- `optimization_suggestions` (JSON)
- `created_at`, `updated_at`

**Used In:**
- **Action Plan Page:**
  - "Completed Actions & Outcomes" section
  - Show "Was this action useful?" feedback
- **Recommendations Engine:**
  - Feedback loop for better suggestions
  - Learn what works/doesn't work for user

**UI Components:**
- Outcome cards showing success/failure
- Achievement percentage display
- Learning insights

---

### 13. `outcomes`

**Purpose:** Generic outcome tracking linked to recommendations (broader than action_outcomes).

**Key Fields:**
- `outcome_id` (UUID, Primary Key)
- `recommendation_id` (FK to recommendations)
- `measurement_type` (e.g., monthly_savings, dti_ratio)
- `baseline_value`, `target_value`, `actual_value`
- `achievement_percentage`
- `measurement_date`, `time_period`
- `success` (boolean)
- `deviation_analysis` (JSON)
- `factors` (JSON)
- `created_at`, `updated_at`

**Used In:**
- **Stats Page:** Long-term effect evaluation
- **Risk Analysis:** "Recommendations worked/didn't work" insights
- **Tips Page:** Show success stories

**UI Components:**
- Outcome metrics in stats
- Success rate indicators

---

## Support & External Data Tables

### 14. `notifications`

**Purpose:** In-app and external notifications for the user.

**Key Fields:**
- `notification_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `notification_type` (risk_alert, emi_reminder, recommendation_update, etc.)
- `channel` (in_app, sms, email, push)
- `title`, `message`
- `priority` (high/medium/low)
- `status` (pending/sent/delivered/read)
- `scheduled_at`, `sent_at`, `delivered_at`, `read_at`
- `action_taken` (boolean)
- `action_details` (JSON)
- `created_at`, `updated_at`

**Used In:**
- **All Pages:** Notification bell icon
- **Toasts/Banners:**
  - Risk alerts
  - Upcoming EMI reminders
  - New recommendations
  - Savings reminders
- **Notification Center:** (if implemented)

**UI Components:**
- Notification bell with badge count
- Toast notifications
- Notification dropdown/modal
- In-app banners

---

### 15. `context_events`

**Purpose:** External events that affect user income/spending patterns.

**Key Fields:**
- `event_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `event_type` (festival, weather, economic, local_event, health)
- `event_name`
- `event_date`
- `weather_condition`, `temperature`
- `weather_impact_factor`
- `income_impact_percentage`
- `occupation_impact` (JSON)
- `recommendations` (JSON)
- `event_analyzed_date`
- `created_at`, `updated_at`

**Used In:**
- **Stats Page:**
  - Explain income spikes/drops
  - "Why your income was low on X date"
- **Recommendations:**
  - "On rainy days, do X"
  - "During Diwali, work extra hours"
- **Risk Analysis:** Context-aware risk adjustments

**UI Components:**
- Event annotations on charts
- Contextual insights cards
- Weather/event impact indicators

---

### 16. `government_schemes`

**Purpose:** Master list of government schemes and social security programs.

**Key Fields:**
- `scheme_id` (UUID, Primary Key)
- `scheme_name`, `scheme_code`
- `description`
- `eligibility_criteria` (JSON)
- `benefits`, `application_process`
- `required_documents` (JSON)
- `scheme_type` (health, pension, insurance, social_security, etc.)
- `max_benefit_amount`, `interest_rate`
- `government_level` (central/state)
- `state_applicable`
- `valid_from`, `valid_until`
- `official_url`
- `contact_info` (JSON)
- `is_active` (boolean)
- `created_at`, `updated_at`

**Used In:**
- **Schemes Page (Future):**
  - Browse all available schemes
  - Filter by type, state, eligibility
  - View scheme details
- **Recommendations:**
  - "You're eligible for PMJJBY"
  - "Apply for AB-PMJAY"
- **Tax Page:** Tax-saving schemes
- **Profile:** Show eligible schemes

**UI Components:**
- Scheme cards with details
- Eligibility checker
- Application form
- Scheme status tracking

**Note:** Currently not implemented in frontend, but identified as important feature.

---

### 17. `user_schemes`

**Purpose:** Which government schemes the user is enrolled in.

**Key Fields:**
- `user_scheme_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `scheme_id` (FK to government_schemes)
- `application_date`
- `application_status`
- `approval_date`
- `benefit_received`
- `documents_submitted` (JSON)
- `notes`
- `created_at`, `updated_at`

**Used In:**
- **Profile Page or Schemes Page:**
  - Show active schemes (e-Shram, PMJJBY, AB-PMJAY, etc.)
- **Risk Analysis:** Insurance/safety net coverage
- **Recommendations:** Scheme-based suggestions

**UI Components:**
- Active schemes list
- Scheme status badges
- Benefit received display

---

### 18. `user_scheme_applications`

**Purpose:** Detailed application records for government schemes.

**Key Fields:**
- `id` (Integer, Primary Key)
- `user_id` (FK to users)
- `scheme_id` (FK to government_schemes)
- `application_date`
- `application_status`
- `benefit_received`, `benefit_currency`
- `documents_submitted`, `documents_verified` (JSON)
- `approval_date`, `disbursement_date`
- `application_notes`
- `created_at`, `updated_at`

**Used In:**
- **Schemes Page:**
  - Track application progress
  - Timeline view (Submitted → Under Review → Approved → Benefit Received)
- **Notifications:** Application status updates

**UI Components:**
- Application status timeline
- Document checklist
- Benefit tracking

---

### 19. `tax_records`

**Purpose:** Formal tax filing information for the user.

**Key Fields:**
- `tax_record_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `financial_year` (e.g., "2024-25")
- `gross_income`
- `income_by_source` (JSON)
- `total_deductions`, `deduction_details` (JSON)
- `taxable_income`
- `tax_liability`, `tax_paid`, `refund_amount`
- `itr_form_type`
- `filing_status` (not_filed/filed/processing)
- `filing_date`
- `acknowledgement_number`
- `created_at`, `updated_at`

**Used In:**
- **Tax Page:**
  - Display past tax filings
  - Compare system-calculated income vs filed income
  - Show deductions and tax liability
  - ITR form details
- **Risk Analysis:** Under-reporting detection
- **Recommendations:** Tax-saving suggestions

**UI Components:**
- Financial year selector
- Summary cards (gross income, taxable income, tax liability, tax paid)
- Income by source table/chart
- Deductions breakdown
- Filing status display
- Manual tax entry form

---

### 20. `human_escalations`

**Purpose:** Cases where AI escalates user to a human financial advisor.

**Key Fields:**
- `id` (Integer, Primary Key)
- `user_id` (FK to users)
- `risk_assessment_id` (FK to risk_assessments)
- `escalation_reason`, `escalation_priority`
- `escalation_date`
- `assigned_advisor_id`, `assigned_advisor_name`
- `advisor_contacted`, `advisor_response`
- `advisor_recommendations` (JSON)
- `resolution_date`, `resolution_status`, `resolution_notes`
- `follow_up_scheduled`, `follow_up_completed`
- `created_at`, `updated_at`

**Used In:**
- **Risk Analysis Page:**
  - Show escalation banner
  - Display advisor assignment
- **Advisor Page (Future):**
  - Timeline of advisor interactions
  - Recommendations from advisor
  - Follow-up scheduling

**UI Components:**
- Escalation alert banner
- Advisor contact card
- Interaction timeline

---

## System Tables

### 21. `agent_logs`

**Purpose:** Internal logs of AI/agent executions for debugging and analytics.

**Key Fields:**
- `log_id` (UUID, Primary Key)
- `user_id` (FK to users)
- `agent_name`
- `execution_timestamp`
- `input_data` (JSON)
- `output_data` (JSON)
- `confidence_score`
- `execution_time_ms`
- `success` (boolean)
- `error_message`
- `model_version`
- `created_at`

**Used In:**
- **Internal:** Debugging and analytics
- **No Direct UI:** System table for development/admin use
- **Future:** "Explainability" view (if implemented)

**Note:** Not exposed in frontend UI.

---

## Page-to-Table Mapping

### Home Page (Dashboard)
- `users` (user info)
- `transactions` (today's summary, recent transactions)
- `bank_accounts` (account selector)
- `recommendations` (quick tips)

### Transactions Page
- `transactions` (full list, filters, edit/delete)
- `bank_accounts` (filter by account)

### Tips Page (Recommendations)
- `recommendations` (all recommendations, filters, feedback)

### Stats Page
- `transactions` (charts data)
- `income_patterns` (weekday/monthly patterns)
- `income_forecasts` (future predictions)
- `outcomes` (long-term results)

### Budget Page
- `budgets` (active budget, category limits)
- `transactions` (actual vs planned)
- `income_forecasts` (future planning)

### Risk Analysis Page
- `risk_assessments` (risk score, factors, actions)
- `human_escalations` (escalation banner)
- `user_profiles` (risk tolerance, emergency fund)

### Action Plan Page
- `executed_actions` (today/upcoming/completed actions)
- `action_outcomes` (action results)
- `recommendations` (linked recommendations)

### Tax Page
- `tax_records` (tax filings, deductions)
- `transactions` (income calculation)

### Profile Page
- `users` (basic info)
- `user_profiles` (financial profile)
- `user_schemes` (active schemes - if implemented)

---

## Data Flow Summary

1. **User Input** → `transactions` → Triggers pattern analysis
2. **Pattern Analysis** → `income_patterns` → Feeds into forecasts
3. **Forecasts** → `income_forecasts` → Used in risk assessment
4. **Risk Assessment** → `risk_assessments` → Generates recommendations
5. **Recommendations** → `recommendations` → User accepts → `executed_actions`
6. **Actions** → `executed_actions` → Results tracked → `action_outcomes`
7. **Outcomes** → `outcomes` → Feedback loop to improve recommendations

---

## Notes

- **Schema source of truth:** `supabase/migrations/` (not this document, which predates it and mixed real and aspirational schema). This doc has been spot-corrected for `profiles` (see above) but the per-table sections below may still describe fields or tables that were never actually created — cross-check against the migrations before relying on this doc for exact columns.
- **Tables intentionally not created in the Phase 0 rebuild** (documented below but never queried anywhere in `frontend/src/services/database.ts` or the backend): `transactions_backup`, `income_patterns`, `action_outcomes`, `outcomes`, `notifications`, `context_events`, `user_schemes`, `human_escalations`. Add them back in a migration if a real feature needs them.
- **`agent_logs`** is a real table (backend-only, read via the service-role key in `backend/main.py`'s `/api/agent-logs/{user_id}`), not exposed directly in the frontend UI.
- **Future Features:** Government schemes page is identified but not yet implemented
- **Data Seeding:** Automatic data seeding populates sample data for new users (see `AUTOMATIC_DATA_SEEDING.md`)
- **Direct Database Access:** Frontend queries Supabase directly using `user_id` from localStorage (mirrored from the real Supabase Auth session — see `CLAUDE.md`), now enforced server-side by RLS policies rather than trusted at face value.

---

## Last Updated

This documentation was created based on the current database schema and frontend implementation status.

