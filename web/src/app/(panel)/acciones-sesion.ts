"use server";

import { redirect } from "next/navigation";
import { borrarSesion } from "@/lib/sesion";

export async function cerrarSesion() {
  await borrarSesion();
  redirect("/");
}
