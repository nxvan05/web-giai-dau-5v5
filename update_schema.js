const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('cardUrl')) {
  schema = schema.replace(/role\s+String/g, 'role         String\n    cardUrl      String?  @default("")\n    accountLevel Int?     @default(0)');
  fs.writeFileSync(schemaPath, schema, 'utf8');
  console.log('Updated schema.prisma');
}
