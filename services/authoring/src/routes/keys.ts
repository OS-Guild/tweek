import R = require('ramda');
import { GET, Path, DELETE, ServiceContext, Context, PUT, QueryParam, Errors } from 'typescript-rest';
import { AutoWired, Inject } from 'typescript-ioc';
import { Tags } from 'typescript-rest-swagger';
import searchIndex from '../search-index';
import { Authorize } from '../security/authorize';
import { PERMISSIONS } from '../security/permissions/consts';
import KeysRepository from '../repositories/keys-repository';
import { addOid } from '../utils/response-utils';
import { logger } from '../utils/jsonLogger';

export type KeyUpdateModel = {
  implementation: any,
  manifest: any,
};

@AutoWired
@Tags('keys')
@Path('/')
export class KeysController {
  @Inject
  keysRepository: KeysRepository;

  @Context
  context: ServiceContext;

  @Authorize({ permission: PERMISSIONS.KEYS_LIST })
  @GET
  @Path('/keys')
  async getAllKeys(): Promise<string[]> {
    const manifests = await searchIndex.manifests;
    return manifests.map(R.prop('key_path'));
  }

  @Authorize({ permission: PERMISSIONS.KEYS_READ })
  @GET
  @Path('/key')
  async getKey( @QueryParam('keyPath') keyPath: string, @QueryParam('revision') revision?: string): Promise<any> {
    try {
      return await this.keysRepository.getKeyDetails(keyPath, { revision });
    } catch (exp) {
      logger.error(`Error retrieving key ${keyPath}`, exp);
      throw new Errors.NotFoundError();
    }
  }

  @Authorize({ permission: PERMISSIONS.KEYS_WRITE })
  @PUT
  @Path('/key')
  async updateKey( @QueryParam('keyPath') keyPath: string, @QueryParam('author.name') name: string, @QueryParam('author.email') email: string,
    newKeyModel: KeyUpdateModel): Promise<string> {
    const { implementation } = newKeyModel;
    let { manifest } = newKeyModel;
    manifest = Object.assign({ key_path: keyPath }, manifest);
    const oid = await this.keysRepository.updateKey(keyPath, manifest, implementation, { name, email });
    addOid(this.context.response, oid);

    return 'OK';
  }

  @Authorize({ permission: PERMISSIONS.KEYS_WRITE })
  @DELETE
  @Path('/key')
  async deleteKey( @QueryParam('keyPath') keyPath: string, @QueryParam('author.name') name: string, @QueryParam('author.email') email: string, additionalKeys?: string[]): Promise<string> {
    let keysToDelete = [keyPath];
    if (additionalKeys && Array.isArray(additionalKeys)) {
      keysToDelete = keysToDelete.concat(additionalKeys);
    }
    const oid = await this.keysRepository.deleteKeys(keysToDelete, { name, email });
    addOid(this.context.response, oid);

    return 'OK';
  }

  @Authorize({ permission: PERMISSIONS.HISTORY })
  @GET
  @Path('/revision-history')
  async getKeyRevisionHistory( @QueryParam('keyPath') keyPath: string, @QueryParam('since') since: string): Promise<any[]> {
    return await this.keysRepository.getKeyRevisionHistory(keyPath, { since });
  }

  @Authorize({ permission: PERMISSIONS.KEYS_LIST })
  @GET
  @Path('/manifests')
  async getAllManifests(): Promise<any[]> {
    return await searchIndex.manifests;
  }

  @Authorize({ permission: PERMISSIONS.KEYS_READ })
  @GET
  @Path('/manifest')
  async getManifest( @QueryParam('keyPath') keyPath: string, @QueryParam('revision') revision?: string): Promise<any> {
    try {
      return await this.keysRepository.getKeyManifest(keyPath, { revision });
    } catch (exp) {
      throw new Errors.NotFoundError();
    }
  }

  @Authorize({ permission: PERMISSIONS.KEYS_READ })
  @GET
  @Path('/dependent')
  async getDependents( @QueryParam('keyPath') keyPath: string): Promise<any> {
    return await searchIndex.dependents(keyPath);
  }
}
