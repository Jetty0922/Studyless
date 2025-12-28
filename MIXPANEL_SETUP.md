# Mixpanel Analytics Setup Guide

## 1. Create a Mixpanel Account

1. Go to [mixpanel.com](https://mixpanel.com) and create a free account
2. Create a new project called "StudyLess"
3. Select your data residency (US or EU)

## 2. Get Your Project Token

1. Go to **Settings** → **Project Settings**
2. Under **Access Keys**, copy your **Project Token**
   (It looks like: `abc123def456...`)

## 3. Add Token to Environment

Add to your `.env` file:
```bash
EXPO_PUBLIC_MIXPANEL_TOKEN=your-project-token-here
```

For EAS builds, add it as a secret:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_MIXPANEL_TOKEN --value "your-project-token"
```

## 4. Events Being Tracked

The following events are automatically tracked:

| Event | When | Properties |
|-------|------|------------|
| `User Signed Up` | User creates account | `method` (email/google/apple) |
| `Screen View` | User navigates | `screen_name` |
| `Deck Created` | User creates deck | `deck_id`, `has_test_date` |
| `Flashcards Created` | User adds cards | `count`, `source` |
| `Review Completed` | User finishes review | `card_count`, `duration_seconds`, ratings |
| `AI Generation` | AI generates cards | `source`, `success`, `card_count` |
| `Feature Used` | User uses a feature | `feature` |

## 5. Adding More Events

To track additional events in your code:

```typescript
import { trackEvent, trackFeatureUsed } from '../services/analytics';

// Track a custom event
trackEvent('Button Clicked', { button_name: 'export_data' });

// Track feature usage
trackFeatureUsed('dark_mode_toggle');
```

## 6. Setting User Properties

To add persistent user info:

```typescript
import { setUserProperties } from '../services/analytics';

setUserProperties({
  plan: 'free',
  total_decks: 5,
  signup_date: '2024-01-15',
});
```

## 7. Viewing Data

Once configured, view analytics at:
`https://mixpanel.com/project/YOUR_PROJECT_ID`

### Useful Reports to Create:
- **Funnel**: Signup → Create Deck → Add Cards → Complete Review
- **Retention**: D1, D7, D30 retention
- **User Flows**: How users navigate the app
- **Events Over Time**: Daily active users, cards reviewed

## Free Tier Limits

- 20M events/month (very generous)
- Core analytics features
- 90-day data history

This is more than enough for most apps.

## Testing

In development, events are logged to console:
```
[Analytics] Event: Deck Created { deck_id: "abc", has_test_date: true }
```

In production, events are sent to Mixpanel automatically.

## Privacy Considerations

- We only identify users by their UUID (no PII)
- User email is NOT sent to Mixpanel
- Reset analytics on sign out to unlink devices
- Add data handling info to your privacy policy

