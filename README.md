# Homebridge Smart Thermostat Control

A Homebridge plugin that provides intelligent thermostat control with TV heat compensation. This plugin allows you to create virtual thermostats that can control switches or trigger webhooks based on temperature readings, with the ability to compensate for TV-generated heat.

## Features

- Create virtual thermostats that control switches or trigger webhooks
- Use HomePod (or other HomeKit) temperature sensors
- Compensate for TV heat using Apple TV status (requires Apple TV Enhanced plugin)
- Regular temperature polling with configurable intervals
- Support for both heating and cooling modes
- Multiple appliance control per thermostat (switches and/or webhooks)

## Prerequisites

- Homebridge v1.6.0 or newer
- Node.js v18 or newer
- Temperature sensor exposed to HomeKit (e.g., HomePod)
- Optional: Apple TV Enhanced plugin for TV heat compensation

## Installation

1. Install this plugin using Homebridge Config UI X
2. Navigate to Plugins
3. Search for "homebridge-smart-thermostat-control"
4. Click Install

Or install manually:
```bash
npm install -g homebridge-smart-thermostat-control
```

## Configuration

Add this to your Homebridge config.json:

```json
{
    "platforms": [
        {
            "platform": "HomebridgeSmartThermostat",
            "name": "Smart Thermostat",
            "pollInterval": 180,
            "tvTempAdjustment": 2,
            "tvSensors": [
                "Apple TV Playing",
                "Apple TV Paused"
            ],
            "thermostats": [
                {
                    "name": "Bedroom Thermostat",
                    "tempSensor": "Bedroom HomePod",
                    "appliances": [
                        {
                            "name": "Bedroom Heater",
                            "type": "heater",
                            "controlType": "switch"
                        }
                    ]
                }
            ]
        }
    ]
}
```

### Configuration Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `platform` | string | Required | Must be "HomebridgeSmartThermostat" |
| `name` | string | Required | Name for the platform instance |
| `pollInterval` | number | 180 | How often to check temperatures (in seconds) |
| `tvTempAdjustment` | number | 2 | Degrees to subtract when TV is active |
| `tvSensors` | string[] | Optional | List of Apple TV motion sensor names |
| `thermostats` | object[] | Required | Array of thermostat configurations |

#### Thermostat Configuration

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Name of the virtual thermostat |
| `tempSensor` | string | Name of the temperature sensor to use |
| `appliances` | object[] | Array of appliances to control |

#### Appliance Configuration

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Name of the appliance in Homebridge |
| `type` | string | Type of appliance ("heater", "cooler", "fan") |
| `controlType` | string | How to control ("switch" or "webhook") |
| `webhook` | string | URL to call (only for webhook control) |

## Usage Examples

### Basic Heater Control
```json
{
    "name": "Living Room",
    "tempSensor": "Living Room HomePod",
    "appliances": [
        {
            "name": "Space Heater",
            "type": "heater",
            "controlType": "switch"
        }
    ]
}
```

### Multiple Appliances with TV Compensation
```json
{
    "name": "Media Room",
    "tempSensor": "Media Room HomePod",
    "tvSensors": ["Media Room Apple TV"],
    "appliances": [
        {
            "name": "Primary Heater",
            "type": "heater",
            "controlType": "switch"
        },
        {
            "name": "Secondary Heater",
            "type": "heater",
            "controlType": "webhook",
            "webhook": "http://192.168.1.100/api/heater"
        }
    ]
}
```

## Troubleshooting

Common issues and solutions:

1. **Temperature not updating:**
   - Verify your temperature sensor is accessible in HomeKit
   - Check the pollInterval setting
   - Check Homebridge logs for errors

2. **TV compensation not working:**
   - Ensure Apple TV Enhanced plugin is installed and configured
   - Verify TV sensor names match exactly
   - Check if TV motion sensors are triggering correctly

3. **Appliances not responding:**
   - For switches: Verify the switch name matches exactly
   - For webhooks: Check the webhook URL is accessible
   - Check Homebridge logs for connection errors

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details