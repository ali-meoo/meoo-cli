# Cloud Service Patterns

After `meoo cloud enable` and `meoo cloud pull-env`, your project gets Supabase (PostgreSQL + Auth + Storage + Realtime) and Edge Functions. These cloud services are independent of deploy mode — call them from any frontend or server-side code.

**Key rules**:
- `MEOO_PROJECT_API_KEY` can be used in Edge Functions and image deploy server code. Never in frontend.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only use in server-side code (image deploy) or Edge Functions, never in frontend.

## Supabase Client Setup

### Frontend (browser)

The CLI auto-generates `src/supabase/client.ts` with connection info from `.env`:

```typescript
import { supabase } from '../supabase/client';
```

### Server-side (image deploy — Node.js, Python, Go, etc.)

Platform auto-injects environment variables into the FC container at deploy time — no `.env` needed in production：

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://<accessDomain>/sb-api` |
| `SUPABASE_ANON_KEY` | Project anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `MEOO_PROJECT_API_KEY` | Project API key for Meoo AI |

```typescript
import { createClient } from '@supabase/supabase-js';

// Public client — respects RLS, safe for user-facing operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Admin client — bypasses RLS, for trusted server-side operations only
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

For local development, run `meoo cloud pull-env` to write connection info to `.env`, then load with `dotenv`.

### CRUD operations

Same API for both frontend and server-side:

```typescript
// Query
const { data, error } = await supabase
  .from('todos')
  .select('*')
  .order('created_at', { ascending: false });

// Insert
const { data, error } = await supabase
  .from('todos')
  .insert({ title: 'New task', done: false })
  .select()
  .single();

// Update
const { error } = await supabase
  .from('todos')
  .update({ done: true })
  .eq('id', todoId);

// Delete
const { error } = await supabase
  .from('todos')
  .delete()
  .eq('id', todoId);
```

### Realtime subscriptions

```typescript
const channel = supabase
  .channel('todos-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'todos',
  }, (payload) => {
    console.log('Change:', payload);
  })
  .subscribe();

// Cleanup
channel.unsubscribe();
```

## Edge Functions

Edge Functions run on Deno and are deployed via `meoo fn deploy`. They are the only place where `MEOO_PROJECT_API_KEY` can be used.

### Basic Edge Function

```typescript
// functions/hello/index.ts
Deno.serve(async (req: Request) => {
  const { name } = await req.json();
  return new Response(
    JSON.stringify({ message: `Hello, ${name}!` }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

Deploy: `meoo fn deploy hello`

### Calling Edge Functions

From any code (frontend or server-side), use `supabase.functions.invoke()`:

```typescript
const { data, error } = await supabase.functions.invoke('hello', {
  body: { name: 'World' },
});
```

The auth header depends on context:
- **Frontend**: uses anon key or user session token (auto-handled by the Supabase client)
- **Server-side**: uses anon key or service role key (set when creating the client)

### AI Chat Edge Function

Standard pattern for LLM integration. The Edge Function proxies requests to Meoo AI using `MEOO_PROJECT_API_KEY`.

```typescript
// functions/ai-chat/index.ts
const MEOO_AI_URL = 'https://api.meoo.host/meoo-ai/compatible-mode/v1/chat/completions';
const MEOO_PROJECT_SERVICE_AK = Deno.env.get('MEOO_PROJECT_API_KEY') || '';

Deno.serve(async (req: Request) => {
  const { messages, model = 'qwen3.6-plus' } = await req.json();

  const response = await fetch(MEOO_AI_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MEOO_PROJECT_SERVICE_AK}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  return new Response(response.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
});
```

Deploy: `meoo fn deploy ai-chat`

**Available models**: qwen3.6-plus (default), kimi-k2.5, deepseek-v3.2, glm-5, MiniMax-M2.5

### AI streaming (frontend example)

```typescript
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase/client';

export async function requestAIStream(
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  signal?: AbortSignal
) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${supabaseUrl}/functions/v1/ai-chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token ?? supabaseAnonKey}`,
      },
      body: JSON.stringify({ messages }),
      signal,
    }
  );

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        try {
          const json = JSON.parse(line.slice(6));
          const content = json.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {}
      }
    }
  }
}
```

## Authentication (Supabase Auth)

```typescript
import { supabase } from '../supabase/client';

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Sign out
await supabase.auth.signOut();

// Listen to auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session);
});
```

## File Storage

```typescript
import { supabase } from '../supabase/client';

// Upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file);

// Get public URL
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`);

// Download
const { data, error } = await supabase.storage
  .from('avatars')
  .download(`${userId}/avatar.png`);
```

## Database migration workflow

```bash
# 1. Write your DDL
meoo db migrate --name create_users --sql "
  CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE,
    created_at timestamptz DEFAULT now()
  )
"

# 2. This automatically:
#    - Executes the DDL on your cloud database
#    - Saves migrations/YYYYMMDD_HHmmss_create_users.sql
#    - Updates src/supabase/types.ts with new table types

# 3. Verify
meoo db tables
meoo db query "SELECT * FROM users"
```

## Row Level Security (RLS)

Always enable RLS on tables that store user data:

```sql
-- Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own data
CREATE POLICY "Users can read own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own data
CREATE POLICY "Users can insert own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
