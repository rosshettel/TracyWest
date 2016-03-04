'use strict';

var ClusterWrapper = function () {
    var cluster = require('cluster'),
        logger = require('./logger');

    this.run = function (mainProcess) {
        if (cluster.isMaster) {
            cluster.fork();

            cluster.on('exit', function (worker, code, signal) {
                logger.error('Cluster exiting with code', code);
                cluster.fork();
            });
        }

        if (cluster.isWorker) {
            process.on('uncaughtException', function (err) {
                logger.error('Uncaught Exception!', err);
                process.exit(1);
            });

            mainProcess();
        }
    };
}

module.exports = new ClusterWrapper();

