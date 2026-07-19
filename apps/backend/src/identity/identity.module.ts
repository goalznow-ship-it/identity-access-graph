import { Module } from '@nestjs/common'
import { IdentityController } from './identity.controller'
import { IdentityResolutionService } from './identity-resolution.service'
import { GraphModule } from '../graph'

@Module({
  imports: [GraphModule],
  controllers: [IdentityController],
  providers: [IdentityResolutionService],
  exports: [IdentityResolutionService],
})
export class IdentityModule {}
