import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import * as schedule from 'node-schedule';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { SmartThermostatConfig, ApplianceConfig, ThermostatConfig } from './settings';

/**
 * HomebridgePlatform
 */
export class SmartThermostatPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  // Store initialized accessories
  private accessories: Map<string, PlatformAccessory> = new Map();

  // Configuration values
  private pollInterval: number;
  private tvTempAdjustment: number;
  private config: SmartThermostatConfig;

  constructor(
    public readonly log: Logger,
    config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;
    
    // Convert config to our typed interface and store it
    this.config = config as SmartThermostatConfig;
    
    // Set up configuration values with defaults
    this.pollInterval = this.config.pollInterval || 180;  // 3 minutes
    this.tvTempAdjustment = this.config.tvTempAdjustment || 2;  // 2 degrees

    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired, start the automation
    this.api.on('didFinishLaunching', () => {
      this.initializeAutomation();
    });
  }

  /**
   * Required function for Homebridge
   * Called when cached accessories are restored
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.set(accessory.UUID, accessory);
  }

  /**
   * Helper to find an accessory by name or UUID
   */
  private getAccessory(identifier: string): PlatformAccessory | undefined {
    return Array.from(this.accessories.values()).find(accessory => 
      accessory.displayName === identifier || 
      accessory.UUID === identifier
    );
  }

  /**
   * Get temperature from a sensor
   */
  private getTemperature(sensorName: string): number | undefined {
    const sensor = this.getAccessory(sensorName);
    return sensor?.getService(this.Service.TemperatureSensor)
      ?.getCharacteristic(this.Characteristic.CurrentTemperature)
      ?.value as number | undefined;
  }

  /**
   * Get temperature adjusted for TV heat if needed
   */
  private async getAdjustedTemperature(sensorName: string): Promise<number> {
    let baseTemp = this.getTemperature(sensorName) || 0;
    
    // Check configured TV sensors
    for (const tvSensor of this.config.tvSensors || []) {
      const sensor = this.getAccessory(tvSensor);
      const isActive = sensor?.getService(this.Service.MotionSensor)
        ?.getCharacteristic(this.Characteristic.MotionDetected)
        ?.value as boolean;
      
      if (isActive) {
        baseTemp -= this.tvTempAdjustment;
        this.log.debug(`TV active, adjusting temperature by -${this.tvTempAdjustment}°`);
        break;
      }
    }
    
    return baseTemp;
  }

  /**
   * Control an appliance via switch or webhook
   */
  private async setApplianceState(applianceConfig: ApplianceConfig, state: boolean): Promise<void> {
    const { name, controlType } = applianceConfig;
    
    switch (controlType) {
      case 'switch': {
        const accessory = this.getAccessory(name);
        if (accessory) {
          accessory.getService(this.Service.Switch)
            ?.getCharacteristic(this.Characteristic.On)
            ?.setValue(state);
        }
        break;
      }
      
      case 'webhook': {
        if (!applianceConfig.webhook) {
          this.log.error(`No webhook URL configured for ${name}`);
          return;
        }

        try {
          const response = await fetch(applianceConfig.webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        } catch (error) {
          this.log.error(`Webhook error for ${name}: ${error}`);
        }
        break;
      }
    }
    
    this.log.info(`Set ${name} to ${state}`);
  }

  /**
   * Check and update a single thermostat's appliances
   */
  private async checkThermostat(thermostatConfig: ThermostatConfig): Promise<void> {
    const { name, tempSensor, appliances } = thermostatConfig;

    const thermostat = this.getAccessory(name);
    if (!thermostat) {
      this.log.error(`Thermostat ${name} not found`);
      return;
    }

    const thermostatService = thermostat.getService(this.Service.Thermostat);
    if (!thermostatService) {
      this.log.error(`Thermostat service not found for ${name}`);
      return;
    }

    // Get current states
    const currentMode = thermostatService
      .getCharacteristic(this.Characteristic.CurrentHeatingCoolingState)
      .value as number;
    
    const targetTemp = thermostatService
      .getCharacteristic(this.Characteristic.TargetTemperature)
      .value as number;

    // Get current temperature with TV adjustment if needed
    const currentTemp = await this.getAdjustedTemperature(tempSensor);
    
    this.log.debug(`${name} - Mode: ${currentMode}, Target: ${targetTemp}°, Current: ${currentTemp}°`);

    // Control each appliance based on thermostat state
    for (const appliance of appliances) {
      switch (currentMode) {
        case this.Characteristic.CurrentHeatingCoolingState.HEAT:
          if (currentTemp < targetTemp) {
            await this.setApplianceState(appliance, true);
          } else if (currentTemp >= targetTemp) {
            await this.setApplianceState(appliance, false);
          }
          break;
          
        case this.Characteristic.CurrentHeatingCoolingState.COOL:
          if (currentTemp > targetTemp) {
            await this.setApplianceState(appliance, true);
          } else if (currentTemp <= targetTemp) {
            await this.setApplianceState(appliance, false);
          }
          break;
          
        default:
          await this.setApplianceState(appliance, false);
      }
    }
  }

  /**
   * Initialize the automation system
   */
  private async initializeAutomation(): Promise<void> {
    // Schedule regular temperature checks
    schedule.scheduleJob(`*/${this.pollInterval} * * * * *`, async () => {
      try {
        for (const thermostat of this.config.thermostats || []) {
          await this.checkThermostat(thermostat);
        }
      } catch (error) {
        this.log.error('Error in temperature check:', error);
      }
    });

    // Set up TV sensor monitoring
    for (const tvSensor of this.config.tvSensors || []) {
      const sensor = this.getAccessory(tvSensor);
      if (sensor) {
        sensor.getService(this.Service.MotionSensor)
          ?.getCharacteristic(this.Characteristic.MotionDetected)
          ?.on('change', () => {
            // Trigger immediate temperature check when TV state changes
            this.config.thermostats?.forEach(thermostat => 
              this.checkThermostat(thermostat)
            );
          });
      }
    }
  }
}