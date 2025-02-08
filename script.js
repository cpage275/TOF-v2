let presence = false;
let pigeonData = {}; // Stores daily pigeon counts
let proximityData = []; // Stores proximity values for "by day" chart
let lastThreeReadings = [];
let pigeonDetected = false;
let startDate = new Date();
startDate.setDate(startDate.getDate() - 6); // Default to last 7 days
let chartMode = "week"; // 'week' or 'day'
let pigeonChart, proximityChart;

// Fetch and update every 2 seconds
function setup() {
  createCharts();
  setInterval(fetchText, 2000);
}

// Fetch log.json safely
function fetchText() {
  fetch('log.json?nocache=' + new Date().getTime(), { cache: "no-store" })
    .then(response => response.text())
    .then(data => processSensorData(data))
    .catch(error => console.error("Error fetching data:", error));
}

// Process fetched data from log.json
function processSensorData(data) {
  let lines = data.trim().split("\n").filter(line => line.trim() !== "");

  if (lines.length > 0) {
    try {
      let lastEntry = JSON.parse(lines[lines.length - 1]);
      let distance = lastEntry.sensor;
      console.log("Latest Distance:", distance);

      updatePresence(distance);
      updateCharts();
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  }
}

// Handle pigeon detection logic
function updatePresence(distance) {
  lastThreeReadings.push(distance);
  if (lastThreeReadings.length > 3) lastThreeReadings.shift();

  let consecutiveLow = lastThreeReadings.every(d => d < 4000);
  let consecutiveHigh = lastThreeReadings.every(d => d > 4000);

  if (consecutiveLow && !pigeonDetected) {
    pigeonDetected = true;
    presence = true;
    document.getElementById("currentPresence").innerText = "Yes!";
    document.getElementById("currentPresence").style.color = "#52CF8C";

    let currentDate = new Date().toISOString().split("T")[0];
    if (!pigeonData[currentDate]) pigeonData[currentDate] = 0;
    pigeonData[currentDate]++;
    document.getElementById("totalPigeons").innerText = Object.values(pigeonData).reduce((sum, val) => sum + val, 0);
  }

  if (consecutiveHigh && pigeonDetected) {
    pigeonDetected = false;
    presence = false;
    document.getElementById("currentPresence").innerText = "No";
    document.getElementById("currentPresence").style.color = "#EE4848";
  }

  if (pigeonDetected) {
    let now = new Date();
    proximityData.push({
      time: now,
      distance: mapProximity(distance)
    });
    
    // Keep only today's data in proximityData
    let todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    proximityData = proximityData.filter(d => d.time >= todayStart);
  }
}

// Map ToF sensor values to "far" (bottom) to "close" (top)
function mapProximity(distance) {
  return Math.max(0, 4000 - distance) / 40;
}

function createCharts() {
  let ctxBar = document.getElementById("pigeonChart").getContext("2d");
  let ctxLine = document.getElementById("proximityChart").getContext("2d");

  if (pigeonChart) pigeonChart.destroy();
  if (proximityChart) proximityChart.destroy();

  pigeonChart = new Chart(ctxBar, {
    type: "bar",
    data: {
      labels: getWeekLabels(),
      datasets: [{ 
        label: "Pigeon Count", 
        data: getWeekData(), 
        backgroundColor: "#126aef" 
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { autoSkip: false } },
        y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
      }
    }
  });

  proximityChart = new Chart(ctxLine, {
    type: "line",
    data: {
      labels: [],
      datasets: [{ 
        label: "Proximity", 
        data: [], 
        borderColor: "black", 
        fill: false 
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'hour',
            displayFormats: {
              hour: 'HH:mm'
            }
          }
        },
        y: { 
          beginAtZero: true,
          max: 100
        }
      }
    }
  });
}

function getWeekLabels() {
  let labels = [];
  let tempDate = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    labels.push(tempDate.toLocaleDateString("en-US", { 
      weekday: "short", 
      month: "numeric", 
      day: "numeric" 
    }));
    tempDate.setDate(tempDate.getDate() + 1);
  }
  return labels;
}

function getWeekData() {
  let data = [];
  let tempDate = new Date(startDate);
  
  for (let i = 0; i < 7; i++) {
    let dateStr = tempDate.toISOString().split("T")[0];
    data.push(pigeonData[dateStr] || 0);
    tempDate.setDate(tempDate.getDate() + 1);
  }
  return data;
}

function updateCharts() {
  if (!pigeonChart || !proximityChart) return;

  if (chartMode === "week") {
    pigeonChart.data.labels = getWeekLabels();
    pigeonChart.data.datasets[0].data = getWeekData();
    pigeonChart.update();
    document.getElementById("pigeonChart").style.display = "block";
    document.getElementById("proximityChart").style.display = "none";
  } else {
    proximityChart.data.datasets[0].data = proximityData.map(d => ({
      x: d.time,
      y: d.distance
    }));
    proximityChart.update();
    document.getElementById("pigeonChart").style.display = "none";
    document.getElementById("proximityChart").style.display = "block";
  }
}

function prevPeriod() {
  startDate.setDate(startDate.getDate() - (chartMode === "week" ? 7 : 1));
  updateCharts();
}

function nextPeriod() {
  startDate.setDate(startDate.getDate() + (chartMode === "week" ? 7 : 1));
  updateCharts();
}

function toggleChart(mode) {
  chartMode = mode;
  document.getElementById("weekView").classList.toggle("active", mode === "week");
  document.getElementById("dayView").classList.toggle("active", mode === "day");
  updateCharts();
}

// Attach event listeners to buttons
document.getElementById("weekView").addEventListener("click", () => toggleChart("week"));
document.getElementById("dayView").addEventListener("click", () => toggleChart("day"));
document.getElementById("prevButton").addEventListener("click", prevPeriod);
document.getElementById("nextButton").addEventListener("click", nextPeriod);

window.addEventListener("DOMContentLoaded", setup);