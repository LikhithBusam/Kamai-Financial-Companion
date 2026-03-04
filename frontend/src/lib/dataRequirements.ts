import db from '@/services/database'; 
 
export const MinimumDataRequired = 5; 
 
export const hasMinimumTransactions = async () => {
  try { 
    const transactions = await db.transactions.getAll(); 
    return transactions.length >= MinimumDataRequired;
  } catch (error) { 
    console.error('Error checking minimum transactions:', error); 
    return false; 
  }
} 

