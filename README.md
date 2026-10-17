# Jabari site, with an admin panel

Everything on the site (homepage text, photo, social links, buttons, shop products,
reviews, colours) is edited from **`/admin`**, with no code. Each save is committed to
your GitHub repo and Netlify redeploys automatically (about a minute).

## One-time setup

### 1. Put the files on GitHub
1. Create a new repository on GitHub (e.g. `jabari-site`).
2. Upload everything in this folder to it (keep the folder structure).
3. Add your photo as `uploads/profile.jpg` (or upload it later from the admin).

### 2. Point the admin at your repo
Open `admin/config.yml` and change this line to your own username and repo name:

```yaml
repo: YOUR-GITHUB-USERNAME/YOUR-REPO-NAME
```

If your default branch is `master`, change `branch: main` too.

### 3. Deploy on Netlify
Netlify → **Add new site → Import an existing project → GitHub** → pick the repo.
No build command is needed; the publish directory is the root (`.`).

### 4. Allow GitHub login for the admin
1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
   - Homepage URL: your Netlify site URL
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Copy the **Client ID** and generate a **Client Secret**.
3. Netlify → your site → **Site configuration → Access & security → OAuth → Install provider → GitHub**
   and paste the Client ID and Secret. (Menu wording on Netlify can differ slightly.)

### 5. Log in
Go to `https://YOUR-SITE.netlify.app/admin` and choose **Login with GitHub**.
Only GitHub accounts with write access to the repo can log in.

## Using the admin

| Section | What you can do |
|---|---|
| **Homepage & Settings** | Change name, photo, titles, ticker, footer, colours. Add, remove or reorder social icons and update their links. Add, remove or rename the big homepage buttons (for example, bring back About or My Works later). |
| **Shop** | Add products with the **Add product** button, remove them with the X on each product, change prices (in Naira) and pictures, mark one Sold out, or hide it without deleting. Every product needs a short **Product ID** (e.g. `logo-pack`); never change it once you start selling or collecting reviews. |
| **Reviews** | Add, edit, hide or delete reviews. Pick the **Product reviewed** from your shop list. |

**Reviews and shop are linked:** visitors choose which product they are reviewing from a dropdown,
the Reviews page can be filtered by product, and each shop card shows its average rating
(tap it to see that product's reviews).

**Visitor reviews:** the Reviews page has a "Leave a review" form (Netlify Forms). Submissions
show in your Netlify dashboard under **Forms**; to publish one, add it in **Admin → Reviews**.
Turn the form off with the "Let visitors send a review" switch.

**Product links (for Facebook reels, WhatsApp, etc.):** every product gets its own page at
`https://YOUR-SITE/p/<Product ID>`, for example `https://YOUR-SITE/p/logo-pack`. Open the product
from the Shop page and tap **Share this product**, or just type the link. When pasted into Facebook,
WhatsApp or X, it shows the product picture, name and price. The pages are created automatically on
each deploy by `scripts/build.js` (Netlify runs it through `netlify.toml`), so a new product's link
works about a minute after you save it. Facebook often doesn't make links in reel captions tappable,
so paste the link in a pinned comment or your Page's website/button field as well.

**Buy buttons:** paste a payment or order link into a product's *Button link*. If left empty,
the button opens your WhatsApp with the product name filled in (uses the WhatsApp link in
Social media icons).

## Test the admin on your computer (optional)
Uncomment `local_backend: true` in `admin/config.yml`, then run `npx decap-server` in the
project folder and a static server (e.g. `npx serve`), and open `/admin`. Re-comment the line
before deploying.

## Files
- `index.html`, `shop.html`, `reviews.html`: the pages
- `assets/`: styling and the script that builds pages from the content files
- `content/*.json`: your content, edited by the admin
- `admin/`: the admin panel
- `uploads/`: pictures you upload
