var netatmo = require('netatmo');

module.exports = (config) => {
  var auth = {
    "client_id": config.client_id,
    "client_secret": config.client_secret,
    "username": config.username,
    "password": config.password,
  };

  var api = new netatmo(auth);

  var options = {
    "device_id": config.device_id
  };

  return (cb) => {
    api.getHealthyHomeCoachData(options, cb);
  }
}
