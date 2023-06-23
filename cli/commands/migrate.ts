import log from '../utils/log'
import {
    getMultitenantSubject,
    SUBJECT,
} from '../utils/utils';
import { getTenant, getAllTenants } from '../services/dbClientFactory';
import { runMissingMigrationsForAdmin, runMissingMigrationsForTenant } from '../services/migrationManager';
import parseArgs from '../utils/args';
import { Tenant } from '../../src';

const args = parseArgs()

const ALL_TENANTS = '*';

export default async function cli() {

    const tenantId = args.tenantId;

    switch (getMultitenantSubject()) {
        case SUBJECT.admin:

            log('info', `Execute admin missing migrations`);
            runMissingMigrationsForAdmin();

            break;

        case SUBJECT.tenant:

            if (ALL_TENANTS === tenantId) {
                const tenantList = await getAllTenants();
                for (let idx = 0; idx < tenantList.length; idx++) {
                    log('info', `Execute tenant "${tenantList[idx].id}" missing migrations`);
                    await runMissingMigrationsForTenant(tenantList[idx]);
                    log('info', `=========================================================`);
                }
            } else {
                log('info', `Execute tenant "${tenantId}" missing migrations`);
                const tenant = await getTenant(tenantId);

                if(!tenant) {
                    log('error', 'Tenant doesn\'t exists')
                    process.exit(1)
                }

                await runMissingMigrationsForTenant(tenant as Tenant);
            }

            break;
    }

}