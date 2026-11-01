import { Nunito } from "next/font/google";
import { IncidentsPage } from "./components/IncidentsPage";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
});

export const metadata = {
  title: "Live Incidents | MvuviGo",
};

export default function IncidentsRoute() {
  return (
    <div className={nunito.variable} style={{ display: "contents" }}>
      <IncidentsPage />
    </div>
  );
}
