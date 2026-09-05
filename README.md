# Dofus Profit Analyzer

Aplicación web para calcular la rentabilidad de crafteo en **Dofus**: cruza el costo de los ingredientes de una receta (precio de mercado por servidor, precio NPC o gratis) contra el precio de venta del objeto resultante, y muestra el margen neto, el porcentaje de ganancia y el ROI por hora invertida.

## Qué hace

- **Catálogo de items y recetas**: se importa masivamente desde la API de [DofusDB](https://dofusdb.fr) (objetos, recetas de crafteo, íconos y niveles) y se cachea en el navegador.
- **Mercadillos**: los items y recetas se agrupan por categoría de mercadillo (Consumibles, Runas, Recursos, Equipables, Mascotas).
- **Precios por servidor**: cada usuario elige su servidor activo (Rafal, Brial, Salar, Dakal, Kourial, Mikhal, Tal Kasha, Hell Mina, Imagiro, Draconiros, Sombra) y registra precios de mercado propios por item/receta, con historial de precios.
- **Inventario**: cantidades que el usuario tiene guardadas de cada item, para armar listas de compra.
- **Calculadora**: dado un ingrediente y una cantidad a craftear, calcula costo total, margen bruto/neto (con impuesto de mercado configurable) y ROI por hora según el tiempo de crafteo.
- **Autenticación**: login con Firebase Auth; los datos de precios, inventario e historial se guardan en Firestore por usuario.

## Stack técnico

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- React Router 7
- Firebase (Auth + Firestore)
- Vitest para pruebas unitarias
- Oxlint para linting

## Configuración local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Copiar `.env.example` a `.env.local` y completar con las credenciales de un proyecto Firebase (Auth + Firestore) creado en la [consola de Firebase](https://console.firebase.google.com):
   ```bash
   cp .env.example .env.local
   ```
3. Levantar el entorno de desarrollo:
   ```bash
   npm run dev
   ```

### Otros comandos

```bash
npm run build    # type-check + build de producción
npm run test     # pruebas unitarias con Vitest
npm run lint     # Oxlint
npm run preview  # sirve el build de producción localmente
```

## Despliegue

El proyecto se despliega en Vercel con `vercel --prod`. Las reglas de Firestore (`firestore.rules`) y los índices (`firestore.indexes.json`) se despliegan por separado con la CLI de Firebase.

## Créditos y atribución

Los datos de items y recetas provienen de la API pública de **[DofusDB](https://api.dofusdb.fr)**.

> Datos issus de DofusDB. Utilisation soumise à la licence NCPUL-AI 1.0 (LPNC-IA 1.0).
> Data sourced from DofusDB. Use subject to the NCPUL-AI 1.0 license.

Consulta los términos completos de la licencia en [`https://api.dofusdb.fr`](https://api.dofusdb.fr).

Dofus es una marca registrada de Ankama. Este proyecto es una herramienta de fans, sin fines comerciales, sin afiliación oficial con Ankama ni con DofusDB.
