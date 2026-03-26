#include <esp_now.h>
#include <WiFi.h>
#include <ESP32Servo.h>
#include <esp_wifi.h>

Servo myServo;

// ==========================================
// 1. Hardware Pins
// ==========================================
const int servoPin = 18;

// ==========================================
// 2. Receive callback
// ==========================================
void onDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {

  int command;
  memcpy(&command, incomingData, sizeof(command));

  Serial.print("Received Command: ");
  Serial.println(command);

  if (command == 1) {

    myServo.write(180);
    Serial.println("💡 LIGHT ON → Servo 180");

  } else {

    myServo.write(0);
    Serial.println("🔌 LIGHT OFF → Servo 0");

  }
}

// ==========================================
// 3. Setup
// ==========================================
void setup() {

  Serial.begin(115200);

  myServo.attach(servoPin);
  myServo.write(0); // Start position

  WiFi.mode(WIFI_STA);

  // Force channel 9 (same as sender WiFi channel)
  esp_wifi_set_promiscuous(true);
  esp_wifi_set_channel(9, WIFI_SECOND_CHAN_NONE);
  esp_wifi_set_promiscuous(false);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW Init Failed");
    return;
  }

  esp_now_register_recv_cb(onDataRecv);

  Serial.println("📡 Receiver Ready. Listening on Channel 9...");
}

void loop() {
}