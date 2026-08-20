import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ArrowRight, 
  Check, 
  TrendingUp, 
  Shield, 
  Zap, 
  Brain, 
  Database, 
  Globe,
  ChevronRight,
  Linkedin
} from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    { 
      icon: Brain, 
      title: 'AI-Powered Insights', 
      desc: 'Gemini-powered financial analysis',
      color: 'from-slate-700 to-slate-800'
    },
    {
      icon: TrendingUp,
      title: 'Income Forecasting',
      desc: 'Forecasts built from your real transaction volatility',
      color: 'from-slate-600 to-slate-700'
    },
    {
      icon: Shield,
      title: 'Row-Level Security',
      desc: 'Every user\'s data isolated at the database level',
      color: 'from-emerald-600 to-emerald-700'
    },
    {
      icon: Zap,
      title: 'Fast Analysis',
      desc: 'Full financial analysis in under 2 minutes',
      color: 'from-slate-500 to-slate-600'
    },
    {
      icon: Database,
      title: 'Multi-Modal Input',
      desc: 'Log transactions by text, photo, or voice',
      color: 'from-slate-700 to-slate-800'
    },
    {
      icon: Globe,
      title: 'Risk & Savings',
      desc: 'Real risk scoring and investment guidance',
      color: 'from-emerald-500 to-emerald-600'
    },
  ];

  const team = [
    {
      name: 'Nikhileswara Rao Sulake',
      role: 'Medical Image Analysis Researcher | Computer Vision & Deep Learning',
      initials: 'NR',
      linkedin: 'https://www.linkedin.com/in/nikhileswara-rao-sulake/'
    },
    {
      name: 'Sai Manikanta Eswar Machara',
      role: 'Computer Vision Researcher | Medical Imaging | Deep Learning',
      initials: 'SM',
      linkedin: 'https://www.linkedin.com/in/sai-manikanta-eswar-machara/'
    },
    {
      name: 'Siva Teja Reddy Annapureddy',
      role: 'Machine Learning Engineer | Generative AI',
      initials: 'ST',
      linkedin: 'https://www.linkedin.com/in/siva-teja-reddy-annapureddy/'
    },
    {
      name: 'Likhith Busam',
      role: 'Agentic AI Specialist | Generative AI',
      initials: 'LB',
      linkedin: 'https://www.linkedin.com/in/likhith-busam-7b465a31b/'
    }
  ];

  const stats = [
    { number: '230M+', label: 'Gig Workers Targeted' },
    { number: '9', label: 'AI Agents' },
    { number: '<2 min', label: 'Full Analysis' },
    { number: '100%', label: 'Privacy Protected' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Brand Badge */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium mb-8"
            >
              <Brain size={16} />
              AI-Powered Financial Companion
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
                KAMAI
              </span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl text-slate-600 font-normal">
                Financial Intelligence
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-slate-600 mb-4 max-w-3xl mx-auto leading-relaxed"
            >
              Lakshmi Raave Maa Intiki: Your Smart Financial Companion for Daily Earnings
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-lg text-slate-500 mb-12 max-w-2xl mx-auto"
            >
              Empowering 230M+ gig workers with AI-powered financial intelligence, 
              personalized guidance, and proactive wealth management in real-time.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <Button
                size="lg"
                onClick={() => navigate('/signup')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Start Your Journey
                <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/phases')}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-6 text-lg font-medium"
              >
                View Architecture
                <ChevronRight className="ml-2" size={20} />
              </Button>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
            >
              {stats.map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + idx * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-slate-900 mb-1">{stat.number}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Intelligent Financial Management
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Advanced AI capabilities designed specifically for the unique challenges of gig economy workers
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow border-slate-200">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="text-white" size={24} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Button
              variant="outline"
              onClick={() => navigate('/features')}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Explore All Features
              <ArrowRight className="ml-2" size={16} />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-slate-900 text-white mb-6">About KAMAI</Badge>
              <h2 className="text-4xl font-bold text-slate-900 mb-6">
                Built for India's Gig Economy
              </h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Unlike traditional fintech solutions built for salaried workers, KAMAI understands 
                the unique challenges of gig work: daily volatility, seasonal fluctuations, weather 
                dependencies, and cultural spending cycles.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  'Connects to 200+ government schemes and opportunities',
                  'Tax compliance automation with deduction optimization',
                  'Real-time financial insights while maintaining 100% privacy',
                  'Multi-agent AI processing for personalized recommendations'
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} className="text-emerald-600" />
                    </div>
                    <span className="text-slate-600">{benefit}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => navigate('/phases')}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                Learn How It Works
                <ArrowRight className="ml-2" size={16} />
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <Card className="p-8 bg-white shadow-xl">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Brain className="text-white" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">
                    AI-Powered Intelligence
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Our multi-agent system computes real numbers from your real transaction
                    history, with strict data isolation enforced by Postgres Row-Level Security.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <div className="font-bold text-slate-900">9</div>
                      <div className="text-xs text-slate-600">AI Agents</div>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <div className="font-bold text-slate-900">&lt;2min</div>
                      <div className="text-xs text-slate-600">Full Analysis</div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Meet Our Team</h2>
            <p className="text-lg text-slate-600">
              Built by AI researchers and ML engineers with deep expertise in financial technology
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, idx) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 text-center hover:shadow-lg transition-shadow">
                  <Avatar className="w-16 h-16 mx-auto mb-4">
                    <AvatarFallback className="bg-slate-900 text-white text-lg font-semibold">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-slate-900 mb-2">{member.name}</h3>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">{member.role}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(member.linkedin, '_blank')}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <Linkedin size={16} />
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Financial Future?
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Join the revolution in financial management designed specifically for gig economy workers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/signup')}
                className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-6 text-lg font-medium"
              >
                Get Started Free
                <ArrowRight className="ml-2" size={20} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/features')}
                className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white px-8 py-6 text-lg font-medium"
              >
                Explore Features
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;