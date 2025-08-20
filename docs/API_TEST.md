# Quick API Test

To test if your authentication API is working correctly:

## Test Registration Endpoint

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "confirmPassword": "testpass123",
    "username": "testuser"
  }'
```

## Expected Response (Success)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "test@example.com",
      "username": "testuser",
      "isGuest": false
    },
    "session": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_at": 1234567890
    }
  },
  "message": "Account created successfully"
}
```

## Common Error Responses

### Invalid API Key
```json
{
  "success": false,
  "error": "Invalid API key",
  "code": "INVALID_API_KEY"
}
```
**Solution**: Check your `.env.local` file and Supabase project settings.

### Username Already Taken
```json
{
  "success": false,
  "error": "Username already taken"
}
```
**Solution**: Try a different username.

### Email Already Registered
```json
{
  "success": false,
  "error": "User already registered",
  "code": "USER_ALREADY_EXISTS"
}
```
**Solution**: Try a different email or use the login endpoint instead.

## Troubleshooting

1. **Check Environment Variables**:
   ```bash
   # Make sure these are set in .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Check Supabase Configuration**:
   - Go to Supabase Dashboard > Authentication > Settings
   - Disable "Enable email confirmations" for development
   - Set Site URL to `http://localhost:3000`

3. **Check Database**:
   - Ensure the `users` table exists
   - Check that the schema has been applied correctly
   - Verify RLS policies are properly configured

4. **Check Network**:
   - Ensure your development server is running on port 3000
   - Check for any firewall or proxy issues
   - Verify internet connection for Supabase access
