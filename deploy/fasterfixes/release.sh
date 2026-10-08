#!/bin/sh
# Executado pelo Fly como release_command antes de trocar as máquinas.
# DATABASE_URL é escrita para o node-postgres (sslmode=verify-full&sslrootcert=<ca>);
# o schema engine do prisma usa outros nomes (sslcert = CA, sslaccept=strict), então traduzimos aqui.
set -eu
cd /src/packages/database
DATABASE_URL="$(node -e '
const u = new URL(process.env.DATABASE_URL);
const ca = u.searchParams.get("sslrootcert");
if (ca) { u.searchParams.delete("sslrootcert"); u.searchParams.set("sslmode", "require"); u.searchParams.set("sslcert", ca); u.searchParams.set("sslaccept", "strict"); }
process.stdout.write(u.toString());
')"
export DATABASE_URL
echo "==> prisma migrate deploy"
exec pnpm exec prisma migrate deploy
