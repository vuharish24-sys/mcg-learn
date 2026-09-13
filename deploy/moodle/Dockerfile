# Moodle 4.5 LTS on official, actively-maintained upstream images.
# Deliberately NOT using Bitnami's Moodle image — it was moved behind a paid
# "Bitnami Secure Images" subscription in Aug 2025; the leftover free legacy
# image receives no further security updates.
FROM php:8.2-apache

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip \
        libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
        libxml2-dev libxslt1-dev libicu-dev libcurl4-openssl-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        gd intl mysqli soap xsl zip opcache curl \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Moodle-recommended php.ini overrides.
#
# NOTE on the LTI 1.3 "Exception - Invalid Nonce" issue: `session.cookie_samesite
# = None` does NOT work as a php.ini directive on this PHP 8.2.33 build (or
# likely any PHP version) — confirmed empirically. PHP's ini scanner treats the
# bare *and quoted* value "None"/"none" as a special constant that silently
# collapses to empty, so this setting has zero effect however it's spelled in
# an ini file (php.ini, -d, or an Apache php_value all go through the same
# scanner). `ini_set()` at runtime is unaffected by that bug, BUT Moodle's own
# session bootstrap (lib/classes/session/manager.php) unconditionally calls
# session_set_cookie_params() with a hardcoded 'Lax' for anything that isn't
# the Moodle mobile app user-agent, overriding any earlier ini_set() anyway —
# so neither approach actually reaches the cookie header. Verified both dead
# ends on this exact install before finding the real mechanism below.
#
# The ACTUAL supported fix already exists in Moodle core, scoped correctly to
# LTI: auth_lti\local\ltiadvantage\utility\cookie_helper::do_cookie_check() /
# setup_session_cookie() upgrade just the MoodleSession cookie to SameSite=
# None; Secure for LTI launches, via a cookie-support probe + response-header
# rewrite (not php.ini, not session_set_cookie_params()). It's wired up for
# Moodle's "Publish as LTI tool" flow specifically — called from
# enrol/lti/login.php. If a real launch still gets "Invalid Nonce", the first
# thing to check is whether the id_token/login-init requests are actually
# hitting the enrol_lti endpoints (i.e. the tool was registered via Moodle's
# "Publish as LTI tool" screen) rather than a different LTI Advantage
# registration path that doesn't invoke this cookie_helper at all.
RUN { \
      echo 'max_input_vars = 5000'; \
      echo 'upload_max_filesize = 100M'; \
      echo 'post_max_size = 100M'; \
      echo 'memory_limit = 256M'; \
      echo 'session.cookie_secure = 1'; \
    } > /usr/local/etc/php/conf.d/moodle.ini

# Pin to a specific stable branch — bump this deliberately when you want to
# upgrade, rather than tracking a moving target.
ARG MOODLE_BRANCH=MOODLE_405_STABLE
RUN git clone --branch ${MOODLE_BRANCH} --depth 1 \
      https://github.com/moodle/moodle.git /var/www/html \
    && chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html
