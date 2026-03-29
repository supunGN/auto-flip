#include <esp_now.h>
#include <WiFi.h>
#include <WebServer.h>

// ==========================================
// NETWORK
// ==========================================
const char* ssid = "SSID";
const char* password = "PASSWORD";

uint8_t broadcastAddress[] = {0x00,0x00,0x00,0x00,0x00,0x00}; // MAC ADDRESS OF RECEIVER
WebServer server(80);

// ==========================================
// PINS
// ==========================================
const int ldrPin = 34;
const int irA = 27;
const int irB = 26;

// ==========================================
// IR STATE
// ==========================================
int personCount = 0;
int irState = 0;
unsigned long lastTriggerTime = 0;

// ==========================================
// LIGHT
// ==========================================
bool lightState = false;
int lastSentState = -1;
bool autoLightOn = false;

// ==========================================
// MODE
// ==========================================
bool autoMode = true;
int manualLightState = 0;

// ==========================================
// TIMERS
// ==========================================
unsigned long darkStart = 0;
bool darkRunning = false;

const unsigned long DELAY_TIME = 60000; // 1 min

// ==========================================
// API
// ==========================================
void handleStatus(){
  int brightness = map(analogRead(ldrPin),0,4095,100,0);

  String json = "{";
  json += "\"count\":" + String(personCount) + ",";
  json += "\"light\":" + String(brightness) + ",";
  json += "\"autoMode\":" + String(autoMode ? "true":"false") + ",";
  json += "\"servoState\":" + String(lastSentState);
  json += "}";

  server.send(200,"application/json",json);
}

void handleManualOn(){
  autoMode = false;
  manualLightState = 1;
  autoLightOn = false;
  server.send(200,"text/plain","Manual ON");
}

void handleManualOff(){
  autoMode = false;
  manualLightState = 0;
  autoLightOn = false;
  server.send(200,"text/plain","Manual OFF");
}

void handleAutoOn(){
  autoMode = true;
  server.send(200,"text/plain","Auto Mode");
}

// ==========================================
// SETUP
// ==========================================
void setup(){

  Serial.begin(115200);

  pinMode(irA,INPUT);
  pinMode(irB,INPUT);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid,password);

  Serial.print("Connecting to WiFi");

  while(WiFi.status()!=WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n\n✅ WIFI CONNECTED!");
  Serial.print("📶 Network: ");
  Serial.println(ssid);

  Serial.print("🌐 IP Address: ");
  Serial.println(WiFi.localIP());

  Serial.println("\n👉 Open this in Expo Go:");
  Serial.print("http://");
  Serial.println(WiFi.localIP());
  Serial.println("=================================\n");

  // ESP NOW
  esp_now_init();

  esp_now_peer_info_t peerInfo={};
  memcpy(peerInfo.peer_addr,broadcastAddress,6);
  peerInfo.channel = WiFi.channel();
  peerInfo.ifidx = WIFI_IF_STA;

  esp_now_add_peer(&peerInfo);

  // ROUTES
  server.on("/api/status",HTTP_GET,handleStatus);
  server.on("/api/manual/on",HTTP_GET,handleManualOn);
  server.on("/api/manual/off",HTTP_GET,handleManualOff);
  server.on("/api/auto",HTTP_GET,handleAutoOn);

  server.begin();
}

// ==========================================
// LOOP
// ==========================================
void loop(){

  server.handleClient();

  // IR LOGIC
  int A = digitalRead(irA);
  int B = digitalRead(irB);

  switch(irState){

    case 0:
      if(A==LOW){ irState=1; lastTriggerTime=millis(); }
      else if(B==LOW){ irState=2; lastTriggerTime=millis(); }
    break;

    case 1:
      if(B==LOW){
        personCount++;
        Serial.println("Entered");
        irState=0;
        delay(300);
      }
    break;

    case 2:
      if(A==LOW){
        if(personCount>0) personCount--;
        Serial.println("Left");
        irState=0;
        delay(300);
      }
    break;
  }

  if(irState!=0 && millis()-lastTriggerTime>2000) irState=0;

  // LDR
  int sum=0;
  for(int i=0;i<10;i++){ sum+=analogRead(ldrPin); delay(2); }
  int brightness = map(sum/10,0,4095,100,0);

  int targetState = 0;

  // ======================================
  // AUTO MODE
  // ======================================
  if(autoMode){

    if(personCount == 0){
      lightState = false;
      autoLightOn = false;
      darkRunning = false;
    }

    else{

      if(brightness < 20 && !lightState){
        lightState = true;
        autoLightOn = true;
        Serial.println("Dark → ON instantly");
      }

      if(!lightState && brightness < 20){

        if(!darkRunning){
          darkStart = millis();
          darkRunning = true;
        }

        if(millis()-darkStart > DELAY_TIME){
          lightState = true;
          autoLightOn = true;
          Serial.println("Dark delay → ON");
        }
      }

      if(brightness > 40){
        darkRunning = false;
      }
    }

    targetState = lightState ? 1 : 0;
  }

  // ======================================
  // MANUAL MODE
  // ======================================
  else{

    targetState = manualLightState;
    autoLightOn = false;

    // If room empty → reset system
    if(personCount == 0){
      autoMode = true;
      lightState = false;
    }
  }

  // ======================================
  // SEND
  // ======================================
  if(targetState != lastSentState){

    esp_now_send(broadcastAddress,(uint8_t*)&targetState,sizeof(targetState));

    if(targetState==1) Serial.println("LIGHT ON");
    else Serial.println("LIGHT OFF");

    lastSentState = targetState;
  }
}