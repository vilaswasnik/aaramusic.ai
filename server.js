// Production server entry point
// This file exists so Render/Node always starts the Express proxy,
// regardless of what package.json "main" points to.
'use strict';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('./server/proxy.js');
