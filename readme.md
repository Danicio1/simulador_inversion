# Investment Simulator

## Cómo probar localmente
1. Asegúrate de tener los archivos `index.html`, `styles.css` y `app.js` en la misma carpeta.
2. Abre el archivo `index.html` en tu navegador (puedes hacer doble clic o arrastrarlo a la ventana del navegador).
3. Completa los parámetros y pulsa **Calcular** para generar los resultados.
4. Usa **Limpiar** para reiniciar, **Exportar CSV** para descargar los datos y el interruptor claro/oscuro para cambiar el tema.

## Probar con un servidor local (opcional)
Si prefieres servir los archivos desde un servidor local, puedes usar `npx serve` o `python -m http.server`:

```bash
npx serve .
# o
python -m http.server 8000
```

Luego visita `http://localhost:3000` o `http://localhost:8000` según el comando que hayas usado.

## Console asserts
La lógica incluye verificaciones rápidas con `console.assert`. Abre las herramientas de desarrollo del navegador (F12 o clic derecho → "Inspeccionar") y revisa la consola para confirmar que no aparezcan errores.

## Despliegue en GitHub Pages
1. Crea un repositorio en GitHub y sube los archivos.
2. Ve a **Settings → Pages** y selecciona la rama `main` y la carpeta raíz (`/`).
3. Guarda y espera a que GitHub Pages publique el sitio. Podrás acceder con la URL `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

## ¿Cómo subir los archivos al repositorio?
Si todavía no ves los ficheros en GitHub, probablemente no se han subido. Estos son los pasos básicos usando Git:

1. Inicializa el repositorio (si aún no existe) y añade los archivos:
   ```bash
   git init
   git add index.html styles.css app.js readme.md
   ```
2. Crea un commit con un mensaje descriptivo:
   ```bash
   git commit -m "Añadir simulador de inversión"
   ```
3. Conecta el repositorio local con el remoto que creaste en GitHub (sustituye la URL por la de tu repo):
   ```bash
   git remote add origin https://github.com/<tu-usuario>/simulador_inversion.git
   ```
4. Sube los cambios:
   ```bash
   git push -u origin main
   ```

Después de este `push` los ficheros aparecerán en GitHub y podrás activar GitHub Pages siguiendo los pasos anteriores.
