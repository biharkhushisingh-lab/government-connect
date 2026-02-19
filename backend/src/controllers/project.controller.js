const { Project, Bid, User } = require('../models');
const { ApiError } = require('../middleware/error');
const { logAction } = require('../services/audit.service');
const logger = require('../utils/logger');

const createProject = async (req, res, next) => {
    try {
        const project = await Project.create({
            ...req.body,
            createdBy: req.user.id,
            status: 'OPEN'
        });
        logger.info(`Project created: ${project.id} by User ${req.user.id}`);

        await logAction(req.user.id, 'CREATE_PROJECT', 'Project', project.id, {
            title: project.title,
            budget: project.budget
        });

        res.status(201).send(project);
    } catch (err) {
        next(err);
    }
};

const getProjects = async (req, res, next) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        // If contractor, they might only see Open or specific ones? 
        // For now, allow flexible filtering via query param.

        const projects = await Project.findAll({
            where: filter,
            include: [
                { model: User, as: 'creator', attributes: ['name', 'email'] }
            ]
        });
        res.send(projects);
    } catch (err) {
        next(err);
    }
};

const getProject = async (req, res, next) => {
    try {
        const project = await Project.findByPk(req.params.projectId, {
            include: [
                { model: User, as: 'creator', attributes: ['name', 'email'] },
                { model: Bid, include: [{ model: User, as: 'contractor', attributes: ['name', 'credibilityScore'] }] }
            ]
        });
        if (!project) {
            throw new ApiError(404, 'Project not found');
        }
        res.send(project);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createProject,
    getProjects,
    getProject,
};
