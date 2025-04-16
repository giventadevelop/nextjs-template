$env:DATABASE_URL = "postgresql://postgres.yhvhlvrsdqpyfebcfnfx:yhvhlvrsdqpyfebcfnfx@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
npx prisma migrate dev --name init_task_schema