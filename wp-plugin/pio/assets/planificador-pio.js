/**
 * «Abrir en Pío» en el planificador de viaje de turismocazorla.info (D27).
 *
 * Complemento, sin tocar el código del planificador: cuando pinta un viaje
 * (dentro de .pvc-res), lee las paradas y comidas de cada día en orden, las
 * convierte en IDs de WordPress con los datos del propio planificador
 * (window.PVC_DATA: pois y rest, por su URL) y añade el botón en
 * «Llévate la ruta». Solo se carga si la sincronización está activa (Ajustes → Pío).
 */
(function () {
	'use strict';

	var D = window.PVC_DATA;
	var root = document.querySelector('.pvc');
	if (!D || !root || !window.pioViaje) return;

	function normal(u) {
		return String(u || '').split('#')[0].split('?')[0].replace(/\/+$/, '').toLowerCase();
	}
	// URL de la ficha → ID de WordPress
	var ids = {};
	[].concat(D.pois || [], D.rest || [], D.aloj || []).forEach(function (x) {
		if (x && x.url && x.id) ids[normal(x.url)] = x.id;
	});

	function diasDelViaje(res) {
		return [].slice.call(res.querySelectorAll('.pvc-dia[data-dia]'))
			.sort(function (a, b) { return a.dataset.dia - b.dataset.dia; })
			.map(function (dia) {
				var vistos = {};
				return [].slice.call(dia.querySelectorAll('.pvc-tl .pvc-t a[href]'))
					.map(function (a) { return ids[normal(a.getAttribute('href'))]; })
					.filter(function (id) {
						if (!id || vistos[id]) return false;
						vistos[id] = 1;
						return true;
					});
			});
	}

	function ponerBoton(res) {
		var caja = res.querySelector('.pvc-share');
		if (!caja || caja.querySelector('.pvc-pio')) return;
		var dias = diasDelViaje(res);
		var titulo = (res.querySelector('.pvc-card h2') || {}).textContent || '';
		var url = window.pioViaje.url(dias, titulo.trim());
		if (!url) return;
		var a = document.createElement('a');
		a.className = 'pvc-btn pvc-sm pvc-book pvc-pio';
		a.href = url;
		a.target = '_blank';
		a.rel = 'noopener';
		a.textContent = '📍 Abrir en Pío';
		a.addEventListener('click', function () {
			try {
				if (typeof window.gtag === 'function') window.gtag('event', 'pvc_compartir', { metodo: 'pio' });
				else if (window.dataLayer) window.dataLayer.push({ event: 'pvc_compartir', metodo: 'pio' });
			} catch (e) {}
		});
		caja.insertBefore(a, caja.firstChild);
	}

	function vigilar() {
		var res = root.querySelector('.pvc-res');
		if (!res) return;
		// El planificador vuelve a pintar .pvc-res con cada viaje nuevo
		new MutationObserver(function () { ponerBoton(res); }).observe(res, { childList: true });
		ponerBoton(res);
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar);
	else vigilar();
})();
