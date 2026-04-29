import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { FieldsModule } from './fields/fields.module';
import { FieldUpdatesModule } from './field-updates/field-updates.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmailModule } from './common/utils/email/email.module';
import { DatabaseModule } from './config/database.module';
import { GlobalCacheModule } from './cache/cache.module';
import { AtStrategy } from './common/strategies/at.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    SessionsModule,
    FieldsModule,
    FieldUpdatesModule,
    DashboardModule,
    DatabaseModule,
    EmailModule,
    GlobalCacheModule,
  ],
  controllers: [],
  providers: [AtStrategy],
})
export class AppModule {}
