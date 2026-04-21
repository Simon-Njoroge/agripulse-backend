import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { FieldsModule } from './fields/fields.module';
import { FieldUpdatesModule } from './field-updates/field-updates.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { TryModule } from './try/try.module';

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
    TryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
