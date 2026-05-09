# Meta Messenger API Setup Guide

This guide walks you through setting up a new Meta Developer account and linking it to your Mate Reminder application.

## 1. Create Your Meta App

1. Go to the [Meta Developer Portal](https://developers.facebook.com/apps/) and click **Create App**.
2. Select **Other** as the use case, then select **Business** as the app type.
3. Give your app a name (e.g., "Mate Reminder Bot") and enter your contact email.
4. Click **Create app**.

## 2. Add Messenger to Your App

1. On your App Dashboard, scroll down to the **Add products to your app** section.
2. Find **Messenger** and click **Set Up**.

## 3. Generate Environment Variables

You need three environment variables for your `.env.local` and Vercel settings.

### A. MESSENGER_PAGE_ACCESS_TOKEN
1. In the left sidebar, under **Messenger**, click **API Setup**.
2. Scroll down to the **Access Tokens** section.
3. Click **Add or Remove Pages** and link the Facebook Page you want your bot to use (create a new Page if you don't have one).
4. Once the page is linked, click **Generate Token**.
5. Copy this long token. This is your `MESSENGER_PAGE_ACCESS_TOKEN`.

### B. MESSENGER_APP_SECRET
1. In the left sidebar, go to **App Settings** -> **Basic**.
2. Find the **App Secret** field and click **Show** (you may need to enter your password).
3. Copy this secret. This is your `MESSENGER_APP_SECRET`.

### C. MESSENGER_VERIFY_TOKEN
1. You make this up yourself! It just acts as a password between your app and Meta.
2. Create a random string like `mate-reminder-secure-token-2024`.
3. Save this as your `MESSENGER_VERIFY_TOKEN`.

## 4. Add Variables to Your Project

Add the three variables you just gathered into your `.env.local` file and to your **Vercel Environment Variables**:

```env
MESSENGER_PAGE_ACCESS_TOKEN=your_page_access_token_here
MESSENGER_APP_SECRET=your_app_secret_here
MESSENGER_VERIFY_TOKEN=your_custom_verify_token_here
```

**IMPORTANT:** Deploy your code to Vercel after adding these variables. The webhook must be live on the internet before Meta can verify it in the next step.

## 5. Set Up the Webhook

Once your app is deployed to Vercel:

1. Go back to your Meta Developer Dashboard.
2. Under **Messenger** -> **API Setup**, scroll down to the **Webhooks** section.
3. Click **Configure** or **Add Callback URL**.
4. **Callback URL:** Enter your live Vercel URL followed by the api route: `https://YOUR-VERCEL-DOMAIN.vercel.app/api/messenger/webhook`
5. **Verify Token:** Enter the exact string you created for `MESSENGER_VERIFY_TOKEN`.
6. Click **Verify and Save**. (If it fails, double-check your Vercel logs to ensure the deployment finished).
7. Finally, click **Manage** next to Webhooks and subscribe to the `messages` event.