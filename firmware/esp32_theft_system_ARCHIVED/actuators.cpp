#include "actuators.h"

ActuatorController::ActuatorController()
    : _alarmActive(false), _relayState(false), _buzzerState(false),
      _redLedState(false), _greenLedState(false), _lastBlinkMillis(0), _blinkToggle(false) {}

void ActuatorController::begin() {
    pinMode(PIN_LED_GREEN, OUTPUT);
    pinMode(PIN_LED_RED, OUTPUT);
    pinMode(PIN_BUZZER, OUTPUT);
    pinMode(PIN_RELAY, OUTPUT);

    // Initial safe states
    setGreenLed(false);
    setRedLed(false);
    setBuzzer(false);
    setRelay(false);
}

void ActuatorController::setBuzzer(bool state) {
    _buzzerState = state;
    digitalWrite(PIN_BUZZER, state ? BUZZER_ACTIVE_LEVEL : BUZZER_INACTIVE_LEVEL);
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

void ActuatorController::setAlarm(bool active) {
    _alarmActive = active;
    if (!active) {
        setBuzzer(false);
        setRelay(false);
        setRedLed(false);
    }
}

void ActuatorController::update(bool isArmed, bool isAlarmActive) {
    _alarmActive = isAlarmActive;
    unsigned long currentMillis = millis();

    if (_alarmActive) {
        // High alert state: rapid strobe & siren pulse every 150ms
        if (currentMillis - _lastBlinkMillis >= 150) {
            _lastBlinkMillis = currentMillis;
            _blinkToggle = !_blinkToggle;

            setRedLed(_blinkToggle);
            setGreenLed(false);
            setBuzzer(_blinkToggle); // Pulsing alarm tone
            setRelay(true);          // High-power strobe / siren continuously active
        }
    } else {
        // Normal states
        setRelay(false);
        setRedLed(false);
        setBuzzer(false);

        if (isArmed) {
            // Armed standby: Green LED solid ON
            setGreenLed(true);
        } else {
            // Disarmed state: Green LED slow heartbeat blink (every 1000ms)
            if (currentMillis - _lastBlinkMillis >= 1000) {
                _lastBlinkMillis = currentMillis;
                _blinkToggle = !_blinkToggle;
                setGreenLed(_blinkToggle);
            }
        }
    }
}

void ActuatorController::selfTest() {
    Serial.println("[Actuators] Starting hardware self-test routine...");
    
    // Green LED test
    Serial.println("[Actuators] Testing Green LED...");
    setGreenLed(true);
    delay(400);
    setGreenLed(false);
    delay(200);

    // Red LED test
    Serial.println("[Actuators] Testing Red LED...");
    setRedLed(true);
    delay(400);
    setRedLed(false);
    delay(200);

    // Buzzer test (brief chirp)
    Serial.println("[Actuators] Testing Buzzer (brief beep)...");
    setBuzzer(true);
    delay(150);
    setBuzzer(false);
    delay(200);

    // Relay test (click click)
    Serial.println("[Actuators] Testing Relay click...");
    setRelay(true);
    delay(300);
    setRelay(false);
    delay(200);

    Serial.println("[Actuators] Self-test complete. All peripherals initialized to OFF.");
}
