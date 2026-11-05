#ifndef SECURITY_STATE_H
#define SECURITY_STATE_H

#include <Arduino.h>
#include "config.h"

enum SystemSecurityState {
    STATE_DISARMED,
    STATE_ARMED_NORMAL,
    STATE_ALARM_TRIGGERED
};

class SecurityStateMachine {
public:
    SecurityStateMachine();

    void begin();
    
    // Evaluate ultrasonic distance reading
    // Returns true if a NEW alarm was just triggered
    bool processReading(float currentDistanceCm);

    // State commands
    void arm();
    void disarm();
    void resetAlarm();
    void setThreshold(float thresholdCm);

    // Getters
    SystemSecurityState getState() const { return _state; }
    bool isArmed() const { return _state != STATE_DISARMED; }
    bool isAlarmActive() const { return _state == STATE_ALARM_TRIGGERED; }
    float getThreshold() const { return _thresholdCm; }
    float getLastDistance() const { return _lastDistanceCm; }
    unsigned long getAlarmStartTime() const { return _alarmStartMillis; }
    int getTriggerCount() const { return _totalTriggers; }

private:
    SystemSecurityState _state;
    float _thresholdCm;
    float _lastDistanceCm;
    int _consecutiveViolations;
    unsigned long _alarmStartMillis;
    int _totalTriggers;
};

#endif // SECURITY_STATE_H
