/*
 * Pío · Verificar puntos en el mapa.
 * Mapa Leaflet con todos los puntos: pin rojo = sin verificar, pin azul de Pío = verificado.
 * Al pinchar un pin: arrastrarlo y «Guardar y verificar», o «Estoy aquí» con el GPS del móvil.
 * Datos y textos llegan en window.pioVerificar (ver includes/admin-verificar.php).
 */
(function () {
	'use strict';

	var C = window.pioVerificar;
	if (!C || !window.L || !document.getElementById('pio-v-mapa')) {
		return;
	}
	var T = C.textos;
	var L = window.L;

	/* ---------- Utilidades ---------- */

	/** Sustituye %s y %1$s, %2$s… como sprintf de PHP. */
	function fmt(texto) {
		var args = Array.prototype.slice.call(arguments, 1);
		var i = 0;
		return texto.replace(/%(?:(\d+)\$)?s/g, function (_, n) {
			var v = n ? args[n - 1] : args[i++];
			return v === undefined || v === null ? '' : String(v);
		});
	}
	function $(id) {
		return document.getElementById(id);
	}
	function metros(m) {
		return Math.round(m).toLocaleString('es-ES');
	}
	function guardarPref(clave, valor) {
		try {
			window.localStorage.setItem('pio-verificar-' + clave, valor);
		} catch (e) { /* sin almacenamiento: no pasa nada */ }
	}
	function leerPref(clave) {
		try {
			return window.localStorage.getItem('pio-verificar-' + clave);
		} catch (e) {
			return null;
		}
	}

	var raiz = $('pio-verificar');
	var movil = window.matchMedia('(max-width: 700px)');

	/* ---------- Estado ---------- */

	var estado = {
		puntos: [],
		categorias: [],
		filtro: leerPref('filtro') === 'todos' ? 'todos' : 'pendientes',
		categoria: '',
		sel: null, // id del punto abierto en la ficha
		original: null, // posición guardada del punto abierto (LatLng) o null si no tenía
		movido: false,
		metodo: 'mapa',
		precision: null,
		guardando: false,
		gpsFicha: false, // «Estoy aquí» activo: el pin sigue al GPS
		localizar: false, // botón «Mi posición» del mapa
		pos: null, // última posición GPS {latlng, precision}
		primeraCarga: true
	};
	var marcadores = {}; // id → L.Marker
	var geoId = null;
	var capaPos = null;
	var capaPrecision = null;

	/* ---------- Mapa y capas ---------- */

	var mapa = L.map('pio-v-mapa', {
		zoomControl: false,
		maxZoom: 20
	}).setView(C.centro, 15);

	var CAPAS = {
		calles: {
			nombre: T.capaCalles,
			tema: 'claro',
			capa: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 20,
				maxNativeZoom: 19,
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			})
		},
		satelite: {
			nombre: T.capaSatelite,
			tema: 'oscuro',
			capa: L.tileLayer(
				'https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&VERSION=1.0.0&Layer=OI.OrthoimageCoverage&Style=default&Format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}',
				{
					maxZoom: 20,
					maxNativeZoom: 19,
					attribution: 'PNOA &copy; <a href="https://www.ign.es">Instituto Geográfico Nacional</a>'
				}
			)
		},
		esri: {
			nombre: T.capaSateliteEsri,
			tema: 'oscuro',
			capa: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
				maxZoom: 20,
				maxNativeZoom: 19,
				attribution: 'Imágenes &copy; Esri, Maxar, Earthstar Geographics'
			})
		},
		relieve: {
			nombre: T.capaRelieve,
			tema: 'claro',
			capa: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
				maxZoom: 20,
				maxNativeZoom: 17,
				subdomains: 'abc',
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
			})
		}
	};
	var capaActual = null;

	function ponerCapa(clave) {
		if (!CAPAS[clave]) {
			clave = 'calles';
		}
		if (capaActual) {
			mapa.removeLayer(CAPAS[capaActual].capa);
		}
		CAPAS[clave].capa.addTo(mapa);
		capaActual = clave;
		raiz.setAttribute('data-tema', CAPAS[clave].tema);
		guardarPref('capa', clave);
		var botones = $('pio-v-menu-capas').querySelectorAll('button');
		Array.prototype.forEach.call(botones, function (b) {
			b.setAttribute('aria-checked', b.getAttribute('data-capa') === clave ? 'true' : 'false');
		});
	}

	(function montarMenuCapas() {
		var menu = $('pio-v-menu-capas');
		var boton = $('pio-v-capas');
		Object.keys(CAPAS).forEach(function (clave) {
			var b = document.createElement('button');
			b.type = 'button';
			b.setAttribute('role', 'menuitemradio');
			b.setAttribute('data-capa', clave);
			b.textContent = CAPAS[clave].nombre;
			b.addEventListener('click', function () {
				ponerCapa(clave);
				cerrarMenu();
				boton.focus();
			});
			menu.appendChild(b);
		});
		function cerrarMenu() {
			menu.hidden = true;
			boton.setAttribute('aria-expanded', 'false');
		}
		boton.addEventListener('click', function () {
			var abrir = menu.hidden;
			menu.hidden = !abrir;
			boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
			if (abrir) {
				var marcado = menu.querySelector('[aria-checked="true"]') || menu.querySelector('button');
				marcado.focus();
			}
		});
		menu.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') {
				cerrarMenu();
				boton.focus();
				e.stopPropagation();
			}
		});
		mapa.on('click', cerrarMenu);
	})();

	ponerCapa(leerPref('capa') || 'calles');

	$('pio-v-acercar').addEventListener('click', function () {
		mapa.zoomIn();
	});
	$('pio-v-alejar').addEventListener('click', function () {
		mapa.zoomOut();
	});

	/* ---------- Pines ---------- */

	// Pin de Pío del manual de identidad (azul #1B6E8A con punto amarillo) y su versión roja.
	var FORMA = 'M15 39 C6 27 2 21 2 14 A13 13 0 0 1 28 14 C28 21 24 27 15 39 Z';
	function svgPin(verificado) {
		var cuerpo = verificado ? '#1B6E8A' : '#B3261E';
		var punto = verificado ? '#F2B705' : '#FFFFFF';
		return '<svg viewBox="0 0 30 40" aria-hidden="true"><path d="' + FORMA + '" fill="' + cuerpo +
			'" stroke="#FFFFFF" stroke-width="1.6"/><circle cx="15" cy="14" r="5.5" fill="' + punto + '"/></svg>';
	}
	var iconos = {};
	function icono(verificado, activo) {
		var clave = (verificado ? 'v' : 'p') + (activo ? 'a' : '');
		if (!iconos[clave]) {
			var w = activo ? 42 : 30;
			var h = activo ? 56 : 40;
			iconos[clave] = L.divIcon({
				className: 'pio-v-pin' + (activo ? ' pio-v-pin--activo' : ''),
				html: svgPin(verificado),
				iconSize: [w, h],
				iconAnchor: [w / 2, h - 1]
			});
		}
		return iconos[clave];
	}

	function punto(id) {
		for (var i = 0; i < estado.puntos.length; i++) {
			if (estado.puntos[i].id === id) {
				return estado.puntos[i];
			}
		}
		return null;
	}
	function tieneCoords(p) {
		return p.lat !== null && p.lng !== null;
	}
	function coincideCategoria(p) {
		if (!estado.categoria) {
			return true;
		}
		if (estado.categoria === '__ninguna') {
			return !p.categoria;
		}
		return !!p.categoria && p.categoria.slug === estado.categoria;
	}
	function esVisible(p) {
		if (p.id === estado.sel) {
			return true;
		}
		return tieneCoords(p) && coincideCategoria(p) && (estado.filtro === 'todos' || !p.verificado);
	}
	function etiquetaPin(p) {
		return p.nombre + ' — ' + (p.verificado ? T.verificado : T.sinVerificar);
	}

	function pintarMarcadores() {
		var vistos = {};
		estado.puntos.forEach(function (p) {
			if (!esVisible(p)) {
				return;
			}
			vistos[p.id] = true;
			var activo = p.id === estado.sel;
			var m = marcadores[p.id];
			if (!m) {
				if (!tieneCoords(p)) {
					return; // sin coordenadas: se coloca al seleccionarlo
				}
				m = L.marker([p.lat, p.lng], {
					icon: icono(p.verificado, activo),
					title: etiquetaPin(p),
					alt: etiquetaPin(p),
					keyboard: true,
					riseOnHover: true,
					autoPan: true
				});
				m.on('click', function () {
					seleccionar(p.id);
				});
				m.on('dragstart', alEmpezarArrastre);
				m.on('drag dragend', alArrastrar);
				marcadores[p.id] = m;
			} else if (m.options.icon !== icono(p.verificado, activo)) {
				m.setIcon(icono(p.verificado, activo));
				var el = m.getElement();
				if (el) {
					el.setAttribute('title', etiquetaPin(p));
					el.setAttribute('alt', etiquetaPin(p));
				}
			}
			m.setZIndexOffset(activo ? 2000 : p.verificado ? 0 : 500);
			if (!mapa.hasLayer(m)) {
				m.addTo(mapa);
			}
		});
		Object.keys(marcadores).forEach(function (id) {
			if (!vistos[id] && mapa.hasLayer(marcadores[id])) {
				mapa.removeLayer(marcadores[id]);
			}
		});
	}

	/* ---------- Barra: contador y filtros ---------- */

	function pintarContador() {
		var base = estado.puntos.filter(coincideCategoria);
		var hechos = base.filter(function (p) {
			return p.verificado;
		}).length;
		$('pio-v-contador-texto').textContent = fmt(T.contador, hechos, base.length);
		$('pio-v-progreso-barra').style.width = base.length ? Math.round((hechos / base.length) * 100) + '%' : '0';

		var sinCoords = base.filter(function (p) {
			return !tieneCoords(p);
		});
		var aviso = $('pio-v-sin-coords');
		aviso.hidden = sinCoords.length === 0;
		aviso.textContent = fmt(T.sinCoordenadas, sinCoords.length);
	}

	function pintarCategorias() {
		var select = $('pio-v-categoria');
		var cuenta = {};
		var sinCat = 0;
		estado.puntos.forEach(function (p) {
			if (p.categoria) {
				cuenta[p.categoria.slug] = (cuenta[p.categoria.slug] || 0) + 1;
			} else {
				sinCat++;
			}
		});
		while (select.options.length > 1) {
			select.remove(1);
		}
		estado.categorias.forEach(function (c) {
			if (cuenta[c.slug]) {
				select.add(new Option(c.nombre + ' (' + cuenta[c.slug] + ')', c.slug));
			}
		});
		if (sinCat) {
			select.add(new Option(T.sinCategoria + ' (' + sinCat + ')', '__ninguna'));
		}
		select.value = estado.categoria;
		if (select.value !== estado.categoria) {
			estado.categoria = '';
			select.value = '';
		}
	}

	function pintarTodo() {
		pintarMarcadores();
		pintarContador();
	}

	Array.prototype.forEach.call(raiz.querySelectorAll('[data-filtro]'), function (b) {
		b.setAttribute('aria-pressed', b.getAttribute('data-filtro') === estado.filtro ? 'true' : 'false');
		b.addEventListener('click', function () {
			estado.filtro = b.getAttribute('data-filtro');
			guardarPref('filtro', estado.filtro);
			Array.prototype.forEach.call(raiz.querySelectorAll('[data-filtro]'), function (o) {
				o.setAttribute('aria-pressed', o === b ? 'true' : 'false');
			});
			pintarTodo();
			avisarSiTodoHecho();
		});
	});

	$('pio-v-categoria').addEventListener('change', function (e) {
		estado.categoria = e.target.value;
		pintarTodo();
		encuadrar(estado.puntos.filter(function (p) {
			return esVisible(p) && tieneCoords(p);
		}));
		avisarSiTodoHecho();
	});

	function avisarSiTodoHecho() {
		if (estado.filtro !== 'pendientes' || !estado.puntos.length) {
			return;
		}
		var quedan = estado.puntos.some(function (p) {
			return coincideCategoria(p) && !p.verificado;
		});
		if (!quedan) {
			avisar(T.todoVerificado, 5000);
		}
	}

	function encuadrar(lista) {
		if (!lista.length) {
			return;
		}
		if (lista.length === 1) {
			mapa.setView([lista[0].lat, lista[0].lng], Math.max(mapa.getZoom(), 17));
			return;
		}
		mapa.fitBounds(
			L.latLngBounds(lista.map(function (p) {
				return [p.lat, p.lng];
			})),
			{ padding: [60, 60], maxZoom: 18 }
		);
	}

	/* ---------- Aviso breve ---------- */

	var temporizadorAviso = null;
	function avisar(texto, ms) {
		var el = $('pio-v-aviso');
		el.textContent = texto;
		el.hidden = false;
		clearTimeout(temporizadorAviso);
		temporizadorAviso = setTimeout(function () {
			el.hidden = true;
		}, ms || 3500);
	}

	/* ---------- Altura de la hoja inferior (móvil) ---------- */

	var observador = window.ResizeObserver ? new ResizeObserver(medirHoja) : null;
	function medirHoja() {
		var ficha = $('pio-v-ficha');
		var lista = $('pio-v-lista');
		var abierta = !ficha.hidden ? ficha : !lista.hidden ? lista : null;
		var alto = abierta && movil.matches ? abierta.offsetHeight : 0;
		raiz.style.setProperty('--alto-ficha', alto + 'px');
	}
	if (observador) {
		observador.observe($('pio-v-ficha'));
		observador.observe($('pio-v-lista'));
	}
	movil.addEventListener && movil.addEventListener('change', medirHoja);

	/* ---------- Ficha del punto ---------- */

	function textoMetodo(v) {
		var m = v.metodo === 'gps' ? T.metodoGps : v.metodo === 'terreno' ? T.metodoTerreno : T.metodoMapa;
		if (v.metodo === 'gps' && v.precision !== null && v.precision !== undefined) {
			m += ' ' + fmt(T.conPrecision, v.precision);
		}
		return m;
	}

	function textoEstadoPost(p) {
		if (p.estado === 'draft') {
			return ' · ' + T.borrador;
		}
		if (p.estado === 'pending') {
			return ' · ' + T.pendiente;
		}
		return '';
	}

	function siguientePendiente(desde) {
		var mejor = null;
		var mejorD = Infinity;
		estado.puntos.forEach(function (p) {
			if (p.verificado || !tieneCoords(p) || !coincideCategoria(p) || p.id === estado.sel) {
				return;
			}
			var d = desde ? desde.distanceTo([p.lat, p.lng]) : 0;
			if (d < mejorD) {
				mejorD = d;
				mejor = p;
			}
		});
		return mejor;
	}

	function pintarFicha() {
		var p = punto(estado.sel);
		if (!p) {
			return;
		}
		var m = marcadores[p.id];
		$('pio-v-ficha-categoria').textContent = (p.categoria ? p.categoria.nombre : T.sinCategoria) + textoEstadoPost(p);
		$('pio-v-ficha-nombre').textContent = p.nombre;

		var est = $('pio-v-ficha-estado');
		est.className = 'pio-v-estado ' + (p.verificado ? 'es-verificado' : 'es-pendiente');
		est.textContent = '';
		if (p.verificado && p.verificacion) {
			est.appendChild(document.createTextNode('✓ ' + fmt(T.verificadoPor, p.verificacion.por || '—', p.verificacion.fecha_texto || '—')));
			var detalle = document.createElement('small');
			detalle.textContent = textoMetodo(p.verificacion);
			est.appendChild(detalle);
		} else {
			est.appendChild(document.createTextNode(T.sinVerificar));
			if (p.anterior) {
				var aviso = document.createElement('small');
				aviso.textContent = fmt(T.invalidada, p.anterior.fecha_texto || '—', p.anterior.por || '—');
				est.appendChild(aviso);
			}
		}

		$('pio-v-ficha-pista').textContent = estado.original ? T.pistaArrastrar : T.pistaSinCoords;

		var movido = $('pio-v-ficha-movido');
		movido.textContent = '';
		if (estado.movido && estado.original && m) {
			movido.appendChild(document.createTextNode(fmt(T.movido, metros(estado.original.distanceTo(m.getLatLng()))) + ' '));
			var deshacer = document.createElement('button');
			deshacer.type = 'button';
			deshacer.className = 'pio-v-enlace';
			deshacer.textContent = T.deshacer;
			deshacer.addEventListener('click', deshacerMovimiento);
			movido.appendChild(deshacer);
			movido.hidden = false;
		} else {
			movido.hidden = true;
		}

		pintarGps();

		var gps = $('pio-v-estoy-aqui');
		gps.textContent = estado.gpsFicha ? T.dejarGps : T.estoyAqui;
		gps.setAttribute('aria-pressed', estado.gpsFicha ? 'true' : 'false');

		var guardar = $('pio-v-guardar');
		var esperandoGps = estado.gpsFicha && !estado.pos;
		guardar.disabled = estado.guardando || esperandoGps || !m;
		if (estado.guardando) {
			guardar.textContent = T.guardando;
		} else if (estado.metodo === 'gps' && estado.precision !== null) {
			guardar.textContent = fmt(T.guardarGps, metros(estado.precision));
		} else {
			guardar.textContent = T.guardar;
		}

		var ll = m ? m.getLatLng() : null;
		$('pio-v-ficha-coords').textContent = ll ? ll.lat.toFixed(6) + ', ' + ll.lng.toFixed(6) : '';
		$('pio-v-ficha-editar').href = p.editar_url || '#';

		var sig = $('pio-v-siguiente');
		var siguiente = p.verificado && !estado.movido ? siguientePendiente(ll) : null;
		sig.hidden = !siguiente;
		sig.onclick = siguiente ? function () {
			seleccionar(siguiente.id);
		} : null;
	}

	function pintarGps() {
		var el = $('pio-v-ficha-gps');
		if (!estado.gpsFicha) {
			el.hidden = true;
			return;
		}
		el.hidden = false;
		if (!estado.pos) {
			el.className = 'pio-v-gps';
			el.textContent = T.buscandoGps;
			return;
		}
		var acc = estado.pos.precision;
		var clase = acc <= 10 ? 'buena' : acc <= 25 ? 'regular' : 'mala';
		el.className = 'pio-v-gps es-' + clase;
		el.textContent = fmt(T.precisionGps, metros(acc)) + ' — ' + T['precision' + clase.charAt(0).toUpperCase() + clase.slice(1)];
	}

	function seleccionar(id) {
		if (estado.sel === id) {
			return;
		}
		if (estado.sel !== null) {
			deseleccionar(true);
		}
		var p = punto(id);
		if (!p) {
			return;
		}
		$('pio-v-lista').hidden = true;
		estado.sel = id;
		estado.movido = false;
		estado.metodo = 'mapa';
		estado.precision = null;

		if (tieneCoords(p)) {
			estado.original = L.latLng(p.lat, p.lng);
		} else {
			// Sin coordenadas: lo ponemos en el centro del mapa (o donde está el usuario) para arrastrarlo.
			estado.original = null;
			var inicio = estado.pos ? estado.pos.latlng : mapa.getCenter();
			var temporal = L.marker(inicio, { icon: icono(false, true), keyboard: true, autoPan: true, title: p.nombre, alt: p.nombre });
			temporal.on('dragstart', alEmpezarArrastre);
			temporal.on('drag dragend', alArrastrar);
			marcadores[id] = temporal;
			estado.movido = true;
		}
		pintarMarcadores();
		var m = marcadores[id];
		if (m) {
			m.dragging.enable();
		}

		var ficha = $('pio-v-ficha');
		ficha.hidden = false;
		pintarFicha();
		medirHoja();
		if (m) {
			mapa.panInside(m.getLatLng(), {
				paddingTopLeft: [40, 140],
				paddingBottomRight: [40, (movil.matches ? ficha.offsetHeight : 0) + 40]
			});
		}
		ficha.focus({ preventScroll: true });
	}

	/** Cierra la ficha. Si el pin se movió y no se guardó, vuelve a su sitio. */
	function deseleccionar(silencioso) {
		var id = estado.sel;
		if (id === null) {
			return;
		}
		var p = punto(id);
		var m = marcadores[id];
		pararGpsFicha();
		if (m) {
			m.dragging.disable();
			if (estado.original) {
				m.setLatLng(estado.original);
			} else if (p && !tieneCoords(p)) {
				mapa.removeLayer(m);
				delete marcadores[id];
			}
		}
		estado.sel = null;
		estado.original = null;
		estado.movido = false;
		$('pio-v-ficha').hidden = true;
		medirHoja();
		pintarMarcadores();
		if (!silencioso && m && m.getElement()) {
			m.getElement().focus({ preventScroll: true });
		}
	}

	function deshacerMovimiento() {
		var m = marcadores[estado.sel];
		pararGpsFicha();
		if (m && estado.original) {
			m.setLatLng(estado.original);
		}
		estado.movido = false;
		estado.metodo = 'mapa';
		estado.precision = null;
		pintarFicha();
	}

	function alEmpezarArrastre() {
		// Si el pin seguía al GPS, a partir de ahora manda el dedo.
		if (estado.gpsFicha) {
			pararGpsFicha();
		}
		estado.metodo = 'mapa';
		estado.precision = null;
	}

	function alArrastrar() {
		var m = marcadores[estado.sel];
		if (!m) {
			return;
		}
		estado.movido = !estado.original || estado.original.distanceTo(m.getLatLng()) > 0.05;
		pintarFicha();
	}

	$('pio-v-cerrar').addEventListener('click', function () {
		deseleccionar(false);
	});
	raiz.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			if (!$('pio-v-lista').hidden) {
				$('pio-v-lista').hidden = true;
				medirHoja();
			} else if (estado.sel !== null) {
				deseleccionar(false);
			}
		}
	});

	/* ---------- Guardar y verificar ---------- */

	$('pio-v-guardar').addEventListener('click', function () {
		var id = estado.sel;
		var m = marcadores[id];
		if (!m || estado.guardando) {
			return;
		}
		var ll = m.getLatLng();
		var cuerpo = { lat: ll.lat, lng: ll.lng, metodo: estado.metodo };
		if (estado.metodo === 'gps' && estado.precision !== null) {
			cuerpo.precision = Math.round(estado.precision);
		}
		estado.guardando = true;
		pintarFicha();

		fetch(C.api + '/' + id, {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': C.nonce },
			body: JSON.stringify(cuerpo)
		})
			.then(function (r) {
				return r.json().then(function (datos) {
					if (!r.ok) {
						throw new Error(datos && datos.message ? datos.message : r.status);
					}
					return datos;
				});
			})
			.then(function (actualizado) {
				for (var i = 0; i < estado.puntos.length; i++) {
					if (estado.puntos[i].id === id) {
						estado.puntos[i] = actualizado;
					}
				}
				pararGpsFicha();
				estado.original = L.latLng(actualizado.lat, actualizado.lng);
				m.setLatLng(estado.original);
				estado.movido = false;
				estado.metodo = 'mapa';
				estado.precision = null;
				avisar(T.guardado);
				if (navigator.vibrate) {
					navigator.vibrate(40);
				}
			})
			.catch(function (err) {
				avisar(T.errorGuardar + (err && err.message ? ' (' + err.message + ')' : ''), 6000);
			})
			.then(function () {
				estado.guardando = false;
				if (estado.sel === id) {
					pintarFicha();
				}
				pintarTodo();
			});
	});

	/* ---------- GPS ---------- */

	function geoNecesaria() {
		return estado.gpsFicha || estado.localizar;
	}

	function iniciarGeo() {
		if (geoId !== null) {
			return true;
		}
		if (!window.isSecureContext) {
			avisar(T.errorGpsHttps, 6000);
			return false;
		}
		if (!navigator.geolocation) {
			avisar(T.errorGps, 5000);
			return false;
		}
		geoId = navigator.geolocation.watchPosition(alRecibirPosicion, alFallarGeo, {
			enableHighAccuracy: true,
			maximumAge: 0,
			timeout: 30000
		});
		return true;
	}

	function pararGeoSiSobra() {
		if (geoNecesaria() || geoId === null) {
			return;
		}
		navigator.geolocation.clearWatch(geoId);
		geoId = null;
		estado.pos = null;
		if (capaPos) {
			mapa.removeLayer(capaPos);
			mapa.removeLayer(capaPrecision);
			capaPos = capaPrecision = null;
		}
	}

	function alRecibirPosicion(pos) {
		var primera = !estado.pos;
		var ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
		estado.pos = { latlng: ll, precision: pos.coords.accuracy };

		if (!capaPos) {
			capaPrecision = L.circle(ll, {
				radius: pos.coords.accuracy,
				color: '#1B6E8A',
				weight: 1,
				fillColor: '#1B6E8A',
				fillOpacity: 0.12,
				interactive: false
			}).addTo(mapa);
			capaPos = L.circleMarker(ll, {
				radius: 8,
				color: '#FFFFFF',
				weight: 3,
				fillColor: '#1B6E8A',
				fillOpacity: 1,
				interactive: false
			}).addTo(mapa);
		} else {
			capaPos.setLatLng(ll);
			capaPrecision.setLatLng(ll).setRadius(pos.coords.accuracy);
		}

		var m = estado.sel !== null ? marcadores[estado.sel] : null;
		if (estado.gpsFicha && m) {
			m.setLatLng(ll);
			estado.movido = true;
			estado.metodo = 'gps';
			estado.precision = pos.coords.accuracy;
			if (primera) {
				mapa.setView(ll, Math.max(mapa.getZoom(), 18));
			}
			pintarFicha();
		} else if (estado.localizar && primera) {
			mapa.setView(ll, Math.max(mapa.getZoom(), 17));
		}
	}

	function alFallarGeo(err) {
		if (err.code === 1) {
			avisar(T.errorGpsPermiso, 7000);
			estado.localizar = false;
			$('pio-v-localizar').setAttribute('aria-pressed', 'false');
			pararGpsFicha();
			if (geoId !== null) {
				navigator.geolocation.clearWatch(geoId);
				geoId = null;
			}
		} else if (!estado.pos) {
			avisar(T.errorGps, 5000);
		}
	}

	function pararGpsFicha() {
		if (!estado.gpsFicha) {
			return;
		}
		estado.gpsFicha = false;
		pararGeoSiSobra();
		if (estado.sel !== null) {
			pintarFicha();
		}
	}

	$('pio-v-estoy-aqui').addEventListener('click', function () {
		if (estado.gpsFicha) {
			pararGpsFicha();
			return;
		}
		estado.gpsFicha = true;
		if (!iniciarGeo()) {
			estado.gpsFicha = false;
			return;
		}
		if (estado.pos) {
			// Ya había posición (p. ej. con «Mi posición» activo): úsala ya.
			alRecibirPosicion({
				coords: { latitude: estado.pos.latlng.lat, longitude: estado.pos.latlng.lng, accuracy: estado.pos.precision }
			});
		}
		pintarFicha();
	});

	$('pio-v-localizar').addEventListener('click', function () {
		var b = this;
		if (estado.localizar) {
			estado.localizar = false;
			b.setAttribute('aria-pressed', 'false');
			pararGeoSiSobra();
			return;
		}
		estado.localizar = true;
		b.setAttribute('aria-pressed', 'true');
		if (!iniciarGeo()) {
			estado.localizar = false;
			b.setAttribute('aria-pressed', 'false');
			return;
		}
		if (estado.pos) {
			mapa.setView(estado.pos.latlng, Math.max(mapa.getZoom(), 17));
		}
	});

	/* ---------- Lista: puntos sin coordenadas o mapa vacío ---------- */

	function abrirLista(titulo, elementos) {
		if (estado.sel !== null) {
			deseleccionar(true);
		}
		$('pio-v-lista-titulo').textContent = titulo;
		var ul = $('pio-v-lista-items');
		ul.textContent = '';
		elementos.forEach(function (el) {
			var li = document.createElement('li');
			li.appendChild(el);
			ul.appendChild(li);
		});
		$('pio-v-lista').hidden = false;
		medirHoja();
		$('pio-v-lista').focus({ preventScroll: true });
	}

	$('pio-v-lista-cerrar').addEventListener('click', function () {
		$('pio-v-lista').hidden = true;
		medirHoja();
	});

	$('pio-v-sin-coords').addEventListener('click', function () {
		var lista = estado.puntos.filter(function (p) {
			return coincideCategoria(p) && !tieneCoords(p);
		});
		abrirLista(T.elegirSinCoords, lista.map(function (p) {
			var b = document.createElement('button');
			b.type = 'button';
			b.textContent = p.nombre;
			var cat = document.createElement('small');
			cat.textContent = (p.categoria ? p.categoria.nombre : T.sinCategoria) + textoEstadoPost(p);
			b.appendChild(cat);
			b.addEventListener('click', function () {
				seleccionar(p.id);
			});
			return b;
		}));
	});

	function enlaceBoton(texto, url, principal) {
		var a = document.createElement('a');
		a.href = url;
		a.className = 'pio-v-boton ' + (principal ? 'pio-v-boton-principal' : 'pio-v-boton-secundario');
		a.textContent = texto;
		return a;
	}

	/* ---------- Carga ---------- */

	function cargar() {
		avisar(T.cargando, 20000);
		fetch(C.api, { credentials: 'same-origin', headers: { 'X-WP-Nonce': C.nonce } })
			.then(function (r) {
				if (!r.ok) {
					throw new Error(r.status);
				}
				return r.json();
			})
			.then(function (datos) {
				$('pio-v-aviso').hidden = true;
				estado.puntos = datos.puntos || [];
				estado.categorias = datos.categorias || [];
				pintarCategorias();
				pintarTodo();

				if (!estado.puntos.length) {
					var acciones = [enlaceBoton(T.crearPunto, C.nuevoUrl, true)];
					if (C.importarUrl) {
						acciones.push(enlaceBoton(T.importarDemo, C.importarUrl, false));
					}
					abrirLista(T.sinPuntos, acciones);
					return;
				}
				if (estado.primeraCarga) {
					estado.primeraCarga = false;
					var visibles = estado.puntos.filter(function (p) {
						return esVisible(p) && tieneCoords(p);
					});
					encuadrar(visibles.length ? visibles : estado.puntos.filter(tieneCoords));
				}
				avisarSiTodoHecho();
			})
			.catch(function () {
				var b = document.createElement('button');
				b.type = 'button';
				b.className = 'pio-v-boton pio-v-boton-principal';
				b.textContent = T.reintentar;
				b.addEventListener('click', function () {
					$('pio-v-lista').hidden = true;
					cargar();
				});
				$('pio-v-aviso').hidden = true;
				abrirLista(T.errorCarga, [b]);
			});
	}

	window.addEventListener('beforeunload', function (e) {
		if (estado.sel !== null && estado.movido) {
			e.preventDefault();
			e.returnValue = T.cambiosSinGuardar;
			return T.cambiosSinGuardar;
		}
	});

	// El contenedor es fijo: Leaflet necesita medirlo cuando ya está pintado.
	setTimeout(function () {
		mapa.invalidateSize();
	}, 0);
	cargar();
})();
