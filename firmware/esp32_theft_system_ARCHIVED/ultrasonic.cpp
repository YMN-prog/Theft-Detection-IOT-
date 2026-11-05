#include "ultrasonic.h"

UltrasonicSensor::UltrasonicSensor(uint8_t trigPin, uint8_t echoPin)
    : _trigPin(trigPin), _echoPin(echoPin), _historyIndex(0), _historyFilled(false) {
    for (int i = 0; i < FILTER_WINDOW; i++) {
        _history[i] = 0.0f;
    }
}

void UltrasonicSensor::begin() {
    pinMode(_trigPin, OUTPUT);
    pinMode(_echoPin, INPUT);
    digitalWrite(_trigPin, LOW);
}

float UltrasonicSensor::readDistanceRaw() {
    // Ensure clean LOW pulse before triggering
    digitalWrite(_trigPin, LOW);
    delayMicroseconds(4);

    // Send 10 microsecond HIGH pulse
    digitalWrite(_trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(_trigPin, LOW);

    // Read ECHO pulse duration with 30ms timeout (~510cm max range)
    // Avoids blocking if sensor is unplugged or fails to echo
    unsigned long duration = pulseIn(_echoPin, HIGH, 30000UL);

    if (duration == 0) {
        return -1.0f; // Timeout or sensor disconnected
    }

    // Speed of sound: 343 m/s = 0.0343 cm/microsecond.
    // Distance = (duration * 0.0343) / 2
    float distanceCm = (float)duration * 0.01715f;

    // Filter physical out-of-range limits for HC-SR04 (2cm to 400cm)
    if (distanceCm < 2.0f || distanceCm > 400.0f) {
        return -1.0f;
    }

    return distanceCm;
}

float UltrasonicSensor::readDistanceFiltered() {
    float raw = readDistanceRaw();

    // If reading failed, return the previous valid reading if available, else -1
    if (raw < 0.0f) {
        if (_historyFilled) {
            float sum = 0;
            for (int i = 0; i < FILTER_WINDOW; i++) sum += _history[i];
            return sum / (float)FILTER_WINDOW;
        }
        return -1.0f;
    }

    // Store in ring buffer
    _history[_historyIndex] = raw;
    _historyIndex = (_historyIndex + 1) % FILTER_WINDOW;
    if (_historyIndex == 0) {
        _historyFilled = true;
    }

    int count = _historyFilled ? FILTER_WINDOW : _historyIndex;
    if (count == 0) return raw;

    // Sort copy to calculate median and average (trimmed mean)
    float sorted[FILTER_WINDOW];
    for (int i = 0; i < count; i++) sorted[i] = _history[i];

    for (int i = 0; i < count - 1; i++) {
        for (int j = i + 1; j < count; j++) {
            if (sorted[i] > sorted[j]) {
                float tmp = sorted[i];
                sorted[i] = sorted[j];
                sorted[j] = tmp;
            }
        }
    }

    // Return the median sample
    return sorted[count / 2];
}
