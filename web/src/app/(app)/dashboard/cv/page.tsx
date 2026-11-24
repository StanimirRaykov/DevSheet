import type { Metadata } from "next";
import { CvView } from "./_components/cv-view";

export const metadata: Metadata = { title: "CV" };

export default function Page() {
  return <CvView />;
}
