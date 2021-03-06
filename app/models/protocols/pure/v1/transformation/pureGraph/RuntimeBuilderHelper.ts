/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { assertTrue, assertNonEmptyString } from 'Utilities/GeneralUtil';
import { EngineRuntime as MM_EngineRuntime, StoreConnections as MM_StoreConnections, IdentifiedConnection as MM_IdentifiedConnection } from 'MM/model/packageableElements/runtime/Runtime';
import { GraphBuilderContext } from './GraphBuilderContext';
import { EngineRuntime } from 'V1/model/packageableElements/runtime/Runtime';
import { ProtocolToMetaModelConnectionVisitor } from './ProtocolToMetaModelConnectionVisitor';

export const processEngineRuntime = (runtime: EngineRuntime, context: GraphBuilderContext): MM_EngineRuntime => {
  const runtimeValue = new MM_EngineRuntime();
  runtimeValue.setMappings(runtime.mappings.map(mapping => context.resolveMapping(mapping.path)));
  // NOTE: here we don't check if the mappings are fully covered by the runtime, we leave this job for the full compiler
  // and make this a validation check in the UI
  const connectionIds = new Set();
  runtime.connections.forEach(protocolStoreConnections => {
    const store = context.resolveStore(protocolStoreConnections.store.path);
    const storeConnections = new MM_StoreConnections(store);
    storeConnections.storeConnections = protocolStoreConnections.storeConnections.map(identifiedConnection => {
      assertNonEmptyString(identifiedConnection.id, 'Runtime connection ID is missing');
      // make sure runtime connection IDs are unique
      assertTrue(!connectionIds.has(identifiedConnection.id), 'Runtime connection ID must be unique');
      connectionIds.add(identifiedConnection.id);
      const connection = identifiedConnection.connection.accept_ConnectionVisitor(new ProtocolToMetaModelConnectionVisitor(context, store));
      // make sure connection are indexed by store properly
      assertTrue(connection.store.value === store.value, 'Runtime connections must be correctly indexed by store');
      return new MM_IdentifiedConnection(identifiedConnection.id, connection);
    });
    runtimeValue.connections.push(storeConnections);
  });
  return runtimeValue;
};
