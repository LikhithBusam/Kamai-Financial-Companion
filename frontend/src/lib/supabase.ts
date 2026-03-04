import { createClient } from '@supabase/supabase-js' 
 
const supabaseUrl = 'https://ubjrclaiqqxngfcylbfs.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVianJjbGFpcXF4bmdmY3lsYmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NzMzOTEsImV4cCI6MjA3OTU0OTM5MX0.Kkp7BV0ZSWq0ZR6YVOzwQwX08u3NOCxClvQWknWJlbA' 
 
export const supabase = createClient(supabaseUrl, supabaseAnonKey) 
