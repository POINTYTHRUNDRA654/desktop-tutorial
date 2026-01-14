import React from 'react';
import { MessageSquare } from 'lucide-react';

const ChatFallback: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-[#0a0e0a]">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <MessageSquare className="w-16 h-16 text-[#00ff00] mx-auto" />
          <h1 className="text-3xl font-bold text-[#00ff00]">MOSSY CHAT</h1>
          <p className="text-[#00ff00] text-lg">Ready to assist with Fallout 4 modding</p>
          <div className="text-[#00aa00] text-sm mt-6 bg-[#1a1f1a] p-4 rounded border border-[#00ff00]/20">
            <p>Type your question about modding</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatFallback;
