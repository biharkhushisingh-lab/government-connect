const express = require('express');
const { auth, roleMiddleware } = require('../middleware/auth');
const projectController = require('../controllers/project.controller');

const router = express.Router();

router
    .route('/')
    .post(auth, roleMiddleware('GOVERNMENT'), projectController.createProject)
    .get(auth, projectController.getProjects);

router
    .route('/:projectId')
    .get(auth, projectController.getProject);

module.exports = router;
