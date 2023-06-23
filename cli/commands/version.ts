import { readFileSync } from 'fs';

import log from '../utils/log'

const packageJson = JSON.parse(
    readFileSync(require.resolve('@giogaspa/fastify-multitenant/package.json')).toString()
);

export default function cli() {
    log('info', packageJson.version);
}