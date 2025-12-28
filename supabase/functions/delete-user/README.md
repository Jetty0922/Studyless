# Delete User Edge Function

This Supabase Edge Function handles complete account deletion, including:
- Review history
- Flashcards
- Decks
- User profile
- Storage files (flashcard images)
- Auth user account

## Deployment

1. Install Supabase CLI if not already installed:
```bash
npm install -g supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

4. Deploy the function:
```bash
supabase functions deploy delete-user
```

## Required Secrets

The function uses these environment variables (automatically available in Edge Functions):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (has admin access)

## Security

- Function requires valid JWT from authenticated user
- Only deletes data belonging to the requesting user
- Uses service role key server-side only (never exposed to client)
- CORS headers configured for mobile app access

## Usage

Called from the app when user confirms account deletion:

```typescript
const response = await fetch(`${supabaseUrl}/functions/v1/delete-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
});
```

## Testing

To test locally:
```bash
supabase functions serve delete-user --no-verify-jwt
```

Then call with:
```bash
curl -X POST 'http://localhost:54321/functions/v1/delete-user' \
  -H 'Authorization: Bearer YOUR_USER_JWT' \
  -H 'Content-Type: application/json'
```

