<?php
/**
 * Sincronización con el planificador de viaje de turismocazorla.info (D27).
 *
 * El planificador (/planifica-tu-viaje/) arma un viaje por días con contenidos de la web
 * (puntos de interés, senderos, alojamientos, empresas…). Pío lo abre como «Tu viaje»:
 * cada día se ve en el mapa con el camino a pie y sus paradas suman sellos.
 *
 * Contrato, sin guardar nada en el servidor (el viaje viaja en el enlace):
 *   https://pio.turismocazorla.info/viaje?d=12,45,78~33,91&t=Fin%20de%20semana
 *   - `d`: días separados por «~»; en cada día, IDs de WordPress separados por comas, en orden.
 *   - `t`: título opcional.
 * La app resuelve los IDs con GET /wp-json/pio/v1/viaje?ids=12,45,78,33,91
 *
 * Está APAGADO por defecto: Ajustes → Pío → «Sincronizar con el planificador».
 * Apagado, /viaje responde 404 y pio_url_viaje() devuelve '' (el planificador no enseña el botón).
 *
 * Para el planificador:
 *   PHP: $url = apply_filters( 'pio_enlace_viaje', '', $dias, $titulo ); // $dias = [[12,45],[33]]
 *   JS (solo en sus páginas): if ( window.pioViaje ) { a.href = window.pioViaje.url( dias, titulo ); }
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const PIO_OPCION_PLANIFICADOR = 'pio_planificador_activo';
const PIO_OPCION_URL_APP      = 'pio_url_app';
const PIO_PAGINA_AJUSTES      = 'pio-ajustes';
/** Máximo de lugares en un viaje (evita peticiones enormes). */
const PIO_VIAJE_MAX_IDS = 80;

function pio_planificador_activo(): bool {
	return (bool) get_option( PIO_OPCION_PLANIFICADOR, false );
}

function pio_url_app(): string {
	$url = (string) get_option( PIO_OPCION_URL_APP, '' );
	return untrailingslashit( '' !== $url ? $url : 'https://pio.turismocazorla.info' );
}

/**
 * Normaliza los días: lista de listas de IDs enteros positivos, sin días vacíos.
 *
 * @param mixed $dias [[12,45],[33]] o «12,45~33».
 */
function pio_normalizar_dias( $dias ): array {
	if ( is_string( $dias ) ) {
		$dias = array_map( fn( $d ) => explode( ',', $d ), explode( '~', $dias ) );
	}
	$limpios = array();
	$total   = 0;
	foreach ( (array) $dias as $dia ) {
		$ids = array();
		foreach ( (array) $dia as $id ) {
			$id = absint( $id );
			if ( $id && $total < PIO_VIAJE_MAX_IDS ) {
				$ids[] = $id;
				++$total;
			}
		}
		if ( $ids ) {
			$limpios[] = $ids;
		}
	}
	return $limpios;
}

/** Enlace que abre el viaje en Pío, o '' si la sincronización está apagada o no hay lugares. */
function pio_url_viaje( $dias, string $titulo = '' ): string {
	$dias = pio_normalizar_dias( $dias );
	if ( ! pio_planificador_activo() || ! $dias ) {
		return '';
	}
	$d   = implode( '~', array_map( fn( $ids ) => implode( ',', $ids ), $dias ) );
	$url = pio_url_app() . '/viaje?d=' . $d;
	$titulo = trim( wp_strip_all_tags( $titulo ) );
	if ( '' !== $titulo ) {
		$url .= '&t=' . rawurlencode( mb_substr( $titulo, 0, 80 ) );
	}
	return $url;
}

add_filter(
	'pio_enlace_viaje',
	function ( $url, $dias = array(), $titulo = '' ) {
		return pio_url_viaje( $dias, (string) $titulo ) ?: $url;
	},
	10,
	3
);

/** Coordenadas de cualquier contenido: las de Pío si es un punto; si no, su campo de Toolset Maps. */
function pio_coords_contenido( WP_Post $p ): ?array {
	if ( pio_es_punto( $p ) ) {
		return pio_coords_punto( $p->ID );
	}
	foreach ( (array) apply_filters( 'pio_viaje_metas_ubicacion', array( pio_meta_ubicacion() ), $p ) as $meta ) {
		$valor = trim( (string) get_post_meta( $p->ID, (string) $meta, true ) );
		if ( '' === $valor ) {
			continue;
		}
		$c = pio_leer_latlng_toolset( $valor ) ?? pio_coords_de_direccion( $valor );
		if ( $c ) {
			return $c;
		}
	}
	return null;
}

/** Un lugar del viaje: lo mínimo para la lista y el mapa. */
function pio_lugar_viaje( WP_Post $p ): array {
	$es_punto = pio_es_punto( $p );
	$tipo     = get_post_type_object( $p->post_type );
	$coords   = pio_coords_contenido( $p );
	return array(
		'id'         => $p->ID,
		'nombre'     => html_entity_decode( get_the_title( $p ), ENT_QUOTES, 'UTF-8' ),
		'tipo'       => $p->post_type,
		'tipo_nombre' => $tipo ? html_entity_decode( $tipo->labels->singular_name, ENT_QUOTES, 'UTF-8' ) : null,
		// true: la app abre su ficha de Pío y puede sellarlo; false: se enlaza a la web
		'es_punto'   => $es_punto,
		'lat'        => $coords['lat'] ?? null,
		'lng'        => $coords['lng'] ?? null,
		'foto'       => get_the_post_thumbnail_url( $p, 'medium' ) ?: null,
		'verificado' => $es_punto && pio_esta_verificado( $p->ID ),
		'enlace'     => get_permalink( $p ),
	);
}

/** ¿Se puede enseñar este contenido en un viaje? Publicado, de un tipo público y sin contraseña. */
function pio_lugar_viaje_visible( $p ): bool {
	if ( ! $p instanceof WP_Post || 'publish' !== $p->post_status || post_password_required( $p ) ) {
		return false;
	}
	$tipo = get_post_type_object( $p->post_type );
	$ok   = $tipo && $tipo->public && ! in_array( $p->post_type, array( 'attachment', 'page', 'nav_menu_item', 'wp_block' ), true );
	return (bool) apply_filters( 'pio_lugar_viaje_visible', $ok, $p );
}

add_action(
	'rest_api_init',
	function () {
		register_rest_route(
			PIO_NS,
			'/viaje',
			array(
				'methods'             => 'GET',
				'callback'            => 'pio_api_viaje',
				'permission_callback' => '__return_true',
				'args'                => array(
					'ids' => array( 'type' => 'string', 'required' => true ),
				),
			)
		);
	}
);

/** GET /viaje?ids=12,45,78 → lugares en el mismo orden; los que no existen o no son públicos, en `faltan`. */
function pio_api_viaje( WP_REST_Request $req ) {
	if ( ! pio_planificador_activo() ) {
		return new WP_Error( 'pio_planificador_inactivo', 'La sincronización con el planificador está desactivada', array( 'status' => 404 ) );
	}
	$ids = array_values( array_unique( array_merge( array(), ...pio_normalizar_dias( (string) $req['ids'] ) ) ) );
	if ( ! $ids ) {
		return new WP_Error( 'pio_viaje_vacio', 'Sin lugares', array( 'status' => 400 ) );
	}
	_prime_post_caches( $ids, false, true );
	$lugares = array();
	$faltan  = array();
	foreach ( $ids as $id ) {
		$p = get_post( $id );
		if ( pio_lugar_viaje_visible( $p ) ) {
			$lugares[] = pio_lugar_viaje( $p );
		} else {
			$faltan[] = $id;
		}
	}
	return rest_ensure_response( array( 'lugares' => $lugares, 'faltan' => $faltan ) );
}

/**
 * En las páginas del planificador, si está activo: window.pioViaje.url( dias, titulo ).
 * Así el JavaScript del planificador puede poner «Abrir en Pío» sin saber cómo se arma el enlace.
 */
add_action(
	'wp_enqueue_scripts',
	function () {
		$paginas = (array) apply_filters( 'pio_paginas_planificador', array( 'planifica-tu-viaje' ) );
		if ( ! pio_planificador_activo() || ! is_page( $paginas ) ) {
			return;
		}
		wp_register_script( 'pio-viaje', '', array(), PIO_VERSION, true );
		wp_enqueue_script( 'pio-viaje' );
		$app = wp_json_encode( pio_url_app() . '/viaje' );
		$max = PIO_VIAJE_MAX_IDS;
		wp_add_inline_script(
			'pio-viaje',
			<<<JS
window.pioViaje = {
	activo: true,
	url: function (dias, titulo) {
		var n = 0, d = (dias || []).map(function (dia) {
			return (dia || []).map(function (id) { return parseInt(id, 10); })
				.filter(function (id) { return id > 0 && n++ < {$max}; }).join(',');
		}).filter(Boolean).join('~');
		if (!d) return '';
		return {$app} + '?d=' + d + (titulo ? '&t=' + encodeURIComponent(String(titulo).slice(0, 80)) : '');
	}
};
document.dispatchEvent(new Event('pio-viaje-listo'));
JS
		);
	}
);

// ---------- Ajustes → Pío ----------

add_action(
	'admin_init',
	function () {
		register_setting( 'pio_ajustes', PIO_OPCION_PLANIFICADOR, array( 'type' => 'boolean', 'sanitize_callback' => 'rest_sanitize_boolean', 'default' => false ) );
		register_setting( 'pio_ajustes', PIO_OPCION_URL_APP, array( 'type' => 'string', 'sanitize_callback' => 'esc_url_raw', 'default' => '' ) );
	}
);

add_action(
	'admin_menu',
	function () {
		add_options_page( __( 'Pío', 'pio' ), __( 'Pío', 'pio' ), 'manage_options', PIO_PAGINA_AJUSTES, 'pio_pintar_ajustes' );
	}
);

function pio_pintar_ajustes(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$prueba = isset( $_GET['pio_prueba'] ) ? sanitize_text_field( wp_unslash( $_GET['pio_prueba'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Pío', 'pio' ); ?></h1>
		<form method="post" action="options.php">
			<?php settings_fields( 'pio_ajustes' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Planificador de viaje', 'pio' ); ?></th>
					<td>
						<label>
							<input type="checkbox" name="<?php echo esc_attr( PIO_OPCION_PLANIFICADOR ); ?>" value="1" <?php checked( pio_planificador_activo() ); ?> />
							<?php esc_html_e( 'Sincronizar con el planificador: los viajes se pueden abrir en Pío', 'pio' ); ?>
						</label>
						<p class="description"><?php esc_html_e( 'Apagado, la API no responde a /viaje y el planificador no enseña «Abrir en Pío».', 'pio' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="pio-url-app"><?php esc_html_e( 'Dirección de la app', 'pio' ); ?></label></th>
					<td>
						<input id="pio-url-app" class="regular-text" type="url" name="<?php echo esc_attr( PIO_OPCION_URL_APP ); ?>" value="<?php echo esc_attr( (string) get_option( PIO_OPCION_URL_APP, '' ) ); ?>" placeholder="https://pio.turismocazorla.info" />
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>

		<h2><?php esc_html_e( 'Probar un viaje', 'pio' ); ?></h2>
		<p><?php esc_html_e( 'IDs de WordPress separados por comas; los días, separados por «~». Ejemplo: 12,45,78~33,91', 'pio' ); ?></p>
		<form method="get">
			<input type="hidden" name="page" value="<?php echo esc_attr( PIO_PAGINA_AJUSTES ); ?>" />
			<input class="regular-text" name="pio_prueba" value="<?php echo esc_attr( $prueba ); ?>" />
			<?php submit_button( __( 'Crear enlace', 'pio' ), 'secondary', '', false ); ?>
		</form>
		<?php
		if ( '' !== $prueba ) {
			$url = pio_url_viaje( $prueba, __( 'Viaje de prueba', 'pio' ) );
			if ( '' === $url ) {
				echo '<p>' . esc_html__( 'Activa la sincronización (y guarda) para crear el enlace.', 'pio' ) . '</p>';
			} else {
				printf( '<p><a href="%1$s" target="_blank" rel="noopener">%1$s</a></p>', esc_url( $url ) );
			}
		}
		?>
	</div>
	<?php
}
