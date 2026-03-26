# Thinking Model Feature Specification

## 1. Overview & Goals

Enable the MiniMax M2 series "thinking" (deep reasoning) capability across the full Claw Agent stack, allowing users to see the model's chain-of-thought reasoning process in real-time during streaming, and to review it in historical messages.

**Goals:**
- Stream thinking tokens to the frontend in real-time, visually distinct from the final answer
- Persist thinking content alongside message content in the database
- Preserve thinking blocks in multi-turn conversation history (required by MiniMax API)
- Provide a collapsible UI for the thinking process, similar to Claude/DeepSeek's UX
- Maintain full backward compatibility — conversations without thinking continue to work

---

## 2. MiniMax API Thinking Behavior

### Request
Add `thinking` parameter to the model invocation:
```json
{
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  }
}
```

### Streaming Response
In `streamEvents` with `v2`, the `on_chat_model_stream` event's `chunk.content` becomes an array of blocks:
```
// Thinking phase
{ type: "thinking", thinking: "Let me analyze..." }

// Answer phase
{ type: "text", text: "The answer is..." }
```

The `chunk.delta` in raw Anthropic streaming has:
- `content_block_delta` with `delta.type = "thinking_delta"` and `delta.thinking` field
- `content_block_delta` with `delta.type = "text_delta"` and `delta.text` field

In LangChain's `ChatAnthropic`, streaming chunks surface content blocks. Each chunk's `content` is an array where blocks have `type: "thinking"` with a `thinking` field, or `type: "text"` with a `text` field.

### Multi-turn Requirement
MiniMax requires that all thinking blocks from previous assistant messages are preserved in conversation history. When reconstructing messages for a new turn, assistant messages must include their original thinking blocks.

---

## 3. Architecture Changes by Layer

### 3.1 Agent Layer (`packages/agent`)

#### `types.ts` — Config changes
```typescript
export interface AgentConfig {
  apiKey: string;
  baseUrl: string;
  modelName?: string;
  maxTokens?: number;
  systemPrompt?: string;
  thinking?: {                  // NEW
    enabled: boolean;
    budgetTokens?: number;      // default 10000
  };
}

// Extend ChatMessage to support structured content
export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

export interface TextBlock {
  type: 'text';
  text: string;
}

export type ContentBlock = ThinkingBlock | TextBlock;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string;            // NEW: persisted thinking content
}
```

#### `agent.ts` — Enable thinking on LLM
```typescript
const llm = new ChatAnthropic({
  // ... existing config
  ...(config.thinking?.enabled && {
    thinking: {
      type: 'enabled',
      budget_tokens: config.thinking.budgetTokens ?? 10000,
    },
  }),
});
```

**`agentNode` content filtering** — Currently the agent node filters out non-text/tool_use blocks. This MUST be updated to also preserve `thinking` blocks:
```typescript
// In agentNode, when processing response.content array:
if (b.type === 'thinking') {
  filteredContent.push(block as { type: string; thinking: string });
}
```

#### `messages.ts` — Preserve thinking in history
Update `convertToLangChainMessages` to reconstruct assistant messages with thinking blocks when `thinking` content is present:
```typescript
} else if (msg.role === 'assistant') {
  if (msg.thinking) {
    // Reconstruct content blocks with thinking for multi-turn fidelity
    lcMessages.push(new AIMessage({
      content: [
        { type: 'thinking', thinking: msg.thinking },
        { type: 'text', text: msg.content },
      ],
    }));
  } else {
    lcMessages.push(new AIMessage(msg.content));
  }
}
```

### 3.2 Server Layer (`packages/server`)

#### Database Schema (`prisma/schema.prisma`)
Add a `thinking` column to the `Message` model:
```prisma
model Message {
  id             String       @id @default(uuid())
  conversationId String       @map("conversation_id")
  role           MessageRole
  content        String       @db.Text
  thinking       String?      @db.Text    // NEW: nullable thinking content
  createdAt      DateTime     @default(now()) @map("created_at")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@map("messages")
}
```

**Migration:** `ALTER TABLE messages ADD COLUMN thinking TEXT;` — nullable, no default needed, backward compatible.

#### `agent.service.ts`
Pass thinking config from environment/config:
```typescript
onModuleInit() {
  this.agent = createAgent({
    apiKey: this.configService.get<string>('MINIMAX_API_KEY') || '',
    baseUrl: this.configService.get<string>('MINIMAX_BASE_URL') || '...',
    thinking: {
      enabled: this.configService.get<boolean>('THINKING_ENABLED', true),
      budgetTokens: this.configService.get<number>('THINKING_BUDGET_TOKENS', 10000),
    },
  });
}
```

Update `convertToLangChainMessages` call site to pass `ChatMessage` objects that include thinking.

#### `chat.service.ts` — Core streaming changes

**Token extraction** — Split `extractToken` into two separate extraction methods:
```typescript
private extractThinkingToken(content: unknown): string {
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (typeof block === 'object' && block !== null) {
        const b = block as Record<string, unknown>;
        if (b.type === 'thinking' && typeof b.thinking === 'string') {
          parts.push(b.thinking);
        }
      }
    }
    return parts.join('');
  }
  return '';
}
// extractToken (existing) continues to extract type:'text' blocks only
```

**Stream loop** — Track both thinking and text content:
```typescript
let fullText = '';
let fullThinking = '';
let isInThinkingPhase = true;

for await (const event of eventStream) {
  if (streamEnded) break;

  if (event.event === 'on_chat_model_stream' && event.data?.chunk) {
    const chunk = event.data.chunk;

    // Extract thinking tokens
    const thinkingToken = this.extractThinkingToken(chunk.content);
    if (thinkingToken) {
      fullThinking += thinkingToken;
      this.writeThinkingToken(res, thinkingToken);
      continue;
    }

    // Extract text tokens
    const token = this.extractToken(chunk.content);
    if (token) {
      if (isInThinkingPhase && fullThinking) {
        // Transition: send thinking-end marker
        this.writeThinkingEnd(res);
        isInThinkingPhase = false;
      }
      fullText += token;
      this.writeToken(res, token);
    }
  }
}
```

**Persist thinking** — When saving the assistant message:
```typescript
await this.prisma.message.create({
  data: {
    conversationId,
    role: 'assistant',
    content: fullText,
    thinking: fullThinking || null,   // NEW
  },
});
```

**History reconstruction** — When loading conversation messages for context, include thinking:
```typescript
const historyMessages: ChatMessage[] = conversation.messages.map((m) => ({
  role: m.role as ChatMessage['role'],
  content: m.content,
  thinking: m.thinking || undefined,   // NEW
}));
```

### 3.3 Streaming Protocol Design

The Vercel AI Data Stream protocol (`X-Vercel-AI-Data-Stream: v1`) supports several line prefixes. We use:
- `0:JSON_STRING\n` — text token (existing)
- `2:JSON_ARRAY\n` — data/annotation (used for thinking)
- `d:JSON_OBJECT\n` — finish signal (existing)

#### Thinking tokens via annotations (prefix `2:`)
```
// Thinking start (implicit with first thinking token)
2:[{"type":"thinking_delta","content":"Let me think..."}]\n

// More thinking tokens
2:[{"type":"thinking_delta","content":"First, I need to..."}]\n

// Thinking complete, switching to answer
2:[{"type":"thinking_complete"}]\n

// Normal text tokens
0:"The answer is..."\n

// Stream end
d:{"finishReason":"stop","usage":{...}}\n
```

**Why prefix `2:` (data annotations)?**
- The `useChat` hook from `@ai-sdk/react` passes annotations/data to `message.annotations` or the `data` stream part
- This keeps thinking tokens completely separate from `message.content`
- The frontend can parse annotations to extract thinking content without modifying the core text stream
- Backward compatible: clients that don't understand thinking annotations simply ignore them

#### Server write helpers:
```typescript
private writeThinkingToken(res: Response, token: string): void {
  const annotation = [{ type: 'thinking_delta', content: token }];
  res.write(`2:${JSON.stringify(annotation)}\n`);
}

private writeThinkingEnd(res: Response): void {
  const annotation = [{ type: 'thinking_complete' }];
  res.write(`2:${JSON.stringify(annotation)}\n`);
}
```

### 3.4 Web Layer (`packages/web`)

#### Chat page (`chat/[sessionId]/page.tsx`)
Use `useChat`'s `onResponse` or process `data` to extract thinking annotations:

```typescript
const [thinkingMap, setThinkingMap] = useState<Record<string, string>>({});
const [thinkingCompleteSet, setThinkingCompleteSet] = useState<Set<string>>(new Set());

const { messages, data, ... } = useChat({
  // existing config
});

// Process streaming annotations to build thinking content
useEffect(() => {
  if (!data || data.length === 0) return;
  // data contains annotation arrays pushed via prefix 2:
  // Accumulate thinking_delta into the current assistant message
  // Mark thinking_complete when received
}, [data]);
```

Alternatively, use `useChat`'s `onToolCall` or a custom `fetch` wrapper to intercept the raw stream. The recommended approach is to use the `data` field from `useChat` which collects all `2:` prefix lines.

#### Historical messages
When loading messages from the API, the response already includes `thinking` field. Pass it to `ChatMessage`:

```typescript
// In loadMessagesForConversation, the API response now includes thinking
const msgs = await loadMessagesForConversation(sessionId);
// msgs format: [{ id, role, content, thinking? }]
```

The conversations API (`/api/conversations/[id]/messages`) needs to return the `thinking` field.

#### `ChatMessage.tsx` — UI rendering

Add `thinking` prop and a collapsible thinking section:

```typescript
interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  thinking?: string;              // NEW
  isThinkingStreaming?: boolean;   // NEW: true while thinking is still streaming
  isStreaming?: boolean;
}
```

**Thinking UI component** (new: `ThinkingBlock.tsx`):
```tsx
function ThinkingBlock({ content, isStreaming, isComplete }: {
  content: string;
  isStreaming: boolean;
  isComplete: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse when thinking completes and answer starts
  useEffect(() => {
    if (isComplete && !isStreaming) {
      setCollapsed(true);
    }
  }, [isComplete, isStreaming]);

  return (
    <div className="mb-3 border-l-2 border-purple-400/50 pl-3">
      <button onClick={() => setCollapsed(!collapsed)} className="...">
        <BrainIcon />
        <span>{isStreaming ? "Thinking..." : "Thought process"}</span>
        <ChevronIcon rotated={!collapsed} />
        {isComplete && <span className="text-xs text-muted">({duration}s)</span>}
      </button>
      {!collapsed && (
        <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}
```

**Behavior:**
- While thinking is streaming: show expanded with "Thinking..." label and animated indicator
- When thinking completes and text starts: auto-collapse with smooth animation
- For historical messages: show collapsed by default, click to expand
- Thinking content is rendered as plain text (not Markdown) — it's internal reasoning

---

## 4. API Changes

### `POST /api/chat`
**Request:** No changes. Thinking is enabled server-side via config.

**Response stream:** New annotation lines (prefix `2:`) added. Existing clients that only process `0:` and `d:` lines are unaffected.

### `GET /api/conversations/:id/messages`
**Response:** Each message object gains an optional `thinking` field:
```json
{
  "id": "...",
  "role": "assistant",
  "content": "The answer is 42.",
  "thinking": "Let me calculate step by step...",
  "createdAt": "..."
}
```

### Environment Variables (new)
| Variable | Default | Description |
|---|---|---|
| `THINKING_ENABLED` | `true` | Enable/disable thinking globally |
| `THINKING_BUDGET_TOKENS` | `10000` | Max tokens for thinking phase |

---

## 5. UI/UX Interaction Specification

### 5.1 Streaming State Machine
```
[User sends message]
    → Loading indicator
    → [Thinking tokens arrive]
        → ThinkingBlock appears (expanded, animated "Thinking..." header)
        → Thinking content streams in real-time
    → [thinking_complete annotation arrives]
        → ThinkingBlock collapses with animation
    → [Text tokens arrive]
        → Normal text content streams below the collapsed ThinkingBlock
    → [Stream ends]
        → Final state: collapsed ThinkingBlock + full answer
```

### 5.2 Historical Message Display
- ThinkingBlock rendered above the answer content, collapsed by default
- Click to expand/collapse
- Subtle visual treatment (muted colors, left border accent)

### 5.3 No-thinking Fallback
- If the model doesn't produce thinking blocks (e.g., simple queries), no ThinkingBlock is rendered
- Existing conversations without thinking data display normally

### 5.4 Visual Design
- **Thinking header:** Brain/lightbulb icon + "Thinking..." (streaming) / "Thought process" (complete)
- **Thinking content area:** Slightly smaller font, muted foreground color, monospace-optional
- **Left border accent:** Purple/violet tint (`border-purple-400/50`) to distinguish from regular content
- **Collapse animation:** `max-height` transition or Radix Collapsible
- **Streaming indicator:** Subtle pulsing dot or animated ellipsis next to "Thinking..."

---

## 6. Database Migration Plan

### Migration: `add_thinking_to_messages`
```sql
ALTER TABLE messages ADD COLUMN thinking TEXT;
```

- Column is nullable, no default
- Zero-downtime: existing rows get `NULL` thinking
- No index needed on `thinking` (never queried directly)
- Backward compatible: old code ignores the column

---

## 7. Acceptance Criteria

### Functional
- [ ] Sending a message to MiniMax M2 model triggers thinking phase
- [ ] Thinking tokens stream to the frontend in real-time
- [ ] Thinking content is visually distinct from the answer (collapsible block)
- [ ] ThinkingBlock auto-collapses when answer tokens begin streaming
- [ ] Thinking content is persisted in the database (`messages.thinking` column)
- [ ] Historical messages display thinking in a collapsed block
- [ ] Multi-turn conversations preserve thinking blocks in API calls to MiniMax
- [ ] Conversations without thinking (pre-feature) display normally
- [ ] Model responses without thinking (simple queries) display normally

### Streaming Protocol
- [ ] Thinking tokens use `2:` prefix (data annotations) in the stream
- [ ] `thinking_complete` annotation signals end of thinking phase
- [ ] Text tokens continue using `0:` prefix (unchanged)
- [ ] Finish signal `d:` is unchanged
- [ ] Stream handles client disconnect gracefully during thinking phase

### Performance
- [ ] Thinking tokens are throttled on the frontend (reuse existing `useThrottledValue`)
- [ ] No unnecessary re-renders of historical messages during streaming
- [ ] ThinkingBlock collapse/expand is smooth (CSS transition, no layout thrash)

### Compatibility
- [ ] Existing conversations without thinking column load correctly
- [ ] Database migration is backward compatible (nullable column)
- [ ] Frontend gracefully handles missing thinking data
- [ ] API response format is backward compatible (optional field)

---

## 8. Risks & Compatibility Considerations

### Risks
1. **LangChain ChatAnthropic thinking support:** Verify that `@langchain/anthropic` supports the `thinking` parameter pass-through. If not, may need to use `modelKwargs` or raw API calls. **Mitigation:** Test with current `@langchain/anthropic` version first; fallback to `modelKwargs: { thinking: { type: 'enabled', budget_tokens: N } }`.

2. **`streamEvents` thinking block surfacing:** The `on_chat_model_stream` event may surface thinking blocks differently than text blocks in LangGraph's `streamEvents v2`. **Mitigation:** Add logging to inspect raw event structure during development; adjust extraction logic accordingly.

3. **Vercel AI SDK `data` handling:** The `useChat` hook's handling of `2:` prefix annotations needs verification. Different versions may handle this differently. **Mitigation:** Test with the installed version; if `data` doesn't accumulate correctly, implement a custom stream parser.

4. **Token budget overhead:** Thinking consumes additional tokens (up to `budget_tokens`). This increases latency and cost. **Mitigation:** Make budget configurable; consider adding a UI toggle for users to enable/disable thinking per message (future enhancement).

5. **Content block ordering in multi-turn:** MiniMax requires thinking blocks to appear before text blocks in the content array. The `convertToLangChainMessages` reconstruction must maintain this order. **Mitigation:** Always construct content as `[thinking_block, text_block]`.

### Backward Compatibility
- **Database:** Nullable column addition — zero risk
- **API response:** Optional field addition — clients that don't read `thinking` are unaffected
- **Stream protocol:** New `2:` lines are ignored by clients that only process `0:` and `d:`
- **Agent config:** `thinking` config is optional; omitting it maintains current behavior
- **Existing messages:** `thinking: null` in DB maps to `undefined` in code — no ThinkingBlock rendered

### Future Considerations
- Per-message thinking toggle (user can choose to enable/disable thinking per query)
- Thinking token usage tracking and display
- Thinking content search/filtering
- Export thinking content in conversation exports
