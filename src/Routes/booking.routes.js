const { Router } = require('express');
const route = Router();
const { getBooking, postBooking, putBooking, getOneBookingbySpaces, getOneBooking } = require('../Controllers/booking.controller');
const { bookingValidationPost, bookingValidationPut } = require('../Middlewares/booking.middleware');
const validator = require('../Middlewares/validation.middleware');

route.get('/', getBooking);
route.post('/', bookingValidationPost, validator, postBooking);
route.put('/', bookingValidationPut, validator, putBooking);
route.get('/:idSpace', getOneBookingbySpaces);
route.get('/one/:idbooking', getOneBooking);

module.exports = route;