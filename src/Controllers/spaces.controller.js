const { response } = require('express');
const SpacesModel = require('../Models/spaces.model');

const getOneSpace = async (req, res = response) => {
    try {
      const { idSpace } = req.params;
  
      const space = await SpacesModel.findOne({ where: { idSpace: idSpace } });
  
      if (!space) {
        return res.status(404).json({ error: 'Id space not found.' });
      }
  
      res.json({
        space,
      });
    } catch (error) {
      console.error('Error to get space.', error);
      res.status(500).json({
        error: 'Error to get space.',
      });
    }
  };

const getAllSpaces = async (req, res = response) => {

    try {

        const spaces = await SpacesModel.findAll();

        console.log('Space get ok', spaces);

        res.json({ spaces });

    } catch (error) {

        console.error('Error to get spaces', error);

        res.status(500).json({
            error: 'Error to get spaces 500',
        })
    };

}


const postSpace = async (req, res) => {

    let message = '';
    const body = req.body;

    console.log(body)
    
    try {
        await SpacesModel.create(body);
        message = 'New space created.';
    } catch (e) {
        message = e.message;
    }
    res.json({
        spaces: message,
    });
};


const putSpace = async (req, res = response) => {

    const body = req.body;
    let message = '';

    try {
        const { idSpace, ...update } = body;

        const [updatedRows] = await SpacesModel.update(update, {
            where: { idSpace: idSpace },
        });

        if (updatedRows > 0) {

            message = 'Space updated successfully.';

        } else {

            message = 'Id space not found';

        }

    } catch (error) {

        message = 'Error updating space: ' + error.message;

    }
    res.json({

        spaces: message,

    });
};


// const deleteSpace = async (req, res) => {

//     const { idSpace } = req.body;
//     let message = '';

//     try {

//         const rowsDeleted = await SpacesModel.destroy({ where: { idSpace: idSpace } });

//         if (rowsDeleted > 0) {

//             message = 'Space dalete ok';

//         } else {

//             res.status(404).json({ error: 'Id space not found' });

//         }
//     } catch (e) {

//         res.status(500).json({ error: 'Error delete space', message: e.message });

//     }
//     res.json({

//         spaces: message,

//     });
// };


module.exports = {
    getOneSpace,
    getAllSpaces,
    postSpace,
    putSpace,
    // deleteSpace,
};
