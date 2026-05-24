const dropdown = document.getElementById('locationDropdown');
const resultDiv = document.getElementById('weatherResult');
const apiKey = 'aae4bc02b87b63e390ae5ac01142ceb4';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Initialize geolocation on page load
window.addEventListener('load', () => {
    getGeolocation();
});

dropdown.addEventListener('change', () => {
    const city = dropdown.value;
    if (city) {
        fetchWeather(city);
    } else {
        resultDiv.innerHTML = '';
    }
});

// Auto-detect user location
function getGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            error => {
                console.log('Geolocation not available:', error.message);
                // Fallback to Delhi if geolocation fails
                fetchWeather('Delhi');
            }
        );
    }
}

// Fetch weather by coordinates
function fetchWeatherByCoords(lat, lon, retries = 0) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.cod === 200) {
                displayWeatherData(data);
                fetchForecast(lat, lon);
                fetchUVIndex(lat, lon);
                fetchSoilData(lat, lon);
                fetchEvapotranspiration(lat, lon);
                fetchAgricultureWeather(lat, lon);
            }
        })
        .catch(error => {
            if (retries < MAX_RETRIES) {
                console.log(`Retrying geolocation weather fetch... (${retries + 1}/${MAX_RETRIES})`);
                setTimeout(() => fetchWeatherByCoords(lat, lon, retries + 1), RETRY_DELAY);
            } else {
                console.error('Geolocation weather fetch failed:', error);
            }
        });
}

function fetchWeather(city, retries = 0) {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) {
                    resultDiv.innerHTML = `<p style="color: #d32f2f;">❌ City not found. Please check the spelling and try again.</p>`;
                    return;
                }
                throw new Error(`HTTP Error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.cod === 200) {
                const { lat, lon } = data.coord;
                displayWeatherData(data);
                saveWeatherHistory(data);
                setVisualEffect(data.weather[0].main.toLowerCase());
                fetchForecast(lat, lon);
                fetchUVIndex(lat, lon);
                fetchSoilData(lat, lon);
                fetchEvapotranspiration(lat, lon);
                fetchAgricultureWeather(lat, lon);
            }
        })
        .catch(error => {
            if (retries < MAX_RETRIES) {
                console.log(`Retrying weather fetch for ${city}... (${retries + 1}/${MAX_RETRIES})`);
                setTimeout(() => fetchWeather(city, retries + 1), RETRY_DELAY);
            } else {
                console.error('Weather fetch failed:', error);
                resultDiv.innerHTML = `<p style="color: #d32f2f;">⚠️ Failed to fetch weather data. Please check your connection and try again.</p>`;
            }
        });
}

// Display comprehensive weather data
function displayWeatherData(data) {
    const { name, sys } = data;
    const { temp, humidity, pressure } = data.main;
    const { description, icon, main } = data.weather[0];
    const { speed: windSpeed } = data.wind;
    const { sunrise, sunset } = sys;

    // Convert Unix timestamps to readable time
    const sunriseTime = new Date(sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const sunsetTime = new Date(sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Check for weather alerts
    const alerts = checkWeatherAlerts(data);
    const alertHTML = alerts.length > 0 ? `<div style="background-color: #fff3cd; border: 2px solid #ffc107; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
        <strong>⚠️ Weather Alerts:</strong><br>${alerts.join('<br>')}
    </div>` : '';

    const container = document.createElement('div');
    container.classList.add('fade-in');
    container.innerHTML = `
        ${alertHTML}
        <h3>🌍 Weather in ${name}</h3>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" style="width: 100px; height: 100px;">
        <div style="margin-top: 10px;">
            <p><strong>🌡️ Temperature:</strong> ${temp} °C</p>
            <p><strong>📝 Condition:</strong> ${description}</p>
            <p><strong>💧 Humidity:</strong> ${humidity}%</p>
            <p><strong>💨 Wind Speed:</strong> ${windSpeed} m/s</p>
            <p><strong>🔽 Pressure:</strong> ${pressure} hPa</p>
            <p><strong>🌅 Sunrise:</strong> ${sunriseTime}</p>
            <p><strong>🌇 Sunset:</strong> ${sunsetTime}</p>
        </div>
    `;

    resultDiv.innerHTML = '';
    resultDiv.appendChild(container);
}

function fetchForecast(lat, lon, retries = 0) {
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    fetch(forecastUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            let forecastHTML = `<h3>📅 5-Day Forecast</h3><div class="forecast-container">`;

            const grouped = {};
            data.list.forEach(item => {
                const date = item.dt_txt.split(' ')[0];
                if (!grouped[date]) grouped[date] = [];
                grouped[date].push(item);
            });

            Object.keys(grouped).slice(0, 5).forEach((date, idx) => {
                const dayData = grouped[date];
                let minTemp = Infinity;
                let maxTemp = -Infinity;
                let humiditySum = 0;
                let windSum = 0;
                let icon = dayData[0].weather[0].icon;
                let description = dayData[0].weather[0].description;

                dayData.forEach(item => {
                    const temp = item.main.temp;
                    minTemp = Math.min(minTemp, temp);
                    maxTemp = Math.max(maxTemp, temp);
                    humiditySum += item.main.humidity;
                    windSum += item.wind.speed;
                });

                const avgHumidity = Math.round(humiditySum / dayData.length);
                const avgWind = (windSum / dayData.length).toFixed(1);
                const dayName = idx === 0 ? "Today" : new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

                forecastHTML += `
                    <div class="forecast-card">
                        <strong>${dayName}</strong><br>
                        <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}">
                        <div>${description}</div>
                        <div>🌡 ${Math.round(maxTemp)}° / ${Math.round(minTemp)}°</div>
                        <div>💧 ${avgHumidity}%</div>
                        <div>💨 ${avgWind} m/s</div>
                    </div>
                `;
            });

            forecastHTML += `</div>`;

            const container = document.createElement('div');
            container.classList.add('fade-in');
            container.innerHTML = forecastHTML;

            resultDiv.appendChild(container);
        })
        .catch(error => {
            if (retries < MAX_RETRIES) {
                console.log(`Retrying forecast fetch... (${retries + 1}/${MAX_RETRIES})`);
                setTimeout(() => fetchForecast(lat, lon, retries + 1), RETRY_DELAY);
            } else {
                console.error('Forecast fetch failed:', error);
                resultDiv.innerHTML += `<p style="color: #d32f2f;">⚠️ Could not fetch forecast data.</p>`;
            }
        });
}

// Fetch UV Index
function fetchUVIndex(lat, lon, retries = 0) {
    const uvUrl = `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`;

    fetch(uvUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            const uvIndex = data.value;
            let uvLevel = 'Low';
            let uvColor = '#4caf50';
            
            if (uvIndex >= 11) {
                uvLevel = 'Extreme';
                uvColor = '#b71c1c';
            } else if (uvIndex >= 8) {
                uvLevel = 'Very High';
                uvColor = '#f57c00';
            } else if (uvIndex >= 6) {
                uvLevel = 'High';
                uvColor = '#ffa500';
            } else if (uvIndex >= 3) {
                uvLevel = 'Moderate';
                uvColor = '#ffeb3b';
            }

            const uvContainer = document.createElement('div');
            uvContainer.classList.add('fade-in');
            uvContainer.innerHTML = `
                <div style="margin-top: 10px; padding: 10px; background-color: ${uvColor}33; border: 2px solid ${uvColor}; border-radius: 5px;">
                    <strong>☀️ UV Index:</strong> ${uvIndex.toFixed(1)} (${uvLevel})
                </div>
            `;

            resultDiv.appendChild(uvContainer);
        })
        .catch(error => {
            if (retries < MAX_RETRIES) {
                console.log(`Retrying UV index fetch... (${retries + 1}/${MAX_RETRIES})`);
                setTimeout(() => fetchUVIndex(lat, lon, retries + 1), RETRY_DELAY);
            } else {
                console.error('UV index fetch failed:', error);
            }
        });
}

// Fetch soil temperature and moisture from Open-Meteo
function fetchSoilData(lat, lon, retries = 0) {
    const soilUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_temperature_0cm,soil_moisture_0_1cm&forecast_days=7&timezone=auto`;

    fetch(soilUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data.hourly) {
                throw new Error('Soil data missing from response');
            }

            const times = data.hourly.time || [];
            const temps = data.hourly.soil_temperature_0cm || [];
            const moisture = data.hourly.soil_moisture_0_1cm || [];
            const now = new Date();
            const pad = value => String(value).padStart(2, '0');
            const localHourString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
            const nowIndex = times.findIndex(t => t === localHourString);
            const currentIndex = nowIndex >= 0 ? nowIndex : 0;

            const soilTempNow = temps[currentIndex] ?? null;
            const soilMoistureNow = moisture[currentIndex] ?? null;

            const daily = {};
            times.forEach((time, index) => {
                const day = time.split('T')[0];
                if (!daily[day]) {
                    daily[day] = { tempSum: 0, moistureSum: 0, count: 0 };
                }
                daily[day].tempSum += temps[index] ?? 0;
                daily[day].moistureSum += moisture[index] ?? 0;
                daily[day].count += 1;
            });

            const days = Object.keys(daily).slice(0, 7);
            const avgTemps = days.map(day => daily[day].count ? (daily[day].tempSum / daily[day].count).toFixed(1) : null);
            const avgMoisture = days.map(day => daily[day].count ? (daily[day].moistureSum / daily[day].count).toFixed(3) : null);

            const soilRows = days.map(day => {
                const averageTemp = daily[day].count ? (daily[day].tempSum / daily[day].count).toFixed(1) : 'N/A';
                const averageMoisture = daily[day].count ? (daily[day].moistureSum / daily[day].count).toFixed(3) : 'N/A';
                return `
                    <tr>
                        <td>${new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td>${averageTemp} °C</td>
                        <td>${averageMoisture} m³/m³</td>
                    </tr>
                `;
            }).join('');

            const chartId = `soilChart-${Date.now()}`;
            const soilContainer = document.createElement('div');
            soilContainer.classList.add('fade-in');
            soilContainer.innerHTML = `
                <h3>🌱 Soil Data (Open-Meteo)</h3>
                <div style="margin-top: 10px; padding: 12px; background: #e8f5e9; border-radius: 10px; border: 1px solid #c8e6c9; text-align: left;">
                    <p><strong>Soil temperature now:</strong> ${soilTempNow !== null ? soilTempNow.toFixed(1) + ' °C' : 'N/A'}</p>
                    <p><strong>Soil moisture now:</strong> ${soilMoistureNow !== null ? soilMoistureNow.toFixed(3) + ' m³/m³' : 'N/A'}</p>
                </div>
                <div style="margin-top: 12px; padding: 12px; background: #fff; border-radius: 10px; border: 1px solid #ddd;">
                    <strong>7-Day Soil Trend</strong>
                    <canvas id="${chartId}" width="560" height="240" style="width:100%; max-width:100%; height:auto; display:block; margin-top: 12px;"></canvas>
                </div>
                <div style="overflow-x: auto; margin-top: 12px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Day</th>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Avg Soil Temp</th>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Avg Soil Moisture</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${soilRows}
                        </tbody>
                    </table>
                </div>
            `;

            resultDiv.appendChild(soilContainer);
            renderSoilChart(chartId, days, avgTemps, avgMoisture);
        })
        .catch(error => {
            if (retries < MAX_RETRIES) {
                console.log(`Retrying soil data fetch... (${retries + 1}/${MAX_RETRIES})`);
                setTimeout(() => fetchSoilData(lat, lon, retries + 1), RETRY_DELAY);
            } else {
                console.error('Soil data fetch failed:', error);
                const errorContainer = document.createElement('div');
                errorContainer.classList.add('fade-in');
                errorContainer.innerHTML = `<p style="color: #d32f2f;">⚠️ Could not fetch soil data from Open-Meteo.</p>`;
                resultDiv.appendChild(errorContainer);
            }
        });
}

function fetchEvapotranspiration(lat, lon, retries = 0) {
    const etUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=et0_fao_evapotranspiration&forecast_days=7&timezone=auto`;

    fetch(etUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data.daily) {
                throw new Error('Evapotranspiration data missing from response');
            }

            const dates = data.daily.time || [];
            const etValues = data.daily.et0_fao_evapotranspiration || [];

            const etRows = dates.slice(0, 7).map((day, index) => `
                <tr>
                    <td>${new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td>${etValues[index] !== undefined ? etValues[index].toFixed(2) : 'N/A'}</td>
                </tr>
            `).join('');

            const etChartId = `etChart-${Date.now()}`;
            const etContainer = document.createElement('div');
            etContainer.classList.add('fade-in');
            etContainer.innerHTML = `
                <h3>💧 Evapotranspiration (Open-Meteo)</h3>
                <div style="margin-top: 10px; padding: 12px; background: #e3f2fd; border-radius: 10px; border: 1px solid #bbdefb; text-align: left;">
                    <p>Daily ET<sub>0</sub> (FAO reference evapotranspiration) in mm.</p>
                </div>
                <div style="margin-top: 12px; padding: 12px; background: #fff; border-radius: 10px; border: 1px solid #ddd;">
                    <strong>7-Day ET₀ Trend</strong>
                    <canvas id="${etChartId}" width="560" height="240" style="width:100%; max-width:100%; height:auto; display:block; margin-top: 12px;"></canvas>
                </div>
                <div style="overflow-x: auto; margin-top: 10px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Day</th>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">ET₀ (mm)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${etRows}
                        </tbody>
                    </table>
                </div>
            `;

            resultDiv.appendChild(etContainer);
            renderETChart(etChartId, dates.slice(0, 7), etValues.slice(0, 7));
        })
        .catch(error => {
            if (retries < MAX_RETRIES) {
                console.log(`Retrying evapotranspiration fetch... (${retries + 1}/${MAX_RETRIES})`);
                setTimeout(() => fetchEvapotranspiration(lat, lon, retries + 1), RETRY_DELAY);
            } else {
                console.error('Evapotranspiration fetch failed:', error);
                const errorContainer = document.createElement('div');
                errorContainer.classList.add('fade-in');
                errorContainer.innerHTML = `<p style="color: #d32f2f;">⚠️ Could not fetch evapotranspiration data.</p>`;
                resultDiv.appendChild(errorContainer);
            }
        });
}

function fetchAgricultureWeather(lat, lon, retries = 0) {
    const agriUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation,windspeed_10m,relativehumidity_2m&forecast_days=7&timezone=auto`;

    fetch(agriUrl)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (!data.hourly) {
                throw new Error('Agriculture weather data missing from response');
            }

            const times = data.hourly.time || [];
            const temps = data.hourly.temperature_2m || [];
            const precip = data.hourly.precipitation || [];
            const wind = data.hourly.windspeed_10m || [];
            const humidity = data.hourly.relativehumidity_2m || [];

            const now = new Date();
            const pad = value => String(value).padStart(2, '0');
            const localHourString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;
            const nowIndex = times.findIndex(t => t === localHourString);
            const currentIndex = nowIndex >= 0 ? nowIndex : 0;

            const currentTemp = temps[currentIndex] ?? null;
            const currentPrecip = precip[currentIndex] ?? null;
            const currentWind = wind[currentIndex] ?? null;
            const currentHumidity = humidity[currentIndex] ?? null;

            const daily = {};
            times.forEach((time, index) => {
                const day = time.split('T')[0];
                if (!daily[day]) {
                    daily[day] = { tempSum: 0, precipSum: 0, windSum: 0, humiditySum: 0, count: 0 };
                }
                daily[day].tempSum += temps[index] ?? 0;
                daily[day].precipSum += precip[index] ?? 0;
                daily[day].windSum += wind[index] ?? 0;
                daily[day].humiditySum += humidity[index] ?? 0;
                daily[day].count += 1;
            });

            const days = Object.keys(daily).slice(0, 7);
            const agriRows = days.map(day => {
                const avgTemp = daily[day].count ? (daily[day].tempSum / daily[day].count).toFixed(1) : 'N/A';
                const totalPrecip = daily[day].precipSum.toFixed(2);
                const avgWind = daily[day].count ? (daily[day].windSum / daily[day].count).toFixed(1) : 'N/A';
                const avgHumidity = daily[day].count ? (daily[day].humiditySum / daily[day].count).toFixed(0) : 'N/A';
                return `
                    <tr>
                        <td>${new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td>${avgTemp} °C</td>
                        <td>${totalPrecip} mm</td>
                        <td>${avgWind} km/h</td>
                        <td>${avgHumidity}%</td>
                    </tr>
                `;
            }).join('');

            const chartId = `agriChart-${Date.now()}`;
            const agriContainer = document.createElement('div');
            agriContainer.classList.add('fade-in');
            agriContainer.innerHTML = `
                <h3>🌾 Agriculture Weather Variables</h3>
                <div style="margin-top: 10px; padding: 12px; background: #fff9c4; border-radius: 10px; border: 1px solid #fff176; text-align: left;">
                    <p><strong>Current temperature:</strong> ${currentTemp !== null ? currentTemp.toFixed(1) + ' °C' : 'N/A'}</p>
                    <p><strong>Current precipitation:</strong> ${currentPrecip !== null ? currentPrecip.toFixed(2) + ' mm' : 'N/A'}</p>
                    <p><strong>Current wind speed:</strong> ${currentWind !== null ? currentWind.toFixed(1) + ' km/h' : 'N/A'}</p>
                    <p><strong>Current humidity:</strong> ${currentHumidity !== null ? currentHumidity.toFixed(0) + '%' : 'N/A'}</p>
                </div>
                <div style="margin-top: 12px; padding: 12px; background: #fff; border-radius: 10px; border: 1px solid #ddd;">
                    <strong>7-Day Agriculture Weather Trend</strong>
                    <canvas id="${chartId}" width="560" height="240" style="width:100%; max-width:100%; height:auto; display:block; margin-top: 12px;"></canvas>
                </div>
                <div style="overflow-x: auto; margin-top: 10px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead>
                            <tr>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Day</th>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Avg Temp</th>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Precip</th>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Avg Wind</th>
                                <th style="text-align:left; padding: 8px; border-bottom: 1px solid #ccc;">Avg Humidity</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${agriRows}
                        </tbody>
                    </table>
                </div>
            `;

            resultDiv.appendChild(agriContainer);
            renderAgriChart(chartId, days, days.map(day => daily[day].tempSum / daily[day].count), days.map(day => daily[day].humiditySum / daily[day].count));
        })
        .catch(error => {
            if (retries < MAX_RETRIES) {
                console.log(`Retrying agriculture weather fetch... (${retries + 1}/${MAX_RETRIES})`);
                setTimeout(() => fetchAgricultureWeather(lat, lon, retries + 1), RETRY_DELAY);
            } else {
                console.error('Agriculture weather fetch failed:', error);
                const errorContainer = document.createElement('div');
                errorContainer.classList.add('fade-in');
                errorContainer.innerHTML = `<p style="color: #d32f2f;">⚠️ Could not fetch agriculture weather variables.</p>`;
                resultDiv.appendChild(errorContainer);
            }
        });
}

function renderETChart(canvasId, labels, etValues) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 45;
    const values = etValues.map(v => parseFloat(v));
    const maxValue = Math.max(...values, 1);
    const minValue = 0;
    const xStep = labels.length > 1 ? (width - padding * 2) / (labels.length - 1) : 0;
    const yScale = (height - padding * 2) / (maxValue - minValue);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + i * ((height - padding * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    ctx.strokeStyle = '#3f51b5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((value - minValue) * yScale);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = '#3f51b5';
    values.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((value - minValue) * yScale);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + index * xStep;
        const y = height - padding + 18;
        ctx.fillText(new Date(label).toLocaleDateString('en-US', { weekday: 'short' }), x, y);
    });

    ctx.fillStyle = '#3f51b5';
    ctx.fillText('ET₀ (mm)', width - padding - 60, padding - 20);
}

function renderAgriChart(canvasId, labels, tempValues, humidityValues) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 45;

    const tempVals = tempValues.map(v => parseFloat(v));
    const humVals = humidityValues.map(v => parseFloat(v));
    const values = tempVals.concat(humVals);
    const maxValue = Math.max(...values, 1);
    const minValue = 0;
    const xStep = labels.length > 1 ? (width - padding * 2) / (labels.length - 1) : 0;
    const yScale = (height - padding * 2) / (maxValue - minValue);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + i * ((height - padding * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    ctx.strokeStyle = '#ef5350';
    ctx.lineWidth = 2;
    ctx.beginPath();
    tempVals.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((value - minValue) * yScale);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.strokeStyle = '#42a5f5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    humVals.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((value - minValue) * yScale);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    tempVals.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((value - minValue) * yScale);
        ctx.fillStyle = '#ef5350';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
    });

    humVals.forEach((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((value - minValue) * yScale);
        ctx.fillStyle = '#42a5f5';
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + index * xStep;
        const y = height - padding + 18;
        ctx.fillText(new Date(label).toLocaleDateString('en-US', { weekday: 'short' }), x, y);
    });

    ctx.fillStyle = '#ef5350';
    ctx.fillText('Avg Temp (°C)', padding + 70, padding - 20);
    ctx.fillStyle = '#42a5f5';
    ctx.fillText('Avg Humidity (%)', width - padding - 85, padding - 20);
}

function renderSoilChart(canvasId, labels, tempValues, moistureValues) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 45;

    const scaledMoisture = moistureValues.map(v => parseFloat(v) * 100);
    const values = tempValues.map(v => parseFloat(v)).concat(scaledMoisture.map(v => parseFloat(v)));
    const maxValue = Math.max(...values, 1);
    const minValue = 0;
    const xStep = labels.length > 1 ? (width - padding * 2) / (labels.length - 1) : 0;
    const yScale = (height - padding * 2) / (maxValue - minValue);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + i * ((height - padding * 2) / 5);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }

    ctx.strokeStyle = '#f44336';
    ctx.lineWidth = 2;
    ctx.beginPath();
    tempValues.forEach((temp, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((parseFloat(temp) - minValue) * yScale);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.strokeStyle = '#2196f3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    moistureValues.forEach((moist, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((parseFloat(moist) * 100 - minValue) * yScale);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    tempValues.forEach((temp, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((parseFloat(temp) - minValue) * yScale);
        ctx.fillStyle = '#f44336';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    moistureValues.forEach((moist, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((parseFloat(moist) * 100 - minValue) * yScale);
        ctx.fillStyle = '#2196f3';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + index * xStep;
        const y = height - padding + 18;
        ctx.fillText(new Date(label).toLocaleDateString('en-US', { weekday: 'short' }), x, y);
    });

    ctx.fillStyle = '#f44336';
    ctx.fillText('Soil Temp (°C)', padding + 60, padding - 20);
    ctx.fillStyle = '#2196f3';
    ctx.fillText('Soil Moisture (x100)', width - padding - 80, padding - 20);
}

// Check for weather alerts
function checkWeatherAlerts(data) {
    const alerts = [];
    const temp = data.main.temp;
    const windSpeed = data.wind.speed;
    const humidity = data.main.humidity;
    const condition = data.weather[0].main.toLowerCase();

    if (temp > 40) {
        alerts.push('🔥 Extreme heat warning! Temperature exceeds 40°C.');
    } else if (temp < 0) {
        alerts.push('❄️ Freezing conditions! Temperature below 0°C.');
    }

    if (windSpeed > 10) {
        alerts.push('💨 Strong wind warning! Wind speed exceeds 10 m/s.');
    }

    if (humidity > 90) {
        alerts.push('💧 High humidity alert! Humidity exceeds 90%.');
    }

    if (condition.includes('thunderstorm')) {
        alerts.push('⚡ Thunderstorm warning! Severe weather approaching.');
    } else if (condition.includes('tornado')) {
        alerts.push('🌪️ Tornado alert! Dangerous weather conditions.');
    }

    return alerts;
}

// Save weather history to localStorage
function saveWeatherHistory(data) {
    const weatherHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    
    const entry = {
        city: data.name,
        temp: data.main.temp,
        condition: data.weather[0].main,
        timestamp: new Date().toLocaleString(),
        date: new Date().toISOString()
    };

    weatherHistory.push(entry);
    
    // Keep only last 50 entries
    if (weatherHistory.length > 50) {
        weatherHistory.shift();
    }

    localStorage.setItem('weatherHistory', JSON.stringify(weatherHistory));
    displayWeatherHistory();
}

// Display weather history
function displayWeatherHistory() {
    const weatherHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    
    if (weatherHistory.length === 0) return;

    const historyContainer = document.createElement('div');
    historyContainer.classList.add('fade-in');
    historyContainer.innerHTML = `<h3>📊 Weather History (Last 10 searches)</h3><div style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
        <table style="width: 100%; font-size: 12px;">
            <tr style="border-bottom: 1px solid #ddd;">
                <th style="text-align: left;">City</th>
                <th style="text-align: left;">Temp</th>
                <th style="text-align: left;">Condition</th>
                <th style="text-align: left;">Time</th>
            </tr>
            ${weatherHistory.slice(-10).reverse().map(entry => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td>${entry.city}</td>
                    <td>${entry.temp}°C</td>
                    <td>${entry.condition}</td>
                    <td>${entry.timestamp}</td>
                </tr>
            `).join('')}
        </table>
    </div>`;

    resultDiv.appendChild(historyContainer);
}

// Adds animated visual effects based on weather condition
function setVisualEffect(condition) {
    const effectContainer = document.getElementById('weather-effects');
    effectContainer.innerHTML = ''; // Clear previous

    if (condition.includes('rain')) {
        for (let i = 0; i < 80; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = `${Math.random() * 100}vw`;
            drop.style.animationDuration = `${0.5 + Math.random()}s`;
            drop.style.animationDelay = `${Math.random()}s`;
            effectContainer.appendChild(drop);
        }
    }

    if (condition.includes('clear')) {
        const sun = document.createElement('div');
        sun.className = 'sun';
        effectContainer.appendChild(sun);
    }

    // You can add more: thunder, snow, fog, etc.
}