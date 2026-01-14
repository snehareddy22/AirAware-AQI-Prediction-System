# 🌍 AirAware — Smart AQI Prediction System

A full-stack Air Quality Index (AQI) prediction dashboard built using **Flask + SQLite + Machine Learning + Chart.js**.  
AirAware predicts AQI using a trained ML model and displays interactive charts with health recommendations.

---

## ✅ Features

- 🔐 Login / Signup (stored in SQLite DB)
- 🤖 AQI prediction using ML model (RandomForest Regressor)
- 📊 Interactive charts:
  - Hourly AQI (24h)
  - Past 9-year AQI trend
  - Now / 1Y / 5Y prediction
  - Pollutant composition
- 💬 AI Chatbot (OpenAI API)
- ⭐ Rating & Feedback system stored in DB
- 📄 Downloadable AQI Report (PDF)
- 🌙 Dark mode UI

---

---

## 🎥 Demo Video
👉 [Click here to view demo](https://drive.google.com/file/d/1mdjCDPycNE17bLWCbw5DW47mkPvc7TMv/view?usp=sharing)

---

## 🧠 Machine Learning

- Dataset: `city_day.csv` (Kaggle AQI Dataset)
- Cities: Delhi, Mumbai, Kolkata, Chennai, Bengaluru
- Input Features: PM2.5, CO, NO2
- Model: RandomForest Regression
- Output: AQI prediction

---

## 🛠 Tech Stack

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Python Flask
- Database: SQLite + SQLAlchemy
- ML: scikit-learn, Pandas, NumPy
- PDF Report: FPDF
- Chatbot: OpenAI API (optional)

---

## 📂 Project Structure

```txt
AirAware-AQI-Prediction-System/
│
├── app.py
├── requirements.txt
├── README.md
├── .gitignore
│
├── templates/
│   └── index.html
│
├── static/
│   ├── app.js
│   └── styles.css
│
├── model/
│   ├── train_model_5cities.py
│   └── README.md
│
├── assets/
│   ├── login.png
│   ├── dashboard-light.png
│   ├── dashboard-dark.png
│   └── report.png
│
└── docs/
    └── AirAware_Report.pdf
⚙️ Setup & Run
1️⃣ Clone repo
bash
Copy code
git clone https://github.com/<username>/AirAware-AQI-Prediction-System.git
cd AirAware-AQI-Prediction-System
2️⃣ Create virtual environment
bash
Copy code
python -m venv venv
venv\Scripts\activate
3️⃣ Install dependencies
bash
Copy code
pip install -r requirements.txt
4️⃣ Add .env (optional for chatbot)
Create a .env file in project root:

env
Copy code
OPENAI_API_KEY=your_openai_api_key_here
If key is not provided, chatbot feature can be disabled.

5️⃣ Download Dataset
Download Kaggle dataset and keep file in project root:

✅ city_day.csv

6️⃣ Train ML model
bash
Copy code
python train_model_5cities.py
This generates:
✅ aqi_model.pkl

7️⃣ Run Flask app
bash
Copy code
python app.py
Open:
👉 http://127.0.0.1:5000/

📌 Future Improvements
Deploy on Render / Railway

Add JWT Authentication

Add admin analytics dashboard for feedback/ratings

Improve ML using XGBoost / LSTM

Add more cities and pollutants
