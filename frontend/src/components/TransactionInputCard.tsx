import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, Mic, PenLine, ChevronDown, ChevronUp, Square } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import db from "@/services/database";
import { toast } from "sonner";

// API endpoint for transaction parser (update this to match your server)
const PARSER_API_URL = import.meta.env.VITE_PARSER_API_URL || "http://localhost:8001/api";

interface TransactionInputCardProps {
  onSuccess?: () => void;
}

const TransactionInputCard = ({ onSuccess }: TransactionInputCardProps) => {
  const [activeMode, setActiveMode] = useState<"manual" | "image" | "voice">("manual");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Manual transaction form state
  const [formData, setFormData] = useState({
    amount: "",
    transaction_type: "expense" as "income" | "expense",
    transaction_date: new Date(),
    transaction_time: new Date().toTimeString().slice(0, 5), // HH:mm, matches <input type="time">'s required format
    category: "",
    subcategory: "",
    payment_method: "",
    account_id: "",
    source: "",
    description: "",
    merchant_name: "",
    location: "",
    tags: [] as string[],
    is_recurring: false,
    recurring_frequency: "",
  });

  const categories = {
    income: ["Delivery", "Freelance", "Salary", "Other"],
    expense: ["Food", "Fuel", "Rent", "Groceries", "Maintenance", "Phone", "EMI", "Misc"],
  };

  const paymentMethods = ["UPI", "Cash", "Card", "Bank Transfer"];
  const recurringFrequencies = ["Daily", "Weekly", "Monthly", "Custom"];

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) {
      toast.error("Please fill required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await db.transactions.create({
        transaction_date: format(formData.transaction_date, "yyyy-MM-dd"),
        transaction_time: formData.transaction_time,
        amount: parseFloat(formData.amount),
        transaction_type: formData.transaction_type,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        description: formData.description || undefined,
        payment_method: formData.payment_method || undefined,
        merchant_name: formData.merchant_name || undefined,
        location: formData.location || undefined,
        source: formData.source || undefined,
        account_id: formData.account_id || undefined,
        is_recurring: formData.is_recurring,
        recurring_frequency: formData.recurring_frequency || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      });
      toast.success("Transaction added successfully!");
      // Reset form
      setFormData({
        amount: "",
        transaction_type: "expense",
        transaction_date: new Date(),
        transaction_time: new Date().toTimeString().slice(0, 5), // HH:mm, matches <input type="time">'s required format
        category: "",
        subcategory: "",
        payment_method: "",
        account_id: "",
        source: "",
        description: "",
        merchant_name: "",
        location: "",
        tags: [],
        is_recurring: false,
        recurring_frequency: "",
      });
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    toast.info("Processing image...");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch(`${PARSER_API_URL}/parse-image`, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Fill form with extracted data
      const parsedDate = result.transaction_date
        ? new Date(result.transaction_date)
        : new Date();

      setFormData((prev) => ({
        ...prev,
        amount: result.amount?.toString() || "",
        transaction_type: (result.transaction_type || "expense") as "income" | "expense",
        category: result.category || "",
        merchant_name: result.merchant_name || "",
        description: result.description || "",
        payment_method: result.payment_method || "",
        location: result.location || "",
        transaction_date: parsedDate,
        transaction_time: result.transaction_time || prev.transaction_time,
      }));

      // Switch to manual tab for review
      setActiveMode("manual");
      const confidence = result.confidence ? (result.confidence * 100).toFixed(0) : "N/A";
      toast.success(`Transaction extracted! (Confidence: ${confidence}%) Please review and confirm.`);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error(
        error instanceof Error
          ? `Failed to process image: ${error.message}`
          : "Failed to process image. Make sure the parser API server is running."
      );
    } finally {
      setIsProcessing(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await processVoiceRecording(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording... Click stop when done.");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Processing voice...");
    }
  };

  const processVoiceRecording = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", audioBlob, "recording.wav");

      const response = await fetch(`${PARSER_API_URL}/parse-voice`, {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Fill form with extracted data
      const parsedDate = result.transaction_date
        ? new Date(result.transaction_date)
        : new Date();

      setFormData((prev) => ({
        ...prev,
        amount: result.amount?.toString() || "",
        transaction_type: (result.transaction_type || "expense") as "income" | "expense",
        category: result.category || "",
        merchant_name: result.merchant_name || "",
        description: result.description || "",
        payment_method: result.payment_method || "",
        location: result.location || "",
        transaction_date: parsedDate,
        transaction_time: result.transaction_time || prev.transaction_time,
      }));

      // Switch to manual tab for review
      setActiveMode("manual");
      const confidence = result.confidence ? (result.confidence * 100).toFixed(0) : "N/A";
      toast.success(`Transaction extracted! (Confidence: ${confidence}%) Please review and confirm.`);
    } catch (error) {
      console.error("Error processing voice:", error);
      toast.error(
        error instanceof Error
          ? `Failed to process voice: ${error.message}`
          : "Failed to process voice. Make sure the parser API server is running."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  return (
    <Card className="p-6">
      <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as any)}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="image" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Image
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Voice
          </TabsTrigger>
        </TabsList>

        {/* Manual Mode */}
        <TabsContent value="manual">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {/* Amount & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(v) => setFormData({ ...formData, transaction_type: v as any, category: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.transaction_date, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.transaction_date}
                      onSelect={(date) => date && setFormData({ ...formData, transaction_date: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.transaction_time}
                  onChange={(e) => setFormData({ ...formData, transaction_time: e.target.value })}
                />
              </div>
            </div>

            {/* Category & Payment Method */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories[formData.transaction_type].map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Section Toggle */}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4 mr-2" /> : <ChevronDown className="w-4 h-4 mr-2" />}
              More Details
            </Button>

            {/* Advanced Fields */}
            {showAdvanced && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <Input
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="e.g., Uber, Swiggy"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Merchant Name</Label>
                    <Input
                      value={formData.merchant_name}
                      onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {/* Recurring */}
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_recurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                  />
                  <Label>Is this a recurring transaction?</Label>
                </div>

                {formData.is_recurring && (
                  <div className="space-y-2">
                    <Label>Recurring Frequency</Label>
                    <Select
                      value={formData.recurring_frequency}
                      onValueChange={(v) => setFormData({ ...formData, recurring_frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        {recurringFrequencies.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Transaction"}
            </Button>
          </form>
        </TabsContent>

        {/* Image Mode */}
        <TabsContent value="image">
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <Label htmlFor="image-upload" className="cursor-pointer">
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isProcessing}
                />
                <Button type="button" variant="outline" asChild disabled={isProcessing}>
                  <span>{isProcessing ? "Processing..." : "Upload Receipt/Bill Image"}</span>
                </Button>
              </Label>
              <p className="text-sm text-muted-foreground mt-2">
                {isProcessing
                  ? "Extracting transaction details..."
                  : "We'll extract transaction details automatically"}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Voice Mode */}
        <TabsContent value="voice">
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Mic className={cn(
                "w-12 h-12 mx-auto mb-4",
                isRecording ? "text-red-500 animate-pulse" : "text-muted-foreground"
              )} />
              <Button
                type="button"
                onClick={handleVoiceRecord}
                size="lg"
                disabled={isProcessing}
                variant={isRecording ? "destructive" : "default"}
              >
                {isRecording ? (
                  <>
                    <Square className="w-5 h-5 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                {isRecording
                  ? "Recording... Click stop when done"
                  : isProcessing
                  ? "Processing your voice..."
                  : "Speak your transaction details naturally"}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default TransactionInputCard;


