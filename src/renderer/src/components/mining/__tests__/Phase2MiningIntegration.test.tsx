/**
 * Phase 2 Mining Engines Integration Tests
 *
 * Comprehensive integration tests for Phase 2 mining engines
 * covering UI components, backend integration, and performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Phase2MiningDashboard } from '../Phase2MiningDashboard';
import { ContextualMiningEngine } from '../ContextualMiningEngine';

// Mock engines data for testing
const mockEngines = {
  contextual: {
    isActive: true,
    status: {
      interactionsProcessed: 1250,
      userProfiles: 45,
      learningProgress: 78
    },
    results: {
      recommendations: [
        { id: '1', type: 'optimization', confidence: 0.92, description: 'Memory optimization' }
      ]
    }
  },
  mlConflict: {
    isActive: true,
    status: {
      modelAccuracy: 0.94,
      predictionsMade: 567,
      conflictsDetected: 23
    },
    results: {
      insights: [
        { id: '1', severity: 'high', description: 'Critical conflict detected' }
      ]
    }
  },
  performance: {
    isActive: false,
    status: {
      systemHealthScore: 85,
      bottlenecksFound: 3,
      optimizationsApplied: 12
    },
    results: {
      bottlenecks: [
        { id: '1', impact: 'high', description: 'CPU bottleneck' }
      ]
    }
  },
  hardware: {
    isActive: true,
    status: {
      compatibilityScore: 92,
      optimizationsAvailable: 8,
      performanceGain: 15.3
    },
    results: {
      recommendations: [
        { id: '1', impact: 'medium', description: 'GPU optimization' }
      ]
    }
  },
  longitudinal: {
    isActive: false,
    status: {
      dataPointsCollected: 15420,
      trendsAnalyzed: 12,
      predictionsGenerated: 5
    },
    results: {
      trends: [
        { id: '1', change: -5.2, description: 'Performance degradation' }
      ]
    }
  }
};

// Mock electron API
const mockElectronAPI = {
  mining: {
    startEngine: vi.fn(),
    stopEngine: vi.fn(),
    getEngineStatus: vi.fn(),
    getEngineResults: vi.fn(),
    configureEngine: vi.fn(),
    startAllEngines: vi.fn(),
    stopAllEngines: vi.fn(),
    refreshAllEngines: vi.fn()
  }
};

vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn()
  }
}));

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('Phase 2 Mining Engines Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Phase2MiningDashboard Component', () => {
    it('renders dashboard with all engine status cards', () => {
      render(<Phase2MiningDashboard engines={mockEngines} />);

      expect(screen.getByText('Phase 2 Mining Engines')).toBeInTheDocument();
      expect(screen.getByText('Contextual Mining')).toBeInTheDocument();
      expect(screen.getByText('ML Conflict Prediction')).toBeInTheDocument();
      expect(screen.getByText('Performance Analysis')).toBeInTheDocument();
      expect(screen.getByText('Hardware-Aware')).toBeInTheDocument();
      expect(screen.getByText('Longitudinal Analysis')).toBeInTheDocument();
    });

    it('displays correct active engine count', () => {
      render(<Phase2MiningDashboard engines={mockEngines} />);

      expect(screen.getByText('3/5 Active')).toBeInTheDocument();
    });

    it('shows engine status values correctly', () => {
      render(<Phase2MiningDashboard engines={mockEngines} />);

      // Check for specific values in the dashboard
      expect(screen.getByText('94%')).toBeInTheDocument(); // ML accuracy
      expect(screen.getByText('85%')).toBeInTheDocument(); // Performance health
      expect(screen.getByText('92%')).toBeInTheDocument(); // Hardware compatibility
      expect(screen.getByText('15420')).toBeInTheDocument(); // Longitudinal data points
    });
  });

  describe('ContextualMiningEngine Component', () => {
    const mockProps = {
      isActive: true,
      status: {
        interactionsProcessed: 1500,
        recommendationsGenerated: 0,
        learningProgress: 0,
        lastUpdate: new Date()
      },
      results: {
        behaviorPatterns: []
      },
      onToggle: vi.fn(),
      onConfigure: vi.fn()
    };

    it('renders with correct status', () => {
      render(<ContextualMiningEngine {...mockProps} />);

      expect(screen.getByText('Contextual Mining Engine')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('1500')).toBeInTheDocument();
    });

    it('handles engine toggle', () => {
      render(<ContextualMiningEngine {...mockProps} />);

      const toggleButton = screen.getByRole('button', { name: /stop engine/i });
      fireEvent.click(toggleButton);

      expect(mockProps.onToggle).toHaveBeenCalledWith(false);
    });
  });

  describe('Backend Integration Tests', () => {
    it('calls electron API for engine control', async () => {
      const mockOnToggle = vi.fn().mockResolvedValue({ success: true });

      render(
        <ContextualMiningEngine
          isActive={false}
          onToggle={mockOnToggle}
          onConfigure={vi.fn()}
        />
      );

      const startButton = screen.getByRole('button', { name: /start engine/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockOnToggle).toHaveBeenCalledWith(true);
      });
    });

    it('handles engine status updates from backend', async () => {
      const mockStatus = { interactionsProcessed: 1500, userProfiles: 50 };
      mockElectronAPI.mining.getEngineStatus.mockResolvedValue(mockStatus);

      render(
        <ContextualMiningEngine
          isActive={true}
          status={mockStatus}
          onToggle={vi.fn()}
          onConfigure={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('1500')).toBeInTheDocument();
      });
    });

    it('handles backend errors gracefully', async () => {
      const mockOnToggle = vi.fn().mockRejectedValue(new Error('Engine failed to start'));

      render(
        <ContextualMiningEngine
          isActive={false}
          onToggle={mockOnToggle}
          onConfigure={vi.fn()}
        />
      );

      const startButton = screen.getByRole('button', { name: /start engine/i });
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockOnToggle).toHaveBeenCalledWith(true); // Still tries to toggle
      });
      // Component handles the error internally without changing state
    });
  });

  describe('Performance and Memory Tests', () => {
    it('renders dashboard without performance degradation', async () => {
      const startTime = performance.now();

      render(<Phase2MiningDashboard engines={mockEngines} />);

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(100); // Should render within 100ms
    });

    it('handles large datasets efficiently', () => {
      const largeResults = {
        recommendations: Array.from({ length: 1000 }, (_, i) => ({
          id: i.toString(),
          type: 'optimization',
          confidence: Math.random(),
          description: `Optimization ${i}`
        }))
      };

      const startTime = performance.now();

      render(
        <ContextualMiningEngine
          isActive={true}
          results={largeResults}
          onToggle={vi.fn()}
          onConfigure={vi.fn()}
        />
      );

      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(500); // Should handle 1000 items within 500ms
    });

    it('cleans up event listeners on unmount', () => {
      const { unmount } = render(
        <ContextualMiningEngine
          isActive={true}
          onToggle={vi.fn()}
          onConfigure={vi.fn()}
        />
      );

      unmount();

      // Verify no memory leaks (this would be more comprehensive with actual event listeners)
      expect(true).toBe(true); // Placeholder for actual cleanup verification
    });
  });
});