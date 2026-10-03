<?php
/**
 * Plugin Name: MCG Learn API role
 * Description: A least-privilege role for MCG Learn's server-to-server calls to the WP Users REST API (find a user by email, create a subscriber, "who am I"). Replaces using an administrator's Application Password for that.
 */

if (!defined('ABSPATH')) {
    exit;
}

const MCGLEARN_API_ROLE = 'mcglearn_integration';

// The three REST calls MCG Learn makes need exactly these (checked against
// WP core's REST users controller):
//  - list_users   : GET /wp/v2/users?search=...&context=edit (core refuses
//                   context=edit without it)
//  - create_users : POST /wp/v2/users
//  - read         : baseline for any logged-in user
// GET /wp/v2/users/me?context=edit needs nothing extra: core lets a user
// "edit" themselves. Notably absent: edit_users, delete_users, promote_users,
// manage_options, install/activate_plugins, any content capability — so the
// account cannot edit or delete other users, change settings, or touch content.
add_action('init', function () {
    $want = ['read' => true, 'list_users' => true, 'create_users' => true];
    $role = get_role(MCGLEARN_API_ROLE);
    if (!$role) {
        add_role(MCGLEARN_API_ROLE, 'MCG Learn Integration', $want);
        return;
    }
    // Self-heal if someone adds a capability to the role in wp-admin.
    foreach (array_keys(array_diff_key($role->capabilities, $want)) as $cap) {
        $role->remove_cap($cap);
    }
    foreach ($want as $cap => $grant) {
        if (empty($role->capabilities[$cap])) {
            $role->add_cap($cap, $grant);
        }
    }
});

// Reading other users with ?context=edit (needed to find a user by email and
// compare the exact address) is gated by core on edit_user for EACH user in
// the result: the REST controller silently drops every user the caller can't
// edit, so without this the role only ever sees itself. Granting
// edit_users would fix that but would also allow editing, so instead this
// passes the edit_user check for GET requests to /wp/v2/users only. Writes
// (POST/PUT/PATCH/DELETE) still hit edit_user / delete_users / promote_users
// and are refused. The method is taken from the REST request being
// dispatched, NOT $_SERVER['REQUEST_METHOD'], because WP lets a request
// override its method (?_method= / X-HTTP-Method-Override) — and it is
// cleared after each callback so it can never go stale across the
// sub-requests of a batch call.
add_filter('rest_request_before_callbacks', function ($response, $handler, $request) {
    $GLOBALS['mcglearn_rest_read'] = $request->get_method() === 'GET'
        && strpos($request->get_route(), '/wp/v2/users') === 0;
    return $response;
}, 10, 3);
add_filter('rest_request_after_callbacks', function ($response, $handler, $request) {
    unset($GLOBALS['mcglearn_rest_read']);
    return $response;
}, 10, 3);
add_filter('map_meta_cap', function ($caps, $cap, $user_id) {
    if ($cap !== 'edit_user' || empty($GLOBALS['mcglearn_rest_read'])) {
        return $caps;
    }
    $user = get_userdata($user_id);
    if ($user && in_array(MCGLEARN_API_ROLE, (array) $user->roles, true)) {
        return [];
    }
    return $caps;
}, 10, 3);

// create_users alone is NOT enough to be safe: when a user is created over
// REST, core only requires the target role to be in get_editable_roles(),
// which (unfiltered) includes administrator. Without this, an account that
// can create users could create an administrator. Limit this role to handing
// out 'subscriber', the only role MCG Learn creates.
add_filter('editable_roles', function ($roles) {
    $user = wp_get_current_user();
    if ($user && in_array(MCGLEARN_API_ROLE, (array) $user->roles, true)) {
        return array_intersect_key($roles, ['subscriber' => true]);
    }
    return $roles;
});
