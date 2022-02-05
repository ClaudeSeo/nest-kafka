import { KafkaBatchPayload, KafkaEachPayload } from './interfaces';

export const KAFKA_INSTANCE_TOKEN = 'KAFKA_INSTANCE_TOKEN' as const;
export const KAFKA_MODULE_ID = 'KAFKA_MODULE_ID' as const;
export const KAFKA_MODULE_OPTIONS = 'KAFKA_MODULE_OPTIONS' as const;

export const ROUTING_MAP = new Map<
  string,
  Map<string, (payload: KafkaBatchPayload | KafkaEachPayload) => Promise<void>>
>();

export const TOPIC_OBJECT_MAP = new Map<string, Map<string, any>>();
