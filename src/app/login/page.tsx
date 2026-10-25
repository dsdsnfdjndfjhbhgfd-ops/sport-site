import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { login } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(next || "/account");
  return (
    <div className="container auth">
      <h1>Вход</h1>
      <AuthForm action={login} mode="login" next={next} />
      <p className="alt">
        Нет аккаунта? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Зарегистрироваться</Link>
      </p>
    </div>
  );
}
