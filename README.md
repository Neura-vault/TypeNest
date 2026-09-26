# TypeNest — Setup aur Deployment Guide

Ye TypeNest ka complete, real, deploy-hone-wala codebase hai. Next.js 14 (App Router) + Supabase (database, auth, backend) pe bana hai. Ye guide aapko step-by-step batayegi ke apne computer pe kaise chalayein, aur phir internet pe live kaise karein.

Poori guide Roman Urdu mein hai taake har step clear rahe. Agar kahin atak jayen, "Troubleshooting" section neeche dekhein.

---

## 1. Ye Project Kya Hai

TypeNest ek typing platform hai — typing tests, AI coach, games, academy lessons, daily challenge, Pace Bot races, leaderboard, missions/achievements — sab real, working code ke sath.

**Important baat:** Kuch features (real-time multiplayer, friends system, poori academy content library) is version mein shamil nahi hain kyunki unhe live multiplayer server ya bara content library chahiye — wo agle updates mein aayenge. Jo bhi is codebase mein hai, wo **100% real hai**, koi fake/dummy data nahi.

### Abhi Kya Kaam Karta Hai / Kya Aa Raha Hai

| Feature | Status | Note |
|---|---|---|
| Typing tests (Time/Words, Quote, Code modes) | ✅ Working | Real WPM/accuracy/consistency scoring, saved to your account |
| Urdu + Roman Urdu typing | ✅ Working | Full language selector on the Practice page, RTL caret support |
| Leaderboard | ✅ Working | All-time/monthly/weekly/daily, filterable by test mode, verified-email only |
| Missions & XP | ✅ Working | Server-verified — the client can't fake a claim |
| Achievements | ✅ Working | 12 achievements, unlock automatically as you hit each milestone |
| Academy | ✅ Working (3 lessons) | Home Row, Top Row, Common Words — more lessons are a content task, not a code task |
| Typing Arcade (Falling Words) | ✅ Working | Speed Rush and Accuracy Survival are UI-only placeholders for now |
| Daily Challenge | ✅ Working | One counted attempt per day, enforced server-side |
| Compete: Pace Bot race | ✅ Working | A scripted pace target, not real AI — see the note below |
| AI Coach (Train page) | ✅ Working | Real analysis of your own saved tests — weak keys, trends, recommendations |
| Themes | ✅ Working | 6 themes (Aurora, Midnight, Cyber, Ocean, Forest, Sunset) |
| Sound effects | ✅ Working | Synthesized keystroke sounds, no audio files to manage |
| Guest mode | ✅ Working | Results save locally and migrate into your account the moment you sign up |
| Real-time multiplayer | ⏳ Not yet | Needs a live server (Supabase Realtime or Socket.io) |
| Friends system | ⏳ Not yet | Needs real-time infrastructure first |
| Full Academy library (16+ lessons) | ⏳ Not yet | Content work, not architecture work — the lesson system already supports adding more |
| Ranked matchmaking | ⏳ Not yet | Depends on real-time multiplayer |

A note on "Pace Bot": Compete's race opponent is a scripted speed target (`min + random() * range` for the chosen difficulty), not a language model or real AI. It's called a Pace Bot throughout the UI for exactly that reason — it's an honest, useful feature on its own, it just isn't "AI."

### Tech Stack
- **Frontend + Backend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database + Authentication:** Supabase (PostgreSQL)
- **Testing:** Vitest (`npm run test`)
- **Hosting:** Vercel (recommended), ya Netlify, ya koi bhi Docker-supporting platform (Railway, Render, Fly.io, apna VPS)

---

## 2. Zaroori Cheezein (Prerequisites)

Shuru karne se pehle ye cheezein install honi chahiye:

1. **Node.js** version 18 ya usse upar — [nodejs.org](https://nodejs.org) se download karein
2. **Git** — [git-scm.com](https://git-scm.com)
3. Ek **GitHub account** (free) — [github.com](https://github.com)
4. Ek **Supabase account** (free) — [supabase.com](https://supabase.com)
5. Ek **Vercel account** (free, deployment ke liye) — [vercel.com](https://vercel.com)

Check karne ke liye terminal/command prompt mein likhein:
```bash
node --version
git --version
```
Agar dono version dikha dein, aap ready hain.

---

## 3. Supabase Project Banana (Database + Backend)

1. [supabase.com](https://supabase.com) pe jaake sign up karein aur **"New Project"** dabayein.
2. Project ka naam dein (jaise `typenest`), ek strong database password set karein (**ye password kahin save kar lein**), aur apne se qareeb region select karein.
3. Project banne mein 1-2 minute lagenge.
4. Project ban jane ke baad, **left sidebar → Settings → API** pe jayein. Yahan 3 cheezein milengi jo aapko chahiye:
   - **Project URL** (jaise `https://abcdefgh.supabase.co`)
   - **anon public key** (lambi si string)
   - **service_role key** (ye secret hai, kabhi kisi ko na dikhayein)

Ye teeno values abhi ke liye kahin note kar lein — agle step mein use hongi.

### Database Tables Banana (Migrations Run Karna)

Is project ke andar `supabase/migrations/` folder mein saari SQL files hain — inhi se database ke sab tables, security rules, aur functions bante hain. Sequential order mein (0001 se shuru) hi run karna zaroori hai.

**Sabse aasan tareeqa (Supabase Dashboard se):**

1. Supabase dashboard mein **left sidebar → SQL Editor** pe jayein.
2. **"New Query"** dabayein.
3. `supabase/migrations/0001_profiles_and_settings.sql` file ko kholein, poora content copy karein, SQL Editor mein paste karein, aur **Run** dabayein.
4. Yehi step 0002, 0003, 0004, 0005, 0006, 0007 files ke liye **isi tarteeb (order) mein** dohrayein — number ke hisaab se, kyunki baad wali files pehli files ke tables use karti hain.

Sab 7 files run hone ke baad, **left sidebar → Table Editor** mein jaake check kar sakte hain — `profiles`, `typing_tests`, `achievements` jaisi tables dikhni chahiye.

**Doosra tareeqa (Supabase CLI se, agar comfortable hon):**
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

---

## 4. Email Branding Fix Karna (Activation Email)

Jo email signup pe jata hai, wo by-default Supabase ka generic template hota hai — sender name "Supabase Auth" dikhta hai aur design plain hota hai. Isay TypeNest jaisa banane ke liye:

### Sender Name Badalna
1. Supabase Dashboard → **Authentication → Settings** pe jayein.
2. **SMTP Settings** section mein "Sender Name" field mein `TypeNest` likh dein (agar aap apna khud ka SMTP — jaise Resend, SendGrid — use kar rahe hain to wahan bhi "From Name" set karein).
3. Agar aap Supabase ka free built-in email service use kar rahe hain (SMTP setup nahi kiya), sender name limited customization allow karta hai — production ke liye apna SMTP provider connect karna behtar hai (Resend.com ka free tier is kaam ke liye kaafi hai).

### Email Design Badalna
1. Supabase Dashboard → **Authentication → Email Templates** pe jayein.
2. **"Confirm signup"** template select karein.
3. Is project ke `supabase/email-templates/confirm-signup.html` file ko kholein, poora HTML copy karein, aur Supabase ke template editor mein paste kar dein (ye TypeNest ke colors/logo ke sath branded hai).
4. Yehi step **"Reset password"** template ke liye `supabase/email-templates/reset-password.html` se karein.
5. **Save** dabayein. Ab agli signup email TypeNest-branded aayegi.

**Zaroori:** `{{ .ConfirmationURL }}` wali line kabhi na hatayein — ye asal Supabase variable hai jahan se activation link generate hota hai.

---

## 5. Google OAuth Disable Karna

Agar aap ne pehle Google sign-in try kiya tha aur ab hatana chahte hain:

1. Supabase Dashboard → **Authentication → Providers** pe jayein.
2. **Google** provider ko dhoondein aur toggle **OFF** kar dein.
3. Agar aap ne Google Cloud Console mein koi OAuth app bhi banaya tha, wo wahan se bhi delete kar sakte hain (optional, koi nuksan nahi agar chhod dein).

Is codebase mein Google sign-in button kahin bhi add nahi kiya gaya — sirf email/password authentication hai, isliye code mein kuch hatane ki zaroorat nahi.

---

## 6. Local Computer Pe Project Chalana

### Step 1 — Code Download Karein
Agar aapko ye files already mil chuki hain (zip ya folder), unhe kisi folder mein rakhein aur terminal mein wahan jayein:
```bash
cd typenest
```

### Step 2 — Packages Install Karein
```bash
npm install
```
Ye internet se Next.js, React, Supabase jaisi libraries download karega. Thora time lag sakta hai.

### Step 3 — Environment Variables Set Karein
`.env.example` file ko copy kar ke `.env.local` naam ki nayi file banayein:
```bash
cp .env.example .env.local
```
Ab `.env.local` file ko kisi text editor mein kholein aur Section 3 mein note ki hui values daal dein:
```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-yahan
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-yahan
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
**Yaad rahe:** `.env.local` file kabhi GitHub pe upload na karein — ye already `.gitignore` mein hai isliye automatically safe hai.

### Step 4 — Dev Server Chalayein
```bash
npm run dev
```
Ab browser mein `http://localhost:3000` kholein — TypeNest chalta hua dikhega.

### Step 5 — Test Karein
- Sign up karein (naya account banayein)
- Ek typing test dein
- Stats page pe jaake dekhein test save hua ya nahi

Agar test save ho raha hai to matlab database sahi se connect hai.

---

## 7. GitHub Pe Code Daalna

Deployment ke liye code GitHub pe hona zaroori hai (Vercel aur Netlify dono GitHub se hi deploy karte hain).

```bash
cd typenest
git init
git add .
git commit -m "Initial commit: TypeNest"
```

Ab GitHub.com pe jaake ek naya **empty repository** banayein (README/gitignore add na karein, kyunki ye already hain), phir:

```bash
git remote add origin https://github.com/your-username/typenest.git
git branch -M main
git push -u origin main
```

**Zaroor check karein:** `.env.local` file GitHub pe nahi jaani chahiye — `git status` chala kar dekh lein ke wo list mein na ho.

---

## 8. Vercel Pe Deploy Karna (Sabse Aasan Tareeqa)

1. [vercel.com](https://vercel.com) pe jaake GitHub account se sign in karein.
2. **"Add New Project"** dabayein, apna `typenest` GitHub repo select karein.
3. Vercel khud detect kar lega ke ye Next.js project hai — koi extra config nahi chahiye.
4. **"Environment Variables"** section mein ye 4 values dalein (wahi jo `.env.local` mein hain):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` — abhi ke liye Vercel jo temporary URL dega wahi daal dein (jaise `https://typenest.vercel.app`), deploy hone ke baad update kar sakte hain.
5. **Deploy** dabayein. 2-3 minute mein live ho jayega.

### Apna Domain Baad Mein Add Karna
Jab aapke paas apna domain ho:
1. Vercel project → **Settings → Domains** → apna domain likhein.
2. Vercel jo DNS records dega, unhe apne domain provider (GoDaddy, Namecheap, wagera) mein add kar dein.
3. `NEXT_PUBLIC_SITE_URL` environment variable ko naye domain se update kar ke **redeploy** karein.
4. Supabase dashboard → **Authentication → URL Configuration** mein bhi naya domain add karein (warna login redirect kaam nahi karega).

---

## 9. Alternative Platforms (Portability)

Ye project sirf Vercel tak mahdood nahi — GitHub se kisi bhi platform pe le ja sakte hain:

### Netlify
1. [netlify.com](https://netlify.com) pe GitHub se sign in karein.
2. "Import from Git" → apna repo select karein.
3. Netlify khud `netlify.toml` file ko dekh kar settings apply kar lega.
4. Wahi 4 environment variables Netlify ke dashboard mein dalein.

### Railway / Render / Fly.io (Docker se)
Is project mein ek `Dockerfile` bhi hai, isliye kisi bhi Docker-supporting platform pe deploy ho sakta hai:
1. Railway/Render pe naya project banayein, GitHub repo connect karein.
2. Platform khud `Dockerfile` detect kar lega.
3. Environment variables dashboard mein dalein.
4. Deploy dabayein.

### Apna VPS (Self-Host)
```bash
docker build -t typenest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  --build-arg NEXT_PUBLIC_SITE_URL=https://yourdomain.com .

docker run -p 3000:3000 --env-file .env.local typenest
```

---

## 10. Production Build (Local Test)

Deploy karne se pehle local pe production build test kar sakte hain:
```bash
npm run build
npm run start
```
Agar ye bina error ke chal jaye, matlab deployment bhi smoothly hogi.

---

## 11. Environment Variables — Poori List

| Variable | Kahan Milega | Zaroori? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | Haan |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | Haan |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (secret) | Haan |
| `NEXT_PUBLIC_SITE_URL` | Aapka apna domain/URL | Haan |

---

## 12. Project Structure

```
typenest/
├── app/                    → Har page aur API route yahan hai
│   ├── page.tsx            → Home page
│   ├── practice/           → Typing test page
│   ├── train/              → AI Coach
│   ├── academy/            → Lessons
│   ├── games/              → Arcade games
│   ├── compete/            → Daily Challenge + AI Race
│   ├── stats/              → User stats
│   ├── leaderboard/        → Global leaderboard
│   ├── missions/           → Missions/XP
│   ├── profile/            → User profile
│   ├── login/ signup/      → Authentication
│   └── api/                → Backend endpoints
├── components/             → Reusable UI pieces
├── lib/                    → Shared logic (word banks, XP formulas, Supabase clients)
├── supabase/migrations/    → Database schema (SQL files, order se run karein)
├── public/                 → Logo, favicon
├── Dockerfile              → Docker deployment ke liye
├── netlify.toml            → Netlify deployment ke liye
└── .env.example            → Environment variables ka template
```

---

## 13. Troubleshooting (Aam Masail)

**"Missing NEXT_PUBLIC_SUPABASE_URL" error**
→ `.env.local` file check karein, values sahi se copy hui hain ya nahi. Server restart karein (`npm run dev` dobara chalayein).

**Sign up karne ke baad login nahi ho raha**
→ Supabase dashboard → Authentication → Providers mein "Email" enabled hai check karein. Agar email confirmation ON hai, apna inbox check karein.

**Test save nahi ho raha (Stats page khali hai)**
→ Migrations sahi order mein run hui hain check karein (0001 se 0007 tak). Supabase dashboard → Table Editor mein `typing_tests` table dekhein.

**Leaderboard khali hai**
→ Ye normal hai jab tak koi real test save na ho. Ek test dein, phir dobara check karein.

**Vercel pe build fail ho raha hai**
→ Vercel ke "Deployments" tab mein error log dekhein. Aksar environment variables missing hone ki wajah se hota hai — check karein sab 4 zaroori variables dashboard mein maujood hain.

**"Row Level Security" errors**
→ Matlab migrations poori tarah run nahi hui. SQL Editor mein dobara migration files run karein.

---

## 14. Aage Kya Add Hoga (Roadmap)

Ye cheezein is version mein jaan-boojh kar shamil nahi (fake nahi banayi gayin):
- **Real-time multiplayer** (live opponents) — isay Socket.io ya Supabase Realtime chahiye
- **Friends system** — real accounts ke beech connection
- **Poori Academy library** (16+ lessons) — abhi 3 real lessons hain, baaki sirf content likhne ka kaam hai
- **Ranked matchmaking** — multiplayer ke baad aayega
- **Word bank ko fetched/JSON banana** — abhi ~780 English + 100+ Urdu/Roman Urdu + code tokens bundle mein hain (chhota, negligible size). Jab lists 1,000+ tak barhengi, tab async-fetch pattern mein move karna sahi rahega

Ye sab is architecture ke upar hi banaye jayenge — koi bhi cheez dobara se banani nahi paregi.

---

**Koi masla ho to:** code khud padhein (comments English mein hain, samajhne mein aasan), ya jahan se ye project mila hai wahin follow-up puchhein.

Shabash — ab TypeNest live hai.
