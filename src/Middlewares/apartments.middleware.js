const { check } = require('express-validator');

const TowerModel = require('../Models/tower.model');
const ApartmentModel = require('../Models/apartment.model');

const idApartmentValidationsForPost = [

    check('idApartment')
        .notEmpty().withMessage('El ID del apartamento es obligatorio.')
        .isInt().withMessage('El ID del apartamento es obligatorio.')
        .custom(async (value) => {

            const existingApartment = await ApartmentModel.findOne({ where: { idApartment: value } });

            if (existingApartment) {
                return true
            }
            else throw new Error('El apartamento selecionado no esta en el sistema.');

        }),
]

const apartmentsVlidationForPost = [


    check('apartmentsFloor')
        .notEmpty().withMessage('El número de pisos de los apartamentos es obligatorio.')
        .isInt({ min: 1 }).withMessage('El número de pisos de los apartamentos debe ser un número entero positivo.'),

    check('idTower')
        .notEmpty().withMessage('El ID de la torre es obligatorio.')
        .isInt({ min: 1 }).withMessage('El ID de la torre debe ser un número entero positivo.'),

    check('rangeStart')
        .notEmpty().withMessage('El rango de inicio es obligatorio.')
        .isInt({ min: 1 }).withMessage('El rango de inicio debe ser un número entero positivo.'),

    check('rangeEnd')
        .notEmpty().withMessage('El rango de fin es obligatorio.')
        .isInt({ min: 1 }).withMessage('El rango de fin debe ser un número entero positivo.')
        .custom((value, { req }) => {
            if (parseInt(value) <= parseInt(req.body.rangeStart)) {
                throw new Error('El rango de fin debe ser mayor que el rango de inicio.');
            }
            return true;
        }),

    check('area')
        .notEmpty().withMessage('El área es obligatoria.')
        .isFloat({ min: 0 }).withMessage('El área debe ser un número positivo.')
];



const apartmentValidationForPut = [

    // check('idApartment')
    //     .notEmpty().withMessage('El ID del apartamento es obligatorio.')
    //     .isInt().withMessage('El ID del apartamento debe ser un número entero positivo.'),

    check('idTower')
        .notEmpty().withMessage('El ID de la torre es obligatorio.')
        .isInt().withMessage('El ID de la torre debe ser un número entero positivo.')
        .custom(async (value) => {
            const tower = await TowerModel.findOne({ where: { idTower: value } });
            if (tower) {
                return true;
            }
            throw new Error(`El bloque selecionado no esta en el sistema`);

        }),

    check('apartmentName')
        .notEmpty().withMessage('El nombre del apartamento es obligatorio.')
        .isLength({ max: 20 }).withMessage('El nombre del apartamento no puede exceder los 20 caracteres.')
        .matches(/^[a-zA-Z0-9]+$/)
        .withMessage('Nombre del apartamento solo debe tener numeros y letras.')
        .custom(async (value, { req }) => {
            const body = req.body

            const existingApartmentById = await ApartmentModel.findOne({ where: { idApartment: body.idApartment } });
            const existingApartmentByName = await ApartmentModel.findOne({ where: { apartmentName: value } });

            if (!existingApartmentById || !existingApartmentByName) {
                return true;
            } else if (existingApartmentById.apartmentName !== existingApartmentByName.apartmentName) {
                throw new Error(`Nombre del apartamento "${value}" ya está en uso.`);
            } else {
                return true;
            }

        }),

    check('area')
        .notEmpty().withMessage('El área del apartamento es obligatoria.')
        .isNumeric().withMessage('El área del apartamento debe ser un número.')
        .isFloat({ min: 1 }).withMessage('El área del apartamento debe ser un número mayor a cero.')



    // check('idParkingSpace')
    //     .notEmpty().withMessage('El ID del espacio de estacionamiento es obligatorio.')
    //     .isInt().withMessage('El ID del espacio de estacionamiento debe ser un número entero positivo.')
    //     .custom(async (value) => {
    //         const parkingSpace = await ParkingSpacesModel.findOne({ where: { idParkingSpace: value } });
    //         if (parkingSpace) {
    //             return true;
    //         }
    //         throw new Error(`El parqueadero no esta en el sistema`);

    //     }),

]



module.exports = {

    idApartmentValidationsForPost,
    apartmentsVlidationForPost,
    apartmentValidationForPut,

}