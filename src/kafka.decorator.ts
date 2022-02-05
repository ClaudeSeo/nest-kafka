import { Inject } from '@nestjs/common';
import { getKafkaInstanceToken } from './kafka.util';
import { ROUTING_MAP } from './kafka.constant';

export function KafkaSubscribeTo(topic: string, name = 'default') {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const fn = descriptor.value;
    if (!ROUTING_MAP.has(name)) {
      ROUTING_MAP.set(name, new Map());
    }

    ROUTING_MAP.get(name)?.set(topic, fn);
    return descriptor;
  };
}

export const InjectKafka = (name = 'default') => {
  return Inject(getKafkaInstanceToken(name));
};
