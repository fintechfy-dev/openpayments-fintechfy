import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "public/ds/**", "src/styles/ds/**", ".capturas/**", "next-env.d.ts"] },
  {
    rules: {
      // La llave del servicio externo no puede llegar al navegador.
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Lee variables de entorno solo en src/lib/servicio, src/lib/sesion o src/proxy.ts (servidor)." },
      ],
    },
  },
  { files: ["src/lib/servicio/**", "src/lib/sesion/**", "src/proxy.ts", "scripts/**", "*.config.*"], rules: { "no-restricted-properties": "off" } },
];

export default config;
