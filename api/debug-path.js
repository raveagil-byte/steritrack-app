module.exports = (req, res) => {
    const status = { steps: [] };
    try {
        status.steps.push("Step 1: Start");

        // 1. Cek package.json ada tidak
        const fs = require('fs');
        const path = require('path');
        status.steps.push("Step 2: FS Loaded");

        try {
            const mysql = require('mysql2');
            status.steps.push("Step 3: mysql2 loaded successfully version " + require('mysql2/package.json').version);
        } catch (e) {
            status.steps.push("Step 3 FAIL: mysql2 not found - " + e.message);
        }

        try {
            const bcrypt = require('bcryptjs');
            status.steps.push("Step 4: bcryptjs loaded successfully");
        } catch (e) {
            status.steps.push("Step 4 FAIL: bcryptjs not found - " + e.message);
        }

        try {
            const serverPath = path.resolve(__dirname, '../backend/server.js');
            status.steps.push("Step 5: Check server path: " + serverPath);
            if (fs.existsSync(serverPath)) {
                status.steps.push("Step 5 OK: Server file exists");
                // Coba require
                try {
                    const app = require('../backend/server');
                    status.steps.push("Step 6 OK: Server Required!");
                } catch (err) {
                    status.steps.push("Step 6 FAIL: Require Server Error - " + err.message + " Stack: " + err.stack);
                }
            } else {
                status.steps.push("Step 5 FAIL: Server file NOT found at expected path. Dirname is " + __dirname);
                // List directory to see structure
                status.files_in_root = fs.readdirSync(path.resolve(__dirname, '../'));
                status.files_in_backend = fs.existsSync(path.resolve(__dirname, '../backend')) ? fs.readdirSync(path.resolve(__dirname, '../backend')) : 'BACKEND_DIR_MISSING';
            }
        } catch (e) {
            status.steps.push("Step 5 FAIL: " + e.message);
        }

        res.json(status);

    } catch (e) {
        res.status(500).json({ fatal: e.message, steps: status.steps });
    }
};
