import { ModuleMetadata, Provider, Type } from '@nestjs/common';
import { Deserializer, Serializer } from '@nestjs/microservices';
import {
  KafkaConfig,
  ConsumerConfig,
  ProducerConfig,
  ConsumerRunConfig,
} from 'kafkajs';

export type KafkaModuleFactory = Type<KafkaModuleOptionsFactory>;

export interface KafkaOptions {
  client?: KafkaConfig;
  consumer?: ConsumerConfig;
  run?: ConsumerRunConfig;
  producer?: ProducerConfig;
  serializer?: Serializer;
  deserializer?: Deserializer;
  seek?: Record<string, number | 'earliest' | Date>;
  subscribe?: {
    fromBeginning?: boolean;
  };
  connect?: {
    consumer?: boolean;
    producer?: boolean;
  };
}

export interface KafkaModuleOptions {
  options?: KafkaOptions;
  consume_method?: 'batch' | 'each';
}

export interface KafkaModuleOptionsFactory {
  createKafkaModuleOptions(): Promise<KafkaModuleOptions> | KafkaModuleOptions;
}

export interface KafkaModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: KafkaModuleFactory;
  useClass?: KafkaModuleFactory;
  useFactory?: (
    ...args: any[]
  ) => Promise<KafkaModuleOptions> | KafkaModuleOptions;
  inject?: any[];
  extraProviders?: Provider[];
}
