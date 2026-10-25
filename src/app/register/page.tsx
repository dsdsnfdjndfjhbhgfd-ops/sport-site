import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { register } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Регистрация" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next || "/account");
  return (
    <div className="container auth">
      <h1>Регистрация</h1>
      <AuthForm action={register} mode="register" next={next} />
      <p className="alt">
        Уже есть аккаунт? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Войти</Link>
      </p>
    </div>
  );
}
