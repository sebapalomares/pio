<?php
/**
 * Rol «Gestor de puntos» y capacidades de Pío.
 *
 * - Administradores: todo, incluida la pantalla «Verificar en el mapa» con todos los puntos.
 * - Gestor de puntos (pio_gestor): crea y edita SOLO sus puntos y verifica SOLO sus puntos.
 * - Editores: siguen pudiendo editar todos los puntos, pero no usan la pantalla de verificación.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Sube este número si cambian las capacidades: se vuelven a aplicar solas al cargar el escritorio. */
const PIO_CAPS_VERSION = 1;

/** Capacidad de la pantalla de verificación. */
const PIO_CAP_VERIFICAR = 'pio_verificar_puntos';

/** Capacidades del tipo pio_punto que tiene un gestor (solo sus puntos). */
function pio_caps_gestor(): array {
	return array(
		'read',
		'upload_files',
		'edit_pio_puntos',
		'edit_published_pio_puntos',
		'publish_pio_puntos',
		'delete_pio_puntos',
		'delete_published_pio_puntos',
		PIO_CAP_VERIFICAR,
	);
}

/** Capacidades del tipo pio_punto para quien puede con todos (administrador y editor). */
function pio_caps_todos_los_puntos(): array {
	return array(
		'edit_pio_puntos',
		'edit_others_pio_puntos',
		'edit_published_pio_puntos',
		'edit_private_pio_puntos',
		'publish_pio_puntos',
		'read_private_pio_puntos',
		'delete_pio_puntos',
		'delete_others_pio_puntos',
		'delete_published_pio_puntos',
		'delete_private_pio_puntos',
	);
}

function pio_instalar_roles(): void {
	$gestor = get_role( 'pio_gestor' );
	if ( ! $gestor ) {
		$gestor = add_role( 'pio_gestor', __( 'Gestor de puntos', 'pio' ) );
	}
	if ( $gestor ) {
		foreach ( pio_caps_gestor() as $cap ) {
			$gestor->add_cap( $cap );
		}
	}

	foreach ( array( 'administrator', 'editor' ) as $nombre ) {
		$rol = get_role( $nombre );
		if ( ! $rol ) {
			continue;
		}
		foreach ( pio_caps_todos_los_puntos() as $cap ) {
			$rol->add_cap( $cap );
		}
		if ( 'administrator' === $nombre ) {
			$rol->add_cap( PIO_CAP_VERIFICAR );
		}
	}

	update_option( 'pio_caps_version', PIO_CAPS_VERSION );
}

/** Si el plugin se actualiza sin desactivar/activar, aplica las capacidades nuevas. */
add_action(
	'admin_init',
	function () {
		if ( (int) get_option( 'pio_caps_version' ) < PIO_CAPS_VERSION ) {
			pio_instalar_roles();
		}
	}
);

/** Al desinstalar no se borra nada; al desactivar se deja el rol para no perder usuarios asignados. */
