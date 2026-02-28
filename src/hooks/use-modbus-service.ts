/**
 * Custom hooks for ModbusService integration with React.
 * Uses useSyncExternalStore for efficient state synchronization.
 */

import { useRef, useSyncExternalStore } from "react";
import type { ObservableLogger } from "../logger.ts";
import type { IModbusService } from "../ModbusService.ts";
import type { ConnectionStatusDetail } from "../types/connection.ts";
import type { ChannelData } from "../types.ts";

/**
 * Subscribe to Modbus input/output data changes.
 * Returns latest data snapshot using useSyncExternalStore.
 * @param service Modbus service instance.
 * @returns Current inputs and outputs snapshot.
 */
export const useModbusData = (
  service: IModbusService,
): { inputs: ChannelData[]; outputs: ChannelData[] } => {
  const snapshotRef = useRef({
    inputs: service.getInputData(),
    outputs: service.getOutputData(),
  });

  return useSyncExternalStore(
    (onStoreChange) => {
      return service.onChange((inputs, outputs) => {
        snapshotRef.current = { inputs, outputs };
        onStoreChange();
      });
    },
    () => snapshotRef.current,
  );
};

/**
 * Subscribe to connection status changes.
 * Returns the latest connection status detail from the Modbus service.
 * @param service Modbus service instance.
 * @returns Current connection state detail or undefined when no state is available.
 */
export const useConnectionStatus = (
  service: IModbusService,
): ConnectionStatusDetail | undefined => {
  const snapshotRef = useRef<ConnectionStatusDetail | undefined>(service.getConnectionState());

  return useSyncExternalStore(
    (onStoreChange) => {
      return service.onConnectionStateChange(() => {
        snapshotRef.current = service.getConnectionState();
        onStoreChange();
      });
    },
    () => snapshotRef.current,
  );
};

/**
 * Subscribe to logger log entries.
 * Returns current logs array snapshot.
 * @param logger Observable logger instance.
 * @returns Read-only array of log entries.
 */
export const useLogs = (
  logger: ObservableLogger,
): ReadonlyArray<{ level: string; message: string; timestamp: Date }> => {
  const snapshotRef = useRef(logger.getLogs());

  return useSyncExternalStore(
    (onStoreChange) => {
      return logger.subscribe(() => {
        snapshotRef.current = logger.getLogs();
        onStoreChange();
      });
    },
    () => snapshotRef.current,
  );
};
