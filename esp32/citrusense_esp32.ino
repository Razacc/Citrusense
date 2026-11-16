// CitruSense — ESP32 mengirim data sensor ke Supabase
// Library (Library Manager): "DHT sensor library" + "Adafruit Unified Sensor"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>

const char* WIFI_SSID = "NAMA_WIFI";
const char* WIFI_PASS = "PASSWORD_WIFI";
const char* API_URL   = "https://your-project.supabase.co/rest/v1/sensor_data";
const char* API_KEY   = "your_supabase_anon_key_here";

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

const int SOIL_PINS[] = {32, 33, 34};   // 3 sensor kelembapan tanah (analog)
const int TDS_PIN = 35, PH_PIN = 36;    // pin ADC1
const int TRIG_PIN = 25, ECHO_PIN = 26; // HC-SR04 / JSN-SR04T

// Kalibrasi sensor Anda sendiri!
const int SOIL_DRY = 3200, SOIL_WET = 1300;
const float PH_NEUTRAL_V = 2.5, PH_SLOPE = 0.18; // volt per 1 pH

float readSoilAvg() {
  float sum = 0;
  for (int p : SOIL_PINS) {
    int raw = analogRead(p);
    sum += constrain(map(raw, SOIL_DRY, SOIL_WET, 0, 100), 0, 100);
  }
  return sum / (sizeof(SOIL_PINS) / sizeof(SOIL_PINS[0]));
}

float readTds(float tempC) {
  float v = analogRead(TDS_PIN) / 4095.0 * 3.3;
  float comp = v / (1.0 + 0.02 * (tempC - 25.0));
  return (133.42 * comp * comp * comp - 255.86 * comp * comp + 857.39 * comp) * 0.5;
}

float readPh() {
  float v = analogRead(PH_PIN) / 4095.0 * 3.3;
  return 7.0 + (PH_NEUTRAL_V - v) / PH_SLOPE;
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 30000);
  return dur * 0.034 / 2;
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(TRIG_PIN, OUTPUT); pinMode(ECHO_PIN, INPUT);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi terhubung");
}

void loop() {
  float t = dht.readTemperature(), h = dht.readHumidity();
  if (isnan(t)) t = 25;
  if (isnan(h)) h = 0;

  String body = "{\"suhu\":" + String(t, 1) +
                ",\"kelembapan_udara\":" + String(h, 1) +
                ",\"rata_rata_tanah\":" + String(readSoilAvg(), 1) +
                ",\"tds\":" + String(readTds(t), 0) +
                ",\"jarak_air\":" + String(readDistanceCm(), 1) +
                ",\"ph\":" + String(readPh(), 2) + "}";

  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // sederhana; untuk produksi pasang sertifikat root
    HTTPClient http;
    http.begin(client, API_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", API_KEY);
    http.addHeader("Authorization", String("Bearer ") + API_KEY);
    http.addHeader("Prefer", "return=minimal");
    int code = http.POST(body);
    Serial.printf("POST %d  %s\n", code, body.c_str());
    http.end();
  }
  delay(10000); // kirim tiap 10 detik
}
