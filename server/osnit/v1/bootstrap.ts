import { createRouter } from '../../router';
import { mapErrorToResponse } from '../../error-mapper';
import type { RouteDescriptor, ServerOptions } from '../../../src/generated/server/osnit/v1/service_server';
import { createOsnitServiceRoutes } from '../../../src/generated/server/osnit/v1/service_server';
import { osnitHandler } from './handler';

export function createOsnitRoutes(serverOptions: ServerOptions = { onError: mapErrorToResponse }): RouteDescriptor[] {
  return createOsnitServiceRoutes(osnitHandler, serverOptions);
}

export function createOsnitRouter(serverOptions: ServerOptions = { onError: mapErrorToResponse }) {
  return createRouter(createOsnitRoutes(serverOptions));
}
