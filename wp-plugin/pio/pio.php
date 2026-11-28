<?php
/**
 * Plugin Name: Pío – Puntos de interés
 * Description: Puntos de interés, rutas y códigos QR para la app Pío, con API REST.
 * Version:     0.4.0
 * Author:      Ingeniotic
 * Text Domain: pio
 * Requires PHP: 8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PIO_VERSION', '0.4.0' );
define( 'PIO_DIR', plugin_dir_path( __FILE__ ) );

require_once PIO_DIR . 'includes/roles.php';
require_once PIO_DIR . 'includes/origen.php';
require_once PIO_DIR . 'includes/tipos.php';
require_once PIO_DIR . 'includes/api.php';
require_once PIO_DIR . 'includes/trazado.php';
require_once PIO_DIR . 'includes/verificacion.php';
require_once PIO_DIR . 'includes/admin-verificar.php';
require_once PIO_DIR . 'includes/importador.php';

register_activation_hook( __FILE__, function () {
	pio_instalar_roles();
	pio_registrar_tipos();
	pio_registrar_tipo_punto();
	flush_rewrite_rules();
} );

/**
 * Al actualizar: los puntos que ya existían en la web (Toolset) reciben su código QR.
 * Se repite cada vez que cambia la versión del plugin; solo toca los que no lo tienen.
 */
add_action(
	'admin_init',
	function () {
		if ( get_option( 'pio_version_datos' ) === PIO_VERSION ) {
			return;
		}
		$ids = get_posts(
			array(
				'post_type'      => pio_tipo_punto(),
				'post_status'    => 'any',
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		);
		foreach ( $ids as $id ) {
			pio_asignar_qr_si_falta( (int) $id );
		}
		update_option( 'pio_version_datos', PIO_VERSION );
	}
);

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
