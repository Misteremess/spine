import { Redirect } from "expo-router";

/** La pestaña central se intercepta en la barra; si alguien llega aquí
 *  por enlace directo, al escáner igualmente. */
export default function Scan() {
  return <Redirect href="/scanner" />;
}
