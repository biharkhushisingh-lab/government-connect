const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const { logAction } = require('../services/audit.service');

const register = async (req, res, next) => {
    try {
        // password hashing is handled by User model hooks
        const user = await authService.register(req.body);
        const tokens = await tokenService.generateAuthTokens(user);

        await logAction(user.id, 'REGISTER_USER', 'User', user.id, {
            email: user.email,
            role: user.role
        });

        res.status(201).send({ user, tokens });
    } catch (err) {
        next(err);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        // checks email and compares password
        const user = await authService.loginUserWithEmailAndPassword(email, password);
        const tokens = await tokenService.generateAuthTokens(user);

        await logAction(user.id, 'LOGIN_USER', 'User', user.id, {
            email: user.email
        });

        res.send({ user, tokens });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    register,
    login,
};
