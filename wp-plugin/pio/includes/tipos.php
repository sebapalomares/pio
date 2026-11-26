<?php
/**
 * Tipos de contenido, taxonomía y campos de Pío.
 * Ver docs del proyecto: 03-modelo-datos-api.md
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Campos del punto de interés: clave => tipo para register_post_meta. */
function pio_campos_punto(): array {
	return array(
		'lat'           => 'number',
		'lng'           => 'number',
		'altitud'       => 'number',
		'horario'       => 'string',
		'precio'        => 'string',
		'telefono'      => 'string',
		'web'           => 'string',
		'reserva_url'   => 'string',
		'video_url'     => 'string',
		'audio_url'     => 'string',
		'qr_codigo'     => 'string',
		'radio_checkin' => 'integer',
	);
}

function pio_registrar_tipos(): void {
	register_post_type(
		'pio_punto',
		array(
			'labels'       => array(
				'name'          => 'Puntos de interés',
				'singular_name' => 'Punto de interés',
				'add_new_item'  => 'Añadir punto de interés',
				'edit_item'     => 'Editar punto de interés',
			),
			'public'       => true,
			'show_in_rest' => true,
			'menu_icon'    => 'dashicons-location',
			'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt', 'author', 'custom-fields' ),
			'rewrite'      => array( 'slug' => 'punto' ),
			// Capacidades propias (edit_pio_puntos, edit_others_pio_puntos…) para que el rol
			// «Gestor de puntos» edite solo los suyos sin tocar las entradas del blog. Ver roles.php.
			'capability_type' => array( 'pio_punto', 'pio_puntos' ),
			'map_meta_cap'    => true,
		)
	);

	register_post_type(
		'pio_ruta',
		array(
			'labels'       => array(
				'name'          => 'Rutas',
				'singular_name' => 'Ruta',
				'add_new_item'  => 'Añadir ruta',
				'edit_item'     => 'Editar ruta',
			),
			'public'       => true,
			'show_in_rest' => true,
			'menu_icon'    => 'dashicons-flag',
			'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
			'rewrite'      => array( 'slug' => 'ruta' ),
		)
	);

	register_taxonomy(
		'pio_categoria',
		'pio_punto',
		array(
			'labels'            => array(
				'name'          => 'Categorías',
				'singular_name' => 'Categoría',
			),
			'hierarchical'      => true,
			'show_in_rest'      => true,
			'show_admin_column' => true,
			'rewrite'           => array( 'slug' => 'categoria-punto' ),
			'capabilities'      => array(
				'manage_terms' => 'manage_categories',
				'edit_terms'   => 'manage_categories',
				'delete_terms' => 'manage_categories',
				'assign_terms' => 'edit_pio_puntos',
			),
		)
	);

	foreach ( pio_campos_punto() as $clave => $tipo ) {
		register_post_meta(
			'pio_punto',
			$clave,
			array(
				'type'          => $tipo,
				'single'        => true,
				'show_in_rest'  => true,
				'auth_callback' => fn( $permitido, $clave, $post_id ) => current_user_can( 'edit_post', $post_id ),
			)
		);
	}

	// Paradas de la ruta: lista ordenada de IDs de puntos.
	register_post_meta(
		'pio_ruta',
		'paradas',
		array(
			'type'          => 'array',
			'single'        => true,
			'show_in_rest'  => array( 'schema' => array( 'type' => 'array', 'items' => array( 'type' => 'integer' ) ) ),
			'auth_callback' => fn() => current_user_can( 'edit_posts' ),
		)
	);
	foreach ( array( 'color', 'icono', 'premio' ) as $clave ) {
		register_post_meta(
			'pio_ruta',
			$clave,
			array(
				'type'          => 'string',
				'single'        => true,
				'show_in_rest'  => true,
				'auth_callback' => fn() => current_user_can( 'edit_posts' ),
			)
		);
	}
}
add_action( 'init', 'pio_registrar_tipos' );

/** Cada punto recibe un código QR aleatorio e irrepetible al guardarse por primera vez. */
function pio_asignar_qr( int $post_id, WP_Post $post ): void {
	if ( 'pio_punto' !== $post->post_type || wp_is_post_revision( $post_id ) ) {
		return;
	}
	if ( ! get_post_meta( $post_id, 'qr_codigo', true ) ) {
		update_post_meta( $post_id, 'qr_codigo', wp_generate_password( 12, false, false ) );
	}
}
add_action( 'save_post', 'pio_asignar_qr', 10, 2 );
