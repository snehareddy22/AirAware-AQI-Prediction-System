// =============================
// AirAware Final JS (Dataset + ML)
// =============================

// ---------- Auth ----------
const authOverlay = document.getElementById("authOverlay");
const appRoot = document.getElementById("appRoot");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const btnLogin = document.getElementById("btnLogin");
const btnSignup = document.getElementById("btnSignup");
const authMsg = document.getElementById("authMsg");
const logoutBtn = document.getElementById("logoutBtn");

// Navbar
const themeBtn = document.getElementById("themeBtn");
const cityInput = document.getElementById("cityInput");
const cityPredictBtn = document.getElementById("cityPredictBtn");
const downloadBtn = document.getElementById("downloadBtn");

// Feedback / Rating
const feedbackBox = document.getElementById("feedbackBox");
const sendFeedback = document.getElementById("sendFeedback");
const feedbackStatus = document.getElementById("feedbackStatus");

const ratingStars = document.getElementById("ratingStars");
const ratingStatus = document.getElementById("ratingStatus");
const submitRating = document.getElementById("submitRating");
let selectedRating = 0;

// Chatbot
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatReply = document.getElementById("chatReply");
const langSel = document.getElementById("langSel");

// Export dataset
document.getElementById("export").addEventListener("click", () => {
  alert("Dataset file available as city_day.csv (Kaggle).");
});

window.lastReportData = null;

// Helpers
function showApp(){
  authOverlay.style.display = "none";
  appRoot.style.display = "flex";
}
function showAuth(){
  authOverlay.style.display = "flex";
  appRoot.style.display = "none";
}
function getUserId(){
  return localStorage.getItem("airawareUserId");
}

window.addEventListener("load", async () => {
  const uid = localStorage.getItem("airawareUserId");

  if (uid) {
    // user already logged in earlier
    showApp();
    await loadSidebarCities();
  } else {
    showAuth();
  }
});

// =============================
// ✅ DB AUTH
// =============================
btnSignup.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const pwd = authPassword.value.trim();
  if(!email || !pwd){ authMsg.textContent="Enter email & password"; return; }

  try{
    const res = await fetch("/signup",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,password:pwd})
    });
    const data = await res.json();
    if(!res.ok){ authMsg.textContent=data.error || "Signup failed"; return; }

    localStorage.setItem("airawareUserId", data.user_id);
    showApp();
    await loadSidebarCities();
  }catch(e){
    console.error(e);
    authMsg.textContent="Server error.";
  }
});

btnLogin.addEventListener("click", async () => {
  const email = authEmail.value.trim();
  const pwd = authPassword.value.trim();
  if(!email || !pwd){ authMsg.textContent="Enter email & password"; return; }

  try{
    const res = await fetch("/login",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({email,password:pwd})
    });
    const data = await res.json();
    if(!res.ok){ authMsg.textContent=data.error || "Login failed"; return; }

    localStorage.setItem("airawareUserId", data.user_id);
    showApp();
    await loadSidebarCities();
  }catch(e){
    console.error(e);
    authMsg.textContent="Server error.";
  }
});

logoutBtn.addEventListener("click",()=>{
  localStorage.removeItem("airawareUserId");
  authPassword.value="";
  authMsg.textContent="Logged out.";
  showAuth();
});

// =============================
// ✅ Dark mode
// =============================
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeBtn.textContent = document.body.classList.contains("dark") ? "☀️ Light" : "🌙 Dark";
});

// =============================
// ✅ FIX: Fill donut center
// =============================
const centerFillPlugin = {
  id: "centerFill",
  afterDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data[0]) return;

    const x = meta.data[0].x;
    const y = meta.data[0].y;
    const innerRadius = meta.data[0].innerRadius;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, innerRadius + 3, 0, Math.PI * 2);

    const cardColor =
      getComputedStyle(document.body).getPropertyValue("--card").trim() || "#ffffff";

    ctx.fillStyle = cardColor;
    ctx.fill();
    ctx.restore();
  }
};

// =============================
// ✅ Charts init
// =============================
function createGauge(ctx,value){
  return new Chart(ctx,{
    type:"doughnut",
    data:{
      datasets:[{
        data:[value, 500-value],
        backgroundColor:[value>150?"#ef4444":"#06b6d4","#e6f8fb"],
        borderWidth:0
      }]
    },
    options:{
      cutout:"72%",
      plugins:{
        tooltip:{enabled:false},
        legend:{display:false}
      }
    },
    plugins:[centerFillPlugin]
  });
}

// Gauge
const gaugeCtx = document.getElementById("aqGauge").getContext("2d");
let gauge = createGauge(gaugeCtx, 80);

// Pie
const compCtx = document.getElementById("compPie").getContext("2d");
const compChart = new Chart(compCtx,{
  type:"pie",
  data:{labels:["PM2.5","PM10","CO"],datasets:[{data:[40,20,10],backgroundColor:["#06b6d4","#0ea5a4","#ffd166"]}]},
  options:{plugins:{legend:{position:"bottom"}}}
});

// Hourly line
const hourlyCtx = document.getElementById("hourlyLine").getContext("2d");
const hourlyChart = new Chart(hourlyCtx,{
  type:"line",
  data:{
    labels:Array.from({length:24},(_,i)=>`${i}:00`),
    datasets:[{
      label:"AQI",
      data:Array.from({length:24},()=>60),
      borderColor:"#074e4e",
      backgroundColor:"rgba(6,78,78,0.08)",
      fill:true,
      tension:0.3
    }]
  },
  options:{plugins:{legend:{display:false}}}
});

// Prediction bar
const predCtx = document.getElementById("predBar").getContext("2d");
const predChart = new Chart(predCtx,{
  type:"bar",
  data:{
    labels:["Now","1 Year","5 Years"],
    datasets:[{label:"AQI",data:[80,90,110],backgroundColor:["#0ea5a4","#06b6d4","#ffd166"]}]
  },
  options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
});

// Trend
const trendCtx = document.getElementById("trendArea").getContext("2d");
const trendChart = new Chart(trendCtx,{
  type:"line",
  data:{
    labels:["2017","2018","2019","2020","2021","2022","2023","2024","2025"],
    datasets:[{
      label:"AQI Trend",
      data:[100,110,120,130,125,140,150,160,170],
      backgroundColor:"rgba(6,78,78,0.08)",
      borderColor:"#06b6d4",
      fill:true,
      tension:0.3
    }]
  },
  options:{plugins:{legend:{display:false}}}
});

// =============================
// Health advice
// =============================
function setHealthAdvice(aqi){
  let adviceText="", adviceColor="";
  if(aqi<=50){ adviceText="✅ Air is Good — Safe for outdoor activity."; adviceColor="#16a34a"; }
  else if(aqi<=100){ adviceText="⚠️ Air is Moderate — Sensitive people should be careful."; adviceColor="#ca8a04"; }
  else if(aqi<=150){ adviceText="❗ Unhealthy for children & elders — Avoid long outdoor activity."; adviceColor="#ea580c"; }
  else{ adviceText="🚨 Very Unhealthy — Wear mask, avoid jogging & stay indoors."; adviceColor="#dc2626"; }

  const box=document.getElementById("healthAdvice");
  box.textContent=adviceText;
  box.style.color=adviceColor;
}

// =============================
// Sidebar Cities
// =============================
async function loadSidebarCities(){
  try{
    const res = await fetch("/cities");
    const data = await res.json();

    const ids = ["st1","st2","st3","st4","st5"];
    const fallback = ["New Delhi","Mumbai","Kolkata","Chennai","Bengaluru"];
    const cities = (data.cities && data.cities.length>=5) ? data.cities : fallback;

    ids.forEach((id,idx)=>{
      const btn=document.getElementById(id);
      const name=cities[idx] || fallback[idx];
      btn.textContent=name;
      btn.onclick=()=> predictCity(name);
    });

    // auto load first
    predictCity(document.getElementById("st1").textContent.trim());
  }catch(err){
    console.error(err);
  }
}

// =============================
// Dashboard update
// =============================
async function predictCity(cityName){
  document.getElementById("stationName").textContent = "City";

  try{
    const res = await fetch(`/dashboard_data?city=${encodeURIComponent(cityName)}`);
    const data = await res.json();

    if(data.error){
      alert(data.error);
      return;
    }

    document.getElementById("cityName").textContent = data.city;

    // pollutants
    document.getElementById("pmv").textContent = data.pm25;
    document.getElementById("cov").textContent = data.co;

    const aqi = Number(data.now);

    // stats
    document.getElementById("aqNum").textContent = aqi;
    document.getElementById("stat2").textContent = aqi;
    document.getElementById("stat1").textContent = data.min_aqi;
    document.getElementById("stat3").textContent = data.max_aqi;

    // gauge
    gauge.destroy();
    gauge = createGauge(gaugeCtx, aqi);

    // prediction
    predChart.data.datasets[0].data = [aqi, Number(data.y1), Number(data.y5)];
    predChart.update();

    // pie
    compChart.data.datasets[0].data = [
      Number(data.pm25),
      Math.max(10, Math.round(Number(data.pm25) * 0.4)),
      Math.max(5, Math.round(Number(data.co) * 10))
    ];
    compChart.update();

    // hourly
    hourlyChart.data.datasets[0].data = data.hourly;
    hourlyChart.update();

    // trend
    trendChart.data.labels = data.years;
    trendChart.data.datasets[0].data = data.trend;
    trendChart.update();

    setHealthAdvice(aqi);
    window.lastReportData = data;

  }catch(err){
    console.error(err);
    alert("Prediction error.");
  }
}

// Search city
cityPredictBtn.addEventListener("click",()=>{
  const city=cityInput.value.trim();
  if(!city) return alert("Enter a city name.");
  predictCity(city);
});

// Download report
downloadBtn.addEventListener("click",()=>{
  if(!window.lastReportData) return alert("Predict AQI first.");
  const d=window.lastReportData;
  window.open(`/download_report?city=${encodeURIComponent(d.city)}&pm25=${d.pm25}&co=${d.co}&no2=${d.no2}&aqi=${d.now}`);
});

// =============================
// Chatbot
// =============================
async function sendToAI(){
  const message = chatInput.value.trim();
  if (!message) return;

  chatReply.textContent = "Thinking...";
  try{
    const res = await fetch("/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message,lang:langSel.value})
    });
    const data = await res.json();
    chatReply.textContent = data.reply || "No reply.";
  }catch(err){
    console.error(err);
    chatReply.textContent = "Could not connect.";
  }
}
chatSend.addEventListener("click", sendToAI);
chatInput.addEventListener("keydown",(e)=>{ if(e.key==="Enter") sendToAI(); });

// =============================
// Feedback
// =============================
sendFeedback.addEventListener("click", async ()=>{
  const feedback = feedbackBox.value.trim();
  if(!feedback){ feedbackStatus.textContent="Write feedback first."; return; }

  feedbackStatus.textContent="Sending...";
  try{
    const res = await fetch("/feedback",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({feedback,user_id:getUserId()})
    });
    const data = await res.json();
    feedbackStatus.textContent = data.message || "Saved ✅";
    feedbackBox.value = "";
  }catch(err){
    console.error(err);
    feedbackStatus.textContent = "Error sending feedback.";
  }
});

// =============================
// Rating
// =============================
ratingStars.querySelectorAll("span").forEach(star=>{
  star.addEventListener("click",()=>{
    selectedRating = parseInt(star.getAttribute("data-v"));
    ratingStars.querySelectorAll("span").forEach(s2=>{
      s2.classList.toggle("active", parseInt(s2.getAttribute("data-v")) <= selectedRating);
    });
  });
});

submitRating.addEventListener("click", async ()=>{
  if(!selectedRating){ ratingStatus.textContent="Select rating first."; return; }

  ratingStatus.textContent="Sending...";
  try{
    const res=await fetch("/rate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({rating:selectedRating,user_id:getUserId()})
    });
    const data=await res.json();
    ratingStatus.textContent=data.message || "Saved ✅";
  }catch(err){
    console.error(err);
    ratingStatus.textContent="Error saving rating.";
  }
});

console.log("✅ AirAware UI Loaded");
