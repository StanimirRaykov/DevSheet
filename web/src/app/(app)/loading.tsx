import { PageSkeleton } from "@/components/route-states";

// Inside the app shell: the sidebar stays, only the page area shows the skeleton.
export default function Loading() {
  return <PageSkeleton />;
}
