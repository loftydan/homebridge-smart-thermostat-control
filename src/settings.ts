/**
 * Platform name users will use in config.json
 */
export const PLATFORM_NAME = 'HomebridgeSmartThermostat';

/**
 * Plugin name from package.json
 */
export const PLUGIN_NAME = 'homebridge-smart-thermostat-control';

/**
 * Configuration for each appliance (heater, cooler, etc.)
 */
export interface ApplianceConfig {
  name: string;                              // Name of the appliance in Homebridge
  type: 'heater' | 'cooler' | 'fan';        // Type of appliance
  controlType: 'switch' | 'webhook';         // How to control the appliance
  webhook?: string;                          // Optional webhook URL if using webhook control
}

/**
 * Configuration for each virtual thermostat
 */
export interface ThermostatConfig {
  name: string;                // Name of the virtual thermostat
  tempSensor: string;         // Name/ID of the temperature sensor to use
  appliances: ApplianceConfig[];  // List of appliances controlled by this thermostat
}

/**
 * Main plugin configuration interface
 */
export interface SmartThermostatConfig {
  name: string;               // Plugin instance name
  platform: string;           // Must match PLATFORM_NAME
  pollInterval?: number;      // How often to check temperatures (seconds)
  tvTempAdjustment?: number;  // Degrees to subtract when TV is active
  tempSensors?: string[];    // List of temperature sensor names/IDs
  tvSensors?: string[];      // List of Apple TV motion sensor names/IDs
  thermostats?: ThermostatConfig[];  // List of virtual thermostats
}