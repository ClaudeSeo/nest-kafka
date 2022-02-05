import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
  LoggerService,
} from '@nestjs/common';
import { KafkaLogger, KafkaParser } from '@nestjs/microservices';
import * as _ from 'lodash';
import {
  Consumer,
  EachBatchPayload,
  EachMessagePayload,
  Kafka,
  Producer,
  TopicPartitionOffsetAndMetadata,
  ProducerRecord,
  RecordMetadata,
} from 'kafkajs';
import { KafkaMessage, KafkaModuleOptions, KafkaOptions } from './interfaces';
import { ROUTING_MAP, TOPIC_OBJECT_MAP } from './kafka.constant';

@Injectable()
export class KafkaService
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private kafka: Kafka;
  consumer: Consumer;
  producer: Producer;

  private readonly module_name: string;
  private readonly parser = new KafkaParser();
  private readonly options: KafkaOptions;
  private readonly consume_method: 'batch' | 'each';
  private readonly connect_options: {
    consumer: boolean;
    producer: boolean;
  };

  protected logger: LoggerService = new Logger(KafkaService.name);

  constructor(moduleOptions: KafkaModuleOptions, module_name = 'default') {
    const { options } = moduleOptions;

    if (!options?.client) {
      throw new Error('wrong kafka client options');
    }

    this.consume_method = moduleOptions.consume_method ?? 'each';
    this.options = options;
    this.module_name = module_name;
    this.connect_options = {
      consumer: this.options?.connect?.consumer ?? true,
      producer: this.options?.connect?.producer ?? true,
    };

    this.kafka = new Kafka({
      ...options.client,
      logCreator: KafkaLogger.bind(null, this.logger),
    });

    this.consumer = this.kafka.consumer(options.consumer);
    this.producer = this.kafka.producer(options.producer);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`${this.module_name} init kafka service`);
    await this.connect();
  }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log(`${this.module_name} bootstrap kafka service`);

    if (!this.connect_options.consumer) {
      return;
    }

    for (const topic of TOPIC_OBJECT_MAP.get(this.module_name)?.keys() ?? []) {
      await this.subscribe(topic);
    }

    await this.bindAllTopicToConsumer();
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log(`${this.module_name} destroy kafka service`);
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    if (this.connect_options.consumer) {
      await this.consumer.connect();
    }

    if (this.connect_options.producer) {
      await this.producer.connect();
    }
  }

  private async disconnect(): Promise<void> {
    if (this.connect_options.consumer) {
      await this.consumer.disconnect();
    }

    if (this.connect_options.producer) {
      await this.producer.disconnect();
    }
  }

  private async subscribe(topic: string): Promise<void> {
    await this.consumer.subscribe({
      topic,
      fromBeginning: this.options.subscribe?.fromBeginning,
    });
  }

  subscribeOf<T>(topic: string, instance: T): void {
    if (!TOPIC_OBJECT_MAP.has(this.module_name)) {
      TOPIC_OBJECT_MAP.set(this.module_name, new Map());
    }

    TOPIC_OBJECT_MAP.get(this.module_name)?.set(topic, instance);
  }

  private resolveOffset(offset: string): string {
    return (BigInt(offset) + BigInt(1)).toString();
  }

  async commitOffset(
    topic: string,
    partition: number,
    offset: string
  ): Promise<void> {
    const offsets: TopicPartitionOffsetAndMetadata[] = [
      {
        partition,
        topic,
        offset: this.resolveOffset(offset),
      },
    ];

    await this.consumer.commitOffsets(offsets);
  }

  async commitOffsets(
    messages: Array<KafkaMessage<unknown, unknown>>
  ): Promise<void> {
    const offsets: TopicPartitionOffsetAndMetadata[] = _.chain(messages)
      .map(message => ({
        topic: message.topic,
        offset: this.resolveOffset(message.offset),
        partition: message.partition,
      }))
      .groupBy(item => `${item.topic}_${item.partition}`)
      .transform<Record<string, TopicPartitionOffsetAndMetadata>>(
        (acc, curr, key) => {
          acc[key] = _.maxBy(curr, 'offset') as TopicPartitionOffsetAndMetadata;
        }
      )
      .values()
      .value();

    await this.consumer.commitOffsets(offsets);
  }

  private async bindAllTopicToConsumer(): Promise<void> {
    const run_config = this.options.run ?? {};
    if (this.consume_method === 'each') {
      await this.consumer.run({
        ...run_config,
        eachMessage: this.createEachResponseCallback(),
      });
    } else {
      await this.consumer.run({
        ...run_config,
        eachBatch: this.createBatchResponseCallback(),
      });
    }
  }

  private createEachResponseCallback() {
    return async ({ topic, message, partition }: EachMessagePayload) => {
      const ref = TOPIC_OBJECT_MAP.get(this.module_name)?.get(topic);
      const callback = ROUTING_MAP.get(this.module_name)?.get(topic);

      if (!callback) {
        throw new Error(`undefined callback function: ${topic}`);
      }

      try {
        const payload = this.parser.parse<KafkaMessage>(
          Object.assign(message, {
            topic,
            partition,
          })
        );

        await callback.apply(ref, [
          {
            topic,
            partition,
            message: payload,
          },
        ]);
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(`error for each message ${topic}: ${err}`, message);
          throw err;
        }

        if (typeof err === 'string') {
          throw new Error(err);
        }

        throw new Error('undefined error');
      }
    };
  }

  private createBatchResponseCallback() {
    return async (payload: EachBatchPayload): Promise<void> => {
      const { batch, ...others } = payload;

      const messages = batch.messages.map(message => {
        return this.parser.parse<KafkaMessage>(
          Object.assign(message, {
            topic: batch.topic,
            partition: batch.partition,
          })
        );
      });

      const message_by_topic = _.groupBy(messages, 'topic');
      for (const topic in message_by_topic) {
        const ref = TOPIC_OBJECT_MAP.get(this.module_name)?.get(topic);
        const callback = ROUTING_MAP.get(this.module_name)?.get(topic);

        if (!callback) {
          throw new Error(`undefined callback function: ${topic}`);
        }

        try {
          await callback.apply(ref, [
            {
              ...others,
              messages: message_by_topic[topic],
            },
          ]);
        } catch (err: unknown) {
          if (err instanceof Error) {
            this.logger.error(
              `error for batch message ${topic}: ${err}`,
              message_by_topic[topic]
            );
            throw err;
          }

          if (typeof err === 'string') {
            throw new Error(err);
          }

          throw new Error('undefined error');
        }
      }
    };
  }

  async sendMessage(payload: ProducerRecord): Promise<RecordMetadata[]> {
    return this.producer.send(payload);
  }

  seek(topic: string, partition: number, offset: string): void {
    this.consumer.seek({ topic, partition, offset });
  }
}
