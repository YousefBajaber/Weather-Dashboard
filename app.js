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

const recentSearchesEl = document.getElementById("recentSearches");
const celsiusBtn = document.getElementById("celsiusBtn");
const fahrenheitBtn = document.getElementById("fahrenheitBtn");

let lastSearchedCity = "";
let debounceTimer;

let currentUnit = "C";
let lastWeatherData = null;
let lastCityData = null;
let recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || [];

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

cityInput.addEventListener("input", function () {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(function () {
    const cityName = cityInput.value.trim();

    if (cityName.length >= 2) {
      searchCity();
    }
  }, 500);
});

retryBtn.addEventListener("click", function () {
  if (lastSearchedCity !== "") {
    cityInput.value = lastSearchedCity;
    searchCity();
  }
});

celsiusBtn.addEventListener("click", function () {
  currentUnit = "C";
  celsiusBtn.classList.add("active-unit");
  fahrenheitBtn.classList.remove("active-unit");

  if (lastWeatherData && lastCityData) {
    populateCurrentWeather(lastCityData, lastWeatherData);
    populateForecast(lastWeatherData.daily);
  }
});

fahrenheitBtn.addEventListener("click", function () {
  currentUnit = "F";
  fahrenheitBtn.classList.add("active-unit");
  celsiusBtn.classList.remove("active-unit");

  if (lastWeatherData && lastCityData) {
    populateCurrentWeather(lastCityData, lastWeatherData);
    populateForecast(lastWeatherData.daily);
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

  if (cityName.length < 2) {
    errorMessage.textContent = "Please enter at least 2 characters.";
    return;
  }

  lastSearchedCity = cityName;

  try {
    addCurrentWeatherSkeleton();
    addForecastSkeleton();

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`;

    const geoData = await fetchWithTimeout(geoUrl);

    if (!geoData.results || geoData.results.length === 0) {
      errorMessage.textContent = "City not found. Please try again.";
      removeCurrentWeatherSkeleton();
      removeForecastSkeleton();
      return;
    }

    const city = geoData.results[0];
    const latitude = city.latitude;
    const longitude = city.longitude;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode`;

    const weatherData = await fetchWithTimeout(weatherUrl);

    lastWeatherData = weatherData;
    lastCityData = city;

    saveRecentSearch(city.name);

    hideErrorBanner();
    populateCurrentWeather(city, weatherData);
    populateForecast(weatherData.daily);
    fetchLocalTime(city.timezone);

    removeCurrentWeatherSkeleton();
    removeForecastSkeleton();
  } catch (error) {
    showErrorBanner(error.message || "Network error. Please try again.");
    console.error(error);
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();

  const timeoutId = setTimeout(function () {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error("Request timeout. Please try again.");
    }

    throw error;
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
  temperatureEl.textContent = formatTemperature(current.temperature);
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
    tempEl.textContent = `${formatTemperature(dailyData.temperature_2m_max[i])} / ${formatTemperature(dailyData.temperature_2m_min[i])}`;
  }
}

function fetchLocalTime(timezone) {
  if (!timezone) {
    localTimeEl.textContent = "Timezone unavailable";
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
      const cityTime = new Date().toLocaleString("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      localTimeEl.textContent = cityTime;
    })
    .always(function () {
      const timestamp = new Date().toLocaleString();
      console.log("WorldTimeAPI request completed at:", timestamp);
    });
}

function formatTemperature(celsius) {
  if (currentUnit === "F") {
    const fahrenheit = (celsius * 9) / 5 + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  }

  return `${celsius}°C`;
}

function saveRecentSearch(cityName) {
  recentSearches = recentSearches.filter(function (city) {
    return city.toLowerCase() !== cityName.toLowerCase();
  });

  recentSearches.unshift(cityName);
  recentSearches = recentSearches.slice(0, 5);

  localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  displayRecentSearches();
}

function displayRecentSearches() {
  recentSearchesEl.innerHTML = "";

  recentSearches.forEach(function (city) {
    const chip = document.createElement("span");
    chip.className = "search-chip";
    chip.textContent = city;

    chip.addEventListener("click", function () {
      cityInput.value = city;
      searchCity();
    });

    recentSearchesEl.appendChild(chip);
  });
}

function addCurrentWeatherSkeleton() {
  cityNameEl.textContent = "";
  temperatureEl.textContent = "";
  descriptionEl.textContent = "";
  humidityEl.textContent = "";
  windSpeedEl.textContent = "";
  localTimeEl.textContent = "";

  cityNameEl.classList.add("skeleton", "skeleton-text");
  temperatureEl.classList.add("skeleton", "skeleton-text");
  descriptionEl.classList.add("skeleton", "skeleton-text");
  humidityEl.classList.add("skeleton", "skeleton-text");
  windSpeedEl.classList.add("skeleton", "skeleton-text");
  localTimeEl.classList.add("skeleton", "skeleton-text");
}

function addForecastSkeleton() {
  for (let i = 1; i <= 7; i++) {
    document.getElementById(`day${i}`).textContent = "";
    document.getElementById(`icon${i}`).textContent = "";
    document.getElementById(`temp${i}`).textContent = "";

    document.getElementById(`day${i}`).classList.add("skeleton", "skeleton-day");
    document.getElementById(`icon${i}`).classList.add("skeleton", "skeleton-icon");
    document.getElementById(`temp${i}`).classList.add("skeleton", "skeleton-temp");
  }
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

displayRecentSearches();