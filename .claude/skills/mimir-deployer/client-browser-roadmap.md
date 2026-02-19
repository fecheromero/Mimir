# Roadmap: Client-Side Browser Automation

## Vision

Execute browser automation in the **user's browser** instead of server-side, eliminating:
- Server memory consumption (200MB+ per browser)
- Browser-use cloud costs
- Server resource constraints

## Problem with Current Approach

```
Current: Frontend → Backend → Playwright/Browser-use (cloud or local) → Results
                                ↑
                         Consumes memory/costs
```

Limitations:
- Cloud mode: Costs money ($)
- Local mode: Consumes 200MB+ RAM per browser
- Free tier: Can't run browsers reliably

## Proposed Solution

```
New: Frontend → User's Browser → Execute actions → Report to Backend
                     ↑
              No server resources!
```

Benefits:
- ✅ Zero server memory for browsers
- ✅ Zero cloud costs
- ✅ User sees execution in real-time
- ✅ Can run on weakest servers
- ✅ Unlimited parallel tests (limited by user's machine)

## Implementation Options

### Option 1: Browser Extension (Recommended)

**Architecture:**
```
Mimir Chrome Extension
    ↓ WebSocket
Backend (coordination only)
    ↓ HTTP
Frontend (UI)
```

**How it works:**

1. User installs Chrome extension
2. Extension connects to backend via WebSocket
3. Frontend requests test execution
4. Backend sends commands to extension via WebSocket
5. Extension creates new tab and executes actions
6. Extension reports results back to backend
7. Frontend polls for results (or receives via WebSocket)

**Extension manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "Mimir QA Automation",
  "version": "1.0.0",
  "permissions": [
    "tabs",
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.png"
  }
}
```

**Extension background.js:**
```javascript
// Connect to backend
const ws = new WebSocket('wss://your-backend.com/ws/automation');

ws.onmessage = async (event) => {
  const { action, testId, steps, url } = JSON.parse(event.data);

  if (action === 'executeTest') {
    // Create new tab
    const tab = await chrome.tabs.create({ url });

    // Wait for page load
    await waitForPageLoad(tab.id);

    // Execute steps
    for (const step of steps) {
      await executeStep(tab.id, step);
      reportProgress(testId, step);
    }

    // Report completion
    reportCompletion(testId, results);
  }
};

async function executeStep(tabId, step) {
  switch (step.action) {
    case 'click':
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector) => document.querySelector(selector).click(),
        args: [step.selector]
      });
      break;

    case 'type':
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector, text) => {
          document.querySelector(selector).value = text;
        },
        args: [step.selector, step.text]
      });
      break;

    // ... more actions
  }
}
```

**Pros:**
- ✅ Full control over tabs and navigation
- ✅ Can execute in background
- ✅ Works offline (after installation)
- ✅ Clean UX (extension icon + popup)

**Cons:**
- ❌ Requires Chrome Web Store approval (or developer mode)
- ❌ Users must install extension
- ❌ Maintenance for multiple browsers (Chrome, Firefox, Edge)

---

### Option 2: Puppeteer-Web / Playwright in Browser

**Concept**: Run Puppeteer/Playwright directly in the browser using browser-compatible builds.

**Not viable because:**
- ❌ No full Puppeteer/Playwright in browser (requires Node.js APIs)
- ❌ Would need to rewrite all automation logic
- ❌ Limited capabilities compared to native automation

**Skip this option.**

---

### Option 3: Recording Mode (Hybrid)

**Architecture:**
```
User manually performs actions in browser
    ↓
Frontend records actions (Selenium IDE style)
    ↓
Backend stores recorded actions
    ↓
Backend can replay using Playwright/browser-use
```

**How it works:**

1. User clicks "Start Recording" in Mimir UI
2. A new tab opens with recorder script injected
3. User performs test actions manually
4. Recorder captures: clicks, typing, navigation
5. User clicks "Stop Recording"
6. Actions sent to backend and saved
7. Backend can replay later using existing ReplayService

**Recorder implementation:**
```javascript
// frontend/src/components/Recorder.jsx

let recordedActions = [];

// Inject into target page
function startRecording(url) {
  const recordWindow = window.open(url);

  recordWindow.addEventListener('load', () => {
    recordWindow.document.addEventListener('click', (e) => {
      recordedActions.push({
        action: 'click',
        selector: getSelector(e.target),
        timestamp: Date.now()
      });
    });

    recordWindow.document.addEventListener('input', (e) => {
      recordedActions.push({
        action: 'type',
        selector: getSelector(e.target),
        text: e.target.value,
        timestamp: Date.now()
      });
    });
  });
}

function stopRecording() {
  // Send recorded actions to backend
  api.post('/api/test-cases/save-recording', {
    actions: recordedActions
  });
}
```

**Pros:**
- ✅ No extension needed
- ✅ Simple to implement
- ✅ Works in any browser
- ✅ User has full control

**Cons:**
- ❌ Manual process (not fully automated)
- ❌ Still needs backend to replay
- ❌ Limited to recording, not generation

**Use case**: Good for "capture & replay" but doesn't solve LLM-generated tests.

---

### Option 4: CDP Proxy (Advanced)

**Architecture:**
```
User's Chrome with --remote-debugging-port=9222
    ↓
Local CDP Proxy (runs on user's machine)
    ↓ WebSocket
Mimir Backend
    ↓ Commands
CDP Proxy
    ↓
User's Chrome
```

**How it works:**

1. User launches Chrome with remote debugging:
   ```bash
   chrome --remote-debugging-port=9222
   ```

2. User runs local CDP proxy (small Node.js script):
   ```bash
   npx mimir-cdp-proxy --backend wss://your-backend.com
   ```

3. Proxy connects user's Chrome to Mimir backend
4. Backend sends CDP commands through proxy
5. Proxy forwards to local Chrome
6. Results sent back to backend

**CDP Proxy code:**
```javascript
// mimir-cdp-proxy.js
const CDP = require('chrome-remote-interface');
const WebSocket = require('ws');

// Connect to local Chrome
const client = await CDP({ port: 9222 });

// Connect to backend
const ws = new WebSocket('wss://backend.com/ws/cdp');

// Forward commands
ws.on('message', async (msg) => {
  const { method, params } = JSON.parse(msg);
  const result = await client[method](params);
  ws.send(JSON.stringify({ result }));
});
```

**Pros:**
- ✅ Full CDP control
- ✅ Works with existing BROWSER_CDP_SETUP.md approach
- ✅ No extension needed

**Cons:**
- ❌ Requires user to run local proxy
- ❌ Requires Chrome with remote debugging
- ❌ Complex setup for non-technical users

---

## Comparison Matrix

| Option | Ease of Use | Server Memory Saved | Implementation Complexity | User Setup |
|--------|-------------|---------------------|---------------------------|------------|
| **Extension** | ⭐⭐⭐⭐ | 200MB | ⭐⭐⭐ Medium | Install extension |
| **Recording** | ⭐⭐⭐⭐⭐ | 0MB (still needs replay) | ⭐ Easy | None |
| **CDP Proxy** | ⭐⭐ | 200MB | ⭐⭐⭐⭐ Hard | Launch Chrome + Proxy |

## Recommended Approach: Browser Extension

**Why:**
- Best balance of UX and capability
- Can fully automate tests
- Saves server resources
- Professional solution

**Implementation Timeline:**

### Phase 1: Prototype (1 week)
- [ ] Create basic Chrome extension
- [ ] Implement WebSocket connection to backend
- [ ] Support simple actions (click, type, navigate)
- [ ] Test with manual test cases

### Phase 2: Integration (1 week)
- [ ] Add backend WebSocket endpoint
- [ ] Modify frontend to support extension mode
- [ ] Implement action translation (LLM text → extension commands)
- [ ] Add progress reporting

### Phase 3: Features (1 week)
- [ ] Screenshot capture
- [ ] Error handling and retries
- [ ] Multi-tab support
- [ ] Extension settings UI

### Phase 4: Distribution (1 week)
- [ ] Package extension for Chrome Web Store
- [ ] Create documentation
- [ ] Add auto-update mechanism
- [ ] Beta testing

**Total: 4 weeks** for full implementation

---

## Hybrid Strategy (Best of Both Worlds)

Support **three modes**:

```python
# backend/app/core/config.py

class Settings(BaseSettings):
    browser_execution_mode: str = "local"
    # Options:
    # - "local": Server-side Playwright (current)
    # - "cloud": Browser-use cloud API
    # - "extension": User's browser via extension (NEW)
```

**User chooses based on needs:**

| Mode | Use Case | Server Memory | Cost |
|------|----------|---------------|------|
| `local` | Development, testing | 200MB | Free |
| `cloud` | Production, no extension | 0MB | Paid |
| `extension` | Personal use, free tier | 0MB | Free |

**Frontend:**
```javascript
const [browserMode, setBrowserMode] = useState('extension');

<select value={browserMode} onChange={...}>
  <option value="cloud">Cloud (paid, no setup)</option>
  <option value="extension">Browser Extension (free, requires install)</option>
  <option value="local">Server-side (for testing)</option>
</select>
```

---

## Action Items

### Immediate (This Week)
1. ✅ Implement sync mode (Idea 2) first
2. ✅ Save 50MB by making Celery optional
3. ✅ Test sync mode with current browser setup

### Near-term (Next Month)
1. ⏸️ Design extension architecture
2. ⏸️ Create prototype extension
3. ⏸️ Test with simple actions

### Long-term (3-6 Months)
1. ⏸️ Full extension implementation
2. ⏸️ Chrome Web Store submission
3. ⏸️ Firefox extension port
4. ⏸️ Extension mode as default for personal use

---

## Questions to Resolve

1. **Security**: How to authenticate extension to backend?
   - Option A: API key in extension settings
   - Option B: OAuth flow
   - Option C: One-time token

2. **Multi-user**: Can one backend serve multiple users with extensions?
   - Yes, via WebSocket rooms/channels
   - Each user gets unique session ID

3. **Offline**: Can extension work offline?
   - For recording: Yes
   - For LLM generation: No (needs backend)
   - Hybrid: Record offline, sync when online

4. **Privacy**: Does extension send sensitive data?
   - Only user-initiated actions
   - Add privacy policy
   - Make data collection opt-in

---

## Conclusion

**Short-term (this week):**
- Focus on **Sync Mode** (Idea 2)
- Immediate value, low risk

**Long-term (next month+):**
- Develop **Browser Extension** (Idea 1)
- Bigger impact, requires investment

Both ideas are excellent and complementary!

---

**Next Steps:**
1. Review this roadmap
2. Implement sync mode first (quick win)
3. Start extension prototype when ready
4. Gather user feedback
5. Iterate based on usage
