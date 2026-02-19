const userService = require('./user.service');
const tokenService = require('./token.service');
const { ApiError } = require('../middleware/error');

const loginUserWithEmailAndPassword = async (email, password) => {
    const user = await userService.getUserByEmail(email);
    if (!user || !(await user.isPasswordMatch(password))) {
        throw new ApiError(401, 'Incorrect email or password');
    }
    return user;
};

const register = async (userBody) => {
    const user = await userService.createUser(userBody);
    return user;
}

module.exports = {
    loginUserWithEmailAndPassword,
    register
};
