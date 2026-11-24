#include "dht11.h"

DHT11Sensor::DHT11Sensor(uint8_t pin, DHTType type)
    : _pin(pin), _type(type), _temperature(-999.0f), _humidity(-999.0f),
      _hasValidReading(false), _lastReadMillis(0) {}

void DHT11Sensor::begin() {
    pinMode(_pin, INPUT_PULLUP);
}

bool DHT11Sensor::read() {
    unsigned long currentMillis = millis();
    // DHT11 / DHT22 requires at least 1500-2000ms between consecutive reads
    if (_lastReadMillis != 0 && (currentMillis - _lastReadMillis < 2000)) {
        return _hasValidReading;
    }
    _lastReadMillis = currentMillis;

    uint8_t data[5] = {0, 0, 0, 0, 0};

    // 1. Host start signal: Pull LOW for 15ms (compatible with both DHT11 & DHT22/AM2302)
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
    delay(15);

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
    if (data[4] == checksum && (data[0] != 0 || data[1] != 0 || data[2] != 0 || data[3] != 0)) {
        if (_type == DHT_TYPE_DHT22) {
            // DHT22 / AM2302 (16-bit high precision):
            // Bytes 0 & 1: Relative Humidity * 10
            uint16_t rawHum = ((uint16_t)data[0] << 8) | data[1];
            _humidity = (float)rawHum * 0.1f;

            // Bytes 2 & 3: Temperature * 10 (bit 15 indicates negative temperature)
            int16_t rawTemp = (((int16_t)(data[2] & 0x7F)) << 8) | data[3];
            if (data[2] & 0x80) {
                rawTemp = -rawTemp;
            }
            _temperature = (float)rawTemp * 0.1f;
        } else {
            // DHT11 (8-bit integer precision):
            _humidity = (float)data[0] + ((float)data[1] * 0.1f);
            _temperature = (float)data[2] + ((float)data[3] * 0.1f);
        }

        _hasValidReading = true;
        return true;
    }

    _hasValidReading = false;
    return false;
}
