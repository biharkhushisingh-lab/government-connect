const { ApiError } = require('../middleware/error');
const { User } = require('../models');

const createUser = async (userBody) => {
    if (await User.findOne({ where: { email: userBody.email } })) {
        throw new ApiError(400, 'Email already taken');
    }
    return User.create(userBody);
};

const getUserByEmail = async (email) => {
    return User.findOne({ where: { email } });
};

const getUserById = async (id) => {
    return User.findByPk(id);
};

module.exports = {
    createUser,
    getUserByEmail,
    getUserById,
};
