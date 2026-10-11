<?php
/**
 * Plugin Name: Axiom Tavus Avatar
 * Description: Puts the Axiom × Alan Tavus video avatar on any page with the [axiom_tavus] shortcode. The Tavus API key stays on the server.
 * Version: 0.1.0
 * Author: Axiom Enterprises
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const AXIOM_TAVUS_OPTION = 'axiom_tavus_settings';
const AXIOM_TAVUS_API    = 'https://tavusapi.com/v2/conversations';

function axiom_tavus_defaults() {
	return array(
		'api_key'          => '',
		'persona_id'       => '',
		'replica_id'       => '',
		'button_label'     => 'Talk to Axiom',
		'max_minutes'      => 5,
		'daily_cap'        => 20,
		'cooldown_minutes' => 10,
	);
}

function axiom_tavus_settings() {
	return wp_parse_args( get_option( AXIOM_TAVUS_OPTION, array() ), axiom_tavus_defaults() );
}

// The key in wp-config.php (define( 'TAVUS_API_KEY', '...' );) wins over the settings field.
function axiom_tavus_api_key() {
	if ( defined( 'TAVUS_API_KEY' ) && TAVUS_API_KEY ) {
		return TAVUS_API_KEY;
	}
	return axiom_tavus_settings()['api_key'];
}

/* ---------- Settings page ---------- */

add_action( 'admin_menu', function () {
	add_options_page( 'Axiom Tavus', 'Axiom Tavus', 'manage_options', 'axiom-tavus', 'axiom_tavus_render_settings' );
} );

add_action( 'admin_init', function () {
	register_setting( 'axiom_tavus', AXIOM_TAVUS_OPTION, array( 'sanitize_callback' => 'axiom_tavus_sanitize' ) );
} );

function axiom_tavus_sanitize( $input ) {
	$old = axiom_tavus_settings();
	$out = axiom_tavus_defaults();

	// A blank key field keeps the saved key, so it never has to be shown on the page.
	$out['api_key']          = ! empty( $input['api_key'] ) ? sanitize_text_field( $input['api_key'] ) : $old['api_key'];
	$out['persona_id']       = sanitize_text_field( $input['persona_id'] ?? '' );
	$out['replica_id']       = sanitize_text_field( $input['replica_id'] ?? '' );
	$out['button_label']     = sanitize_text_field( $input['button_label'] ?? $out['button_label'] );
	$out['max_minutes']      = max( 1, min( 60, absint( $input['max_minutes'] ?? 5 ) ) );
	$out['daily_cap']        = max( 1, absint( $input['daily_cap'] ?? 20 ) );
	$out['cooldown_minutes'] = max( 0, absint( $input['cooldown_minutes'] ?? 10 ) );
	return $out;
}

function axiom_tavus_render_settings() {
	$s          = axiom_tavus_settings();
	$key_in_cfg = defined( 'TAVUS_API_KEY' ) && TAVUS_API_KEY;
	$has_key    = $key_in_cfg || '' !== $s['api_key'];
	$name       = AXIOM_TAVUS_OPTION;
	?>
	<div class="wrap">
		<h1>Axiom Tavus Avatar</h1>
		<p>Add <code>[axiom_tavus]</code> to any page to show the avatar.</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'axiom_tavus' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="at-key">Tavus API key</label></th>
					<td>
						<?php if ( $key_in_cfg ) : ?>
							<p>Set in wp-config.php.</p>
						<?php else : ?>
							<input id="at-key" type="password" class="regular-text" name="<?php echo esc_attr( $name ); ?>[api_key]" value="" autocomplete="off" placeholder="<?php echo $has_key ? 'Saved. Leave blank to keep it.' : ''; ?>">
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="at-persona">Persona ID</label></th>
					<td><input id="at-persona" class="regular-text" name="<?php echo esc_attr( $name ); ?>[persona_id]" value="<?php echo esc_attr( $s['persona_id'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="at-replica">Replica ID</label></th>
					<td><input id="at-replica" class="regular-text" name="<?php echo esc_attr( $name ); ?>[replica_id]" value="<?php echo esc_attr( $s['replica_id'] ); ?>">
						<p class="description">Leave blank to use the replica saved on the persona.</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="at-label">Button text</label></th>
					<td><input id="at-label" class="regular-text" name="<?php echo esc_attr( $name ); ?>[button_label]" value="<?php echo esc_attr( $s['button_label'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="at-max">Longest call (minutes)</label></th>
					<td><input id="at-max" type="number" min="1" max="60" name="<?php echo esc_attr( $name ); ?>[max_minutes]" value="<?php echo esc_attr( $s['max_minutes'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="at-cap">Calls per day, whole site</label></th>
					<td><input id="at-cap" type="number" min="1" name="<?php echo esc_attr( $name ); ?>[daily_cap]" value="<?php echo esc_attr( $s['daily_cap'] ); ?>">
						<p class="description">Stops a runaway Tavus bill.</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="at-cool">Wait between calls, per visitor (minutes)</label></th>
					<td><input id="at-cool" type="number" min="0" name="<?php echo esc_attr( $name ); ?>[cooldown_minutes]" value="<?php echo esc_attr( $s['cooldown_minutes'] ); ?>"></td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/* ---------- Server endpoint: starts a call ---------- */

add_action( 'rest_api_init', function () {
	register_rest_route( 'axiom-tavus/v1', '/start', array(
		'methods'             => 'POST',
		'callback'            => 'axiom_tavus_start',
		// Public on purpose: visitors are not logged in. The limits below are the guard.
		'permission_callback' => '__return_true',
	) );
} );

function axiom_tavus_start() {
	$s   = axiom_tavus_settings();
	$key = axiom_tavus_api_key();

	if ( '' === $key || '' === $s['persona_id'] ) {
		return new WP_Error( 'axiom_tavus_setup', 'The avatar is not set up yet.', array( 'status' => 503 ) );
	}

	$ip_key = 'axiom_tavus_ip_' . md5( $_SERVER['REMOTE_ADDR'] ?? '' );
	if ( $s['cooldown_minutes'] > 0 && get_transient( $ip_key ) ) {
		return new WP_Error( 'axiom_tavus_cooldown', 'You just had a call. Try again in a few minutes.', array( 'status' => 429 ) );
	}

	$day_key = 'axiom_tavus_count_' . gmdate( 'Ymd' );
	$count   = (int) get_transient( $day_key );
	if ( $count >= $s['daily_cap'] ) {
		return new WP_Error( 'axiom_tavus_cap', 'The avatar is resting for today. Come back tomorrow.', array( 'status' => 429 ) );
	}

	$body = array(
		'persona_id'        => $s['persona_id'],
		'conversation_name' => 'Website visitor ' . gmdate( 'Y-m-d H:i' ),
		'properties'        => array(
			'max_call_duration'          => $s['max_minutes'] * 60,
			'participant_left_timeout'   => 30,
			'participant_absent_timeout' => 60,
		),
	);
	if ( '' !== $s['replica_id'] ) {
		$body['replica_id'] = $s['replica_id'];
	}

	$res = wp_remote_post( AXIOM_TAVUS_API, array(
		'timeout' => 20,
		'headers' => array(
			'x-api-key'    => $key,
			'Content-Type' => 'application/json',
		),
		'body'    => wp_json_encode( $body ),
	) );

	if ( is_wp_error( $res ) ) {
		error_log( '[AxiomTavus] ' . $res->get_error_message() );
		return new WP_Error( 'axiom_tavus_down', 'Could not reach the avatar. Try again soon.', array( 'status' => 502 ) );
	}

	$code = wp_remote_retrieve_response_code( $res );
	$data = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( $code >= 300 || empty( $data['conversation_url'] ) ) {
		error_log( '[AxiomTavus] Tavus returned ' . $code . ': ' . wp_remote_retrieve_body( $res ) );
		return new WP_Error( 'axiom_tavus_failed', 'The avatar could not start. Try again soon.', array( 'status' => 502 ) );
	}

	set_transient( $day_key, $count + 1, DAY_IN_SECONDS );
	if ( $s['cooldown_minutes'] > 0 ) {
		set_transient( $ip_key, 1, $s['cooldown_minutes'] * MINUTE_IN_SECONDS );
	}

	// Only the call link goes to the browser. The key never does.
	return array( 'url' => esc_url_raw( $data['conversation_url'] ) );
}

/* ---------- Shortcode: [axiom_tavus] ---------- */

add_shortcode( 'axiom_tavus', function () {
	$s = axiom_tavus_settings();

	wp_register_script( 'axiom-tavus', false, array(), '0.1.0', true );
	wp_enqueue_script( 'axiom-tavus' );
	wp_add_inline_script( 'axiom-tavus', 'window.axiomTavus=' . wp_json_encode( array(
		'endpoint' => esc_url_raw( rest_url( 'axiom-tavus/v1/start' ) ),
	) ) . ';' . axiom_tavus_js() );

	wp_register_style( 'axiom-tavus', false, array(), '0.1.0' );
	wp_enqueue_style( 'axiom-tavus' );
	wp_add_inline_style( 'axiom-tavus', axiom_tavus_css() );

	return '<div class="axiom-tavus" data-axiom-tavus>'
		. '<button type="button" class="axiom-tavus__start">' . esc_html( $s['button_label'] ) . '</button>'
		. '<p class="axiom-tavus__note">Uses your camera and microphone. You are talking to an AI avatar.</p>'
		. '<p class="axiom-tavus__msg" role="status" aria-live="polite"></p>'
		. '</div>';
} );

function axiom_tavus_js() {
	return <<<'JS'
document.querySelectorAll('[data-axiom-tavus]').forEach(function (box) {
  var start = box.querySelector('.axiom-tavus__start');
  var msg = box.querySelector('.axiom-tavus__msg');
  start.addEventListener('click', function () {
    start.disabled = true;
    msg.textContent = 'Connecting…';
    fetch(window.axiomTavus.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok || !res.d.url) { throw new Error(res.d.message || 'Could not start the call.'); }
        msg.textContent = '';
        var frame = document.createElement('iframe');
        frame.src = res.d.url;
        frame.allow = 'camera; microphone; autoplay; fullscreen; display-capture';
        frame.className = 'axiom-tavus__frame';
        frame.title = 'Axiom video avatar';
        var end = document.createElement('button');
        end.type = 'button';
        end.className = 'axiom-tavus__end';
        end.textContent = 'End call';
        end.addEventListener('click', function () {
          frame.remove(); end.remove();
          start.hidden = false; start.disabled = false;
        });
        start.hidden = true;
        box.appendChild(frame);
        box.appendChild(end);
      })
      .catch(function (e) { msg.textContent = e.message; start.disabled = false; });
  });
});
JS;
}

function axiom_tavus_css() {
	return '.axiom-tavus{max-width:720px;margin:0 auto;text-align:center}'
		. '.axiom-tavus__start,.axiom-tavus__end{font-size:1.1rem;padding:.8em 1.6em;border:0;border-radius:999px;cursor:pointer;background:#111;color:#fff}'
		. '.axiom-tavus__start[disabled]{opacity:.6;cursor:wait}'
		. '.axiom-tavus__frame{width:100%;aspect-ratio:16/9;border:0;border-radius:12px;margin:1rem 0;background:#000}'
		. '.axiom-tavus__note{font-size:.85rem;opacity:.7;margin-top:.6rem}';
}
