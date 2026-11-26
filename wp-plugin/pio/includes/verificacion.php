<?php
/**
 * Verificación de la ubicación de los puntos (D18).
 *
 * Un punto está «verificado» cuando alguien con permiso ha confirmado sus coordenadas en la
 * pantalla «Verificar en el mapa». Se guarda una instantánea en la meta protegida
 * `_pio_verificacion`: lat, lng, quién, cuándo, cómo (mapa, GPS o terreno) y la precisión del GPS.
 *
 * Regla: el punto solo cuenta como verificado si sus `lat`/`lng` actuales coinciden con los de
 * la instantánea. Si alguien cambia las coordenadas por cualquier vía (editor, API, importación),
 * deja de estar verificado y la instantánea pasa a `_pio_verificacion_anterior`.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const PIO_META_VERIFICACION          = '_pio_verificacion';
const PIO_META_VERIFICACION_ANTERIOR = '_pio_verificacion_anterior';

/** Decimales con los que se guardan las coordenadas (7 ≈ 1 cm). */
const PIO_DECIMALES_COORD = 7;

function pio_redondear_coord( $valor ): ?float {
	if ( '' === $valor || null === $valor || ! is_numeric( $valor ) ) {
		return null;
	}
	return round( (float) $valor, PIO_DECIMALES_COORD );
}

/** Coordenadas actuales del punto, o null si le falta alguna. */
function pio_coords_punto( int $id ): ?array {
	$lat = pio_redondear_coord( get_post_meta( $id, 'lat', true ) );
	$lng = pio_redondear_coord( get_post_meta( $id, 'lng', true ) );
	if ( null === $lat || null === $lng ) {
		return null;
	}
	return array( 'lat' => $lat, 'lng' => $lng );
}

function pio_misma_coord( float $a, float $b ): bool {
	return abs( $a - $b ) < 0.5 / ( 10 ** PIO_DECIMALES_COORD );
}

/** Instantánea de la verificación vigente, o null. */
function pio_verificacion_de( int $id ): ?array {
	$v = get_post_meta( $id, PIO_META_VERIFICACION, true );
	return is_array( $v ) && isset( $v['lat'], $v['lng'] ) ? $v : null;
}

function pio_esta_verificado( int $id ): bool {
	$v      = pio_verificacion_de( $id );
	$coords = pio_coords_punto( $id );
	if ( ! $v || ! $coords ) {
		return false;
	}
	return pio_misma_coord( $coords['lat'], (float) $v['lat'] ) && pio_misma_coord( $coords['lng'], (float) $v['lng'] );
}

/**
 * Guarda las coordenadas y marca el punto como verificado.
 *
 * @param string     $metodo    'mapa' (arrastrando el pin), 'gps' (desde el sitio) o 'terreno' (importado).
 * @param float|null $precision Precisión del GPS en metros, si se usó.
 * @param array      $extra     Para el importador: 'por_nombre' y 'fecha' fijos.
 */
function pio_verificar_punto( int $id, float $lat, float $lng, string $metodo, ?float $precision = null, array $extra = array() ): void {
	$lat = round( $lat, PIO_DECIMALES_COORD );
	$lng = round( $lng, PIO_DECIMALES_COORD );

	// Primero las coordenadas (esto invalida la verificación anterior, si la había)…
	update_post_meta( $id, 'lat', $lat );
	update_post_meta( $id, 'lng', $lng );

	// …y después la instantánea nueva.
	$usuario = wp_get_current_user();
	update_post_meta(
		$id,
		PIO_META_VERIFICACION,
		array(
			'lat'        => $lat,
			'lng'        => $lng,
			'por'        => isset( $extra['por_nombre'] ) ? 0 : $usuario->ID,
			'por_nombre' => $extra['por_nombre'] ?? $usuario->display_name,
			'fecha'      => $extra['fecha'] ?? current_time( 'mysql', true ),
			'metodo'     => $metodo,
			'precision'  => null !== $precision ? (int) round( $precision ) : null,
		)
	);
	delete_post_meta( $id, PIO_META_VERIFICACION_ANTERIOR );
}

/** Si las coordenadas ya no coinciden con la instantánea, el punto deja de estar verificado. */
function pio_revisar_verificacion( int $id ): void {
	$v = pio_verificacion_de( $id );
	if ( ! $v || pio_esta_verificado( $id ) ) {
		return;
	}
	$v['invalidada'] = current_time( 'mysql', true );
	update_post_meta( $id, PIO_META_VERIFICACION_ANTERIOR, $v );
	delete_post_meta( $id, PIO_META_VERIFICACION );
}

/** Vigila cualquier cambio de lat/lng en un punto, venga de donde venga. */
function pio_al_cambiar_meta( $meta_id, $post_id, $clave ): void {
	if ( in_array( $clave, array( 'lat', 'lng' ), true ) && 'pio_punto' === get_post_type( $post_id ) ) {
		pio_revisar_verificacion( (int) $post_id );
	}
}
add_action( 'added_post_meta', 'pio_al_cambiar_meta', 10, 3 );
add_action( 'updated_post_meta', 'pio_al_cambiar_meta', 10, 3 );
add_action( 'deleted_post_meta', 'pio_al_cambiar_meta', 10, 3 );

/** Fecha guardada (GMT «Y-m-d H:i:s» o solo «Y-m-d») en texto local. */
function pio_fecha_texto( ?string $fecha ): ?string {
	if ( ! $fecha ) {
		return null;
	}
	if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $fecha ) ) {
		return wp_date( get_option( 'date_format' ), strtotime( $fecha . ' 12:00:00 UTC' ) );
	}
	$marca = strtotime( $fecha . ' UTC' );
	return $marca ? wp_date( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), $marca ) : null;
}

/** Datos de una instantánea listos para mostrar. */
function pio_verificacion_publica( ?array $v ): ?array {
	if ( ! $v ) {
		return null;
	}
	$nombre = $v['por_nombre'] ?? '';
	if ( ! empty( $v['por'] ) ) {
		$u = get_userdata( (int) $v['por'] );
		if ( $u ) {
			$nombre = $u->display_name;
		}
	}
	return array(
		'por'             => $nombre,
		'fecha'           => $v['fecha'] ?? null,
		'fecha_texto'     => pio_fecha_texto( $v['fecha'] ?? null ),
		'metodo'          => $v['metodo'] ?? 'mapa',
		'precision'       => isset( $v['precision'] ) ? (int) $v['precision'] : null,
		'invalidada_texto' => pio_fecha_texto( $v['invalidada'] ?? null ),
	);
}

/* -------------------------------------------------------------------------
 * API privada de la pantalla de verificación: /wp-json/pio/v1/verificacion/…
 * Necesita sesión iniciada (cookie + nonce wp_rest) y la capacidad pio_verificar_puntos.
 * ---------------------------------------------------------------------- */

function pio_puede_verificar(): bool {
	return current_user_can( PIO_CAP_VERIFICAR );
}

/** Punto tal como lo usa la pantalla de verificación. */
function pio_punto_para_verificar( WP_Post $p ): array {
	$coords = pio_coords_punto( $p->ID );
	$cat    = pio_categoria_de( $p->ID );
	return array(
		'id'          => $p->ID,
		'nombre'      => get_the_title( $p ) ?: __( '(sin nombre)', 'pio' ),
		'estado'      => $p->post_status,
		'categoria'   => $cat ? array( 'slug' => $cat['slug'], 'nombre' => $cat['nombre'] ) : null,
		'lat'         => $coords['lat'] ?? null,
		'lng'         => $coords['lng'] ?? null,
		'verificado'  => pio_esta_verificado( $p->ID ),
		'verificacion' => pio_verificacion_publica( pio_verificacion_de( $p->ID ) ),
		'anterior'    => pio_verificacion_publica( get_post_meta( $p->ID, PIO_META_VERIFICACION_ANTERIOR, true ) ?: null ),
		'editar_url'  => get_edit_post_link( $p->ID, 'raw' ),
	);
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			PIO_NS,
			'/verificacion/puntos',
			array(
				'methods'             => 'GET',
				'callback'            => 'pio_api_verificacion_lista',
				'permission_callback' => 'pio_puede_verificar',
			)
		);
		register_rest_route(
			PIO_NS,
			'/verificacion/puntos/(?P<id>\d+)',
			array(
				'methods'             => 'POST',
				'callback'            => 'pio_api_verificacion_guardar',
				'permission_callback' => fn( WP_REST_Request $req ) => pio_puede_verificar() && current_user_can( 'edit_post', (int) $req['id'] ),
				'args'                => array(
					'lat'       => array(
						'type'     => 'number',
						'required' => true,
						'minimum'  => -90,
						'maximum'  => 90,
					),
					'lng'       => array(
						'type'     => 'number',
						'required' => true,
						'minimum'  => -180,
						'maximum'  => 180,
					),
					'metodo'    => array(
						'type'    => 'string',
						'enum'    => array( 'mapa', 'gps' ),
						'default' => 'mapa',
					),
					'precision' => array(
						'type'    => array( 'number', 'null' ),
						'minimum' => 0,
					),
				),
			)
		);
	}
);

function pio_api_verificacion_lista(): WP_REST_Response {
	$args = array(
		'post_type'      => 'pio_punto',
		'post_status'    => array( 'publish', 'draft', 'pending', 'future', 'private' ),
		'posts_per_page' => 2000,
		'orderby'        => 'title',
		'order'          => 'ASC',
		'no_found_rows'  => true,
	);
	// El gestor solo ve sus puntos.
	if ( ! current_user_can( 'edit_others_pio_puntos' ) ) {
		$args['author'] = get_current_user_id();
	}
	$puntos = array_values(
		array_filter(
			get_posts( $args ),
			fn( $p ) => current_user_can( 'edit_post', $p->ID )
		)
	);

	$categorias = get_terms( array( 'taxonomy' => 'pio_categoria', 'hide_empty' => false ) );
	if ( is_wp_error( $categorias ) ) {
		$categorias = array();
	}

	return rest_ensure_response(
		array(
			'puntos'     => array_map( 'pio_punto_para_verificar', $puntos ),
			'categorias' => array_map( fn( $t ) => array( 'slug' => $t->slug, 'nombre' => $t->name ), $categorias ),
		)
	);
}

function pio_api_verificacion_guardar( WP_REST_Request $req ) {
	$p = get_post( (int) $req['id'] );
	if ( ! $p || 'pio_punto' !== $p->post_type ) {
		return new WP_Error( 'pio_no_encontrado', __( 'Punto no encontrado', 'pio' ), array( 'status' => 404 ) );
	}
	$metodo    = 'gps' === $req['metodo'] ? 'gps' : 'mapa';
	$precision = 'gps' === $metodo && null !== $req['precision'] ? (float) $req['precision'] : null;

	pio_verificar_punto( $p->ID, (float) $req['lat'], (float) $req['lng'], $metodo, $precision );

	return rest_ensure_response( pio_punto_para_verificar( get_post( $p->ID ) ) );
}

/* -------------------------------------------------------------------------
 * Columna «Ubicación» en el listado de puntos.
 * ---------------------------------------------------------------------- */

add_filter(
	'manage_pio_punto_posts_columns',
	function ( array $columnas ): array {
		$columnas['pio_verificado'] = __( 'Ubicación', 'pio' );
		return $columnas;
	}
);

add_action(
	'manage_pio_punto_posts_custom_column',
	function ( string $columna, int $id ): void {
		if ( 'pio_verificado' !== $columna ) {
			return;
		}
		if ( pio_esta_verificado( $id ) ) {
			$v = pio_verificacion_publica( pio_verificacion_de( $id ) );
			printf(
				'<span style="color:#1B6E8A;font-weight:600">%1$s</span><br><small>%2$s</small>',
				esc_html__( '✓ Verificada', 'pio' ),
				esc_html( trim( $v['por'] . ' · ' . $v['fecha_texto'], ' ·' ) )
			);
		} elseif ( ! pio_coords_punto( $id ) ) {
			echo '<span style="color:#B3261E">' . esc_html__( 'Sin coordenadas', 'pio' ) . '</span>';
		} else {
			echo '<span style="color:#B3261E">' . esc_html__( 'Sin verificar', 'pio' ) . '</span>';
		}
	},
	10,
	2
);
