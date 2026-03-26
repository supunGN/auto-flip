#include <esp_now.h>
#include <WiFi.h>
#include <WebServer.h>

// ==========================================
// 1. Network & ESP-NOW Settings
// ==========================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

uint8_t broadcastAddress[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00}; //update this

WebServer server(80);

// ==========================================
// 2. Hardware Pins
// ==========================================
const int ldrPin = 34;
const int irA = 27;
const int irB = 26;

// ==========================================
// 3. IR State Machine Variables
// ==========================================
int personCount = 0;
int irState = 0;
unsigned long lastTriggerTime = 0;

int lastSentState = -1;

// ==========================================
// 4. Light Control Variables
// ==========================================
bool lightState = false;

// ==========================================
// 5. Manual Override Variables
// ==========================================
bool autoMode = true;
int manualLightState = 0;

unsigned long manualStartTime = 0;
const unsigned long FAILSAFE_TIME = 7200000; // 2 hours

// ==========================================
// API ROUTES
// ==========================================
void handleStatus() {

  int brightness = map(analogRead(ldrPin),0,4095,100,0);

  String json = "{";
  json += "\"count\":" + String(personCount) + ",";
  json += "\"light\":" + String(brightness) + ",";
  json += "\"autoMode\":" + String(autoMode ? "true" : "false") + ",";
  json += "\"servoState\":" + String(lastSentState);
  json += "}";

  server.send(200,"application/json",json);
}

void handleManualOn() {

  autoMode = false;
  manualLightState = 1;
  manualStartTime = millis();

  server.send(200,"text/plain","Manual ON");

  Serial.println("📱 API → LIGHT FORCED ON");
}

void handleManualOff() {

  autoMode = false;
  manualLightState = 0;
  manualStartTime = millis();

  server.send(200,"text/plain","Manual OFF");

  Serial.println("📱 API → LIGHT FORCED OFF");
}

void handleAutoOn() {

  autoMode = true;

  server.send(200,"text/plain","Auto Mode");

  Serial.println("📱 API → AUTO MODE RESTORED");
}

// ==========================================
// SETUP
// ==========================================
void setup() {

  Serial.begin(115200);

  pinMode(irA,INPUT);
  pinMode(irB,INPUT);

  // WiFi Connection
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid,password);

  Serial.print("Connecting to WiFi");

  while(WiFi.status()!=WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ Connected");
  Serial.print("📡 API IP Address: ");
  Serial.println(WiFi.localIP());

  // ESP-NOW Init
  if(esp_now_init()!=ESP_OK){
    Serial.println("ESP NOW INIT FAILED");
    return;
  }

  esp_now_peer_info_t peerInfo={};
  memcpy(peerInfo.peer_addr,broadcastAddress,6);

  peerInfo.channel = WiFi.channel();
  peerInfo.encrypt = false;
  peerInfo.ifidx = WIFI_IF_STA;

  if(esp_now_add_peer(&peerInfo)!=ESP_OK){
    Serial.println("Peer Add Failed");
    return;
  }

  // API Routes
  server.on("/api/status",HTTP_GET,handleStatus);
  server.on("/api/manual/on",HTTP_GET,handleManualOn);
  server.on("/api/manual/off",HTTP_GET,handleManualOff);
  server.on("/api/auto",HTTP_GET,handleAutoOn);

  server.begin();

  Serial.println("🚀 Sender System Ready");
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {

  server.handleClient();

  // ======================================
  // IR SENSOR STATE MACHINE
  // ======================================
  int A = digitalRead(irA);
  int B = digitalRead(irB);

  switch(irState){

    case 0:

      if(A==LOW){
        irState=1;
        lastTriggerTime=millis();
      }

      else if(B==LOW){
        irState=2;
        lastTriggerTime=millis();
      }

    break;

    case 1:

      if(B==LOW){

        personCount++;

        Serial.print("👤 Entered | Count = ");
        Serial.println(personCount);

        irState=0;
        delay(300);
      }

    break;

    case 2:

      if(A==LOW){

        if(personCount>0)
          personCount--;

        Serial.print("👤 Left | Count = ");
        Serial.println(personCount);

        irState=0;
        delay(300);
      }

    break;
  }

  if(irState!=0 && millis()-lastTriggerTime>2000){
    irState=0;
  }

  // ======================================
  // LDR SMOOTHING (Noise Reduction)
  // ======================================
  int sum = 0;

  for(int i=0;i<10;i++){
    sum += analogRead(ldrPin);
    delay(2);
  }

  int ldrValue = sum/10;

  int brightness = map(ldrValue,0,4095,100,0);

  // ======================================
  // CORE LOGIC (Industrial Light Control)
  // ======================================
  int targetState = 0;

  if(autoMode){

    if(personCount > 0){

      // DARK → LIGHT ON
      if(!lightState && brightness < 20){

        lightState = true;

        Serial.println("🌙 DARK (<20%) → LIGHT ON");
      }

      // BRIGHT → LIGHT OFF
      if(lightState && brightness > 40){

        lightState = false;

        Serial.println("☀️ BRIGHT (>40%) → LIGHT OFF");
      }

    }
    else{

      lightState = false;
    }

    targetState = lightState ? 1 : 0;

  }

  else{

    targetState = manualLightState;

    if(millis()-manualStartTime > FAILSAFE_TIME){

      autoMode = true;

      Serial.println("⏱️ FAILSAFE → AUTO RESTORED (Time Expired)");
    }

    if(personCount==0 && targetState==1){

      autoMode = true;
      targetState = 0;

      Serial.println("🚪 FAILSAFE → EMPTY ROOM → LIGHT OFF");
    }
  }

  // ======================================
  // SEND ESP-NOW SIGNAL
  // ======================================
  if(targetState!=lastSentState){

    esp_now_send(broadcastAddress,(uint8_t *)&targetState,sizeof(targetState));

    if(targetState==1)
      Serial.println("💡 SIGNAL SENT: LIGHT ON");
    else
      Serial.println("🔌 SIGNAL SENT: LIGHT OFF");

    lastSentState = targetState;
  }

}