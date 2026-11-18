# HYPEMAX Nutrition: multipage site (Vercel + Render + MongoDB Atlas, all free)

Pages: index, product (`?p=slug`), about, faq, contact, policies, admin (`/admin` or `/admin/login`).

## 1. MongoDB Atlas (free M0)
Create a free cluster, a database user, and allow network access `0.0.0.0/0` (Render IPs change). Copy the connection string.

## 2. Cloudinary (free, for product image uploads)
Create an account; copy the `CLOUDINARY_URL` from the dashboard.

## 3. Backend on Render
Push this folder to GitHub. Render > New Web Service > root directory `backend`, build `npm install`, start `npm start`, plan **Free**.
Env vars: see `backend/.env.example`. `ADMIN_EMAIL`/`ADMIN_PASSWORD` create the first admin on first start (no public sign-up). Set `FRONTEND_ORIGIN` to your Vercel URL. First start seeds the product, two Coming Soon products, FAQs and settings.
Free-tier note: the service sleeps after 15 min idle and takes about a minute to wake. Add a free UptimeRobot monitor on `https://YOUR-API.onrender.com/health` every 5 min.

## 4. Frontend on Vercel
Import the repo, root directory `frontend`, framework "Other". Before deploying, replace `https://YOUR-API.onrender.com` with your Render URL in `frontend/js/app.js` and `frontend/js/admin.js`.

## 5. Admin
Open `/admin`, log in, edit products (status Available / Coming Soon / Out of stock / Draft), reviews (publish toggle), FAQs, and settings (hero text, WhatsApp number, socials, announcement). Prices come from the database; WhatsApp links are built at click time.

## Local
`cd backend && cp .env.example .env && npm i && npm start`, then serve `frontend/` (e.g. `npx serve frontend`).

## Admin panel (`/admin`)
Dashboard (live counts, status chart, recent activity), Products (search, filter by status, sort, add/edit/delete, primary image + gallery uploads, flavours, ingredients, facts, serving, usage, specs), Reviews (publish toggle), FAQs (reorder with arrows, publish toggle), Enquiries (every checkout form is saved here as well as sent to WhatsApp), Homepage content, and Settings (brand, logo, contact, socials, footer, SEO). Deleting a product does not delete its image file from Cloudinary.
