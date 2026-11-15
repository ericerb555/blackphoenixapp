# Connecting Facebook — the Facebook side

Eric, 2026-11-15: *"trying to connect facebook but its not allowing me to?"*
then *"not sure i am doing the facebook side right"*.

The app's half is done: both secrets are set and the connect route works — it
returned 200 with a login URL at 17:09:28 and Facebook refused before showing a
consent screen. Everything below is the Meta console, which is the half that
fails silently.

## THE ONE STRING THAT MATTERS

    https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/social-oauth/facebook

Paste it **exactly** — no trailing slash, no spaces. Facebook matches it
character for character and refuses anything else.

It is also on screen with a copy button: **Owners Dashboard → Social
onboarding → Facebook**. As of 2026-11-15 that panel shows the URL once the
secrets are set; before then it only appeared while the secrets were still
missing, which is why it looked like there was nothing left to do.

**Do not use** `.../make-server-3eae23a6/social/callback/facebook`. That is
the internal destination and this file's own header said it until
2026-11-15. Facebook never sees it.

## THE STEPS

1. **developers.facebook.com/apps** → your app. If there isn't one, create it:
   type **Business**.

2. **Add the Facebook Login product.** Left sidebar → *Add Product* →
   *Facebook Login* → *Set Up*. Web is fine; the quickstart can be skipped.

3. **Facebook Login → Settings.** Put the URL above into **Valid OAuth
   Redirect URIs** and save. Leave *Client OAuth Login* and *Web OAuth Login*
   on. This is the step whose absence produces "URL Blocked".

4. **Check the App ID and secret match ours.** Settings → Basic. They must be
   byte-identical to the Supabase secrets `FACEBOOK_APP_ID` and
   `FACEBOOK_APP_SECRET`. A mismatched secret fails LATER than this — the
   login works and the token exchange returns "Invalid client secret" — so if
   you get through consent and still fail, it is this.

5. **Stay in Development mode for now.** Top bar shows *App Mode*. In
   development, only people with a role on the app can log in, and you have
   one. Switching to Live before App Review (step 7) makes it refuse everyone.

6. **Connect from the app.** Owners Dashboard → Social onboarding → Facebook →
   Connect. A window opens, you approve, it says *Connected* and closes.

7. **Later, to post for real: App Review.** The connect asks for
   `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
   `instagram_basic`, `instagram_content_publish` and `business_management`.
   Those are Advanced Access and need **App Review plus Business
   Verification** before anyone outside your app's own roles can grant them.
   Your own account works without it, which is enough to test end to end.

## IF IT STILL REFUSES, THE ERROR TEXT SAYS WHICH ONE

Read Facebook's own words; they map one to one:

| What Facebook says | What it means |
|---|---|
| **URL Blocked** / redirect URI is not whitelisted | Step 3. The string does not match exactly. |
| **Invalid Scopes: …** | Step 7, or the account has no role on the app. |
| **This app is in development mode** | Step 5 — add your account under *App Roles*. |
| Unsupported / invalid version | Was ours: `v18.0` was hardcoded and is years past Meta's sunset. Fixed 2026-11-15 — the endpoints are unversioned now and resolve to the app's own default. Needs the server deployed. |
| Consent works, then "Invalid client secret" | Step 4. The secret does not match. |

## WHAT INSTAGRAM NEEDS, SINCE IT COMES UP NEXT

Nothing separate. Instagram publishes through a **Business** or **Creator**
account linked to a Facebook **Page**, using the same app and the same
connection — so Facebook has to work first. Its callback URL is the same
string with `instagram` on the end, and it needs whitelisting too.
