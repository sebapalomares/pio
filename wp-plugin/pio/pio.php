<?php
/**
 * Plugin Name: Pío – Puntos de interés
 * Description: Puntos de interés, rutas y códigos QR para la app Pío, con API REST.
 * Version:     0.2.0
 * Author:      Ingeniotic
 * Text Domain: pio
 * Requires PHP: 8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PIO_VERSION', '0.2.0' );
define( 'PIO_DIR', plugin_dir_path( __FILE__ ) );

require_once PIO_DIR . 'includes/roles.php';
require_once PIO_DIR . 'includes/tipos.php';
require_once PIO_DIR . 'includes/api.php';
require_once PIO_DIR . 'includes/verificacion.php';
require_once PIO_DIR . 'includes/admin-verificar.php';
require_once PIO_DIR . 'includes/importador.php';

register_activation_hook( __FILE__, function () {
	pio_instalar_roles();
	pio_registrar_tipos();
	flush_rewrite_rules();
} );

register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
