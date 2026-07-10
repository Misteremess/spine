import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spine — tu biblioteca",
  description: "Registra, organiza y da vida a tu colección de libros, manga y cómics.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
