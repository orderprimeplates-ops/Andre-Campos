# Putting Prime Plates HQ online

This guide gets Prime Plates HQ running at a private web address you can open on your laptop
and iPhone. No coding or terminal is needed. Plan on 20–30 minutes.

**What you'll use**

| Service | What it does | Cost |
|---|---|---|
| **GitHub** | Stores the app's code (you already have this) | Free |
| **Vercel** | Runs the app and gives it a web address | Pro plan, $20/month — the free "Hobby" plan is for personal, non-commercial use only, and this is a business tool |
| **Neon** (added inside Vercel) | The database that stores your clients, events and recipes | Free to start |

---

## Step 1 — Create your Vercel account

1. Go to **vercel.com** and click **Sign Up**.
2. Choose **Continue with GitHub** and sign in with the GitHub account that owns
   `orderprimeplates-ops/Andre-Campos`.
3. When asked, choose the **Pro** plan (a 14-day trial is usually offered).

## Step 2 — Import the app

1. In Vercel, click **Add New… → Project**.
2. Under *Import Git Repository*, find **Andre-Campos**.
   - Don't see it? Click **Adjust GitHub App Permissions** (or **Install**), choose the
     **orderprimeplates-ops** organization, allow access to the **Andre-Campos** repository,
     and save. Come back and it will appear.
3. Click **Import**.
4. On the configure screen, leave everything as it is (Vercel detects Next.js automatically).
   Click **Deploy**.
5. **The first deploy will fail with a red error.** That's expected — the app has no database
   yet. Continue to Step 3.

## Step 3 — Add the database

1. Open your new project in Vercel and click the **Storage** tab.
2. Click **Create Database**, choose **Neon** (Serverless Postgres), then **Continue**.
3. Choose:
   - **Region:** *US East (Washington, D.C.)* — closest to Florida.
   - **Plan:** *Free*.
   - **Name:** `prime-plates`.
4. Click **Create**. When asked which environments to connect, keep **Production**,
   **Preview** and **Development** all checked, and click **Connect**.

   Vercel now stores the database connection details (`DATABASE_URL` and
   `DATABASE_URL_UNPOOLED`) for you. You never need to copy or paste them.

## Step 4 — Deploy again

1. Click the **Deployments** tab.
2. On the failed deployment, click the **⋯** menu → **Redeploy** → **Redeploy**.
3. Wait about two minutes. When it says **Ready**, the app has built itself and created all
   of its database tables automatically.

## Step 5 — Create your account (do this right away)

1. On the project page, click **Visit** (or the address under *Domains*, something like
   `andre-campos.vercel.app`).
2. You'll see **"Let's set up your kitchen."** Enter your name, business name, email, a
   password of at least 10 characters, and your timezone. Click **Create my account**.
3. You're in. This setup page **locks itself permanently** once your account exists — from now
   on everyone sees the normal sign-in page.

> Do this as soon as the deploy finishes. Until an account exists, the setup page is open to
> anyone who has the address.

## Step 6 — Put it on your iPhone

1. Open the address in **Safari** on your iPhone and sign in.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Prime Plates HQ now opens from your home screen like an app.

## Step 7 — First things to set in the app

1. **Settings → Business rules:** your target and minimum margins, mileage rate, deposit %,
   and how many days before an event the final guest count is due.
2. **Settings → Booking platforms:** replace the placeholder fees with your real Airbnb,
   GigSalad, Yhangry, Thumbtack and The Bash rates.
3. **Ingredients:** add the ingredients you buy most, with current prices.
4. **Recipes → Dishes:** build your signature dishes from those recipes.
5. **Staff** and **Equipment:** add your team and what you own.
6. Then start using **Leads** and **Events** for real bookings.

---

## Optional

**Use your own web address** (e.g. `hq.primeplates.com`): in Vercel go to **Settings →
Domains**, add the address, and follow the instructions to add one record at wherever your
domain is registered.

**Updates:** every time new changes are pushed to the app's GitHub branch, Vercel rebuilds and
updates the live app automatically within a few minutes. Your data is untouched.

**Which branch is live:** Vercel publishes the repository's default branch
(currently `claude/repository-setup-check-0m8ses`). If you later merge into a `main` branch,
change it under **Settings → Git → Production Branch**.

## If something goes wrong

| What you see | What to do |
|---|---|
| Deploy fails again after adding the database | Open the failed deployment → **Build Logs**, and send the red lines to Claude. |
| "Application error" when visiting | Check **Storage** shows the Neon database as connected to **Production**, then redeploy. |
| You see the sign-in page but never created an account | Someone else may have claimed it. Tell Claude — the account can be reset from the database. |
| Forgot your password | Tell Claude; a reset can be done directly in the database. (A self-service reset email is a future feature.) |
