var Service,
  Characteristic,
  CustomCharacteristic,
  FakeGatoHistoryService,
  NetatmoApi;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  FakeGatoHistoryService = require('fakegato-history')(homebridge);

  NetatmoApi = require('./netatmo-api');

  homebridge.registerPlatform("homebridge-netatmo-indoor-aqm", "NetatmoIndoor", NetatmoIndoorPlatform);
};

function NetatmoIndoorPlatform(log, config, api) {
  this.log = log;
  this.config = config;
  this.displayName = config['name'];
  this.getMeasurement = NetatmoApi(config);
  // Update interval
  this.interval = ('interval' in config ? parseInt(config['interval']) : 4);
  this.interval = (typeof this.interval !== 'number' || (this.interval % 1) !== 0 || this.interval < 0) ? 4 : this.interval;
}

NetatmoIndoorPlatform.prototype = {
  // Get the current condition accessory and all forecast accessories
  accessories: function (callback) {
    callback([ new RoomAirQualityAccessory(this) ]);
  },
  updateAirQuality: function () {
    setTimeout(this.updateAirQuality.bind(this), (this.interval) * 60 * 1000);
  },
  // Save changes from update in characteristics
  saveCharacteristic: function (service, name, value) {
    // humidity not a custom but a general apple home kit characteristic
    if (name === 'Humidity') {
      service.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
    }
    // temperature not a custom but a general apple home kit characteristic
    else if (name === 'Temperature') {
      service.setCharacteristic(Characteristic.CurrentTemperature, value);
    }
    // all other custom characteristics
    else {
    if (CustomCharacteristic[name]._unitvalue) value = CustomCharacteristic[name]._unitvalue(value);
      service.setCharacteristic(CustomCharacteristic[name], value);
    }
  },

  // Add history entry
  addHistory: function () {
    for (var i = 0; i < this.accessories.length; i++) {
      if (this.accessories[i] !== undefined && this.accessories[i].currentConditionsService !== undefined) {
        // Add entry to history
        this.accessories[i].historyService.addEntry({
          time: new Date().getTime() / 1000,
          temp: 20,
          pressure: 1000,
          humidity: 50
        });
        break;
      }
    }

    // Call function every 9:50 minutes (a new entry every 10 minutes is required to avoid gaps in the graph)
    setTimeout(this.addHistory.bind(this), (10 * 60 * 1000) - 10000);
  }
};

function RoomAirQualityAccessory(platform) {
	this.platform = platform;
	this.log = platform.log;
	this.name = platform.displayName || "Room Air Quality";

	// Create temperature sensor service that includes temperature characteristic
	this.currentConditionsService = new Service.TemperatureSensor(this.name);

	// Fix negative temperatures not supported by homekit
	this.currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Create information service
	this.informationService = new Service.AccessoryInformation();
	this.informationService
		.setCharacteristic(Characteristic.Manufacturer, "Netatmo")
		.setCharacteristic(Characteristic.Model, this.platform.api.attribution)
		.setCharacteristic(Characteristic.SerialNumber, this.platform.location);

	// Create history service
	this.historyService = new FakeGatoHistoryService("weather", this, {
		storage: 'fs'
	});
	setTimeout(this.platform.addHistory.bind(this.platform), 10000);

	// Start the weather update process
	this.platform.updateAirQuality();
}

RoomAirQualityAccessory.prototype = {
	identify: function (callback) {
		callback();
	},

	getServices: function () {
		return [this.informationService, this.currentConditionsService, this.historyService];
	}
};
