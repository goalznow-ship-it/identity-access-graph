import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app/app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule, { abortOnError: false })

  const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Identity Access Graph API')
    .setDescription('API for the Identity Access Graph Platform')
    .setVersion('0.1.0')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT || 3000
  await app.listen(port)
  logger.log(`Application running on http://localhost:${port}`)
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`)
}
bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap')
  const message = error instanceof Error ? error.message : String(error)
  logger.error(`Backend startup failed: ${message}`)
  logger.error('Verify DATABASE_URL points to an available PostgreSQL database and that migrations can be applied.')
  process.exitCode = 1
})
