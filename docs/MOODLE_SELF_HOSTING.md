# Self-hosting Moodle for MCG Learn

Runbook for standing up a self-hosted Moodle instance on the same server that
already runs Apache (multiple vhosts) and a Java/Tomcat app, alongside the
box's existing (EOL) PHP 7.0 / MySQL 5.7 stack.

**Server facts gathered 2026-09-11** (for reference, re-verify before running):
- OS: Ubuntu 16.04.7 LTS — past end-of-life (ESM ended April 2024, zero
  security patches from Ubuntu). This is a pre-existing condition of the box,
  unrelated to Moodle, but worth addressing separately at some point.
- Existing PHP 7.0.33 / MySQL 5.7.33 are used by another app on this box —
  **not touched by this plan**. Moodle runs fully isolated in Docker with its
  own PHP 8.2 and its own MariaDB instance.
- Apache already owns ports 80/443 with multiple vhosts. Moodle's container
  publishes only to `127.0.0.1:8091` — Apache adds one more vhost that
  reverse-proxies a new subdomain to that port.
- Docker 29.7.1 already installed — no Docker install step needed.
- 93GB free on `/`, 19GB RAM available — comfortably enough headroom.

Why Docker instead of installing natively: the host's PHP 7.0 is far below
what any current Moodle release needs (Moodle 4.5 LTS wants PHP 8.0+), and
upgrading PHP on an EOL Ubuntu 16.04 host is fragile and risks breaking
whatever already runs on that PHP 7.0. Docker keeps Moodle's modern PHP/DB
completely separate from the host stack.

**Why not Bitnami's Moodle image**: it moved behind a paid "Bitnami Secure
Images" subscription in August 2025; the leftover free legacy image gets no
further security updates. This runbook builds on official `php` and
`mariadb` images instead, with Moodle's own source cloned at build time,
pinned to Moodle 4.5 LTS (supported through October 2027).

Every command below runs on the server over your own SSH session — nothing
here should be run through a "Run" button in a local coding tool, since that
would execute on the wrong machine.

---

## Phase 0 — DNS

Get the server's public IP:

```bash
curl -4 ifconfig.me
```

In your DNS provider for the domain (e.g. `medicalcodingglobal.com`), add an
**A record**: host `lms` (or whatever subdomain you want), value = that IP.
Wait for it to resolve before Phase 4 (SSL) — check with `dig +short
lms.medicalcodingglobal.com` from any machine.

---

## Phase 1 — Get the deploy files onto the server

The files live in this repo under `deploy/moodle/`:
`Dockerfile`, `docker-compose.yml`, `apache-lms.conf.template`.

Copy them to the server, e.g. from your local machine:

```bash
scp -r deploy/moodle root@YOUR_SERVER_IP:/opt/moodle
```

(Adjust the destination path/user to whatever you prefer — `/opt/moodle` is
just a suggestion.)

---

## Phase 2 — Configure secrets and build

On the server, in the directory you copied to (e.g. `/opt/moodle`):

```bash
cd /opt/moodle
touch config.php   # must exist as an empty FILE before first `docker compose up`,
                    # so Docker bind-mounts a file, not a directory
```

Edit `docker-compose.yml` and replace `CHANGE_ME_DB_PASSWORD` and
`CHANGE_ME_DB_ROOT_PASSWORD` with your own strong, unique values (e.g.
generate with `openssl rand -base64 24` — pick your own, don't reuse
anything from the host's existing MySQL).

Then build and start:

```bash
docker compose up -d --build
docker compose logs -f moodle   # watch until Apache inside the container is ready, Ctrl+C to stop watching
```

If the build fails, paste the error output back and we'll fix the
Dockerfile — PHP extension build failures are the most likely snag.

---

## Phase 3 — One-time Moodle install

**Don't run `docker compose exec moodle php admin/cli/install.php` against
the persistent `moodle` service** — this will always fail. Moodle's
installer (`admin/cli/install.php`) checks `file_exists(config.php)`, not
whether it's valid, to decide if the site is already configured. Since
`config.php` is bind-mounted from the host and must exist as an empty file
(see Phase 1's `touch` step), the installer sees it, tries to read `$CFG`
from it, finds nothing, and crashes with `Fatal error: ... require_once():
Failed opening required '/clilib.php'` (confirmed on a real deploy).

Instead, run the installer in a **throwaway container** that never sees
that empty file, attached to the same network so it can reach the DB
service by name:

```bash
docker run --rm --name moodle-installer --network moodle_moodle_net \
  -v moodle_moodle_data:/var/www/moodledata \
  moodle-moodle:latest \
  php admin/cli/install.php \
  --lang=en \
  --wwwroot=https://YOUR_SUBDOMAIN \
  --dataroot=/var/www/moodledata \
  --dbtype=mariadb \
  --dbhost=moodle-db \
  --dbname=moodle \
  --dbuser=moodle \
  --dbpass=CHANGE_ME_DB_PASSWORD \
  --fullname="MCG Learn LMS" \
  --shortname="MCGLMS" \
  --adminuser=YOUR_ADMIN_USERNAME \
  --adminpass=YOUR_ADMIN_PASSWORD \
  --adminemail=YOUR_EMAIL \
  --non-interactive \
  --agree-license
```

(`moodle_moodle_net` and `moodle-moodle:latest` assume the compose project
directory is named `moodle` — adjust if you copied it elsewhere; check
with `docker network ls` / `docker images` if unsure. Drop `--rm` if you
want to inspect the container after; if you do, remember to `docker rm`
it once done.)

If you hit `[System] must be installed and enabled - All data must be
stored in Unicode format`, that's MariaDB's default
`utf8mb4_uca1400_ai_ci` collation (added in 10.10+), which Moodle's
environment checker doesn't recognize — see the `command:` override
already in `docker-compose.yml` fixing this. If you added the DB *before*
this fix landed, you'll need to recreate it (`docker compose down &&
docker volume rm <project>_moodle_db_data && docker compose up -d`) since
the collation is set at database-creation time, not retroactively.

Since this throwaway container never touched the bind-mounted
`config.php`, it wrote its own copy inside its own filesystem. Copy it out
to the host **before removing the container** (skip if you didn't use
`--rm`):

```bash
docker cp moodle-installer:/var/www/html/config.php /opt/moodle/config.php
```

If `/opt/moodle/config.php` was still the empty placeholder file (a plain
file, not a directory) at this point, `docker cp` overwrites it correctly.
If Docker ever auto-created a *directory* there instead (e.g. after
deleting the placeholder while the compose-managed container was
running), `docker cp` will copy the file **into** that directory instead
of replacing it — `rm -rf /opt/moodle/config.php` first if `ls -la
/opt/moodle/config.php` shows it as a directory.

Since Apache will terminate SSL and proxy plain HTTP to the container,
Moodle needs to know it's behind a reverse proxy. Open the generated
`config.php` on the host (`nano /opt/moodle/config.php`) and add these two
lines directly **before** the line `require_once(__DIR__ . '/lib/setup.php');`:

```php
$CFG->reverseproxy = true;
$CFG->sslproxy = true;
```

Finally, (re)start the persistent service so it picks up the now-valid,
fully-populated `config.php`:

```bash
docker compose up -d --force-recreate moodle
```

Moodle also needs its cron script run every minute for scheduled tasks
(notifications, cleanup, etc.) — nothing runs this automatically inside
the container, so add it to the **host's** crontab:

```bash
(crontab -l 2>/dev/null; echo '* * * * * cd /opt/moodle && docker compose exec -T moodle php admin/cli/cron.php > /var/log/moodle-cron.log 2>&1') | crontab -
```

---

## Phase 4 — Reverse proxy + SSL on the host

```bash
sudo a2enmod proxy proxy_http headers rewrite ssl
sudo cp /opt/moodle/apache-lms.conf.template /etc/apache2/sites-available/lms.conf
sudo nano /etc/apache2/sites-available/lms.conf   # replace YOUR_SUBDOMAIN
sudo a2ensite lms.conf
sudo systemctl reload apache2
sudo certbot --apache -d YOUR_SUBDOMAIN
```

Certbot will issue the cert and generate a `:443` block copying the
`ProxyPass` directives. Open the generated SSL vhost file afterward and
change `X-Forwarded-Proto "http"` to `X-Forwarded-Proto "https"` — certbot
copies the directive as-is, it won't know to flip that value.

```bash
sudo systemctl reload apache2
```

Visit `https://YOUR_SUBDOMAIN` — you should land on the Moodle login page
with a valid padlock.

---

## Phase 5 — Enable LTI Advantage so MCG-Learn can launch into Moodle

MCG-Learn is the LTI **Platform** here and Moodle is the **Tool** — the
reverse of Moodle's usual role. Verified end-to-end against a real
deployment; steps below are what actually worked, not a guess.

**Plugins to enable** (Site administration → Plugins):
1. **Enrolments → Manage enrol plugins** → enable **"Publish as LTI tool"**
   (`enrol_lti`) — off by default.
2. **Authentication → Manage authentication** → enable **LTI** — `enrol_lti`
   explicitly requires this and won't work without it; also off by default.
3. **Advanced features** → confirm "Enable web services" is on, and
   **Web services → Manage protocols** → REST enabled (both were already on
   by default on a fresh install in practice, but verify).

**Register MCG-Learn as a trusted platform** (Site administration → Plugins
→ Enrolments → Publish as LTI tool → **Tool registration**):
1. **Register a platform** → give it a name → Continue.
2. On the resulting page's **Platform details** tab, fill in (using your
   own deployed values):
   - Platform ID (issuer): `LTI_PLATFORM_ISSUER`
   - Client ID: any string you choose (e.g. `mcg-learn`) — must match
     `MOODLE_LTI_CLIENT_ID` exactly
   - Authentication request URL: `<issuer>/api/lti/platform/authorize`
   - Public keyset URL: `<issuer>/api/lti/platform/jwks`
   - Access token URL: `<issuer>/api/lti/platform/token` (a 501 stub today —
     only needed if/when grade sync or roster services are added)
3. Save, then on the **Deployments** tab, **Add a deployment** — again pick
   any ID (e.g. `mcg-learn-1`); this becomes `MOODLE_LTI_DEPLOYMENT_ID`.
4. Still on this registration's **Tool details** tab, copy the **Initiate
   login URL** shown there (it has a registration-specific `?id=...` token)
   — that's `MOODLE_LTI_LOGIN_INIT_URL`. The **Tool URL** shown alongside it
   is `MOODLE_LTI_REDIRECT_URI`.

**Publish the actual course** (per course, under its own Enrolment methods
page → Add method → **Publish as LTI tool**, LTI version "LTI Advantage"):
save it, then find it under that course's **"Published as LTI tools"**
page (linked from Enrolment methods). It shows:
- **Launch URL** — use as `MoodleCourseMapping.targetLinkUri` **exactly as
  shown, with no query string appended**. Moodle validates this byte-for-byte
  against the registered redirect URI and rejects anything else — confirmed
  by hitting `Coding error detected: ... target_link_uri param must match
  one of the redirect URIs` on a real attempt.
- **Custom properties** (e.g. `id=76205b0e-...`) — this is how Moodle
  actually knows *which* published course/resource a launch is for, since
  the URL above can't carry it. Put this string in
  `MoodleCourseMapping.ltiCustomParams` — the app sends it as the LTI
  `custom` claim.

**Known fix already applied in `deploy/moodle/Dockerfile`**: Moodle
validates the OIDC `nonce` against its own PHP session, but the signed
id_token arrives via a cross-site POST auto-submitted from MCG-Learn's
domain. PHP's default `session.cookie_samesite=Lax` gets stripped by the
browser on that cross-site POST, so Moodle can never find the nonce it
stored — every launch fails with `Exception - Invalid Nonce`, confirmed on
a real attempt. Fixed by setting `session.cookie_samesite=None` (+
`session.cookie_secure=1`, safe since everything here is HTTPS) in the
Dockerfile's `moodle.ini`. If you built the image before this fix landed,
`docker compose up -d --build` to pick it up.

Multiple platform registrations can coexist (e.g. a production one for the
real deployed app, plus a temporary one for a local dev tunnel like ngrok)
— each just needs its own Client ID, Deployment ID, and matching env vars.

---

## What's NOT covered here

This runbook only gets Moodle installed, reachable, and its web-services/LTI
surface turned on. The actual MCG-Learn-side integration — mapping paid
Moodle courses to `FeedItem`s, extending `Purchase` to unlock individual
content, launching an SSO'd LTI session on demand — is application code, not
infrastructure, and is a separate piece of work once Moodle itself is live.
