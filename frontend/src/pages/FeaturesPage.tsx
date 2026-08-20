import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import FeatureCard from '@/components/FeatureCard';
import { flowchartData, FlowchartKey } from '@/data/flowcharts';
import { useTheme } from 'next-themes';

const FeaturesPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [selectedFeature, setSelectedFeature] = useState<FlowchartKey>('features');
  const isDark = theme === 'dark';

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
                KAMAI Features
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore our comprehensive financial management capabilities
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

        {/* Feature Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(flowchartData).map(([key, data]) => (
            <FeatureCard
              key={key}
              data={data}
              isActive={selectedFeature === key}
              onClick={() => setSelectedFeature(key as FlowchartKey)}
            />
          ))}
        </div>

        {/* Selected Feature Display */}
        <Card className="p-8">
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Badge className={`bg-gradient-to-r ${flowchartData[selectedFeature].color} text-white px-3 py-1`}>
                {flowchartData[selectedFeature].title}
              </Badge>
            </div>
            <p className="text-muted-foreground text-lg">
              {flowchartData[selectedFeature].description}
            </p>
          </div>

          {/* Mermaid Diagram */}
          <div className="rounded-lg border border-border overflow-hidden">
            <MermaidDiagram 
              code={flowchartData[selectedFeature].code}
              isDark={isDark}
            />
          </div>
        </Card>

        {/* Key Benefits Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="text-2xl mb-3">🎯</div>
            <h3 className="font-semibold mb-2">Precision Targeting</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered analysis matches you with the most relevant financial opportunities
            </p>
          </Card>
          
          <Card className="p-6">
            <div className="text-2xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">Real-time Processing</h3>
            <p className="text-sm text-muted-foreground">
              Instant financial insights and recommendations as your situation changes
            </p>
          </Card>
          
          <Card className="p-6">
            <div className="text-2xl mb-3">🔒</div>
            <h3 className="font-semibold mb-2">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              Row-level security keeps your financial data isolated and private
            </p>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Finances?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Built for India's gig workers to take control of unpredictable income.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              Start Your Journey
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;