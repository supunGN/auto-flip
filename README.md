# 💡 Auto-Flip — Smart Light Control System

> An IoT-based automatic light control system using two ESP32 nodes and a React Native mobile app. The system detects room occupancy and ambient brightness to intelligently toggle a light switch via a servo motor — no rewiring required.

---

## 📌 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Hardware](#hardware)
- [Mobile App](#mobile-app)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
  - [Hardware Setup](#hardware-setup)
  - [Mobile App Setup](#mobile-app-setup)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)

---

## Overview

**Auto-Flip** is a two-node IoT system that automates a traditional light switch using a servo motor controlled by an ESP32. A second ESP32 (the sender node) monitors room occupancy and ambient light, then wirelessly commands the receiver node via **ESP-NOW**. A companion **React Native mobile app** provides real-time monitoring and manual override from anywhere on the local Wi-Fi network.

---

## System Architecture

```
┌─────────────────────────────────────┐
│           Sender Node (ESP32)        │
│  • IR Sensors (person counter)       │
│  • LDR Sensor (ambient brightness)  │
│  • WiFi Web Server (REST API)        │
│  • ESP-NOW transmitter              │
└──────────────┬──────────────────────┘
               │ ESP-NOW (wireless)
               ▼
┌─────────────────────────────────────┐
│          Receiver Node (ESP32)       │
│  • Servo Motor (flips light switch) │
│  • ESP-NOW receiver                 │
└─────────────────────────────────────┘
               ▲
               │ HTTP REST API (Wi-Fi)
┌─────────────────────────────────────┐
│    Smart Light App (React Native)    │
│  • Live status dashboard            │
│  • Manual ON / OFF override         │
│  • Auto mode toggle                 │
│  • IP configuration & connection    │
└─────────────────────────────────────┘
```

---

## Features

### 🤖 Automatic Mode
- Counts people entering and leaving the room using **dual IR sensors** (directional state machine).
- Reads ambient light level via an **LDR sensor** with 10-sample smoothing for noise reduction.
- Turns light **ON** when the room is occupied and brightness drops below **20%**.
- Turns light **OFF** when brightness exceeds **40%** (natural light detected).
- Automatically turns off when the room is **empty**.

### 🛡️ Failsafe Logic
- **2-hour timer failsafe** — restores auto mode if manual control is left on.
- **Empty room failsafe** — forces the light off if no one is in the room, even in manual mode.

### 📱 Mobile App
- Real-time dashboard showing light state, person count, ambient brightness, and mode.
- One-tap **Manual ON / OFF** and **Auto Mode** toggle.
- Pull-to-refresh and **auto-polling** every 6 seconds.
- IP address configuration with connection testing.
- Animated UI with live connection status indicator.

---

## Hardware

### Sender Node (`hardware/sender_node/`)
| Component     | Pin     |
|---------------|---------|
| IR Sensor A   | GPIO 27 |
| IR Sensor B   | GPIO 26 |
| LDR Sensor    | GPIO 34 |

**Libraries required:**
- `esp_now.h` (built-in ESP32)
- `WiFi.h` (built-in ESP32)
- `WebServer.h` (built-in ESP32)

### Receiver Node (`hardware/receiver_node/`)
| Component    | Pin     |
|--------------|---------|
| Servo Motor  | GPIO 18 |

**Libraries required:**
- `esp_now.h` (built-in ESP32)
- `WiFi.h` (built-in ESP32)
- `ESP32Servo` (install via Arduino Library Manager)

---

## Mobile App

Built with **React Native** + **Expo** (~54.0.0).

**Key screens:**
- **Home** — Live light control button, auto mode toggle, 4-stat grid (Light Status, People in Room, Ambient Light, Mode).
- **Settings** — ESP32 IP address configuration, connection testing, live device info grid.

**Tech stack:**
- React Native 0.81.5 / React 19
- Expo Router with bottom tab navigation
- `@react-native-async-storage/async-storage` for persisting the IP address
- `@expo/vector-icons` (Ionicons) for iconography
- `expo-blur` for glass-effect UI elements

---

## How It Works

1. **Sender Node** boots, connects to Wi-Fi, initialises ESP-NOW, and starts the REST API server.
2. The main loop continuously: reads IR sensors → updates person count; reads LDR → calculates brightness.
3. **Core logic**: if `autoMode`, it turns the light on when `personCount > 0 && brightness < 20`, off when `brightness > 40`, and always off when the room is empty. In `manualMode`, the commanded state is sent directly.
4. Any state **change** is sent wirelessly to the **Receiver Node** via ESP-NOW as a single integer (`1` = ON, `0` = OFF).
5. **Receiver Node** receives the command and moves the servo to `180°` (ON) or `0°` (OFF), physically flipping the switch.
6. The **Mobile App** polls `/api/status` every 6 seconds and renders live data. Commands (`/api/manual/on`, `/api/manual/off`, `/api/auto`) are sent as HTTP GET requests.

---

## Getting Started

### Hardware Setup

#### 1. Flash the Sender Node
1. Open `hardware/sender_node/sender_node.ino` in the Arduino IDE.
2. Update the Wi-Fi credentials:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
3. Update the receiver node's MAC address:
   ```cpp
   uint8_t broadcastAddress[] = {0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF};
   ```
   > To find the receiver's MAC address, flash a simple sketch that prints `WiFi.macAddress()` to the Serial Monitor.
4. Flash to your ESP32 sender board.
5. Open the Serial Monitor (115200 baud). Note the **IP address** printed after connecting to Wi-Fi — you'll need it for the mobile app.

#### 2. Flash the Receiver Node
1. Open `hardware/receiver_node/receiver_node.ino` in the Arduino IDE.
2. Install the **ESP32Servo** library via *Sketch → Include Library → Manage Libraries*.
3. Flash to your ESP32 receiver board.
4. The receiver automatically listens on **Wi-Fi channel 9** (must match the sender's channel).

> **Note:** The receiver board must be on the **same Wi-Fi channel** as the sender. The sender's channel is determined by your router. Update `esp_wifi_set_channel(9, ...)` in `receiver_node.ino` if needed.

---

### Mobile App Setup

#### Prerequisites
- Node.js 18+ and npm
- Expo Go app on your phone (or an Android/iOS emulator)

#### Installation

```bash
cd mobile-app
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

#### Configuration
1. Open the **Settings** tab in the app.
2. Enter the IP address of your **Sender Node ESP32** (shown in the Serial Monitor on boot).
3. Tap **Save Configuration**, then **Test Connection** to verify.

---

## API Reference

The Sender Node exposes a simple REST API on port **80**:

| Method | Endpoint          | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | `/api/status`     | Get current device status (JSON)         |
| GET    | `/api/manual/on`  | Force light ON, disable auto mode        |
| GET    | `/api/manual/off` | Force light OFF, disable auto mode       |
| GET    | `/api/auto`       | Restore automatic mode                   |

**Example `/api/status` response:**
```json
{
  "count": 2,
  "light": 15,
  "autoMode": true,
  "servoState": 1
}
```

| Field       | Type    | Description                          |
|-------------|---------|--------------------------------------|
| `count`     | number  | Number of people detected in the room|
| `light`     | number  | Ambient brightness percentage (0–100)|
| `autoMode`  | boolean | Whether auto mode is active          |
| `servoState`| 0 or 1  | Current light state (0 = OFF, 1 = ON)|

---

## Project Structure

```
auto-flip/
├── hardware/
│   ├── sender_node/
│   │   └── sender_node.ino       # Sender ESP32 firmware
│   └── receiver_node/
│       └── receiver_node.ino     # Receiver ESP32 firmware
└── mobile-app/
    ├── components/
    │   ├── Card.js               # Reusable card container
    │   ├── LightButton.js        # Animated main light toggle button
    │   ├── PrimaryButton.js      # Styled action button
    │   ├── StatusBadge.js        # Connection/status badge
    │   └── Toggle.js             # On/off toggle switch
    ├── constants/
    │   ├── api.js                # API helpers & async storage
    │   └── theme.js              # Design tokens (colors, spacing, fonts)
    ├── navigation/
    │   └── AppNavigator.js       # Bottom tab navigator setup
    ├── screens/
    │   ├── HomeScreen.js         # Main light control dashboard
    │   └── SettingsScreen.js     # IP config & device info
    ├── App.js
    ├── app.json
    └── package.json
```

---

## License

This project is open source and available under the [MIT License](LICENSE).
