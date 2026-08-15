import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import PhaseCard from '@/components/PhaseCard';
import { flowchartData, FlowchartKey } from '@/data/flowcharts';
import { useTheme } from 'next-themes';

const PhasesPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [selectedPhase, setSelectedPhase] = useState<FlowchartKey>('main');
  const isDark = theme === 'dark';

  const phases = [
    {
      key: 'main' as FlowchartKey,
      title: 'System Overview',
      description: 'Complete AI-powered financial assistance system',
      features: ['Multi-agent AI', 'Real-time Processing', 'Emergency Response'],
      color: 'from-slate-700 to-slate-800',
      icon: '🧠'
    },
    {
      key: 'phase0' as FlowchartKey,
      title: 'Offline-First Engine',
      description: 'Device-first data collection and processing',
      features: ['Local Storage', 'Smart Sync', 'Privacy Protection'],
      color: 'from-slate-600 to-slate-700',
      icon: '💾'
    },
    {
      key: 'features' as FlowchartKey,
      title: 'Core Features',
      description: 'Key capabilities and user benefits',
      features: ['Income Tracking', 'Smart Budgeting', 'Tax Management'],
      color: 'from-emerald-600 to-emerald-700',
      icon: '✨'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                System Architecture
              </h1>
              <p className="text-muted-foreground mt-2">
                Discover how KAMAI's AI-powered system works behind the scenes
              </p>
            </div>
          </div>
          
          <Button
            onClick={() => navigate('/signup')}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80"
          >
            Get Started
            <ArrowRight size={16} />
          </Button>
        </div>

        {/* Phase Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.key}
              phase={phase}
              isActive={selectedPhase === phase.key}
              onClick={() => setSelectedPhase(phase.key)}
            />
          ))}
        </div>

        {/* Selected Phase Display */}
        <Card className="p-8">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Badge className={`bg-gradient-to-r ${phases.find(p => p.key === selectedPhase)?.color} text-white px-3 py-1`}>
                {flowchartData[selectedPhase].title}
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              {flowchartData[selectedPhase].description}
            </p>
          </div>

          {/* Mermaid Diagram */}
          <div className="rounded-lg border border-border overflow-hidden">
            <MermaidDiagram 
              code={flowchartData[selectedPhase].code}
              isDark={isDark}
            />
          </div>
        </Card>

        {/* Technical Highlights */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">2-Second Response</h3>
            <p className="text-sm text-muted-foreground">
              Emergency financial decisions processed instantly
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-semibold mb-2">100% Offline</h3>
            <p className="text-sm text-muted-foreground">
              Core functionality works without internet connection
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="text-3xl mb-3">🧠</div>
            <h3 className="font-semibold mb-2">Multi-Agent AI</h3>
            <p className="text-sm text-muted-foreground">
              4 specialized agents working in parallel
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="text-3xl mb-3">🔄</div>
            <h3 className="font-semibold mb-2">Continuous Learning</h3>
            <p className="text-sm text-muted-foreground">
              System adapts to your unique financial patterns
            </p>
          </Card>
        </div>

        {/* Technology Stack Section */}
        <Card className="mt-12 p-8">
          <h2 className="text-2xl font-bold mb-6">Technology Stack</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Gemini 2.5 Flash + Groq', category: 'AI/LLM' },
              { name: 'React + TypeScript', category: 'Frontend' },
              { name: 'Vite', category: 'Build Tool' },
              { name: 'FastAPI', category: 'Backend' },
              { name: 'Supabase', category: 'Database & Auth' },
              { name: 'PostgreSQL', category: 'Database' },
              { name: 'Tailwind CSS', category: 'Styling' },
              { name: 'shadcn/ui', category: 'UI Components' }
            ].map((tech, idx) => (
              <div key={idx} className="text-center p-4 rounded-lg bg-muted/50">
                <div className="font-medium text-sm">{tech.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{tech.category}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Experience the Power</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            See how our advanced AI system can transform your financial management today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              Start Free Trial
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/features')}
            >
              View Features
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhasesPage;