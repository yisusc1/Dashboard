// Contenido CORRECTO para: /public/scripts/factibilidad.js

document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([10.48, -66.9], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let clientMarker, napMarker, polyline;
    const coordsInput = document.getElementById('coords');
    const geoBtn = document.getElementById('geo-btn');
    const verifyBtn = document.getElementById('verify-btn');
    const resultsDiv = document.getElementById('results');
    const napNameSpan = document.getElementById('nap-name');
    const distanceSpan = document.getElementById('distance');
    const statusSpan = document.getElementById('status');

    geoBtn.addEventListener('click', () => {
        if (!navigator.geolocation) return alert('Geolocalización no soportada.');
        geoBtn.textContent = '...';
        geoBtn.disabled = true;
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lon = position.coords.longitude.toFixed(6);
                coordsInput.value = `${lat}, ${lon}`;
                geoBtn.textContent = '📍';
                geoBtn.disabled = false;
            },
            () => {
                alert('No se pudo obtener la ubicación.');
                geoBtn.textContent = '📍';
                geoBtn.disabled = false;
            }
        );
    });

    verifyBtn.addEventListener('click', () => {
        const [lat, lon] = coordsInput.value.split(',').map(coord => parseFloat(coord.trim()));
        if (isNaN(lat) || isNaN(lon)) return alert('Coordenadas inválidas.');

        if (clientMarker) map.removeLayer(clientMarker);
        if (napMarker) map.removeLayer(napMarker);
        if (polyline) map.removeLayer(polyline);
        resultsDiv.style.display = 'none';
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        verifyBtn.disabled = true;

        fetch('/api/factibilidad', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitud: lat, longitud: lon })
        })
        .then(response => response.ok ? response.json() : response.json().then(err => { throw new Error(err.error) }))
        .then(data => {
            const clientLatLng = [data.cliente.latitud, data.cliente.longitud];
            const napLatLng = [data.nap_cercana.latitud, data.nap_cercana.longitud];

            clientMarker = L.marker(clientLatLng).addTo(map).bindPopup('Ubicación del Cliente').openPopup();
            napMarker = L.marker(napLatLng).addTo(map).bindPopup(`NAP: ${data.nap_cercana.nombre_nap}`);
            polyline = L.polyline([clientLatLng, napLatLng], {color: 'red'}).addTo(map);
            map.fitBounds(polyline.getBounds().pad(0.1));

            napNameSpan.textContent = data.nap_cercana.nombre_nap;
            distanceSpan.textContent = data.distancia_metros;
            statusSpan.textContent = data.es_factible ? 'FACTIBLE' : 'NO FACTIBLE (muy lejos)';
            statusSpan.className = data.es_factible ? 'factible' : 'no-factible';
            resultsDiv.style.display = 'block';
        })
        .catch(error => {
            alert('Error al verificar: ' + error.message);
        })
        .finally(() => {
            verifyBtn.innerHTML = '<i class="fas fa-search-location"></i> Verificar Factibilidad';
            verifyBtn.disabled = false;
        });
    });
});