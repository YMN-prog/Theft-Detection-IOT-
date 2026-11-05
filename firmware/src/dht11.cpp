#include "dht11.h"

DHT11Sensor::DHT11Sensor(uint8_t pin)
    : _pin(pin), _temperature(-999.0f), _humidity(-999.0f),
      _hasValidReading(false), _lastReadMillis(0) {}

void DHT11Sensor::begin() {
    pinMode(_pin, INPUT_PULLUP);
}

bool DHT11Sensor::read() {
    unsigned long currentMillis = millis();
    // DHT11 requires at least 1500-2000ms between consecutive reads
    if (_lastReadMillis != 0 && (currentMillis - _lastReadMillis < 2000)) {
        return _hasValidReading;
    }
    _lastReadMillis = currentMillis;

    uint8_t data[5] = {0, 0, 0, 0, 0};

    // 1. Host start signal: Pull LOW for 20ms
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
    delay(20);

    // 2. Pull HIGH for 30us and switch to input with pullup
    digitalWrite(_pin, HIGH);
    delayMicroseconds(30);
    pinMode(_pin, INPUT_PULLUP);

    // Critical section: disable interrupts for microsecond timing accuracy
    noInterrupts();

    // 3. Wait for sensor response: 80us LOW, then 80us HIGH
    unsigned long timeout = micros();
    while (digitalRead(_pin) == HIGH) {
        if (micros() - timeout > 100) {
            interrupts();
            _hasValidReading = false;
            return false; // No sensor response
        }
    }

    timeout = micros();
    while (digitalRead(_pin) == LOW) {
        if (micros() - timeout > 100) {
            interrupts();
            _hasValidReading = false;
            return false;
        }
    }

    timeout = micros();
    while (digitalRead(_pin) == HIGH) {
        if (micros() - timeout > 100) {
            interrupts();
            _hasValidReading = false;
            return false;
        }
    }

    // 4. Read 40 data bits (5 bytes)
    for (int i = 0; i < 40; i++) {
        // Wait for bit start (LOW pulse ~50us)
        timeout = micros();
        while (digitalRead(_pin) == LOW) {
            if (micros() - timeout > 100) {
                interrupts();
                _hasValidReading = false;
                return false;
            }
        }

        // Measure HIGH duration (~26-28us for '0', ~70us for '1')
        unsigned long tHighStart = micros();
        while (digitalRead(_pin) == HIGH) {
            if (micros() - tHighStart > 120) {
                break;
            }
        }
        unsigned long highDuration = micros() - tHighStart;

        int byteIdx = i / 8;
        data[byteIdx] <<= 1;
        if (highDuration > 40) {
            data[byteIdx] |= 1; // Bit is 1
        }
    }

    interrupts();

    // 5. Verify 8-bit checksum: sum of first 4 bytes equals byte 5
    uint8_t checksum = (data[0] + data[1] + data[2] + data[3]) & 0xFF;
    if (data[4] == checksum && (data[0] != 0 || data[2] != 0)) {
        _humidity = (float)data[0] + ((float)data[1] * 0.1f);
        _temperature = (float)data[2] + ((float)data[3] * 0.1f);
        _hasValidReading = true;
        return true;
    }

    _hasValidReading = false;
    return false;
}
