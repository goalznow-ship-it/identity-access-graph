import { Module } from '@nestjs/common'
import { IdentityController } from './identity.controller'
import { IdentityResolutionService } from './identity-resolution.service'

@Module({
  controllers: [IdentityController],
  providers: [IdentityResolutionService],
  exports: [IdentityResolutionService],
})
export class IdentityModule {}
