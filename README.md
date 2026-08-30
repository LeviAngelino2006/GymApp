# Bitácora

App personal de registro de entrenamiento, nutrición y progreso. Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL + NextAuth.

## Requisitos previos

- Node.js 18 o superior
- Una base de datos PostgreSQL. Para no instalar nada localmente, la forma más rápida es crear una gratis en [Neon](https://neon.tech) o [Supabase](https://supabase.com) y copiar la connection string.

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar el archivo de variables de entorno y completarlo:

   ```bash
   cp .env.example .env
   ```

   - `DATABASE_URL`: la connection string de tu Postgres.
   - `NEXTAUTH_SECRET`: generalo con `openssl rand -base64 32`.

3. Crear las tablas en la base de datos a partir del schema de Prisma:

   ```bash
   npm run db:push
   ```

4. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   La app queda disponible en `http://localhost:3000`.

Otros comandos útiles:

- `npm run db:studio` — abre Prisma Studio, una UI para ver y editar los datos directamente.
- `npm run db:migrate` — crea una migración versionada (mejor que `db:push` una vez que el schema empiece a estabilizarse).

## Estructura del proyecto

```
prisma/schema.prisma       Modelo de datos completo (auth + entrenamiento + nutrición)
src/app/                   Rutas (App Router). Cada carpeta = una pantalla.
src/app/api/auth/          Endpoint de NextAuth (login por email/contraseña)
src/lib/prisma.ts          Cliente de Prisma (singleton)
src/lib/auth.ts            Configuración de NextAuth
src/components/            Componentes compartidos (por ahora, la navegación)
```

Las pantallas de `entrenamiento`, `nutricion` y `progreso` son placeholders visuales — todavía no leen ni escriben datos reales. Son el punto de partida para ir cableando cada una contra el modelo de Prisma.

## Qué falta (roadmap)

**Para que el MVP funcione de punta a punta:**
- Pantalla de login/registro (ya está el backend de NextAuth, falta la UI)
- CRUD de rutinas y ejercicios
- Pantalla de registro en vivo de series (peso, reps, y en modo avanzado: RPE, descanso, tipo de serie)
- Registro de comidas con búsqueda de alimentos (Open Food Facts API)
- Cálculo automático de objetivos calóricos/macro según el entrenamiento del día
- Gráficos de progreso (fuerza por ejercicio, peso corporal)

**Fase 2 (ya charlada, no es parte del MVP):**
- Sueño (calculadora + integración con smartwatch / Google Fit)
- Agua y recordatorios
- Estado de ánimo/energía diario
- Recetas + lista de compras automática
- Frases motivacionales diarias
- Feedback con IA sobre tus datos (vía API de Claude)

**Fase 3 (cuando escale a multiusuario):**
- Amigos, grupos/comunidades
- Compartir logros a redes sociales

## Notas de diseño

- El modo básico/avanzado de registro de series se resuelve con campos opcionales en `SetLog` (`rpe`, `restSeconds`, `setType`) — no hace falta un modelo ni un endpoint distinto para cada modo.
- `NutritionGoal` es por día, no un valor fijo del perfil, para poder ajustarlo según el entrenamiento de esa fecha.
- Apple Health (HealthKit) no es accesible desde una web app — solo desde apps nativas iOS. Si en algún momento se quiere esa integración, va a requerir una app nativa o un flujo de exportación manual. Google Fit / Health Connect sí tiene API REST y se puede integrar directamente.
