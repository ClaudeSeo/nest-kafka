import { KAFKA_INSTANCE_TOKEN, KAFKA_MODULE_OPTIONS } from './kafka.constant';

export const getKafkaOptionsToken = (name?: string): string => {
  return [name ?? 'default', KAFKA_MODULE_OPTIONS].join('_');
};

export const getKafkaInstanceToken = (name?: string): string => {
  return [name ?? 'default', KAFKA_INSTANCE_TOKEN].join('_');
};

export const filterEmpty = <T>(value: T): value is NonNullable<typeof value> =>
  !!value;
