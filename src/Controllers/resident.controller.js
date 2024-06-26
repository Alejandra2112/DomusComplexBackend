const { response } = require('express');
const ResidentModel = require('../Models/resident.model');
const { upload, updateFile } = require('../Helpers/uploads.helpers');
const ApartmentResidentModel = require('../Models/apartment.residents.model');
const { body } = require('express-validator');
const bcryptjs = require('bcryptjs')
const UserModel = require('../Models/users.model');
const Rols = require('../Models/rols.model');
const ApartmentModel = require('../Models/apartment.model');
const OwnersModel = require('../Models/owners.model');
const ApartmentOwnerModel = require('../Models/apartment.owners.model');
const Booking = require('../Models/booking.model');

const { GmailTransporter } = require('../Helpers/emailConfig');
const Mails = require('../Helpers/Mails');
const Notification = require('../Models/notification.model');

const getOneResidents = async (req, res = response) => {
    try {
        const { iduser } = req.params;

        console.log(iduser, 'idparam')

        const resident = await ResidentModel.findOne(
            {
                where: { iduser: iduser },

                include: [{

                    model: UserModel,
                    as: "user"
                }],

            }

        );

        console.log(resident, 'resident')

        const bookings = await Booking.findAll({

            where: { idResident: resident.idResident }
        })

        const apartmentResidents = await ApartmentResidentModel.findAll({

            where: { idResident: resident.idResident },

        })



        const apartments = await ApartmentModel.findAll();

        const data = apartmentResidents.map(ao => {

            const apartment = apartments.find(apartment => apartment.idApartment === ao.idApartment);


            return {
                ...ao.dataValues,
                apartment,
            }
        })

        if (!resident) {
            return res.status(404).json({ error: 'Id residente no esta encontrado' });
        }

        res.json({

            resident,
            apartments: data,
            bookings

        });

    } catch (error) {
        console.error('Error al obtener residente:', error);
        res.status(500).json({
            error: 'Error al obtener residente',
        });
    }
};


const getAllResidents = async (req, res = response) => {
    try {
        const residents = await ResidentModel.findAll({
            include: [
                {
                    model: UserModel,
                    as: 'user'
                },
            ],
            order: [
                ['idResident', 'DESC'] // Ordenando por el ID en orden descendente
            ]
        });

        const residentList = await Promise.all(residents.map(async (resident) => {
            const apartmentResidents = await ApartmentResidentModel.findAll({
                where: { idResident: resident.idResident, status: 'Active' },
            });

            const apartmentList = await Promise.all(apartmentResidents.map(async (apartment) => {
                const apartmentInfo = await ApartmentModel.findOne({
                    where: { idApartment: apartment.idApartment }
                });
                console.log(apartmentInfo);
                return apartmentInfo;
            }));

            resident.dataValues.apartments = apartmentList;
            resident.dataValues.apartmentResidents = apartmentResidents;

            return resident;
        }));

        res.json({
            residents: residentList,
        });

    } catch (error) {
        console.error('Error al obtener residentes:', error);
        res.status(500).json({
            error: 'Error al obtener residentes',
        });
    }
};


const postResident = async (req, res) => {

    try {

        const pdfUrl = req.files !== null ? await upload(req.files.pdf, ['pdf'], 'Documents') : null
        const imgUrl = req.files !== null ? await upload(req.files.userImg, ['png', 'jpg', 'jpeg'], 'Images') : null

        const { idUserLogged, pdf, idApartment, ...userData } = req.body;


        passwordOrinignal = userData.password;

        passwordOrinignal = userData.name.charAt(0).toUpperCase() + userData.lastName.charAt(0).toLowerCase() + userData.document + '*';

        const salt = bcryptjs.genSaltSync();
        userData.password = bcryptjs.hashSync(passwordOrinignal, salt);

        const user = await UserModel.create({
            pdf: pdfUrl,
            userImg: imgUrl,
            idrole: 2, // resident rol 
            password: userData.password,
            status: "Inactivo",

            ...userData

        })

        // Email funtion

        if (user) {
            const mailOptions = Mails.changedStatusEmail(user.name, user.lastName, user.email, user.email,
            );

            GmailTransporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error al enviar el correo:', error);
                    res.status(500).json({ message: 'Error al enviar el correo' });
                } else {
                    console.log('Correo enviado:', info.response);
                    res.json({ message: 'Correo con código de recuperación enviado' });
                }
            });
        }

        const resident = await ResidentModel.create({

            iduser: user.iduser,
            residentType: userData.residentType,
            status: "Inactive" // Active becase live in the tower
        })

        // const salt = bcryptjs.genSaltSync();
        // userData.password = bcryptjs.hashSync(userData.password, salt);

        // const user = await UserModel.create({

        //     pdf: pdfUrl,
        //     userImg: imgUrl,
        //     password: userData.password,
        //     idrole: userData.idrole,
        //     status: "Inactivo", // Creste user for wait admin permission
        //     ...userData

        // })


        let owner;
        let apartmentOwner;

        if (resident && resident.residentType == 'owner' && idApartment) {

            owner = await OwnersModel.create({
                iduser: user.iduser,
                status: resident.status

            })

            apartmentOwner = await ApartmentOwnerModel.create({

                idApartment: idApartment,
                idOwner: owner.idOwner,
                OwnershipStartDate: userData.residentStartDate
            })
        }


        const apartmentResident = idApartment ? await ApartmentResidentModel.create({

            idApartment: idApartment,
            idResident: resident.idResident,
            residentStartDate: userData.residentStartDate

        }) : null

        const roleData = await Rols.findByPk(userData.idrole);


        const userLogged = await UserModel.findByPk(idUserLogged)

        let notification;
        let apartment = await ApartmentModel.findByPk(idApartment)


        if (idUserLogged && userLogged) {

            notification = await Notification.create({

                iduser: idUserLogged,
                type: 'success',
                content: {
                    message: `Se agrego un nuevo residencia ${owner ? `y propietario` : ''} ${user.name} ${user.lastName}
                     ${apartment ? ` al apartamento ${apartment.apartmentName}` : ''}
                    `,
                    information: { userLogged, resident }
                },
                datetime: new Date(),

            })
        }

        res.json({

            message: notification.content.message,

        });



    } catch (error) {
        console.error('Error al crear residente:', error);
        console.error(error.stack); // This will print the stack trace
        return res.status(500).json({ message: 'Error interno del servidor hola', error: error.message });
    }

};




const putResident = async (req, res = response) => {

    try {

        const { idUserLogged, idResident, idApartment, ...residentAtributes } = req.body


        const resident = await ResidentModel.findOne(
            {
                where: { idResident: idResident },

                include: [{
                    model: UserModel,
                    as: 'user'
                }]
            }

        );

        if (!resident) {
            return res.status(400).json({ msg: "Residente no encontrado." });
        }

        console.log(resident)


        // const newOwner = resident.residentType != "owner" && residentAtributes.residentType == "owner" ?
        //     await OwnersModel.create({
        //         iduser: resident.iduser,
        //         ...residentAtributes
        //     }) : ""

        let newOwner = "";

        if (resident.residentType != "owner" && residentAtributes.residentType == "owner") {
            newOwner = await OwnersModel.create({
                iduser: resident.iduser,
                ...residentAtributes
            });

            console.log(idApartment, "id apartamento");

            if (idApartment != "") {
                await ApartmentOwnerModel.create({
                    idOwner: newOwner.idOwner,
                    idApartment: idApartment,
                    OwnershipStartDate: new Date(),
                    status: "Active"
                });
            }
        }


        const updatedResident = await resident.update({

            residentType: residentAtributes.residentType,
            status: residentAtributes.status,

        });

        // Notifications

        const userLogged = await UserModel.findByPk(idUserLogged)


        // update state role 
        const user = await UserModel.findByPk(resident.iduser);
        if (!user) {
            throw new Error('User not found');
        }

        const state = resident.status === 'Active' ? 'Activo' : 'Inactivo';
        await UserModel.update({ status: state }, { where: { iduser: user.iduser } });

        if (state === 'Activo') {
            await Rols.update({ state: state }, { where: { idrole: user.idrole } });
        }

        let notification;
        let apartment = await ApartmentModel.findByPk(idApartment)


        if (idUserLogged && userLogged) {

            notification = await Notification.create({

                iduser: idUserLogged,
                type: 'warning',
                content: {
                    message: `Se modifico la residencia de ${resident.user.name} ${resident.user.lastName}
                     ${apartment ? `en el apartamento ${apartment.apartmentName}` : ''}
                    `,
                    information: { userLogged, apartment }
                },
                datetime: new Date(),

            })
        }

        res.json({

            message: notification.content.message,

        });


    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al editar residente" });
    }
};


const putResidentStatus = async (req, res = response) => {

    try {

        const { idResident, idUserLogged } = req.body

        const resident = await ResidentModel.findOne({ where: { idResident: idResident } })
        const user = await UserModel.findOne({ where: { iduser: resident.iduser } })

        let residentUpdated;
        let message;

        if (resident.status == 'Active') {

            residentUpdated = await resident.update({
                status: 'Inactive'
            });

            message = `Se desactivo el residente ${user.name} ${user.lastName}. ya no es parte del conjunto residencial.`

        } else if (resident.status == 'Inactive') {

            residentUpdated = await resident.update({
                status: 'Active'
            });

            message = `Se reestablecio a ${user.name} ${user.lastName} como residente.`

        }

        const userLogged = await UserModel.findByPk(idUserLogged)


        let notification;

        if (idUserLogged && user) {

            notification = await Notification.create({

                iduser: idUserLogged,
                type: residentUpdated.status == 'Inactive' ? 'danger' : 'success',
                content: {
                    message: `${message}`,
                    information: { user, userLogged, resident }
                },
                datetime: new Date(),

            })

            res.json({

                message: notification.content.message

            })
        }

    } catch (error) {
        console.error('Error al modificar residente:', error);
        return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    }
}


// const deleteResident = async (req, res) => {

//     const { idResident } = req.body;
//     let message = '';

//     try {

//         const rowsDeleted = await ResidentModel.destroy({ where: { idResident: idResident } });

//         if (rowsDeleted > 0) {

//             message = 'Resident dalete ok';

//         } else {

//             res.status(404).json({ error: 'Id resident not found' });

//         }
//     } catch (e) {

//         res.status(500).json({ error: 'Error delete resident', message: e.message });

//     }
//     res.json({

//         residents: message,

//     });
// };

// const getResidentDocument = async (req, res = response) => {
//     try {
//         const document = req.params.document;

//         const residente = await ResidentModel.findOne({ where: { docNumber: document } });
//         console.log('Residente obtenido correctamente:', residente);

//         if (!residente) {
//             return res.status(404).json({ error: 'No se encontró un residente con ese documento' });
//         }

//         res.json({
//             residente,
//         });
//     } catch (error) {
//         console.error('Error al obtener residente:', error);
//         res.status(500).json({
//             error: 'Error al obtener residente',
//             errorMessage: error.toString(), // Cambia esto
//         });
//     }
// }


module.exports = {
    getOneResidents,
    getAllResidents,
    postResident,
    putResident,
    putResidentStatus
    // deleteResident,
    // getResidentDocument
};
