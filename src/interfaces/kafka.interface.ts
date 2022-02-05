import { IHeaders, EachBatchPayload, EachMessagePayload } from 'kafkajs';

export type KafkaValue = null | string | Buffer;
export type KafkaHeader = { [key: string]: Buffer | string | undefined };

export interface KafkaMessage<Value = KafkaValue, Header = KafkaHeader> {
  magicByte: number;
  key: null | string | Buffer;
  value: Value;
  timestamp: string;
  attributes: number;
  offset: string;
  headers: Header & IHeaders;
  isControlRecord: boolean;
  batchContext: {
    firstOffset: string;
    firstTimestamp: string;
    partitionLeaderEpoch: number;
    inTransaction: boolean;
    isControlBatch: boolean;
    lastOffsetDelta: number;
    producerId: string;
    producerEpoch: number;
    firstSequence: number;
    maxTimestamp: string;
    timestampType: number;
    magicByte: number;
  };
  topic: string;
  partition: number;
}

export type KafkaBatchPayload<Value = KafkaValue, Header = KafkaHeader> = Omit<
  EachBatchPayload,
  'batch'
> & {
  messages: Array<KafkaMessage<Value, Header>>;
};

export type KafkaEachPayload<Value = KafkaValue, Header = KafkaHeader> = Omit<
  EachMessagePayload,
  'message'
> & {
  message: KafkaMessage<Value, Header>;
};
