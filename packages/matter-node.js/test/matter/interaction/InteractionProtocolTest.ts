/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from "assert";
import { ClusterServer, InteractionServer } from "../../../src/matter/interaction/InteractionServer";
import { ReadRequest, DataReport, WriteRequest, WriteResponse } from "../../../src/matter/interaction/InteractionMessenger";
import { MessageExchange } from "../../../src/matter/common/MessageExchange";
import { DEVICE } from "../../../src/matter/common/DeviceTypes";
import { MatterDevice } from "../../../src/matter/MatterDevice";
import { BasicInformationCluster, VendorId, TlvString, TlvUInt8 } from "@project-chip/matter.js";
import { Time } from "../../../src/time/Time";
import { TimeFake } from "../../../src/time/TimeFake";
import { StorageBackendMemory } from "../../../src/storage/StorageBackendMemory";
import { StorageManager } from "../../../src/storage/StorageManager";

Time.get = () => new TimeFake(1262679233478);

const READ_REQUEST: ReadRequest = {
    interactionModelRevision: 1,
    isFabricFiltered: true,
    attributes: [
        { endpointId: 0, clusterId: 0x28, attributeId: 2 },
        { endpointId: 0, clusterId: 0x28, attributeId: 4 },
    ],
};

const READ_RESPONSE: DataReport = {
    interactionModelRevision: 1,
    suppressResponse: false,
    values: [
        {
            value: {
                path: {
                    endpointId: 0,
                    clusterId: 0x28,
                    attributeId: 2,
                },
                value: TlvUInt8.encodeTlv(1),
                version: 0,
            }
        },
        {
            value: {
                path: {
                    endpointId: 0,
                    clusterId: 0x28,
                    attributeId: 4,
                },
                value: TlvUInt8.encodeTlv(2),
                version: 0,
            }
        },
    ]
};

const WRITE_REQUEST: WriteRequest = {
    interactionModelRevision: 1,
    suppressResponse: false,
    timedRequest: false,
    writeRequests: [
        {
            path: { endpointId: 0, clusterId: 0x28, attributeId: 100 },
            data: TlvUInt8.encodeTlv(3),
            dataVersion: 0,
        },
        {
            path: { endpointId: 0, clusterId: 0x28, attributeId: 5 },
            data: TlvString.encodeTlv("test"),
            dataVersion: 0,
        },
    ],
    moreChunkedMessages: false,
};

const WRITE_RESPONSE: WriteResponse = {
    interactionModelRevision: 1,
    writeResponses: [
        {
            path: {
                attributeId: 100,
                clusterId: 40,
                endpointId: 0
            },
            status: {
                status: 136
            }
        }
    ]
};

const MASS_WRITE_REQUEST: WriteRequest = {
    interactionModelRevision: 1,
    suppressResponse: false,
    timedRequest: false,
    writeRequests: [
        {
            path: { endpointId: 0, clusterId: 0x28 },
            data: TlvString.encodeTlv("test"),
            dataVersion: 0,
        },
    ],
    moreChunkedMessages: false,
};

const MASS_WRITE_RESPONSE: WriteResponse = {
    interactionModelRevision: 1,
    writeResponses: []
};


describe("InteractionProtocol", () => {

    describe("handleReadRequest", () => {
        it("replies with attribute values", async () => {
            const storageManager = new StorageManager(new StorageBackendMemory());
            await storageManager.initialize();
            const interactionProtocol = new InteractionServer(storageManager)
                .addEndpoint(0, DEVICE.ROOT, [
                    new ClusterServer(BasicInformationCluster, {}, {
                        dataModelRevision: 1,
                        vendorName: "vendor",
                        vendorId: new VendorId(1),
                        productName: "product",
                        productId: 2,
                        nodeLabel: "",
                        hardwareVersion: 0,
                        hardwareVersionString: "0",
                        location: "US",
                        localConfigDisabled: false,
                        softwareVersion: 1,
                        softwareVersionString: "v1",
                        capabilityMinima: {
                            caseSessionsPerFabric: 100,
                            subscriptionsPerFabric: 100,
                        },
                    }, {}),
                ]);

            const result = interactionProtocol.handleReadRequest(({ channel: { getName: () => "test" } }) as MessageExchange<MatterDevice>, READ_REQUEST);

            assert.deepEqual(result, READ_RESPONSE);
        });
    });

    describe("handleWriteRequest", () => {
        it("write values and return errors on invalid values", async () => {
            const basicCluster = new ClusterServer(BasicInformationCluster, {}, {
                dataModelRevision: 1,
                vendorName: "vendor",
                vendorId: new VendorId(1),
                productName: "product",
                productId: 2,
                nodeLabel: "",
                hardwareVersion: 0,
                hardwareVersionString: "0",
                location: "US",
                localConfigDisabled: false,
                softwareVersion: 1,
                softwareVersionString: "v1",
                capabilityMinima: {
                    caseSessionsPerFabric: 100,
                    subscriptionsPerFabric: 100,
                },
            }, {});

            const storageManager = new StorageManager(new StorageBackendMemory());
            await storageManager.initialize();
            const interactionProtocol = new InteractionServer(storageManager)
                .addEndpoint(0, DEVICE.ROOT, [basicCluster]);

            const result = interactionProtocol.handleWriteRequest(({ channel: { getName: () => "test" } }) as MessageExchange<MatterDevice>, WRITE_REQUEST);

            assert.deepEqual(result, WRITE_RESPONSE);
            assert.equal(basicCluster.attributes.nodeLabel.get(), "test");
        });

        it("mass write values and only set the one allowed", async () => {

            const basicCluster = new ClusterServer(BasicInformationCluster, {}, {
                dataModelRevision: 1,
                vendorName: "vendor",
                vendorId: new VendorId(1),
                productName: "product",
                productId: 2,
                nodeLabel: "",
                hardwareVersion: 0,
                hardwareVersionString: "0",
                location: "US",
                localConfigDisabled: false,
                softwareVersion: 1,
                softwareVersionString: "v1",
                capabilityMinima: {
                    caseSessionsPerFabric: 100,
                    subscriptionsPerFabric: 100,
                },
            }, {});

            const storageManager = new StorageManager(new StorageBackendMemory());
            await storageManager.initialize();
            const interactionProtocol = new InteractionServer(storageManager)
                .addEndpoint(0, DEVICE.ROOT, [basicCluster]);

            const result = interactionProtocol.handleWriteRequest(({ channel: { getName: () => "test" } }) as MessageExchange<MatterDevice>, MASS_WRITE_REQUEST);

            assert.deepEqual(result, MASS_WRITE_RESPONSE);
            assert.equal(basicCluster.attributes.vendorName.get(), "vendor");
            assert.equal(basicCluster.attributes.productName.get(), "product");
            assert.equal(basicCluster.attributes.location.get(), "US");
            assert.equal(basicCluster.attributes.nodeLabel.get(), "test");
        });
    });

});
