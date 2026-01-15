import React, { useState, useEffect } from 'react';
import { LocalAIEngine } from './LocalAIEngine';

interface StartupStep {
  text: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  delay: number;
}

export const PipBoyStartup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [steps, setSteps] = useState<StartupStep[]>([
    { text: 'VERIFYING HARDWARE INTERFACE...', status: 'pending', delay: 800 },
    { text: 'INITIALIZING ROBCO BIOS v4.0.2...', status: 'pending', delay: 1000 },
    { text: 'SCANNING FOR FALLOUT 4 INSTALLATION...', status: 'pending', delay: 1500 },
    { text: 'CHECKING F4SE STATUS...', status: 'pending', delay: 1200 },
    { text: 'SYNCING WITH NEURAL LINK...', status: 'pending', delay: 900 },
    { text: 'LOADING MOSSY BRAIN MODULES...', status: 'pending', delay: 2000 },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (currentStep < steps.length) {
      const step = steps[currentStep];
      
      const timer = setTimeout(() => {
        setSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: 'in-progress' } : s));
        
        // Execute boot sequence
        setTimeout(async () => {
          setSteps(prev => prev.map((s, i) => i === currentStep ? { ...s, status: 'completed' } : s));
          setLogs(prev => [...prev, `[OK] ${step.text}`]);
          setCurrentStep(currentStep + 1);

          // Real logic for certain steps
          if (step.text === 'SCANNING FOR FALLOUT 4 INSTALLATION...') {
            localStorage.setItem('mossy_system_profile', JSON.stringify({
                detected: true,
                version: '1.10.163',
                f4se: '0.6.23',
                lastScan: new Date().toISOString()
            }));
          }

          if (step.text === 'SYNCING WITH NEURAL LINK...') {
            await LocalAIEngine.recordAction('neural_link', { status: 'established', quality: 'high' });
          }
        }, step.delay);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      // All steps complete
      const finalTimer = setTimeout(() => {
        setLogs(prev => [...prev, "[MOSSY] Neural network stable. I am ready, Architect."]);
        setTimeout(() => {
            onComplete();
        }, 1500);
      }, 1000);
      return () => clearTimeout(finalTimer);
    }
  }, [currentStep, steps, onComplete]);

  return (
    <div className="flex flex-col h-full w-full bg-black font-mono p-8 text-[#00ff00] overflow-hidden">
      <div className="mb-4 text-xs opacity-50">ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM</div>
      <div className="mb-8 text-2xl font-bold tracking-widest border-b border-[#00ff00] pb-2">PIP-BOY 3000 Mk IV</div>
      
      <div className="flex-1 space-y-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-sm border ${step.status === 'completed' ? 'bg-[#00ff00]' : 'border-[#00ff00]'} ${step.status === 'in-progress' ? 'animate-pulse' : ''}`}></div>
            <span className={step.status === 'pending' ? 'opacity-30' : ''}>
              {step.text}
            </span>
            {step.status === 'completed' && <span className="text-xs">[OK]</span>}
          </div>
        ))}
      </div>

      <div className="mt-8 border-t border-[#00ff00] pt-4 h-32 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="text-[10px] opacity-70">
            {log}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between items-end text-xs italic opacity-40">
        <div>MEMORY: 640KB RAM</div>
        <div>PROCESSOR: 1.2MHz</div>
      </div>
      
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
    </div>
  );
};

export default PipBoyStartup;
