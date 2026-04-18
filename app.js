const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const errorMessage = document.getElementById("errorMessage");

searchBtn.addEventListener("click", searchCity);

async function searchCity() {
  const cityName = cityInput.value.trim();

  errorMessage.textContent = "";

  if (cityName === "") {
    errorMessage.textContent = "Please enter a city name.";
    return;
  }

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`;

  const geoResponse = await fetch(geoUrl);
  const geoData = await geoResponse.json();

  if (!geoData.results || geoData.results.length === 0) {
    errorMessage.textContent = "City not found. Please try again.";
    return;
  }

  const city = geoData.results[0];
  const latitude = city.latitude;
  const longitude = city.longitude;

  console.log("Latitude:", latitude);
  console.log("Longitude:", longitude);

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode`;

  const weatherResponse = await fetch(weatherUrl);
  const weatherData = await weatherResponse.json();

  console.log(weatherData);
}