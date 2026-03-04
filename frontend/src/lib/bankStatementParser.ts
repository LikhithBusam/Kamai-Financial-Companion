/**
 * Bank Statement PDF Parser
 * Parses PDF bank statements from major Indian banks and extracts transactions
 */

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category?: string;
  merchant?: string;
  balance?: number;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  bankName: string;
  accountNumber?: string;
  statementPeriod?: { from: string; to: string };
  error?: string;
}

// Category mapping based on common transaction descriptions
const CATEGORY_MAPPINGS: Record<string, { category: string; type: 'income' | 'expense' }> = {
  // Income patterns
  'salary': { category: 'Salary', type: 'income' },
  'neft cr': { category: 'Bank Transfer', type: 'income' },
  'imps cr': { category: 'Bank Transfer', type: 'income' },
  'upi cr': { category: 'UPI Payment', type: 'income' },
  'interest': { category: 'Interest', type: 'income' },
  'dividend': { category: 'Investment', type: 'income' },
  'refund': { category: 'Refund', type: 'income' },
  'cashback': { category: 'Cashback', type: 'income' },

  // Expense patterns
  'atm': { category: 'ATM Withdrawal', type: 'expense' },
  'pos': { category: 'Shopping', type: 'expense' },
  'neft dr': { category: 'Bank Transfer', type: 'expense' },
  'imps dr': { category: 'Bank Transfer', type: 'expense' },
  'upi': { category: 'UPI Payment', type: 'expense' },
  'emi': { category: 'EMI', type: 'expense' },
  'loan': { category: 'Loan', type: 'expense' },
  'insurance': { category: 'Insurance', type: 'expense' },
  'electricity': { category: 'Utilities', type: 'expense' },
  'mobile': { category: 'Mobile Recharge', type: 'expense' },
  'recharge': { category: 'Recharge', type: 'expense' },
  'swiggy': { category: 'Food & Dining', type: 'expense' },
  'zomato': { category: 'Food & Dining', type: 'expense' },
  'amazon': { category: 'Shopping', type: 'expense' },
  'flipkart': { category: 'Shopping', type: 'expense' },
  'uber': { category: 'Transportation', type: 'expense' },
  'ola': { category: 'Transportation', type: 'expense' },
  'rapido': { category: 'Transportation', type: 'expense' },
  'netflix': { category: 'Entertainment', type: 'expense' },
  'spotify': { category: 'Entertainment', type: 'expense' },
  'hotstar': { category: 'Entertainment', type: 'expense' },
  'rent': { category: 'Rent', type: 'expense' },
  'grocery': { category: 'Groceries', type: 'expense' },
  'bigbasket': { category: 'Groceries', type: 'expense' },
  'blinkit': { category: 'Groceries', type: 'expense' },
  'zepto': { category: 'Groceries', type: 'expense' },
  'medical': { category: 'Healthcare', type: 'expense' },
  'pharmacy': { category: 'Healthcare', type: 'expense' },
  'hospital': { category: 'Healthcare', type: 'expense' },
  'petrol': { category: 'Fuel', type: 'expense' },
  'fuel': { category: 'Fuel', type: 'expense' },
  'hp': { category: 'Fuel', type: 'expense' },
  'iocl': { category: 'Fuel', type: 'expense' },
  'bpcl': { category: 'Fuel', type: 'expense' },
};

// Detect bank from PDF content
function detectBank(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('hdfc bank') || lowerText.includes('hdfcbank')) return 'HDFC';
  if (lowerText.includes('icici bank') || lowerText.includes('icicibank')) return 'ICICI';
  if (lowerText.includes('state bank of india') || lowerText.includes('sbi')) return 'SBI';
  if (lowerText.includes('axis bank') || lowerText.includes('axisbank')) return 'AXIS';
  if (lowerText.includes('kotak mahindra') || lowerText.includes('kotak bank')) return 'KOTAK';
  if (lowerText.includes('punjab national bank') || lowerText.includes('pnb')) return 'PNB';
  if (lowerText.includes('bank of baroda') || lowerText.includes('bob')) return 'BOB';
  if (lowerText.includes('canara bank')) return 'CANARA';
  if (lowerText.includes('union bank')) return 'UNION';
  if (lowerText.includes('idbi bank')) return 'IDBI';
  if (lowerText.includes('yes bank')) return 'YES';
  if (lowerText.includes('indusind')) return 'INDUSIND';

  return 'UNKNOWN';
}

// Parse date from various Indian bank formats
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Common Indian date formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // DD/MM/YY or DD-MM-YY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,
    // DD Mon YYYY (e.g., 15 Jan 2024)
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
    // DD-Mon-YYYY (e.g., 15-Jan-2024)
    /(\d{1,2})[\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\-](\d{4})/i,
    // YYYY-MM-DD (ISO format)
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ];

  const monthMap: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day: string, month: string, year: string;

      if (format.source.includes('ISO')) {
        // YYYY-MM-DD
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else if (format.source.includes('Mon')) {
        // DD Mon YYYY
        day = match[1].padStart(2, '0');
        month = monthMap[match[2].toLowerCase()];
        year = match[3];
      } else {
        // DD/MM/YYYY or DD/MM/YY
        day = match[1].padStart(2, '0');
        month = match[2].padStart(2, '0');
        year = match[3].length === 2 ? `20${match[3]}` : match[3];
      }

      // Validate
      const numDay = parseInt(day);
      const numMonth = parseInt(month);
      if (numDay >= 1 && numDay <= 31 && numMonth >= 1 && numMonth <= 12) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  return null;
}

// Parse amount from string (handles Indian number format)
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove currency symbols and spaces
  let cleaned = amountStr.replace(/[₹Rs\.INR\s]/gi, '').trim();

  // Handle Indian number format (1,00,000.00)
  cleaned = cleaned.replace(/,/g, '');

  // Handle Dr/Cr suffix
  const isDebit = /dr\.?$/i.test(cleaned);
  const isCredit = /cr\.?$/i.test(cleaned);
  cleaned = cleaned.replace(/(dr|cr)\.?$/i, '').trim();

  // Handle parentheses for negative numbers
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  if (isNegative) {
    cleaned = cleaned.slice(1, -1);
  }

  const amount = parseFloat(cleaned);

  if (isNaN(amount)) return null;

  // Return absolute value with sign info based on Dr/Cr
  return Math.abs(amount);
}

// Categorize transaction based on description
function categorizeTransaction(description: string): { category: string; type: 'income' | 'expense' } {
  const lowerDesc = description.toLowerCase();

  for (const [keyword, mapping] of Object.entries(CATEGORY_MAPPINGS)) {
    if (lowerDesc.includes(keyword)) {
      return mapping;
    }
  }

  // Default categorization based on common patterns
  if (lowerDesc.includes('cr') || lowerDesc.includes('credit')) {
    return { category: 'Other Income', type: 'income' };
  }

  return { category: 'Other Expense', type: 'expense' };
}

// Extract merchant name from description
function extractMerchant(description: string): string | undefined {
  const lowerDesc = description.toLowerCase();

  // Common merchant patterns
  const merchants = [
    'swiggy', 'zomato', 'amazon', 'flipkart', 'uber', 'ola', 'rapido',
    'netflix', 'spotify', 'hotstar', 'bigbasket', 'blinkit', 'zepto',
    'paytm', 'phonepe', 'gpay', 'google pay', 'myntra', 'nykaa',
    'cred', 'slice', 'simpl', 'lazypay'
  ];

  for (const merchant of merchants) {
    if (lowerDesc.includes(merchant)) {
      return merchant.charAt(0).toUpperCase() + merchant.slice(1);
    }
  }

  // Try to extract UPI ID merchant
  const upiMatch = description.match(/@([a-zA-Z]+)/);
  if (upiMatch) {
    return upiMatch[1].toUpperCase();
  }

  return undefined;
}

// Generic parser for CSV-like PDF text
function parseGenericStatement(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');

  // Look for transaction lines with date, description, and amount patterns
  for (const line of lines) {
    // Skip headers and empty lines
    if (!line.trim() || line.includes('Date') && line.includes('Description')) continue;

    // Try to find date at the start of line
    const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (!dateMatch) continue;

    const date = parseDate(dateMatch[1]);
    if (!date) continue;

    // Find amounts (look for numbers that look like money)
    const amountMatches = line.match(/[\d,]+\.\d{2}/g);
    if (!amountMatches || amountMatches.length === 0) continue;

    // Usually last amount is balance, second to last is transaction amount
    const amountStr = amountMatches.length >= 2
      ? amountMatches[amountMatches.length - 2]
      : amountMatches[0];

    const amount = parseAmount(amountStr);
    if (!amount || amount === 0) continue;

    // Extract description (text between date and amounts)
    const descStart = line.indexOf(dateMatch[1]) + dateMatch[1].length;
    const descEnd = line.lastIndexOf(amountStr);
    let description = line.substring(descStart, descEnd).trim();

    // Clean up description
    description = description.replace(/\s+/g, ' ').trim();
    if (!description) description = 'Transaction';

    // Determine if credit or debit
    const isCredit = line.toLowerCase().includes('cr') ||
                     line.includes('CR') ||
                     (amountMatches.length >= 2 && line.indexOf(amountStr) < line.lastIndexOf(amountMatches[amountMatches.length - 1]));

    const { category, type } = categorizeTransaction(description);
    const finalType = isCredit ? 'income' : type;

    transactions.push({
      date,
      description,
      amount,
      type: finalType,
      category: isCredit && type === 'expense' ? 'Other Income' : category,
      merchant: extractMerchant(description),
    });
  }

  return transactions;
}

// Main parse function - takes PDF text content
export async function parseBankStatement(pdfText: string): Promise<ParseResult> {
  try {
    const bankName = detectBank(pdfText);
    const transactions = parseGenericStatement(pdfText);

    // Try to extract account number
    const accountMatch = pdfText.match(/account\s*(?:no|number)?\.?\s*:?\s*(\d{4,})/i);
    const accountNumber = accountMatch ? accountMatch[1] : undefined;

    // Try to extract statement period
    const periodMatch = pdfText.match(/(?:statement\s+(?:period|from))?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(?:to|[-–])\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
    const statementPeriod = periodMatch ? {
      from: parseDate(periodMatch[1]) || periodMatch[1],
      to: parseDate(periodMatch[2]) || periodMatch[2],
    } : undefined;

    return {
      transactions,
      bankName,
      accountNumber,
      statementPeriod,
    };
  } catch (error) {
    return {
      transactions: [],
      bankName: 'UNKNOWN',
      error: error instanceof Error ? error.message : 'Failed to parse PDF',
    };
  }
}

// Utility to read PDF as text (requires pdf.js or similar)
export async function extractTextFromPDF(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        // Dynamically import pdf.js
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }

        resolve(fullText);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
