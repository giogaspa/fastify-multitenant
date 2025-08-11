import { BaseTenantConfig, TenantResourceFactory, ResourceName, TenantResourceOnDeleteHook, TenantResourceConfigs, BaseTenantResources } from "./types.js"

type CreateTenantResourceConfigArgs<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources, ResourceType = any> = {
    name: ResourceName;
    factory: TenantResourceFactory<TenantConfig, TenantResources, ResourceType>;
    onDelete?: TenantResourceOnDeleteHook<ResourceType>;
}

export function createTenantResourceConfig<TenantConfig extends BaseTenantConfig, TenantResources extends BaseTenantResources, ResourceType = any>(args: CreateTenantResourceConfigArgs<TenantConfig, TenantResources, ResourceType>): TenantResourceConfigs<TenantConfig, TenantResources, ResourceType> {
    const { name, factory, onDelete } = args;

    return {
        [name]: {
            factory,
            ...(onDelete && { onDelete }),
        }
    }
}