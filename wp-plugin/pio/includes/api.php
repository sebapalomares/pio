<?php
/**
 * API REST de Pío: /wp-json/pio/v1
 * Solo lectura pública. La escritura se hace desde el escritorio de WordPress.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const PIO_NS = 'pio/v1';

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			PIO_NS,
			'/puntos',
			array(
				'methods'             => 'GET',
				'callback'            => 'pio_api_puntos',
				'permission_callback' => '__return_true',
				'args'                => array(
					'lat'       => array( 'type' => 'number' ),
					'lng'       => array( 'type' => 'number' ),
					'radio'     => array( 'type' => 'integer', 'default' => 5000 ),
					'categoria' => array( 'type' => 'string' ),
					'q'         => array( 'type' => 'string' ),
				),
			)
		);
		register_rest_route(
			PIO_NS,
			'/puntos/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => 'pio_api_punto',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			PIO_NS,
			'/categorias',
			array(
				'methods'             => 'GET',
				'callback'            => 'pio_api_categorias',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			PIO_NS,
			'/rutas',
			array(
				'methods'             => 'GET',
				'callback'            => 'pio_api_rutas',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			PIO_NS,
			'/rutas/(?P<id>\d+)',
			array(
				'methods'             => 'GET',
				'callback'            => 'pio_api_ruta',
				'permission_callback' => '__return_true',
			)
		);
		register_rest_route(
			PIO_NS,
			'/qr/(?P<codigo>[A-Za-z0-9]+)',
			array(
				'methods'             => 'GET',
				'callback'            => 'pio_api_qr',
				'permission_callback' => '__return_true',
			)
		);
	}
);

/** Distancia en metros (haversine). */
function pio_distancia( float $lat1, float $lng1, float $lat2, float $lng2 ): float {
	$r    = 6371000;
	$dlat = deg2rad( $lat2 - $lat1 );
	$dlng = deg2rad( $lng2 - $lng1 );
	$h    = sin( $dlat / 2 ) ** 2 + cos( deg2rad( $lat1 ) ) * cos( deg2rad( $lat2 ) ) * sin( $dlng / 2 ) ** 2;
	return 2 * $r * asin( sqrt( $h ) );
}

function pio_categoria_de( int $id ): ?array {
	$terminos = get_the_terms( $id, 'pio_categoria' );
	if ( empty( $terminos ) || is_wp_error( $terminos ) ) {
		return null;
	}
	return array(
		'id'     => $terminos[0]->term_id,
		'nombre' => $terminos[0]->name,
		'slug'   => $terminos[0]->slug,
	);
}

/** Resumen de un punto para listas, mapa y RA. */
function pio_resumen_punto( WP_Post $p ): array {
	return array(
		'id'        => $p->ID,
		'nombre'    => get_the_title( $p ),
		'categoria' => pio_categoria_de( $p->ID ),
		'lat'       => (float) get_post_meta( $p->ID, 'lat', true ),
		'lng'       => (float) get_post_meta( $p->ID, 'lng', true ),
		'altitud'   => get_post_meta( $p->ID, 'altitud', true ) !== '' ? (float) get_post_meta( $p->ID, 'altitud', true ) : null,
		'foto'      => get_the_post_thumbnail_url( $p, 'medium' ) ?: null,
	);
}

function pio_api_puntos( WP_REST_Request $req ): WP_REST_Response {
	$args = array(
		'post_type'      => 'pio_punto',
		'post_status'    => 'publish',
		'posts_per_page' => 500,
		'no_found_rows'  => true,
	);
	if ( $req['q'] ) {
		$args['s'] = sanitize_text_field( $req['q'] );
	}
	if ( $req['categoria'] ) {
		$args['tax_query'] = array(
			array(
				'taxonomy' => 'pio_categoria',
				'field'    => 'slug',
				'terms'    => sanitize_title( $req['categoria'] ),
			),
		);
	}

	$puntos = array_map( 'pio_resumen_punto', get_posts( $args ) );

	if ( null !== $req['lat'] && null !== $req['lng'] ) {
		$lat = (float) $req['lat'];
		$lng = (float) $req['lng'];
		foreach ( $puntos as &$p ) {
			$p['distancia'] = round( pio_distancia( $lat, $lng, $p['lat'], $p['lng'] ) );
		}
		unset( $p );
		$radio  = (int) $req['radio'];
		$puntos = array_values( array_filter( $puntos, fn( $p ) => $p['distancia'] <= $radio ) );
		usort( $puntos, fn( $a, $b ) => $a['distancia'] <=> $b['distancia'] );
	}

	return rest_ensure_response( $puntos );
}

function pio_api_punto( WP_REST_Request $req ) {
	$p = get_post( (int) $req['id'] );
	if ( ! $p || 'pio_punto' !== $p->post_type || 'publish' !== $p->post_status ) {
		return new WP_Error( 'pio_no_encontrado', 'Punto no encontrado', array( 'status' => 404 ) );
	}
	$galeria = array_filter( array_map( 'intval', (array) get_post_meta( $p->ID, 'galeria', true ) ) );

	return rest_ensure_response(
		pio_resumen_punto( $p ) + array(
			'descripcion' => apply_filters( 'the_content', $p->post_content ),
			'galeria'     => array_values( array_filter( array_map( fn( $id ) => wp_get_attachment_image_url( $id, 'large' ), $galeria ) ) ),
			'horario'     => get_post_meta( $p->ID, 'horario', true ) ?: null,
			'precio'      => get_post_meta( $p->ID, 'precio', true ) ?: null,
			'telefono'    => get_post_meta( $p->ID, 'telefono', true ) ?: null,
			'web'         => get_post_meta( $p->ID, 'web', true ) ?: null,
			'reserva_url' => get_post_meta( $p->ID, 'reserva_url', true ) ?: null,
			'video_url'   => get_post_meta( $p->ID, 'video_url', true ) ?: null,
			'audio_url'   => get_post_meta( $p->ID, 'audio_url', true ) ?: null,
		)
	);
}

function pio_api_categorias(): WP_REST_Response {
	$terminos = get_terms( array( 'taxonomy' => 'pio_categoria', 'hide_empty' => false ) );
	if ( is_wp_error( $terminos ) ) {
		$terminos = array();
	}
	return rest_ensure_response(
		array_map(
			fn( $t ) => array( 'id' => $t->term_id, 'nombre' => $t->name, 'slug' => $t->slug ),
			$terminos
		)
	);
}

function pio_resumen_ruta( WP_Post $r ): array {
	$paradas = array_map( 'intval', (array) get_post_meta( $r->ID, 'paradas', true ) );
	return array(
		'id'          => $r->ID,
		'nombre'      => get_the_title( $r ),
		'descripcion' => get_the_excerpt( $r ),
		'color'       => get_post_meta( $r->ID, 'color', true ) ?: null,
		'icono'       => get_post_meta( $r->ID, 'icono', true ) ?: null,
		'num_paradas' => count( $paradas ),
	);
}

function pio_api_rutas(): WP_REST_Response {
	$rutas = get_posts( array( 'post_type' => 'pio_ruta', 'post_status' => 'publish', 'posts_per_page' => 100 ) );
	return rest_ensure_response( array_map( 'pio_resumen_ruta', $rutas ) );
}

function pio_api_ruta( WP_REST_Request $req ) {
	$r = get_post( (int) $req['id'] );
	if ( ! $r || 'pio_ruta' !== $r->post_type || 'publish' !== $r->post_status ) {
		return new WP_Error( 'pio_no_encontrado', 'Ruta no encontrada', array( 'status' => 404 ) );
	}
	$ids     = array_map( 'intval', (array) get_post_meta( $r->ID, 'paradas', true ) );
	$paradas = array();
	foreach ( $ids as $id ) {
		$p = get_post( $id );
		if ( $p && 'publish' === $p->post_status ) {
			$paradas[] = pio_resumen_punto( $p );
		}
	}
	return rest_ensure_response(
		pio_resumen_ruta( $r ) + array(
			'premio'  => get_post_meta( $r->ID, 'premio', true ) ?: null,
			'paradas' => $paradas,
		)
	);
}

/** Devuelve el punto al que pertenece un QR (y en qué rutas está) para validar el check-in. */
function pio_api_qr( WP_REST_Request $req ) {
	$puntos = get_posts(
		array(
			'post_type'      => 'pio_punto',
			'post_status'    => 'publish',
			'posts_per_page' => 1,
			'meta_key'       => 'qr_codigo',
			'meta_value'     => sanitize_text_field( $req['codigo'] ),
		)
	);
	if ( empty( $puntos ) ) {
		return new WP_Error( 'pio_qr_invalido', 'Código QR no válido', array( 'status' => 404 ) );
	}
	$punto = $puntos[0];

	$rutas = array();
	foreach ( get_posts( array( 'post_type' => 'pio_ruta', 'post_status' => 'publish', 'posts_per_page' => 100 ) ) as $r ) {
		if ( in_array( $punto->ID, array_map( 'intval', (array) get_post_meta( $r->ID, 'paradas', true ) ), true ) ) {
			$rutas[] = $r->ID;
		}
	}

	return rest_ensure_response( pio_resumen_punto( $punto ) + array( 'rutas' => $rutas ) );
}
