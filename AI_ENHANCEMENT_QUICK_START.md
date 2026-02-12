# Quick Start: Adding AI Enhancements to Mossy

This guide shows you exactly how to add the top AI enhancements to Mossy in 1-2 weeks.

---

## 🚀 Week 1: GPT-4 Vision + Voice Cloning

### Day 1-2: Add GPT-4 Vision

GPT-4 Vision can analyze textures, meshes, and game assets automatically.

#### 1. Update .env.local
```bash
# Already have OpenAI key, just enable vision
OPENAI_API_KEY=your_existing_key
```

#### 2. Create Vision Analysis Service

**File:** `src/renderer/src/services/visionAnalysis.ts`

```typescript
import OpenAI from 'openai';

export class VisionAnalysisService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeTexture(imagePath: string): Promise<string> {
    try {
      // Convert image to base64 data URL
      const imageData = await this.imageToDataURL(imagePath);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [{
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Analyze this Fallout 4 texture file. Check for:
              - Resolution and dimensions
              - Texture quality issues
              - Color consistency
              - Missing channels (normal, specular, etc.)
              - Compression artifacts
              - Recommendations for improvement`
            },
            { 
              type: "image_url", 
              image_url: { url: imageData } 
            }
          ]
        }],
        max_tokens: 500
      });

      return response.choices[0].message.content || 'Analysis failed';
    } catch (error) {
      console.error('Vision analysis error:', error);
      throw error;
    }
  }

  async analyzeNifModel(imagePath: string): Promise<string> {
    const imageData = await this.imageToDataURL(imagePath);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [{
        role: "user",
        content: [
          { 
            type: "text", 
            text: `Analyze this 3D model screenshot for Fallout 4. Check for:
            - Polygon count (should be optimized)
            - UV mapping issues
            - Texture stretching
            - Normal map quality
            - Mesh topology problems
            - LOD recommendations`
          },
          { type: "image_url", image_url: { url: imageData } }
        ]
      }],
      max_tokens: 500
    });

    return response.choices[0].message.content || 'Analysis failed';
  }

  async compareTextures(image1: string, image2: string): Promise<string> {
    const data1 = await this.imageToDataURL(image1);
    const data2 = await this.imageToDataURL(image2);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Compare these two textures and identify differences" },
          { type: "image_url", image_url: { url: data1 } },
          { type: "image_url", image_url: { url: data2 } }
        ]
      }],
      max_tokens: 500
    });

    return response.choices[0].message.content || 'Comparison failed';
  }

  private async imageToDataURL(imagePath: string): Promise<string> {
    const fs = window.electron?.fs;
    if (!fs) throw new Error('File system not available');

    const buffer = await fs.readFile(imagePath);
    const base64 = buffer.toString('base64');
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    
    return `data:${mimeType};base64,${base64}`;
  }
}
```

#### 3. Add to Auditor Component

**File:** `src/renderer/src/TheAuditor.tsx`

Add vision analysis button:

```typescript
import { VisionAnalysisService } from './services/visionAnalysis';

// In component
const [visionAnalysis, setVisionAnalysis] = useState<string>('');
const [analyzing, setAnalyzing] = useState(false);

const analyzeWithVision = async (filePath: string) => {
  setAnalyzing(true);
  try {
    const apiKey = await window.electron?.api?.getApiKey('OPENAI_API_KEY');
    const visionService = new VisionAnalysisService(apiKey);
    
    const analysis = await visionService.analyzeTexture(filePath);
    setVisionAnalysis(analysis);
  } catch (error) {
    console.error('Vision analysis failed:', error);
  } finally {
    setAnalyzing(false);
  }
};

// In render
<button onClick={() => analyzeWithVision(selectedFile)}>
  {analyzing ? 'Analyzing...' : '🔍 Analyze with AI Vision'}
</button>

{visionAnalysis && (
  <div className="vision-analysis">
    <h3>AI Vision Analysis</h3>
    <pre>{visionAnalysis}</pre>
  </div>
)}
```

#### 4. Test It
```bash
npm run dev
# Open Auditor
# Select a DDS file
# Click "Analyze with AI Vision"
# See detailed analysis!
```

---

### Day 3-4: Add ElevenLabs Voice Cloning

Clone voices for NPC dialogue generation.

#### 1. Create Voice Cloning Service

**File:** `src/renderer/src/services/voiceCloning.ts`

```typescript
export class VoiceCloningService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async cloneVoice(audioFilePath: string, voiceName: string): Promise<string> {
    try {
      const fs = window.electron?.fs;
      const audioData = await fs.readFile(audioFilePath);

      const formData = new FormData();
      formData.append('name', voiceName);
      formData.append('files', new Blob([audioData]));
      formData.append('description', `Cloned voice for ${voiceName}`);

      const response = await fetch(`${this.baseUrl}/voices/add`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Voice cloning failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.voice_id;
    } catch (error) {
      console.error('Voice cloning error:', error);
      throw error;
    }
  }

  async listVoices(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'xi-api-key': this.apiKey }
    });

    const data = await response.json();
    return data.voices;
  }

  async generateSpeech(text: string, voiceId: string): Promise<ArrayBuffer> {
    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    return response.arrayBuffer();
  }

  async deleteVoice(voiceId: string): Promise<void> {
    await fetch(`${this.baseUrl}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': this.apiKey }
    });
  }
}
```

#### 2. Create Voice Manager UI

**File:** `src/renderer/src/VoiceManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { VoiceCloningService } from './services/voiceCloning';

export const VoiceManager: React.FC = () => {
  const [voices, setVoices] = useState<any[]>([]);
  const [cloning, setCloning] = useState(false);
  const [service, setService] = useState<VoiceCloningService | null>(null);

  useEffect(() => {
    initService();
  }, []);

  const initService = async () => {
    const apiKey = await window.electron?.api?.getApiKey('ELEVENLABS_API_KEY');
    if (apiKey) {
      const svc = new VoiceCloningService(apiKey);
      setService(svc);
      loadVoices(svc);
    }
  };

  const loadVoices = async (svc: VoiceCloningService) => {
    const voiceList = await svc.listVoices();
    setVoices(voiceList);
  };

  const handleCloneVoice = async () => {
    if (!service) return;

    const filePath = await window.electron?.api?.selectFile({
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] }]
    });

    if (!filePath) return;

    const voiceName = prompt('Enter name for this voice:');
    if (!voiceName) return;

    setCloning(true);
    try {
      const voiceId = await service.cloneVoice(filePath, voiceName);
      alert(`Voice cloned successfully! ID: ${voiceId}`);
      loadVoices(service);
    } catch (error) {
      alert('Voice cloning failed: ' + error);
    } finally {
      setCloning(false);
    }
  };

  const handleGenerateSpeech = async (voiceId: string) => {
    if (!service) return;

    const text = prompt('Enter text to speak:');
    if (!text) return;

    const audio = await service.generateSpeech(text, voiceId);
    
    // Play the audio
    const blob = new Blob([audio], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audioElement = new Audio(url);
    audioElement.play();
  };

  return (
    <div className="voice-manager">
      <h2>Voice Manager</h2>
      
      <button onClick={handleCloneVoice} disabled={cloning}>
        {cloning ? 'Cloning...' : '🎤 Clone New Voice'}
      </button>

      <div className="voice-list">
        <h3>Your Voices</h3>
        {voices.map(voice => (
          <div key={voice.voice_id} className="voice-item">
            <span>{voice.name}</span>
            <button onClick={() => handleGenerateSpeech(voice.voice_id)}>
              🔊 Test
            </button>
            <button onClick={() => service?.deleteVoice(voice.voice_id)}>
              🗑️ Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 3. Add to App

**File:** `src/renderer/src/App.tsx`

```typescript
import { VoiceManager } from './VoiceManager';

// Add route
<Route path="/voice-manager" element={<VoiceManager />} />
```

---

## 🚀 Week 2: Texture Generation + Enhanced RAG

### Day 5-7: Add Stability AI for Texture Generation

#### 1. Get API Key
- Sign up at https://platform.stability.ai
- Get API key from dashboard

#### 2. Update .env.local
```bash
STABILITY_API_KEY=your_key_here
```

#### 3. Create Texture Generator Service

**File:** `src/renderer/src/services/textureGenerator.ts`

```typescript
export class TextureGeneratorService {
  private apiKey: string;
  private baseUrl = 'https://api.stability.ai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateTexture(prompt: string, options: {
    width?: number;
    height?: number;
    seamless?: boolean;
  } = {}): Promise<ArrayBuffer> {
    const {
      width = 1024,
      height = 1024,
      seamless = true
    } = options;

    const enhancedPrompt = seamless 
      ? `${prompt}, seamless texture, tileable, game texture, PBR, 4K`
      : `${prompt}, game texture, PBR, 4K`;

    const response = await fetch(
      `${this.baseUrl}/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          text_prompts: [
            { text: enhancedPrompt, weight: 1 },
            { text: 'blurry, low quality, watermark', weight: -1 }
          ],
          cfg_scale: 7,
          height,
          width,
          steps: 30,
          samples: 1
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Texture generation failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Decode base64 image
    const base64Image = result.artifacts[0].base64;
    const binaryString = atob(base64Image);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes.buffer;
  }

  async generateNormalMap(baseTexturePath: string): Promise<ArrayBuffer> {
    // Use img2img with ControlNet for normal map generation
    const prompt = "normal map, game texture, blue purple gradient, height information";
    
    // Implementation would use img2img endpoint with base texture
    // Similar to above but with init_image parameter
    
    throw new Error('Not implemented - use existing sharp implementation');
  }

  async generatePBRSet(prompt: string): Promise<{
    albedo: ArrayBuffer;
    normal: ArrayBuffer;
    roughness: ArrayBuffer;
    metallic: ArrayBuffer;
  }> {
    // Generate complete PBR texture set
    const albedo = await this.generateTexture(`${prompt}, albedo, diffuse, color`);
    
    // For normal/roughness/metallic, you might want to use the albedo as input
    // and generate the others with img2img
    
    return {
      albedo,
      normal: new ArrayBuffer(0), // Implement
      roughness: new ArrayBuffer(0), // Implement
      metallic: new ArrayBuffer(0) // Implement
    };
  }
}
```

#### 4. Add to Image Suite

**File:** `src/renderer/src/ImageSuite.tsx`

```typescript
import { TextureGeneratorService } from './services/textureGenerator';

const [prompt, setPrompt] = useState('');
const [generating, setGenerating] = useState(false);

const generateTexture = async () => {
  setGenerating(true);
  try {
    const apiKey = await window.electron?.api?.getApiKey('STABILITY_API_KEY');
    const generator = new TextureGeneratorService(apiKey);
    
    const textureData = await generator.generateTexture(prompt, {
      width: 1024,
      height: 1024,
      seamless: true
    });

    // Save texture
    const blob = new Blob([textureData], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    
    // Display or save
    downloadTexture(url, 'generated_texture.png');
  } catch (error) {
    alert('Texture generation failed: ' + error);
  } finally {
    setGenerating(false);
  }
};

// In render
<div className="texture-generator">
  <h3>AI Texture Generator</h3>
  <input 
    type="text" 
    value={prompt}
    onChange={(e) => setPrompt(e.target.value)}
    placeholder="Describe texture: rusty metal, old wood, concrete..."
  />
  <button onClick={generateTexture} disabled={generating}>
    {generating ? 'Generating...' : '🎨 Generate Texture'}
  </button>
</div>
```

---

### Day 8-10: Enhanced RAG with Pinecone

#### 1. Sign up for Pinecone
- https://www.pinecone.io (free tier available)
- Create an index named "mossy-knowledge"
- Get API key

#### 2. Install Dependencies
```bash
npm install @pinecone-database/pinecone
```

#### 3. Create RAG Service

**File:** `src/renderer/src/services/enhancedRAG.ts`

```typescript
import { PineconeClient } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

export class EnhancedRAGService {
  private pinecone: PineconeClient;
  private openai: OpenAI;
  private indexName = 'mossy-knowledge';

  constructor(pineconeKey: string, openaiKey: string) {
    this.pinecone = new PineconeClient();
    this.pinecone.init({
      apiKey: pineconeKey,
      environment: 'us-west1-gcp' // Your environment
    });
    
    this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async indexDocument(id: string, content: string, metadata: any = {}) {
    // Generate embedding
    const embedding = await this.generateEmbedding(content);
    
    // Store in Pinecone
    const index = this.pinecone.Index(this.indexName);
    await index.upsert([{
      id,
      values: embedding,
      metadata: { content, ...metadata }
    }]);
  }

  async search(query: string, topK: number = 5): Promise<string[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Search Pinecone
    const index = this.pinecone.Index(this.indexName);
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true
    });

    // Extract content
    return results.matches?.map(match => 
      match.metadata?.content as string
    ) || [];
  }

  async answerQuestion(question: string): Promise<string> {
    // Get relevant context
    const context = await this.search(question);
    
    // Generate answer with context
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{
        role: 'system',
        content: `You are Mossy, a Fallout 4 modding assistant. Use the following context to answer questions:\n\n${context.join('\n\n')}`
      }, {
        role: 'user',
        content: question
      }]
    });

    return response.choices[0].message.content || 'No answer generated';
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    });

    return response.data[0].embedding;
  }

  async indexAllKnowledge() {
    // Read all knowledge files
    const knowledgePath = './resources/public/knowledge';
    const files = await window.electron?.api?.readDir(knowledgePath);
    
    for (const file of files || []) {
      if (file.endsWith('.md')) {
        const content = await window.electron?.api?.readFile(`${knowledgePath}/${file}`);
        await this.indexDocument(file, content, { type: 'knowledge', file });
      }
    }
  }
}
```

#### 4. Integrate with Chat

**File:** `src/renderer/src/ChatInterface.tsx`

```typescript
import { EnhancedRAGService } from './services/enhancedRAG';

const [ragService, setRagService] = useState<EnhancedRAGService | null>(null);

useEffect(() => {
  initRAG();
}, []);

const initRAG = async () => {
  const pineconeKey = await window.electron?.api?.getApiKey('PINECONE_API_KEY');
  const openaiKey = await window.electron?.api?.getApiKey('OPENAI_API_KEY');
  
  if (pineconeKey && openaiKey) {
    const service = new EnhancedRAGService(pineconeKey, openaiKey);
    setRagService(service);
  }
};

const sendMessage = async (message: string) => {
  if (ragService) {
    // Use enhanced RAG
    const answer = await ragService.answerQuestion(message);
    setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
  } else {
    // Fallback to regular chat
    // existing implementation
  }
};
```

---

## 📦 Testing Your Enhancements

### Test GPT-4 Vision
```bash
npm run dev
# Navigate to Auditor
# Select a DDS texture
# Click "Analyze with AI Vision"
# Should see detailed analysis
```

### Test Voice Cloning
```bash
# Navigate to Voice Manager
# Click "Clone New Voice"
# Select a short (1-5 min) audio file
# Enter voice name
# Test generation
```

### Test Texture Generation
```bash
# Navigate to Image Suite
# Enter prompt: "rusty metal plate, weathered, game texture"
# Click "Generate Texture"
# Should generate seamless texture
```

### Test Enhanced RAG
```bash
# Navigate to Chat
# Ask: "How do I create a normal map?"
# Should get answer with relevant context from docs
```

---

## 💰 Cost Tracking

Add usage tracking to monitor API costs:

**File:** `src/renderer/src/services/usageTracker.ts`

```typescript
export class UsageTracker {
  private usage: Record<string, number> = {};

  track(service: string, operation: string, cost: number) {
    const key = `${service}_${operation}`;
    this.usage[key] = (this.usage[key] || 0) + cost;
    
    // Save to localStorage
    localStorage.setItem('mossy_usage', JSON.stringify(this.usage));
  }

  getUsage(): Record<string, number> {
    const saved = localStorage.getItem('mossy_usage');
    return saved ? JSON.parse(saved) : {};
  }

  getTotalCost(): number {
    return Object.values(this.usage).reduce((a, b) => a + b, 0);
  }

  resetMonth() {
    this.usage = {};
    localStorage.removeItem('mossy_usage');
  }
}
```

---

## 🎉 You're Done!

After 2 weeks, Mossy will have:
- ✅ AI vision for asset analysis
- ✅ Voice cloning for NPC dialogue
- ✅ Texture generation on demand
- ✅ Enhanced knowledge retrieval

**Next Steps:**
- Add Anthropic Claude for advanced reasoning
- Add local Whisper for privacy
- Add more specialized models
- Fine-tune for Fallout 4 specific tasks

See [AI_ENHANCEMENT_OPTIONS.md](AI_ENHANCEMENT_OPTIONS.md) for complete reference!
