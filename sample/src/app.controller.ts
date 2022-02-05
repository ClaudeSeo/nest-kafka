import { Controller, OnModuleInit } from '@nestjs/common';
import {
  KafkaService,
  InjectKafka,
  KafkaSubscribeTo,
  KafkaEachPayload,
} from '../../src';
import { AppService } from './app.service';

const TOPIC_NAME = 'test';

@Controller()
export class AppController implements OnModuleInit {
  constructor(
    @InjectKafka() private readonly kafkaService: KafkaService,
    private readonly appService: AppService
  ) {}

  onModuleInit() {
    this.kafkaService.subscribeOf(TOPIC_NAME, this);
  }

  @KafkaSubscribeTo(TOPIC_NAME)
  async handler(payload: KafkaEachPayload): Promise<void> {
    console.log(payload);
    await this.appService.sendMessage();
    await this.kafkaService.commitOffset(
      payload.topic,
      payload.partition,
      payload.message.offset
    );
  }
}
