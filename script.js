const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

navToggle.addEventListener("click", () => {
  const isOpen = siteNav.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16 });

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

const STREAMLIT_API_BASE = window.SAFETOUR_STREAMLIT_API_BASE || "https://safetourai-5sxunyvzj3n9ylv6knjedc.streamlit.app/?embedded=true";

const fields = {
  weather: document.querySelector("#weather"),
  crime: document.querySelector("#crime"),
  crowd: document.querySelector("#crowd"),
  time: document.querySelector("#time"),
  distance: document.querySelector("#distance")
};

const scoreValue = document.querySelector("#score-value");
const scoreRing = document.querySelector("#score-ring");
const riskLevel = document.querySelector("#risk-level");
const riskBar = document.querySelector("#risk-bar");
const recommendation = document.querySelector("#recommendation");
const simulateLocation = document.querySelector("#simulate-location");
const requestPrediction = document.querySelector("#request-prediction");
const simulationLog = document.querySelector("#simulation-log");
const liveEmergencyButton = document.querySelector("#live-emergency");
const offlineCard = document.querySelector("#offline-card");
const offlineStatus = document.querySelector("#offline-status");
let safetyMap;
let touristMarker;

const mockSafetyData = {
  tourist: [13.0827, 80.2707],
  hospitals: [
    { name: "Government General Hospital", coords: [13.0818, 80.2760] },
    { name: "Apollo Emergency Care", coords: [13.0648, 80.2517] }
  ],
  police: [
    { name: "Central Police Station", coords: [13.0878, 80.2731] },
    { name: "Triplicane Police Station", coords: [13.0588, 80.2756] }
  ],
  safeZones: [
    { name: "Tourist Help Center", coords: [13.0752, 80.2639], radius: 420 },
    { name: "Railway Public Zone", coords: [13.0836, 80.2750], radius: 350 }
  ],
  riskZones: [
    { name: "Low-light Isolated Street", coords: [13.0715, 80.2592], radius: 330 },
    { name: "Reported Scam Zone", coords: [13.0899, 80.2662], radius: 270 }
  ]
};

function updateOutputs() {
  Object.values(fields).forEach((field) => {
    const output = field.parentElement.querySelector("output");
    if (output) output.value = field.value;
  });
}

function collectPredictionPayload() {
  return {
    crime_history_index: Number(fields.crime.value),
    weather_conditions: Number(fields.weather.value),
    crowd_density: Number(fields.crowd.value),
    emergency_services_availability: Number(fields.distance.value),
    time_risk: Number(fields.time.value)
  };
}

function renderPrediction(data) {
  const safetyScore = Number(data.safety_score ?? data.score ?? data.prediction);
  const riskScore = Math.max(0, Math.min(100, 100 - safetyScore));
  const levelValue = data.risk_level ?? data.risk ?? data.classification;
  const level = String(levelValue || "unknown").toLowerCase();
  let color = "var(--amber)";

  if (level === "low") color = "var(--green)";
  if (level === "high") color = "var(--red)";

  scoreValue.textContent = Number.isFinite(safetyScore) ? Math.round(safetyScore) : "--";
  scoreRing.style.setProperty("--score", Number.isFinite(safetyScore) ? safetyScore : 0);
  scoreRing.style.setProperty("--ring-color", color);
  riskLevel.textContent = levelValue || "Model Response";
  riskLevel.style.color = color;
  riskBar.style.width = `${Number.isFinite(riskScore) ? riskScore : 0}%`;
  riskBar.style.background = color;
  recommendation.textContent = data.recommendation ?? data.message ?? "Prediction received from the trained model API.";
  handleRiskActions(safetyScore, level);
}

function handleRiskActions(score, level) {

    // Hide all sections first
    document.querySelector("#danger-alert").style.display = "none";
    document.querySelector("#warning-alert").style.display = "none";
    document.querySelector("#emergency-services").style.display = "none";
    document.querySelector("#safe-route").style.display = "none";

    // Remove SOS animation
    document.querySelector(".sos-pulse").classList.remove("danger");

    if (level === "high") {

        // Show danger alert
        document.querySelector("#danger-alert").style.display = "block";

        // Highlight SOS button
        document.querySelector(".sos-pulse").classList.add("danger");

        // Show emergency services
        document.querySelector("#emergency-services").style.display = "block";

        // Show recommended safe route
        document.querySelector("#safe-route").style.display = "block";

    }
    else if (level === "medium") {

        document.querySelector("#warning-alert").style.display = "block";

    }
}

function renderPredictionError() {
  scoreValue.textContent = "--";
  scoreRing.style.setProperty("--score", 0);
  scoreRing.style.setProperty("--ring-color", "var(--amber)");
  riskLevel.textContent = "API Not Connected";
  riskLevel.style.color = "var(--amber)";
  riskBar.style.width = "0%";
  recommendation.textContent = `No prediction returned. Start the Streamlit API and expose ${STREAMLIT_API_BASE}/predict-risk, or set window.SAFETOUR_STREAMLIT_API_BASE before loading script.js.`;
}

async function requestModelPrediction() {
  requestPrediction.textContent = "Requesting Model...";
  requestPrediction.disabled = true;
  try {
    const response = await fetch(`${STREAMLIT_API_BASE}/predict-risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(collectPredictionPayload())
    });
    if (!response.ok) throw new Error("Prediction API unavailable");
    const data = await response.json();
    renderPrediction(data);
    return data;
  } catch {
    renderPredictionError();
    return null;
  } finally {
    requestPrediction.textContent = "Request Model Prediction";
    requestPrediction.disabled = false;
  }
}

Object.values(fields).forEach((field) => {
  field.addEventListener("input", () => {
    updateOutputs();
  });
});

requestPrediction.addEventListener("click", requestModelPrediction);

simulateLocation.addEventListener("click", () => {
  fields.weather.value = 35;
  fields.crime.value = 78;
  fields.crowd.value = 22;
  fields.time.value = 68;
  fields.distance.value = 18;
  updateOutputs();
  recommendation.textContent = "High-risk input values loaded. Click Request Model Prediction to call the trained Random Forest API.";
});

updateOutputs();

function initMap() {
  const mapElement = document.querySelector("#safety-map");
  if (!mapElement) return;

  if (!window.L) {
    mapElement.innerHTML = "<div class='map-fallback'>OpenStreetMap preview unavailable offline. Mock layers are still represented in the legend and simulation.</div>";
    return;
  }

  safetyMap = L.map("safety-map", { scrollWheelZoom: false }).setView(mockSafetyData.tourist, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(safetyMap);

  touristMarker = L.circleMarker(mockSafetyData.tourist, {
    radius: 9,
    color: "#38d9ff",
    fillColor: "#38d9ff",
    fillOpacity: 0.9
  }).addTo(safetyMap).bindPopup("Current Tourist Location");

  mockSafetyData.hospitals.forEach((place) => {
    L.marker(place.coords).addTo(safetyMap).bindPopup(`Hospital: ${place.name}`);
  });

  mockSafetyData.police.forEach((place) => {
    L.marker(place.coords).addTo(safetyMap).bindPopup(`Police: ${place.name}`);
  });

  mockSafetyData.safeZones.forEach((zone) => {
    L.circle(zone.coords, {
      radius: zone.radius,
      color: "#43e7a7",
      fillColor: "#43e7a7",
      fillOpacity: 0.14
    }).addTo(safetyMap).bindPopup(`Safe Zone: ${zone.name}`);
  });

  mockSafetyData.riskZones.forEach((zone) => {
    L.circle(zone.coords, {
      radius: zone.radius,
      color: "#ff5c7a",
      fillColor: "#ff5c7a",
      fillOpacity: 0.18
    }).addTo(safetyMap).bindPopup(`High-Risk Zone: ${zone.name}`);
  });
}

initMap();

const trustedName = document.querySelector("#trusted-name");
const trustedContact = document.querySelector("#trusted-contact");
const contactManager = document.querySelector("#contact-manager");
const trustedList = document.querySelector("#trusted-list");
const notifyContacts = document.querySelector("#notify-contacts");
const languageSelect = document.querySelector("#language-select");
const translatedMessage = document.querySelector("#translated-message");

const emergencyTranslations = {
  en: "Emergency Alert: Assistance may be required. Last known location attached. Please check on the traveler immediately.",
  ta: "அவசர எச்சரிக்கை: உதவி தேவைப்படலாம். கடைசியாக அறியப்பட்ட இடம் இணைக்கப்பட்டுள்ளது. பயணியைக் உடனே சரிபார்க்கவும்.",
  hi: "आपातकालीन सूचना: सहायता की आवश्यकता हो सकती है। अंतिम ज्ञात स्थान संलग्न है। कृपया यात्री की तुरंत जांच करें।",
  fr: "Alerte d'urgence : une assistance peut etre necessaire. La derniere position connue est jointe. Veuillez verifier immediatement le voyageur.",
  ja: "緊急アラート: 支援が必要な可能性があります。最後に確認された位置情報を添付しました。旅行者の状況をすぐに確認してください。"
};

function getTrustedContacts() {
  const saved = localStorage.getItem("safetour_contacts");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem("safetour_contacts");
    }
  }
  return [
    { name: "Family Contact", contact: "+91 90000 00000" },
    { name: "Hotel Front Desk", contact: "frontdesk@example.com" }
  ];
}

function saveTrustedContacts(contacts) {
  localStorage.setItem("safetour_contacts", JSON.stringify(contacts));
}

function renderTrustedContacts() {
  const contacts = getTrustedContacts();
  trustedList.innerHTML = "";

  if (!contacts.length) {
    trustedList.innerHTML = "<p>No trusted contacts saved yet.</p>";
    return;
  }

  contacts.forEach((item, index) => {
    const row = document.createElement("div");
    const text = document.createElement("div");
    const name = document.createElement("strong");
    const contact = document.createElement("span");
    const remove = document.createElement("button");

    row.className = "trusted-item";
    name.textContent = item.name;
    contact.textContent = item.contact;
    remove.type = "button";
    remove.dataset.index = String(index);
    remove.setAttribute("aria-label", `Remove ${item.name}`);
    remove.textContent = "x";
    text.append(name, contact);
    row.append(text, remove);
    trustedList.appendChild(row);
  });
}

contactManager.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = trustedName.value.trim();
  const contact = trustedContact.value.trim();
  if (!name || !contact) return;
  const contacts = getTrustedContacts();
  contacts.push({ name, contact });
  saveTrustedContacts(contacts);
  trustedName.value = "";
  trustedContact.value = "";
  renderTrustedContacts();
});

trustedList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button) return;
  const contacts = getTrustedContacts();
  contacts.splice(Number(button.dataset.index), 1);
  saveTrustedContacts(contacts);
  renderTrustedContacts();
});

notifyContacts.addEventListener("click", () => {
  const contacts = getTrustedContacts();
  notifyContacts.textContent = `${contacts.length} contacts notified in simulation`;
  setTimeout(() => {
    notifyContacts.textContent = "Simulate Emergency Notification";
  }, 2600);
});

renderTrustedContacts();

languageSelect.addEventListener("change", () => {
  translatedMessage.textContent = emergencyTranslations[languageSelect.value];
});

function updateOfflineMode() {
  const online = navigator.onLine;
  offlineCard.classList.toggle("online", online);
  offlineCard.classList.toggle("offline", !online);
  offlineStatus.textContent = online
    ? "Online mode active. Live APIs can refresh safety data."
    : "Offline mode active. Using cached contacts, saved help centers, and SOS fallback.";
}

window.addEventListener("online", updateOfflineMode);
window.addEventListener("offline", updateOfflineMode);
updateOfflineMode();

function writeSimulation(message) {
  const line = document.createElement("p");
  line.textContent = message;
  simulationLog.prepend(line);
}

async function runEmergencySimulation() {
  fields.weather.value = 58;
  fields.crime.value = 86;
  fields.crowd.value = 18;
  fields.time.value = 68;
  fields.distance.value = 16;
  updateOutputs();
  const prediction = await requestModelPrediction();

  const riskyPoint = mockSafetyData.riskZones[0].coords;
  if (touristMarker && safetyMap) {
    touristMarker.setLatLng(riskyPoint).bindPopup("Tourist entered a high-risk zone").openPopup();
    safetyMap.flyTo(riskyPoint, 15, { duration: 1.2 });
  }

  document.querySelector(".ai-result").classList.add("simulation-active");
  setTimeout(() => document.querySelector(".ai-result").classList.remove("simulation-active"), 4200);

  const contacts = getTrustedContacts();
  const steps = [
    "Tourist entered a marked high-risk zone.",
    prediction
      ? "Trained Random Forest API returned the current safety score."
      : "Streamlit prediction API is not connected, so no model score was invented.",
    prediction
      ? "Safety alert generated from model recommendation."
      : "Safety alert waits for the trained model endpoint in production.",
    "SOS workflow activated with last known GPS location.",
    `${contacts.length} trusted contacts notified in simulation.`,
    "Nearest police station displayed: Central Police Station, 0.8 km."
  ];

  simulationLog.innerHTML = "";
  steps.forEach((step, index) => {
    setTimeout(() => writeSimulation(step), index * 650);
  });
}

liveEmergencyButton.addEventListener("click", runEmergencySimulation);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {
    // The service worker is optional for local demos opened from file://.
  });
}

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#name").value.trim();
  const email = document.querySelector("#email").value.trim();
  const message = document.querySelector("#message").value.trim();
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!name || !email || !message) {
    formStatus.textContent = "Please complete all fields before sending.";
    formStatus.style.color = "var(--amber)";
    return;
  }

  if (!emailLooksValid) {
    formStatus.textContent = "Please enter a valid email address.";
    formStatus.style.color = "var(--amber)";
    return;
  }

  formStatus.textContent = "Message prepared. In production this connects to the SafeTour backend.";
  formStatus.style.color = "var(--green)";
  contactForm.reset();
});
