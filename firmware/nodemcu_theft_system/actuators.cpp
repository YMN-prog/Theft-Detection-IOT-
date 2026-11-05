#include "actuators.h"

ActuatorController::ActuatorController()
    : _alarmActive(false), _relayState(false), _buzzerState(false),
      _redLedState(false), _greenLedState(false), _greenLedOverride(-1),
      _lastStrobeMillis(0), _strobeToggle(false),
      _lastSirenStepMillis(0), _sirenFreq(650), _sirenRising(true),
      _lastHeartbeatMillis(0), _heartbeatToggle(false) {}

void ActuatorController::begin() {
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    pinMode(PIN_RELAY, OUTPUT);

    // Initial safe states (Relay OFF, Buzzer OFF, LEDs OFF)
    setGreenLed(false);
    setRedLed(false);
    setBuzzer(false);
    setRelay(false);
}

void ActuatorController::setBuzzer(bool state) {
    _buzzerState = state;
    if (state) {
        tone(PIN_BUZZER, 2400);
        digitalWrite(PIN_BUZZER, HIGH);
    } else {
        noTone(PIN_BUZZER);
        digitalWrite(PIN_BUZZER, LOW);
    }
}

void ActuatorController::setRelay(bool state) {
    _relayState = state;
    digitalWrite(PIN_RELAY, state ? RELAY_ACTIVE_LEVEL : RELAY_INACTIVE_LEVEL);
}

void ActuatorController::setRedLed(bool state) {
    _redLedState = state;
    digitalWrite(PIN_LED_RED, state ? LED_ACTIVE_LEVEL : LED_INACTIVE_LEVEL);
}

void ActuatorController::setGreenLed(bool state) {
    _greenLedState = state;
    digitalWrite(PIN_LED_GREEN, state ? LED_ACTIVE_LEVEL : LED_INACTIVE_LEVEL);
}

void ActuatorController::setGreenLedOverride(int mode) {
    _greenLedOverride = mode;
    if (!_alarmActive) {
        if (mode == 1) setGreenLed(true);
        else if (mode == 0) setGreenLed(false);
    }
}

void ActuatorController::setAlarm(bool active) {
    _alarmActive = active;
    if (active) {
        _strobeToggle = true;
        _lastStrobeMillis = millis();
        _lastSirenStepMillis = millis();
        _sirenFreq = 650;
        _sirenRising = true;
        setRedLed(true);
        setRelay(true);
        setGreenLed(false);
        tone(PIN_BUZZER, _sirenFreq);
        digitalWrite(PIN_BUZZER, HIGH);
        _buzzerState = true;
    } else {
        noTone(PIN_BUZZER);
        digitalWrite(PIN_BUZZER, LOW);
        _buzzerState = false;
        setRelay(false);
        setRedLed(false);
        _sirenFreq = 650;
        _sirenRising = true;
    }
}

void ActuatorController::update(bool isArmed, bool isAlarmActive) {
    _alarmActive = isAlarmActive;
    unsigned long currentMillis = millis();

    if (_alarmActive) {
        // 1. Red Warning Strobe (toggles every 80ms)
        if (currentMillis - _lastStrobeMillis >= 80) {
            _lastStrobeMillis = currentMillis;
            _strobeToggle = !_strobeToggle;
            setRedLed(_strobeToggle);
            setGreenLed(false); // In alarm, green is always OFF
        }

        // 2. Police Siren Sound Effect (wailing sweep between 650 Hz and 1450 Hz)
        // Steps every 15ms for smooth rising & falling siren acoustic pitch
        if (currentMillis - _lastSirenStepMillis >= 15) {
            _lastSirenStepMillis = currentMillis;
            if (_sirenRising) {
                _sirenFreq += 30;
                if (_sirenFreq >= 1450) {
                    _sirenFreq = 1450;
                    _sirenRising = false;
                }
            } else {
                _sirenFreq -= 30;
                if (_sirenFreq <= 650) {
                    _sirenFreq = 650;
                    _sirenRising = true;
                }
            }
            tone(PIN_BUZZER, _sirenFreq);
            // Also alternate DC pin at inflection points for active buzzer support
            digitalWrite(PIN_BUZZER, _sirenRising ? HIGH : LOW);
            _buzzerState = true;
        }

        setRelay(true); // Relay remains energized during alarm
    } else {
        // Safe / Normal state
        setRelay(false);
        setRedLed(false);
        if (_buzzerState) {
            noTone(PIN_BUZZER);
            digitalWrite(PIN_BUZZER, LOW);
            _buzzerState = false;
        }

        // Green LED handling:
        if (_greenLedOverride == 1) {
            // User manually forced Green LED ON via web dashboard
            setGreenLed(true);
        } else if (_greenLedOverride == 0) {
            // User manually forced Green LED OFF via web dashboard
            setGreenLed(false);
        } else {
            // Auto Mode:
            if (isArmed) {
                // Armed safe standby: Green LED solid ON
                setGreenLed(true);
            } else {
                // Disarmed heartbeat: pulses every 1000ms
                if (currentMillis - _lastHeartbeatMillis >= 1000) {
                    _lastHeartbeatMillis = currentMillis;
                    _heartbeatToggle = !_heartbeatToggle;
                    setGreenLed(_heartbeatToggle);
                }
            }
        }
    }
}

void ActuatorController::selfTest() {
    Serial.println("[Actuators] Running NodeMCU hardware self-test...");

    Serial.println("[Actuators] Testing Green LED (D5)...");
    setGreenLed(true);
    delay(400);
    setGreenLed(false);
    delay(200);

    Serial.println("[Actuators] Testing Red LED (D0)...");
    setRedLed(true);
    delay(400);
    setRedLed(false);
    delay(200);

    Serial.println("[Actuators] Testing Buzzer Police Siren (D8)...");
    tone(PIN_BUZZER, 800);
    delay(200);
    tone(PIN_BUZZER, 1400);
    delay(200);
    noTone(PIN_BUZZER);
    digitalWrite(PIN_BUZZER, LOW);
    delay(200);

    Serial.println("[Actuators] Testing Relay (D4)...");
    setRelay(true);
    delay(300);
    setRelay(false);
    delay(200);

    Serial.println("[Actuators] Self-test complete.");
}
