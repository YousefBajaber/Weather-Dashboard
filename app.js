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

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    errorMessage.textContent = "City not found. Please try again.";
    return;
  }

  const city = data.results[0];
  const latitude = city.latitude;
  const longitude = city.longitude;

  console.log("Latitude:", latitude);
  console.log("Longitude:", longitude);
}