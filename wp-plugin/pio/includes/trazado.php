<?php
/**
 * Trazado a pie de las rutas (D25).
 *
 * Pío se usa andando: el recorrido entre paradas se calcula con el enrutador a pie de OSRM
 * (servidor de FOSSGIS, el mismo que usa openstreetmap.org) y se guarda en la ruta.
 * Solo se vuelve a pedir si cambian las paradas o sus coordenadas (p. ej. al verificar un punto).
 * Así la app no depende de ese servicio en cada visita y puede llevar el trazado en la mochila.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** URL del enrutador a pie. Se puede cambiar con el filtro `pio_url_enrutador_pie`. */
function pio_url_enrutador_pie(): string {
	return (string) apply_filters( 'pio_url_enrutador_pie', 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/' );
}

/**
 * Coordenadas [lng, lat] de las paradas publicadas y con ubicación, en orden.
 *
 * @return array<int, array{0: float, 1: float}>
 */
function pio_coordenadas_paradas( int $ruta_id ): array {
	$coords = array();
	foreach ( array_map( 'intval', (array) get_post_meta( $ruta_id, 'paradas', true ) ) as $id ) {
		$p = get_post( $id );
		if ( ! $p || 'publish' !== $p->post_status || ! pio_es_punto( $p ) ) {
			continue;
		}
		$r = pio_resumen_punto( $p );
		if ( is_numeric( $r['lat'] ?? null ) && is_numeric( $r['lng'] ?? null ) ) {
			$coords[] = array( round( (float) $r['lng'], 7 ), round( (float) $r['lat'], 7 ) );
		}
	}
	return $coords;
}

/** Huella de las paradas: si cambia, el trazado guardado ya no vale. */
function pio_firma_paradas( array $coords ): string {
	return md5( wp_json_encode( $coords ) );
}

/**
 * Pide el recorrido a pie al enrutador.
 *
 * @return array|null { coords, distancia (m), duracion (s), tramos (m por tramo) } o null si falla.
 */
function pio_pedir_trazado_pie( array $coords ): ?array {
	if ( count( $coords ) < 2 ) {
		return null;
	}
	$puntos = implode( ';', array_map( fn( $c ) => $c[0] . ',' . $c[1], $coords ) );
	$url    = pio_url_enrutador_pie() . $puntos . '?overview=full&geometries=geojson&steps=false';
	$resp   = wp_remote_get(
		$url,
		array(
			'timeout'    => 12,
			'user-agent' => 'Pio/' . PIO_VERSION . ' (turismocazorla.info)',
		)
	);
	if ( is_wp_error( $resp ) || 200 !== wp_remote_retrieve_response_code( $resp ) ) {
		return null;
	}
	$datos = json_decode( wp_remote_retrieve_body( $resp ), true );
	$ruta  = $datos['routes'][0] ?? null;
	if ( 'Ok' !== ( $datos['code'] ?? '' ) || ! $ruta || empty( $ruta['geometry']['coordinates'] ) ) {
		return null;
	}
	return array(
		'coords'    => array_map( fn( $c ) => array( round( (float) $c[0], 6 ), round( (float) $c[1], 6 ) ), $ruta['geometry']['coordinates'] ),
		'distancia' => (int) round( (float) $ruta['distance'] ),
		'duracion'  => (int) round( (float) $ruta['duration'] ),
		'tramos'    => array_map( fn( $l ) => (int) round( (float) $l['distance'] ), $ruta['legs'] ?? array() ),
	);
}

/**
 * Trazado a pie de una ruta: el guardado si sigue valiendo; si no, se calcula (si se permite).
 *
 * @param bool $calcular Falso en los listados, para no pedir varios trazados en una sola petición.
 * @return array|null
 */
function pio_trazado_ruta( int $ruta_id, bool $calcular = true ): ?array {
	$coords   = pio_coordenadas_paradas( $ruta_id );
	$firma    = pio_firma_paradas( $coords );
	$guardado = get_post_meta( $ruta_id, '_pio_trazado', true );
	if ( is_array( $guardado ) && ( $guardado['firma'] ?? '' ) === $firma ) {
		return $guardado;
	}
	if ( ! $calcular || count( $coords ) < 2 ) {
		return null;
	}
	// Si el enrutador falló hace poco, no se vuelve a intentar en 10 minutos.
	$bloqueo = 'pio_trazado_fallo_' . $ruta_id . '_' . $firma;
	if ( get_transient( $bloqueo ) ) {
		return null;
	}
	$nuevo = pio_pedir_trazado_pie( $coords );
	if ( ! $nuevo ) {
		set_transient( $bloqueo, 1, 10 * MINUTE_IN_SECONDS );
		return null;
	}
	$nuevo['firma'] = $firma;
	$nuevo['fecha'] = time();
	update_post_meta( $ruta_id, '_pio_trazado', $nuevo );
	return $nuevo;
}

/** Al guardar una ruta desde el escritorio o la API de WP, se recalcula su trazado. */
function pio_trazado_al_guardar( int $post_id ): void {
	if ( wp_is_post_revision( $post_id ) || 'publish' !== get_post_status( $post_id ) ) {
		return;
	}
	pio_trazado_ruta( $post_id );
}
add_action( 'save_post_pio_ruta', 'pio_trazado_al_guardar', 20 );
add_action( 'rest_after_insert_pio_ruta', fn( $post ) => pio_trazado_al_guardar( $post->ID ), 20 );
