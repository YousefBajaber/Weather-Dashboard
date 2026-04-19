const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const errorMessage = document.getElementById("errorMessage");
const errorBanner = document.getElementById("errorBanner");
const errorBannerText = document.getElementById("errorBannerText");
const retryBtn = document.getElementById("retryBtn");

const cityNameEl = document.getElementById("cityName");
const temperatureEl = document.getElementById("temperature");
const descriptionEl = document.getElementById("description");
const humidityEl = document.getElementById("humidity");
const windSpeedEl = document.getElementById("windSpeed");
const localTimeEl = document.getElementById("localTime");

let lastSearchedCity = "";

const weatherCodes = {
  0: { text: "Clear sky", icon: "☀️" },
  1: { text: "Mainly clear", icon: "🌤️" },
  2: { text: "Partly cloudy", icon: "⛅" },
  3: { text: "Overcast", icon: "☁️" },
  45: { text: "Fog", icon: "🌫️" },
  48: { text: "Rime fog", icon: "🌫️" },
  51: { text: "Light drizzle", icon: "🌦️" },
  53: { text: "Moderate drizzle", icon: "🌦️" },
  55: { text: "Heavy drizzle", icon: "🌧️" },
  61: { text: "Slight rain", icon: "🌧️" },
  63: { text: "Moderate rain", icon: "🌧️" },
  65: { text: "Heavy rain", icon: "⛈️" },
  71: { text: "Light snow", icon: "❄️" },
  73: { text: "Moderate snow", icon: "❄️" },
  75: { text: "Heavy snow", icon: "❄️" },
  80: { text: "Rain showers", icon: "🌦️" },
  81: { text: "Moderate showers", icon: "🌦️" },
  82: { text: "Heavy showers", icon: "⛈️" },
  95: { text: "Thunderstorm", icon: "⛈️" }
};

searchBtn.addEventListener("click", searchCity);

retryBtn.addEventListener("click", function () {
  if (lastSearchedCity !== "") {
    cityInput.value = lastSearchedCity;
    searchCity();
  }
});

async function searchCity() {
  const cityName = cityInput.value.trim();

  errorMessage.textContent = "";
  hideErrorBanner();

  if (cityName === "") {
    errorMessage.textContent = "Please enter a city name.";
    return;
  }

  lastSearchedCity = cityName;

  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`;

    const geoResponse = await fetch(geoUrl);

    if (!geoResponse.ok) {
      throw new Error("Geocoding failed");
    }

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      errorMessage.textContent = "City not found. Please try again.";
      return;
    }

    const city = geoData.results[0];
    const latitude = city.latitude;
    const longitude = city.longitude;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode`;

    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error("Weather fetch failed");
    }

    const weatherData = await weatherResponse.json();

    hideErrorBanner();
    populateCurrentWeather(city, weatherData);
    populateForecast(weatherData.daily);
    fetchLocalTime(city.timezone);

    removeCurrentWeatherSkeleton();
    removeForecastSkeleton();
  } catch (error) {
    showErrorBanner("Network error. Please try again.");
    console.error(error);
  }
}

function populateCurrentWeather(city, weatherData) {
  const current = weatherData.current_weather;
  const hourly = weatherData.hourly;

  let humidity = "--";

  if (
    hourly &&
    hourly.time &&
    hourly.relativehumidity_2m &&
    hourly.time.length === hourly.relativehumidity_2m.length
  ) {
    const humidityIndex = hourly.time.indexOf(current.time);

    if (humidityIndex !== -1) {
      humidity = hourly.relativehumidity_2m[humidityIndex];
    } else if (hourly.relativehumidity_2m.length > 0) {
      humidity = hourly.relativehumidity_2m[0];
    }
  }

  const weatherInfo = weatherCodes[current.weathercode] || {
    text: "Unknown",
    icon: "❔"
  };

  cityNameEl.textContent = city.name;
  temperatureEl.textContent = `${current.temperature}°C`;
  descriptionEl.textContent = `${weatherInfo.icon} ${weatherInfo.text}`;
  humidityEl.textContent = `${humidity}%`;
  windSpeedEl.textContent = `${current.windspeed} km/h`;
  localTimeEl.textContent = current.time.replace("T", " ");
}

function populateForecast(dailyData) {
  for (let i = 0; i < 7; i++) {
    const dayEl = document.getElementById(`day${i + 1}`);
    const iconEl = document.getElementById(`icon${i + 1}`);
    const tempEl = document.getElementById(`temp${i + 1}`);

    const date = new Date(dailyData.time[i]);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

    const code = dailyData.weathercode[i];
    const weatherInfo = weatherCodes[code] || {
      text: "Unknown",
      icon: "❔"
    };

    dayEl.textContent = dayName;
    iconEl.textContent = weatherInfo.icon;
    tempEl.textContent = `${dailyData.temperature_2m_max[i]}°C / ${dailyData.temperature_2m_min[i]}°C`;
  }
}

function fetchLocalTime(timezone) {
  if (!timezone) {
    displayBrowserTime();
    return;
  }

  const timeUrl = `https://worldtimeapi.org/api/timezone/${timezone}`;

  $.getJSON(timeUrl)
    .done(function (timeData) {
      const dateTime = timeData.datetime;
      const formattedTime = dateTime.replace("T", " ").slice(0, 16);
      localTimeEl.textContent = formattedTime;
    })
    .fail(function () {
      displayBrowserTime();
    })
    .always(function () {
      const timestamp = new Date().toLocaleString();
      console.log("WorldTimeAPI request completed at:", timestamp);
    });
}

function displayBrowserTime() {
  const now = new Date();
  localTimeEl.textContent = now.toLocaleString();
}

function removeCurrentWeatherSkeleton() {
  cityNameEl.classList.remove("skeleton", "skeleton-text");
  temperatureEl.classList.remove("skeleton", "skeleton-text");
  descriptionEl.classList.remove("skeleton", "skeleton-text");
  humidityEl.classList.remove("skeleton", "skeleton-text");
  windSpeedEl.classList.remove("skeleton", "skeleton-text");
  localTimeEl.classList.remove("skeleton", "skeleton-text");
}

function removeForecastSkeleton() {
  for (let i = 1; i <= 7; i++) {
    document.getElementById(`day${i}`).classList.remove("skeleton", "skeleton-day");
    document.getElementById(`icon${i}`).classList.remove("skeleton", "skeleton-icon");
    document.getElementById(`temp${i}`).classList.remove("skeleton", "skeleton-temp");
  }
}

function showErrorBanner(message) {
  errorBannerText.textContent = message;
  errorBanner.classList.remove("hidden");
}

function hideErrorBanner() {
  errorBanner.classList.add("hidden");
}