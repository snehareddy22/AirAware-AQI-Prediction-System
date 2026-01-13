import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import pickle

# -----------------------------
# 1. LOAD DATASET
# -----------------------------
df = pd.read_csv("city_day.csv")

# -----------------------------
# 2. FILTER ONLY 5 CITIES
# -----------------------------
TARGET_CITIES = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru"]

df["City"] = df["City"].astype(str).str.strip()
df = df[df["City"].isin(TARGET_CITIES)]

# -----------------------------
# 3. KEEP USEFUL COLUMNS
# -----------------------------
df = df[["City", "Date", "PM2.5", "CO", "NO2", "AQI"]]

# remove missing
df = df.dropna(subset=["PM2.5", "CO", "NO2", "AQI"])

print("✅ Rows after filter:", df.shape[0])
print(df["City"].value_counts())

# -----------------------------
# 4. FEATURES / TARGET
# -----------------------------
X = df[["PM2.5", "CO", "NO2"]]
y = df["AQI"]

# -----------------------------
# 5. TRAIN TEST SPLIT
# -----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# -----------------------------
# 6. TRAIN MODEL
# -----------------------------
model = RandomForestRegressor(
    n_estimators=300,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

# -----------------------------
# 7. EVALUATE
# -----------------------------
pred = model.predict(X_test)
mae = mean_absolute_error(y_test, pred)
r2 = r2_score(y_test, pred)

print("✅ MAE:", mae)
print("✅ R2:", r2)

# -----------------------------
# 8. SAVE MODEL
# -----------------------------
pickle.dump(model, open("aqi_model.pkl", "wb"))
print("✅ Saved model: aqi_model.pkl")
