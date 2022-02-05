import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '../../src';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    KafkaModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const brokers = configService.get<string[]>('kafka.broker', [
          'localhost:29092',
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
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
