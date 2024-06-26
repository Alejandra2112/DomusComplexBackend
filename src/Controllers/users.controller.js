const { response } = require('express');
const bcryptjs = require('bcryptjs')
const UserModel = require('../Models/users.model');
const Rols = require('../Models/rols.model');
const ResidentModel = require('../Models/resident.model');
const Watchman = require('../Models/watchmans.model');
const { upload, updateFile } = require('../Helpers/uploads.helpers');
const ApartmentResidentModel = require('../Models/apartment.residents.model');
const Mails = require('../Helpers/Mails');
const Notification = require('../Models/notification.model');
const { GmailTransporter } = require('../Helpers/emailConfig');



const getUser = async (req, res = response) => {
  try {

    const user = await UserModel.findAll();
    console.log('usuarios obtenidos correctamente:', user);

    res.json({
      user,
    });
  } catch (error) {

    console.error('Error al obtener usuarios:', error);

    res.status(500).json({
      error: 'Error al obtener usuarios',
    });
  }
};


const getUserOne = async (req, res = response) => {
  try {
    const { iduser } = req.params;

    const user = await UserModel.findOne({ where: { iduser: iduser } });

    if (!user) {
      return res.status(404).json({ error: 'No se encontró un usuario con ese ID' });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      error: 'Error al obtener usuario',
    });
  }
};


const getUserDocument = async (req, res = response) => {
  try {
    const { document } = req.params;

    const user = await UserModel.findOne({ where: { document: document } });

    if (user) {
      return res.status(409).json({ message: 'Ya existe un usuario con este documento.' });
    }

    res.status(200).json({
      user,
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      error: 'Error al obtener usuario',
    });
  }
}


const getEmailUser = async (req, res = response) => {
  try {
    const { email } = req.params;

    const user = await UserModel.findOne({ where: { email: email } });

    if (user) {
      return res.status(409).json({ message: 'Ya existe un usuario con este correo.' });
    }

    res.status(200).json({
      user,
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      error: 'Error al obtener usuario',
    });

  }
}

const postUserEmail = async (req, res) => {


  const { email } = req.body;

  try {
    const user = await UserModel.findOne({ where: { email: email } });

    if (!user) {
      return res.status(404).json({ message: 'No se encontró un usuario con ese correo electrónico.' });
    }

    return res.json({ message: 'Usuario encontrado exitosamente.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al buscar usuario: ' + error.message });
  }
};


const resetPassword = async (req, res = response) => {
  const { email, newPassword } = req.body;

  try {
    const user = await UserModel.findOne({
      where: {
        email: email,
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const salt = bcryptjs.genSaltSync();
    user.password = bcryptjs.hashSync(newPassword, salt);

    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al restablecer la contraseña:', error);
    res.status(500).json({ message: 'Error al restablecer la contraseña' });
  }
};








const postUser = async (req, res) => {
  try {

    let pdfUrl = null;
    let imgUrl = null;

    if (req.files) {
      if (req.files.pdf) {
        pdfUrl = await upload(req.files.pdf, ['pdf'], 'Documents');
      }
      if (req.files.userImg) {
        imgUrl = await upload(req.files.userImg, ['png', 'jpg', 'jpeg'], 'Images');
      }
    }


    const { idUserLogged, pdf, userImg, idEnterpriseSecurity, residentType, idApartment, ...userData } = req.body;


    let passwordOrinignal = userData.password;

    if (!passwordOrinignal) {
      passwordOrinignal = userData.name.charAt(0).toUpperCase() + userData.lastName.charAt(0).toLowerCase() + userData.document + '*';
    }

    const salt = bcryptjs.genSaltSync();
    userData.password = bcryptjs.hashSync(passwordOrinignal, salt);

    const user = await UserModel.create({
      pdf: pdfUrl,
      userImg: imgUrl,
      password: userData.password,
      ...userData
    })


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

    const role = await Rols.findOne({ where: { idrole: userData.idrole } });
    const roleName = role ? role.namerole.toLowerCase() : null;

    let watchman;
    if (roleName && (roleName.includes('vigilante') || roleName.includes('seguridad') || roleName.includes('vigilancia'))) {
      watchman = await Watchman.create({
        iduser: user.iduser,
        state: "Activo",
        idEnterpriseSecurity: idEnterpriseSecurity,
      });
    }

    let resident;
    let apartment;

    if (roleName && roleName.includes('residente')) {
      resident = await ResidentModel.create({
        iduser: user.iduser,
        residentType: residentType,
        status: "Active"
      })

      await ApartmentResidentModel.create({
        idApartment: idApartment,
        idResident: resident.idResident
      });
    }

    const roleData = await Rols.findByPk(userData.idrole);

    const response = {
      msgUser: "Usuario creado",
      user,
      role: roleData,
    };

    if (watchman) {
      response.msgWatchman = "Vigilante creado";
      response.watchman = watchman;
    }

    if (resident) {
      response.msgResident = "Residente creado";
      response.resident = resident;
    }

    // Add notifications

    if (idUserLogged && user) {

      const notification = await Notification.create({

        iduser: idUserLogged,
        type: 'success',
        content: {
          message: `Se creo el usuario ${user.name} ${user.lastName} con el rol de ${roleData.namerole}`,
          information: { resident: user }
        },
        datetime: new Date(),

      })

      console.log(notification, "notification")

      if (notification) {

        response.notification = notification;

      }
    }


    res.json(response);


  } catch (error) {
    console.error('Error al crear usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor hola', error: error.message });
  }

};



const putPasswordUser = async (req, res) => {
  try {
    const { iduser, password } = req.body;

    const user
      = await UserModel.findOne({ where: { iduser: iduser } });

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    const salt = bcryptjs.genSaltSync();
    user.password = bcryptjs.hashSync(password, salt);

    await user.save();

    res.json({
      msg: "Contraseña actualizada",
      user
    });

  } catch (error) {
    console.error('Error al editar usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};




const putPersonalInformation = async (req, res = response) => {
  try {
    const { idUserLogged, iduser, pdf, ...newData } = req.body;

    const user = await UserModel.findOne({ where: { iduser: iduser } });

    // Llamar a la función updateFile y esperar su resultado
    const newPdf = await updateFile(req.files, pdf, ['pdf'], 'Documents', 'newFile');

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    const updatedUser = await user.update({
      pdf: newPdf,
      docType: newData.docType,
      document: newData.document,
      name: newData.name,
      lastName: newData.lastName,
      birthday: newData.birthday,
      sex: newData.sex,
      email: newData.email,
      phone: newData.phone,
    });

    // Message confirmation and notification

    let message = `La información personal de ${user.name} ${user.lastName} ha sido actualizada.`

    // Add notification 

    console.log(idUserLogged, 'usuario logueado', updatedUser, 'usuario actualizado')

    if (idUserLogged && updatedUser) {

      const notification = await Notification.create({

        iduser: idUserLogged,
        type: 'warning',
        content: {
          message: message,
          information: { userLogged: user, resident: user }
        },
        datetime: new Date(),

      })

      if (notification) {

        response.notification = notification;

      }

    }



    res.json({
      message: message,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error al editar usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};


const putChangeImg = async (req, res = response) => {
  try {
    const { iduser, ...newData } = req.body;

    console.log(req.files, "file")

    const user = await UserModel.findOne({ where: { iduser: iduser } });

    if (!user) {
      return res.status(404).json({ msg: 'usuario no encontrada.' });
    }

    const newImg = user.userImg == "" && req.files ?
      await upload(req.files.userImg, ['png', 'jpg', 'jpeg'], 'Images') :
      req.files ? await updateFile(req.files, user.userImg, ['png', 'jpg', 'jpeg'], 'Images', "userImg") : ""


    const updatedUser = await user.update({

      userImg: newImg == "" ? newData.userImg : newImg,
    });

    res.json({
      message: `Se cambio la imagen de perfil de ${user.name} ${user.lastName}`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error al editar usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};



const putUser = async (req, res) => {
  try {
    const { iduser } = req.params;
    const { idUserLogged, idrole, status, idEnterpriseSecurity, residentType, idApartment, ...update } = req.body;

    console.log(req.files, "filessssssssss")

    const user = await UserModel.findOne({ where: { iduser: iduser } });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const oldStatus = user.status;

    const oldPdf = user.pdf;

    const newPdf = await updateFile(req.files, oldPdf, ['pdf'], 'Documents', 'newFile');

    await user.update({
      pdf: newPdf,
      userImg: null,
      idrole: idrole,
      status: status,
      ...update
    });

    if (status === 'Activo') {
      await Rols.update({ state: status }, { where: { idrole: idrole } });
    }

    if (oldStatus === 'Inactivo' && user.status === 'Activo') {
      if (!user.email) {
        console.error('Error: No se ha definido el correo electrónico del usuario.');
        return res.status(500).json({ error: 'No se ha definido el correo electrónico del usuario.' });
      }
    }

    const role = await Rols.findOne({ where: { idrole: idrole } });
    const roleName = role ? role.namerole.toLowerCase() : null;

    let watchman;
    if (roleName && (roleName.includes('vigilante') || roleName.includes('seguridad') || roleName.includes('vigilancia'))) {
      watchman = await Watchman.findOne({ where: { iduser: iduser } });
      if (watchman) {
        await watchman.update({
          state: status,
          idEnterpriseSecurity: idEnterpriseSecurity,
        });
      } else {
        watchman = await Watchman.create({
          iduser: user.iduser,
          state: status,
          idEnterpriseSecurity: idEnterpriseSecurity,
        });
      }
    } else {
      watchman = await Watchman.destroy({ where: { iduser: user.iduser } });
    }




    let resident;
    if (roleName && roleName.includes('residente')) {
      resident = await ResidentModel.findOne({ where: { iduser: user.iduser } });
      if (resident) {
        await resident.update({
          residentType: residentType,
          status: status === 'Activo' ? 'Active' : 'Inactive'
        });
      } else {
        resident = await ResidentModel.create({
          iduser: user.iduser,
          residentType: residentType,
        });
      }

      const apartmentResident = await ApartmentResidentModel.findOne({ where: { idResident: resident.idResident } });

      if (apartmentResident) {
        await apartmentResident.update({ idApartment: idApartment });
      } else {
        await ApartmentResidentModel.create({ idApartment: idApartment, idResident: resident.idResident });
      }
    } else {
      resident = await ResidentModel.destroy({ where: { iduser: user.iduser } });
    }

    // Add notifications

    if (idUserLogged && user) {

      const notification = await Notification.create({

        iduser: idUserLogged,
        type: 'warning',
        content: {
          message: `Se modifico usuario ${user.name} ${user.lastName} `,
          information: user
        },
        datetime: new Date(),

      })

      console.log(notification, "notification")

    }


    const response = {
      msgUser: "Usuario Modificado",
      user,
    };

    if (watchman) {
      response.msgWatchman = "Vigilante Modificado";
      response.watchman = watchman;
    }

    if (resident) {
      response.msgResident = "Residente Modificado";
      response.resident = resident;
    }

    res.json(response);


  } catch (error) {
    return res.status(500).json({
      message: 'Error al actualizar el usuario',
      error: error.message
    });
  }
};



// const deleteUser = async (req, res) => {
//   const { iduser } = req.body;
//   let message = '';
//   try {
//     const rowsDeleted = await User.destroy({ where: { iduser: iduser } });

//     if (rowsDeleted > 0) {
//       message = 'Usuario eliminado exitosamente';
//     } else {
//       res.status(404).json({ error: 'No se encontró un usuario con ese ID' });
//     }
//   } catch (e) {
//     res.status(500).json({ error: 'Error al eliminar usuario', message: e.message });
//   }
//   res.json({
//     user: message,
//   });
// };


module.exports = {
  getUser,
  getUserDocument,
  postUser,
  putUser,
  getUserOne,
  postUserEmail,
  resetPassword,
  getEmailUser,
  putPasswordUser,

  putChangeImg,
  putPersonalInformation

};
