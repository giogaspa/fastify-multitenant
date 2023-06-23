import log, { tableLog } from '../utils/log'
import { getAllTenants } from '../services/dbClientFactory';

export default async function cli() {
    log('info', 'List al tenants');

    try {

        const tenants = await getAllTenants();

        tableLog(tenants)

    } catch (e: unknown) {
        if (e instanceof Error)
            log('error', e.message);
    }
}