import { DynamicModule, Module, Provider } from '@nestjs/common';
import {
  KafkaModuleAsyncOptions,
  KafkaModuleOptions,
  KafkaModuleOptionsFactory,
} from './interfaces';
import {
  getKafkaInstanceToken,
  getKafkaOptionsToken,
  filterEmpty,
} from './kafka.util';
import { KafkaService } from './kafka.service';

@Module({})
export class KafkaModule {
  static register(options: KafkaModuleOptions, name?: string): DynamicModule {
    const options_provider: Provider = {
      provide: getKafkaOptionsToken(name),
      useValue: options,
    };

    const instance_provider: Provider = {
      provide: getKafkaInstanceToken(name),
      useValue: new KafkaService(options),
    };

    return {
      module: KafkaModule,
      providers: [options_provider, instance_provider],
      exports: [options_provider, instance_provider],
    };
  }

  static registerAsync(
    options: KafkaModuleAsyncOptions,
    name?: string
  ): DynamicModule {
    const instance_provider: Provider = {
      provide: getKafkaInstanceToken(name),
      useFactory: (kafkaOptions: KafkaModuleOptions) => {
        return new KafkaService(kafkaOptions, name);
      },
      inject: [getKafkaOptionsToken(name)],
    };

    return {
      module: KafkaModule,
      imports: options.imports,
      providers: [
        ...this.createAsyncProviders(options, name),
        instance_provider,
        ...(options.extraProviders || []),
      ],
      exports: [instance_provider],
    };
  }

  private static createAsyncProviders(
    options: KafkaModuleAsyncOptions,
    name?: string
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProviders(options, name)];
    }

    if (!options.useClass) {
      throw new Error('Invalid Kafka Options.');
    }

    return [
      this.createAsyncOptionsProviders(options, name),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProviders(
    options: KafkaModuleAsyncOptions,
    name?: string
  ): Provider {
    if (!(options.useExisting || options.useFactory || options.useClass)) {
      throw new Error('Invalid Kafka Options.');
    }

    if (options.useFactory) {
      return {
        provide: getKafkaOptionsToken(name),
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: getKafkaOptionsToken(name),
      useFactory: async (
        optionsFactory: KafkaModuleOptionsFactory
      ): Promise<KafkaModuleOptions> => {
        return optionsFactory.createKafkaModuleOptions();
      },
      inject: [options.useExisting || options.useClass].filter(filterEmpty),
    };
  }
}
