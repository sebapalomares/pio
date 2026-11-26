<?php
/**
 * De dónde salen los puntos de Pío (D19).
 *
 * - En turismocazorla.info, los puntos son los que ya tiene la web: el tipo de Toolset
 *   `puntos-de-interes`, con la ubicación en el campo de Toolset Maps `ubicacion`
 *   (meta `wpcf-ubicacion`: «{lat,lng}» o una dirección en texto) y las categorías del blog.
 * - En una web sin ese tipo, Pío usa su propio tipo `pio_punto` con metas `lat`/`lng`.
 *
 * Todo el plugin pregunta aquí por el tipo, la taxonomía y las coordenadas: nunca a mano.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Tipo de contenido de la web que ya tiene los puntos (filtrable con `pio_tipo_externo`). */
function pio_tipo_externo(): string {
	return (string) apply_filters( 'pio_tipo_externo', 'puntos-de-interes' );
}

/**
 * Tipo de contenido de los puntos. Se decide después de `init` (Toolset registra sus tipos ahí).
 * Antes de `init`, devuelve el externo si ya existe, o pio_punto.
 */
function pio_tipo_punto(): string {
	return post_type_exists( pio_tipo_externo() ) ? pio_tipo_externo() : 'pio_punto';
}

function pio_usa_tipo_externo(): bool {
	return 'pio_punto' !== pio_tipo_punto();
}

/** Taxonomía de categorías de los puntos. */
function pio_taxonomia_categoria(): string {
	if ( pio_usa_tipo_externo() ) {
		return (string) apply_filters( 'pio_taxonomia_externa', 'category' );
	}
	return 'pio_categoria';
}

/** Meta del campo de ubicación de Toolset Maps. */
function pio_meta_ubicacion(): string {
	return (string) apply_filters( 'pio_meta_ubicacion', 'wpcf-ubicacion' );
}

/** Metas que guardan las coordenadas (para vigilar sus cambios). */
function pio_claves_coords(): array {
	return pio_usa_tipo_externo() ? array( pio_meta_ubicacion() ) : array( 'lat', 'lng' );
}

function pio_es_punto( $post ): bool {
	return pio_tipo_punto() === get_post_type( $post );
}

/** Decimales con los que se guardan las coordenadas (7 ≈ 1 cm). */
const PIO_DECIMALES_COORD = 7;

function pio_redondear_coord( $valor ): ?float {
	if ( '' === $valor || null === $valor || ! is_numeric( $valor ) ) {
		return null;
	}
	return round( (float) $valor, PIO_DECIMALES_COORD );
}

/** «{37.9,-3.0}» → array lat/lng, o null si no tiene ese formato. */
function pio_leer_latlng_toolset( string $valor ): ?array {
	if ( preg_match( '/^\s*\{\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\}\s*$/', $valor, $m ) ) {
		return array( 'lat' => round( (float) $m[1], PIO_DECIMALES_COORD ), 'lng' => round( (float) $m[2], PIO_DECIMALES_COORD ) );
	}
	return null;
}

/**
 * Coordenadas de una dirección en texto, usando la caché de Toolset Maps (la misma que usa
 * la web para pintar sus mapas). Devuelve null si Toolset Maps no está o no la conoce.
 */
function pio_coords_de_direccion( string $direccion ): ?array {
	static $cache = array();
	$direccion = trim( $direccion );
	if ( '' === $direccion ) {
		return null;
	}
	if ( array_key_exists( $direccion, $cache ) ) {
		return $cache[ $direccion ];
	}
	$cache[ $direccion ] = null;
	if ( class_exists( 'Toolset_Addon_Maps_Common' ) && method_exists( 'Toolset_Addon_Maps_Common', 'get_coordinates' ) ) {
		try {
			$c = Toolset_Addon_Maps_Common::get_coordinates( $direccion );
			if ( is_array( $c ) && isset( $c['lat'] ) && ( isset( $c['lon'] ) || isset( $c['lng'] ) ) ) {
				$cache[ $direccion ] = array(
					'lat' => round( (float) $c['lat'], PIO_DECIMALES_COORD ),
					'lng' => round( (float) ( $c['lon'] ?? $c['lng'] ), PIO_DECIMALES_COORD ),
				);
			}
		} catch ( Throwable $e ) {
			$cache[ $direccion ] = null;
		}
	}
	return $cache[ $direccion ];
}

/** Coordenadas actuales del punto, o null si no tiene (o no se pueden saber). */
function pio_coords_punto( int $id ): ?array {
	if ( pio_usa_tipo_externo() ) {
		$valor = (string) get_post_meta( $id, pio_meta_ubicacion(), true );
		return pio_leer_latlng_toolset( $valor ) ?? pio_coords_de_direccion( $valor );
	}
	$lat = pio_redondear_coord( get_post_meta( $id, 'lat', true ) );
	$lng = pio_redondear_coord( get_post_meta( $id, 'lng', true ) );
	if ( null === $lat || null === $lng ) {
		return null;
	}
	return array( 'lat' => $lat, 'lng' => $lng );
}

/** ¿La ubicación guardada es una dirección en texto (aún sin coordenadas exactas)? */
function pio_ubicacion_es_direccion( int $id ): bool {
	if ( ! pio_usa_tipo_externo() ) {
		return false;
	}
	$valor = trim( (string) get_post_meta( $id, pio_meta_ubicacion(), true ) );
	return '' !== $valor && null === pio_leer_latlng_toolset( $valor );
}

/** Guarda las coordenadas donde corresponda. En Toolset, con el formato «{lat,lng}» del campo. */
function pio_guardar_coords( int $id, float $lat, float $lng ): void {
	$lat = round( $lat, PIO_DECIMALES_COORD );
	$lng = round( $lng, PIO_DECIMALES_COORD );
	if ( pio_usa_tipo_externo() ) {
		update_post_meta( $id, pio_meta_ubicacion(), '{' . $lat . ',' . $lng . '}' );
		return;
	}
	update_post_meta( $id, 'lat', $lat );
	update_post_meta( $id, 'lng', $lng );
}

/** Lista de valores de un campo de Toolset (los repetibles se guardan en varias filas). */
function pio_valores_toolset( int $id, string $campo ): array {
	return array_values( array_filter( array_map( 'strval', (array) get_post_meta( $id, 'wpcf-' . $campo, false ) ) ) );
}

/**
 * Campos de la ficha para la API. En Toolset se leen los campos que ya tiene la web;
 * los que no existen allí (precio, reserva, audio…) salen vacíos.
 */
function pio_campo_punto( int $id, string $campo ) {
	if ( ! pio_usa_tipo_externo() ) {
		return get_post_meta( $id, $campo, true ) ?: null;
	}
	switch ( $campo ) {
		case 'telefono':
			return pio_valores_toolset( $id, 'telefono' )[0] ?? null;
		case 'web':
			return pio_valores_toolset( $id, 'pagina-web' )[0] ?? null;
		case 'direccion':
			return pio_valores_toolset( $id, 'detalles-direccion' )[0] ?? null;
		default:
			return get_post_meta( $id, $campo, true ) ?: null;
	}
}

/** URLs de la galería. */
function pio_galeria_punto( int $id ): array {
	if ( pio_usa_tipo_externo() ) {
		return pio_valores_toolset( $id, 'imagenes' );
	}
	$ids = array_filter( array_map( 'intval', (array) get_post_meta( $id, 'galeria', true ) ) );
	return array_values( array_filter( array_map( fn( $a ) => wp_get_attachment_image_url( $a, 'large' ), $ids ) ) );
}

/** ¿Puede este usuario verificar este punto? Administradores: todos; gestores: los suyos. */
function pio_puede_verificar_punto( int $id ): bool {
	if ( ! current_user_can( PIO_CAP_VERIFICAR ) || ! pio_es_punto( $id ) ) {
		return false;
	}
	if ( current_user_can( 'edit_post', $id ) ) {
		return true;
	}
	// En el tipo de Toolset los permisos los lleva Toolset Access: el gestor verifica lo que es suyo.
	return (int) get_post_field( 'post_author', $id ) === get_current_user_id();
}

/** ¿Ve este usuario todos los puntos o solo los suyos? */
function pio_ve_todos_los_puntos(): bool {
	$tipo = get_post_type_object( pio_tipo_punto() );
	return current_user_can( 'manage_options' ) || ( $tipo && current_user_can( $tipo->cap->edit_others_posts ) );
}

/** Cada punto lleva un código QR aleatorio (meta `qr_codigo`), también los que ya existían. */
function pio_asignar_qr_si_falta( int $id ): void {
	if ( ! get_post_meta( $id, 'qr_codigo', true ) ) {
		update_post_meta( $id, 'qr_codigo', wp_generate_password( 12, false, false ) );
	}
}
