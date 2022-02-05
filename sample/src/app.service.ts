import { Injectable } from '@nestjs/common';
import { KafkaService, InjectKafka } from '../../src';

@Injectable()
export class AppService {
  constructor(@InjectKafka() private readonly kafkaService: KafkaService) {}

  async sendMessage(): Promise<void> {
    await this.kafkaService.sendMessage({
      topic: 'test2',
      messages: [
        {
          key: null,
          value: 'Hello World',
        },
      ],
    });
  }
}
