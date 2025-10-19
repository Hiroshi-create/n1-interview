# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered interview system built with Next.js 14 that combines real-time speech recognition, 3D avatars, and sentiment analysis. The system supports both authenticated users and guest users, with multi-tenant client organizations.

**Core Technologies:**
- Next.js 14 (App Router)
- TypeScript
- Firebase (Auth, Firestore, Cloud Functions)
- Three.js + React Three Fiber for 3D avatars
- OpenAI for TTS and chat responses
- Google Cloud Speech API for transcription
- Stripe for subscriptions

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Linting (run before commits)
npm run lint
```

## Architecture Overview

### Authentication & Multi-tenancy
- **User Types**: Individual users (`/auto-interview/`) and client organizations (`/client-view/`)
- **MFA Support**: TOTP-based multi-factor authentication using Firebase Auth
- **Tenant System**: Client organizations have isolated data access via Firebase tenant isolation

### State Management
- **Global State**: React Context (`src/context/AppContext.tsx`) for auth, interview state, and audio permissions
- **Type Definitions**: Centralized in `src/stores/` (TypeScript interfaces, not Zustand stores)
- **Interview Flow**: Phase-based system with operation checks and interview phases

### API Structure
All API routes are in `src/app/api/` and follow Next.js App Router conventions:
- `/api/interview_server/` - Main interview WebSocket-like endpoint
- `/api/transcribe/` - Real-time speech transcription
- `/api/auth/` - Authentication endpoints
- `/api/client_preferences/` - Organization settings
- Common functions in `/api/components/commonFunctions.tsx`

### Key Features

**3D Avatar System:**
- Ready Player Me integration for avatar creation
- Custom animation system with FBX files in `/public/animations/`
- Lip-sync generation from Japanese phonemes
- Emotion analysis and facial expressions

**Speech Processing Pipeline:**
1. Browser captures audio via WebRTC
2. Real-time transcription using Google Cloud Speech API
3. OpenAI generates conversational responses
4. TTS synthesis with lip-sync data generation
5. 3D avatar renders with synchronized mouth movements

**Interview Management:**
- Theme-based interview templates
- Phase progression with automatic transitions  
- Real-time message persistence in Firestore
- Individual and summary reporting with data visualization

## Code Patterns & Conventions

### File Structure
- **Pages**: `src/app/` using App Router file-based routing
- **Components**: Feature-specific in respective page directories, shared UI in `src/context/components/ui/`
- **API Logic**: Shared functions in `src/app/api/components/`
- **Types**: Centralized in `src/stores/` directory (named as `.tsx` but contain TypeScript interfaces)

### Import Aliases
- Use `@/` for imports from `src/` directory
- Configured in `tsconfig.json` paths

### Audio & Media Handling
- FFmpeg integration for audio processing (`@ffmpeg/ffmpeg`)
- Cloudinary for media storage and optimization
- Memory caching for audio files and lip-sync data in API routes

### Firebase Integration
- **Client**: `src/lib/firebase.ts` for frontend
- **Admin**: `src/lib/firebase-admin.ts` for API routes
- **Functions**: Separate deployment in `cloud_functions/`

### Stripe Integration
- Subscription management with organization-based billing
- Webhook handling in `/api/stripe_hooks/`
- Portal integration for customer self-service

## Environment Variables Required

### .env ファイル
```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Firebase Admin (Server-side)
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PROJECT_ID=

# Google Cloud Speech API
GCP_PROJECT_ID=
GCP_PRIVATE_KEY=
GCP_CLIENT_EMAIL=

# OpenAI (Server-side only)
OPENAI_API_KEY=  # 新規: サーバーサイド専用のOpenAI APIキー
NEXT_PUBLIC_OPENAI_KEY=  # 非推奨: 互換性のため一時的に保持

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Other APIs
GOO_LAB_APP_ID=  # For Japanese phoneme analysis

# Security Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://n1-interview-kanseibunseki-incs-projects.vercel.app
NODE_ENV=development  # or production
LOG_LEVEL=info  # debug, info, warn, error
```

### .env.local ファイル
```
# Vercel KV Configuration
KV_URL=
KV_REST_API_READ_ONLY_TOKEN=
KV_REST_API_TOKEN=
KV_REST_API_URL=
```

## Important Considerations

### Performance Optimizations
- Audio files are cached in memory during API processing
- Lip-sync data is pre-computed and cached
- Three.js modules are transpiled in `next.config.js`
- Vercel KV is used for phoneme caching

### WebRTC & Browser Compatibility
- Microphone permissions are managed through React Context
- AudioContext initialization requires user interaction
- Cross-browser fallbacks for WebAudio API

### Japanese Language Processing
- Custom phoneme-to-viseme mapping for lip-sync
- Integration with Goo Labs API for accurate Japanese pronunciation
- Support for hiragana, katakana, and kanji

## Testing & Deployment

The application is deployed on Vercel with the following considerations:
- Firebase Functions deployed separately
- Environment variables configured in Vercel dashboard
- Build process includes TypeScript compilation and Next.js optimization

## Data Flow

1. **User Authentication** → Firebase Auth with optional MFA
2. **Interview Setup** → Theme selection and interview initialization  
3. **Real-time Communication** → WebRTC audio → Speech API → OpenAI → TTS → 3D Avatar
4. **Data Persistence** → Firestore for messages, user data, and analytics
5. **Reporting** → Data aggregation and visualization using Nivo charts

## External Services Integration

- **Firebase**: Complete backend infrastructure
- **Stripe**: Payment processing and subscription management
- **OpenAI**: Text-to-speech and conversational AI
- **Google Cloud**: Speech recognition and translation
- **Cloudinary**: Media processing and CDN
- **Vercel KV**: High-performance caching layer

## Next.js 14 Best Practices & Development Guidelines

### Core Principles
1. **App Router First**: Always use App Router (src/app) over Pages Router
2. **Server Components by Default**: Use Server Components unless client interactivity is required
3. **Type Safety**: Leverage TypeScript strictly - avoid `any` types
4. **Security First**: Never expose sensitive data to client-side
5. **Performance Optimization**: Implement proper caching and optimization strategies

### Server vs Client Components

#### Server Components (Default)
```typescript
// ✅ Good: Server Component for data fetching
export default async function ThemeList() {
  const themes = await getThemes(); // Direct database access
  return <div>{/* Render themes */}</div>;
}
```

#### Client Components ("use client")
```typescript
// ✅ Good: Only when client interactivity is needed
"use client";
import { useState } from 'react';

export default function InteractiveComponent() {
  const [state, setState] = useState();
  // Client-side logic here
}
```

### Data Fetching Patterns

#### Server-Side Data Fetching
```typescript
// ✅ Good: Direct database access in Server Components
export default async function ServerPage() {
  const data = await db.collection('themes').get();
  return <ThemeList themes={data} />;
}
```

#### Client-Side Data Fetching
```typescript
// ✅ Good: Use SWR or React Query for client data
"use client";
import useSWR from 'swr';

export default function ClientDataComponent() {
  const { data, error, isLoading } = useSWR('/api/themes', fetcher);
  if (error) return <ErrorComponent error={error} />;
  if (isLoading) return <LoadingSpinner />;
  return <ThemeList themes={data} />;
}
```

### API Route Best Practices

#### Proper Error Handling
```typescript
// ✅ Good: Standardized error handling
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Input validation
    const validatedData = schema.parse(body);
    
    // Business logic
    const result = await processData(validatedData);
    
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    // Log error securely (no sensitive data)
    console.error('API Error:', error.message);
    
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

#### Authentication & Authorization
```typescript
// ✅ Good: Consistent auth checking
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Proceed with authenticated logic
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
```

### Type Safety & Validation

#### Zod Schema Validation
```typescript
// ✅ Good: Input validation with Zod
import { z } from 'zod';

const CreateThemeSchema = z.object({
  theme: z.string().min(1).max(200),
  deadline: z.string().datetime(),
  isPublic: z.boolean(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const validatedData = CreateThemeSchema.parse(body);
  // Now validatedData is type-safe
}
```

#### Strict TypeScript Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Security Best Practices

#### Environment Variables Security
```typescript
// ✅ Good: Server-only secrets
const serverConfig = {
  openaiKey: process.env.OPENAI_API_KEY!, // Server-only
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY!
};

// ✅ Good: Client-safe public config
const clientConfig = {
  firebaseConfig: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!
  }
};
```

#### Security Headers (next.config.js)
```javascript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
];
```

### Performance Optimization

#### React Optimization
```typescript
// ✅ Good: Proper memo usage
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }: Props) {
  const expensiveValue = useMemo(() => computeExpensiveValue(data), [data]);
  
  const handleClick = useCallback((id: string) => {
    // Event handler
  }, []);

  return <div>{/* Component JSX */}</div>;
});
```

#### Image Optimization
```typescript
// ✅ Good: Next.js Image component
import Image from 'next/image';

<Image
  src="/avatar.jpg"
  alt="Avatar"
  width={500}
  height={300}
  priority={false}
  placeholder="blur"
/>
```

### State Management Patterns

#### Context Organization
```typescript
// ✅ Good: Split contexts by domain
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

interface InterviewContextType {
  currentInterview: Interview | null;
  startInterview: (themeId: string) => Promise<void>;
  endInterview: () => Promise<void>;
}
```

### Error Handling & Logging

#### Structured Logging
```typescript
// ✅ Good: Structured, environment-aware logging
const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(message, meta);
    }
  },
  error: (message: string, error?: Error, meta?: Record<string, any>) => {
    // Always log errors, but sanitize sensitive data
    const sanitizedMeta = meta ? sanitizeLogData(meta) : {};
    console.error(message, { error: error?.message, ...sanitizedMeta });
  }
};

function sanitizeLogData(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'privateKey'];
  const sanitized = { ...data };
  
  sensitiveKeys.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}
```

#### Error Boundaries
```typescript
// ✅ Good: Error boundaries for graceful failure
"use client";
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}
```

### Testing Strategy

#### Unit Testing
```typescript
// ✅ Good: Comprehensive API testing
import { POST } from '../route';
import { createMocks } from 'node-mocks-http';

describe('/api/themes', () => {
  it('should create a new theme', async () => {
    const { req } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token'
      },
      body: {
        theme: 'New Product Interview',
        deadline: '2024-12-31T23:59:59Z',
        isPublic: false
      }
    });

    const response = await POST(req as any);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.theme).toBe('New Product Interview');
  });
});
```

### Accessibility (a11y)

#### Semantic HTML & ARIA
```typescript
// ✅ Good: Accessible component structure
export default function InterviewCard({ interview }: Props) {
  return (
    <article
      role="article"
      aria-labelledby={`interview-${interview.id}`}
      className="interview-card"
    >
      <h2 id={`interview-${interview.id}`}>
        {interview.theme}
      </h2>
      <p aria-describedby={`desc-${interview.id}`}>
        Interview description
      </p>
      <button
        aria-label={`Start interview: ${interview.theme}`}
        onClick={handleStart}
      >
        Start Interview
      </button>
    </article>
  );
}
```

### TypeScript-First Development

This project prioritizes TypeScript over JavaScript for all development:

#### File Extensions Priority
1. **Always use `.tsx` for React components** - Never use `.jsx`
2. **Always use `.ts` for utility functions** - Never use `.js`
3. **Exception**: Only use `.js` when absolutely required by external libraries

#### Type Safety Requirements
```typescript
// ✅ Good: Strict TypeScript with proper interfaces
interface InterviewProps {
  theme: string;
  duration: number;
  onComplete: (data: InterviewData) => void;
}

// ❌ Bad: Any type usage
const handleData = (data: any) => { /* ... */ };

// ✅ Good: Proper type definition
const handleData = (data: InterviewData) => { /* ... */ };
```

#### Migration from JS to TS
When converting existing `.js/.jsx` files:
1. Change file extension to `.ts/.tsx`
2. Add proper type annotations
3. Fix all TypeScript errors
4. Update imports in other files if needed

### Critical Rules

#### ❌ Never Do These
1. **Never use `any` type** - Always define proper types
2. **Never use `.js/.jsx` extensions** - Use `.ts/.tsx` exclusively
3. **Never expose secrets to client** - Use `NEXT_PUBLIC_` carefully
4. **Never use `console.log` in production** - Use proper logging
5. **Never mutate props directly** - Use immutable patterns
6. **Never skip error handling** - Always handle potential failures
7. **Never ignore TypeScript errors** - Fix all type errors

#### ✅ Always Do These
1. **Always use TypeScript** - Write all new code in TypeScript
2. **Always validate inputs** - Use Zod or similar validation
3. **Always handle loading/error states** - Provide good UX
4. **Always use proper HTTP status codes** - Be RESTful
5. **Always implement proper caching** - Use Next.js caching features
6. **Always test critical paths** - Ensure reliability
7. **Always follow security headers** - Implement CSP, HSTS, etc.

### Code Review Checklist

Before submitting code, verify:
- [ ] TypeScript errors resolved
- [ ] Proper error handling implemented  
- [ ] Input validation added
- [ ] Security considerations addressed
- [ ] Performance optimizations applied
- [ ] Accessibility standards followed
- [ ] Tests written for new functionality
- [ ] No console.log statements in production code
- [ ] Environment variables properly secured
- [ ] Code follows established patterns