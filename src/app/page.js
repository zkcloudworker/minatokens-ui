import HomeToken from "@/home/page";
import { getSiteName } from "@/lib/chain";

export const metadata = {
  title: `${getSiteName()} | Launchpad`,
};

export default function Home() {
  return <HomeToken />;
}
