# M41NUL Push — Backend

Firebase Cloud Messaging (FCM) push notification backend for Wevlo-built apps.

## Render এ Deploy করার ধাপ

### ১. GitHub এ কোড push করো
এই folder টা একটা নতুন GitHub repo তে push করো (private repo রাখাই ভালো)।
**⚠️ `serviceAccountKey.json` কখনো push করবে না** — `.gitignore` তে আগে থেকেই বাদ দেওয়া আছে।

### ২. Render এ নতুন Web Service বানাও
1. [render.com](https://render.com) এ যাও, GitHub দিয়ে login করো
2. **New +** → **Web Service**
3. তোমার repo select করো
4. Settings:
   - **Name**: `m41nul-push`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (অথবা paid, যদি 24/7 sleep ছাড়া দরকার হয়)

### ৩. Environment Variable সেট করো (Firebase Key)
Render dashboard এ তোমার service এর **Environment** ট্যাবে যাও, **Add Environment Variable**:

- **Key**: `FIREBASE_SERVICE_ACCOUNT`
- **Value**: তোমার ডাউনলোড করা `.json` ফাইলের পুরো content, এক লাইনে paste করো (পুরো JSON object সহ)

এটাই backend কে Firebase এর সাথে authenticate করাবে। কোড এর ভিতরে key hardcode করা নেই।

### ৪. Deploy
Save করলেই Render automatically build ও deploy শুরু করবে। কয়েক মিনিট পর একটা URL পাবে, যেমন:
```
https://m41nul-push.onrender.com
```

### ৫. Frontend আপডেট করো
Build page (`build.html`) আর Push Dashboard এর মধ্যে যেখানে
```
https://dinalamin-din-push-server.hf.space/
```
আছে, সেটা তোমার নতুন Render URL দিয়ে replace করতে হবে।

---

## ⚠️ Free Tier এর ব্যাপারে জানা দরকার
Render এর Free plan এ ১৫ মিনিট request না এলে service **sleep** করে। পরের request এ ২০-৫০ সেকেন্ড লাগতে পারে wake up হতে (cold start)। এতে:
- App থেকে token registration সামান্য দেরি হতে পারে
- Dashboard থেকে load/send করার সময় প্রথম request slow হতে পারে

যদি সবসময় instant response দরকার হয়, Render এর paid plan ($7/mo থেকে শুরু) নিতে হবে যেটা sleep করে না।

## Local এ Test করা
```bash
npm install
# serviceAccountKey.json ফাইলটা এই folder এ রাখো (git এ যাবে না)
npm start
```
Server চলবে `http://localhost:3000` এ।

## API Endpoints
| Method | Path | কাজ |
|---|---|---|
| GET | `/` | Health check |
| POST | `/register-app` | App ID + password register (build এর আগে) |
| POST | `/register-token` | App থেকে FCM token পাঠানো |
| GET | `/tokens?appId=&password=` | Dashboard থেকে token list load |
| POST | `/send-notification` | Push notification পাঠানো |
