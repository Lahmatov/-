import { ForgotPasswordForm } from "@/components/PasswordForms";

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Восстановление пароля</h1>
      <p className="text-sm text-neutral-400">Пришлём на почту ссылку, по которой можно задать новый пароль.</p>
      <ForgotPasswordForm />
    </div>
  );
}
