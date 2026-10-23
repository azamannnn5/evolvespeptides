# Admin panel setup guide

This guide is for you and for whoever hosts the site. You do not need to write any code.

## What you have

- The public site is still plain static files. It works on any cheap static host.
- A Supabase project (your database) stores only your CHANGES. Anything you never change keeps its original text from the files.
- The admin panel lives at `/admin/` on the site (for example `https://yoursite.com/admin/`).
- If the database is ever offline or not set up, the public site shows its original content. Nothing breaks.

## Steps

1. Open your Supabase project, then SQL Editor, then New query.
2. Open the file `sql/schema.sql`, copy everything, paste it in, and press Run. It is safe to run again.
3. Create your login: Authentication, Users, Add user. Type your email and a password. Tick "Auto confirm user" if it is offered.
4. Make yourself the owner. In the same SQL Editor, open `sql/schema.sql` again, go to the very bottom, find the line that starts with `-- insert into public.admin_users`, remove the two dashes at the start, put your email where it says `YOUR-EMAIL-HERE`, and run only that line.
5. Open `cms/cms-config.js` and paste your Project URL and the anon public key between the quotes. Find both in Supabase under Project Settings, then API. Use ONLY the anon public key. Never paste a service role key anywhere in the site files.
6. Upload the whole site folder to your host (the `admin` folder, the `cms` folder and all pages).
7. Go to `/admin/`, sign in, and look at the Dashboard.
8. In Supabase, Authentication, URL Configuration, add your admin address (for example `https://yoursite.com/admin/`) to the Redirect URLs so the Forgot password email works.

## Adding team members

Create their login in Authentication, Users. Then in the admin go to Admin, Team, type their email, pick a role, and press Add.

- Owner: everything, including the team.
- Admin: everything except the team.
- Editor: pages, products, images and the inbox.
- Viewer: can look only.

These limits are enforced by the database, not only by the screens.

## What can be changed

- All visible text, links, images and image descriptions on every page (about 800 items).
- Header, menu, footer, social links, legal text. One change updates every page.
- Products: name, price, old price, stock, hide or show, picture, SKU, categories, description and chemical information text, maximum quantity, order in lists, quantity discounts.
- Home page featured products.
- Shipping fees, the free shipping amount, promo codes.
- Top banner, pop-up message, form and cart texts.
- Search and sharing titles and descriptions, colours, font, custom CSS, analytics and pixel IDs, head and body code, redirects, maintenance mode.
- Inbox for newsletter and waitlist messages.
- Activity history with undo, and backup and restore.

## Notes and limits

- Search engine titles and descriptions are applied by JavaScript when a page loads. Google reads that, but simple crawlers and link preview tools may still see the original tags.
- The cart has no real checkout, so promo code usage counts do not go up by themselves.
- The site has no contact form. The inbox receives the newsletter box and the waitlist forms. If you add a contact form with the id `contact-form` it will also arrive in the inbox.
- Maintenance mode is a light lock done in the browser. It is not a security wall.
- Words the admin features add have plain defaults: the coupon box button, the coupon messages and the discount line (all editable under Customers, Form and cart texts) and the small quantity discount list on a product page (not editable). They only appear when you turn those features on.
- Text shown after a newsletter or waitlist form is sent is empty until you write it under Customers, Form and cart texts.

## Rebuilding the site from the generator

If the page generator is run again, run it through `node tools/build-all.js` from the site folder. It rebuilds the pages and then tags them again for the admin. It needs the `cheerio` package once (`npm install cheerio`, and set `CHEERIO_PATH` if it is not found). Edits already saved in the database keep working after a rebuild as long as the original text of an item did not change.

## Before launch

This site is a clone of another brand. The original brand name, logo and photos must be replaced before launch.
