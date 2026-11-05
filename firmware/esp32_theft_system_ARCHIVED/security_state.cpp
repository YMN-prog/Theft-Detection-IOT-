#include "security_state.h"

SecurityStateMachine::SecurityStateMachine()
    : _state(STATE_DISARMED),
      _thresholdCm(DEFAULT_DISTANCE_THRESHOLD_CM),
      _lastDistanceCm(-1.0f),
      _consecutiveViolations(0),
      _alarmStartMillis(0),
      _totalTriggers(0) {}

void SecurityStateMachine::begin() {
    _state = STATE_DISARMED;
    _consecutiveViolations = 0;
    _alarmStartMillis = 0;
    Serial.printf("[Security] State machine initialized. Default threshold: %.1f cm (Status: DISARMED)\n", _thresholdCm);
}

void SecurityStateMachine::arm() {
    if (_state != STATE_ARMED_NORMAL) {
        _state = STATE_ARMED_NORMAL;
        _consecutiveViolations = 0;
        Serial.println("[Security] System is now ARMED. Monitoring ultrasonic field...");
    }
}

void SecurityStateMachine::disarm() {
    _state = STATE_DISARMED;
    _consecutiveViolations = 0;
    _alarmStartMillis = 0;
    Serial.println("[Security] System is now DISARMED. Peripherals standing by.");
}

void SecurityStateMachine::resetAlarm() {
    if (_state == STATE_ALARM_TRIGGERED) {
        _state = STATE_ARMED_NORMAL;
        _consecutiveViolations = 0;
        _alarmStartMillis = 0;
        Serial.println("[Security] Alarm silenced/reset. Returning to ARMED mode.");
    }
}

void SecurityStateMachine::setThreshold(float thresholdCm) {
    if (thresholdCm >= 5.0f && thresholdCm <= 350.0f) {
        _thresholdCm = thresholdCm;
        Serial.printf("[Security] Threshold updated to: %.1f cm\n", _thresholdCm);
    }
}

bool SecurityStateMachine::processReading(float currentDistanceCm) {
    _lastDistanceCm = currentDistanceCm;

    // In DISARMED mode, just update readings, no alerts triggered
    if (_state == STATE_DISARMED) {
        _consecutiveViolations = 0;
        return false;
    }

    // In ALARM_TRIGGERED mode, check if alarm duration expired
    if (_state == STATE_ALARM_TRIGGERED) {
        if (millis() - _alarmStartMillis >= ALARM_ACTIVE_DURATION_MS) {
            Serial.println("[Security] Alarm duration timeout elapsed. Resetting to Armed standby.");
            _state = STATE_ARMED_NORMAL;
            _consecutiveViolations = 0;
        }
        return false;
    }

    // ARMED_NORMAL mode: check for theft intrusion
    // Valid distance must be > 0 and <= threshold
    if (currentDistanceCm > 0.0f && currentDistanceCm <= _thresholdCm) {
        _consecutiveViolations++;
        Serial.printf("[Security] Intrusion reading #%d: %.1f cm (Threshold: %.1f cm)\n",
                      _consecutiveViolations, currentDistanceCm, _thresholdCm);

        if (_consecutiveViolations >= CONFIRMATION_SAMPLES) {
            _state = STATE_ALARM_TRIGGERED;
            _alarmStartMillis = millis();
            _totalTriggers++;
            Serial.println("[Security] *** THEFT DETECTED! INTRUDER WITHIN THRESHOLD! ***");
            return true; // New alarm event triggered!
        }
    } else {
        // Reset confirmation counter if reading is clear
        if (_consecutiveViolations > 0) {
            _consecutiveViolations--;
        }
    }

    return false;
}
