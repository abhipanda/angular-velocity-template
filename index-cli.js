'use strict';

const AVT = require('./index.js');
const argv = require('minimist')(process.argv.slice(1));

//avt -iA '/data/test.html' -iD '/data/test.json' -oV '/output/out.vm' -oH '/output/out.vm'
AVT.init(argv);