<?php
/**
 * Pantalla «Verificar en el mapa» del escritorio (Puntos de interés → Verificar en el mapa).
 * Mapa a pantalla completa con Leaflet + OpenStreetMap, pensado también para el móvil.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const PIO_PAGINA_VERIFICAR = 'pio-verificar';

function pio_url_verificar(): string {
	return admin_url( 'edit.php?post_type=' . pio_tipo_punto() . '&page=' . PIO_PAGINA_VERIFICAR );
}

add_action(
	'admin_menu',
	function () {
		$hook = add_submenu_page(
			'edit.php?post_type=' . pio_tipo_punto(),
			__( 'Verificar puntos en el mapa', 'pio' ),
			__( 'Verificar en el mapa', 'pio' ),
			PIO_CAP_VERIFICAR,
			PIO_PAGINA_VERIFICAR,
			'pio_pintar_pagina_verificar',
			1
		);
		add_action(
			'admin_enqueue_scripts',
			function ( string $actual ) use ( $hook ) {
				if ( $actual === $hook ) {
					pio_cargar_recursos_verificar();
				}
			}
		);
		add_filter(
			'admin_body_class',
			function ( string $clases ) use ( $hook ): string {
				$pantalla = get_current_screen();
				return $pantalla && $pantalla->id === $hook ? $clases . ' pio-pagina-verificar' : $clases;
			}
		);
	}
);

/** Acceso directo en la barra superior: útil en el móvil, paseando por Cazorla. */
add_action(
	'admin_bar_menu',
	function ( WP_Admin_Bar $barra ) {
		if ( ! is_user_logged_in() || ! current_user_can( PIO_CAP_VERIFICAR ) ) {
			return;
		}
		$barra->add_node(
			array(
				'id'    => 'pio-verificar',
				'title' => '<span class="ab-icon dashicons dashicons-location" aria-hidden="true"></span><span class="ab-label">' . esc_html__( 'Verificar puntos', 'pio' ) . '</span>',
				'href'  => pio_url_verificar(),
			)
		);
	},
	80
);

function pio_cargar_recursos_verificar(): void {
	$base = plugin_dir_url( PIO_DIR . 'pio.php' ) . 'assets/';

	wp_enqueue_style( 'pio-leaflet', $base . 'vendor/leaflet/leaflet.css', array(), '1.9.4' );
	wp_enqueue_script( 'pio-leaflet', $base . 'vendor/leaflet/leaflet.js', array(), '1.9.4', true );
	wp_enqueue_style( 'pio-verificar', $base . 'verificar.css', array( 'pio-leaflet' ), PIO_VERSION );
	wp_enqueue_script( 'pio-verificar', $base . 'verificar.js', array( 'pio-leaflet' ), PIO_VERSION, true );

	wp_localize_script(
		'pio-verificar',
		'pioVerificar',
		array(
			'api'          => esc_url_raw( rest_url( PIO_NS . '/verificacion/puntos' ) ),
			'nonce'        => wp_create_nonce( 'wp_rest' ),
			'importarUrl'  => current_user_can( 'manage_options' ) && ! pio_usa_tipo_externo() ? pio_url_importador() : '',
			'nuevoUrl'     => admin_url( 'post-new.php?post_type=' . pio_tipo_punto() ),
			'centro'       => array( 37.9105, -3.0015 ), // Casco de Cazorla, por si aún no hay puntos.
			'textos'       => pio_textos_verificar(),
		)
	);
}

/** Todos los textos dinámicos de la pantalla (D11: nada escrito a mano en el JS). */
function pio_textos_verificar(): array {
	return array(
		/* translators: 1: puntos verificados, 2: puntos en total */
		'contador'          => __( '%1$s de %2$s verificados', 'pio' ),
		'cargando'          => __( 'Cargando puntos…', 'pio' ),
		'errorCarga'        => __( 'No se han podido cargar los puntos. Revisa la conexión y vuelve a intentarlo.', 'pio' ),
		'reintentar'        => __( 'Reintentar', 'pio' ),
		'sinPuntos'         => __( 'Todavía no hay puntos de interés.', 'pio' ),
		'importarDemo'      => __( 'Importar los puntos de demostración (como borradores)', 'pio' ),
		'crearPunto'        => __( 'Añadir un punto', 'pio' ),
		'todoVerificado'    => __( '¡Todo verificado! No queda ningún punto sin verificar con este filtro.', 'pio' ),
		'verificado'        => __( 'Verificado', 'pio' ),
		'sinVerificar'      => __( 'Sin verificar', 'pio' ),
		'sinCategoria'      => __( 'Sin categoría', 'pio' ),
		/* translators: 1: nombre de quien verificó, 2: fecha */
		'verificadoPor'     => __( 'Verificado por %1$s el %2$s', 'pio' ),
		'metodoMapa'        => __( 'en el mapa', 'pio' ),
		'metodoGps'         => __( 'con GPS desde el sitio', 'pio' ),
		'metodoTerreno'     => __( 'sobre el terreno', 'pio' ),
		/* translators: %s: precisión en metros */
		'conPrecision'      => __( '(±%s m)', 'pio' ),
		/* translators: 1: fecha de la verificación anterior, 2: nombre */
		'invalidada'        => __( 'Las coordenadas cambiaron después de la verificación del %1$s (%2$s).', 'pio' ),
		'pistaArrastrar'    => __( 'Arrastra el pin hasta el sitio exacto y pulsa «Guardar y verificar». Si ya está bien, púlsalo sin moverlo.', 'pio' ),
		'pistaSinCoords'    => __( 'Este punto no tenía coordenadas: lo hemos puesto en el centro del mapa. Arrástralo a su sitio.', 'pio' ),
		'pistaDireccion'    => __( 'La ubicación de este punto es una dirección en texto: el pin está donde la sitúa el mapa de la web, que puede no ser exacto. Al verificarlo se guardan sus coordenadas.', 'pio' ),
		/* translators: %s: metros */
		'movido'            => __( 'Has movido el pin %s m.', 'pio' ),
		'deshacer'          => __( 'Deshacer', 'pio' ),
		'guardar'           => __( 'Guardar y verificar', 'pio' ),
		'guardando'         => __( 'Guardando…', 'pio' ),
		'guardado'          => __( 'Ubicación guardada y verificada.', 'pio' ),
		'errorGuardar'      => __( 'No se ha podido guardar. Inténtalo de nuevo.', 'pio' ),
		'estoyAqui'         => __( 'Estoy aquí: usar mi posición', 'pio' ),
		'dejarGps'          => __( 'Dejar de usar mi posición', 'pio' ),
		'buscandoGps'       => __( 'Buscando tu posición…', 'pio' ),
		/* translators: %s: metros */
		'precisionGps'      => __( 'Tu posición: precisión ±%s m', 'pio' ),
		'precisionBuena'    => __( 'buena', 'pio' ),
		'precisionRegular'  => __( 'regular: espera unos segundos', 'pio' ),
		'precisionMala'     => __( 'mala: muévete a un sitio despejado o espera', 'pio' ),
		/* translators: %s: metros */
		'guardarGps'        => __( 'Guardar y verificar (±%s m)', 'pio' ),
		'errorGpsPermiso'   => __( 'No hay permiso para usar tu ubicación. Actívalo en los ajustes del navegador para este sitio.', 'pio' ),
		'errorGpsHttps'     => __( 'El navegador solo permite usar tu ubicación si la web va por HTTPS.', 'pio' ),
		'errorGps'          => __( 'No se ha podido obtener tu posición.', 'pio' ),
		'editarFicha'       => __( 'Editar ficha', 'pio' ),
		'cerrar'            => __( 'Cerrar', 'pio' ),
		'miPosicion'        => __( 'Mostrar mi posición', 'pio' ),
		/* translators: %s: número de puntos */
		'sinCoordenadas'    => __( '%s sin coordenadas', 'pio' ),
		'elegirSinCoords'   => __( 'Elige un punto para colocarlo en el mapa', 'pio' ),
		'cambiosSinGuardar' => __( 'Has movido un pin y no lo has guardado.', 'pio' ),
		'borrador'          => __( 'Borrador', 'pio' ),
		'pendiente'         => __( 'Pendiente de revisión', 'pio' ),
		'capaCalles'        => __( 'Calles', 'pio' ),
		'capaSatelite'      => __( 'Satélite (PNOA)', 'pio' ),
		'capaSateliteEsri'  => __( 'Satélite (Esri)', 'pio' ),
		'capaRelieve'       => __( 'Relieve', 'pio' ),
	);
}

function pio_pintar_pagina_verificar(): void {
	if ( ! current_user_can( PIO_CAP_VERIFICAR ) ) {
		wp_die( esc_html__( 'No tienes permiso para verificar puntos.', 'pio' ) );
	}
	$marca = plugin_dir_url( PIO_DIR . 'pio.php' ) . 'assets/marca/';
	?>
	<div id="pio-verificar" class="pio-v" data-tema="claro">
		<h1 class="screen-reader-text"><?php esc_html_e( 'Verificar puntos en el mapa', 'pio' ); ?></h1>

		<div id="pio-v-mapa" class="pio-v-mapa" role="application" aria-label="<?php esc_attr_e( 'Mapa de puntos de interés', 'pio' ); ?>"></div>

		<div class="pio-v-barra">
			<div class="pio-v-fila">
				<a class="pio-v-pastilla pio-v-logo" href="<?php echo esc_url( admin_url( 'edit.php?post_type=' . pio_tipo_punto() ) ); ?>" title="<?php esc_attr_e( 'Volver a los puntos de interés', 'pio' ); ?>">
					<img class="pio-v-logo-claro" src="<?php echo esc_url( $marca . 'pio-logotipo-azul.svg' ); ?>" alt="pio" width="38" height="27">
					<img class="pio-v-logo-oscuro" src="<?php echo esc_url( $marca . 'pio-logotipo-azul-claro.svg' ); ?>" alt="" width="38" height="27">
					<span class="pio-v-logo-texto"><?php esc_html_e( 'Verificar', 'pio' ); ?></span>
				</a>
				<div class="pio-v-pastilla pio-v-contador" aria-live="polite">
					<span id="pio-v-contador-texto"></span>
					<span class="pio-v-progreso" aria-hidden="true"><span id="pio-v-progreso-barra"></span></span>
				</div>
			</div>
			<div class="pio-v-fila">
				<div class="pio-v-pastilla pio-v-segmentado" role="group" aria-label="<?php esc_attr_e( 'Qué puntos mostrar', 'pio' ); ?>">
					<button type="button" data-filtro="pendientes" aria-pressed="true"><?php esc_html_e( 'Sin verificar', 'pio' ); ?></button>
					<button type="button" data-filtro="todos" aria-pressed="false"><?php esc_html_e( 'Todos', 'pio' ); ?></button>
				</div>
				<label class="pio-v-pastilla pio-v-select">
					<span class="screen-reader-text"><?php esc_html_e( 'Categoría', 'pio' ); ?></span>
					<select id="pio-v-categoria">
						<option value=""><?php esc_html_e( 'Categoría: todas', 'pio' ); ?></option>
					</select>
				</label>
				<button type="button" id="pio-v-sin-coords" class="pio-v-pastilla pio-v-boton-aviso" hidden></button>
			</div>
		</div>

		<div class="pio-v-flotantes">
			<button type="button" id="pio-v-capas" class="pio-v-redondo" aria-haspopup="true" aria-expanded="false" title="<?php esc_attr_e( 'Tipo de mapa', 'pio' ); ?>">
				<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3 2 8l10 5 10-5-10-5Zm-7.6 8.2L2 12.4l10 5 10-5-2.4-1.2L12 15l-7.6-3.8Zm0 4.4L2 16.8l10 5 10-5-2.4-1.2L12 19.4l-7.6-3.8Z" fill="currentColor"/></svg>
				<span class="screen-reader-text"><?php esc_html_e( 'Tipo de mapa', 'pio' ); ?></span>
			</button>
			<div id="pio-v-menu-capas" class="pio-v-menu" role="menu" hidden></div>
			<button type="button" id="pio-v-localizar" class="pio-v-redondo" aria-pressed="false" title="<?php esc_attr_e( 'Mostrar mi posición', 'pio' ); ?>">
				<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 3h-2.07A7 7 0 0 0 13 5.07V3h-2v2.07A7 7 0 0 0 5.07 11H3v2h2.07A7 7 0 0 0 11 18.93V21h2v-2.07A7 7 0 0 0 18.93 13H21v-2Zm-9 6a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fill="currentColor"/></svg>
				<span class="screen-reader-text"><?php esc_html_e( 'Mostrar mi posición', 'pio' ); ?></span>
			</button>
			<div class="pio-v-zoom">
				<button type="button" id="pio-v-acercar" class="pio-v-redondo" aria-label="<?php esc_attr_e( 'Acercar', 'pio' ); ?>"><span aria-hidden="true">+</span></button>
				<button type="button" id="pio-v-alejar" class="pio-v-redondo" aria-label="<?php esc_attr_e( 'Alejar', 'pio' ); ?>"><span aria-hidden="true">−</span></button>
			</div>
		</div>

		<section id="pio-v-ficha" class="pio-v-ficha" hidden aria-labelledby="pio-v-ficha-nombre" tabindex="-1">
			<div class="pio-v-ficha-cabecera">
				<div>
					<p class="pio-v-ficha-categoria" id="pio-v-ficha-categoria"></p>
					<h2 class="pio-v-ficha-nombre" id="pio-v-ficha-nombre"></h2>
				</div>
				<button type="button" class="pio-v-cerrar" id="pio-v-cerrar" aria-label="<?php esc_attr_e( 'Cerrar', 'pio' ); ?>">
					<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6 6.4 5Z" fill="currentColor"/></svg>
				</button>
			</div>
			<p class="pio-v-estado" id="pio-v-ficha-estado"></p>
			<p class="pio-v-pista" id="pio-v-ficha-pista"></p>
			<p class="pio-v-movido" id="pio-v-ficha-movido" hidden></p>
			<p class="pio-v-gps" id="pio-v-ficha-gps" hidden aria-live="polite"></p>
			<div class="pio-v-acciones">
				<button type="button" class="pio-v-boton pio-v-boton-secundario" id="pio-v-estoy-aqui"></button>
				<button type="button" class="pio-v-boton pio-v-boton-principal" id="pio-v-guardar"></button>
			</div>
			<p class="pio-v-siguiente"><button type="button" class="pio-v-enlace" id="pio-v-siguiente" hidden><?php esc_html_e( 'Ir al siguiente sin verificar →', 'pio' ); ?></button></p>
			<p class="pio-v-pie"><span id="pio-v-ficha-coords"></span> · <a id="pio-v-ficha-editar" href="#"><?php esc_html_e( 'Editar ficha', 'pio' ); ?></a></p>
		</section>

		<section id="pio-v-lista" class="pio-v-ficha" hidden aria-labelledby="pio-v-lista-titulo" tabindex="-1">
			<div class="pio-v-ficha-cabecera">
				<h2 class="pio-v-ficha-nombre" id="pio-v-lista-titulo"></h2>
				<button type="button" class="pio-v-cerrar" id="pio-v-lista-cerrar" aria-label="<?php esc_attr_e( 'Cerrar', 'pio' ); ?>">
					<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6 6.4 5Z" fill="currentColor"/></svg>
				</button>
			</div>
			<ul class="pio-v-lista" id="pio-v-lista-items"></ul>
		</section>

		<div id="pio-v-aviso" class="pio-v-aviso" role="status" aria-live="polite" hidden></div>
	</div>
	<?php
}
