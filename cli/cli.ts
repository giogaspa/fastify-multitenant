#!/usr/bin/env node

'use strict'

import path from 'path'

import commist from 'commist'
import helpMe from 'help-me'

import parseArgs from './utils/args'

/** Command root scripts */
import setup from './commands/setup'
import create from './commands/create'
import migrate from './commands/migrate'
import list from './commands/list'
import version from './commands/version'

// Init args
const args = parseArgs()

// Configure help
const help = helpMe({ dir: path.join(__dirname, 'help') });

// Init commist
const comm = commist()

comm.register('setup:admin', setup);
comm.register('setup:tenant', setup);
comm.register('create:admin', create);
comm.register('create:tenant', create);
comm.register('migrate:admin', migrate);
comm.register('migrate:tenant', migrate);
comm.register('list', list);
comm.register('version', version);
comm.register('help', help.toStdout);


if (args.help) {
    const command = process.argv.splice(2)[0]

    help.toStdout(command)
} else {
    const res = comm.parse(process.argv.splice(2))

    if (res) {
        // no command was recognized
        help.toStdout(res)
    }
}