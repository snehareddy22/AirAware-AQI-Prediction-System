from flask import Flask, request, jsonify, render_template, send_file
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from datetime import datetime
import os, re, pickle
import numpy as np
import pandas as pd
from fpdf import FPDF

# OPTIONAL chatbot
from openai import OpenAI

# -------------------
# Load env variables
# -------------------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# -------------------
# Flask App
# -------------------
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///airaware.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# -------------------
# Load ML Model
# -------------------
MODEL_PATH_1 = "aqi_model.pkl"
MODEL_PATH_2 = os.path.join("model", "aqi_model.pkl")

if os.path.exists(MODEL_PATH_1):
    MODEL_PATH = MODEL_PATH_1
elif os.path.exists(MODEL_PATH_2):
    MODEL_PATH = MODEL_PATH_2
else:
    raise FileNotFoundError("aqi_model.pkl not found")

model = pickle.load(open(MODEL_PATH, "rb"))

# -------------------
# OpenAI Client (optional)
# -------------------
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

LANG_MAP = {
    "en": "Reply in English.",
    "te": "Reply in Telugu.",
    "hi": "Reply in Hindi."
}

# -------------------
# Dataset Path
# -------------------
DATASET_PATH_1 = "city_day.csv"
DATASET_PATH_2 = os.path.join("model", "city_day.csv")

# -------------------
# Database Models
# -------------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(250), nullable=False)
    created_at = db.Column(db.String(30), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    feedback = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String(30), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

class Rating(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.String(30), default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

with app.app_context():
    db.create_all()

# -------------------
# Helpers
# -------------------
def clean_city_name(city: str):
    city = re.sub(r"[^a-zA-Z ]", "", str(city)).strip().title()
    return city if city else "Delhi"

def load_dataset():
    if os.path.exists(DATASET_PATH_1):
        return pd.read_csv(DATASET_PATH_1)
    if os.path.exists(DATASET_PATH_2):
        return pd.read_csv(DATASET_PATH_2)
    raise FileNotFoundError("city_day.csv not found")

def get_city_dataset(city):
    df = load_dataset()

    df["City"] = df["City"].astype(str).str.strip()

    # Map UI city name
    if city.lower() == "new delhi":
        city = "Delhi"

    df = df[df["City"].str.lower() == city.lower()]

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(subset=["Date", "AQI"])
    df = df.sort_values("Date")
    return df

def build_hourly_from_daily(current_aqi):
    # realistic pattern from AQI (not random)
    base = max(10, float(current_aqi))
    hourly = []
    for h in range(24):
        factor = 0.85 + 0.25 * np.sin((h / 24) * 2 * np.pi)
        hourly.append(int(max(10, base * factor)))
    return hourly

def get_9y_trend(df):
    df = df.copy()
    df["Year"] = df["Date"].dt.year
    yearly = df.groupby("Year")["AQI"].mean().reset_index()
    yearly = yearly.sort_values("Year").tail(9)

    years = yearly["Year"].astype(str).tolist()
    trend = yearly["AQI"].round(0).astype(int).tolist()
    return years, trend

def predict_aqi(pm25, co, no2):
    x = np.array([[pm25, co, no2]])
    pred = float(model.predict(x)[0])
    return max(0, int(pred))

# -------------------
# Routes
# -------------------
@app.route("/")
def home():
    return render_template("index.html")

# ✅ Sidebar Cities fixed (no OpenAQ)
@app.route("/cities")
def cities():
    # only these 5 cities for stable working
    return jsonify({"cities": ["New Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru"]})

# ✅ Signup
@app.route("/signup", methods=["POST"])
def signup():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "User already exists. Please login."}), 409

    user = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "Signup successful ✅", "user_id": user.id})

# ✅ Login
@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Email is not registered. Please sign up."}), 404

    if not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Wrong password."}), 401

    return jsonify({"message": "Login successful ✅", "user_id": user.id})

# ✅ FULL Dashboard Data API (DATASET ONLY)
@app.route("/dashboard_data")
def dashboard_data():
    city = request.args.get("city", "Delhi")
    city_clean = clean_city_name(city)

    df_city = get_city_dataset(city_clean)

    if df_city.empty:
        return jsonify({"error": f"No data for city {city_clean}"}), 404

    # latest usable row
    latest = df_city.dropna(subset=["PM2.5", "CO", "NO2", "AQI"]).tail(1)
    if latest.empty:
        return jsonify({"error": f"No pollution values for {city_clean}"}), 404

    row = latest.iloc[0]
    pm25 = float(row["PM2.5"])
    co = float(row["CO"])
    no2 = float(row["NO2"])

    # ML predicted AQI
    now = predict_aqi(pm25, co, no2)

    # dataset min/max last 30 rows
    last30 = df_city.dropna(subset=["AQI"]).tail(30)
    min_aqi = int(last30["AQI"].min())
    max_aqi = int(last30["AQI"].max())

    # trend
    years, trend = get_9y_trend(df_city)

    # hourly curve
    hourly = build_hourly_from_daily(now)

    # future preds
    y1 = int(now * 1.06)
    y5 = int(now * 1.18)

    return jsonify({
        "city": "Delhi" if city_clean.lower() == "new delhi" else city_clean,
        "pm25": round(pm25, 2),
        "co": round(co, 2),
        "no2": round(no2, 2),

        "now": int(now),
        "min_aqi": int(min_aqi),
        "max_aqi": int(max_aqi),

        "hourly": hourly,
        "years": years,
        "trend": trend,

        "y1": y1,
        "y5": y5
    })

# ✅ Chatbot (optional)
@app.route("/chat", methods=["POST"])
def chat():
    data = request.json or {}
    message = data.get("message", "").strip()
    lang = data.get("lang", "en")

    if not message:
        return jsonify({"reply": "Please type a question."})

    if client is None:
        return jsonify({"reply": "Chatbot not enabled (OPENAI_API_KEY missing)."})


    system_prompt = (
        "You are an air quality assistant. "
        "Give short, clear answers about AQI, pollution and health advice."
    )

    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {"role": "system", "content": system_prompt + " " + LANG_MAP.get(lang, "Reply in English.")},
                {"role": "user", "content": message}
            ],
            max_output_tokens=120
        )
        return jsonify({"reply": response.output_text})
    except Exception as e:
        print("Chatbot error:", e)
        return jsonify({"reply": "AI service unavailable."})

# ✅ Feedback
@app.route("/feedback", methods=["POST"])
def feedback():
    data = request.json or {}
    feedback_text = data.get("feedback", "").strip()
    user_id = data.get("user_id")

    if not feedback_text:
        return jsonify({"message": "Feedback cannot be empty."}), 400

    fb = Feedback(user_id=user_id, feedback=feedback_text)
    db.session.add(fb)
    db.session.commit()

    return jsonify({"message": "Feedback stored ✅"})

# ✅ Rating
@app.route("/rate", methods=["POST"])
def rate():
    data = request.json or {}
    rating_value = int(data.get("rating", 0))
    user_id = data.get("user_id")

    if rating_value < 1 or rating_value > 5:
        return jsonify({"message": "Rating must be 1 to 5."}), 400

    r = Rating(user_id=user_id, rating=rating_value)
    db.session.add(r)
    db.session.commit()

    return jsonify({"message": f"Rating {rating_value}★ stored ✅"})

# ✅ Download PDF Report
@app.route("/download_report")
def download_report():
    city = request.args.get("city", "Unknown")
    pm25 = request.args.get("pm25", "--")
    co = request.args.get("co", "--")
    no2 = request.args.get("no2", "--")
    aqi = request.args.get("aqi", "--")

    pdf = FPDF()
    pdf.add_page()

    pdf.set_font("Arial", size=16)
    pdf.cell(200, 10, txt="AirAware - AQI Report", ln=True, align="C")
    pdf.ln(10)

    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt=f"City  : {city}", ln=True)
    pdf.cell(200, 10, txt=f"PM2.5 : {pm25}", ln=True)
    pdf.cell(200, 10, txt=f"CO    : {co}", ln=True)
    pdf.cell(200, 10, txt=f"NO2   : {no2}", ln=True)
    pdf.cell(200, 10, txt=f"AQI   : {aqi}", ln=True)

    pdf.ln(10)
    pdf.multi_cell(0, 10, "This report was generated using AirAware Dashboard.")

    filename = "AirAware_Report.pdf"
    pdf.output(filename)

    return send_file(filename, as_attachment=True)

if __name__ == "__main__":
    app.run(debug=True)
