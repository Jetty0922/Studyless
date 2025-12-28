# Sentry Setup Guide

## 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and create a free account
2. Create a new project:
   - Platform: **React Native**
   - Project name: `studyless-mobile`
   - Organization: `studyless` (or your preference)

## 2. Get Your DSN

1. In Sentry, go to **Settings** → **Projects** → **studyless-mobile**
2. Click **Client Keys (DSN)**
3. Copy the DSN (looks like: `https://abc123@o123456.ingest.sentry.io/123456`)

## 3. Add DSN to Environment

Add to your `.env` file:
```bash
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn-here@o123456.ingest.sentry.io/123456
```

For EAS builds, add it as a secret:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://your-dsn@sentry.io/123456"
```

## 4. Configure Source Maps (for readable stack traces)

Add auth token to eas.json:
```json
{
  "build": {
    "production": {
      "env": {
        "SENTRY_AUTH_TOKEN": "@sentry-auth-token"
      }
    }
  }
}
```

Then add the secret:
```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "your-auth-token"
```

Get auth token from: Sentry → Settings → Auth Tokens → Create New Token

## 5. Test Sentry Integration

In development, you can test by temporarily enabling Sentry:
```typescript
// In App.tsx, temporarily change:
enabled: !__DEV__,  // to: enabled: true,
```

Then trigger a test error:
```typescript
Sentry.captureException(new Error("Test error from StudyLess"));
```

## What Sentry Captures

- JavaScript errors and crashes
- Native crashes (iOS/Android)
- Performance traces
- User sessions
- Breadcrumbs (navigation, network requests, user actions)

## Free Tier Limits

- 5,000 errors/month
- 10,000 performance transactions/month
- 1 team member

This is enough for most indie apps. Upgrade when needed.

## Dashboard

Once configured, view errors at:
`https://sentry.io/organizations/studyless/issues/`

Set up alerts to get notified of new crashes via email or Slack.

