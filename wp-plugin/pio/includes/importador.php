<?php
/**
 * Importador de los puntos y rutas de demostración (datos/demo.json, generado desde
 * app/src/data/demo.ts con `npm run exportar-demo-wp`).
 *
 * - Solo administradores (Puntos de interés → Importar demostración).
 * - Todo se crea como BORRADOR: no se ve en la web ni en la API pública hasta publicarlo.
 * - Se puede ejecutar varias veces: lo que ya está importado (meta `_pio_demo_id`) no se duplica.
 * - Los puntos que en demo.ts están verificados se importan como verificados, con su autor y fecha.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const PIO_PAGINA_IMPORTADOR = 'pio-importar-demo';

function pio_url_importador(): string {
	return admin_url( 'edit.php?post_type=pio_punto&page=' . PIO_PAGINA_IMPORTADOR );
}

add_action(
	'admin_menu',
	function () {
		add_submenu_page(
			'edit.php?post_type=pio_punto',
			__( 'Importar puntos de demostración', 'pio' ),
			__( 'Importar demostración', 'pio' ),
			'manage_options',
			PIO_PAGINA_IMPORTADOR,
			'pio_pintar_importador'
		);
	}
);

function pio_datos_demo(): ?array {
	$archivo = PIO_DIR . 'datos/demo.json';
	if ( ! is_readable( $archivo ) ) {
		return null;
	}
	$datos = json_decode( (string) file_get_contents( $archivo ), true );
	return is_array( $datos ) && isset( $datos['puntos'] ) ? $datos : null;
}

/** ID del contenido ya importado con ese identificador de demo, o 0. */
function pio_buscar_demo( string $tipo, string $demo_id ): int {
	$ids = get_posts(
		array(
			'post_type'      => $tipo,
			'post_status'    => 'any',
			'posts_per_page' => 1,
			'fields'         => 'ids',
			'meta_key'       => '_pio_demo_id',
			'meta_value'     => $demo_id,
		)
	);
	return $ids ? (int) $ids[0] : 0;
}

/**
 * @return array{puntos_nuevos:int, puntos_existentes:int, rutas_nuevas:int, rutas_existentes:int, verificados:int, errores:string[]}
 */
function pio_importar_demo( array $datos ): array {
	$r      = array(
		'puntos_nuevos'     => 0,
		'puntos_existentes' => 0,
		'rutas_nuevas'      => 0,
		'rutas_existentes'  => 0,
		'verificados'       => 0,
		'errores'           => array(),
	);
	$mapa   = array(); // demo_id => ID de WordPress
	$campos = array( 'horario', 'precio', 'telefono', 'web', 'reserva_url', 'audio_url', 'qr_codigo' );

	foreach ( $datos['puntos'] as $p ) {
		$existente = pio_buscar_demo( 'pio_punto', $p['demo_id'] );
		if ( $existente ) {
			$mapa[ $p['demo_id'] ] = $existente;
			++$r['puntos_existentes'];
			continue;
		}

		$id = wp_insert_post(
			array(
				'post_type'    => 'pio_punto',
				'post_status'  => 'draft',
				'post_title'   => $p['nombre'],
				'post_content' => $p['descripcion'] ?? '',
				'post_author'  => get_current_user_id(),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			$r['errores'][] = $p['nombre'] . ': ' . $id->get_error_message();
			continue;
		}
		$mapa[ $p['demo_id'] ] = $id;
		++$r['puntos_nuevos'];
		update_post_meta( $id, '_pio_demo_id', $p['demo_id'] );

		if ( ! empty( $p['categoria']['slug'] ) ) {
			$termino = term_exists( $p['categoria']['slug'], 'pio_categoria' );
			if ( ! $termino ) {
				$termino = wp_insert_term( $p['categoria']['nombre'], 'pio_categoria', array( 'slug' => $p['categoria']['slug'] ) );
			}
			if ( ! is_wp_error( $termino ) ) {
				wp_set_object_terms( $id, (int) $termino['term_id'], 'pio_categoria' );
			}
		}

		foreach ( $campos as $campo ) {
			if ( isset( $p[ $campo ] ) && '' !== $p[ $campo ] ) {
				update_post_meta( $id, $campo, sanitize_text_field( $p[ $campo ] ) );
			}
		}

		if ( ! empty( $p['verificacion'] ) ) {
			pio_verificar_punto(
				$id,
				(float) $p['lat'],
				(float) $p['lng'],
				$p['verificacion']['metodo'] ?? 'terreno',
				null,
				array(
					'por_nombre' => $p['verificacion']['por'],
					'fecha'      => $p['verificacion']['fecha'],
				)
			);
			++$r['verificados'];
		} else {
			update_post_meta( $id, 'lat', pio_redondear_coord( $p['lat'] ) );
			update_post_meta( $id, 'lng', pio_redondear_coord( $p['lng'] ) );
		}
	}

	foreach ( $datos['rutas'] ?? array() as $ruta ) {
		if ( pio_buscar_demo( 'pio_ruta', $ruta['demo_id'] ) ) {
			++$r['rutas_existentes'];
			continue;
		}
		$id = wp_insert_post(
			array(
				'post_type'    => 'pio_ruta',
				'post_status'  => 'draft',
				'post_title'   => $ruta['nombre'],
				'post_excerpt' => $ruta['descripcion'] ?? '',
				'post_author'  => get_current_user_id(),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			$r['errores'][] = $ruta['nombre'] . ': ' . $id->get_error_message();
			continue;
		}
		++$r['rutas_nuevas'];
		update_post_meta( $id, '_pio_demo_id', $ruta['demo_id'] );
		$paradas = array_values( array_filter( array_map( fn( $d ) => $mapa[ $d ] ?? 0, $ruta['paradas'] ) ) );
		update_post_meta( $id, 'paradas', $paradas );
	}

	return $r;
}

function pio_pintar_importador(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'No tienes permiso para importar.', 'pio' ) );
	}
	$datos     = pio_datos_demo();
	$resultado = null;

	if ( isset( $_POST['pio_importar'] ) ) {
		check_admin_referer( 'pio_importar_demo' );
		if ( $datos ) {
			$resultado = pio_importar_demo( $datos );
		}
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Importar puntos de demostración', 'pio' ); ?></h1>

		<?php if ( $resultado ) : ?>
			<div class="notice notice-<?php echo $resultado['errores'] ? 'warning' : 'success'; ?>">
				<p>
					<?php
					printf(
						/* translators: 1: puntos nuevos, 2: rutas nuevas, 3: verificados, 4: ya existentes */
						esc_html__( 'Importados %1$d puntos y %2$d rutas (%3$d puntos ya verificados). %4$d ya estaban importados y no se han tocado.', 'pio' ),
						(int) $resultado['puntos_nuevos'],
						(int) $resultado['rutas_nuevas'],
						(int) $resultado['verificados'],
						(int) ( $resultado['puntos_existentes'] + $resultado['rutas_existentes'] )
					);
					?>
				</p>
				<?php foreach ( $resultado['errores'] as $error ) : ?>
					<p><?php echo esc_html( $error ); ?></p>
				<?php endforeach; ?>
				<p><a class="button button-primary" href="<?php echo esc_url( pio_url_verificar() ); ?>"><?php esc_html_e( 'Ir a «Verificar en el mapa»', 'pio' ); ?></a></p>
			</div>
		<?php endif; ?>

		<?php if ( ! $datos ) : ?>
			<div class="notice notice-error"><p><?php esc_html_e( 'No se encuentra el archivo datos/demo.json del plugin.', 'pio' ); ?></p></div>
		<?php else : ?>
			<p>
				<?php
				printf(
					/* translators: 1: número de puntos, 2: número de rutas, 3: archivo de origen */
					esc_html__( 'Crea %1$d puntos de interés y %2$d rutas con los datos de demostración de la app (%3$s), para tener algo que verificar desde el principio. Se crean como borradores: no se ven en la web ni en la API pública hasta que los publiques.', 'pio' ),
					count( $datos['puntos'] ),
					count( $datos['rutas'] ?? array() ),
					'<code>' . esc_html( $datos['origen'] ?? 'demo.ts' ) . '</code>'
				);
				?>
			</p>
			<table class="widefat striped" style="max-width:760px">
				<thead><tr><th><?php esc_html_e( 'Punto', 'pio' ); ?></th><th><?php esc_html_e( 'Categoría', 'pio' ); ?></th><th><?php esc_html_e( 'Ubicación', 'pio' ); ?></th><th><?php esc_html_e( 'Estado', 'pio' ); ?></th></tr></thead>
				<tbody>
				<?php foreach ( $datos['puntos'] as $p ) : ?>
					<tr>
						<td><?php echo esc_html( $p['nombre'] ); ?></td>
						<td><?php echo esc_html( $p['categoria']['nombre'] ?? '' ); ?></td>
						<td>
							<?php
							if ( ! empty( $p['verificacion'] ) ) {
								printf(
									/* translators: 1: nombre, 2: fecha */
									esc_html__( 'Verificada por %1$s el %2$s', 'pio' ),
									esc_html( $p['verificacion']['por'] ),
									esc_html( pio_fecha_texto( $p['verificacion']['fecha'] ) )
								);
							} else {
								esc_html_e( 'Aproximada: sin verificar', 'pio' );
							}
							?>
						</td>
						<td><?php echo pio_buscar_demo( 'pio_punto', $p['demo_id'] ) ? esc_html__( 'Ya importado', 'pio' ) : '—'; ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			<p><?php esc_html_e( 'Los campos que en la demo son huecos entre [corchetes] (horarios, precios, teléfonos) no se importan: los rellena el gestor de cada lugar.', 'pio' ); ?></p>
			<form method="post">
				<?php wp_nonce_field( 'pio_importar_demo' ); ?>
				<p><button type="submit" name="pio_importar" value="1" class="button button-primary button-hero"><?php esc_html_e( 'Importar', 'pio' ); ?></button></p>
			</form>
		<?php endif; ?>
	</div>
	<?php
}
