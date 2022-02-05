<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo_text.svg" width="320" alt="Nest Logo" /></a>
</p>

# nest-kafka

![](https://img.shields.io/github/package-json/v/claudeseo/nest-kafka)
[![npm-version](https://img.shields.io/npm/v/@claudeseo/nest-kafka.svg)](https://www.npmjs.com/package/@claudeseo/nest-kafka)
[![Build Status](https://github.com/ClaudeSeo/nest-kafka/actions/workflows/release.yml/badge.svg)](https://github.com/ClaudeSeo/nest-kafka/actions/workflows/release.yml)
[![Release date](https://img.shields.io/github/release-date/claudeseo/nest-kafka)](https://github.com/claudeseo/nest-kafka/releases)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](http://unlicense.org/)

## Description

Simple Integrate Kafka.js With Nest.js

## Module Initialization

Register Kafka Module with the `registerAsync` method

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KafkaModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const brokers = configService.get<string[]>('kafka.broker', [
          'localhost:9092',
        ]);

        return {
          consume_method: 'each',
          options: {
            client: {
              brokers,
              clientId: 'kafka-sample',
            },
            consumer: {
              groupId: 'kafka-sample',
            },
            producer: {
              allowAutoTopicCreation: false,
            },
            subscribe: {
              fromBeginning: false,
            },
            run: {
              autoCommit: false,
            },
          },
        };
      },
    }),
  ],
})
export class SomeModule {}
```

### Configure

| Config                          | Options                                           |
| ------------------------------- | ------------------------------------------------- |
| consume_method                  | 'each' or 'batch'                                 |
| options                         |                                                   |
| options.client                  | https://kafka.js.org/docs/configuration           |
| options.consumer                | https://kafka.js.org/docs/consuming#options       |
| options.producer                | https://kafka.js.org/docs/producing#options       |
| options.run                     |                                                   |
| options.run.autoCommit          | true or false                                     |
| options.subscribe               | https://kafka.js.org/docs/consuming#frombeginning |
| options.subscribe.fromBeginning | true or false                                     |
| options.connect                 |                                                   |
| options.connect.consumer        | true or false                                     |
| options.connect.producer        | true or false                                     |

## Consumer

```ts
const TOPIC_NAME = 'test';

@Controller()
export class AppController implements OnModuleInit {
  constructor(@InjectKafka() private readonly kafkaService: KafkaService) {}

  onModuleInit() {
    this.kafkaService.subscribeOf(TOPIC_NAME, this);
  }

  @KafkaSubscribeTo(TOPIC_NAME)
  async handler(payload: KafkaEachPayload): Promise<void> {
    console.log(payload);

    await this.kafkaService.commitOffset(
      payload.topic,
      payload.partition,
      payload.message.offset
    );
  }
}
```

## Producer

```ts
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
```
