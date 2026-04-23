# Meta Messenger API Setup

## Environment Variables Needed

Add these to `.env.local` and Vercel Environment Variables:

```env
# Meta Messenger API
MESSENGER_PAGE_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MESSENGER_APP_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MESSENGER_VERIFY_TOKEN=your-verify-token-here
```

## Where to Find These

### 1. MESSENGER_PAGE_ACCESS_TOKEN
- Go to: https://developers.facebook.com/apps/936591262528758/messenger/
- Generate or copy the Page Access Token
- Looks like: `EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...`

### 2. MESSENGER_APP_SECRET
- Go to: https://developers.facebook.com/apps/936591262528758/dashboard/
- Click: Settings → Basic
- Click: Show on the App Secret field
- Copy the secret

### 3. MESSENGER_VERIFY_TOKEN
- Create any random string (e.g., `mate-reminder-2024`)
- Or generate one: https://randomkeygen.com/

## Setup Steps After Adding Credentials

1. Add environment variables to `.env.local`
2. Add environment variables to Vercel Dashboard → Settings → Environment Variables
3. Push to GitHub for deployment
4. Then complete webhook setup in Meta Developer Portal

## Webhook Setup in Meta Portal

After deploying, you'll set up the webhook:

1. Go to: https://developers.facebook.com/apps/936591262528758/messenger/
2. Find: Webhook section
3. Enter:
   - **Callback URL**: `https://your-vercel-app.vercel.app/api/messenger/webhook`
   - **Verify Token**: The same token you set in `MESSENGER_VERIFY_TOKEN`
4. Click: Verify and Save

5. Subscribe to: `messages` event