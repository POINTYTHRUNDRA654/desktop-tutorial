# Quick Implementation Guide - Top 3 Platforms

This guide shows how to implement the top 3 recommended platforms in order of value and ease.

---

## 1. Discord Rich Presence (EASIEST - 2-3 hours)

### Installation

```bash
npm install discord-rpc
```

### Implementation Steps

1. **Create Discord Application**
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Name it "Mossy"
   - Copy the Application ID
   - Upload icons for rich presence

2. **Add to Main Process**

```typescript
// src/main/discord-integration.ts
import DiscordRPC from 'discord-rpc';

const clientId = 'YOUR_APPLICATION_ID';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

export async function initializeDiscord() {
  rpc.on('ready', () => {
    console.log('Discord Rich Presence ready');
    updateActivity('idle');
  });

  await rpc.login({ clientId });
}

export function updateActivity(activity: string) {
  rpc.setActivity({
    details: 'Modding Fallout 4',
    state: activity,
    largeImageKey: 'mossy-logo',
    startTimestamp: Date.now(),
  });
}
```

3. **Connect to Neural Link**

```typescript
// In your Neural Link component
import { updateActivity } from './discord-integration';

// When tool is detected
neuralLink.onToolDetected((tool) => {
  if (tool === 'blender.exe') {
    updateActivity('Working in Blender');
  } else if (tool === 'CreationKit.exe') {
    updateActivity('Using Creation Kit');
  }
});
```

4. **Add Settings UI**

```typescript
// In SettingsHub
<Setting
  label="Discord Rich Presence"
  description="Show your activity in Discord"
  type="toggle"
  value={settings.discordEnabled}
  onChange={(enabled) => {
    if (enabled) initializeDiscord();
    else clearDiscordActivity();
  }}
/>
```

**Result:** Users see "Playing Mossy - Modding Fallout 4" in Discord!

---

## 2. Nexus Mods API (MEDIUM - 8-10 hours)

### Installation

```bash
npm install axios
```

### Implementation Steps

1. **Get API Key**
   - Tell users to visit: https://www.nexusmods.com/users/myaccount?tab=api
   - Generate personal API key
   - Store in Mossy settings (encrypted)

2. **Create API Client**

Use the example in `src/integrations/nexus-mods-integration.ts`

3. **Add UI Component**

```typescript
// src/renderer/src/NexusModsBrowser.tsx
import React from 'react';
import { NexusModsClient } from '../integrations/nexus-mods-integration';

export function NexusModsBrowser() {
  const [mods, setMods] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const apiKey = useSettings('nexusApiKey');

  const searchMods = async (query: string) => {
    setLoading(true);
    const client = new NexusModsClient(apiKey);
    const results = await client.searchMods(query);
    setMods(results);
    setLoading(false);
  };

  return (
    <div className="nexus-browser">
      <h2>Browse Nexus Mods</h2>
      <SearchBar onSearch={searchMods} />
      {loading ? <Spinner /> : <ModGrid mods={mods} />}
    </div>
  );
}
```

4. **Add to Sidebar**

```typescript
// In Sidebar.tsx
{ to: '/nexus', icon: Download, label: 'Nexus Mods' }
```

5. **Add Route**

```typescript
// In App.tsx
<Route path="/nexus" element={<NexusModsBrowser />} />
```

**Result:** Browse and search Nexus Mods without leaving Mossy!

---

## 3. HuggingFace Models (MEDIUM - 6-8 hours)

### Installation

```bash
npm install @huggingface/inference
```

### Implementation Steps

1. **Get API Token** (Optional for Cloud)
   - Visit https://huggingface.co/settings/tokens
   - Create read token
   - Store in settings

2. **Add to AI Provider List**

```typescript
// src/renderer/src/LocalAIEngine.ts
import { HfInference } from '@huggingface/inference';

export class HuggingFaceProvider {
  private client: HfInference;

  constructor(token?: string) {
    this.client = new HfInference(token);
  }

  async generateText(prompt: string, model = 'mistralai/Mistral-7B-v0.1') {
    const response = await this.client.textGeneration({
      model,
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
      }
    });

    return response.generated_text;
  }

  async generateEmbedding(text: string) {
    const response = await this.client.featureExtraction({
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      inputs: text,
    });

    return response;
  }
}
```

3. **Add to AI Settings**

```typescript
// In AI settings component
<Select
  label="AI Provider"
  options={[
    { value: 'openai', label: 'OpenAI (Cloud)' },
    { value: 'ollama', label: 'Ollama (Local)' },
    { value: 'huggingface', label: 'HuggingFace (Cloud/Local)' },
  ]}
  value={currentProvider}
  onChange={setProvider}
/>

{provider === 'huggingface' && (
  <>
    <Input
      label="HuggingFace Token (optional)"
      type="password"
      value={hfToken}
      onChange={setHfToken}
    />
    <Select
      label="Model"
      options={[
        { value: 'mistralai/Mistral-7B-v0.1', label: 'Mistral 7B' },
        { value: 'codellama/CodeLlama-7b-hf', label: 'CodeLlama 7B' },
        { value: 'meta-llama/Llama-2-7b-chat-hf', label: 'Llama 2 7B' },
      ]}
    />
  </>
)}
```

4. **Integrate with Chat**

```typescript
// In ChatInterface.tsx
const getResponse = async (message: string) => {
  switch (aiProvider) {
    case 'openai':
      return await openAIClient.chat(message);
    case 'ollama':
      return await ollamaClient.chat(message);
    case 'huggingface':
      return await hfClient.generateText(message);
  }
};
```

**Result:** More AI model choices, including free open-source options!

---

## Testing Checklist

### Discord Rich Presence
- [ ] Discord app is running
- [ ] Activity shows in Discord profile
- [ ] Updates when switching tools
- [ ] Can be toggled in settings
- [ ] Clears on app exit

### Nexus Mods
- [ ] API key validation works
- [ ] Search returns results
- [ ] Trending mods display
- [ ] Mod details load
- [ ] Error handling for invalid key

### HuggingFace
- [ ] Can select HF as provider
- [ ] Text generation works
- [ ] Model selection works
- [ ] Falls back gracefully on error
- [ ] Works without API token (for public models)

---

## Configuration Files

### Add to package.json

```json
{
  "dependencies": {
    "discord-rpc": "^4.0.1",
    "@huggingface/inference": "^2.6.4"
  }
}
```

### Environment Variables

```env
# .env.local
DISCORD_CLIENT_ID=your_app_id
NEXUS_API_KEY=your_nexus_key  # User provides
HUGGINGFACE_TOKEN=hf_xxx      # Optional
```

### Settings Schema

```typescript
interface AppSettings {
  // Discord
  discordEnabled: boolean;
  discordShowFileName: boolean;

  // Nexus Mods
  nexusApiKey: string;
  nexusAutoDownloadPath: string;
  nexusCheckUpdates: boolean;

  // HuggingFace
  hfProvider: 'cloud' | 'local';
  hfToken?: string;
  hfModel: string;
}
```

---

## Troubleshooting

### Discord Not Connecting
- Ensure Discord is running
- Check Application ID is correct
- Verify no firewall blocking IPC

### Nexus API Failing
- Validate API key format
- Check rate limits (100 requests/hour)
- Verify internet connection

### HuggingFace Errors
- Check model availability
- Verify token permissions
- Try different model if one fails

---

## Next Steps

Once these 3 are working:
1. Gather user feedback
2. Add more models/features
3. Implement Stable Diffusion integration
4. Add GitHub integration
5. Build plugin system

---

## Time Estimate

- **Discord**: 2-3 hours
- **Nexus Mods**: 8-10 hours
- **HuggingFace**: 6-8 hours
- **Total**: 16-21 hours for all three

**Recommendation:** Start with Discord (easiest, highest visibility), then HuggingFace (more AI options), then Nexus Mods (most complex but very valuable).
