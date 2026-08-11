import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Brain, TrendingUp, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useApp();
  const [activeTab, setActiveTab] = useState<"login" | "signup">(
    location.pathname === "/signup" ? "signup" : "login"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loginData, setLoginData] = useState({
    phone_number: "",
    password: "",
  });

  const [signupData, setSignupData] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    password: "",
    confirm_password: "",
    preferred_language: "en",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.phone_number || !loginData.password) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      setIsLoading(true);
      await login(loginData.phone_number, loginData.password);
      toast.success("Login successful!");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Login failed";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupData.full_name || !signupData.phone_number || !signupData.password) {
      toast.error("Please fill all required fields");
      return;
    }
    if (signupData.password !== signupData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    if (signupData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      setIsLoading(true);
      await signup({
        full_name: signupData.full_name,
        phone_number: signupData.phone_number,
        email: signupData.email || undefined,
        password: signupData.password,
        occupation: "",
        city: "",
      });
      toast.success("Account created successfully!");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Signup failed";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Brain, text: "AI-Powered Financial Analysis" },
    { icon: TrendingUp, text: "Income Forecasting" },
    { icon: Shield, text: "Offline-First Privacy" },
    { icon: Zap, text: "Real-time Automation" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left: Brand Explanation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:block space-y-6"
        >
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 bg-clip-text text-transparent mb-4">
              KAMAI
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your smart financial companion for daily earnings. AI-powered insights for India's gig economy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {features.map(({ icon: Icon, text }, index) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-white rounded-xl p-4 shadow-lg border border-slate-200"
              >
                <Icon className="w-6 h-6 text-slate-700 mb-2" />
                <p className="text-sm font-medium text-slate-900">{text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right: Auth Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full"
        >
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
                  <p className="text-muted-foreground">Login to your KAMAI account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-phone">Phone Number</Label>
                    <Input
                      id="login-phone"
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      value={loginData.phone_number}
                      onChange={(e) =>
                        setLoginData({ ...loginData, phone_number: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      disabled={isLoading}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </div>

                  <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Login
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  {/* Not wired up: users sign up with a synthetic shadow email
                      (see shadowEmail() in database.ts), so Supabase's
                      built-in resetPasswordForEmail() won't reach most
                      accounts. Needs a phone-based reset flow first. */}
                  <button className="text-sm text-slate-600 hover:text-slate-900 hover:underline">Forgot password?</button>
                </div>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Create your account</h2>
                  <p className="text-muted-foreground">Start your financial journey with KAMAI</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name *</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Rajesh Kumar"
                      value={signupData.full_name}
                      onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                      disabled={isLoading}
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number *</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="9876543210"
                      maxLength={10}
                      value={signupData.phone_number}
                      onChange={(e) =>
                        setSignupData({ ...signupData, phone_number: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      disabled={isLoading}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email (Optional)</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password *</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Confirm your password"
                      value={signupData.confirm_password}
                      onChange={(e) => setSignupData({ ...signupData, confirm_password: e.target.value })}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-language">Preferred Language</Label>
                    <Select
                      value={signupData.preferred_language}
                      onValueChange={(v) => setSignupData({ ...signupData, preferred_language: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="ta">Tamil</SelectItem>
                        <SelectItem value="te">Telugu</SelectItem>
                        <SelectItem value="kn">Kannada</SelectItem>
                        <SelectItem value="mr">Marathi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Sign Up
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;

