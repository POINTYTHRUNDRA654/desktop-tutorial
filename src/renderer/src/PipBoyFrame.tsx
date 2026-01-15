import React from 'react';

/**
 * PipBoyFrame Component
 * Wraps the entire application in an authentic Pip-Boy 3000 Mk IV bezel.
 */
const PipBoyFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="pipboy-outer-container">
      {/* Authentic Pip-Boy Bezel Wrapper */}
      <div className="pipboy-bezel">
        {/* The "Casing" background effects */}
        <div className="pipboy-bezel-texture"></div>
        
        {/* Screen Content Wrapper */}
        <div className="pipboy-screen-area">
          {/* Subtle Screen Reflection overlay */}
          <div className="pipboy-screen-reflection"></div>
          
          {/* Actual App Content */}
          <div className="pipboy-content">
            {children}
          </div>
        </div>
        
        {/* Decorative Hardware Pieces (Screws, Dials - simulated with CSS) */}
        <div className="pipboy-hardware-screw top-left"></div>
        <div className="pipboy-hardware-screw top-right"></div>
        <div className="pipboy-hardware-screw bottom-left"></div>
        <div className="pipboy-hardware-screw bottom-right"></div>
        
        <div className="pipboy-label-top">ROBCO INDUSTRIES</div>
        <div className="pipboy-label-bottom">PIP-BOY 3000 MK IV</div>
      </div>

      <style>{`
        .pipboy-outer-container {
          width: 100vw;
          height: 100vh;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 1.5rem;
        }

        .pipboy-bezel {
          position: relative;
          width: 100%;
          height: 100%;
          background: #2a2a2a;
          background: linear-gradient(145deg, #3a3a3a 0%, #1a1a1a 100%);
          border-radius: 80px;
          padding: 60px;
          box-shadow: 
            inset 0 0 60px rgba(0,0,0,1),
            0 30px 60px rgba(0,0,0,0.8),
            0 0 100px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          border: 4px solid #1c1c1c;
        }

        .pipboy-bezel-texture {
          position: absolute;
          inset: 0;
          border-radius: 80px;
          background-image: 
            radial-gradient(circle at 10% 10%, rgba(255,255,255,0.08) 0%, transparent 30%),
            radial-gradient(circle at 90% 90%, rgba(0,0,0,0.3) 0%, transparent 40%);
          pointer-events: none;
          z-index: 1;
        }

        .pipboy-screen-area {
          position: relative;
          flex: 1;
          background: #000;
          border-radius: 50px;
          overflow: hidden;
          box-shadow: 
            inset 0 0 50px rgba(0,0,0,1),
            0 0 20px rgba(0,255,0,0.05);
          border: 20px solid #141414;
          z-index: 2;
          transform: perspective(1000px) rotateX(0.5deg);
        }

        .pipboy-screen-reflection {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.05) 0%,
            rgba(255,255,255,0.1) 25%,
            rgba(255,255,255,0) 50%,
            rgba(255,255,255,0.02) 100%
          );
          pointer-events: none;
          z-index: 1000;
        }

        .pipboy-content {
          width: 100%;
          height: 100%;
          border-radius: 40px;
          overflow: hidden;
          background: #000;
        }

        .pipboy-label-top {
          position: absolute;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Share Tech Mono', monospace;
          color: #555;
          font-size: 11px;
          letter-spacing: 5px;
          font-weight: 800;
          z-index: 5;
          transition: color 0.5s ease;
        }

        body.pip-boy-mode .pipboy-label-top,
        body.pip-boy-mode .pipboy-label-bottom {
          color: #7a5a2a;
        }

        body.pip-boy-mode .pipboy-screen-area {
          border-color: #2a1f1a;
          box-shadow: 
            inset 0 0 50px rgba(0,0,0,1),
            0 0 20px rgba(230,176,74,0.05);
        }

        .pipboy-label-bottom {
          position: absolute;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Share Tech Mono', monospace;
          color: #555;
          font-size: 14px;
          letter-spacing: 3px;
          font-weight: 800;
          z-index: 5;
        }

        .pipboy-hardware-screw {
          position: absolute;
          width: 18px;
          height: 18px;
          background: #1a1a1a;
          border-radius: 50%;
          border: 1px solid #111;
          box-shadow: 
            inset -2px -2px 5px rgba(255,255,255,0.05),
            2px 2px 5px rgba(0,0,0,0.5);
          z-index: 5;
        }

        .pipboy-hardware-screw::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 20%;
          right: 20%;
          height: 2px;
          background: #111;
          transform: translateY(-50%) rotate(45deg);
        }

        .top-left { top: 25px; left: 25px; }
        .top-right { top: 25px; right: 25px; }
        .bottom-left { bottom: 25px; left: 25px; }
        .bottom-right { bottom: 25px; right: 25px; }

        @media (max-width: 1024px) {
          .pipboy-bezel {
            padding: 30px;
            border-radius: 40px;
          }
          .pipboy-screen-area {
            border-width: 10px;
            border-radius: 30px;
          }
          .pipboy-content {
            border-radius: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default PipBoyFrame;
