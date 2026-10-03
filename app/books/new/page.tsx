import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewBookForm } from "@/components/NewBookForm";

export default async function NewBookPage({ searchParams }: { searchParams: Promise<{ title?: string }> }) {
  if (!(await auth())) redirect("/login");
  const { title } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold">Новая книга</h1>
      <NewBookForm defaultTitle={title ?? ""} />
    </div>
  );
}
