<?php
/**
 * MCG-Learn Integration
 *
 * Three REST routes (mcglearn/v1 namespace) for the MCG-Learn platform to
 * manage enrollment and launch students into Tutor LMS courses, working
 * around Tutor LMS Free's read-only REST API (see
 * docs/WORDPRESS_MIGRATION.md — Tutor's own /wp-json/tutor/v1/* endpoints
 * can only read, never write). This plugin calls Tutor's internal
 * EnrollmentModel directly (PHP-to-PHP, same process) instead of going
 * through Tutor's REST layer at all.
 *
 * Auth: a single shared secret, checked via the X-MCGLearn-Key header on
 * every route. Not WP Application Passwords, not Tutor's own key/secret
 * system (see docs/WORDPRESS_MIGRATION.md for why those don't fit here
 * either) — just one value both sides already agree on. The secret itself
 * must be defined as MCGLEARN_SHARED_SECRET in wp-config.php — it is
 * deliberately never hardcoded in this file, so this file can live in a
 * git repo without leaking it.
 *
 * Installed as a must-use plugin (wp-content/mu-plugins/) rather than a
 * regular plugin so it can't be accidentally deactivated from the admin
 * UI — MCG-Learn's enrollment sync depends on it being always active.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// How long an auto-login token stays valid before it's useless even if
// never consumed. Kept short — this token is equivalent to a password for
// whoever holds it, for the one user it names.
define( 'MCGLEARN_TOKEN_TTL', 120 );

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			'mcglearn/v1',
			'/enroll',
			array(
				'methods'             => 'POST',
				'callback'            => 'mcglearn_handle_enroll',
				'permission_callback' => 'mcglearn_check_shared_secret',
			)
		);
		register_rest_route(
			'mcglearn/v1',
			'/unenroll',
			array(
				'methods'             => 'POST',
				'callback'            => 'mcglearn_handle_unenroll',
				'permission_callback' => 'mcglearn_check_shared_secret',
			)
		);
		register_rest_route(
			'mcglearn/v1',
			'/auto-login-token',
			array(
				'methods'             => 'POST',
				'callback'            => 'mcglearn_handle_create_auto_login_token',
				'permission_callback' => 'mcglearn_check_shared_secret',
			)
		);
	}
);

/**
 * Shared-secret auth, used as the permission_callback for every route
 * this plugin registers. Timing-safe comparison via hash_equals().
 *
 * @param WP_REST_Request $request The incoming request.
 * @return true|WP_Error
 */
function mcglearn_check_shared_secret( WP_REST_Request $request ) {
	if ( ! defined( 'MCGLEARN_SHARED_SECRET' ) || '' === MCGLEARN_SHARED_SECRET ) {
		return new WP_Error(
			'mcglearn_not_configured',
			'MCGLEARN_SHARED_SECRET is not defined in wp-config.php.',
			array( 'status' => 500 )
		);
	}

	$provided = $request->get_header( 'x_mcglearn_key' );
	if ( ! $provided || ! hash_equals( MCGLEARN_SHARED_SECRET, $provided ) ) {
		return new WP_Error(
			'mcglearn_unauthorized',
			'Invalid or missing X-MCGLearn-Key header.',
			array( 'status' => 401 )
		);
	}

	return true;
}

/**
 * Shared param validation for /enroll and /unenroll — both take the same
 * { user_id, course_id } shape.
 *
 * @param WP_REST_Request $request The incoming request.
 * @return array{user_id:int,course_id:int}|WP_Error
 */
function mcglearn_validate_user_course( WP_REST_Request $request ) {
	$user_id   = absint( $request->get_param( 'user_id' ) );
	$course_id = absint( $request->get_param( 'course_id' ) );

	if ( ! $user_id || ! get_user_by( 'id', $user_id ) ) {
		return new WP_Error(
			'invalid_user',
			'user_id is required and must reference an existing user.',
			array( 'status' => 400 )
		);
	}

	if ( ! class_exists( '\Tutor\Models\CourseModel' ) ) {
		return new WP_Error( 'tutor_not_active', 'Tutor LMS is not active.', array( 'status' => 500 ) );
	}

	if ( ! $course_id || ! \Tutor\Models\CourseModel::is_course_accessible( $course_id ) ) {
		return new WP_Error(
			'invalid_course',
			'course_id is required and must reference a published course.',
			array( 'status' => 400 )
		);
	}

	return array(
		'user_id'   => $user_id,
		'course_id' => $course_id,
	);
}

/**
 * POST /wp-json/mcglearn/v1/enroll — { user_id, course_id }
 *
 * Calls Tutor's EnrollmentModel::do_enroll() directly. $order_id is
 * passed as 0 since MCG-Learn's own payment processing is the order of
 * record, not a WooCommerce/EDD order Tutor would otherwise try to link.
 * Idempotent — do_enroll() itself returns the existing enrollment if the
 * user is already enrolled, rather than creating a duplicate.
 *
 * @param WP_REST_Request $request The incoming request.
 * @return WP_REST_Response|WP_Error
 */
function mcglearn_handle_enroll( WP_REST_Request $request ) {
	$valid = mcglearn_validate_user_course( $request );
	if ( is_wp_error( $valid ) ) {
		return $valid;
	}

	$enrolled_id = \Tutor\Models\EnrollmentModel::do_enroll( $valid['course_id'], 0, $valid['user_id'] );

	if ( ! $enrolled_id ) {
		return new WP_Error(
			'enroll_failed',
			'Enrollment could not be created (course may not be accessible).',
			array( 'status' => 422 )
		);
	}

	return new WP_REST_Response(
		array(
			'enrolled'      => true,
			// do_enroll() returns an int for a fresh enrollment but a numeric
			// string when returning an existing one (straight from a DB row) —
			// cast so callers always see a consistent JSON type.
			'enrollment_id' => (int) $enrolled_id,
			'user_id'       => $valid['user_id'],
			'course_id'     => $valid['course_id'],
		),
		200
	);
}

/**
 * POST /wp-json/mcglearn/v1/unenroll — { user_id, course_id }
 *
 * Soft-cancels (post_status -> 'cancel') rather than deleting the
 * enrollment record outright — preserves history for refunds/installment
 * defaults, and is reversible if a later payment succeeds, matching how
 * Tutor's own status constants already model this (EnrollmentModel::
 * STATUS_CANCEL). delete_enrollment_record() exists for a genuine hard
 * delete but isn't used here on purpose.
 *
 * @param WP_REST_Request $request The incoming request.
 * @return WP_REST_Response|WP_Error
 */
function mcglearn_handle_unenroll( WP_REST_Request $request ) {
	$valid = mcglearn_validate_user_course( $request );
	if ( is_wp_error( $valid ) ) {
		return $valid;
	}

	// $is_complete = false: find the enrollment regardless of its current
	// status, not just ones already marked completed.
	$existing = \Tutor\Models\EnrollmentModel::is_enrolled( $valid['course_id'], $valid['user_id'], false );

	if ( ! $existing ) {
		return new WP_REST_Response(
			array(
				'unenrolled' => false,
				'reason'     => 'not_enrolled',
			),
			200
		);
	}

	\Tutor\Models\EnrollmentModel::update_enrollments(
		\Tutor\Models\EnrollmentModel::STATUS_CANCEL,
		array( $existing->ID )
	);

	return new WP_REST_Response(
		array(
			'unenrolled'    => true,
			'enrollment_id' => (int) $existing->ID,
			'user_id'       => $valid['user_id'],
			'course_id'     => $valid['course_id'],
		),
		200
	);
}

/**
 * POST /wp-json/mcglearn/v1/auto-login-token — { user_id, course_id? }
 *
 * course_id is optional and not in the original spec, but accepted here
 * so the launch redirect can go straight to a specific course rather than
 * a generic dashboard — validated server-side against a real post ID
 * rather than accepting an arbitrary redirect URL from the caller, so
 * this can't become an open-redirect.
 *
 * @param WP_REST_Request $request The incoming request.
 * @return WP_REST_Response|WP_Error
 */
function mcglearn_handle_create_auto_login_token( WP_REST_Request $request ) {
	$user_id = absint( $request->get_param( 'user_id' ) );
	if ( ! $user_id || ! get_user_by( 'id', $user_id ) ) {
		return new WP_Error(
			'invalid_user',
			'user_id is required and must reference an existing user.',
			array( 'status' => 400 )
		);
	}

	$course_id = absint( $request->get_param( 'course_id' ) );
	if ( $course_id && ! get_post( $course_id ) ) {
		return new WP_Error(
			'invalid_course',
			'course_id, if provided, must reference an existing post.',
			array( 'status' => 400 )
		);
	}

	$token = bin2hex( random_bytes( 32 ) );
	set_transient(
		'mcglearn_autologin_' . $token,
		array(
			'user_id'   => $user_id,
			'course_id' => $course_id ? $course_id : 0,
		),
		MCGLEARN_TOKEN_TTL
	);

	return new WP_REST_Response(
		array(
			'token'      => $token,
			'expires_in' => MCGLEARN_TOKEN_TTL,
			'launch_url' => add_query_arg( 'mcglearn_token', $token, home_url( '/' ) ),
		),
		200
	);
}

/**
 * Consumes an auto-login token from a real top-level browser navigation
 * (the redirect target MCG-Learn sends the student's browser to) — not a
 * JSON REST call, since it needs to set a cookie and issue a normal HTTP
 * redirect the way a login form submission would. Hooked on `init` so it
 * runs before any output, on every request, checking for the one query
 * param it cares about.
 *
 * Single-use: the transient is deleted the instant it's read, valid or
 * not, so a captured or guessed token can never be replayed even if the
 * TTL hasn't expired yet.
 */
add_action(
	'init',
	function () {
		if ( empty( $_GET['mcglearn_token'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			return;
		}

		$token = sanitize_text_field( wp_unslash( $_GET['mcglearn_token'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$key   = 'mcglearn_autologin_' . $token;
		$data  = get_transient( $key );

		delete_transient( $key );

		if ( ! is_array( $data ) || empty( $data['user_id'] ) || ! get_user_by( 'id', $data['user_id'] ) ) {
			wp_die( 'This login link is invalid or has expired.', 'Login link expired', array( 'response' => 403 ) );
		}

		$user_id = (int) $data['user_id'];
		wp_set_current_user( $user_id );
		wp_set_auth_cookie( $user_id, false );
		do_action( 'wp_login', get_userdata( $user_id )->user_login, get_userdata( $user_id ) );

		$redirect = ! empty( $data['course_id'] ) ? get_permalink( (int) $data['course_id'] ) : home_url( '/dashboard/' );
		wp_safe_redirect( $redirect ? $redirect : home_url( '/' ) );
		exit;
	}
);
