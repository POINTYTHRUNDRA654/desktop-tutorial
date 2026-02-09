import React from 'react';
import { Download, CheckCircle, Settings, Play, BookOpen, ExternalLink, AlertCircle } from 'lucide-react';

export const HowToInstall: React.FC = () => {
  const openInstallGuide = () => {
    if ((window as any).electron?.api?.openExternal) {
      (window as any).electron.api.openExternal('https://github.com/POINTYTHRUNDRA654/desktop-tutorial/blob/main/INSTALLATION_GUIDE.md');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-gray-100">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Download className="w-10 h-10 text-emerald-400" />
          How to Install Mossy
        </h1>
        <p className="text-lg text-gray-300">
          Welcome! This guide will walk you through downloading, installing, and setting up Mossy on your computer.
        </p>
      </div>

      {/* Quick Overview */}
      <div className="bg-emerald-900/30 border-2 border-emerald-500/50 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
          Installation is Automatic!
        </h2>
        <p className="text-gray-300 mb-4">
          Don't worry - you don't need any technical knowledge. The installer handles everything automatically:
        </p>
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>Just download the installer and double-click it</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>Click "Next" a few times - that's it!</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>Takes less than 2 minutes from start to finish</span>
          </li>
        </ul>
      </div>

      {/* Step-by-Step Guide */}
      <div className="space-y-6">
        {/* Step 1 */}
        <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-xl font-bold">
              1
            </div>
            <h3 className="text-2xl font-bold">Download the Installer</h3>
          </div>
          <p className="text-gray-300 mb-4">
            First, download the Mossy installer from GitHub:
          </p>
          <button
            onClick={openInstallGuide}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Go to Download Page
          </button>
          <div className="mt-4 text-sm text-gray-400">
            <p>Look for the latest release (v5.4.21) and download <code className="bg-gray-700 px-2 py-1 rounded">Mossy-Setup-5.4.21.exe</code></p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-xl font-bold">
              2
            </div>
            <h3 className="text-2xl font-bold">Run the Installer</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Double-click the downloaded file to start the installation:
          </p>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-1">→</span>
              <div>
                <strong>Windows may show a warning</strong> - This is normal for new apps
                <br />
                <span className="text-sm text-gray-400">Click "More info" → "Run anyway"</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-1">→</span>
              <div>
                <strong>Welcome screen appears</strong> - Click "Next"
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-1">→</span>
              <div>
                <strong>Choose location</strong> - Default is fine, or click "Browse" to change
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-1">→</span>
              <div>
                <strong>Select components</strong> - Keep all boxes checked (recommended)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-1">→</span>
              <div>
                <strong>Installation runs</strong> - Wait 30-60 seconds
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold mt-1">→</span>
              <div>
                <strong>Done!</strong> - Keep "Launch Mossy" checked and click "Finish"
              </div>
            </li>
          </ul>
        </div>

        {/* Step 3 */}
        <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-xl font-bold">
              3
            </div>
            <h3 className="text-2xl font-bold">Complete First-Run Setup</h3>
          </div>
          <p className="text-gray-300 mb-4">
            When Mossy launches for the first time, you'll see a friendly setup wizard:
          </p>
          <div className="space-y-3">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                Step 1: Choose Language
              </h4>
              <p className="text-sm text-gray-400">Select your preferred language (English, Spanish, French, German, Russian, Chinese)</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Step 2: System Scan
              </h4>
              <p className="text-sm text-gray-400">Mossy automatically detects modding tools on your PC (Blender, Creation Kit, xEdit, etc.)</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Step 3: Neural Link
              </h4>
              <p className="text-sm text-gray-400">Choose which tools Mossy should monitor to give better advice</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-400" />
                Step 4: AI Setup
              </h4>
              <p className="text-sm text-gray-400">Choose local AI (private, offline) or cloud AI (more powerful)</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-400" />
                Step 5: Privacy
              </h4>
              <p className="text-sm text-gray-400">All data stays local by default - you control what (if anything) to share</p>
            </div>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-gray-800 rounded-lg p-6 border-l-4 border-emerald-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-xl font-bold">
              4
            </div>
            <h3 className="text-2xl font-bold">Start Using Mossy!</h3>
          </div>
          <p className="text-gray-300 mb-4">
            That's it - you're ready to start modding! Here's what to try first:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h5 className="font-semibold mb-2 flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                Take the Guided Tour
              </h5>
              <p className="text-sm text-gray-400">5-minute interactive walkthrough of key features</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h5 className="font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                Browse Knowledge Base
              </h5>
              <p className="text-sm text-gray-400">200+ guides on Blender, Creation Kit, xEdit, and more</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h5 className="font-semibold mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                Install Modding Tools
              </h5>
              <p className="text-sm text-gray-400">Mossy can help you install Blender, CK, xEdit if needed</p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <h5 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Start a Project
              </h5>
              <p className="text-sm text-gray-400">Ask Mossy: "How do I create a new weapon mod?"</p>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="mt-8 bg-orange-900/30 border-2 border-orange-500/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-orange-400" />
          Having Issues?
        </h2>
        <div className="space-y-4 text-gray-300">
          <div>
            <h3 className="font-semibold mb-2">Windows SmartScreen Warning?</h3>
            <p className="text-sm text-gray-400">Click "More info" → "Run anyway". This is normal for new applications.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Installation Failed?</h3>
            <p className="text-sm text-gray-400">
              • Make sure you have 500 MB free disk space<br />
              • Try running installer as Administrator<br />
              • Temporarily disable antivirus
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">App Won't Launch?</h3>
            <p className="text-sm text-gray-400">
              • Wait 30 seconds (first launch is slower)<br />
              • Try restarting your computer<br />
              • Check Windows Event Viewer for errors
            </p>
          </div>
        </div>
      </div>

      {/* Full Guide Link */}
      <div className="mt-8 text-center">
        <button
          onClick={openInstallGuide}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
        >
          <BookOpen className="w-6 h-6" />
          Read Full Installation Guide
        </button>
        <p className="mt-4 text-sm text-gray-400">
          Complete documentation with screenshots, advanced options, and detailed troubleshooting
        </p>
      </div>
    </div>
  );
};

export default HowToInstall;
