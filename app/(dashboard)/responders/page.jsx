import { Nunito } from "next/font/google";
import { RespondersDashboard } from "./components/RespondersDashboard";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
});

export const metadata = {
  title: "Responders | MvuviGo",
};

export default function RespondersPage() {
  return (
    <div className={nunito.variable} style={{ display: "contents" }}>
      <RespondersDashboard />
    </div>
  );
}
