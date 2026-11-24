#include "security_state.h"

SecurityStateMachine::SecurityStateMachine()
    : _state(STATE_DISARMED),
      _thresholdCm(DEFAULT_DISTANCE_THRESHOLD_CM),
      _lastDistanceCm(-1.0f),
      _consecutiveViolations(0),
      _alarmStartMillis(0),
      _silenceUntilMillis(0),
      _totalTriggers(0) {}

void SecurityStateMachine::begin() {
    // Start ARMED by default to immediately enforce theft detection rules
    _state = STATE_ARMED_NORMAL;
    _consecutiveViolations = 0;
    _alarmStartMillis = 0;
    _silenceUntilMillis = 0;
    Serial.printf("[Security] State machine ready. Detection threshold: %.1f cm (Status: ARMED_SAFE)\n", _thresholdCm);
}

void SecurityStateMachine::arm() {
    if (_state != STATE_ARMED_NORMAL) {
        _state = STATE_ARMED_NORMAL;
        _consecutiveViolations = 0;
        _silenceUntilMillis = 0;
        Serial.println("[Security] System is now ARMED. Monitoring ultrasonic field...");
    }
}

void SecurityStateMachine::disarm() {
    _state = STATE_DISARMED;
    _consecutiveViolations = 0;
    _alarmStartMillis = 0;
    _silenceUntilMillis = 0;
    Serial.println("[Security] System is now DISARMED. Peripherals standing by.");
}

void SecurityStateMachine::resetAlarm() {
    _state = STATE_ARMED_NORMAL;
    _consecutiveViolations = 0;
    _alarmStartMillis = 0;
    _silenceUntilMillis = millis() + 6000; // 6-second silence grace period prevents immediate re-trigger
    Serial.println("[Security] Alarm silenced/reset. 6-second silence grace period active.");
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

    // Silence grace period active: suppress alarm re-triggering while user is clearing the area
    if (millis() < _silenceUntilMillis) {
        if (currentDistanceCm > _thresholdCm) {
            // Obstacle moved away: end grace period immediately so system is armed for new intrusions
            _silenceUntilMillis = 0;
        }
        _consecutiveViolations = 0;
        return false;
    }

    // In ALARM_TRIGGERED mode:
    // Sustains the alarm for the full ALARM_ACTIVE_DURATION_MS (25 seconds) unless user explicitly silences it!
    if (_state == STATE_ALARM_TRIGGERED) {
        if (millis() - _alarmStartMillis >= ALARM_ACTIVE_DURATION_MS) {
            Serial.println("[Security] Alarm duration timeout elapsed (full duration completed). Resetting to Armed standby.");
            _state = STATE_ARMED_NORMAL;
            _consecutiveViolations = 0;
        }
        return false;
    }

    // ARMED_NORMAL mode:
    // Distance <= threshold : INTRUDER DETECTED
    // Distance > threshold  : SAFE
    if (currentDistanceCm > 0.0f && currentDistanceCm <= _thresholdCm) {
        _consecutiveViolations++;
        Serial.printf("[Security] Intrusion reading #%d: %.1f cm (Threshold: %.1f cm)\n",
                      _consecutiveViolations, currentDistanceCm, _thresholdCm);

        if (_consecutiveViolations >= CONFIRMATION_SAMPLES) {
            _state = STATE_ALARM_TRIGGERED;
            _alarmStartMillis = millis();
            _totalTriggers++;
            Serial.println("[Security] *** INTRUDER DETECTED! WITHIN THRESHOLD (<= 30 cm)! ***");
            return true; // New alarm event triggered!
        }
    } else {
        // Reset confirmation counter if reading is clear (> 30 cm)
        if (_consecutiveViolations > 0) {
            _consecutiveViolations--;
        }
    }

    return false;
}
