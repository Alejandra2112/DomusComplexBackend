const { Router } = require('express')
const route = Router()
const { getUser, postUser, putUser, putPersonalInformation, putChangeImg, getUserOne, postUserEmail, resetPassword, getUserDocument, getEmailUser, putPasswordUser } = require('../Controllers/users.controller.js')
const validator = require('../Middlewares/validation.middleware');
const { userValidations, activeUsers } = require('../Middlewares/user.middleware.js');

const { userPersonalInfoValidationForPut, passwordValidationForPost, passwordValidationReset } = require('../Middlewares/user.middleware.js')


route.get('/:iduser', getUserOne);
route.get('/document/:document', getUserDocument);
route.get('/email/:email', getEmailUser);


route.get('/', getUser)

route.post('/', userValidations, validator, postUser);
route.put('/img', activeUsers, putChangeImg)
route.put('/password', activeUsers, passwordValidationForPost, validator, putPasswordUser)
route.put('/personalInfo', activeUsers, userPersonalInfoValidationForPut, validator, putPersonalInformation)

route.post('/reset', passwordValidationReset, validator, resetPassword) //cambiar contraseña desde el restablecer contraseña
route.put('/:iduser', userValidations, validator, putUser)
// route.put('/edited', putUser)
route.post('/email', postUserEmail)



module.exports = route