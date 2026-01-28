import React from 'react';
import { Coffee, Heart, DollarSign, Github, ExternalLink } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

export const DonationSupport: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3 pb-6 border-b border-slate-700/50">
            <div className="flex justify-center">
              <Coffee className="w-16 h-16 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold text-white">Support Mossy</h1>
            <p className="text-slate-300 text-lg">
              Help keep your Fallout 4 modding companion caffeinated and running! ☕
            </p>
          </div>

          <ToolsInstallVerifyPanel
            accentClassName="text-amber-300"
            description="No tools needed. This page only opens official support links in your browser."
            verify={[
              'Click one support option and confirm it opens in your browser.',
              'Return to the app and confirm navigation/state is unchanged.'
            ]}
            troubleshooting={[
              'If links do not open, check Diagnostics and confirm openExternal is available (desktop bridge) or allow popups in your environment.'
            ]}
            shortcuts={[
              { label: 'Community Learning', to: '/community' },
              { label: 'Privacy Settings', to: '/settings/privacy' },
              { label: 'Diagnostics', to: '/diagnostics' },
            ]}
          />

          {/* Why Support Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Why Support?
            </h2>
            <div className="space-y-3 text-slate-300">
              <p>
                Mossy is <span className="text-green-400 font-semibold">100% free</span> and will always remain free.
                Your donations help:
              </p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Cover AI API costs (Claude, embeddings, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Support continued development and new features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Expand the Fallout 4 knowledge base</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Keep the developer fueled with coffee ☕</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Enable future versions for other games (Skyrim, New Vegas, etc.)</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Donation Options */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Ways to Support
            </h2>

            {/* Buy Me a Coffee */}
            <a
              href="https://buymeacoffee.com/mossy"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-xl p-6 transition-all duration-200 transform hover:scale-[1.02] border border-amber-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Coffee className="w-12 h-12 text-white" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Buy Me a Coffee</h3>
                    <p className="text-amber-100">One-time donation, any amount</p>
                  </div>
                </div>
                <ExternalLink className="w-6 h-6 text-white/70" />
              </div>
            </a>

            {/* Ko-fi */}
            <a
              href="https://ko-fi.com/mossy"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl p-6 transition-all duration-200 transform hover:scale-[1.02] border border-blue-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Heart className="w-12 h-12 text-white" />
                  <div>
                    <h3 className="text-xl font-bold text-white">Ko-fi</h3>
                    <p className="text-blue-100">Support via Ko-fi</p>
                  </div>
                </div>
                <ExternalLink className="w-6 h-6 text-white/70" />
              </div>
            </a>

            {/* GitHub Sponsors */}
            <a
              href="https://github.com/sponsors/mossy"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl p-6 transition-all duration-200 transform hover:scale-[1.02] border border-purple-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Github className="w-12 h-12 text-white" />
                  <div>
                    <h3 className="text-xl font-bold text-white">GitHub Sponsors</h3>
                    <p className="text-purple-100">Monthly or one-time support</p>
                  </div>
                </div>
                <ExternalLink className="w-6 h-6 text-white/70" />
              </div>
            </a>

            {/* PayPal */}
            <a
              href="https://paypal.me/mossy"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl p-6 transition-all duration-200 transform hover:scale-[1.02] border border-indigo-500/30"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <DollarSign className="w-12 h-12 text-white" />
                  <div>
                    <h3 className="text-xl font-bold text-white">PayPal</h3>
                    <p className="text-indigo-100">Direct donation via PayPal</p>
                  </div>
                </div>
                <ExternalLink className="w-6 h-6 text-white/70" />
              </div>
            </a>
          </div>

          {/* Other Ways to Help */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">Other Ways to Help</h2>
            <div className="space-y-3 text-slate-300">
              <div className="flex items-start gap-3">
                <span className="text-green-400 text-xl">⭐</span>
                <div>
                  <p className="font-semibold text-white">Star on GitHub</p>
                  <p className="text-sm">Help others discover Mossy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-400 text-xl">💬</span>
                <div>
                  <p className="font-semibold text-white">Share Your Experience</p>
                  <p className="text-sm">Tell the Fallout 4 modding community about Mossy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-purple-400 text-xl">🐛</span>
                <div>
                  <p className="font-semibold text-white">Report Bugs</p>
                  <p className="text-sm">Help improve Mossy by reporting issues</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-xl">📚</span>
                <div>
                  <p className="font-semibold text-white">Contribute Knowledge</p>
                  <p className="text-sm">Share Fallout 4 modding tips and tutorials</p>
                </div>
              </div>
            </div>
          </div>

          {/* Thank You Message */}
          <div className="text-center py-6">
            <p className="text-slate-400 text-lg">
              Thank you for being part of the Mossy community! 💚
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Whether you donate or not, Mossy will always be here to help with your Fallout 4 modding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
