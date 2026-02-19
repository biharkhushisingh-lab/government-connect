const express = require('express');
const authRoute = require('./auth.route');
const projectRoute = require('./project.route');
const bidRoute = require('./bid.route');
const milestoneRoute = require('./milestone.route');
const dashboardRoute = require('./dashboard.routes');
const router = express.Router();

const defaultRoutes = [
    {
        path: '/auth',
        route: authRoute,
    },
    {
        path: '/projects',
        route: projectRoute,
    },
    {
        path: '/bids',
        route: bidRoute,
    },
    {
        path: '/milestones',
        route: milestoneRoute,
    },
    {
        path: '/dashboard',
        route: dashboardRoute,
    },
];

defaultRoutes.forEach((route) => {
    router.use(route.path, route.route);
});

module.exports = router;
