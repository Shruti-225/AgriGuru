// satellite.js
const apiKey = '4f4333e225e37f4e826ee7ee1d3afc80';


const map = L.map('map').setView([20.5937, 78.9629], 5); // India center

// Base OpenStreetMap layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
attribution: '© OpenStreetMap contributors',
maxZoom: 18
}).addTo(map);

// NDVI tile layer via SentinelHub demo (no bbox needed)
const ndviLayer = L.tileLayer(
'https://services.sentinel-hub.com/ogc/wms/1cd15ba8-6c92-4c88-8a6e-486c5df6f168?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=NDVI&STYLES=&FORMAT=image/png&TRANSPARENT=true&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256',
{
attribution: 'NDVI data © Sentinel Hub (demo)',
opacity: 0.6
}
);

// Rainfall overlay from OpenWeatherMap (needs your API key)
const rainfallLayer = L.tileLayer(
`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
{
attribution: 'Rainfall © OpenWeatherMap',
opacity: 0.6
}
);

// Function to fetch soil data from Open-Meteo
async function fetchSoilData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=et0_fao_evapotranspiration,precipitation_sum&hourly=soil_moisture_0_1cm,soil_temperature_0cm&forecast_days=14`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching soil data:', error);
        return null;
    }
}

// Set default layer
let currentLayer = ndviLayer;
currentLayer.addTo(map);

// Variable to store click handler
let clickHandler = null;

// Listen for dropdown changes
const layerSelector = document.getElementById('layerSelector');

layerSelector.addEventListener('change', () => {
if (currentLayer) map.removeLayer(currentLayer);
if (clickHandler) {
    map.off('click', clickHandler);
    clickHandler = null;
}

const selected = layerSelector.value;

if (selected === 'ndvi') {
currentLayer = ndviLayer;
currentLayer.addTo(map);
} else if (selected === 'rainfall') {
currentLayer = rainfallLayer;
currentLayer.addTo(map);
} else if (selected === 'soil') {
    // For soil layer, add click handler to fetch data
    clickHandler = async function(e) {
        const { lat, lng } = e.latlng;
        const data = await fetchSoilData(lat, lng);
        if (data && data.hourly && data.hourly.soil_moisture_0_1cm) {
            const latestMoisture = data.hourly.soil_moisture_0_1cm[data.hourly.soil_moisture_0_1cm.length - 1];
            const latestTemp = data.hourly.soil_temperature_0cm[data.hourly.soil_temperature_0cm.length - 1];
            const todayEvap = data.daily.et0_fao_evapotranspiration[0];
            const todayPrecip = data.daily.precipitation_sum[0];
            L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                    <strong>Vegetation Health Indicators</strong><br>
                    Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>
                    Soil Moisture (0-1cm): ${latestMoisture ? (latestMoisture * 100).toFixed(1) + '%' : 'N/A'}<br>
                    Soil Temperature (0cm): ${latestTemp ? latestTemp.toFixed(1) + '°C' : 'N/A'}<br>
                    Today's Evapotranspiration: ${todayEvap ? todayEvap.toFixed(2) + 'mm' : 'N/A'}<br>
                    Today's Precipitation: ${todayPrecip ? todayPrecip.toFixed(2) + 'mm' : 'N/A'}<br>
                    <small>Data from Open-Meteo (related to vegetation health)</small>
                `)
                .openOn(map);
        } else {
            L.popup()
                .setLatLng(e.latlng)
                .setContent('Unable to fetch vegetation health data for this location.')
                .openOn(map);
        }
    };
    map.on('click', clickHandler);
}
});