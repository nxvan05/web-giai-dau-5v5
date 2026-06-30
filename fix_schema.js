const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

if (!schema.includes('mainAgents')) {
  schema = schema.replace(/type\s+String\n\s*cardUrl/, 'type         String\n  mainAgents   String?  @default("")\n  cardUrl');
  fs.writeFileSync(schemaPath, schema, 'utf8');
}
console.log('Fixed schema');
