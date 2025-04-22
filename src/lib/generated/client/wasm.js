
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime,
  createParam,
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.6.0
 * Query Engine version: f676762280b54cd07c770017ed3711ddde35f37a
 */
Prisma.prismaVersion = {
  client: "6.6.0",
  engine: "f676762280b54cd07c770017ed3711ddde35f37a"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.SubscriptionScalarFieldEnum = {
  userId: 'userId',
  stripeCustomerId: 'stripeCustomerId',
  stripeSubscriptionId: 'stripeSubscriptionId',
  stripePriceId: 'stripePriceId',
  stripeCurrentPeriodEnd: 'stripeCurrentPeriodEnd',
  status: 'status'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  dueDate: 'dueDate',
  completed: 'completed',
  userId: 'userId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  city: 'city',
  state: 'state',
  zipCode: 'zipCode',
  country: 'country',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProcessedStripeEventScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  type: 'type',
  processedAt: 'processedAt'
};

exports.Prisma.TicketTransactionScalarFieldEnum = {
  id: 'id',
  email: 'email',
  ticketType: 'ticketType',
  quantity: 'quantity',
  pricePerUnit: 'pricePerUnit',
  totalAmount: 'totalAmount',
  status: 'status',
  purchaseDate: 'purchaseDate',
  eventId: 'eventId',
  userId: 'userId'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  Subscription: 'Subscription',
  Task: 'Task',
  UserProfile: 'UserProfile',
  ProcessedStripeEvent: 'ProcessedStripeEvent',
  TicketTransaction: 'TicketTransaction'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "C:\\Users\\gain\\git\\nextjs-template\\src\\lib\\generated\\client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "C:\\Users\\gain\\git\\nextjs-template\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": "../../../../.env",
    "schemaEnvPath": "../../../../.env"
  },
  "relativePath": "../../../../prisma",
  "clientVersion": "6.6.0",
  "engineVersion": "f676762280b54cd07c770017ed3711ddde35f37a",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "POOLED_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\ngenerator client {\n  provider        = \"prisma-client-js\"\n  previewFeatures = [\"driverAdapters\"]\n  output          = \"../src/lib/generated/client\"\n}\n\ngenerator zod {\n  provider              = \"zod-prisma-types\"\n  output                = \"../src/lib/generated/zod\"\n  relationModel         = true\n  modelCase             = \"camelCase\"\n  modelSuffix           = \"Schema\"\n  useDecimalJs          = true\n  prismaJsonNullability = true\n}\n\ndatasource db {\n  provider  = \"postgresql\"\n  url       = env(\"POOLED_URL\")\n  directUrl = env(\"DIRECT_URL\") // Used for migrations\n}\n\nmodel Subscription {\n  userId                 String      @unique\n  stripeCustomerId       String?     @unique @map(name: \"stripe_customer_id\")\n  stripeSubscriptionId   String?     @unique @map(name: \"stripe_subscription_id\")\n  stripePriceId          String?     @map(name: \"stripe_price_id\")\n  stripeCurrentPeriodEnd DateTime?   @map(name: \"stripe_current_period_end\")\n  status                 String      @default(\"pending\") @map(name: \"status\")\n  userProfile            UserProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)\n\n  @@id([userId])\n}\n\nmodel Task {\n  id          String    @id @default(cuid())\n  title       String\n  description String?\n  status      String    @default(\"pending\")\n  priority    String    @default(\"medium\")\n  dueDate     DateTime?\n  completed   Boolean   @default(false)\n  userId      String\n  createdAt   DateTime  @default(now())\n  updatedAt   DateTime  @updatedAt\n\n  @@index([userId])\n  @@index([status])\n  @@index([priority])\n}\n\nmodel UserProfile {\n  id           String        @id @default(cuid())\n  userId       String        @unique\n  firstName    String?\n  lastName     String?\n  email        String?\n  phone        String?\n  addressLine1 String?\n  addressLine2 String?\n  city         String?\n  state        String?\n  zipCode      String?\n  country      String?\n  notes        String?\n  createdAt    DateTime      @default(now())\n  updatedAt    DateTime      @updatedAt\n  subscription Subscription?\n\n  @@index([userId])\n}\n\nmodel ProcessedStripeEvent {\n  id          String   @id @default(cuid())\n  eventId     String   @unique\n  type        String\n  processedAt DateTime @default(now())\n\n  @@index([eventId])\n}\n\nmodel TicketTransaction {\n  id           String   @id @default(cuid())\n  email        String\n  ticketType   String // e.g., 'Regular Ticket', 'VIP', etc.\n  quantity     Int\n  pricePerUnit Float\n  totalAmount  Float\n  status       String   @default(\"completed\")\n  purchaseDate DateTime @default(now())\n  eventId      String // Reference to the event (can be expanded later)\n  userId       String? // Optional link to user if they are registered\n\n  @@index([email])\n  @@index([ticketType])\n  @@index([purchaseDate])\n  @@index([userId])\n}\n",
  "inlineSchemaHash": "543bef5a793a78c339a5fd02aa352e54d59eeffdae4306c695ff00336ce51198",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"Subscription\":{\"fields\":[{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stripeCustomerId\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"stripe_customer_id\"},{\"name\":\"stripeSubscriptionId\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"stripe_subscription_id\"},{\"name\":\"stripePriceId\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"stripe_price_id\"},{\"name\":\"stripeCurrentPeriodEnd\",\"kind\":\"scalar\",\"type\":\"DateTime\",\"dbName\":\"stripe_current_period_end\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"status\"},{\"name\":\"userProfile\",\"kind\":\"object\",\"type\":\"UserProfile\",\"relationName\":\"SubscriptionToUserProfile\"}],\"dbName\":null},\"Task\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"priority\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dueDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"completed\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"UserProfile\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"firstName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lastName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"addressLine1\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"addressLine2\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"city\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"state\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"zipCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"country\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"subscription\",\"kind\":\"object\",\"type\":\"Subscription\",\"relationName\":\"SubscriptionToUserProfile\"}],\"dbName\":null},\"ProcessedStripeEvent\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"eventId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"processedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"TicketTransaction\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ticketType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"pricePerUnit\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purchaseDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"eventId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: async () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine
  }
}
config.compilerWasm = undefined

config.injectableEdgeEnv = () => ({
  parsed: {
    POOLED_URL: typeof globalThis !== 'undefined' && globalThis['POOLED_URL'] || typeof process !== 'undefined' && process.env && process.env.POOLED_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

