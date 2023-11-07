const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../Database/config');
const User = require('./users.model');
const Booking = require('./booking.model');
const Parking = require('./parking.spaces.model');
const Vehicle = require('./vehicle.model');
const ParkingSpacesModel = require('./parking.spaces.model');
const Visitors = require('./visitors.model');

const Bookingparking = sequelize.define('bookingparking', {

  idbookingparking: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'idbookingparking',
  },

  idbooking: {
    type: DataTypes.INTEGER,
    field: 'idbooking',
  },

  idParkingSpace: {
    type: DataTypes.INTEGER,
    field: 'idParkingSpace',
  },

  idVisitor: {
    type: DataTypes.INTEGER,
    field: 'idvisitor',
  },
  idvehicle: {
    type: DataTypes.INTEGER,
    field: 'idvehicle',
  },

  plate: {
    type: DataTypes.STRING,
    field: 'plate',
  },
},
  {
    timestamps: false,
  }
);

Bookingparking.belongsTo(Booking, {
  foreignKey: 'idbooking',
  targetKey: 'idbooking',
});
Bookingparking.belongsTo(ParkingSpacesModel, {
  foreignKey: 'idParkingSpace',
  targetKey: 'idParkingSpace',
});
Bookingparking.belongsTo(Vehicle, {
  foreignKey: 'idvehicle',
  targetKey: 'idvehicle',
});
Bookingparking.belongsTo(Visitors, {
  foreignKey: 'idvisitor',
  targetKey: 'idvisitor',
});
module.exports = Bookingparking;