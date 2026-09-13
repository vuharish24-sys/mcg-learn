# Migrating from Moodle to WordPress + Tutor LMS

Replaces the self-hosted Moodle setup (`docs/MOODLE_SELF_HOSTING.md`) with
WordPress + Tutor LMS (free tier) on the same `lms.medicalcodingglobal.com`
subdomain, reusing its existing DNS record and SSL certificate.

**Why**: Moodle's LTI 1.3 interop model is built for institutional tool
exchange between LMSs, not per-lesson commerce-gated access — that mismatch
is what caused the "Invalid Nonce" / per-activity-publish fragility recorded
in the Moodle doc. Tutor LMS's free tier has a documented REST API
(https://tutorlms.com/docs/rest-api-tutor-lms-free/) including enrollment
management, using plain WordPress Application Passwords instead of a full
OIDC dance — no nonce, no JWKS, no cross-site cookie issues.

`docs/MOODLE_SELF_HOSTING.md` is kept, not deleted — the self-hosting
pattern (Docker isolation, reverse proxy, SSL) and the real bugs found along
the way are still useful reference even though Moodle itself is being
removed.

---

## Phase 1 — Remove Moodle

```bash
cd /opt/moodle
docker compose down -v   # stops containers AND deletes their volumes (moodle_data, moodle_db_data) — destructive, intentional
```

**Do not touch the SSL certificate or DNS record** — both get reused for
WordPress on the same subdomain.

---

## Phase 2 — Deploy WordPress + Tutor LMS

Copy `deploy/wordpress/docker-compose.yml` to the server (e.g. `/opt/wordpress`),
replace `CHANGE_ME_DB_PASSWORD` / `CHANGE_ME_DB_ROOT_PASSWORD` with your own
strong values, then:

```bash
cd /opt/wordpress
docker compose up -d
```

Unlike Moodle, there's no separate "one-time CLI install" step needed here —
the official WordPress image serves its own setup wizard on first visit.

---

## Phase 3 — Repoint the existing Apache vhost

The `lms.conf` vhost (and its certbot-generated `:443` block, possibly in a
separate `lms-le-ssl.conf` — check `/etc/apache2/sites-available/`) currently
proxies to Moodle's port. **Edit in place, don't delete/recreate** — this
preserves the existing cert wiring:

```bash
sudo grep -rl "127.0.0.1:8091" /etc/apache2/sites-available/
```

In each matching file, change `127.0.0.1:8091` to `127.0.0.1:8092` (both the
`:80` and `:443` blocks, if they're separate files), then:

```bash
sudo systemctl reload apache2
```

Visit `https://lms.medicalcodingglobal.com` — you should land on the
WordPress setup wizard (or the site itself, once configured) with the same
valid cert as before, no new certbot run needed.

---

## Phase 4 — WordPress setup

1. Complete the WordPress install wizard (site title, admin user/password —
   your own, not something to hand me).
2. **Plugins → Add New** → install and activate **Tutor LMS**.
3. Author at least one course with a couple of lessons — same purpose as
   the Moodle placeholder course, real content structure to map prices onto.
4. **Generate a Tutor-native API key/secret** — confirmed live on a real
   deployment; **do not use a WordPress core Application Password here**,
   Tutor's REST API ignores those entirely. Every route in
   `restapi/RestAPI.php` uses
   `permission_callback => [RestAuth::class, 'process_api_request']`
   (`restapi/RestAuth.php`), which checks Basic Auth credentials against
   its own `tutor-api-key-secret` user-meta records — a completely
   separate credential system from WP Application Passwords. Using a WP
   Application Password here returns a generic `403 rest_forbidden` with
   no hint about the real cause.

   The key/secret is generated per-user via the `tutor_generate_api_keys`
   AJAX action (`wp-admin/admin-ajax.php`), normally triggered by a
   "Generate" button — but **this UI doesn't appear anywhere in Tutor LMS
   Free's Settings tabs** (General/Course/Monetization/Payment
   Methods/Taxes/Checkout/Design/Advanced/Legal Consents — no
   Tools/REST API tab). The backend handler is fully present and working
   in the free plugin regardless (confirmed by calling the AJAX action
   directly with a valid nonce and cookie session); there's just no menu
   link to it in free. To generate one: log in as the dedicated
   service-account user, load any `wp-admin` page, read
   `window._tutorobject.nonce_key` / `_tutor_nonce` for a valid nonce,
   then POST `action=tutor_generate_api_keys&_tutor_nonce=<nonce>&permission=Read&description=...`
   to `admin-ajax.php` with that session's cookies. Free tier only ever
   grants `Read` permission (`available_permissions()` only returns that
   one option without Pro) — which is sufficient, since
   `process_api_request()` doesn't check permission level at all, only
   that the key:secret pair matches an existing record.

   Use the resulting key as the Basic Auth username and secret as the
   password: `curl -u "key_...:secret_..." https://.../wp-json/tutor/v1/courses`.
   Keep the secret out of the git repo, same as the Razorpay/Supabase
   secrets — it belongs in Netlify's environment variables.

---

## Phase 5 — Enrollment writes + passwordless launch (custom plugin)

Tutor Free's REST API is read-only end to end (see Phase 4 above) — there
is no supported way to create or cancel an enrollment through it. Rather
than needing Pro, `deploy/wordpress/mu-plugins/mcglearn-integration.php`
calls Tutor's internal enrollment code directly (PHP-to-PHP, same
process), bypassing Tutor's REST layer entirely. Installed as a
**must-use plugin** (`wp-content/mu-plugins/`) rather than a regular one,
so it can't be accidentally deactivated from the admin UI.

**The internal function**: `\Tutor\Models\EnrollmentModel::do_enroll( $course_id, $order_id, $user_id )`
(`models/EnrollmentModel.php`) — inserts a `tutor_enrolled` post
(`post_author` = student, `post_parent` = course), status `completed` or
`pending` depending on whether the course is purchasable. Pass
`$order_id = 0` — that's what skips Tutor's own WooCommerce/EDD
order-linking logic, since MCG-Learn's payment processing is the order of
record here, not a Tutor-monetization order. It's naturally idempotent:
calling it again for an already-(completed-)enrolled user just returns
the existing enrollment ID rather than creating a duplicate.

**Un-enrolling** uses `EnrollmentModel::update_enrollments(STATUS_CANCEL, [$enrollment_id])`
— a soft cancel (`post_status` → `cancel`), not
`delete_enrollment_record()` (a real delete). Deliberate: preserves
history for refunds/installment defaults, and is reversible if a later
payment succeeds — re-enrolling after a cancel just creates a fresh
enrollment row rather than resurrecting the canceled one, which is
Tutor's own normal behavior, not something this plugin special-cases.

**Three routes, `mcglearn/v1` namespace, all requiring the same shared
secret** (`X-MCGLearn-Key` header, checked via `hash_equals()` against
`MCGLEARN_SHARED_SECRET`, a constant defined in `wp-config.php` —
deliberately never hardcoded in the plugin file itself, so the file can
live in this repo):

- `POST /wp-json/mcglearn/v1/enroll` — `{ user_id, course_id }`
- `POST /wp-json/mcglearn/v1/unenroll` — `{ user_id, course_id }`
- `POST /wp-json/mcglearn/v1/auto-login-token` — `{ user_id, course_id? }`
  (`course_id` optional, not in the original spec — if given, the launch
  redirect lands directly on that course instead of a generic dashboard;
  validated server-side against a real post, so this can't become an
  open redirect) → returns `{ token, expires_in, launch_url }`

**The launch flow** is a real top-level browser navigation, not a JSON
call: redirect the student's browser to the returned `launch_url`
(`https://.../?mcglearn_token=...`). An `init` hook in the same plugin
checks for that query param on every request, and if present: looks up
the token (a WordPress transient, keyed by the token itself, 120-second
TTL), **deletes it immediately regardless of validity** (single-use —
even a captured/guessed token can't be replayed a second time within the
TTL), then `wp_set_current_user()` + `wp_set_auth_cookie()` for the named
user and a normal `wp_safe_redirect()` into the course (or `/dashboard/`
if no `course_id`).

**Verified live**, against a real test user and the real "Sample Course":
auth correctly rejects missing/wrong `X-MCGLearn-Key` (401); a real
enrollment lands as an actual `tutor_enrolled` post (confirmed via direct
DB query — correct `post_author`/`post_parent`/`post_status`); calling
enroll again for the same user+course returns the same enrollment ID
rather than duplicating; unenroll flips status to `cancel` (confirmed via
DB) and correctly reports `not_enrolled` for someone never enrolled; the
auto-login token produces a real `302` to the course URL with genuine
`wordpress_logged_in_*` cookies that a subsequent request (WordPress
`/wp-admin/profile.php`, not the REST API — that needs a nonce on top of
the cookie, a separate WP mechanism, not a bug here) confirmed as a real
authenticated session for the right user; and replaying the same token a
second time correctly gets `403`, not a second login.

---

## What's NOT covered here

This gets WordPress + Tutor LMS installed and reachable. The MCG-Learn-side
integration — replacing `MoodleCourseMapping`/the LTI platform code with a
WordPress/Tutor-LMS REST API service (enroll-on-purchase, check-access), and
updating the admin UI — is application code, a separate follow-up once this
infrastructure is confirmed live.
